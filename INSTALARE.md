
# Instrucțiuni de instalare Optizone Fleet Manager

Acest document conține instrucțiuni pas cu pas pentru instalarea, configurarea și rularea aplicației Optizone Fleet Manager, atât în mediul de dezvoltare, cât și în producție.

## Cerințe preliminare

Înainte de a începe instalarea, asigurați-vă că aveți instalate următoarele:

1. **Node.js** (versiunea 16 sau mai nouă) - [Descărcare și instalare Node.js](https://nodejs.org/)
2. **npm** (versiunea 7 sau mai nouă) - vine împreună cu Node.js
3. **Git** - pentru clonarea repository-ului (opțional)

Puteți verifica versiunile instalate folosind următoarele comenzi în terminal:
```bash
node -v
npm -v
```

## Pasul 1: Obținerea codului sursă

### Opțiunea A: Clonare din repository Git (dacă aveți acces)
```bash
git clone <URL_REPOSITORY_GIT>
cd optizone-fleet-manager
```

### Opțiunea B: Descărcarea directă a arhivei proiectului
1. Descărcați arhiva proiectului (.zip)
2. Extrageți conținutul într-un director
3. Deschideți un terminal și navigați la directorul proiectului

## Pasul 2: Instalarea dependențelor

### Instalarea dependențelor pentru aplicația client (frontend)

```bash
# În directorul principal al proiectului
npm install
```

### Instalarea dependențelor pentru serverul API (backend)

```bash
# Navigați în directorul server
cd server
npm install
# Reveniți la directorul principal
cd ..
```

## Pasul 3: Configurarea aplicației

Aplicația folosește configurații diferite pentru mediile de dezvoltare și producție. Aceste configurări sunt în fișierul `src/config/appConfig.ts`.

Dacă doriți să modificați configurările implicite (cum ar fi porturile sau credențialele SSH implicite), editați acest fișier.

## Pasul 4: Rularea aplicației în mediul de dezvoltare

### Pornirea serverului API

```bash
# Deschideți un terminal în directorul server
cd server
npm run dev
```

Serverul API va rula pe portul 3001 (implicit). Veți vedea un mesaj de confirmare în terminal.

### Pornirea aplicației client

```bash
# Deschideți un nou terminal în directorul principal al proiectului
npm run dev
```

Aplicația client va rula pe portul 8080 (implicit). Veți vedea un mesaj de confirmare în terminal.

### Accesarea aplicației în mediul de dezvoltare

Acum puteți accesa aplicația în browser la una din următoarele adrese:
- `http://localhost:8080` - pentru acces local
- `http://IP_LOCAL:8080` - pentru acces din rețeaua locală, unde IP_LOCAL este adresa IP a computerului pe care rulează aplicația

Pentru a afla adresa IP locală a computerului:
- **Windows**: Deschideți Command Prompt și rulați `ipconfig`
- **macOS/Linux**: Deschideți Terminal și rulați `ifconfig` sau `ip addr`

## Pasul 5: Construirea aplicației pentru producție

Când sunteți gata să implementați aplicația în producție, urmați acești pași:

### Construirea aplicației client

```bash
# În directorul principal al proiectului
npm run build
```

Acest proces va crea un director `dist` cu fișierele optimizate pentru producție.

### Configurarea serverului pentru producție

Editați fișierul `server/api.js` dacă doriți să modificați portul pe care va rula serverul în producție (implicit 3001).

## Pasul 6: Rularea aplicației în mediul de producție

### Pornirea serverului API în modul producție

```bash
# În directorul server
NODE_ENV=production node api.js
```

Sau, pentru utilizatorii Windows:
```bash
set NODE_ENV=production
node api.js
```

### Configurarea unui manager de procese pentru producție (recomandat)

Pentru o stabilitate mai bună în producție, recomandăm utilizarea PM2:

```bash
# Instalați PM2 global
npm install -g pm2

# Pornirea serverului cu PM2
cd server
pm2 start api.js --name "optizone-fleet-manager" -- NODE_ENV=production

# Configurați PM2 pentru a porni automat la repornirea sistemului
pm2 startup
pm2 save
```

## Pasul 7: Configurarea accesului prin IP local

### Opțiunea A: Acces direct la serverul API

Serverul API servește atât API-ul, cât și fișierele statice ale aplicației în modul producție. Puteți accesa aplicația direct la:

```
http://IP_LOCAL:3001
```

Unde `IP_LOCAL` este adresa IP a serverului.

### Opțiunea B: Configurarea unui server web (recomandat pentru producție)

Pentru producție, recomandăm configurarea unui server web precum Nginx:

1. Instalați Nginx:
   ```bash
   # Pentru Ubuntu/Debian
   sudo apt update
   sudo apt install nginx
   ```

2. Creați un fișier de configurare pentru aplicație:
   ```bash
   sudo nano /etc/nginx/sites-available/optizone
   ```

3. Adăugați următoarea configurare (înlocuiți IP_SERVER cu adresa IP locală):
   ```nginx
   server {
       listen 80;
       server_name IP_LOCAL;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Activați configurația și reporniți Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/optizone /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Acum puteți accesa aplicația la:
   ```
   http://IP_LOCAL
   ```

## Depanare și probleme cunoscute

### Probleme la pornirea aplicației
- Verificați dacă porturile 3001 și 8080 nu sunt deja utilizate de alte aplicații.
- Verificați logurile pentru erori în consolă.
- Asigurați-vă că toate dependențele au fost instalate corect.

### Probleme de conexiune SSH
- Verificați dacă credențialele SSH sunt corecte.
- Asigurați-vă că serverul SSH este pornit și accesibil.
- Verificați dacă există reguli de firewall care blochează portul 22.

### Pagină albă în browser
- Verificați consola browser-ului pentru erori (apăsați F12).
- Asigurați-vă că serverul API rulează.
- Încercați să ștergeți cache-ul browserului.

## Autentificare în aplicație

Utilizați următoarele credențiale pentru a vă autentifica:
- Utilizator: admin
- Parolă: admin

## Suport

Pentru suport tehnic, contactați echipa de dezvoltare la support@optizone.com.
