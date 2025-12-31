FROM php:8.2-apache

# Install dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    python3 \
    default-mysql-client \
    && docker-php-ext-install pdo pdo_mysql mysqli \
    && pecl install apcu \
    && docker-php-ext-enable apcu \
    && rm -rf /var/lib/apt/lists/*

# Apache optimization for high concurrency
# php:8.2-apache uses mod_php which requires mpm_prefork
RUN a2enmod rewrite headers deflate

# Copy Apache VirtualHost configuration
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf
RUN a2ensite 000-default

# Enable AllowOverride
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Optimize Apache MPM Prefork for 100+ concurrent users
RUN echo '<IfModule mpm_prefork_module>\n\
    StartServers             10\n\
    MinSpareServers          10\n\
    MaxSpareServers          30\n\
    MaxRequestWorkers        250\n\
    MaxConnectionsPerChild   1000\n\
</IfModule>' > /etc/apache2/mods-available/mpm_prefork.conf

# PHP performance settings
RUN echo 'memory_limit = 256M\n\
max_execution_time = 60\n\
max_input_time = 60\n\
post_max_size = 20M\n\
upload_max_filesize = 20M\n\
opcache.enable=1\n\
opcache.memory_consumption=128\n\
opcache.interned_strings_buffer=8\n\
opcache.max_accelerated_files=10000\n\
opcache.revalidate_freq=2\n\
apc.enabled=1\n\
apc.shm_size=64M' > /usr/local/etc/php/conf.d/performance.ini

WORKDIR /var/www/html
COPY . /var/www/html
EXPOSE 80
CMD ["apache2-foreground"]
