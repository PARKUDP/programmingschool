<?php
require_once __DIR__ . '/db.php';
$pdo = getPDO();

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Simple JWT utilities
$secret = getenv('JWT_SECRET') ?: 'secretkey';
$current_user = null;

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generate_jwt(array $payload, string $secret, int $exp = 3600): string {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload['exp'] = time() + $exp;
    $segments = [
        base64url_encode(json_encode($header)),
        base64url_encode(json_encode($payload))
    ];
    $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
    $segments[] = base64url_encode($signature);
    return implode('.', $segments);
}

function verify_jwt(string $token, string $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h64, $p64, $s64) = $parts;
    $payload = json_decode(base64url_decode($p64), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) return false;
    $sig = base64url_decode($s64);
    $valid = hash_hmac('sha256', "$h64.$p64", $secret, true);
    if (!hash_equals($valid, $sig)) return false;
    return $payload;
}

function require_auth() {
    global $secret, $current_user;
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)/', $auth, $m)) {
        $payload = verify_jwt($m[1], $secret);
        if ($payload) {
            $current_user = $payload;
            return;
        }
    }
    json_response(['error' => 'Unauthorized'], 401);
}

$public_paths = ['/api/login', '/api/register'];
if (!in_array($path, $public_paths)) {
    require_auth();
}

function json_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

if ($path === '/api/register' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['username']) || !isset($data['password'])) {
        json_response(['error' => 'username and password required'], 400);
    }
    $is_admin = !empty($data['is_admin']) ? 1 : 0;
    $stmt = $pdo->prepare('SELECT id FROM user WHERE username = ?');
    $stmt->execute([$data['username']]);
    if ($stmt->fetch()) {
        json_response(['error' => 'username exists'], 409);
    }
    $hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO user (username, password_hash, is_admin) VALUES (?,?,?)');
    $stmt->execute([$data['username'], $hash, $is_admin]);
    json_response(['message' => 'User created', 'user_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/login' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['username']) || !isset($data['password'])) {
        json_response(['error' => 'username and password required'], 400);
    }
    $stmt = $pdo->prepare('SELECT id, password_hash, is_admin FROM user WHERE username = ?');
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($data['password'], $user['password_hash'])) {
        json_response(['error' => 'invalid credentials'], 401);
    }
    $token = generate_jwt(['id' => $user['id'], 'username' => $data['username'], 'is_admin' => (int)$user['is_admin']], $secret);
    json_response([
        'message' => 'Logged in',
        'token' => $token,
        'user_id' => $user['id'],
        'is_admin' => (int)$user['is_admin']
    ]);
}

if ($path === '/api/materials' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, title FROM material');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/materials' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['title'])) json_response(['error' => 'title required'], 400);
    $stmt = $pdo->prepare('INSERT INTO material (title) VALUES (?)');
    $stmt->execute([$data['title']]);
    json_response(['message' => 'Created', 'material_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/lessons' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['material_id']) || !isset($data['title'])) {
        json_response(['error' => 'material_id and title required'], 400);
    }
    $stmt = $pdo->prepare('INSERT INTO lesson (material_id, title, description) VALUES (?,?,?)');
    $stmt->execute([$data['material_id'], $data['title'], $data['description'] ?? null]);
    json_response(['message' => 'Lesson created', 'lesson_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/lessons/by_material' && $method === 'GET') {
    $material_id = $_GET['material_id'] ?? null;
    if (!$material_id) json_response(['error' => 'material_id required'], 400);
    $stmt = $pdo->prepare('SELECT id, title, description FROM lesson WHERE material_id = ?');
    $stmt->execute([$material_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/lessons' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, title FROM lesson');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/problems' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, lesson_id, title, markdown, created_at FROM problem');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/problems' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['title']) || !isset($data['markdown']) || !isset($data['lesson_id'])) {
        json_response(['error' => 'missing fields'], 400);
    }
    $stmt = $pdo->prepare('INSERT INTO problem (lesson_id, title, markdown, created_at) VALUES (?,?,?,datetime("now"))');
    $stmt->execute([$data['lesson_id'], $data['title'], $data['markdown']]);
    json_response(['message' => 'Problem created', 'problem_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/testcases' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['problem_id']) || !array_key_exists('input', $data) || !array_key_exists('expected_output', $data)) {
        json_response(['error' => 'missing fields'], 400);
    }
    $stmt = $pdo->prepare('INSERT INTO test_case (problem_id, input, expected_output) VALUES (?,?,?)');
    $stmt->execute([$data['problem_id'], $data['input'], $data['expected_output']]);
    json_response(['message' => 'Test case created', 'testcase_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/submit' && $method === 'POST') {
    global $current_user;
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['problem_id']) || !isset($data['code'])) {
        json_response(['error' => 'missing fields'], 400);
    }
    $data['user_id'] = $current_user['id'];
    $stmt = $pdo->prepare('SELECT input, expected_output FROM test_case WHERE problem_id = ?');
    $stmt->execute([$data['problem_id']]);
    $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$cases) json_response(['error' => 'No test cases'], 404);

    $all_passed = true;
    $output = '';

    foreach ($cases as $case) {
        $tmp = tempnam(sys_get_temp_dir(), 'code');
        file_put_contents($tmp, $data['code']);
        $cmd = 'python3 ' . escapeshellarg($tmp);
        $result = [];
        $ret = null;
        $input = $case['input'];
        exec("echo " . escapeshellarg($input) . " | $cmd", $result, $ret);
        $result_text = implode("\n", $result);
        if (trim($result_text) !== trim($case['expected_output'])) {
            $all_passed = false;
            $output .= "Failed case:\nInput:\n{$case['input']}\nExpected:\n{$case['expected_output']}\nGot:\n{$result_text}\n\n";
        }
        unlink($tmp);
        if (!$all_passed) break;
    }

    $stmt = $pdo->prepare('INSERT INTO submission (user_id, problem_id, code, result, output, submitted_at) VALUES (?,?,?,?,?,datetime("now"))');
    $stmt->execute([
        $data['user_id'],
        $data['problem_id'],
        $data['code'],
        $all_passed ? 'AC' : 'WA',
        $all_passed ? 'All test cases passed.' : $output
    ]);

    json_response(['message' => 'Submission processed', 'result' => $all_passed ? 'AC' : 'WA', 'output' => $all_passed ? 'All test cases passed.' : $output]);
}

if (preg_match('#^/api/submissions/(\d+)$#', $path, $m) && $method === 'GET') {
    global $current_user;
    $user_id = $m[1];
    if ($current_user['id'] != $user_id && empty($current_user['is_admin'])) {
        json_response(['error' => 'forbidden'], 403);
    }
    $stmt = $pdo->prepare('SELECT id, problem_id, result, output, submitted_at FROM submission WHERE user_id = ? ORDER BY submitted_at DESC');
    $stmt->execute([$user_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

json_response(['error' => 'Not found'], 404);
?>
