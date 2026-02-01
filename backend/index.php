<?php
// エラーハンドリングの設定
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ob_start(); // 出力バッファーを開始

// エラーハンドラーを設定して、JSONエラーを返す
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // 出力バッファーをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    error_log("[$errfile:$errline] $errstr");
    // JSONレスポンスが開始している場合はスキップ
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Internal Server Error', 'detail' => $errstr]);
    }
    exit;
});

set_exception_handler(function($exception) {
    // 出力バッファーをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    error_log($exception->__toString());
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Internal Server Error', 'detail' => $exception->getMessage()]);
    }
    exit;
});

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
$secret = getenv('JWT_SECRET');
if (!$secret) {
    http_response_code(500);
    echo json_encode(['error' => 'JWT_SECRET not configured']);
    exit;
}
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

// 進捗系キャッシュをまとめて無効化
function clear_progress_cache_all() {
    global $pdo;
    cache_delete('progress_all');
    // 全ユーザー分のキャッシュを削除（件数が多くても TTL は短いため許容）
    $stmt = $pdo->query('SELECT id FROM user');
    foreach ($stmt as $row) {
        $uid = (int)($row['id'] ?? 0);
        if ($uid > 0) {
            cache_delete('progress_' . $uid);
        }
    }
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
    // 出力バッファーをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// 比較を緩和し、空白（改行・スペース）区切りのトークン一致で判定
function outputs_match($expected, $actual): bool {
    $normalize = function ($s) {
        $tokens = preg_split('/\s+/', trim((string)$s));
        // preg_split returns array(1 => "") when empty string; normalize to []
        if ($tokens === false) return [];
        $tokens = array_values(array_filter($tokens, function ($t) { return $t !== ''; }));
        return $tokens;
    };

    $e = $normalize($expected);
    $a = $normalize($actual);

    if (empty($e) && empty($a)) return true;
    return $e === $a;
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
    $last_name = $data['last_name'] ?? null;
    $first_name = $data['first_name'] ?? null;
    $furigana = $data['furigana'] ?? null;
    
    $stmt = $pdo->prepare('SELECT id FROM user WHERE username = ?');
    $stmt->execute([$data['username']]);
    if ($stmt->fetch()) {
        json_response(['error' => 'username exists'], 409);
    }
    $hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO user (username, password_hash, last_name, first_name, furigana, is_admin, role) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([$data['username'], $hash, $last_name, $first_name, $furigana, $is_admin, $role]);
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

// ユーザー一覧（管理者・先生）
if ($path === '/api/users' && $method === 'GET') {
    require_teacher();
    // ユーザーと所属クラス情報を取得
    $stmt = $pdo->query('
        SELECT 
            u.id, 
            u.username,
            u.name,
            u.last_name,
            u.first_name,
            u.furigana,
            u.is_admin,
            u.role,
            u.class_id,
            c.name as class_name
        FROM user u
        LEFT JOIN class c ON u.class_id = c.id
        ORDER BY u.id ASC
    ');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// ユーザー情報の編集（管理者・先生）
if (preg_match('#^/api/users/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $uid = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 更新対象のユーザーが存在するか確認
    $stmt = $pdo->prepare('SELECT id FROM user WHERE id = ?');
    $stmt->execute([$uid]);
    if (!$stmt->fetch()) {
        json_response(['error' => 'User not found'], 404);
    }
    
    // 更新フィールド（ロールとパスワードは管理者のみ）
    $updates = [];
    $params = [];
    
    if (isset($data['last_name'])) {
        $updates[] = 'last_name = ?';
        $params[] = $data['last_name'];
    }
    if (isset($data['first_name'])) {
        $updates[] = 'first_name = ?';
        $params[] = $data['first_name'];
    }
    if (isset($data['furigana'])) {
        $updates[] = 'furigana = ?';
        $params[] = $data['furigana'];
    }
    
    // 表示名（name）は自動的に「姓 名」で生成
    $has_name_change = isset($data['last_name']) || isset($data['first_name']);
    if ($has_name_change) {
        // 現在のlast_name/first_nameを取得（未指定の場合）
        if (!isset($data['last_name']) || !isset($data['first_name'])) {
            $stmt = $pdo->prepare('SELECT last_name, first_name FROM user WHERE id = ?');
            $stmt->execute([$uid]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            $last_name = $data['last_name'] ?? $current['last_name'];
            $first_name = $data['first_name'] ?? $current['first_name'];
        } else {
            $last_name = $data['last_name'];
            $first_name = $data['first_name'];
        }
        // 表示名を自動生成（姓と名の間にスペース、両方がない場合は空）
        $auto_name = trim($last_name . ' ' . $first_name);
        $updates[] = 'name = ?';
        $params[] = $auto_name;
    }
    
    // ロール変更（管理者のみ）
    if (isset($data['role']) && ($current_user['is_admin'] || $current_user['role'] === 'admin')) {
        if (!in_array($data['role'], ['student', 'teacher', 'admin'])) {
            json_response(['error' => 'Invalid role'], 400);
        }
        $updates[] = 'role = ?';
        $params[] = $data['role'];
    }
    
    // パスワード変更（管理者のみ）
    if (isset($data['password']) && ($current_user['is_admin'] || $current_user['role'] === 'admin')) {
        if (strlen($data['password']) < 6) {
            json_response(['error' => 'Password must be at least 6 characters'], 400);
        }
        $updates[] = 'password_hash = ?';

        $params[] = password_hash($data['password'], PASSWORD_BCRYPT);
    }
    
    if (empty($updates)) {
        json_response(['error' => 'No fields to update'], 400);
    }
    
    $params[] = $uid;
    $stmt = $pdo->prepare('UPDATE user SET ' . implode(', ', $updates) . ' WHERE id = ?');
    $stmt->execute($params);
    json_response(['message' => 'User updated']);
}

// 管理者・先生によるユーザー削除（退会想定）
if (preg_match('#^/api/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_teacher();
    $uid = (int)$m[1];
    if ($uid === ($current_user['id'] ?? -1)) {
        json_response(['error' => 'cannot delete yourself'], 400);
    }
    // 外部キーON DELETE CASCADEのため関連データは自動削除（submission）
    $stmt = $pdo->prepare('DELETE FROM user WHERE id = ?');
    $stmt->execute([$uid]);
    json_response(['message' => 'User deleted']);
}

// クラス一覧/作成（管理者・先生）
if ($path === '/api/classes' && $method === 'GET') {
    require_teacher();
    $stmt = $pdo->query('SELECT id, name, description, created_at, display_order FROM class ORDER BY display_order ASC, id ASC');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// クラス未所属ユーザー一覧（管理者）
if ($path === '/api/classes/unassigned' && $method === 'GET') {
    require_teacher();
    $stmt = $pdo->query('SELECT id, username, name, last_name, first_name, furigana, is_admin FROM user WHERE class_id IS NULL ORDER BY id ASC');
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($path === '/api/classes' && $method === 'POST') {
    require_teacher();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['name'])) json_response(['error' => 'name required'], 400);
    // 最大display_orderを取得
    $maxOrder = $pdo->query('SELECT COALESCE(MAX(display_order), -1) FROM class')->fetchColumn();
    $stmt = $pdo->prepare('INSERT INTO class (name, description, display_order) VALUES (?, ?, ?)');
    $stmt->execute([$data['name'], $data['description'] ?? null, $maxOrder + 1]);
    json_response(['message' => 'Class created', 'class_id' => $pdo->lastInsertId()], 201);
}

// クラス名・説明の更新（管理者・先生）
if (preg_match('#^/api/classes/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $cid = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    $name = trim($data['name'] ?? '');
    if ($name === '') {
        json_response(['error' => 'name required'], 400);
    }
    $desc = $data['description'] ?? null;
    $stmt = $pdo->prepare('UPDATE class SET name = ?, description = ? WHERE id = ?');
    $stmt->execute([$name, $desc, $cid]);
    json_response(['message' => 'Class updated']);
}

// クラスの表示順序を更新（管理者のみ）
if ($path === '/api/classes/reorder' && $method === 'POST') {
    require_teacher();
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
    require_teacher();
    $class_id = (int)$m[1];
    $stmt = $pdo->prepare('DELETE FROM class WHERE id = ?');
    $stmt->execute([$class_id]);
    cache_delete('classes_list');
    json_response(['message' => 'Class deleted']);
}

// クラスのメンバー取得/追加/削除（管理者のみ）
if (preg_match('#^/api/classes/(\d+)/users$#', $path, $m) && $method === 'GET') {
    require_teacher();
    $class_id = (int)$m[1];
    $stmt = $pdo->prepare('SELECT id, username, name, last_name, first_name, furigana, role FROM user WHERE class_id = ? AND role = "student" ORDER BY id');
    $stmt->execute([$class_id]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if (preg_match('#^/api/classes/(\d+)/users$#', $path, $m) && $method === 'POST') {
    require_teacher();
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
    require_teacher();
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

// クラスの集計進捗（管理者・先生）
if ($path === '/api/classes/progress' && $method === 'GET') {
    require_teacher();
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

// クラスのユーザー別進捗（管理者・先生）
if (preg_match('#^/api/classes/(\\d+)/user_progress$#', $path, $m) && $method === 'GET') {
    require_teacher();
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

// クラス別の詳細進捗データ（管理者・先生）
if (preg_match('#^/api/classes/(\\d+)/progress$#', $path, $m) && $method === 'GET') {
    require_teacher();
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
            'pending' => 0,
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
            SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect,
            SUM(CASE WHEN is_correct IS NULL THEN 1 ELSE 0 END) as pending
        FROM submission 
        WHERE user_id IN ($placeholders)
    ");
    $stmt->execute($memberIds);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $totalAssignments = $pdo->query('SELECT COUNT(*) FROM assignment')->fetchColumn();
    $totalSubmitted = (int)$stats['total'];
    $unsubmitted = max(0, ($totalAssignments * count($memberIds)) - $totalSubmitted);
    
    // 日別提出数（正解/不正解/採点待ち含む）
    $dailyStmt = $pdo->prepare("
        SELECT 
            DATE(submitted_at) as date,
            COUNT(*) as count,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
            SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect,
            SUM(CASE WHEN is_correct IS NULL THEN 1 ELSE 0 END) as pending
        FROM submission 
        WHERE user_id IN ($placeholders)
        GROUP BY DATE(submitted_at) 
        ORDER BY date DESC 
        LIMIT 30
    ");
    $dailyStmt->execute($memberIds);
    $dailyCounts = array_reverse($dailyStmt->fetchAll(PDO::FETCH_ASSOC));
    
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
        'pending' => (int)$stats['pending'],
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
    $stmt = $pdo->prepare('INSERT INTO problem (lesson_id, title, markdown, type, created_at) VALUES (?,?,?,?,NOW())');
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
        $sql = 'SELECT a.id, a.lesson_id, a.title, a.description, a.question_text, a.input_example, a.expected_output, a.file_path, a.problem_type, a.created_at
                        FROM assignment a';
        $stmt = $pdo->query($sql);
        json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// 現在のユーザーに配布された宿題一覧（明示的に割り当てられたもののみ）
if ($path === '/api/assignments/available' && $method === 'GET') {
    global $current_user;
    $uid = $current_user['id'];
    $role = $current_user['role'] ?? ($current_user['is_admin'] ? 'admin' : 'student');
    if ($role !== 'student') {
        json_response([]);
    }
        $sql = 'SELECT a.id, a.lesson_id, a.title, a.description, a.question_text, a.input_example, a.expected_output, a.file_path, a.problem_type, a.created_at
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
    $problem_type = $_POST['problem_type'] ?? 'code';

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

    $stmt = $pdo->prepare('INSERT INTO assignment (lesson_id, title, description, question_text, input_example, expected_output, file_path, problem_type, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())');
    $stmt->execute([$lesson_id, $title, $description, $question_text, $input_example, $expected_output, $file_path, $problem_type]);
    $aid = $pdo->lastInsertId();

    // 期待される出力があればデフォルトのテストケースを1件作成
    if (!empty(trim((string)$expected_output))) {
        $insTc = $pdo->prepare('INSERT INTO test_case (assignment_id, input, expected_output, comment) VALUES (?,?,?,?)');
        $insTc->execute([$aid, $input_example ?? '', $expected_output, null]);
    }

    // 選択肢の処理（choice 問題型の場合）
    if ($problem_type === 'choice') {
        $choices_json = $_POST['choices'] ?? null;
        if ($choices_json) {
            $choices = json_decode($choices_json, true);
            if (is_array($choices) && count($choices) > 0) {
                $correct_idx = (int)($_POST['correct_answer_index'] ?? 0);
                $ins_choice = $pdo->prepare('INSERT INTO choice_option (assignment_id, option_text, option_order, is_correct) VALUES (?,?,?,?)');
                foreach ($choices as $idx => $choice_text) {
                    $is_correct = ($idx === $correct_idx) ? 1 : 0;
                    $ins_choice->execute([$aid, $choice_text, $idx, $is_correct]);
                }
            }
        }
    }

    // 配布対象の登録: target_type = all|users|classes, target_ids = JSON array (strings or numbers)
    // target_type が送信されていない場合は割り当てなしとする
    $target_type = isset($_POST['target_type']) ? $_POST['target_type'] : null;
    
    if ($target_type !== null) {
        $target_ids_raw = $_POST['target_ids'] ?? '[]';
        $target_ids = json_decode($target_ids_raw, true);
        if (!is_array($target_ids)) $target_ids = [];

        // 管理者・先生は配布対象に含めない（個別指定された場合は無視）
        if ($target_type === 'users' && count($target_ids) > 0) {
            $placeholders = implode(',', array_fill(0, count($target_ids), '?'));
            $stmt = $pdo->prepare("SELECT id FROM user WHERE id IN ($placeholders) AND (role = 'student' OR (role IS NULL AND is_admin = 0))");
            $stmt->execute(array_map('intval', $target_ids));
            $target_ids = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        }

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
    }

    clear_progress_cache_all();
    json_response(['message' => 'Assignment created', 'assignment_id' => $aid], 201);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'GET') {
        $sql = 'SELECT a.id, a.lesson_id, a.title, a.description, a.question_text, a.input_example, a.expected_output, a.file_path, a.problem_type, a.created_at
                        FROM assignment a
                        WHERE a.id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$m[1]]);
        $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$assignment) json_response(['error' => 'Not found'], 404);
        json_response($assignment);
}

// 宿題の選択肢を取得
if (preg_match('#^/api/assignments/(\d+)/choices$#', $path, $m) && $method === 'GET') {
    $aid = (int)$m[1];
    $stmt = $pdo->prepare('SELECT id, assignment_id, option_text, option_order, is_correct FROM choice_option WHERE assignment_id = ? ORDER BY option_order ASC');
    $stmt->execute([$aid]);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $id = $m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_response(['error' => 'invalid json'], 400);
    
    $stmt = $pdo->prepare('UPDATE assignment SET title = COALESCE(?, title), description = COALESCE(?, description), question_text = COALESCE(?, question_text), input_example = COALESCE(?, input_example), expected_output = COALESCE(?, expected_output), problem_type = COALESCE(?, problem_type) WHERE id = ?');
    $stmt->execute([
        $data['title'] ?? null,
        $data['description'] ?? null,
        $data['question_text'] ?? null,
        $data['input_example'] ?? null,
        $data['expected_output'] ?? null,
        $data['problem_type'] ?? null,
        $id
    ]);

    $effectiveInput = $data['input_example'] ?? '';
    $effectiveExpected = $data['expected_output'] ?? '';

    // テストケースの更新
    if (!empty(trim((string)$effectiveExpected))) {
        $pdo->prepare('DELETE FROM test_case WHERE assignment_id = ?')->execute([$id]);
        $insTc = $pdo->prepare('INSERT INTO test_case (assignment_id, input, expected_output, comment) VALUES (?,?,?,?)');
        $insTc->execute([$id, $effectiveInput, $effectiveExpected, null]);
    } else {
        // テストケースをクリア
        $pdo->prepare('DELETE FROM test_case WHERE assignment_id = ?')->execute([$id]);
    }

    // 選択肢の更新（choice 問題型の場合）
    $problem_type = $data['problem_type'] ?? null;
    if ($problem_type === 'choice') {
        $choices = $data['choices'] ?? null;
        if (is_array($choices) && count($choices) > 0) {
            $pdo->prepare('DELETE FROM choice_option WHERE assignment_id = ?')->execute([$id]);
            $correct_idx = (int)($data['correct_answer_index'] ?? 0);
            $ins_choice = $pdo->prepare('INSERT INTO choice_option (assignment_id, option_text, option_order, is_correct) VALUES (?,?,?,?)');
            foreach ($choices as $idx => $choice_text) {
                $is_correct = ($idx === $correct_idx) ? 1 : 0;
                $ins_choice->execute([$id, $choice_text, $idx, $is_correct]);
            }
        }
    } else {
        // choice 以外の問題型に変更された場合は選択肢を削除
        $pdo->prepare('DELETE FROM choice_option WHERE assignment_id = ?')->execute([$id]);
    }

    clear_progress_cache_all();
    json_response(['message' => 'Assignment updated']);
}

if (preg_match('#^/api/assignments/(\d+)$#', $path, $m) && $method === 'DELETE') {
    require_teacher();
    $stmt = $pdo->prepare('DELETE FROM assignment WHERE id = ?');
    $stmt->execute([$m[1]]);
    clear_progress_cache_all();
    json_response(['message' => 'Assignment deleted']);
}

// 宿題の割り当て先を更新（先生以上）
if (preg_match('#^/api/assignments/(\d+)/targets$#', $path, $m) && $method === 'PUT') {
    require_teacher();
    $aid = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) json_response(['error' => 'invalid json'], 400);
    
    error_log("PUT /api/assignments/$aid/targets - data: " . json_encode($data));
    
    $target_type = $data['target_type'] ?? 'all';
    $target_ids = $data['target_ids'] ?? [];
    if (!is_array($target_ids)) $target_ids = [];

    // 管理者・先生は配布対象から除外
    if ($target_type === 'users' && count($target_ids) > 0) {
        $placeholders = implode(',', array_fill(0, count($target_ids), '?'));
        $stmt = $pdo->prepare("SELECT id FROM user WHERE id IN ($placeholders) AND (role = 'student' OR (role IS NULL AND is_admin = 0))");
        $stmt->execute(array_map('intval', $target_ids));
        $target_ids = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    }
    
    // 既存の割り当てを削除
    error_log("Deleting existing targets for assignment $aid");
    $delResult = $pdo->prepare('DELETE FROM assignment_target WHERE assignment_id = ?')->execute([$aid]);
    error_log("Delete result: " . ($delResult ? 'success' : 'failed'));
    
    // 新しい割り当てを追加（target_type = 'none' の場合は何も追加しない）
    if ($target_type === 'all') {
        error_log("Inserting 'all' target for assignment $aid");
        $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,NULL)')
            ->execute([$aid, 'all']);
    } elseif ($target_type === 'users' && count($target_ids) > 0) {
        error_log("Inserting user targets for assignment $aid: " . json_encode($target_ids));
        $ins = $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,?)');
        foreach ($target_ids as $uid) {
            $ins->execute([$aid, 'user', (int)$uid]);
        }
    } elseif ($target_type === 'classes' && count($target_ids) > 0) {
        error_log("Inserting class targets for assignment $aid: " . json_encode($target_ids));
        $ins = $pdo->prepare('INSERT INTO assignment_target (assignment_id, target_type, target_id) VALUES (?,?,?)');
        foreach ($target_ids as $cid) {
            $ins->execute([$aid, 'class', (int)$cid]);
        }
    } else {
        error_log("No targets inserted (target_type=$target_type, count=" . count($target_ids) . ")");
    }
    // target_type === 'none' の場合は何も挿入しない
    
    clear_progress_cache_all();
    error_log("Targets update completed for assignment $aid");
    json_response(['message' => 'Assignment targets updated']);
}

// 宿題の現在の割り当て先を取得（先生以上）
if (preg_match('#^/api/assignments/(\d+)/targets$#', $path, $m) && $method === 'GET') {
    require_teacher();
    $aid = (int)$m[1];
    $stmt = $pdo->prepare('SELECT 
        t.target_type, t.target_id,
        CASE WHEN t.target_type="all" THEN "全体" 
             WHEN t.target_type="user" THEN CONCAT(IFNULL(u.last_name, ""), " ", IFNULL(u.first_name, "")) 
             WHEN t.target_type="class" THEN c.name END as target_name
    FROM assignment_target t
    LEFT JOIN user u ON t.target_type="user" AND t.target_id = u.id
    LEFT JOIN class c ON t.target_type="class" AND t.target_id = c.id
    WHERE t.assignment_id = ?');
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
    clear_progress_cache_all();
    json_response(['message' => 'Target removed']);
}

// 割り当て済みの宿題一覧を取得（先生以上）
if ($path === '/api/assignments/assigned' && $method === 'GET') {
    require_teacher();
    $stmt = $pdo->prepare('SELECT 
        a.id, a.lesson_id, a.title, a.description, a.question_text, 
        l.title as lesson_title, m.title as material_title, m.id as material_id,
        t.id as target_id, t.target_type, t.target_id as target_assigned_id,
        CASE WHEN t.target_type="all" THEN "全体" 
             WHEN t.target_type="user" THEN "ユーザー" 
             WHEN t.target_type="class" THEN "クラス" END as target_label,
        CASE WHEN t.target_type="user" THEN CONCAT(IFNULL(u.last_name, ""), " ", IFNULL(u.first_name, "")) 
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
    $stmt = $pdo->prepare('UPDATE test_case SET input = ?, expected_output = ?, args_json = COALESCE(?, args_json), comment = COALESCE(?, comment) WHERE id = ?');
    $stmt->execute([
        $data['input'],
        $data['expected_output'],
        $data['args_json'] ?? null,
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
    if (!isset($data['assignment_id'])) {
        json_response(['error' => 'assignment_id required'], 400);
    }

        $assignment_id = (int)$data['assignment_id'];
        $stmt = $pdo->prepare('SELECT id, expected_output, input_example, exec_mode, entry_function,
                                                                    CASE
                                                                        WHEN EXISTS (SELECT 1 FROM choice_option co WHERE co.assignment_id = assignment.id) THEN "choice"
                                                                        WHEN assignment.problem_type IS NOT NULL THEN assignment.problem_type
                                                                        ELSE "code"
                                                                    END as problem_type
                                                     FROM assignment WHERE id = ?');
        $stmt->execute([$assignment_id]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$assignment) {
        json_response(['error' => 'assignment not found'], 404);
    }

    $problem_type = $assignment['problem_type'] ?? 'code';
    $user_id = $current_user['id'];

    // 選択式
    if ($problem_type === 'choice') {
        if (!isset($data['selected_choice_id'])) {
            json_response(['error' => 'selected_choice_id required'], 400);
        }
        $selected_choice_id = (int)$data['selected_choice_id'];
        $choiceStmt = $pdo->prepare('SELECT id, is_correct FROM choice_option WHERE id = ? AND assignment_id = ?');
        $choiceStmt->execute([$selected_choice_id, $assignment_id]);
        $choice = $choiceStmt->fetch(PDO::FETCH_ASSOC);
        if (!$choice) {
            json_response(['error' => 'choice not found'], 404);
        }
        $is_correct = ((int)$choice['is_correct'] === 1) ? 1 : 0;
        $feedback = $is_correct ? '正解です。' : '不正解です。';
        $ins = $pdo->prepare('INSERT INTO submission (user_id, assignment_id, selected_choice_id, is_correct, feedback, submitted_at) VALUES (?,?,?,?,?,NOW())');
        $ins->execute([$user_id, $assignment_id, $selected_choice_id, $is_correct, $feedback]);
        clear_progress_cache_all();
        json_response(['message' => 'Submission processed', 'is_correct' => $is_correct, 'feedback' => $feedback]);
    }

    // 記述式
    if ($problem_type === 'essay') {
        if (!isset($data['answer_text']) || trim($data['answer_text']) === '') {
            json_response(['error' => 'answer_text required'], 400);
        }
        $answer_text = trim($data['answer_text']);
        $ins = $pdo->prepare('INSERT INTO submission (user_id, assignment_id, answer_text, is_correct, feedback, submitted_at) VALUES (?,?,?,NULL,NULL,NOW())');
        $ins->execute([$user_id, $assignment_id, $answer_text]);
        clear_progress_cache_all();
        json_response(['message' => 'Essay submitted', 'is_correct' => null]);
    }

    // コード実行
    if (!isset($data['code'])) {
        json_response(['error' => 'code required'], 400);
    }

    $stmt = $pdo->prepare('SELECT input, expected_output, args_json FROM test_case WHERE assignment_id = ?');
    $stmt->execute([$assignment_id]);
    $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $exec_mode = $assignment['exec_mode'] ?? 'stdin';
    $entry_function = $assignment['entry_function'] ?? null;

    // テストケースがない場合のフォールバック
    if (!$cases && !empty($assignment['expected_output'])) {
        $cases = [[
            'input' => $assignment['input_example'] ?? '',
            'expected_output' => $assignment['expected_output'],
            'args_json' => null,
        ]];
    }

    if (!$cases) {
        json_response(['error' => 'No test cases or expected output set'], 400);
    }

    $all_passed = true;
    $output = '';

    if ($exec_mode === 'function') {
        if (!$entry_function) {
            json_response(['error' => 'entry_function is required for function mode'], 400);
        }

        foreach ($cases as $case) {
            $argsRaw = $case['args_json'] ?? null;
            $decodedArgs = null;

            // derive args when args_json is missing: try JSON in input, then numeric, else string
            if ($argsRaw === null) {
                $inputText = isset($case['input']) ? trim((string)$case['input']) : '';
                $jsonAttempt = json_decode($inputText, true);
                if ($jsonAttempt !== null || strtolower($inputText) === 'null') {
                    $decodedArgs = $jsonAttempt;
                } elseif ($inputText === '') {
                    $decodedArgs = [];
                } elseif (is_numeric($inputText)) {
                    $decodedArgs = [0 + $inputText];
                } else {
                    $decodedArgs = [$inputText];
                }
                $argsRaw = json_encode($decodedArgs);
            } else {
                $decodedArgs = json_decode($argsRaw, true);
                if ($decodedArgs === null && $argsRaw !== null) {
                    $decodedArgs = [];
                }
            }
            $codeFile = tempnam(sys_get_temp_dir(), 'fn_code_');
            file_put_contents($codeFile, $data['code']);
            $argsFile = tempnam(sys_get_temp_dir(), 'fn_args_');
            file_put_contents($argsFile, json_encode($decodedArgs));
            $runnerFile = tempnam(sys_get_temp_dir(), 'fn_runner_');
            $entryJson = json_encode($entry_function);
            $runnerSource = <<<PY
import importlib.util, json, sys, traceback

code_path = r"$codeFile"
args_path = r"$argsFile"
entry_name = json.loads('$entryJson')

with open(args_path, 'r', encoding='utf-8') as f:
    try:
        args = json.load(f)
    except Exception:
        print("__ERROR__:invalid args json")
        sys.exit(4)

spec = importlib.util.spec_from_file_location("user_module", code_path)
mod = importlib.util.module_from_spec(spec) if spec else None

if mod is None or spec.loader is None:
    # Fallback: load by exec when importlib cannot create a loader (rare envs)
    ns = {}
    try:
        with open(code_path, 'r', encoding='utf-8') as f:
            code_content = f.read()
        exec(compile(code_content, code_path, 'exec'), ns)
    except Exception:
        traceback.print_exc()
        sys.exit(5)

    if entry_name not in ns:
        print("__ERROR__:function not found")
        sys.exit(2)

    fn = ns[entry_name]
else:
    spec.loader.exec_module(mod)

    if not hasattr(mod, entry_name):
        print("__ERROR__:function not found")
        sys.exit(2)

    fn = getattr(mod, entry_name)

try:
    if isinstance(args, list):
        result = fn(*args)
    elif isinstance(args, dict):
        result = fn(**args)
    else:
        result = fn(args)
    print(result)
except Exception:
    traceback.print_exc()
    sys.exit(3)
PY;
            file_put_contents($runnerFile, $runnerSource);

            $safe_python = '/usr/bin/python3';
            $cmd = 'timeout 5s ' . escapeshellcmd($safe_python) . ' ' . escapeshellarg($runnerFile) . ' 2>&1';
            $result = [];
            $exitCode = 0;
            exec($cmd, $result, $exitCode);
            $result_text = implode("\n", $result);

            $expected = (string)($case['expected_output'] ?? '');
            $passed = outputs_match($expected, $result_text);
            if (!$passed) {
                $all_passed = false;
                $output .= "引数:\n" . ($argsRaw ?? '[]') . "\n\n期待される出力:\n{$expected}\n\nあなたの出力:\n{$result_text}\n\n";
            }

            @unlink($codeFile);
            @unlink($argsFile);
            @unlink($runnerFile);

            if (!$all_passed) {
                break;
            }
        }
    } else {
        // stdin モード
        foreach ($cases as $case) {
            $tmp = tempnam(sys_get_temp_dir(), 'code');
            file_put_contents($tmp, $data['code']);
            $safe_python = '/usr/bin/python3';
            $cmd = 'timeout 5s ' . escapeshellcmd($safe_python) . ' -I -S ' . escapeshellarg($tmp);
            $result = [];
            $input = $case['input'] ?? '';
            exec("echo " . escapeshellarg($input) . " | $cmd", $result);
            $result_text = implode("\n", $result);
            if (trim($result_text) !== trim($case['expected_output'])) {
                $all_passed = false;
                $output .= "入力:\n{$case['input']}\n\n期待される出力:\n{$case['expected_output']}\n\nあなたの出力:\n{$result_text}\n\n";
            }
            unlink($tmp);
            if (!$all_passed) break;
        }
    }

    $ins = $pdo->prepare('INSERT INTO submission (user_id, assignment_id, problem_type, code, is_correct, feedback, submitted_at) VALUES (?,?,?,?,?,?,NOW())');
    $ins->execute([
        $user_id,
        $assignment_id,
        $problem_type,
        $data['code'],
        $all_passed ? 1 : 0,
        $all_passed ? 'すべてのテストケースに合格しました！' : 'いくつかのテストケースが失敗しました\n\n' . $output
    ]);

    clear_progress_cache_all();

    json_response(['message' => 'Submission processed', 'is_correct' => $all_passed ? 1 : 0, 'feedback' => $all_passed ? 'すべてのテストケースに合格しました！' : 'いくつかのテストケースが失敗しました\n\n' . $output]);
}

// コード実行のみ（提出はしないプレビュー用）
if ($path === '/api/run' && $method === 'POST') {
    global $current_user;
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['assignment_id']) || !isset($data['code'])) {
        json_response(['error' => 'assignment_id and code required'], 400);
    }

    $assignment_id = (int)$data['assignment_id'];
    $stmt = $pdo->prepare('SELECT id, expected_output, input_example, exec_mode, entry_function,
                                                                    CASE
                                                                        WHEN EXISTS (SELECT 1 FROM choice_option co WHERE co.assignment_id = assignment.id) THEN "choice"
                                                                        WHEN assignment.problem_type IS NOT NULL THEN assignment.problem_type
                                                                        ELSE "code"
                                                                    END as problem_type
                                                     FROM assignment WHERE id = ?');
    $stmt->execute([$assignment_id]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$assignment) json_response(['error' => 'assignment not found'], 404);

    if (($assignment['problem_type'] ?? 'code') !== 'code') {
        json_response(['error' => 'preview run is only for code assignments'], 400);
    }

    $stmt = $pdo->prepare('SELECT input, expected_output, args_json FROM test_case WHERE assignment_id = ?');
    $stmt->execute([$assignment_id]);
    $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$cases && !empty($assignment['expected_output'])) {
        $cases = [[
            'input' => $assignment['input_example'] ?? '',
            'expected_output' => $assignment['expected_output'],
            'args_json' => null,
        ]];
    }

    if (!$cases) {
        json_response(['error' => 'No test cases or expected output set'], 400);
    }

    $all_passed = true;
    $caseResults = [];

    $execMode = $assignment['exec_mode'] ?? 'stdin';

    if ($execMode === 'function') {
        $entry_function = $assignment['entry_function'] ?? null;
        if (!$entry_function) {
            json_response(['error' => 'entry_function is required for function mode'], 400);
        }

        foreach ($cases as $case) {
            $argsRaw = $case['args_json'] ?? null;
            $decodedArgs = null;

            if ($argsRaw === null) {
                $inputText = isset($case['input']) ? trim((string)$case['input']) : '';
                $jsonAttempt = json_decode($inputText, true);
                if ($jsonAttempt !== null || strtolower($inputText) === 'null') {
                    $decodedArgs = $jsonAttempt;
                } elseif ($inputText === '') {
                    $decodedArgs = [];
                } elseif (is_numeric($inputText)) {
                    $decodedArgs = [0 + $inputText];
                } else {
                    $decodedArgs = [$inputText];
                }
                $argsRaw = json_encode($decodedArgs);
            } else {
                $decodedArgs = json_decode($argsRaw, true);
                if ($decodedArgs === null && $argsRaw !== null) {
                    $decodedArgs = [];
                }
            }
            $codeFile = tempnam(sys_get_temp_dir(), 'fn_code_');
            file_put_contents($codeFile, $data['code']);
            $argsFile = tempnam(sys_get_temp_dir(), 'fn_args_');
            file_put_contents($argsFile, json_encode($decodedArgs));
            $runnerFile = tempnam(sys_get_temp_dir(), 'fn_runner_');
            $entryJson = json_encode($entry_function);
            $runnerSource = <<<PY
import importlib.util, json, sys, traceback

code_path = r"$codeFile"
args_path = r"$argsFile"
entry_name = json.loads('$entryJson')

with open(args_path, 'r', encoding='utf-8') as f:
    try:
        args = json.load(f)
    except Exception:
        print("__ERROR__:invalid args json")
        sys.exit(4)

spec = importlib.util.spec_from_file_location("user_module", code_path)
mod = importlib.util.module_from_spec(spec) if spec else None

if mod is None or spec.loader is None:
    # Fallback: load by exec when importlib cannot create a loader (rare envs)
    ns = {}
    try:
        with open(code_path, 'r', encoding='utf-8') as f:
            code_content = f.read()
        exec(compile(code_content, code_path, 'exec'), ns)
    except Exception:
        traceback.print_exc()
        sys.exit(5)

    if entry_name not in ns:
        print("__ERROR__:function not found")
        sys.exit(2)

    fn = ns[entry_name]
else:
    spec.loader.exec_module(mod)

    if not hasattr(mod, entry_name):
        print("__ERROR__:function not found")
        sys.exit(2)

    fn = getattr(mod, entry_name)

try:
    if isinstance(args, list):
        result = fn(*args)
    elif isinstance(args, dict):
        result = fn(**args)
    else:
        result = fn(args)
    print(result)
except Exception:
    traceback.print_exc()
    sys.exit(3)
PY;
            file_put_contents($runnerFile, $runnerSource);

            $safe_python = '/usr/bin/python3';
            $cmd = 'timeout 5s ' . escapeshellcmd($safe_python) . ' ' . escapeshellarg($runnerFile) . ' 2>&1';
            $result = [];
            $exitCode = 0;
            exec($cmd, $result, $exitCode);
            $result_text = implode("\n", $result);
            $expected = (string)($case['expected_output'] ?? '');
            $passed = outputs_match($expected, $result_text);
            if (!$passed) {
                $all_passed = false;
            }
            $caseResults[] = [
                'input' => $case['input'] ?? '',
                'expected_output' => $expected,
                'output' => $result_text,
                'passed' => $passed,
                'args' => $argsRaw,
            ];

            @unlink($codeFile);
            @unlink($argsFile);
            @unlink($runnerFile);
        }
    } else {
        foreach ($cases as $case) {
            $tmp = tempnam(sys_get_temp_dir(), 'code');
            file_put_contents($tmp, $data['code']);
            $safe_python = '/usr/bin/python3';
            $cmd = 'timeout 5s ' . escapeshellcmd($safe_python) . ' -I -S ' . escapeshellarg($tmp);
            $result = [];
            $input = $case['input'] ?? '';
            exec("echo " . escapeshellarg($input) . " | $cmd", $result);
            $result_text = implode("\n", $result);
            $passed = outputs_match($case['expected_output'], $result_text);
            if (!$passed) {
                $all_passed = false;
            }
            $caseResults[] = [
                'input' => $case['input'] ?? '',
                'expected_output' => $case['expected_output'],
                'output' => $result_text,
                'passed' => $passed,
            ];
            unlink($tmp);
        }
    }

    json_response([
        'all_passed' => $all_passed ? 1 : 0,
        'cases' => $caseResults,
    ]);
}

// 管理者/講師向け: 関数呼び出しでコードを実行（提出は保存しない）
if ($path === '/api/run_function' && $method === 'POST') {
    $role = $current_user['role'] ?? null;
    if ($role !== 'admin' && $role !== 'teacher') {
        json_response(['error' => 'forbidden'], 403);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $assignment_id = $data['assignment_id'] ?? null;
    $code = $data['code'] ?? null;
    $entry_function = $data['entry_function'] ?? null;
    $args = $data['args'] ?? [];

    if (!$assignment_id || !$code || !$entry_function) {
        json_response(['error' => 'assignment_id, code, entry_function required'], 400);
    }

    // コードを一時ファイルに保存
    $codeFile = tempnam(sys_get_temp_dir(), 'fn_code_');
    file_put_contents($codeFile, $code);

    // 引数を JSON で一時ファイルに保存（エスケープの複雑さを避ける）
    $argsFile = tempnam(sys_get_temp_dir(), 'fn_args_');
    file_put_contents($argsFile, json_encode($args));

    $runnerFile = tempnam(sys_get_temp_dir(), 'fn_runner_');
    $entryJson = json_encode($entry_function);
    $runnerSource = <<<PY
import importlib.util, json, sys, traceback

code_path = r"$codeFile"
args_path = r"$argsFile"
entry_name = json.loads('$entryJson')

with open(args_path, 'r', encoding='utf-8') as f:
    try:
        args = json.load(f)
    except Exception:
        print("__ERROR__:invalid args json")
        sys.exit(4)

spec = importlib.util.spec_from_file_location("user_module", code_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

if not hasattr(mod, entry_name):
    print("__ERROR__:function not found")
    sys.exit(2)

fn = getattr(mod, entry_name)
try:
    if isinstance(args, list):
        result = fn(*args)
    elif isinstance(args, dict):
        result = fn(**args)
    else:
        result = fn(args)
    print(result)
except Exception:
    traceback.print_exc()
    sys.exit(3)
PY;
    file_put_contents($runnerFile, $runnerSource);

    $safe_python = '/usr/bin/python3';
    $cmd = 'timeout 5s ' . escapeshellcmd($safe_python) . ' ' . escapeshellarg($runnerFile) . ' 2>&1';
    $output = [];
    $exitCode = 0;
    exec($cmd, $output, $exitCode);
    $outText = implode("\n", $output);

    // 後片付け
    @unlink($codeFile);
    @unlink($argsFile);
    @unlink($runnerFile);

    json_response([
        'exit_code' => $exitCode,
        'output' => $outText,
    ]);
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

// 提出一覧（管理者/講師向け）: problem_type でフィルタ（code|essay|choice）
if ($path === '/api/submissions/review' && $method === 'GET') {
    $role = $current_user['role'] ?? null;
    if ($role !== 'admin' && $role !== 'teacher') {
        json_response(['error' => 'forbidden'], 403);
    }

    $assignment_id = $_GET['assignment_id'] ?? null;
    $where = [];
    $params = [];
    if ($assignment_id) {
        $where[] = 's.assignment_id = ?';
        $params[] = (int)$assignment_id;
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $sql = "SELECT s.id, s.user_id, s.assignment_id, s.is_correct, s.feedback, s.code, s.submitted_at,
                   u.username,
                   a.title AS assignment_title,
                   a.question_text
            FROM submission s
            INNER JOIN user u ON s.user_id = u.id
            INNER JOIN assignment a ON s.assignment_id = a.id
            $whereSql
            ORDER BY s.submitted_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// 指定宿題の提出（現ユーザー）を取得
if ($path === '/api/submissions' && $method === 'GET') {
    global $current_user;
    $assignment_id = $_GET['assignment_id'] ?? null;
    if ($assignment_id) {
        $stmt = $pdo->prepare('SELECT id, assignment_id, is_correct, feedback, code, submitted_at FROM submission WHERE assignment_id = ? AND user_id = ? ORDER BY submitted_at DESC');
        $stmt->execute([(int)$assignment_id, $current_user['id']]);
        json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}

// 記述式提出一覧（先生/管理者向け）
if ($path === '/api/submissions/essay' && $method === 'GET') {
    $role = $current_user['role'] ?? null;
    if ($role !== 'admin' && $role !== 'teacher') {
        json_response(['error' => 'forbidden'], 403);
    }
    $assignment_id = $_GET['assignment_id'] ?? null;
    $where = [];
    $params = [];
    if ($assignment_id) {
        $where[] = 's.assignment_id = ?';
        $params[] = (int)$assignment_id;
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $sql = "SELECT s.id, s.user_id, s.assignment_id, s.is_correct, s.feedback, s.submitted_at,
                   u.username, a.title as assignment_title
            FROM essay_submission s
            INNER JOIN user u ON s.user_id = u.id
            INNER JOIN problem p ON s.problem_id = p.id
            INNER JOIN lesson l ON p.lesson_id = l.id
            $whereSql
            ORDER BY s.submitted_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// 記述式採点更新（先生/管理者向け）
if (preg_match('#^/api/submissions/essay/(\d+)$#', $path, $m) && $method === 'PUT') {
    $role = $current_user['role'] ?? null;
    if ($role !== 'admin' && $role !== 'teacher') {
        json_response(['error' => 'forbidden'], 403);
    }
    $id = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['is_correct']) || !isset($data['feedback'])) {
        json_response(['error' => 'is_correct and feedback required'], 400);
    }
    $stmt = $pdo->prepare('UPDATE submission SET is_correct = ?, feedback = ? WHERE id = ? AND problem_type = "essay"');
    $stmt->execute([(int)$data['is_correct'], $data['feedback'], $id]);
    clear_progress_cache_all();
    json_response(['message' => 'Essay graded']);
}

// 手動採点（全問題タイプ、先生/管理者向け）
if (preg_match('#^/api/submissions/review/(\d+)$#', $path, $m) && $method === 'PUT') {
    $role = $current_user['role'] ?? null;
    if ($role !== 'admin' && $role !== 'teacher') {
        json_response(['error' => 'forbidden'], 403);
    }
    $id = (int)$m[1];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!array_key_exists('is_correct', $data)) {
        json_response(['error' => 'is_correct required'], 400);
    }
    $is_correct = $data['is_correct'];
    if (!in_array($is_correct, [0, 1, null], true)) {
        json_response(['error' => 'is_correct must be 0, 1 or null'], 400);
    }
    $feedback = $data['feedback'] ?? '';

    $stmt = $pdo->prepare('UPDATE submission SET is_correct = ?, feedback = ? WHERE id = ?');
    $stmt->execute([$is_correct, $feedback, $id]);
    clear_progress_cache_all();
    json_response(['message' => 'Submission graded']);
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

        // 不正解した異なる課題の数
        $incorrectStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE user_id = ? AND is_correct = 0');
        $incorrectStmt->execute([$user_id]);
        $incorrect = (int)$incorrectStmt->fetchColumn();

        // 採点待ち（is_correct = null）の異なる課題の数
        $pendingStmt = $pdo->prepare('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE user_id = ? AND is_correct IS NULL');
        $pendingStmt->execute([$user_id]);
        $pending = (int)$pendingStmt->fetchColumn();

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

        // 不正解した異なる課題の数
        $incorrectStmt = $pdo->query('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE is_correct = 0');
        $incorrect = (int)$incorrectStmt->fetchColumn();

        // 採点待ち（is_correct = null）の異なる課題の数
        $pendingStmt = $pdo->query('SELECT COUNT(DISTINCT assignment_id) FROM submission WHERE is_correct IS NULL');
        $pending = (int)$pendingStmt->fetchColumn();

        // 少なくとも1回提出した異なる課題の数
        $attemptedStmt = $pdo->query('SELECT COUNT(DISTINCT assignment_id) FROM submission');
        $attempted = (int)$attemptedStmt->fetchColumn();
    }
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
        ) AS assignment_counts';
        $totalStmtAll = $pdo->query($totalAssignSql);
        $totalAssignments = (int)$totalStmtAll->fetchColumn();
    }
    // 未提出数 = 総課題数 - 挑戦した課題数
    $unsubmitted = $totalAssignments - $attempted;

    if ($user_id) {
        $dailyStmt = $pdo->prepare('SELECT substr(submitted_at,1,10) as date, COUNT(*) as count, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect, SUM(CASE WHEN is_correct IS NULL THEN 1 ELSE 0 END) as pending FROM submission WHERE user_id = ? GROUP BY substr(submitted_at,1,10) ORDER BY date ASC LIMIT 30');
        $dailyStmt->execute([$user_id]);
    } else {
        $dailyStmt = $pdo->query('SELECT substr(submitted_at,1,10) as date, COUNT(*) as count, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect, SUM(CASE WHEN is_correct IS NULL THEN 1 ELSE 0 END) as pending FROM submission GROUP BY substr(submitted_at,1,10) ORDER BY date ASC LIMIT 30');
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
        'pending' => $pending,
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
    
    $stmt = $pdo->prepare('INSERT INTO essay_submission (user_id, problem_id, answer_text) VALUES (?,?,?)');
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
    
    $stmt = $pdo->prepare('UPDATE essay_submission SET is_graded = 1, grade = ?, feedback = ?, graded_at = NOW() WHERE id = ?');
    $stmt->execute([$data['grade'], $data['feedback'], $submission_id]);
    json_response(['message' => 'Essay graded']);
}

// 文章問題の提出一覧（管理者/先生のみ）
if ($path === '/api/essay-submissions' && $method === 'GET') {
    // admin と teacher のみアクセス可能
    $user_role = $current_user['role'] ?? null;
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
