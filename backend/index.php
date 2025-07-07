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

if ($path === '/api/change_password' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['user_id']) || !isset($data['old_password']) || !isset($data['new_password'])) {
        json_response(['error' => 'user_id, old_password and new_password required'], 400);
    }
    $stmt = $pdo->prepare('SELECT password_hash FROM user WHERE id = ?');
    $stmt->execute([$data['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($data['old_password'], $user['password_hash'])) {
        json_response(['error' => 'invalid credentials'], 401);
    }
    $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('UPDATE user SET password_hash = ? WHERE id = ?');
    $stmt->execute([$newHash, $data['user_id']]);
    json_response(['message' => 'Password changed']);
}

if ($path === '/api/reset_password' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['user_id']) || !isset($data['new_password'])) {
        json_response(['error' => 'user_id and new_password required'], 400);
    }
    $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('UPDATE user SET password_hash = ? WHERE id = ?');
    $stmt->execute([$newHash, $data['user_id']]);
    json_response(['message' => 'Password reset']);
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

if (preg_match('#^/api/materials/(\d+)$#', $path, $m) && $method === 'PUT') {
    $material_id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['title'])) json_response(['error' => 'title required'], 400);
    $stmt = $pdo->prepare('UPDATE material SET title = ? WHERE id = ?');
    $stmt->execute([$data['title'], $material_id]);
    json_response(['message' => 'Updated']);
}

if (preg_match('#^/api/materials/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $material_id = $m[1];
    $stmt = $pdo->prepare('DELETE FROM material WHERE id = ?');
    $stmt->execute([$material_id]);
    json_response(['message' => 'Deleted']);
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

if (preg_match('#^/api/lessons/(\d+)$#', $path, $m) && $method === 'PUT') {
    $lesson_id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['title'])) json_response(['error' => 'title required'], 400);
    $stmt = $pdo->prepare('UPDATE lesson SET material_id = ?, title = ?, description = ? WHERE id = ?');
    $stmt->execute([
        $data['material_id'] ?? null,
        $data['title'],
        $data['description'] ?? null,
        $lesson_id
    ]);
    json_response(['message' => 'Lesson updated']);
}

if (preg_match('#^/api/lessons/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $lesson_id = $m[1];
    $stmt = $pdo->prepare('DELETE FROM lesson WHERE id = ?');
    $stmt->execute([$lesson_id]);
    json_response(['message' => 'Lesson deleted']);
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


if ($path === '/api/problems/by_lesson' && $method === 'GET') {
    $lesson_id = $_GET['lesson_id'] ?? null;
    if (!$lesson_id) json_response(['error' => 'lesson_id required'], 400);
    $stmt = $pdo->prepare('SELECT id, lesson_id, title, markdown, created_at FROM problem WHERE lesson_id = ?');
    $stmt->execute([$lesson_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if (preg_match('#^/api/problems/(\d+)$#', $path, $m) && $method === 'PUT') {
    $id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_response(['error' => 'invalid json'], 400);
    $stmt = $pdo->prepare('UPDATE problem SET lesson_id = COALESCE(?, lesson_id), title = COALESCE(?, title), markdown = COALESCE(?, markdown) WHERE id = ?');
    $stmt->execute([
        $data['lesson_id'] ?? null,
        $data['title'] ?? null,
        $data['markdown'] ?? null,
        $id
    ]);
    json_response(['message' => 'Problem updated']);
}

if (preg_match('#^/api/problems/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $id = $m[1];
    $stmt = $pdo->prepare('DELETE FROM problem WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['message' => 'Problem deleted']);
}

if ($path === '/api/assignments' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, lesson_id, title, description, question_text, input_example, file_path, created_at FROM assignment');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/assignments' && $method === 'POST') {
    $title = $_POST['title'] ?? null;
    $lesson_id = $_POST['lesson_id'] ?? null;
    if (!$title || !$lesson_id) json_response(['error' => 'title and lesson_id required'], 400);
    $description = $_POST['description'] ?? null;
    $question_text = $_POST['question_text'] ?? null;
    $input_example = $_POST['input_example'] ?? null;

    $file_path = null;
    if (!empty($_FILES['file']['tmp_name'])) {
        $uploadDir = __DIR__ . '/uploads';
        if (!is_dir($uploadDir)) mkdir($uploadDir);
        $name = uniqid() . '_' . basename($_FILES['file']['name']);
        $dest = $uploadDir . '/' . $name;
        if (move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
            $file_path = 'uploads/' . $name;
        }
    }

    $stmt = $pdo->prepare('INSERT INTO assignment (lesson_id, title, description, question_text, input_example, file_path, created_at) VALUES (?,?,?,?,?,?,datetime("now"))');
    $stmt->execute([$lesson_id, $title, $description, $question_text, $input_example, $file_path]);
    json_response(['message' => 'Assignment created', 'assignment_id' => $pdo->lastInsertId()], 201);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, lesson_id, title, description, question_text, input_example, file_path, created_at FROM assignment WHERE id = ?');
    $stmt->execute([$m[1]]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$assignment) json_response(['error' => 'Not found'], 404);
    json_response($assignment);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'PUT') {
    $id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_response(['error' => 'invalid json'], 400);
    $stmt = $pdo->prepare('UPDATE assignment SET title = COALESCE(?, title), description = COALESCE(?, description), question_text = COALESCE(?, question_text), input_example = COALESCE(?, input_example) WHERE id = ?');
    $stmt->execute([
        $data['title'] ?? null,
        $data['description'] ?? null,
        $data['question_text'] ?? null,
        $data['input_example'] ?? null,
        $id
    ]);
    json_response(['message' => 'Assignment updated']);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $stmt = $pdo->prepare('DELETE FROM assignment WHERE id = ?');
    $stmt->execute([$m[1]]);
    json_response(['message' => 'Assignment deleted']);
}

if ($path === '/api/testcases' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['assignment_id']) || !array_key_exists('input', $data) || !array_key_exists('expected_output', $data)) {
        json_response(['error' => 'missing fields'], 400);
    }
    $stmt = $pdo->prepare('INSERT INTO test_case (problem_id, input, expected_output, comment) VALUES (?,?,?,?)');
    $stmt->execute([
        $data['problem_id'],
        $data['input'],
        $data['expected_output'],
        $data['comment'] ?? null
    ]);
    $stmt = $pdo->prepare('INSERT INTO test_case (assignment_id, input, expected_output, comment) VALUES (?,?,?,?)');
    $stmt->execute([$data['assignment_id'], $data['input'], $data['expected_output'], $data['comment'] ?? null]);
    json_response(['message' => 'Test case created', 'testcase_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/testcases' && $method === 'GET') {
    $problem_id = $_GET['problem_id'] ?? null;
    if ($problem_id) {
        $stmt = $pdo->prepare('SELECT id, problem_id, input, expected_output, comment FROM test_case WHERE problem_id = ?');
        $stmt->execute([$problem_id]);
    } else {
        $stmt = $pdo->query('SELECT id, problem_id, input, expected_output, comment FROM test_case');
    $assignment_id = $_GET['assignment_id'] ?? null;
    if ($assignment_id) {
        $stmt = $pdo->prepare('SELECT id, assignment_id, input, expected_output, comment FROM test_case WHERE assignment_id = ?');
        $stmt->execute([$assignment_id]);
    } else {
        $stmt = $pdo->query('SELECT id, assignment_id, input, expected_output, comment FROM test_case');
    }
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if (preg_match('#^/api/testcases/(\d+)$#', $path, $m) && $method === 'PUT') {
    $id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!array_key_exists('input', $data) || !array_key_exists('expected_output', $data)) {
        json_response(['error' => 'missing fields'], 400);
    }
    $stmt = $pdo->prepare('UPDATE test_case SET input = ?, expected_output = ?, comment = ? WHERE id = ?');
    $stmt->execute([
        $data['input'],
        $data['expected_output'],
        $data['comment'] ?? null,
        $id
    ]);
    $stmt = $pdo->prepare('UPDATE test_case SET input = ?, expected_output = ?, comment = COALESCE(?, comment) WHERE id = ?');
    $stmt->execute([$data['input'], $data['expected_output'], $data['comment'] ?? null, $id]);
    json_response(['message' => 'Updated']);
}

if (preg_match('#^/api/testcases/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $id = $m[1];
    $stmt = $pdo->prepare('DELETE FROM test_case WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['message' => 'Deleted']);
}

if ($path === '/api/submit' && $method === 'POST') {
    global $current_user;
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['assignment_id']) || !isset($data['code'])) {
        json_response(['error' => 'missing fields'], 400);
    }
    $data['user_id'] = $current_user['id'];
    $stmt = $pdo->prepare('SELECT input, expected_output FROM test_case WHERE assignment_id = ?');
    $stmt->execute([$data['assignment_id']]);
    $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$cases) json_response(['error' => 'No test cases'], 404);

    $all_passed = true;
    $output = '';

    foreach ($cases as $case) {
        $tmp = tempnam(sys_get_temp_dir(), 'code');
        file_put_contents($tmp, $data['code']);
        // Use isolated Python execution with a timeout to mitigate security risks
        $safe_python = '/usr/bin/python3';
        $cmd = 'timeout 5s ' . escapeshellcmd($safe_python) . ' -I -S ' . escapeshellarg($tmp);
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

    $stmt = $pdo->prepare('INSERT INTO submission (user_id, assignment_id, code, is_correct, feedback, submitted_at) VALUES (?,?,?,?,?,datetime("now"))');
    $stmt->execute([
        $data['user_id'],
        $data['assignment_id'],
        $data['code'],
        $all_passed ? 1 : 0,
        $all_passed ? 'All test cases passed.' : $output
    ]);

    json_response(['message' => 'Submission processed', 'is_correct' => $all_passed ? 1 : 0, 'feedback' => $all_passed ? 'All test cases passed.' : $output]);
}

if (preg_match('#^/api/submissions/(\d+)$#', $path, $m) && $method === 'GET') {
    global $current_user;
    $user_id = $m[1];
    if ($current_user['id'] != $user_id && empty($current_user['is_admin'])) {
        json_response(['error' => 'forbidden'], 403);
    }
    $stmt = $pdo->prepare('SELECT id, assignment_id, is_correct, feedback, submitted_at FROM submission WHERE user_id = ? ORDER BY submitted_at DESC');
    $stmt->execute([$user_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/progress' && $method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;

    if ($user_id) {
        $totalStmt = $pdo->prepare('SELECT COUNT(*) FROM submission WHERE user_id = ?');
        $totalStmt->execute([$user_id]);
        $totalSub = (int)$totalStmt->fetchColumn();

        $correctStmt = $pdo->prepare('SELECT COUNT(*) FROM submission WHERE user_id = ? AND is_correct = 1');
        $correctStmt->execute([$user_id]);
        $correct = (int)$correctStmt->fetchColumn();

        $attemptedStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE user_id = ?');
        $attemptedStmt->execute([$user_id]);
        $attempted = (int)$attemptedStmt->fetchColumn();
    } else {
        $totalStmt = $pdo->query('SELECT COUNT(*) FROM submission');
        $totalSub = (int)$totalStmt->fetchColumn();

        $correctStmt = $pdo->query('SELECT COUNT(*) FROM submission WHERE is_correct = 1');
        $correct = (int)$correctStmt->fetchColumn();

        $attemptedStmt = $pdo->query('SELECT COUNT(DISTINCT assignment_id) FROM submission');
        $attempted = (int)$attemptedStmt->fetchColumn();
    }

    $incorrect = $totalSub - $correct;
    $totalStmtAll = $pdo->query('SELECT COUNT(*) FROM assignment');
    $totalAssignments = (int)$totalStmtAll->fetchColumn();
    $unsubmitted = $totalAssignments - $attempted;

    if ($user_id) {
        $dailyStmt = $pdo->prepare('SELECT substr(submitted_at,1,10) as date, COUNT(*) as count FROM submission WHERE user_id = ? GROUP BY substr(submitted_at,1,10)');
        $dailyStmt->execute([$user_id]);
    } else {
        $dailyStmt = $pdo->query('SELECT substr(submitted_at,1,10) as date, COUNT(*) as count FROM submission GROUP BY substr(submitted_at,1,10)');
    }
    $daily = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

    $materials = [];
    $matStmt = $pdo->query('SELECT id, title FROM material');
    foreach ($matStmt as $m) {
        $totalP = $pdo->prepare('SELECT COUNT(*) FROM assignment JOIN lesson ON assignment.lesson_id = lesson.id WHERE lesson.material_id = ?');
        $totalP->execute([$m['id']]);
        $total = (int)$totalP->fetchColumn();

        if ($user_id) {
            $compStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment.id) FROM assignment JOIN lesson ON assignment.lesson_id = lesson.id JOIN submission s ON s.assignment_id = assignment.id WHERE s.user_id = ? AND s.is_correct = 1 AND lesson.material_id = ?');
            $compStmt->execute([$user_id, $m['id']]);
        } else {
            $compStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment.id) FROM assignment JOIN lesson ON assignment.lesson_id = lesson.id JOIN submission s ON s.assignment_id = assignment.id WHERE s.is_correct = 1 AND lesson.material_id = ?');
            $compStmt->execute([$m['id']]);
        }
        $completed = (int)$compStmt->fetchColumn();
        
        $materials[] = [
            'material_id' => (int)$m['id'],
            'title' => $m['title'],
            'completed' => $completed,
            'total' => $total
        ];
    }

    json_response([
        'total_assignments' => $totalAssignments,
        'correct' => $correct,
        'incorrect' => $incorrect,
        'unsubmitted' => $unsubmitted,
        'daily_counts' => $daily,
        'material_progress' => $materials
    ]);
}

if ($path === '/api/user_progress' && $method === 'GET') {
    $stmt = $pdo->query("SELECT u.id, u.username, COUNT(s.id) AS submissions, SUM(CASE WHEN s.result = 'AC' THEN 1 ELSE 0 END) AS correct FROM user u LEFT JOIN submission s ON u.id = s.user_id GROUP BY u.id, u.username");
    $res = [];
    foreach ($stmt as $row) {
        $sub = (int)$row['submissions'];
        $correct = (int)$row['correct'];
        $accuracy = $sub ? round($correct / $sub * 100, 2) : 0;
        $res[] = [
            'user_id' => (int)$row['id'],
            'username' => $row['username'],
            'submissions' => $sub,
            'correct' => $correct,
            'accuracy' => $accuracy
        ];
    }
    json_response($res);
}

if ($path === '/api/unsubmitted' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, username FROM user WHERE id NOT IN (SELECT DISTINCT user_id FROM submission)');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_response($users);
}

json_response(['error' => 'Not found'], 404);
?>
