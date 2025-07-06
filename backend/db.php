<?php
function getPDO() {
    static $pdo = null;
    if ($pdo === null) {
        $dbPath = __DIR__ . '/db.sqlite3';
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    return $pdo;
}
?>
