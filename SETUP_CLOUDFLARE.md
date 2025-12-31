# Cloudflare Tunnel セットアップガイド
## school.parkudp.me ドメインでの本番環境構築

このガイドでは、Cloudflare Tunnel + Caddy を使用して `school.parkudp.me` でプログラミングスクールアプリケーションを公開する手順を説明します。

---

## 📋 前提条件

- `parkudp.me` ドメインが Cloudflare で管理されている
- Docker と Docker Compose がインストール済み
- Cloudflare アカウントにログイン可能
- `cloudflared` CLI をローカルにインストール（下記参照）

---

## 🔧 1. Cloudflared のインストール

### macOS の場合
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Linux の場合
```bash
# Debian/Ubuntu
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# または直接ダウンロード
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### インストール確認
```bash
cloudflared --version
```

---

## 🔐 2. Cloudflare にログイン

```bash
cloudflared tunnel login
```

- ブラウザが開き、Cloudflare の認証画面が表示されます
- `parkudp.me` ドメインを選択して承認
- `~/.cloudflared/cert.pem` に認証情報が保存されます

---

## 🚇 3. Tunnel の作成

```bash
cloudflared tunnel create programmingschool
```

**出力例:**
```
Tunnel credentials written to /Users/yourname/.cloudflared/12345678-1234-1234-1234-123456789abc.json
Created tunnel programmingschool with id 12345678-1234-1234-1234-123456789abc
```

**重要:** Tunnel ID（上記の `12345678-1234-1234-1234-123456789abc`）をメモしてください。

---

## 📝 4. Tunnel 設定ファイルの作成

プロジェクトルートに `cloudflared` ディレクトリを作成し、設定ファイルを配置します：

```bash
mkdir -p cloudflared
```

### `cloudflared/config.yml` を作成

```yaml
tunnel: 12345678-1234-1234-1234-123456789abc
credentials-file: /etc/cloudflared/12345678-1234-1234-1234-123456789abc.json

ingress:
  - hostname: school.parkudp.me
    service: http://caddy:80
  - service: http_status:404
```

**注意:** 
- `tunnel` の値を手順3で取得した Tunnel ID に置き換えてください
- `credentials-file` のファイル名も同じ Tunnel ID を使用してください

---

## 🔑 5. Tunnel 認証情報のコピー

```bash
# ~/.cloudflared にある認証情報をプロジェクトにコピー
cp ~/.cloudflared/12345678-1234-1234-1234-123456789abc.json cloudflared/
```

**重要:** `12345678-1234-1234-1234-123456789abc.json` を自分の Tunnel ID に置き換えてください。

---

## 🌐 6. DNS レコードの設定

Tunnel を DNS に接続します：

```bash
cloudflared tunnel route dns programmingschool school.parkudp.me
```

**出力例:**
```
Added CNAME school.parkudp.me which will route to tunnel programmingschool
```

### Cloudflare ダッシュボードで確認

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) にログイン
2. `parkudp.me` ドメインを選択
3. **DNS** タブを開く
4. 以下のレコードが自動作成されていることを確認：

```
CNAME  school  12345678-1234-1234-1234-123456789abc.cfargotunnel.com
```

---

## 🐳 7. Docker Compose で起動

### 環境変数の設定（オプション）

本番環境用の強力なパスワードとシークレットキーを設定：

```bash
# .env ファイルを編集（なければ作成）
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=your_strong_root_password_here
MYSQL_PASSWORD=your_strong_app_password_here
JWT_SECRET=your_very_long_random_secret_key_here
EOF
```

### Docker Compose 起動

```bash
# コンテナをビルド＆起動
docker compose up -d

# ログを確認
docker compose logs -f cloudflared
docker compose logs -f caddy
```

**期待される出力:**
- `cloudflared`: `Connection registered`, `Tunnel started`
- `caddy`: `serving initial configuration`

---

## ✅ 8. 動作確認

### ブラウザでアクセス
```
https://school.parkudp.me
```

フロントエンドが正常に表示されることを確認してください。

### コマンドで確認

```bash
# DNS 解決
nslookup school.parkudp.me

# HTTP レスポンス
curl -I https://school.parkudp.me
```

---

## 🔍 9. トラブルシューティング

### Tunnel が起動しない場合

```bash
# Tunnel の状態を確認
cloudflared tunnel info programmingschool

# ログを確認
docker compose logs cloudflared
```

**よくあるエラー:**
- `credentials-file not found`: 認証情報ファイルのパスが間違っています
- `tunnel ID not found`: config.yml の Tunnel ID が間違っています

### Caddy がリバースプロキシできない場合

```bash
# Caddy ログ確認
docker compose logs caddy

# ネットワーク接続確認
docker compose exec caddy ping frontend
docker compose exec caddy ping backend
```

### 502 Bad Gateway エラー

```bash
# すべてのコンテナが起動しているか確認
docker compose ps

# バックエンドが応答するか確認
docker compose exec caddy curl http://backend:80/api/login
docker compose exec caddy curl http://frontend:3000
```

---

## 🔄 10. Tunnel の管理コマンド

### Tunnel 一覧を表示
```bash
cloudflared tunnel list
```

### Tunnel 情報を確認
```bash
cloudflared tunnel info programmingschool
```

### Tunnel を削除（必要な場合）
```bash
# DNS レコードを削除
cloudflared tunnel route dns --delete programmingschool school.parkudp.me

# Tunnel を削除
cloudflared tunnel delete programmingschool
```

---

## 🔒 11. セキュリティ設定（推奨）

### Cloudflare WAF（Web Application Firewall）

1. Cloudflare ダッシュボード → **セキュリティ** → **WAF**
2. OWASP ルールセットを有効化

### レート制限

API エンドポイントに対してレート制限を設定：

1. **セキュリティ** → **レート制限ルール** → **ルールを作成**
2. 条件: `URI パス` が `/api/*` を含む
3. アクション: `100 リクエスト / 10秒` を超えたらブロック

### SSL/TLS 設定

1. **SSL/TLS** → **概要**
2. 暗号化モード: **完全（厳密）** を選択（Caddy が自動的に証明書を管理）

---

## 📊 12. 監視とログ

### Cloudflare Analytics
- ダッシュボードの **分析** タブでトラフィックを監視
- **セキュリティイベント** でブロックされたリクエストを確認

### Docker ログ
```bash
# リアルタイムログ
docker compose logs -f

# 特定サービスのログ
docker compose logs backend
docker compose logs frontend
docker compose logs caddy
docker compose logs cloudflared
```

---

## 🚀 13. 本番環境チェックリスト

- [ ] `cloudflared` をインストール
- [ ] Cloudflare にログイン（`cloudflared tunnel login`）
- [ ] Tunnel を作成（`cloudflared tunnel create programmingschool`）
- [ ] `cloudflared/config.yml` を作成（Tunnel ID を記載）
- [ ] 認証情報ファイルをコピー
- [ ] DNS ルートを設定（`cloudflared tunnel route dns`）
- [ ] `.env` ファイルで本番用パスワードを設定
- [ ] `docker compose up -d` で起動
- [ ] `https://school.parkudp.me` でアクセス確認
- [ ] Cloudflare WAF とレート制限を有効化
- [ ] `.gitignore` に `cloudflared/*.json` と `.env` を追加

---

## 🛠 14. 開発環境との併用

ローカル開発時は以下のコマンドで cloudflared を無効化できます：

```bash
# cloudflared を停止
docker compose stop cloudflared

# ローカルでアクセス（Caddy 経由）
curl http://localhost:80
```

または、開発用ポートを使用：

```bash
# backend に直接アクセス
curl http://localhost:5050/api/login  # ← ポート5050を追加する必要あり

# frontend に直接アクセス
curl http://localhost:3000
```

---

## 📞 サポート

問題が発生した場合：
- [Cloudflare Zero Trust ドキュメント](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Caddy ドキュメント](https://caddyserver.com/docs/)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)

---

**最終更新:** 2025年12月31日
