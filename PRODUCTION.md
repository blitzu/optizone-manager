
# Ghid de implementare în producție pentru Optizone Fleet Manager

## Cerințe sistem
- Node.js 16 sau mai nou
- npm 7 sau mai nou

## Pasul 1: Construirea aplicației

```bash
# Instalează dependențele
npm install

# Construiește aplicația pentru producție
npm run build
```

După construire, directorul `dist` va conține fișierele statice ale aplicației.

## Pasul 2: Configurarea serverului API

```bash
# Navighează la directorul server
cd server

# Instalează dependențele serverului
npm install

# Pornește serverul API (pentru testare)
npm start
```

Pentru producție, este recomandat să folosești un manager de procese precum PM2:

```bash
# Instalează PM2 global
npm install -g pm2

# Pornește serverul cu PM2
pm2 start api.js --name "optizone-api"
```

## Pasul 3: Configurarea serverului web (Nginx recomandat)

### Configurare Nginx

Creează un fișier de configurare Nginx (de exemplu, `/etc/nginx/sites-available/optizone`):

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Înlocuiește cu domeniul tău

    # Servește fișierele statice ale aplicației
    location / {
        root /path/to/your/app/dist;  # Înlocuiește cu calea corectă
        try_files $uri $uri/ /index.html;
    }

    # Proxy pentru API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activează configurația și repornește Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/optizone /etc/nginx/sites-enabled/
sudo nginx -t  # Verifică configurația
sudo systemctl restart nginx
```

## Pasul 4: Configurarea HTTPS (recomandat pentru producție)

Pentru a configura HTTPS, poți folosi Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Configurare avansată și optimizări

### Configurare PM2 pentru repornire automată

```bash
pm2 startup
pm2 save
```

### Actualizarea aplicației

Pentru a actualiza aplicația în producție:

1. Trage ultimele modificări din repository
2. Reconstruiește aplicația: `npm run build`
3. Copiază noile fișiere în directorul de servire
4. Repornește serverul API dacă este necesar: `pm2 restart optizone-api`

## Notă de securitate

Este esențial să securizați credențialele SSH pentru producție. Metoda actuală este doar pentru demonstrație și nu este recomandată pentru utilizare în medii de producție reale.
