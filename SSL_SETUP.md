# 🔒 SSL Setup для richislav.com

## Подготовка

### 1. Настроить DNS в Cloudflare

В панели Cloudflare для домена `richislav.com`:

**Отключите прокси Cloudflare (облачко должно быть серым):**
```
Type: A
Name: richislav.com (или @)
Content: 78.153.136.193
Proxy status: DNS only (серое облачко, НЕ оранжевое)
TTL: Auto

Type: A  
Name: www
Content: 78.153.136.193
Proxy status: DNS only (серое облачко)
TTL: Auto
```

**Важно:** Оранжевое облачко (прокси) заблокирует получение SSL сертификата!

### 2. Проверить что домен указывает на сервер

```bash
# Проверить DNS
dig richislav.com +short
nslookup richislav.com

# Должно вернуть: 78.153.136.193
```

### 3. Открыть порт 443

```bash
sudo ufw allow 443/tcp
```

## Установка SSL

### На сервере выполните:

```bash
cd ~/bla

# 1. Подтянуть последние изменения
git pull

# 2. Обновить .env
nano .env
# Установите:
# DOMAIN=richislav.com
# LIVEKIT_PUBLIC_URL=wss://richislav.com:7880

# 3. Запустить скрипт установки SSL
sudo ./scripts/setup-ssl.sh
```

Скрипт автоматически:
- ✅ Установит certbot
- ✅ Получит SSL сертификат от Let's Encrypt
- ✅ Скопирует сертификаты в `config/ssl/`
- ✅ Обновит `.env`
- ✅ Перезапустит сервисы с SSL

## После установки

### Проверить что сайт работает:

```bash
# Проверить HTTPS
curl -I https://richislav.com

# Проверить редирект с HTTP
curl -I http://richislav.com

# Проверить статус
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs nginx --tail=20
```

### Открыть в браузере:

```
https://richislav.com
```

Теперь камера и микрофон должны работать! 🎉

## Auto-renewal сертификата

SSL сертификат действует 90 дней. Настроить автоматическое обновление:

```bash
# Открыть crontab
crontab -e

# Добавить строку (обновление каждый день в 3:00):
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/richislav.com/*.pem /root/bla/config/ssl/ && docker compose -f /root/bla/docker-compose.prod.yml restart nginx
```

## Troubleshooting

### Ошибка "Failed to obtain SSL certificate"

**Причина:** Certbot не может получить доступ к домену.

**Решения:**
1. Проверьте что домен указывает на сервер: `dig richislav.com`
2. Проверьте что порт 80 открыт: `sudo ufw status`
3. Убедитесь что Cloudflare proxy отключен (серое облачко)
4. Подождите 5-10 минут после изменения DNS

### Ошибка "nginx: [emerg] cannot load certificate"

**Причина:** Сертификаты не скопированы.

**Решение:**
```bash
sudo cp /etc/letsencrypt/live/richislav.com/fullchain.pem config/ssl/
sudo cp /etc/letsencrypt/live/richislav.com/privkey.pem config/ssl/
docker compose -f docker-compose.prod.yml restart nginx
```

### WebSocket ошибка подключения к LiveKit

**Причина:** LiveKit недоступен через wss://

**Решение:**
```bash
# Проверить что порт 7880 открыт для TCP
sudo ufw allow 7880/tcp

# Проверить логи LiveKit
docker compose -f docker-compose.prod.yml logs livekit --tail=50

# Проверить .env
cat .env | grep LIVEKIT_PUBLIC_URL
# Должно быть: LIVEKIT_PUBLIC_URL=wss://richislav.com:7880
```

## Если используете Cloudflare Proxy (оранжевое облачко)

Если хотите использовать прокси Cloudflare:

1. В Cloudflare: SSL/TLS → Overview → Full (strict)
2. Получить Origin Certificate в Cloudflare
3. Использовать Origin Certificate вместо Let's Encrypt
4. Настроить WebSocket в Cloudflare: Network → WebSockets: ON

**Внимание:** С прокси Cloudflare могут быть проблемы с WebRTC!
