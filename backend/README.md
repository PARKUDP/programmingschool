# PHP Backend

このディレクトリには簡易的な PHP + SQLite 製 API サーバーが含まれています。

## セットアップ
1. Docker イメージをビルドします。
   ```bash
   docker build -t programmingschool-backend .
   ```
2. SQLite データベースを初期化します。
   ```bash
   docker run --rm -v $(pwd):/app programmingschool-backend php create_tables.php
   ```
3. サーバーを起動します。
   ```bash
   docker run -p 5050:5050 -v $(pwd):/app programmingschool-backend
   ```

API は `http://localhost:5050/api/...` で利用できます。
