# 100人以上対応プログラミングスクールシステム

## 📊 スケーラビリティ

このシステムは以下の最適化により **100人以上の同時利用** に対応しています：

### データベース最適化
- **MySQL 8.0** の使用（SQLiteから移行）
- 最大接続数: 500
- InnoDB バッファプールサイズ: 512MB
- 適切なインデックスの設定
- トランザクション最適化

### Webサーバー最適化
- **Apache MPM Event** モード
- 最大ワーカー数: 400
- スレッド数: 25/プロセス
- **PHP OPcache** 有効化
- **APCu** キャッシュ有効化

### パフォーマンス設定
- PHP メモリ制限: 256MB
- 接続プーリング（PDO persistent connections）
- 適切なタイムアウト設定

## 🚀 起動方法

### 1. システム要件
- Docker & Docker Compose
- 最低 2GB RAM（推奨: 4GB以上）
- 最低 2コアCPU（推奨: 4コア以上）

### 2. 起動コマンド

```bash
# コンテナをビルド＆起動
docker-compose up -d --build

# ログを確認
docker-compose logs -f

# データベースが正常に起動するまで待機（ヘルスチェック）
docker-compose ps
```

### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:5050
- **MySQL**: localhost:3306

### 4. デフォルトログイン情報

- **ユーザー名**: admin
- **パスワード**: admin

⚠️ **本番環境では必ずパスワードを変更してください**

## 🗄️ データベース管理

### 初期化
データベースは初回起動時に自動で初期化されます（`init.sql`が実行されます）。

### 手動でテーブルを作成する場合

```bash
# PHPスクリプトで作成（SQLite互換）
docker-compose exec backend php create_tables.php

# または、MySQLスクリプトで作成
docker-compose exec db mysql -u appuser -papppassword programmingschool < /docker-entrypoint-initdb.d/init.sql
```

### データベースへの直接接続

```bash
# コンテナ内から
docker-compose exec db mysql -u appuser -papppassword programmingschool

# ホストから
mysql -h 127.0.0.1 -P 3306 -u appuser -papppassword programmingschool
```

## 📈 パフォーマンス監視

### コンテナのリソース使用状況を確認

```bash
docker stats
```

### MySQLのパフォーマンス確認

```bash
docker-compose exec db mysql -u root -prootpassword -e "SHOW STATUS LIKE '%connections%';"
docker-compose exec db mysql -u root -prootpassword -e "SHOW PROCESSLIST;"
```

### Apacheのステータス確認

```bash
docker-compose exec backend apache2ctl status
```

## 🔧 環境変数のカスタマイズ

`docker-compose.yml` で以下の環境変数をカスタマイズできます：

### MySQL設定
```yaml
MYSQL_ROOT_PASSWORD: rootpassword    # rootパスワード
MYSQL_DATABASE: programmingschool    # データベース名
MYSQL_USER: appuser                  # アプリケーション用ユーザー
MYSQL_PASSWORD: apppassword          # アプリケーション用パスワード
```

### Backend設定
```yaml
DB_TYPE: mysql                       # データベースタイプ (mysql/sqlite)
DB_HOST: db                          # データベースホスト
DB_PORT: 3306                        # データベースポート
DB_NAME: programmingschool           # データベース名
DB_USER: appuser                     # データベースユーザー
DB_PASSWORD: apppassword             # データベースパスワード
PHP_MEMORY_LIMIT: 256M              # PHPメモリ制限
PHP_MAX_EXECUTION_TIME: 60          # PHP最大実行時間
```

## 🧪 負荷テスト

システムの性能を確認するには、負荷テストツールを使用できます：

```bash
# Apache Bench を使用した例
ab -n 1000 -c 100 http://localhost:5050/api/materials

# または wrk を使用
wrk -t12 -c100 -d30s http://localhost:5050/api/materials
```

## 🔒 本番環境へのデプロイ前チェックリスト

- [ ] 管理者パスワードを変更
- [ ] データベースパスワードを強力なものに変更
- [ ] JWT_SECRET を変更
- [ ] HTTPS/SSL証明書の設定
- [ ] ファイアウォールの設定
- [ ] バックアップ戦略の確立
- [ ] ログローテーションの設定
- [ ] モニタリングツールの導入

## 📝 さらなるスケーリング

100人を超える規模になった場合の対策：

### 水平スケーリング
```yaml
# docker-compose.yml でバックエンドをスケール
docker-compose up -d --scale backend=3
```

### ロードバランサーの追加
- Nginx リバースプロキシを追加
- セッション管理をRedisに移行
- 静的ファイルをCDNに配置

### データベースのスケーリング
- MySQL レプリケーション（マスター/スレーブ構成）
- 読み取り専用スレーブの追加
- データベースコネクションプールの調整

## 🐛 トラブルシューティング

### データベース接続エラー
```bash
# データベースコンテナのログを確認
docker-compose logs db

# ヘルスチェックの確認
docker-compose ps
```

### パフォーマンスが悪い場合
1. `docker stats` でリソース使用状況を確認
2. MySQLのスロークエリログを確認
3. PHPのエラーログを確認: `docker-compose logs backend`

### コンテナの再起動
```bash
# 全てのコンテナを再起動
docker-compose restart

# 特定のコンテナのみ再起動
docker-compose restart backend
```

## 📞 サポート

問題が発生した場合は、以下を確認してください：
1. エラーログ: `docker-compose logs`
2. コンテナの状態: `docker-compose ps`
3. リソース使用状況: `docker stats`
