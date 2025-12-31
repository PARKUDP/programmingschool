# 100人以上対応システム 起動手順

## 前提条件
- Docker Desktop がインストールされていること
- 最低 4GB RAM が利用可能であること
- 最低 10GB のディスク空き容量があること

## 起動手順

### 1. Dockerを起動
macOSの場合：
```bash
open -a Docker
```

Dockerが起動するまで1-2分待ちます。

### 2. 既存のコンテナとボリュームをクリーンアップ（必要に応じて）
```bash
cd /Volumes/PARK_SSD/Project/product/programmingschool

# 既存のコンテナを停止・削除
docker-compose down -v

# 古いイメージを削除（オプション）
docker-compose down --rmi all
```

### 3. システムを起動
```bash
# コンテナをビルド＆起動
docker-compose up -d --build

# ログをリアルタイムで確認
docker-compose logs -f
```

### 4. 起動確認
```bash
# コンテナの状態を確認
docker-compose ps

# 以下のように表示されればOK：
# NAME                         STATUS              PORTS
# programmingschool_mysql      Up (healthy)        0.0.0.0:3306->3306/tcp
# programmingschool_backend    Up                  0.0.0.0:5050->80/tcp
# programmingschool_frontend   Up                  0.0.0.0:3000->3000/tcp
```

### 5. アクセス確認
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:5050/api/materials
- 管理者ログイン: username=`admin`, password=`admin`

## トラブルシューティング

### MySQLが起動しない場合
```bash
# MySQLのログを確認
docker-compose logs db

# MySQLコンテナを再起動
docker-compose restart db

# データベースが破損している場合、ボリュームを削除して再作成
docker-compose down -v
docker-compose up -d
```

### Backendがデータベースに接続できない場合
```bash
# データベースの準備が完了するまで待つ（ヘルスチェック）
docker-compose ps

# dbコンテナがhealthyになるまで待機してから、backendを再起動
docker-compose restart backend
```

### ポートが既に使用されている場合
```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :5050
lsof -i :3306

# docker-compose.ymlのポート番号を変更
# 例: "5050:80" → "5051:80"
```

### メモリ不足エラー
```bash
# Dockerのリソース制限を確認
# Docker Desktop → Settings → Resources → Memory を 4GB以上に設定
```

## パフォーマンステスト

### 同時接続テスト
```bash
# Apache Bench でテスト（100同時接続、1000リクエスト）
ab -n 1000 -c 100 http://localhost:5050/api/materials

# wrk でテスト（12スレッド、100接続、30秒間）
wrk -t12 -c100 -d30s http://localhost:5050/api/materials
```

### データベース接続数確認
```bash
# 現在の接続数を確認
docker-compose exec db mysql -u root -prootpassword -e "SHOW STATUS LIKE 'Threads_connected';"

# 最大接続数を確認
docker-compose exec db mysql -u root -prootpassword -e "SHOW VARIABLES LIKE 'max_connections';"
```

### リソース使用状況の監視
```bash
# リアルタイムでコンテナのCPU/メモリ使用量を表示
docker stats
```

## メンテナンスコマンド

### ログの確認
```bash
# 全てのログ
docker-compose logs

# 特定のサービスのログ
docker-compose logs backend
docker-compose logs db

# ログをフォロー
docker-compose logs -f --tail=100
```

### データベースバックアップ
```bash
# データベース全体をバックアップ
docker-compose exec db mysqldump -u root -prootpassword programmingschool > backup_$(date +%Y%m%d_%H%M%S).sql

# バックアップから復元
docker-compose exec -T db mysql -u root -prootpassword programmingschool < backup_YYYYMMDD_HHMMSS.sql
```

### システムのクリーンアップ
```bash
# 停止
docker-compose down

# ボリュームも削除（データが全て消えます）
docker-compose down -v

# イメージも削除
docker-compose down --rmi all
```

## 本番環境への移行チェックリスト

- [ ] `.env` ファイルを作成し、パスワードを変更
- [ ] `docker-compose.yml` の `MYSQL_ROOT_PASSWORD` を変更
- [ ] `JWT_SECRET` を安全なランダム文字列に変更
- [ ] デフォルト管理者パスワード（admin/admin）を変更
- [ ] HTTPS/SSL証明書の設定
- [ ] ファイアウォールルールの設定
- [ ] 自動バックアップの設定
- [ ] モニタリングツールの導入（Prometheus, Grafana等）
- [ ] ログローテーションの設定
- [ ] セキュリティアップデートの定期実行

## 推奨スペック（100人以上）

### 最小構成
- CPU: 2コア
- RAM: 4GB
- ストレージ: 20GB SSD

### 推奨構成（100-200人）
- CPU: 4コア
- RAM: 8GB
- ストレージ: 50GB SSD
- ネットワーク: 100Mbps以上

### 大規模構成（200人以上）
- CPU: 8コア以上
- RAM: 16GB以上
- ストレージ: 100GB SSD
- ネットワーク: 1Gbps
- ロードバランサー + 複数バックエンドインスタンス
- MySQL レプリケーション構成
