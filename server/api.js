
/**
 * Server API Express pentru Optizone Fleet Manager
 * 
 * Acest server gestionează cererile SSH și alte funcționalități de backend
 * Pentru a-l rula:
 * - npm install
 * - node api.js (sau folosiți un manager de procese precum PM2)
 */

const express = require('express');
const cors = require('cors');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Servim fișierele statice ale aplicației în producție
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

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
    port: 22,
    username: sshUsername,
    password: sshPassword,
    readyTimeout: 5000,
    tryKeyboard: true,
  });
});

// Endpoint pentru obținerea log-urilor
app.post('/api/logs', (req, res) => {
  const { ip, sshUsername, sshPassword, startDate, endDate, liveMode } = req.body;
  
  if (!ip || !sshUsername || !sshPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Lipsesc date necesare conexiunii SSH' 
    });
  }
  
  const conn = new Client();
  
  // Comanda pentru a obține log-uri
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
    host: ip,
    port: 22,
    username: sshUsername,
    password: sshPassword
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

// În producție, servim aplicația React pentru orice alte rute
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Pornirea serverului
app.listen(PORT, () => {
  console.log(`API Server pentru Optizone Fleet Manager rulează pe portul ${PORT}`);
});
