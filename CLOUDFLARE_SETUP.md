# Cloudflare ドメイン設定ガイド

## parkudp.me ドメインでの本番環境セットアップ

### 1. 前提条件
- parkudp.me ドメインが Cloudflare で管理されている
- Docker Compose で本番サーバーを実行する
- ポート 80（HTTP）と 443（HTTPS）がアクセス可能である

### 2. Cloudflare DNS 設定

Cloudflare のダッシュボードで以下の DNS レコードを追加：

```
A レコード
名前: school  （またはサブドメインなし）
IPv4 アドレス: あなたのサーバーの IP アドレス
TTL: Auto
プロキシ状態: プロキシ表示（オレンジ色）
```

または、完全ドメイン設定（サブドメインなし）：
```
A レコード
名前: @ （ルート）
IPv4 アドレス: あなたのサーバーの IP アドレス
TTL: Auto
プロキシ状態: プロキシ表示（オレンジ色）
```

設定後、以下でテスト可能：
```bash
ping school.parkudp.me  # または parkudp.me
```

### 3. SSL/TLS 設定（Cloudflare）

1. Cloudflare ダッシュボードで「SSL/TLS」を選択
2. 「概要」タブで「フレキシブル」を選択（推奨）
   - Cloudflare から本サーバーへは HTTP で通信
   - ユーザー から Cloudflare へは HTTPS で通信

### 4. ローカルサーバーでの HTTP ポート設定

Docker Compose で HTTP トラフィックを受け入れる設定：

```yaml
ports:
  - "80:80"    # HTTP - Cloudflare からのリクエスト
  - "443:443"  # HTTPS（オプション：自己署名証明書）
  - "5050:80"  # 開発用：ローカルホストの 5050 ポート
```

### 5. 本番環境での実行

```bash
# .env ファイルで本番設定
DB_PASSWORD=strong_secure_password
JWT_SECRET=long_random_secret_key

# Docker Compose で起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 6. Cloudflare ページルール（オプション）

キャッシング戦略の最適化：

- **キャッシュレベル**: キャッシュ（すべてのリソースをキャッシュ）
  - ただし API エンドポイント（`/api/*`）は除外

```
ページルール: school.parkudp.me/api/*
- キャッシュレベル: キャッシュしない
- ブラウザキャッシュ TTL: 1 時間
```

### 7. セキュリティ設定

Cloudflare の セキュリティ設定：

1. **WAF（Web Application Firewall）**
   - OWASP ModSecurity Core Rule Set を有効化

2. **DDoS 対策**
   - 自動的に有効

3. **レート制限**
   - API エンドポイントに対してレート制限を設定（推奨）
   ```
   https://school.parkudp.me/api/*
   - リクエスト数: 100
   - 期間: 10 秒
   ```

### 8. トラブルシューティング

**DNS が解決しない場合**
```bash
nslookup school.parkudp.me
dig school.parkudp.me
```

**HTTP 502/503 エラー**
- Docker コンテナが起動しているか確認：`docker compose ps`
- ポート 80 が開いているか確認：`netstat -tuln | grep 80`
- ファイアウォール設定を確認

**SSL 証明書エラー**
- Cloudflare の SSL/TLS モードを「フレキシブル」に変更
- キャッシュをクリア：Cloudflare ダッシュボード → キャッシュ削除

### 9. 監視と ログ

**Cloudflare ダッシュボード**
- 分析セクションでトラフィックとパフォーマンスをモニタリング
- セキュリティイベントをチェック

**ローカルログ**
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

## 開発環境での localhost テスト

```bash
# ローカル開発用ポート
curl http://localhost:5050/api/login
```

## 本番環境への切り替えチェックリスト

- [ ] parkudp.me が Cloudflare で管理されている
- [ ] DNS A レコードが設定されている
- [ ] SSL/TLS がフレキシブルモードに設定されている
- [ ] JWT_SECRET を強力な値に変更した
- [ ] DATABASE_PASSWORD を強力な値に変更した
- [ ] .env ファイルが .gitignore に含まれている
- [ ] Docker Compose が本番ポート（80、443）で起動している
- [ ] firewall が HTTP/HTTPS トラフィックを許可している

---

トラブルが発生した場合は、Cloudflare サポートと Docker ドキュメントを参照してください。
