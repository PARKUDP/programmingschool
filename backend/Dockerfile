FROM php:8.2-cli
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . /app
CMD ["php", "-S", "0.0.0.0:5050", "index.php"]
