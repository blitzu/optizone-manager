
/**
 * Server API Express pentru Optizone Fleet Manager
 * 
 * Acest server va gestiona cererile SSH și alte funcționalități de backend
 * Pentru a-l rula:
 * - npm install express cors nodemon ssh2
 * - node server/api.js (sau nodemon server/api.js pentru dezvoltare)
 */

const express = require('express');
const cors = require('cors');
const { Client } = require('ssh2');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint pentru testarea conexiunii SSH
app.post('/api/test-connection', (req, res) => {
  const { ip, sshUsername, sshPassword } = req.body;
  
  if (!ip || !sshUsername || !sshPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Lipsesc date necesare conexiunii SSH' 
    });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log(`Conexiune reușită la ${ip}`);
    conn.end();
    res.json({ 
      success: true, 
      message: `Conexiune SSH reușită la ${req.body.hostname} (${ip})` 
    });
  }).on('error', (err) => {
    console.error(`Eroare la conexiunea SSH către ${ip}:`, err);
    res.json({ 
      success: false, 
      message: `Conexiunea SSH a eșuat: ${err.message}` 
    });
  }).connect({
    host: ip,
    port: 22, // Portul SSH standard
    username: sshUsername,
    password: sshPassword,
    // Opțional, pentru servere care nu au certificate cunoscute
    readyTimeout: 5000,
    tryKeyboard: true,
  });
});

// Endpoint pentru obținerea log-urilor
app.post('/api/logs', (req, res) => {
  const { machineId, startDate, endDate, liveMode } = req.body;
  
  // În implementarea reală ar trebui să obținem mașina din baza de date
  // În acest exemplu, vom simula obținerea mașinii din localStorage de pe client
  // Într-un mediu real, ar trebui să stocăm mașinile într-o bază de date
  
  // Creăm o nouă conexiune SSH
  const conn = new Client();
  
  // Comanda pentru a obține log-uri
  // În funcție de tipul de server și log-uri dorite, comanda poate fi diferită
  let command = 'journalctl -n 100';
  
  if (startDate && endDate) {
    // Formatăm datele pentru a fi utilizate în comanda journalctl
    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();
    command = `journalctl --since="${start}" --until="${end}" -o json`;
  } else if (liveMode) {
    command = 'journalctl -f -n 30 -o json';
  }
  
  let logs = [];
  
  conn.on('ready', () => {
    conn.exec(command, (err, stream) => {
      if (err) {
        conn.end();
        return res.status(500).json({ error: `Eroare la executarea comenzii: ${err.message}` });
      }
      
      stream.on('data', (data) => {
        // Parsăm output-ul
        const output = data.toString();
        
        try {
          // Încercăm să parsăm fiecare linie ca JSON (format journalctl -o json)
          const lines = output.trim().split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const logEntry = JSON.parse(line);
                
                // Transformăm în formatul nostru
                logs.push({
                  timestamp: new Date(logEntry.__REALTIME_TIMESTAMP / 1000).toISOString(),
                  level: determineLogLevel(logEntry.PRIORITY),
                  message: logEntry.MESSAGE
                });
              } catch (e) {
                // Dacă nu este JSON valid, adăugăm ca text simplu
                logs.push({
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  message: line
                });
              }
            }
          }
        } catch (parseError) {
          // Dacă avem erori de parsare, adăugăm output-ul brut
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: output
          });
        }
      });
      
      stream.on('end', () => {
        conn.end();
        res.json(logs);
      });
      
      stream.on('error', (streamErr) => {
        conn.end();
        res.status(500).json({ error: `Eroare în stream: ${streamErr.message}` });
      });
    });
  }).on('error', (err) => {
    console.error('Eroare la conexiunea SSH:', err);
    res.status(500).json({ error: `Eroare la conexiunea SSH: ${err.message}` });
  }).connect({
    // Aceste date trebuie obținute în mod corect. Ar trebui stocate în baza de date.
    // Aici este doar un exemplu
    host: req.body.ip || '192.168.1.100',
    port: 22,
    username: req.body.sshUsername || 'gts',
    password: req.body.sshPassword || '1qaz2wsx'
  });
});

// Funcție pentru a determina nivelul log-ului bazat pe prioritatea syslog
function determineLogLevel(priority) {
  // Prioritățile syslog: 0=Emergency, 1=Alert, 2=Critical, 3=Error, 4=Warning, 5=Notice, 6=Info, 7=Debug
  switch (parseInt(priority)) {
    case 0:
    case 1:
    case 2:
    case 3:
      return 'error';
    case 4:
      return 'warning';
    case 6:
      return 'info';
    case 7:
      return 'debug';
    default:
      return 'info';
  }
}

// Pornirea serverului
app.listen(PORT, () => {
  console.log(`API Server pentru Optizone Fleet Manager rulează pe portul ${PORT}`);
});
