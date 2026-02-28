# 要件定義書：Kidz8
## 1. 概要
**Kidz8**は、プログラミング講師や教育機関向けに設計された、Python学習のための教材管理・課題提出・進捗可視化を一体化したWebアプリケーションです。
教材 → レッスン → 宿題（＋テストケース）という構造で学習を段階的に進められ、講師は学習者の理解度をリアルタイムで把握・評価できます。

## 2. ユーザー種別

| ユーザー種別  | 機能概要                                            |
| ------- | ----------------------------------------------- |
| 管理者（講師） | 教材・レッスン・宿題・テストケースの作成／編集／削除、学習者管理、提出評価、進捗確認、コメント |
| 学習者     | 割り当てられた教材の閲覧、宿題へのコード提出、結果確認、フィードバック受信、進捗グラフ確認   |

## 3. コンテンツ構造と関係性

```
教材（Material）
└── レッスン（Lesson）
    └── 宿題（Assignment）
        └── テストケース（Testcase）
```

* 教材：大きな単元（例：Python入門）
* レッスン：章やトピック（例：変数・条件分岐）
* 宿題：実際にコードを書く課題
* テストケース：宿題の正誤判定に使用される複数の入出力ペア

## 4. 機能要件

### 4.1 認証・アカウント管理

* ログイン／ログアウト（JWTまたはセッション）
* パスワード変更・リセット
* ユーザー登録（講師による学習者登録）

### 4.2 教材管理（管理者）

* 教材の一覧表示、作成、編集、削除
* 教材にレッスンを紐付け可能

### 4.3 レッスン管理（管理者）

* レッスンの作成・編集・削除（教材に紐付け）
* レッスンごとに宿題を複数追加可能
* レッスンの説明・解説を記述

### 4.4 宿題管理（管理者）

* 宿題タイトル、説明、問題文、入力例、正解出力の登録
* 添付ファイル（画像・PDFなど）の追加
* 宿題ごとに複数のテストケースを登録

### 4.5 テストケース管理（管理者）

* 宿題に対して複数のテストケース（入力・期待出力）を登録・編集・削除
* それぞれに解説コメントを記述可能（任意）

### 4.6 宿題提出（学習者）

* 学習者は宿題ごとにブラウザ上のPythonエディタでコードを記述
* 提出処理（API経由でバックエンド実行）
* 結果表示（成功/失敗＋失敗したテストケース内容）
* 再提出可能

### 4.7 採点・判定ロジック

* 宿題提出時、登録された全テストケースに対してコードを実行
* すべての出力が正解一致 → 正解
* 1つでも不一致 → 不正解（失敗したケースを表示）

### 4.8 学習ログ・進捗グラフ（可視化）

#### 学習者用

* 自分の提出数／正解数／未提出数（円グラフ）
* 日別提出数（棒グラフ）
* 教材別進捗率（バー）

#### 管理者用

* 学習者ごとの成績表（正解率、提出数）
* 教材/レッスン別の学習者進捗割合
* 未提出者の一覧表示

## 5. 非機能要件

| 項目      | 内容                                   |
| ------- | ------------------------------------ |
| 同時接続想定  | 最大100名程度                             |
| セキュリティ  | SQLインジェクション/XSS対策、コード実行はサンドボックスで安全管理 |
| パフォーマンス | グラフ等は集計キャッシュを利用                      |
| 使用ブラウザ  | 最新のChrome / Safari（PC・タブレット対応）       |

## 6. データベース構成（主要テーブル）

| テーブル          | 主なカラム                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `users`       | id, name, email, password, role (admin/user)                                   |
| `materials`   | id, title, description, created\_at                                            |
| `lessons`     | id, material\_id, title, content                                               |
| `assignments` | id, lesson\_id, title, description, question\_text, input\_example, file\_path |
| `testcases`   | id, assignment\_id, input, expected\_output, comment                           |
| `submissions` | id, user\_id, assignment\_id, code, is\_correct, feedback, submitted\_at       |

## 7. 技術スタック（推奨）

| 分類      | 技術                           |
| ------- | ---------------------------- |
| フロントエンド | React（Vite）＋TypeScript       |
| グラフ表示   | RechartsまたはChart.js          |
| バックエンド  | PHP 8+（REST API構成）           |
| 実行環境    | Python（CLIでバックエンドからexec安全実行） |
| データベース  | SQLite（軽量DB）                 |
| デプロイ先   | Xserver（レンタルーサーバー）           |

## 8. 参考文献

* [iiiar論文](https://iiiar.org/iiars/doc/iiars_workshop7_2_2.pdf)：学習ログ可視化・分析
* [nawaten教育プロジェクト](https://2022.nawaten.online/project/2711)：学習者UI/UXの参考

## 実装優先順位（例）

1. 認証・ユーザー管理
2. 教材／レッスン／宿題の作成UI
3. 宿題提出＋テストケース実行
4. 自動採点ロジック
5. 学習者・講師ダッシュボード（進捗可視化）


## 起動方法

Docker Compose を使用してフロントエンドとバックエンドを同時に起動できます。フロントエンドは Vite の開発サーバーで起動します：

```bash
docker-compose up --build
````

* フロントエンド: [http://localhost:3000](http://localhost:3000)
* バックエンド API: [http://localhost:5050](http://localhost:5050)

### ダッシュボード

学習者用 `/dashboard` と管理者用 `/admin/dashboard` では Recharts を利用した
円グラフ・棒グラフ・進捗バーで提出状況を確認できます。

### API キャッシュ

`/api/progress` の集計結果は 60 秒間キャッシュされます。`force=1` を
クエリに付与するとキャッシュを無視して再計算できます。
## Cloudflare ドメイン統合（parkudp.me）

本システムは Cloudflare で管理されている `parkudp.me` ドメインに対応しています。

### 本番環境での実行

```bash
# 本番用設定を使用して起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 環境変数の設定

`.env` ファイルを作成し、以下を設定してください：

```bash
DB_PASSWORD=strong_secure_password
JWT_SECRET=long_random_secret_key
DOMAIN=parkudp.me
ROOT_PASSWORD=secure_root_password
```

### Cloudflare DNS 設定

詳細は [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) を参照してください。

```
A レコード
名前: school （またはサブドメインなし）
IPv4 アドレス: あなたのサーバーの IP
プロキシ状態: プロキシ表示（オレンジ色）
```

### セキュリティ

- `.env` ファイルは自動的に `.gitignore` に含まれています
- JWT_SECRET と DB_PASSWORD は本番環境では必ず変更してください
- Cloudflare WAF と DDoS 対策が自動的に有効になります

---

## Xserver 標準ホスティングへのデプロイ

このアプリケーションを Xserver のレンタルサーバー（標準ホスティング）に `https://online.kids8.okinawa/` としてデプロイする手順です。

### 前提条件

- Xserver のアカウントを所有していること
- `kids8.okinawa` ドメインが Xserver または他のDNSプロバイダーで管理されていること
- ローカル環境に Node.js と npm がインストールされていること

### 1. サブドメイン設定

1. Xserver のサーバーパネルにログイン
2. **ドメイン → サブドメイン設定** を開く
3. `kids8.okinawa` を選択し、サブドメイン `online` を追加
4. 公開フォルダを `public_html/online` に設定（自動設定される場合もあります）

### 2. SSL証明書の設定

1. サーバーパネル → **セキュリティ → SSL設定**
2. `online.kids8.okinawa` を選択
3. **無料独自SSL（Let's Encrypt）** を有効化
4. 証明書の発行・反映まで数分～数時間待機

### 3. データベース作成

1. サーバーパネル → **データベース → MySQL設定**
2. **MySQL追加** で新しいデータベースを作成
   - データベース名を記録（例: `xserver_db123`）
3. **MySQLユーザー追加** でデータベース用ユーザーを作成
   - ユーザー名とパスワードを記録
4. **MySQL一覧** から作成したデータベースにユーザーを紐付け
5. ホスト名を確認（通常は `mysql123.xserver.jp` のような形式）

### 4. フロントエンドのビルド

ローカル環境で以下を実行：

```bash
cd frontend

# 依存パッケージのインストール（初回のみ）
npm install

# 本番用ビルド
npm run build
```

`frontend/dist/` ディレクトリにビルド済みファイルが生成されます。

### 5. ファイルのアップロード

FTPクライアント（FileZilla、Cyberduck など）または Xserver のファイルマネージャーを使用します。

#### FTP接続情報の確認

1. Xserver サーバーパネル → **アカウント → サーバー情報**
2. 以下の情報を確認：
   - FTPホスト名: `sv12345.xserver.jp` のような形式
   - FTPユーザー名: サーバーID
   - FTPパスワード: サーバーパスワード
   - ポート: 21（通常のFTP）または 22（SFTP推奨）

#### FileZilla を使用した接続手順

1. FileZilla を起動
2. **ファイル → サイトマネージャー** を開く
3. **新しいサイト** をクリックし、以下を入力：
   - プロトコル: **SFTP - SSH File Transfer Protocol**（セキュア）
   - ホスト: `sv12345.xserver.jp`
   - ポート: `22`
   - ログオンタイプ: **通常**
   - ユーザー: サーバーID
   - パスワード: サーバーパスワード
4. **接続** をクリック
5. 初回接続時、ホストキーの確認ダイアログが表示されたら **OK** をクリック

#### フロントエンドのアップロード

1. ローカルで `frontend/dist/` フォルダを開く
2. FileZilla のリモートサイト側で `/online.kids8.okinawa/public_html/online/` に移動
3. `dist/` 内の**すべてのファイルとフォルダ**を選択
4. 右クリック → **アップロード** または、ドラッグ&ドロップ
5. アップロード完了まで待機（数分かかる場合があります）

**注意**: Vite でビルドしたファイルは、以下のような構造になります：
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── img/ (画像がある場合)
```

#### バックエンドのアップロード

1. ローカルで `backend/` フォルダを開く
2. FileZilla のリモートサイト側で `/online.kids8.okinawa/public_html/online/` に移動
3. `api/` フォルダを作成（存在しない場合）
4. 以下のファイルを `api/` フォルダにアップロード：
   - `index.php` ★
   - `db.php` ★（後で編集が必要）
   - `router.php`
   - `create_tables_mysql.sql`
   - `migrate_problem_types.sql`
   - `init.sql`（もしあれば）
   - `000-default.conf`（不要な場合もあります）

5. `api/` フォルダ内に `uploads/` フォルダを作成
6. `uploads/` フォルダを右クリック → **ファイルのパーミッション** → `755` または `777` に設定

**重要**: `.git/`, `node_modules/`, `.env` などの開発用ファイルはアップロード不要です。

  
#### アップロード後のディレクトリ構成

```
public_html/online/
├── index.html              # フロントエンド（dist/から）
├── assets/                 # フロントエンド（dist/から）
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
├── api/                    # バックエンド
│   ├── index.php
│   ├── db.php
│   ├── router.php
│   ├── create_tables_mysql.sql
│   ├── migrate_problem_types.sql
│   └── uploads/            # ディレクトリを作成
└── (その他 dist/ からのファイル)
```

### 6. データベース接続設定

サーバー上の `db.php` を本番環境用に編集します。

#### 方法A: FileZilla で直接編集（推奨）

1. FileZilla で `public_html/online/api/db.php` を見つける
2. 右クリック → **表示/編集**
3. テキストエディタ（メモ帳、VS Code など）で開かれます
4. 以下のように編集：

```php
<?php
function getPDO() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            // 本番環境では常に MySQL を使用
            $host = 'mysql123.xserver.jp';      // 手順3で確認したホスト名
            $port = '3306';
            $dbname = 'xserver_db123';          // 手順3で作成したDB名
            $user = 'xserver_user123';          // 手順3で作成したユーザー名
            $password = 'your_db_password';     // 手順3で設定したパスワード
            
            $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+09:00'"
            ];
            
            $pdo = new PDO($dsn, $user, $password, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            if (!headers_sent()) {
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed']);
            }
            exit;
        }
    }
    return $pdo;
}

function getDbType() {
    return 'mysql';  // 本番環境では MySQL 固定
}

function getAutoIncrementColumn() {
    return 'INT AUTO_INCREMENT';
}

function getCurrentTimestamp() {
    return 'NOW()';
}
?>
```

5. ファイルを保存してアップロード（FileZilla が自動的にアップロードします）

#### 方法B: ローカルで編集してアップロード

1. ローカルの `backend/db.php` をコピーして `db.prod.php` として保存
2. 上記の内容に編集
3. FTP で `public_html/online/api/db.php` として上書きアップロード

#### 接続テスト

ブラウザで以下にアクセスして接続を確認：
- `https://online.kids8.okinawa/api/` → `{"message":"API is working"}` が表示されればOK
- エラーが表示される場合は、サーバーのエラーログを確認


### 7. データベーステーブルの作成と初期設定

#### 方法A: phpMyAdmin を使用（推奨）

1. Xserver サーバーパネル → **phpMyAdmin** をクリック
2. ログイン画面で、手順3で作成したユーザー名とパスワードを入力
3. 左側のデータベース一覧から作成したデータベース（例: `xserver_db123`）を選択
4. 上部メニューの **SQL** タブをクリック
5. ローカルの `backend/create_tables_mysql.sql` をテキストエディタで開く
6. **すべての内容をコピー**して、phpMyAdmin のSQL入力欄にペースト
7. **実行** ボタンをクリック
8. 「クエリは正常に実行されました」と表示されれば成功
9. 同様に `backend/migrate_problem_types.sql` の内容も実行

#### テーブル作成の確認

1. phpMyAdmin の左側で、作成したデータベース名をクリック
2. 以下のテーブルが作成されていることを確認：
   - `users` - ユーザー情報
   - `material` - 教材
   - `lesson` - レッスン
   - `assignment` - 宿題/問題
   - `test_case` - テストケース
   - `submission` - 提出履歴
   - `class` - クラス
   - `class_user` - クラスとユーザーの関連
   - `assignment_user` - 宿題の割り当て

#### 初期管理者アカウントの作成

**重要**: 初期管理者アカウントを手動で作成する必要があります。

1. phpMyAdmin で `users` テーブルを選択
2. 上部の **挿入** タブをクリック
3. 以下の値を入力：

| カラム名 | 値 | 説明 |
|---------|-----|------|
| `id` | （空欄または1） | 自動採番される場合は空欄 |
| `name` | `管理者` | 表示名（自由に設定） |
| `email` | `admin@example.com` | ログイン用メールアドレス |
| `password` | （次のステップで生成） | ハッシュ化されたパスワード |
| `role` | `admin` | 必ず `admin` と入力 |
| `created_at` | `CURRENT_TIMESTAMP` | 現在時刻（関数を選択） |

#### パスワードのハッシュ化

パスワードは**必ずハッシュ化**して保存します。以下の方法で生成：

**方法1: オンラインツールを使用**
1. https://bcrypt-generator.com/ にアクセス
2. 希望のパスワードを入力（例: `AdminPassword123!`）
3. **Rounds** は `10` のまま
4. 生成された長い文字列（`$2y$10$...`で始まる）をコピー
5. phpMyAdmin の `password` カラムにペースト

**方法2: PHPコマンドで生成**
```bash
php -r "echo password_hash('AdminPassword123!', PASSWORD_BCRYPT);"
```

4. すべての値を入力したら、右下の **実行** ボタンをクリック
5. 「1行挿入されました」と表示されれば成功

#### 初回ログインのテスト

1. ブラウザで `https://online.kids8.okinawa/` にアクセス
2. ログイン画面で以下を入力：
   - メールアドレス: `admin@example.com`（上記で設定したもの）
   - パスワード: `AdminPassword123!`（上記で設定したもの）
3. **ログイン** をクリック
4. ダッシュボードが表示されればログイン成功

#### セキュリティ対策（必須）

ログイン成功後、**必ず以下を実行**してください：

1. 右上のユーザー名 → **パスワード変更**
2. より強力なパスワードに変更
3. 可能であれば、管理者のメールアドレスも実際に使用するものに変更


### 8. パーミッション設定

FTPクライアントまたはサーバーのファイルマネージャーで以下を確認：

```bash
public_html/online/api/uploads/   → 755 または 777（書き込み可能にする）
public_html/online/api/db.sqlite3 → 644（SQLiteを使用する場合）
```

### 9. PHP バージョン設定

1. サーバーパネル → **PHP → PHP Ver.切替**
2. `online.kids8.okinawa` を選択
3. **PHP 8.1** 以上を選択（推奨: 8.2）

### 10. .htaccess の設定（APIルーティング）

`public_html/online/api/.htaccess` を作成（存在しない場合）：

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /api/
    
    # ファイルまたはディレクトリが存在しない場合、index.phpにルーティング
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

# アップロードファイルの最大サイズ（必要に応じて調整）
php_value upload_max_filesize 10M
php_value post_max_size 10M
```

### 11. フロントエンドのAPI設定確認

`frontend/src/config/api.ts` が本番環境を認識できるように、ビルド前に確認：

```typescript
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // 本番環境: 相対パス
  : 'http://localhost:5050';  // 開発環境
```

正しく設定されていれば、ビルド時に自動的に `/api` が使用されます。

### 12. デプロイ確認チェックリスト

デプロイ後、以下を確認してください：

- [ ] `https://online.kids8.okinawa/` にアクセスしてログイン画面が表示される
- [ ] 管理者アカウントでログインできる
- [ ] ダッシュボードが正常に表示される
- [ ] 教材一覧ページにアクセスできる
- [ ] 新規教材を作成できる
- [ ] レッスンを作成できる
- [ ] 問題を作成できる（コード、選択式、記述式すべて）
- [ ] テストケースを追加できる（コード問題）
- [ ] 学生ユーザーを作成できる
- [ ] 学生アカウントでログインできる
- [ ] 学生として問題を提出できる
- [ ] 画像やファイルのアップロードが機能する
- [ ] ブラウザの開発者ツールでコンソールエラーがない

### アプリケーションの更新手順

コードを更新してサーバーに反映する手順：

#### フロントエンドの更新

1. ローカル環境で変更を加える
2. フロントエンドをビルド：
   ```bash
   cd frontend
   npm run build
   ```
3. FTPで `dist/` の内容を `public_html/online/` にアップロード（上書き）
4. ブラウザで `Ctrl+Shift+R`（強制リロード）して確認

#### バックエンドの更新

1. ローカル環境で PHP ファイルを変更
2. FTP で該当ファイルを `public_html/online/api/` にアップロード（上書き）
3. 変更が即座に反映されます

#### データベーススキーマの変更

1. マイグレーション SQL ファイルを作成
2. phpMyAdmin で SQL を実行
3. または、バックエンドに migration エンドポイントを作成して実行

### バックアップ方法

定期的にバックアップを取ることを強く推奨します。

#### データベースのバックアップ

**方法1: phpMyAdmin を使用**
1. phpMyAdmin にログイン
2. データベースを選択
3. 上部の **エクスポート** タブをクリック
4. エクスポート方法: **詳細**
5. すべてのテーブルを選択
6. フォーマット: **SQL**
7. 「DROP TABLE を追加」にチェック
8. **実行** をクリックしてダウンロード
9. ファイル名例: `programmingschool_backup_20260228.sql`

**方法2: SSH経由（上級者向け）**
```bash
mysqldump -h mysql123.xserver.jp -u xserver_user123 -p xserver_db123 > backup.sql
```

#### ファイルのバックアップ

**FTP経由**
1. FileZilla で `public_html/online/` フォルダ全体を選択
2. 右クリック → **ダウンロード**
3. ローカルの安全な場所に保存

**重要なファイル**:
- `api/uploads/` - ユーザーがアップロードしたファイル
- `api/db.php` - データベース接続設定（バックアップとして）

#### 復元方法

**データベースの復元**:
1. phpMyAdmin でデータベースを選択
2. **インポート** タブをクリック
3. バックアップした `.sql` ファイルを選択
4. **実行** をクリック


### トラブルシューティング（詳細版）

#### 1. ログインできない / 認証エラー

**症状**: ログインボタンをクリックしても何も起こらない、または「認証に失敗しました」と表示される

**原因と対策**:

a) **データベース接続エラー**
   - `api/db.php` の接続情報を再確認
   - phpMyAdmin で同じ情報でログインできるか確認
   - ホスト名、ユーザー名、パスワード、DB名が正しいか確認

b) **管理者アカウントが存在しない**
   ```sql
   -- phpMyAdmin で確認
   SELECT * FROM users WHERE role = 'admin';
   ```
   - 結果が0件の場合、手順7を参照して管理者を作成

c) **パスワードのハッシュ化が正しくない**
   - パスワードは必ず bcrypt でハッシュ化する必要があります
   - 平文のパスワードを直接入れても**ログインできません**

d) **CORS エラー**
   - ブラウザの開発者ツール（F12）→ Console タブを確認
   - CORS エラーが出ている場合、`.htaccess` に以下を追加：
     ```apache
     Header set Access-Control-Allow-Origin "*"
     Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
     Header set Access-Control-Allow-Headers "Content-Type, Authorization"
     ```

#### 2. API が 404 エラーになる

**症状**: ログイン時やデータ取得時に「404 Not Found」エラー

**原因と対策**:

a) **`.htaccess` が機能していない**
   - `public_html/online/api/.htaccess` が存在するか確認
   - 内容を再確認（手順10参照）
   - Xserver では通常 `mod_rewrite` が有効ですが、念のため確認

b) **APIファイルのパスが間違っている**
   ```
   正しい配置:
   public_html/online/api/index.php
   
   間違い:
   public_html/online/index.php (バックエンドがルートにある)
   ```

c) **ファイル名の大文字小文字の違い**
   - Linux サーバーは大文字小文字を区別します
   - `Index.php` ではなく `index.php` であることを確認

#### 3. フロントエンドが表示されない / 白い画面

**症状**: `https://online.kids8.okinawa/` にアクセスすると白い画面が表示される

**原因と対策**:

a) **index.html が存在しない**
   - FTPで `public_html/online/index.html` が存在するか確認
   - ビルド時のエラーを確認: `npm run build` を再実行

b) **JavaScript の読み込みエラー**
   - ブラウザの開発者ツール（F12）→ Console タブを確認
   - `Failed to load resource` エラーがある場合、アセットファイルのパスを確認
   - `dist/assets/` フォルダが正しくアップロードされているか確認

c) **SSL証明書の問題**
   - `http://online.kids8.okinawa/` でアクセスしてみる
   - SSL証明書が正しく発行されているか確認（手順2参照）
   - 発行に数時間かかる場合があります

d) **ブラウザのキャッシュ**
   - `Ctrl+Shift+R`（Windows/Linux）または `Cmd+Shift+R`（Mac）で強制リロード
   - ブラウザのキャッシュをクリア

#### 4. ファイルアップロードができない

**症状**: 問題に画像を添付しようとすると「アップロードに失敗しました」

**原因と対策**:

a) **uploads ディレクトリのパーミッション不足**
   - FTPで `public_html/online/api/uploads/` を確認
   - パーミッションを `755` または `777` に変更
   - FileZilla: 右クリック → ファイルのパーミッション

b) **ファイルサイズ制限**
   - `api/.htaccess` に以下を追加：
     ```apache
     php_value upload_max_filesize 10M
     php_value post_max_size 10M
     php_value memory_limit 128M
     ```
   - より大きなファイルが必要な場合は数値を増やす

c) **uploads ディレクトリが存在しない**
   - FTPで `public_html/online/api/uploads/` フォルダを手動で作成

#### 5. PHPエラーが表示される

**症状**: 画面に「Warning」「Fatal error」などのPHPエラーが表示される

**原因と対策**:

a) **本番環境でエラー表示を無効化**
   - `api/index.php` の最初の方で以下を確認：
     ```php
     ini_set('display_errors', '0');  // 本番環境では '0'
     ini_set('log_errors', '1');      // ログには記録
     ```

b) **エラーログの確認**
   - Xserver サーバーパネル → **ログファイル** → **エラーログ**
   - ここで詳細なエラー内容を確認

c) **PHPバージョンの互換性**
   - サーバーパネルで PHP 8.1 以上が選択されているか確認
   - 古いバージョンでは一部の構文が動作しません

#### 6. データベース接続エラー

**症状**: 「Database connection failed」エラー

**原因と対策**:

a) **接続情報の誤り**
   ```php
   // api/db.php を再確認
   $host = 'mysql123.xserver.jp';     // 正しいホスト名か？
   $dbname = 'xserver_db123';         // 正しいDB名か？
   $user = 'xserver_user123';         // 正しいユーザー名か？
   $password = 'your_db_password';    // 正しいパスワードか？
   ```

b) **データベースユーザーの権限不足**
   - phpMyAdmin でログインできるか確認
   - サーバーパネル → MySQL設定 → ユーザーとDBの紐付けを確認

c) **接続数の上限**
   - Xserver では同時接続数に制限があります
   - エラーログに「Too many connections」がある場合、時間を置いて再試行

#### 7. コード実行が動作しない

**症状**: Pythonコードを提出しても「実行に失敗しました」

**原因**:
- **Xserver 標準ホスティングでは Python コードの実行はできません**
- PHPからPythonを呼び出すには、VPS（仮想専用サーバー）またはクラウドサーバーが必要

**対策**:
- コード実行機能を使用する場合は、以下の選択肢を検討：
  1. Xserver の VPS プランに移行
  2. AWS EC2、GCP、Azure などのクラウドサービスを利用
  3. Docker を使用できる環境にデプロイ

#### 8. エラーログの確認方法

Xserver でのエラーログ確認：

1. サーバーパネル → **ログファイル**
2. **エラーログ** をクリック
3. 最新のエラーを確認
4. タイムスタンプを見て、問題発生時刻と照合

よくあるエラーメッセージ：
- `PDOException: Connection refused` → データベース接続設定を確認
- `Call to undefined function` → PHP拡張機能が不足（通常は問題なし）
- `Permission denied` → ファイル/ディレクトリのパーミッションを確認
- `Failed to open stream` → ファイルパスが間違っているか、ファイルが存在しない

#### 9. 問題が解決しない場合

1. **ブラウザの開発者ツールを確認**
   - F12 → Console タブ
   - Network タブで失敗しているリクエストを確認

2. **サーバーのエラーログを確認**
   - 詳細なエラー情報が記録されています

3. **データベースの状態を確認**
   - phpMyAdmin でテーブルが正しく作成されているか
   - データが正しく保存されているか

4. **ファイル配置を再確認**
   - すべてのファイルが正しいディレクトリにあるか
   - パーミッションが正しいか

5. **ローカル環境で再現するか確認**
   - ローカルで動作するコードがサーバーで動作しない場合、環境の違いを調査


### セキュリティ推奨設定（詳細）

#### 1. JWT Secret の変更（必須）

`backend/index.php` 内の JWT シークレットキーを変更：

```php
// 元のコード（例）
$secretKey = 'your-secret-key';

// 変更後（強力なランダム文字列）
$secretKey = 'xK9mP2nR5vL8qW4tY7sE0jH3fG6bN1cM9zA5dF8gH2kL4mP7qR0tS3vX6yB9';
```

**ランダム文字列の生成方法**:
```bash
# Linux/Mac
openssl rand -base64 48

# または
php -r "echo bin2hex(random_bytes(32));"
```

#### 2. データベースユーザーの権限を最小化

phpMyAdmin または MySQL コマンドで：

```sql
-- 必要最小限の権限のみ付与
GRANT SELECT, INSERT, UPDATE, DELETE ON xserver_db123.* TO 'xserver_user123'@'%';
FLUSH PRIVILEGES;

-- DROP や CREATE は通常不要（初期構築後）
```

#### 3. エラー表示の無効化（本番環境）

`api/index.php` の先頭で確認：

```php
<?php
// タイムゾーンを日本時間に設定
date_default_timezone_set('Asia/Tokyo');

// エラーハンドリングの設定（本番環境）
error_reporting(E_ALL);
ini_set('display_errors', '0');  // 画面にエラーを表示しない
ini_set('log_errors', '1');      // ログファイルに記録
```

#### 4. .htaccess でのセキュリティ強化

`public_html/online/.htaccess` を作成（ルートディレクトリ）：

```apache
# ディレクトリ一覧の無効化
Options -Indexes

# .envファイルなどへのアクセスを禁止
<FilesMatch "^\.">
    Require all denied
</FilesMatch>

# SQLファイルへのアクセスを禁止
<FilesMatch "\.(sql|sqlite3|db)$">
    Require all denied
</FilesMatch>

# セキュリティヘッダーの追加
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

#### 5. HTTPS の強制

`public_html/online/.htaccess` に追加：

```apache
# HTTPSにリダイレクト
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

#### 6. パスワードポリシーの設定

- 管理者パスワードは最低12文字以上
- 英大文字、英小文字、数字、記号を含む
- 定期的に変更（3〜6ヶ月ごと）
- 辞書にある単語を使わない

#### 7. 定期的なバックアップの自動化

Xserver の自動バックアップ機能を有効化：
- サーバーパネル → **自動バックアップ設定**
- データベースとファイルの両方をバックアップ

### パフォーマンス最適化

#### 1. PHP の設定最適化

`api/.htaccess` に追加：

```apache
# メモリ制限の調整
php_value memory_limit 256M

# 実行時間の制限
php_value max_execution_time 60

# OPcache の有効化（Xserverでは通常有効）
php_flag opcache.enable On
```

#### 2. キャッシュの活用

現在、`/api/progress` エンドポイントにキャッシュが実装されています：
- デフォルトで60秒間キャッシュ
- `?force=1` パラメータでキャッシュを無視

他のエンドポイントにも同様のキャッシュを追加することを検討してください。

#### 3. データベースのインデックス

頻繁にクエリされるカラムにインデックスを追加：

```sql
-- submissions テーブルの最適化
CREATE INDEX idx_submissions_user ON submission(user_id);
CREATE INDEX idx_submissions_assignment ON submission(assignment_id);
CREATE INDEX idx_submissions_date ON submission(submitted_at);

-- assignments テーブルの最適化
CREATE INDEX idx_assignments_lesson ON assignment(lesson_id);
```

#### 4. 画像の最適化

- 画像をアップロードする前に圧縮（TinyPNG、ImageOptim など）
- サイズの大きい画像は避ける（推奨: 1MB以下）
- 必要に応じて WebP 形式を使用

### 運用のベストプラクティス

#### 定期メンテナンス

**週次**:
- エラーログの確認
- ディスク使用量の確認

**月次**:
- データベースのバックアップ
- パフォーマンスの確認（レスポンス時間など）
- セキュリティアップデートの確認

**四半期ごと**:
- 管理者パスワードの変更
- 使用していないユーザーアカウントの削除

#### モニタリング

- Xserver のアクセスログで異常なトラフィックを監視
- データベースのサイズを定期的に確認
- 不要な submission データを定期的に削除（古いもの）

#### スケーリング

ユーザー数が増加した場合：
1. Xserver のプランをアップグレード
2. CDN（Cloudflare など）を導入
3. データベースの最適化（古いデータのアーカイブ）
4. VPS や専用サーバーへの移行を検討

---

### よくある質問（FAQ）

**Q1: ローカル環境と本番環境で動作が違うのはなぜ？**
- PHP や MySQL のバージョンの違い
- タイムゾーンの設定の違い
- ファイルパスの違い（Windows と Linux）

**Q2: 学生アカウントを一括で作成できますか？**
- 現在は phpMyAdmin で手動作成
- または、CSV インポート機能を実装することを推奨

**Q3: Pythonコードの実行機能を本番で使うには？**
- Xserver VPS またはクラウドサーバーに移行する必要があります
- Docker が使える環境が必要です

**Q4: バックアップはどのくらいの頻度で取るべき？**
- 最低でも週1回
- 重要なデータ（試験期間など）は毎日推奨

**Q5: SSL証明書の更新は必要ですか？**
- Let's Encrypt は自動更新されます（Xserver が管理）
- 通常は手動での更新作業は不要

---
