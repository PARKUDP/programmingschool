<?php
require_once __DIR__ . '/db.php';
$pdo = getPDO();

// OPTIONS リクエストに応答（preflight）- Apache VirtualHost で CORS ヘッダーは設定済み
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Content-Type を設定
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);


// Simple JWT utilities
$secret = getenv('JWT_SECRET') ?: 'secretkey';
$current_user = null;

// Simple cache utilities using APCu if available, otherwise temporary files
function cache_get(string $key) {
    if (function_exists('apcu_fetch')) {
        $success = false;
        $data = apcu_fetch($key, $success);
        return $success ? $data : false;
    }
    $file = sys_get_temp_dir() . '/ps_' . md5($key);
    if (!file_exists($file)) return false;
    $raw = json_decode(file_get_contents($file), true);
    if (!$raw || ($raw['expires'] ?? 0) < time()) {
        @unlink($file);
        return false;
    }
    return $raw['value'];
}

function cache_set(string $key, $value, int $ttl) {
    if (function_exists('apcu_store')) {
        apcu_store($key, $value, $ttl);
        return;
    }
    $file = sys_get_temp_dir() . '/ps_' . md5($key);
    file_put_contents($file, json_encode([
        'expires' => time() + $ttl,
        'value' => $value,
    ]));
}

function cache_delete(string $key) {
    if (function_exists('apcu_delete')) {
        apcu_delete($key);
        return;
    }
    $file = sys_get_temp_dir() . '/ps_' . md5($key);
    if (file_exists($file)) @unlink($file);
}

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
    
    // 複数の方法で Authorization ヘッダーを取得
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? 
            $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 
            ($_SERVER['HTTP_X_AUTHORIZATION'] ?? '');
    
    // PHP の getallheaders() 関数が利用可能な場合
    if (!$auth && function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    if (preg_match('/Bearer\s+(.*)/', $auth, $m)) {
        $payload = verify_jwt($m[1], $secret);
        if ($payload) {
            $current_user = $payload;
            return;
        }
    }
    json_response(['error' => 'Unauthorized'], 401);
}

function require_admin() {
    global $current_user;
    if (empty($current_user['is_admin']) && ($current_user['role'] ?? null) !== 'admin') {
        json_response(['error' => 'forbidden'], 403);
    }
}

function require_teacher() {
    global $current_user;
    $role = $current_user['role'] ?? null;
    if ($role !== 'admin' && $role !== 'teacher') {
        json_response(['error' => 'forbidden'], 403);
    }
}

function require_student() {
    global $current_user;
    if (!$current_user) {
        json_response(['error' => 'unauthorized'], 401);
    }
}

$public_paths = ['/api/login'];
if (!in_array($path, $public_paths)) {
    require_auth();
}

function json_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

if ($path === '/api/register' && $method === 'POST') {
    require_auth();
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['username']) || !isset($data['password'])) {
        json_response(['error' => 'username and password required'], 400);
    }
    
    // role を優先、なければ is_admin フラグで互換性を保つ
    $role = $data['role'] ?? null;
    if (!$role) {
        $role = !empty($data['is_admin']) ? 'admin' : 'student';
    }
    $is_admin = ($role === 'admin') ? 1 : 0;
    
    $stmt = $pdo->prepare('SELECT id FROM user WHERE username = ?');
    $stmt->execute([$data['username']]);
    if ($stmt->fetch()) {
        json_response(['error' => 'username exists'], 409);
    }
    $hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO user (username, password_hash, is_admin, role) VALUES (?,?,?,?)');
    $stmt->execute([$data['username'], $hash, $is_admin, $role]);
    json_response(['message' => 'User created', 'user_id' => $pdo->lastInsertId(), 'role' => $role], 201);
}

if ($path === '/api/login' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['username']) || !isset($data['password'])) {
        json_response(['error' => 'username and password required'], 400);
    }
    $stmt = $pdo->prepare('SELECT id, password_hash, is_admin, role FROM user WHERE username = ?');
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($data['password'], $user['password_hash'])) {
        json_response(['error' => 'invalid credentials'], 401);
    }
    $role = $user['role'] ?? ($user['is_admin'] ? 'admin' : 'student');
    $token = generate_jwt(['id' => $user['id'], 'username' => $data['username'], 'is_admin' => (int)$user['is_admin'], 'role' => $role], $secret);
    json_response([
        'message' => 'Logged in',
        'token' => $token,
        'user_id' => $user['id'],
        'is_admin' => (int)$user['is_admin'],
        'role' => $role
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
    global $current_user;
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['user_id']) || !isset($data['new_password'])) {
        json_response(['error' => 'user_id and new_password required'], 400);
    }
    if ($current_user['id'] != $data['user_id']) {
        require_admin();
    }
    $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('UPDATE user SET password_hash = ? WHERE id = ?');
    $stmt->execute([$newHash, $data['user_id']]);
    json_response(['message' => 'Password reset']);
}

if ($path === '/api/materials' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, title, description, created_at FROM material');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/materials' && $method === 'POST') {
    require_teacher();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['title'])) json_response(['error' => 'title required'], 400);
    $stmt = $pdo->prepare('INSERT INTO material (title, description) VALUES (?, ?)');
    $stmt->execute([
        $data['title'],
        $data['description'] ?? null
    ]);
    json_response(['message' => 'Created', 'material_id' => $pdo->lastInsertId()], 201);
}

if (preg_match('#^/api/materials/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $material_id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['title'])) json_response(['error' => 'title required'], 400);
    $stmt = $pdo->prepare('UPDATE material SET title = ?, description = ? WHERE id = ?');
    $stmt->execute([
        $data['title'],
        $data['description'] ?? null,
        $material_id
    ]);
    json_response(['message' => 'Updated']);
}

if (preg_match('#^/api/materials/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_teacher();
    $material_id = $m[1];
    $stmt = $pdo->prepare('DELETE FROM material WHERE id = ?');
    $stmt->execute([$material_id]);
    json_response(['message' => 'Deleted']);
}

if ($path === '/api/lessons' && $method === 'POST') {
    require_teacher();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['material_id']) || !isset($data['title'])) {
        json_response(['error' => 'material_id and title required'], 400);
    }
    // material_id の妥当性チェック
    $material_id = intval($data['material_id']);
    if ($material_id <= 0) {
        json_response(['error' => 'Invalid material_id'], 400);
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO lesson (material_id, title, description) VALUES (?,?,?)');
        $stmt->execute([$material_id, $data['title'], $data['description'] ?? null]);
        json_response(['message' => 'Lesson created', 'lesson_id' => $pdo->lastInsertId()], 201);
    } catch (Exception $e) {
        json_response(['error' => $e->getMessage()], 500);
    }
}

if (preg_match('#^/api/lessons/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
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
    require_teacher();
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
    $stmt = $pdo->query('SELECT id, title, material_id FROM lesson');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/problems' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, lesson_id, title, markdown, type, created_at FROM problem');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// ユーザー一覧（管理者のみ）
if ($path === '/api/users' && $method === 'GET') {
    require_admin();
    // ユーザーと所属クラス情報を取得
    $stmt = $pdo->query('
        SELECT 
            u.id, 
            u.username, 
            u.is_admin,
            u.role,
            c.name as class_name
        FROM user u
        LEFT JOIN class c ON u.class_id = c.id
        ORDER BY u.id ASC
    ');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// 管理者によるユーザー削除（退会想定）
if (preg_match('#^/api/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_admin();
    $uid = (int)$m[1];
    if ($uid === ($current_user['id'] ?? -1)) {
        json_response(['error' => 'cannot delete yourself'], 400);
    }
    // 外部キーON DELETE CASCADEのため関連データは自動削除（submission）
    $stmt = $pdo->prepare('DELETE FROM user WHERE id = ?');
    $stmt->execute([$uid]);
    json_response(['message' => 'User deleted']);
}

// クラス一覧/作成（管理者のみ）
if ($path === '/api/classes' && $method === 'GET') {
    require_admin();
    $stmt = $pdo->query('SELECT id, name, description, created_at, display_order FROM class ORDER BY display_order ASC, id ASC');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// クラス未所属ユーザー一覧（管理者）
if ($path === '/api/classes/unassigned' && $method === 'GET') {
    require_admin();
    $stmt = $pdo->query('SELECT id, username, is_admin FROM user WHERE class_id IS NULL ORDER BY id ASC');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/classes' && $method === 'POST') {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['name'])) json_response(['error' => 'name required'], 400);
    // 最大display_orderを取得
    $maxOrder = $pdo->query('SELECT COALESCE(MAX(display_order), -1) FROM class')->fetchColumn();
    $stmt = $pdo->prepare('INSERT INTO class (name, description, display_order) VALUES (?, ?, ?)');
    $stmt->execute([$data['name'], $data['description'] ?? null, $maxOrder + 1]);
    json_response(['message' => 'Class created', 'class_id' => $pdo->lastInsertId()], 201);
}

// クラスの表示順序を更新（管理者のみ）
if ($path === '/api/classes/reorder' && $method === 'POST') {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $order = $data['order'] ?? [];
    if (!is_array($order)) json_response(['error' => 'order must be an array'], 400);
    
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('UPDATE class SET display_order = ? WHERE id = ?');
        foreach ($order as $index => $classId) {
            $stmt->execute([$index, $classId]);
        }
        $pdo->commit();
        json_response(['message' => 'Order updated']);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_response(['error' => 'Failed to update order: ' . $e->getMessage()], 500);
    }
}

// クラス削除（管理者のみ）
if (preg_match('#^/api/classes/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_admin();
    $class_id = (int)$m[1];
    $stmt = $pdo->prepare('DELETE FROM class WHERE id = ?');
    $stmt->execute([$class_id]);
    cache_delete('classes_list');
    json_response(['message' => 'Class deleted']);
}

// クラスのメンバー取得/追加/削除（管理者のみ）
if (preg_match('#^/api/classes/(\d+)/users$#', $path, $m) && $method === 'GET') {
    require_admin();
    $class_id = (int)$m[1];
    $stmt = $pdo->prepare('SELECT id, username, role FROM user WHERE class_id = ? AND role = "student" ORDER BY id');
    $stmt->execute([$class_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if (preg_match('#^/api/classes/(\d+)/users$#', $path, $m) && $method === 'POST') {
    require_admin();
    $class_id = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    $user_ids = $data['user_ids'] ?? [];
    if (!is_array($user_ids)) json_response(['error' => 'user_ids array required'], 400);
    
    // 各ユーザーをこのクラスに割り当て（以前のクラスから自動削除）
    $upd = $pdo->prepare('UPDATE user SET class_id = ? WHERE id = ? AND role = "student"');
    foreach ($user_ids as $uid) {
        $upd->execute([$class_id, (int)$uid]);
    }
    json_response(['message' => 'Users added']);
}

if (preg_match('#^/api/classes/(\d+)/users$#', $path, $m) && $method === 'DELETE') {
    require_admin();
    $class_id = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    $user_ids = $data['user_ids'] ?? [];
    if (!is_array($user_ids)) json_response(['error' => 'user_ids array required'], 400);
    
    // クラスから削除（class_id = NULL）
    $del = $pdo->prepare('UPDATE user SET class_id = NULL WHERE id = ? AND class_id = ?');
    foreach ($user_ids as $uid) {
        $del->execute([(int)$uid, $class_id]);
    }
    json_response(['message' => 'Users removed']);
}

// クラスの集計進捗（管理者）
if ($path === '/api/classes/progress' && $method === 'GET') {
    require_admin();
    $classes = $pdo->query('SELECT id, name FROM class ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);
    $res = [];
    foreach ($classes as $c) {
        $cid = (int)$c['id'];
        $memberStmt = $pdo->prepare('SELECT COUNT(*) FROM user WHERE class_id = ?');
        $memberStmt->execute([$cid]);
        $members = (int)$memberStmt->fetchColumn();

        $subStmt = $pdo->prepare('SELECT COUNT(*) FROM submission WHERE user_id IN (SELECT id FROM user WHERE class_id = ?)');
        $subStmt->execute([$cid]);
        $submissions = (int)$subStmt->fetchColumn();

        $corStmt = $pdo->prepare('SELECT COUNT(*) FROM submission WHERE is_correct = 1 AND user_id IN (SELECT id FROM user WHERE class_id = ?)');
        $corStmt->execute([$cid]);
        $correct = (int)$corStmt->fetchColumn();

        $accuracy = $submissions ? round($correct / $submissions * 100, 2) : 0;
        $res[] = [
            'class_id' => $cid,
            'name' => $c['name'],
            'members' => $members,
            'submissions' => $submissions,
            'correct' => $correct,
            'accuracy' => $accuracy,
        ];
    }
    json_response($res);
}

// クラスのユーザー別進捗（管理者）
if (preg_match('#^/api/classes/(\\d+)/user_progress$#', $path, $m) && $method === 'GET') {
    require_admin();
    $cid = (int)$m[1];
    $stmt = $pdo->prepare("SELECT u.id, u.username, COUNT(s.id) AS submissions, SUM(CASE WHEN s.is_correct = 1 THEN 1 ELSE 0 END) AS correct FROM user u LEFT JOIN submission s ON u.id = s.user_id WHERE u.class_id = ? GROUP BY u.id, u.username");
    $stmt->execute([$cid]);
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

// クラス別の詳細進捗データ（管理者）
if (preg_match('#^/api/classes/(\\d+)/progress$#', $path, $m) && $method === 'GET') {
    require_admin();
    $cid = (int)$m[1];
    
    // クラスのメンバーIDを取得
    $memberStmt = $pdo->prepare('SELECT id FROM user WHERE class_id = ?');
    $memberStmt->execute([$cid]);
    $memberIds = $memberStmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($memberIds)) {
        // メンバーがいない場合は空データを返す
        json_response([
            'total_assignments' => 0,
            'correct' => 0,
            'incorrect' => 0,
            'unsubmitted' => 0,
            'daily_counts' => [],
            'material_progress' => [],
            'lesson_progress' => []
        ]);
    }
    
    $placeholders = implode(',', array_fill(0, count($memberIds), '?'));
    
    // 提出状況の集計
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
            SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
        FROM submission 
        WHERE user_id IN ($placeholders)
    ");
    $stmt->execute($memberIds);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $totalAssignments = $pdo->query('SELECT COUNT(*) FROM assignment')->fetchColumn();
    $totalSubmitted = (int)$stats['total'];
    $unsubmitted = max(0, ($totalAssignments * count($memberIds)) - $totalSubmitted);
    
    // 日別提出数（正解/不正解含む）
    $dailyStmt = $pdo->prepare("
        SELECT 
            DATE(submitted_at) as date,
            COUNT(*) as count,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
            SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
        FROM submission 
        WHERE user_id IN ($placeholders)
        GROUP BY DATE(submitted_at) 
        ORDER BY date DESC 
        LIMIT 30
    ");
    $dailyStmt->execute($memberIds);
    $dailyCounts = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 教材別進捗
    $materialStmt = $pdo->prepare("
        SELECT 
            m.id as material_id,
            m.title,
            COUNT(DISTINCT a.id) as total,
            COUNT(DISTINCT CASE WHEN s.is_correct = 1 THEN s.assignment_id END) as completed
        FROM material m
        LEFT JOIN lesson l ON l.material_id = m.id
        LEFT JOIN assignment a ON a.lesson_id = l.id
        LEFT JOIN submission s ON s.assignment_id = a.id AND s.user_id IN ($placeholders)
        GROUP BY m.id, m.title
        ORDER BY m.id
    ");
    $materialStmt->execute($memberIds);
    $materialProgress = $materialStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // レッスン別進捗
    $lessonStmt = $pdo->prepare("
        SELECT 
            l.id as lesson_id,
            l.title,
            COUNT(DISTINCT a.id) as total,
            COUNT(DISTINCT CASE WHEN s.is_correct = 1 THEN s.assignment_id END) as completed
        FROM lesson l
        LEFT JOIN assignment a ON a.lesson_id = l.id
        LEFT JOIN submission s ON s.assignment_id = a.id AND s.user_id IN ($placeholders)
        GROUP BY l.id, l.title
        ORDER BY l.id
    ");
    $lessonStmt->execute($memberIds);
    $lessonProgress = $lessonStmt->fetchAll(PDO::FETCH_ASSOC);
    
    json_response([
        'total_assignments' => (int)$totalAssignments,
        'correct' => (int)$stats['correct'],
        'incorrect' => (int)$stats['incorrect'],
        'unsubmitted' => $unsubmitted,
        'daily_counts' => $dailyCounts,
        'material_progress' => $materialProgress,
        'lesson_progress' => $lessonProgress
    ]);
}

// 管理用リセット（コンテンツ削除）
if ($path === '/api/admin/reset' && $method === 'POST') {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $scope = $data['scope'] ?? 'content';
    if ($scope !== 'content') {
        json_response(['error' => 'unsupported scope'], 400);
    }
    // 依存関係のある順で削除
    $pdo->exec('DELETE FROM submission');
    $pdo->exec('DELETE FROM test_case');
    $pdo->exec('DELETE FROM assignment_target');
    $pdo->exec('DELETE FROM assignment');
    $pdo->exec('DELETE FROM problem');
    $pdo->exec('DELETE FROM lesson');
    $pdo->exec('DELETE FROM material');
    // キャッシュ削除
    cache_delete('progress_all');
    // ユーザー別キャッシュはファイル列挙できないためスキップ（短TTL）
    json_response(['message' => 'Content reset completed']);
}

if ($path === '/api/problems' && $method === 'POST') {
    require_teacher();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['lesson_id']) || !isset($data['title'])) {
        json_response(['error' => 'lesson_id and title required'], 400);
    }
    $type = $data['type'] ?? 'code';
    $stmt = $pdo->prepare('INSERT INTO problem (lesson_id, title, markdown, type, created_at) VALUES (?,?,?,?,datetime("now"))');
    $stmt->execute([
        $data['lesson_id'],
        $data['title'],
        $data['markdown'] ?? null,
        $type
    ]);
    json_response(['message' => 'Problem created', 'problem_id' => $pdo->lastInsertId()], 201);
}


if ($path === '/api/problems/by_lesson' && $method === 'GET') {
    $lesson_id = $_GET['lesson_id'] ?? null;
    if ($lesson_id) {
        $stmt = $pdo->prepare('SELECT id, lesson_id, title, markdown, type, created_at FROM problem WHERE lesson_id = ?');
        $stmt->execute([$lesson_id]);
    } else {
        // lesson_id が指定されない場合はすべての問題を取得（採点ページ用）
        $stmt = $pdo->prepare('SELECT DISTINCT p.id, p.lesson_id, p.title, p.markdown, p.type, p.created_at FROM problem p WHERE p.type = "essay" ORDER BY p.created_at DESC');
        $stmt->execute();
    }
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if (preg_match('#^/api/problems/(\d+)$#', $path, $m) && $method === 'GET') {
    $id = $m[1];
    $stmt = $pdo->prepare('SELECT id, lesson_id, title, markdown, type, created_at FROM problem WHERE id = ?');
    $stmt->execute([$id]);
    $problem = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$problem) {
        json_response(['error' => 'Problem not found'], 404);
    } else {
        json_response($problem);
    }
}

if (preg_match('#^/api/problems/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_response(['error' => 'invalid json'], 400);
    $stmt = $pdo->prepare('UPDATE problem SET lesson_id = COALESCE(?, lesson_id), title = COALESCE(?, title), markdown = COALESCE(?, markdown), type = COALESCE(?, type) WHERE id = ?');
    $stmt->execute([
        $data['lesson_id'] ?? null,
        $data['title'] ?? null,
        $data['markdown'] ?? null,
        $data['type'] ?? null,
        $id
    ]);
    json_response(['message' => 'Problem updated']);
}

if (preg_match('#^/api/problems/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_teacher();
    $id = $m[1];
    $stmt = $pdo->prepare('DELETE FROM problem WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['message' => 'Problem deleted']);
}

if ($path === '/api/assignments' && $method === 'GET') {
    $stmt = $pdo->query('SELECT id, lesson_id, title, description, question_text, input_example, expected_output, file_path, created_at FROM assignment');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// 現在のユーザーに配布された宿題一覧（明示的に割り当てられたもののみ）
if ($path === '/api/assignments/available' && $method === 'GET') {
    global $current_user;
    $uid = $current_user['id'];
    $sql = 'SELECT a.id, a.lesson_id, a.title, a.description, a.question_text, a.input_example, a.expected_output, a.file_path, a.created_at
            FROM assignment a
            WHERE 
              EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="all")
              OR EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="user" AND t.target_id = :uid)
              OR EXISTS (
                  SELECT 1 FROM assignment_target t
                  WHERE t.assignment_id=a.id AND t.target_type="class" AND t.target_id = (SELECT class_id FROM user WHERE id = :uid2 AND class_id IS NOT NULL)
              )
            ORDER BY a.created_at DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':uid' => $uid, ':uid2' => $uid]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/assignments' && $method === 'POST') {
    require_teacher();
    $title = $_POST['title'] ?? null;
    $lesson_id = $_POST['lesson_id'] ?? null;
    if (!$title || !$lesson_id) json_response(['error' => 'title and lesson_id required'], 400);
    $description = $_POST['description'] ?? null;
    $question_text = $_POST['question_text'] ?? null;
    $input_example = $_POST['input_example'] ?? null;
    $expected_output = $_POST['expected_output'] ?? null;

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

    $stmt = $pdo->prepare('INSERT INTO assignment (lesson_id, title, description, question_text, input_example, expected_output, file_path, created_at) VALUES (?,?,?,?,?,?,?,datetime("now"))');
    $stmt->execute([$lesson_id, $title, $description, $question_text, $input_example, $expected_output, $file_path]);
    $aid = $pdo->lastInsertId();

    // 配布対象の登録: target_type = all|users|classes, target_ids = JSON array (strings or numbers)
    $target_type = $_POST['target_type'] ?? 'all';
    $target_ids_raw = $_POST['target_ids'] ?? '[]';
    $target_ids = json_decode($target_ids_raw, true);
    if (!is_array($target_ids)) $target_ids = [];

    if ($target_type === 'all') {
        $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,NULL)')
            ->execute([$aid, 'all']);
    } elseif ($target_type === 'users') {
        $ins = $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,?)');
        foreach ($target_ids as $uid) {
            $ins->execute([$aid, 'user', (int)$uid]);
        }
    } elseif ($target_type === 'classes') {
        $ins = $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,?)');
        foreach ($target_ids as $cid) {
            $ins->execute([$aid, 'class', (int)$cid]);
        }
    }

    json_response(['message' => 'Assignment created', 'assignment_id' => $aid], 201);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, lesson_id, title, description, question_text, input_example, expected_output, file_path, created_at FROM assignment WHERE id = ?');
    $stmt->execute([$m[1]]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$assignment) json_response(['error' => 'Not found'], 404);
    json_response($assignment);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
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
    require_teacher();
    $stmt = $pdo->prepare('DELETE FROM assignment WHERE id = ?');
    $stmt->execute([$m[1]]);
    json_response(['message' => 'Assignment deleted']);
}

// 宿題の割り当て先を更新（先生以上）
if (preg_match('#^/api/assignments/(\d+)/targets$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $aid = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_response(['error' => 'invalid json'], 400);
    
    $target_type = $data['target_type'] ?? 'all';
    $target_ids = $data['target_ids'] ?? [];
    if (!is_array($target_ids)) $target_ids = [];
    
    // 既存の割り当てを削除
    $pdo->prepare('DELETE FROM assignment_target WHERE assignment_id = ?')->execute([$aid]);
    
    // 新しい割り当てを追加
    if ($target_type === 'all') {
        $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,NULL)')
            ->execute([$aid, 'all']);
    } elseif ($target_type === 'users') {
        $ins = $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,?)');
        foreach ($target_ids as $uid) {
            $ins->execute([$aid, 'user', (int)$uid]);
        }
    } elseif ($target_type === 'classes') {
        $ins = $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,?)');
        foreach ($target_ids as $cid) {
            $ins->execute([$aid, 'class', (int)$cid]);
        }
    }
    
    json_response(['message' => 'Assignment targets updated']);
}

// 宿題の現在の割り当て先を取得（先生以上）
if (preg_match('#^/api/assignments/(\d+)/targets$#', $path, $m) && $method === 'GET') {
    require_teacher();
    $aid = (int)$m[1];
    $stmt = $pdo->prepare('SELECT target_type, target_id FROM assignment_target WHERE assignment_id = ?');
    $stmt->execute([$aid]);
    $targets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_response(['targets' => $targets]);
}

// 宿題の特定の割り当てを削除（先生以上）
if (preg_match('#^/api/assignments/(\d+)/targets/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_teacher();
    $aid = (int)$m[1];
    $target_id = (int)$m[2];
    $stmt = $pdo->prepare('DELETE FROM assignment_target WHERE id = ? AND assignment_id = ?');
    $stmt->execute([$target_id, $aid]);
    json_response(['message' => 'Target removed']);
}

// 割り当て済みの宿題一覧を取得（先生以上）
if ($path === '/api/assignments/assigned' && $method === 'GET') {
    require_teacher();
    $stmt = $pdo->prepare('SELECT DISTINCT 
        a.id, a.lesson_id, a.title, a.description, a.question_text, 
        l.title as lesson_title, m.title as material_title,
        t.id as target_id, t.target_type, t.target_id as target_assigned_id,
        CASE WHEN t.target_type="all" THEN "全体" 
             WHEN t.target_type="user" THEN "ユーザー" 
             WHEN t.target_type="class" THEN "クラス" END as target_label,
        CASE WHEN t.target_type="user" THEN u.username 
             WHEN t.target_type="class" THEN c.name END as target_name
    FROM assignment a
    LEFT JOIN lesson l ON a.lesson_id = l.id
    LEFT JOIN material m ON l.material_id = m.id
    INNER JOIN assignment_target t ON a.id = t.assignment_id
    LEFT JOIN user u ON t.target_type="user" AND t.target_id = u.id
    LEFT JOIN class c ON t.target_type="class" AND t.target_id = c.id
    ORDER BY m.id, l.id, a.id');
    $stmt->execute();
    $assigned = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_response(['assigned' => $assigned]);
}

if ($path === '/api/testcases' && $method === 'POST') {
    require_teacher();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['assignment_id']) || !array_key_exists('input', $data) || !array_key_exists('expected_output', $data)) {
        json_response(['error' => 'missing fields'], 400);
    }
    $stmt = $pdo->prepare('INSERT INTO test_case (assignment_id, input, expected_output, comment) VALUES (?,?,?,?)');
    $stmt->execute([
        $data['assignment_id'],
        $data['input'],
        $data['expected_output'],
        $data['comment'] ?? null
    ]);
    json_response(['message' => 'Test case created', 'testcase_id' => $pdo->lastInsertId()], 201);
}

if ($path === '/api/testcases' && $method === 'GET') {
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
    require_admin();
    $id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!array_key_exists('input', $data) || !array_key_exists('expected_output', $data)) {
        json_response(['error' => 'missing fields'], 400);
    }
    $stmt = $pdo->prepare('UPDATE test_case SET input = ?, expected_output = ?, comment = COALESCE(?, comment) WHERE id = ?');
    $stmt->execute([
        $data['input'],
        $data['expected_output'],
        $data['comment'] ?? null,
        $id
    ]);
    json_response(['message' => 'Updated']);
}

if (preg_match('#^/api/testcases/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_admin();
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
            $output .= "入力:\n{$case['input']}\n\n期待される出力:\n{$case['expected_output']}\n\nあなたの出力:\n{$result_text}\n\n";
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
        $all_passed ? 'すべてのテストケースに合格しました！' : 'いくつかのテストケースが失敗しました\n\n' . $output
    ]);
    // 進捗キャッシュを無効化
    cache_delete('progress_all');
    cache_delete('progress_' . $data['user_id']);

    json_response(['message' => 'Submission processed', 'is_correct' => $all_passed ? 1 : 0, 'feedback' => $all_passed ? 'すべてのテストケースに合格しました！' : 'いくつかのテストケースが失敗しました\n\n' . $output]);
}

if (preg_match('#^/api/submissions/(\d+)$#', $path, $m) && $method === 'GET') {
    global $current_user;
    $user_id = $m[1];
    if ($current_user['id'] != $user_id && empty($current_user['is_admin'])) {
        json_response(['error' => 'forbidden'], 403);
    }
    $stmt = $pdo->prepare('SELECT id, assignment_id, is_correct, feedback, code, submitted_at FROM submission WHERE user_id = ? ORDER BY submitted_at DESC');
    $stmt->execute([$user_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/progress' && $method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $force = isset($_GET['force']);
    $cacheKey = 'progress_' . ($user_id ?: 'all');
    if (!$force && ($cached = cache_get($cacheKey))) {
        json_response($cached);
    }

    if ($user_id) {
        // 提出数・正解数は提出テーブルから
        $totalStmt = $pdo->prepare('SELECT COUNT(*) FROM submission WHERE user_id = ?');
        $totalStmt->execute([$user_id]);
        $totalSub = (int)$totalStmt->fetchColumn();

        // 正解した異なる課題の数
        $correctStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE user_id = ? AND is_correct = 1');
        $correctStmt->execute([$user_id]);
        $correct = (int)$correctStmt->fetchColumn();

        // 少なくとも1回提出した異なる課題の数
        $attemptedStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE user_id = ?');
        $attemptedStmt->execute([$user_id]);
        $attempted = (int)$attemptedStmt->fetchColumn();

        // ユーザーに配布された宿題総数（all/user/class のみ）
        $countSql = 'SELECT COUNT(*) FROM assignment a WHERE 
            EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="all")
            OR EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="user" AND t.target_id = :uid)
            OR EXISTS (
                SELECT 1 FROM assignment_target t
                WHERE t.assignment_id=a.id AND t.target_type="class" AND t.target_id = (SELECT class_id FROM user WHERE id = :uid2 AND class_id IS NOT NULL)
            )';
        $totalAssignStmt = $pdo->prepare($countSql);
        $totalAssignStmt->execute([':uid' => $user_id, ':uid2' => $user_id]);
        $totalAssignments = (int)$totalAssignStmt->fetchColumn();
    } else {
        $totalStmt = $pdo->query('SELECT COUNT(*) FROM submission');
        $totalSub = (int)$totalStmt->fetchColumn();

        // 正解した異なる課題の数
        $correctStmt = $pdo->query('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE is_correct = 1');
        $correct = (int)$correctStmt->fetchColumn();

        // 少なくとも1回提出した異なる課題の数
        $attemptedStmt = $pdo->query('SELECT COUNT(DISTINCT assignment_id) FROM submission');
        $attempted = (int)$attemptedStmt->fetchColumn();
    }

    // 不正解数 = 挑戦したが未正解の課題数
    $incorrect = $attempted - $correct;
    if (!$user_id) {
        // 管理者の場合：全学生に割り当てられた課題の延べ数をカウント
        // （同じ課題が複数の学生に割り当てられている場合は複数回カウント）
        $totalAssignSql = 'SELECT COUNT(*) FROM (
            SELECT DISTINCT a.id, u.id as user_id
            FROM assignment a
            CROSS JOIN user u
            WHERE u.role = "student"
            AND (
                EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="all")
                OR EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="user" AND t.target_id = u.id)
                OR EXISTS (
                    SELECT 1 FROM assignment_target t
                    WHERE t.assignment_id=a.id AND t.target_type="class" AND t.target_id = u.class_id AND u.class_id IS NOT NULL
                )
            )
        )';
        $totalStmtAll = $pdo->query($totalAssignSql);
        $totalAssignments = (int)$totalStmtAll->fetchColumn();
    }
    // 未提出数 = 総課題数 - 挑戦した課題数
    $unsubmitted = $totalAssignments - $attempted;

    if ($user_id) {
        $dailyStmt = $pdo->prepare('SELECT substr(submitted_at,1,10) as date, COUNT(*) as count, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect FROM submission WHERE user_id = ? GROUP BY substr(submitted_at,1,10) ORDER BY date DESC LIMIT 30');
        $dailyStmt->execute([$user_id]);
    } else {
        $dailyStmt = $pdo->query('SELECT substr(submitted_at,1,10) as date, COUNT(*) as count, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect FROM submission GROUP BY substr(submitted_at,1,10) ORDER BY date DESC LIMIT 30');
    }
    $daily = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

    $materials = [];
    $matStmt = $pdo->query('SELECT id, title FROM material');
    foreach ($matStmt as $m) {
        if ($user_id) {
            // ユーザーに割り当てられた宿題のみカウント
            $totalP = $pdo->prepare('SELECT COUNT(DISTINCT a.id) FROM assignment a 
                JOIN lesson ON a.lesson_id = lesson.id 
                WHERE lesson.material_id = ? AND (
                    EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="all")
                    OR EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="user" AND t.target_id = ?)
                    OR EXISTS (
                        SELECT 1 FROM assignment_target t
                        WHERE t.assignment_id=a.id AND t.target_type="class" AND t.target_id = (SELECT class_id FROM user WHERE id = ? AND class_id IS NOT NULL)
                    )
                )');
            $totalP->execute([$m['id'], $user_id, $user_id]);
        } else {
            $totalP = $pdo->prepare('SELECT COUNT(*) FROM assignment JOIN lesson ON assignment.lesson_id = lesson.id WHERE lesson.material_id = ?');
            $totalP->execute([$m['id']]);
        }
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

    $lessons = [];
    $lessonStmt = $pdo->query('SELECT id, title FROM lesson');
    foreach ($lessonStmt as $l) {
        if ($user_id) {
            // ユーザーに割り当てられた宿題のみカウント
            $totalA = $pdo->prepare('SELECT COUNT(DISTINCT a.id) FROM assignment a 
                WHERE a.lesson_id = ? AND (
                    EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="all")
                    OR EXISTS (SELECT 1 FROM assignment_target t WHERE t.assignment_id=a.id AND t.target_type="user" AND t.target_id = ?)
                    OR EXISTS (
                        SELECT 1 FROM assignment_target t
                        WHERE t.assignment_id=a.id AND t.target_type="class" AND t.target_id = (SELECT class_id FROM user WHERE id = ? AND class_id IS NOT NULL)
                    )
                )');
            $totalA->execute([$l['id'], $user_id, $user_id]);
        } else {
            $totalA = $pdo->prepare('SELECT COUNT(*) FROM assignment WHERE lesson_id = ?');
            $totalA->execute([$l['id']]);
        }
        $total = (int)$totalA->fetchColumn();

        if ($user_id) {
            $compStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment.id) FROM assignment JOIN submission s ON s.assignment_id = assignment.id WHERE s.user_id = ? AND s.is_correct = 1 AND assignment.lesson_id = ?');
            $compStmt->execute([$user_id, $l['id']]);
        } else {
            $compStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment.id) FROM assignment JOIN submission s ON s.assignment_id = assignment.id WHERE s.is_correct = 1 AND assignment.lesson_id = ?');
            $compStmt->execute([$l['id']]);
        }
        $completed = (int)$compStmt->fetchColumn();

        $lessons[] = [
            'lesson_id' => (int)$l['id'],
            'title' => $l['title'],
            'completed' => $completed,
            'total' => $total
        ];
    }

    $response = [
        'total_assignments' => $totalAssignments,
        'correct' => $correct,
        'incorrect' => $incorrect,
        'unsubmitted' => $unsubmitted,
        'daily_counts' => $daily,
        'material_progress' => $materials,
        'lesson_progress' => $lessons
    ];
    cache_set($cacheKey, $response, 60);
    json_response($response);
}

if ($path === '/api/user_progress' && $method === 'GET') {
    $stmt = $pdo->query("SELECT u.id, u.username, COUNT(s.id) AS submissions, SUM(CASE WHEN s.is_correct = 1 THEN 1 ELSE 0 END) AS correct FROM user u LEFT JOIN submission s ON u.id = s.user_id GROUP BY u.id, u.username");
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
    // 一度も提出していないユーザー（全体）
    $stmt = $pdo->query('SELECT id, username FROM user WHERE id NOT IN (SELECT DISTINCT user_id FROM submission)');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_response($users);
}

// 客観式問題の選択肢一覧取得
if (preg_match('#^/api/problems/(\d+)/choices$#', $path, $m) && $method === 'GET') {
    $problem_id = (int)$m[1];
    $stmt = $pdo->prepare('SELECT id, problem_id, choice_text, is_correct, display_order FROM problem_choice WHERE problem_id = ? ORDER BY display_order ASC');
    $stmt->execute([$problem_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// 客観式問題の選択肢を保存（管理者のみ）
if (preg_match('#^/api/problems/(\d+)/choices$#', $path, $m) && $method === 'POST') {
    require_admin();
    $problem_id = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['choices']) || !is_array($data['choices'])) {
        json_response(['error' => 'choices array required'], 400);
    }
    
    // 既存の選択肢を削除
    $pdo->prepare('DELETE FROM problem_choice WHERE problem_id = ?')->execute([$problem_id]);
    
    // 新しい選択肢を挿入
    $stmt = $pdo->prepare('INSERT INTO problem_choice (problem_id, choice_text, is_correct, display_order) VALUES (?,?,?,?)');
    foreach ($data['choices'] as $idx => $choice) {
        $stmt->execute([
            $problem_id,
            $choice['text'] ?? '',
            $choice['is_correct'] ?? 0,
            $idx
        ]);
    }
    json_response(['message' => 'Choices saved']);
}

// 文章問題の提出
if ($path === '/api/essay-submissions' && $method === 'POST') {
    global $current_user;
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['problem_id'], $data['answer_text'])) {
        json_response(['error' => 'problem_id and answer_text required'], 400);
    }
    
    $stmt = $pdo->prepare('INSERT INTO essay_submission (user_id, problem_id, answer_text, submitted_at) VALUES (?,?,?,datetime("now"))');
    $stmt->execute([$current_user['id'], (int)$data['problem_id'], $data['answer_text']]);
    json_response(['message' => 'Essay submitted', 'submission_id' => $pdo->lastInsertId()], 201);
}

// 文章問題の採点（管理者/先生のみ）
if (preg_match('#^/api/essay-submissions/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_admin(); // 将来は先生も可能にする
    $submission_id = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['grade'], $data['feedback'])) {
        json_response(['error' => 'grade and feedback required'], 400);
    }
    
    $stmt = $pdo->prepare('UPDATE essay_submission SET is_graded = 1, grade = ?, feedback = ?, graded_at = datetime("now") WHERE id = ?');
    $stmt->execute([$data['grade'], $data['feedback'], $submission_id]);
    json_response(['message' => 'Essay graded']);
}

// 文章問題の提出一覧（管理者/先生のみ）
if ($path === '/api/essay-submissions' && $method === 'GET') {
    // admin と teacher のみアクセス可能
    if ($user_role !== 'admin' && $user_role !== 'teacher') {
        json_response(['error' => 'Unauthorized'], 403);
        exit;
    }
    $problem_id = $_GET['problem_id'] ?? null;
    $user_id = $_GET['user_id'] ?? null;
    
    $where = [];
    $params = [];
    if ($problem_id) {
        $where[] = 'es.problem_id = ?';
        $params[] = (int)$problem_id;
    }
    if ($user_id) {
        $where[] = 'es.user_id = ?';
        $params[] = (int)$user_id;
    }
    
    $where_clause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $pdo->prepare("SELECT es.id, es.user_id, es.problem_id, es.answer_text, es.is_graded, es.grade, es.feedback, es.submitted_at, es.graded_at, u.username, p.title as problem_title FROM essay_submission es LEFT JOIN user u ON es.user_id = u.id LEFT JOIN problem p ON es.problem_id = p.id $where_clause ORDER BY es.submitted_at DESC");
    $stmt->execute($params);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

json_response(['error' => 'Not found'], 404);
?>
