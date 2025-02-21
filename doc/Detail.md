## MVP Version


## **アプリケーションの機能定義**
### **管理者用機能**
1. **ユーザー管理**
   - ユーザーの作成（IDとパスワード発行）。
   - ユーザーに閲覧可能な教材を割り当て。
   - ユーザー進捗状況（教材、レッスン、問題ごと）の確認。
   - ユーザーが提出したコードの閲覧と結果（正解/不正解）の確認。

2. **教材管理**
   - 教材の作成、編集、削除。
   - 教材ごとにレッスンを構成可能。

3. **レッスン管理**
   - レッスンの作成、編集、削除。
   - レッスンに練習問題を追加。
   - 問題の正解判定ロジック（入力と期待される出力）を設定。

---

### **ユーザー用機能**
1. **学習機能**
   - 割り当てられた教材を閲覧。
   - 教材内のレッスンを学習。
   - レッスンに紐づく練習問題を解答し、結果を確認。

2. **進捗管理**
   - 練習問題をすべて正解すると次のレッスンへ進める。
   - 自分の進捗状況を確認可能。

---

### **講師用機能**
1. **進捗確認**
   - 担当する生徒の進捗状況を確認。
   - 生徒が提出したコードと結果（正解/不正解）を閲覧。

---

## **API設計**

| HTTP Method | Endpoint                   | Description                                   | Request Body                           | Response Body                        |
|-------------|----------------------------|-----------------------------------------------|----------------------------------------|--------------------------------------|
| **POST**    | `/api/admin/user`          | ユーザーの作成                                | `{ name, email, password, material_ids }` | `{ user_id, message }`               |
| **GET**     | `/api/admin/user/<id>`     | ユーザーの詳細取得                            | `None`                                 | `{ id, name, materials, progress }`  |
| **POST**    | `/api/admin/material`      | 教材の作成                                    | `{ title, description }`              | `{ material_id, message }`           |
| **GET**     | `/api/admin/material/<id>` | 教材の詳細取得                                | `None`                                 | `{ id, title, lessons }`             |
| **POST**    | `/api/admin/lesson`        | レッスンの作成                                | `{ material_id, title, description }` | `{ lesson_id, message }`             |
| **GET**     | `/api/lesson/<id>`         | レッスンの詳細取得                            | `None`                                 | `{ id, title, problems }`            |
| **POST**    | `/api/admin/problem`       | 練習問題の作成                                | `{ lesson_id, input, expected_output }` | `{ problem_id, message }`            |
| **POST**    | `/api/problem/<id>/submit` | 練習問題の解答送信                            | `{ user_id, code }`                    | `{ result, output, message }`        |
| **GET**     | `/api/user/progress`       | 自分の進捗状況を取得                          | `None`                                 | `{ progress }`                        |
| **GET**     | `/api/admin/user_progress` | ユーザー進捗を管理者が確認                   | `None`                                 | `{ users_progress }`                 |

---

## **データベース設計**

### **1. ユーザーテーブル (`users`)**
| Column Name   | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `id`          | INTEGER   | 主キー                              |
| `name`        | TEXT      | ユーザー名                          |
| `email`       | TEXT      | メールアドレス（ユニーク）           |
| `password`    | TEXT      | ハッシュ化されたパスワード           |
| `role`        | TEXT      | 権限 (`admin`, `user`, `teacher`)   |

---

### **2. 教材テーブル (`materials`)**
| Column Name   | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `id`          | INTEGER   | 主キー                              |
| `title`       | TEXT      | 教材名                              |
| `description` | TEXT      | 教材の説明                          |

---

### **3. レッスンテーブル (`lessons`)**
| Column Name   | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `id`          | INTEGER   | 主キー                              |
| `material_id` | INTEGER   | 教材ID（外部キー: `materials.id`）  |
| `title`       | TEXT      | レッスン名                          |
| `description` | TEXT      | レッスンの説明                      |

---

### **4. 練習問題テーブル (`problems`)**
| Column Name     | Type      | Description                          |
|-----------------|-----------|--------------------------------------|
| `id`            | INTEGER   | 主キー                              |
| `lesson_id`     | INTEGER   | レッスンID（外部キー: `lessons.id`） |
| `input`         | TEXT      | 問題の入力例                        |
| `expected_output` | TEXT    | 問題の期待出力                      |

---

### **5. 学習進捗テーブル (`progress`)**
| Column Name   | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `id`          | INTEGER   | 主キー                              |
| `user_id`     | INTEGER   | ユーザーID（外部キー: `users.id`）   |
| `lesson_id`   | INTEGER   | レッスンID（外部キー: `lessons.id`） |
| `status`      | TEXT      | レッスンの進捗 (`in_progress`, `completed`) |

---

### **6. 提出コードテーブル (`submissions`)**
| Column Name   | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `id`          | INTEGER   | 主キー                              |
| `problem_id`  | INTEGER   | 問題ID（外部キー: `problems.id`）   |
| `user_id`     | INTEGER   | ユーザーID（外部キー: `users.id`）   |
| `code`        | TEXT      | ユーザーが提出したコード             |
| `result`      | TEXT      | 結果 (`correct`, `incorrect`)       |
| `output`      | TEXT      | 実行結果                            |

---
