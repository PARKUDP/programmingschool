## **MVP Version**
### **ユーザー**
#### **画面**
1. **ホーム画面**
   - コースを選択するボタンを表示

2. **コース一覧画面**
   - コースの選択（コース一覧からコースを選択し、該当する教材一覧画面に移動）

3. **教材一覧画面**
   - 教材の選択（教材一覧から教材を選択し、該当するレッスン一覧画面に移動）

4. **レッスン一覧画面**
   - レッスンの選択（レッスンを選択すると、レッスンの内容が表示され、問題を解くことができる）

5. **レッスンの内容**
- 作成者が登録したテキストやコード問題を表示
- ユーザーはレッスンの説明を読んだ後、出題されたコード問題を解答
- コードの解答はシステムで自動評価され、結果を表示
- 選択式問題（例: クイズ形式）も登録可能

### 作成者 (管理者)

#### 画面
1. **管理者ホーム画面**
   - コース・教材・レッスンの管理画面にアクセスするボタンを表示

2.	**コース管理画面**
   - コースの追加・編集・削除
   - コース一覧を表示
   - コースを選択すると、該当する 教材管理画面 に移動

3.	**教材管理画面**
   - 教材の追加・編集・削除
   - 教材一覧を表示
   - 教材を選択すると、該当する レッスン管理画面 に移動

4.	**レッスン管理画面**
   - レッスンの追加・編集・削除
   - レッスン一覧を表示
   - レッスンを選択すると、レッスンの詳細編集画面 に移動

5.	**レッスン詳細編集画面**
   - レッスンのタイトル・説明文を編集
   - テキスト問題・コード問題の追加
   - コード問題の模範解答を設定
   - テストケースを登録し、自動採点を設定
   - レッスンのプレビュー
   - 保存して公開

## **ER図**
```mermaid
---
title: "タイトル"
---
erDiagram
    COURSES |o--|| MATERIALS : has
    MATERIALS |o--|| LESSONS : has
    LESSONS |o--|| PROBLEMS : has

    COURSES {
      INT id PK
      VARCHAR title
      TIMESTAMP created_at
    }
    MATERIALS {
      INT id PK
      VARCHAR title
      INT FK course_id
      TIMESTAMP created_at
    }
    LESSONS {
      INT id PK
      VARCHAR title
      INT FK material_id
      TIMESTAMP created_at
    }
    PROBLEMS {
      INT id PK
      INT FK lesson_id
      TEXT problem_text
      ENUM("text", "code", "multiple_choice") problem_type
      TEXT correct_answer
      TIMESTAMP created_at
    }
```

## データベーステーブル定義

### **1. `courses` (コース)**
コース情報を管理するテーブル。

| カラム名   | データ型       | NULL許可 | 説明 |
|------------|---------------|----------|------------------|
| id         | INT (PK)       | NO       | コースのID (自動増分) |
| title      | VARCHAR(255)   | NO       | コース名 |
| created_at | TIMESTAMP      | NO       | 作成日時 (デフォルト: `CURRENT_TIMESTAMP`) |

---

### **2. `materials` (教材)**
教材情報を管理するテーブル。

| カラム名   | データ型       | NULL許可 | 説明 |
|------------|---------------|----------|------------------|
| id         | INT (PK)       | NO       | 教材のID (自動増分) |
| title      | VARCHAR(255)   | NO       | 教材名 |
| course_id  | INT (FK → courses.id) | NO | 所属するコース |
| created_at | TIMESTAMP      | NO       | 作成日時 |

✅ **制約**
- `course_id` は `courses` テーブルの `id` を参照 (`ON DELETE CASCADE` でコース削除時に教材も削除)

---

### **3. `lessons` (レッスン)**
レッスン情報を管理するテーブル。

| カラム名   | データ型       | NULL許可 | 説明 |
|------------|---------------|----------|------------------|
| id         | INT (PK)       | NO       | レッスンのID (自動増分) |
| title      | VARCHAR(255)   | NO       | レッスン名 |
| material_id| INT (FK → materials.id) | NO | 所属する教材 |
| created_at | TIMESTAMP      | NO       | 作成日時 |

✅ **制約**
- `material_id` は `materials` テーブルの `id` を参照 (`ON DELETE CASCADE` で教材削除時にレッスンも削除)

---

### **4. `problems` (問題)**
問題情報を管理するテーブル。

| カラム名       | データ型          | NULL許可 | 説明 |
|---------------|------------------|----------|------------------|
| id            | INT (PK)         | NO       | 問題のID (自動増分) |
| lesson_id     | INT (FK → lessons.id) | NO | 所属するレッスン |
| problem_text  | TEXT             | NO       | 問題文 |
| problem_type  | ENUM('text', 'code', 'multiple_choice') | NO | 問題の種類 |
| correct_answer| TEXT             | NO       | 正解 (コード・選択式など) |
| created_at    | TIMESTAMP        | NO       | 作成日時 |

✅ **制約**
- `lesson_id` は `lessons` テーブルの `id` を参照 (`ON DELETE CASCADE` でレッスン削除時に問題も削除)

---


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
