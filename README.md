# 概要
本アプリケーションはプログラミング教材を配信する学習管理システムです。管理者は教材とレッスン、問題を登録し、ユーザーは出題された問題を解いて進捗を確認できます。

# 採択技術
- フロントエンド: React (`frontend` ディレクトリ)
- バックエンド: PHP + SQLite (`backend` ディレクトリ)

# 起動方法
Docker Compose を使用してフロントエンドとバックエンドを同時に起動できます。

```bash
docker-compose up --build
```

ブラウザで `http://localhost:3000` にアクセスするとフロントエンド、`http://localhost:5050` にバックエンド API が起動します。

# 参考文献
- https://iiiar.org/iiars/doc/iiars_workshop7_2_2.pdf
- https://2022.nawaten.online/project/2711
