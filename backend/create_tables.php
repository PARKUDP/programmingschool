<?php
require_once __DIR__ . '/db.php';
$pdo = getPDO();

$pdo->exec("CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);");

$pdo->exec("CREATE TABLE IF NOT EXISTS material (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
);");

$pdo->exec("CREATE TABLE IF NOT EXISTS lesson (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY(material_id) REFERENCES material(id) ON DELETE CASCADE
);");

$pdo->exec("CREATE TABLE IF NOT EXISTS problem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    markdown TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lesson_id) REFERENCES lesson(id) ON DELETE CASCADE
);");

$pdo->exec("CREATE TABLE IF NOT EXISTS assignment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    question_text TEXT,
    input_example TEXT,
    file_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lesson_id) REFERENCES lesson(id) ON DELETE CASCADE
);");

$pdo->exec("CREATE TABLE IF NOT EXISTS test_case (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER NOT NULL,
    input TEXT,
    expected_output TEXT,
    comment TEXT,
    FOREIGN KEY(problem_id) REFERENCES problem(id) ON DELETE CASCADE
);");

// migrate existing table to include comment column if it's missing
$cols = $pdo->query('PRAGMA table_info(test_case)')->fetchAll(PDO::FETCH_ASSOC);
$hasComment = false;
foreach ($cols as $c) {
    if ($c['name'] === 'comment') {
        $hasComment = true;
        break;
    }
}
if (!$hasComment) {
    $pdo->exec('ALTER TABLE test_case ADD COLUMN comment TEXT');
}

$pdo->exec("CREATE TABLE IF NOT EXISTS submission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    code TEXT,
    result TEXT,
    output TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY(problem_id) REFERENCES problem(id) ON DELETE CASCADE
);");

$adminHash = password_hash('admin', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT OR IGNORE INTO user (username, password_hash, is_admin) VALUES ('admin', ?, 1)");
$stmt->execute([$adminHash]);

echo "Tables created\n";
?>
