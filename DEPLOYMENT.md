# Deployment Guide (VPS / Hostinger)

## 1) Server prerequisites
- Ubuntu 22.04+ (or similar Linux VPS)
- Node.js 20 LTS
- npm
- PM2 (recommended process manager)
- Nginx (recommended reverse proxy)

Install essentials:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm i -g pm2
```

## 2) Upload project
```bash
git clone <your-repo-url>
cd cookie-editor
npm install
cp .env.example .env
```

Edit `.env`:
```env
NEWS_API_KEY=your_newsapi_key_here
PORT=3000
NODE_ENV=production
```

## 3) Run with PM2
```bash
pm2 start npm --name pulsebrief -- start
pm2 save
pm2 startup
```

## 4) Configure Nginx
Create `/etc/nginx/sites-available/pulsebrief`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/pulsebrief /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5) SSL (recommended)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 6) Monitoring
```bash
pm2 logs pulsebrief
pm2 status
curl http://127.0.0.1:3000/health
```

## Hostinger note
For Hostinger VPS, same steps apply. For shared hosting without Node process support, deploy to VPS plan or use Hostinger Node-enabled service.
