FROM php:8.2-apache
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
RUN a2enmod rewrite
RUN a2enmod headers

# Copy Apache VirtualHost configuration
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf
RUN a2ensite 000-default

# Enable AllowOverride
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

WORKDIR /var/www/html
COPY . /var/www/html
EXPOSE 80
CMD ["apache2-foreground"]
