-- スキーマ拡張: 問題タイプ対応

-- 1. assignment テーブルに problem_type フィールドを追加
ALTER TABLE assignment ADD COLUMN problem_type VARCHAR(50) DEFAULT 'code' AFTER expected_output;

-- 2. 選択式の場合の選択肢を保存するテーブル
CREATE TABLE IF NOT EXISTS choice_option (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    option_text TEXT NOT NULL,
    option_order INT DEFAULT 0,
    is_correct TINYINT(1) DEFAULT 0,
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE,
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_option_order (option_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. submission テーブルに answer_text フィールドを追加（記述式/選択式用）
ALTER TABLE submission ADD COLUMN answer_text TEXT AFTER code;
ALTER TABLE submission ADD COLUMN selected_choice_id INT AFTER answer_text;
ALTER TABLE submission ADD COLUMN problem_type VARCHAR(50) DEFAULT 'code' AFTER selected_choice_id;

-- インデックスを追加
ALTER TABLE submission ADD INDEX idx_problem_type (problem_type);

-- 4. essay_submission テーブルに problem_type フィールドを追加（用途明確化）
ALTER TABLE essay_submission ADD COLUMN problem_type VARCHAR(50) DEFAULT 'essay' AFTER feedback;
