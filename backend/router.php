<?php
// CORS ヘッダーを設定（ルーターで最初に処理）
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Access-Control-Max-Age: 3600');

// OPTIONS リクエストに応答（preflight）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// すべてのリクエストを index.php にルート
if (preg_match('/\.(?:png|jpg|jpeg|gif|css|js|ico|woff|woff2|ttf)$/', $_SERVER["REQUEST_URI"])) {
    return false;
}

require __DIR__ . '/index.php';
?>
