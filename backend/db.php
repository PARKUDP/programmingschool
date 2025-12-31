<?php
function getPDO() {
    static $pdo = null;
    if ($pdo === null) {
        $dbType = getenv('DB_TYPE') ?: 'sqlite';
        
        if ($dbType === 'mysql') {
            $host = getenv('DB_HOST') ?: 'db';
            $port = getenv('DB_PORT') ?: '3306';
            $dbname = getenv('DB_NAME') ?: 'programmingschool';
            $user = getenv('DB_USER') ?: 'appuser';
            $password = getenv('DB_PASSWORD') ?: 'apppassword';
            
            $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => true, // 接続プーリング
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            try {
                $pdo = new PDO($dsn, $user, $password, $options);
            } catch (PDOException $e) {
                error_log("MySQL connection failed: " . $e->getMessage());
                throw $e;
            }
        } else {
            // SQLite fallback (開発用)
            $dbPath = __DIR__ . '/db.sqlite3';
            $pdo = new PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }
    }
    return $pdo;
}

// データベースタイプを取得
function getDbType() {
    return getenv('DB_TYPE') ?: 'sqlite';
}

// AUTO_INCREMENT用のカラム定義を取得
function getAutoIncrementColumn() {
    return getDbType() === 'mysql' ? 'INT AUTO_INCREMENT' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
}

// 現在時刻用の関数を取得
function getCurrentTimestamp() {
    return getDbType() === 'mysql' ? 'NOW()' : "datetime('now')";
}
?>
