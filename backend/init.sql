-- MySQL初期化スクリプト（100人以上対応）
-- このファイルはMySQLコンテナの起動時に自動実行されます

-- データベースが存在しない場合は作成（docker-composeで既に作成されているため通常は不要）
CREATE DATABASE IF NOT EXISTS programmingschool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE programmingschool;

-- パフォーマンス最適化設定
SET GLOBAL innodb_buffer_pool_size = 536870912; -- 512MB
SET GLOBAL max_connections = 500;
SET GLOBAL innodb_flush_log_at_trx_commit = 2;

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
    is_admin TINYINT(1) DEFAULT 0,
    class_id INT DEFAULT NULL,
    name VARCHAR(200),
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    furigana VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_class_id (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- クラステーブル
CREATE TABLE IF NOT EXISTS class (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 教材テーブル
CREATE TABLE IF NOT EXISTS material (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- レッスンテーブル
CREATE TABLE IF NOT EXISTS lesson (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE,
    INDEX idx_material_id (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 問題テーブル
CREATE TABLE IF NOT EXISTS problem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    markdown TEXT,
    type ENUM('code', 'multiple_choice', 'essay') DEFAULT 'code',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE CASCADE,
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 選択肢テーブル（客観式問題用）
CREATE TABLE IF NOT EXISTS problem_choice (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT NOT NULL,
    choice_text TEXT NOT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    display_order INT DEFAULT 0,
    FOREIGN KEY (problem_id) REFERENCES problem(id) ON DELETE CASCADE,
    INDEX idx_problem_id (problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章問題の提出テーブル
CREATE TABLE IF NOT EXISTS essay_submission (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    problem_id INT NOT NULL,
    answer_text TEXT NOT NULL,
    is_graded TINYINT(1) DEFAULT 0,
    grade VARCHAR(10),
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problem(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_problem_id (problem_id),
    INDEX idx_is_graded (is_graded)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 課題テーブル
CREATE TABLE IF NOT EXISTS assignment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    question_text TEXT,
    input_example TEXT,
    expected_output TEXT,
    file_path VARCHAR(500),
    problem_type ENUM('code', 'choice', 'essay') DEFAULT 'code',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lesson(id) ON DELETE CASCADE,
    INDEX idx_lesson_id (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- テストケーステーブル
CREATE TABLE IF NOT EXISTS test_case (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    input TEXT,
    expected_output TEXT,
    comment TEXT,
    args_json JSON,
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE,
    INDEX idx_assignment_id (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 選択肢テーブル（課題用、assignment_id を参照）
CREATE TABLE IF NOT EXISTS choice_option (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    option_text TEXT NOT NULL,
    option_order INT DEFAULT 0,
    is_correct TINYINT(1) DEFAULT 0,
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE,
    INDEX idx_assignment_id (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 課題配布対象テーブル
CREATE TABLE IF NOT EXISTS assignment_target (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    target_type ENUM('all', 'user', 'class') NOT NULL,
    target_id INT DEFAULT NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE,
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_target_type (target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 提出テーブル
CREATE TABLE IF NOT EXISTS submission (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assignment_id INT NOT NULL,
    code TEXT,
    answer_text TEXT,
    selected_choice_id INT,
    is_correct TINYINT(1) DEFAULT NULL,
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 外部キー制約を追加（user.class_id）
ALTER TABLE user ADD CONSTRAINT fk_user_class 
    FOREIGN KEY (class_id) REFERENCES class(id) ON DELETE SET NULL;

-- デフォルト管理者ユーザーを作成
-- パスワード: admin (本番環境では必ず変更してください)
INSERT IGNORE INTO user (username, password_hash, role, is_admin) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1);

-- テスト管理者ユーザーを作成
-- パスワード: testadmin
INSERT IGNORE INTO user (username, password_hash, role, is_admin) 
VALUES ('testadmin', '$2y$10$ATLSvlG6CSC5F2JYBKGJAOKo4KofohIk2N4um2FRvMgbwHgf1/3XO', 'admin', 1);
