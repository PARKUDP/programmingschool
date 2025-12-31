<?php
require_once __DIR__ . '/db.php';
$pdo = getPDO();

$pdo->exec("CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    is_admin INTEGER DEFAULT 0,
    class_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES class(id) ON DELETE SET NULL
);");

// マイグレーション：role カラムを追加
$userCols = $pdo->query('PRAGMA table_info(user)')->fetchAll(PDO::FETCH_ASSOC);
$userColNames = array_column($userCols, 'name');
if (!in_array('role', $userColNames)) {
    $pdo->exec('ALTER TABLE user ADD COLUMN role TEXT DEFAULT "student"');
    // 既存の is_admin=1 を admin に変換
    $pdo->exec('UPDATE user SET role = "admin" WHERE is_admin = 1');
    // 既存の is_admin=0 を student に変換
    $pdo->exec('UPDATE user SET role = "student" WHERE is_admin = 0 AND role = "student"');
}
// マイグレーション：class_id カラムを追加（複数クラス所属廃止）
if (!in_array('class_id', $userColNames)) {
    $pdo->exec('ALTER TABLE user ADD COLUMN class_id INTEGER');
    // 古い class_user テーブルから最初のクラスをコピー
    $pdo->exec('UPDATE user SET class_id = (
        SELECT class_id FROM class_user WHERE class_user.user_id = user.id LIMIT 1
    ) WHERE EXISTS (
        SELECT 1 FROM class_user WHERE class_user.user_id = user.id
    )');
    // class_user テーブルを削除
    try {
        $pdo->exec('DROP TABLE IF EXISTS class_user');
    } catch (Exception $e) {
        // テーブルが存在しない場合は無視
    }
};

$pdo->exec("CREATE TABLE IF NOT EXISTS material (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);");

// マイグレーション：既存DBに description, created_at カラムを追加
$cols = $pdo->query('PRAGMA table_info(material)')->fetchAll(PDO::FETCH_ASSOC);
$colNames = array_column($cols, 'name');
if (!in_array('description', $colNames)) {
    $pdo->exec('ALTER TABLE material ADD COLUMN description TEXT');
}
if (!in_array('created_at', $colNames)) {
    $pdo->exec("ALTER TABLE material ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP");
}

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
    type TEXT DEFAULT 'code' CHECK (type IN ('code', 'multiple_choice', 'essay')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lesson_id) REFERENCES lesson(id) ON DELETE CASCADE
);");

// マイグレーション：problem テーブルに type カラムを追加
$problemCols = $pdo->query('PRAGMA table_info(problem)')->fetchAll(PDO::FETCH_ASSOC);
$problemColNames = array_column($problemCols, 'name');
if (!in_array('type', $problemColNames)) {
    $pdo->exec('ALTER TABLE problem ADD COLUMN type TEXT DEFAULT "code"');
}

// 客観式問題の選択肢管理
$pdo->exec("CREATE TABLE IF NOT EXISTS problem_choice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id INTEGER NOT NULL,
    choice_text TEXT NOT NULL,
    is_correct INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    FOREIGN KEY(problem_id) REFERENCES problem(id) ON DELETE CASCADE
);");

// 文章問題の提出と採点
$pdo->exec("CREATE TABLE IF NOT EXISTS essay_submission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    is_graded INTEGER DEFAULT 0,
    grade TEXT,
    feedback TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    graded_at TEXT,
    FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY(problem_id) REFERENCES problem(id) ON DELETE CASCADE
);");

$pdo->exec("CREATE TABLE IF NOT EXISTS assignment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    question_text TEXT,
    input_example TEXT,
    expected_output TEXT,
    file_path TEXT,
    problem_type TEXT DEFAULT 'code' CHECK (problem_type IN ('choice','essay','code')),
    exec_mode TEXT DEFAULT 'stdin' CHECK (exec_mode IN ('stdin','function')),
    entry_function TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lesson_id) REFERENCES lesson(id) ON DELETE CASCADE
);");

// マイグレーション：既存DBに expected_output カラムを追加
$cols = $pdo->query('PRAGMA table_info(assignment)')->fetchAll(PDO::FETCH_ASSOC);
$colNames = array_column($cols, 'name');
if (!in_array('expected_output', $colNames)) {
    $pdo->exec('ALTER TABLE assignment ADD COLUMN expected_output TEXT');
};
if (!in_array('problem_type', $colNames)) {
    $pdo->exec("ALTER TABLE assignment ADD COLUMN problem_type TEXT DEFAULT 'code'");
}
if (!in_array('exec_mode', $colNames)) {
    $pdo->exec("ALTER TABLE assignment ADD COLUMN exec_mode TEXT DEFAULT 'stdin'");
}
if (!in_array('entry_function', $colNames)) {
    $pdo->exec('ALTER TABLE assignment ADD COLUMN entry_function TEXT');
}

$pdo->exec("CREATE TABLE IF NOT EXISTS test_case (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    input TEXT,
    expected_output TEXT,
    args_json TEXT,
    comment TEXT,
    FOREIGN KEY(assignment_id) REFERENCES assignment(id) ON DELETE CASCADE
);");

// 宿題ごとの選択肢（assignment 単位の choice 用）
$pdo->exec("CREATE TABLE IF NOT EXISTS choice_option (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    option_order INTEGER DEFAULT 0,
    is_correct INTEGER DEFAULT 0,
    FOREIGN KEY(assignment_id) REFERENCES assignment(id) ON DELETE CASCADE
);");

// クラス管理
$pdo->exec("CREATE TABLE IF NOT EXISTS class (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);");

// マイグレーション：display_orderカラムを追加
$classCols = $pdo->query('PRAGMA table_info(class)')->fetchAll(PDO::FETCH_ASSOC);
$classColNames = array_column($classCols, 'name');
if (!in_array('display_order', $classColNames)) {
    $pdo->exec('ALTER TABLE class ADD COLUMN display_order INTEGER DEFAULT 0');
    // 既存データに順序を設定
    $pdo->exec('UPDATE class SET display_order = id WHERE display_order = 0');
}

// 宿題の配布対象（全体/ユーザー/クラス）
$pdo->exec("CREATE TABLE IF NOT EXISTS assignment_target (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('all','user','class')),
    target_id INTEGER,
    FOREIGN KEY(assignment_id) REFERENCES assignment(id) ON DELETE CASCADE
);");

// マイグレーション: 配布対象に管理者・先生が残っている古いデータをクリーンアップ
$pdo->exec("DELETE FROM assignment_target WHERE target_type='user' AND target_id IN (
    SELECT id FROM user WHERE (role IS NOT NULL AND role != 'student') OR is_admin = 1
)");

// マイグレーション：既存DBに comment カラムを追加
$cols = $pdo->query('PRAGMA table_info(test_case)')->fetchAll(PDO::FETCH_ASSOC);
$hasComment = false;
$hasArgs = false;
foreach ($cols as $c) {
    if ($c['name'] === 'comment') {
        $hasComment = true;
    }
    if ($c['name'] === 'args_json') {
        $hasArgs = true;
    }
}
if (!$hasComment) {
    $pdo->exec('ALTER TABLE test_case ADD COLUMN comment TEXT');
}
if (!$hasArgs) {
    $pdo->exec('ALTER TABLE test_case ADD COLUMN args_json TEXT');
}

$pdo->exec("CREATE TABLE IF NOT EXISTS submission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    assignment_id INTEGER NOT NULL,
    problem_type TEXT,
    code TEXT,
    answer_text TEXT,
    selected_choice_id INTEGER,
    is_correct INTEGER,
    feedback TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY(assignment_id) REFERENCES assignment(id) ON DELETE CASCADE
);");

// マイグレーション：submission に新カラムを追加
$subCols = $pdo->query('PRAGMA table_info(submission)')->fetchAll(PDO::FETCH_ASSOC);
$subNames = array_column($subCols, 'name');
if (!in_array('problem_type', $subNames)) {
    $pdo->exec('ALTER TABLE submission ADD COLUMN problem_type TEXT');
}
if (!in_array('answer_text', $subNames)) {
    $pdo->exec('ALTER TABLE submission ADD COLUMN answer_text TEXT');
}
if (!in_array('selected_choice_id', $subNames)) {
    $pdo->exec('ALTER TABLE submission ADD COLUMN selected_choice_id INTEGER');
}

// 管理者ユーザー追加（初期値 admin）
$adminHash = password_hash('admin', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT OR IGNORE INTO user (username, password_hash, role, is_admin) VALUES ('admin', ?, 'admin', 1)");
$stmt->execute([$adminHash]);

echo "Tables created\n";
?>