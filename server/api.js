
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
  const { ip, sshUsername, sshPassword, startDate, endDate, liveMode, applicationName } = req.body;
  
  if (!ip || !sshUsername || !sshPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Lipsesc date necesare conexiunii SSH' 
    });
  }
  
  const conn = new Client();
  const appName = applicationName || 'aixp_ee';
  
  // Comandă pentru obținerea log-urilor conform scriptului furnizat
  let command = '';
  
  if (startDate && endDate) {
    // Formatăm datele pentru a fi utilizate în comanda journalctl
    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();
    
    // Folosim formatul specificat în script
    command = `journalctl -a -n 1000 -u ${appName} -S "${start}" -U "${end}"`;
    console.log(`Executare comandă de filtrare după dată: ${command}`);
  } else if (liveMode) {
    // Folosim comanda live specificată în script
    command = `journalctl -a -n 2000 -f -u ${appName}`;
    console.log(`Executare comandă live: ${command}`);
  } else {
    // Comandă implicită pentru ultimele log-uri
    command = `journalctl -a -n 1000 -u ${appName}`;
    console.log(`Executare comandă implicită: ${command}`);
  }
  
  let logs = [];
  let rawLogs = '';
  
  conn.on('ready', () => {
    conn.exec(command, (err, stream) => {
      if (err) {
        conn.end();
        return res.status(500).json({ error: `Eroare la executarea comenzii: ${err.message}` });
      }
      
      if (liveMode) {
        // Pentru mod live, setăm timeout pentru a închide conexiunea după un timp
        // Clientul va reîncerca periodic pentru actualizări
        setTimeout(() => {
          try {
            stream.close();
            conn.end();
          } catch (e) {
            console.error("Eroare la închiderea stream-ului:", e);
          }
          
          // Procesăm log-urile brute și le trimitem
          logs = processRawLogs(rawLogs);
          res.json(logs);
        }, 10000); // 10 secunde pentru a obține date în modul live
      }
      
      stream.on('data', (data) => {
        // Acumulăm date brute
        rawLogs += data.toString();
      });
      
      if (!liveMode) {
        // Doar pentru mod non-live, încheiem la end
        stream.on('end', () => {
          conn.end();
          
          // Procesăm log-urile brute și le trimitem
          logs = processRawLogs(rawLogs);
          res.json(logs);
        });
      }
      
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

// Funcție pentru a procesa log-urile brute în format structurat
function processRawLogs(rawLogs) {
  const logs = [];
  
  if (!rawLogs || rawLogs.trim() === '') {
    return logs;
  }
  
  const lines = rawLogs.trim().split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === '') continue;
    
    try {
      // Pattern pentru log-uri conform imaginii de referință
      // Ex: [EE][25-03-13 13:27:23][MAIN] 'gema' v4.1.60/7.6.19/2.6.26 hb:9026 itr 383903 (0 void), Hz: 3.7/5, 25.2 hrs, New.pl.: 0, cpu 10.4%, ram(EE) 10.7(6.5)/31.0 GB, cuda:0 30.9%, mem 1.9/7.8GB, 56°C, gpu fan 41%
      // sau: [13.03.2025 13:24:49] [INFO] [sh] - GPU 0 load 0%, memory load 2.0, fan speed: System is not in ready state%
      
      // Verificăm diferite formate posibile
      let timestamp, level, component, message;
      
      // Format 1: [EE][25-03-13 13:27:23][MAIN] mesaj
      const format1Regex = /\[([A-Z]+)\]\[([0-9-]+\s+[0-9:]+)\]\[([^\]]+)\]\s+(.*)/;
      // Format 2: [13.03.2025 13:24:49] [INFO] [sh] mesaj
      const format2Regex = /\[([0-9.]+\s+[0-9:]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)/;
      // Format 3: Mar 13 13:27:33 gema sh[2702]: 0 BB00LZR 2025-03-13 13:22:17 ... (tabel)
      const format3Regex = /(Mar\s+\d+\s+\d+:\d+:\d+)\s+(\w+)\s+(\w+)\[(\d+)\]:\s+(.*)/;
      
      let match = format1Regex.exec(trimmedLine);
      
      if (match) {
        // Format 1
        level = match[1];
        timestamp = match[2];
        component = match[3];
        message = match[4];
        
        logs.push({
          timestamp: convertToISODate(timestamp),
          level: mapLogLevel(level),
          message: `[${component}] ${message}`,
          syslogIdentifier: component
        });
        continue;
      }
      
      match = format2Regex.exec(trimmedLine);
      
      if (match) {
        // Format 2
        timestamp = match[1];
        level = match[2];
        component = match[3];
        message = match[4] || '';
        
        logs.push({
          timestamp: convertToISODate(timestamp, true),
          level: mapLogLevel(level),
          message: `[${component}] ${message}`,
          syslogIdentifier: component
        });
        continue;
      }
      
      match = format3Regex.exec(trimmedLine);
      
      if (match) {
        // Format 3 (tabel)
        timestamp = match[1];
        const app = match[2];
        component = match[3];
        const pid = match[4];
        message = match[5];
        
        logs.push({
          timestamp: convertToISODate(timestamp, false, true),
          level: "info",
          message: `[${app}][${component}:${pid}] ${message}`,
          syslogIdentifier: component
        });
        continue;
      }
      
      // Dacă nu se potrivește cu niciunul dintre formatele cunoscute, adăugăm ca mesaj simplu
      logs.push({
        timestamp: new Date().toISOString(),
        level: "info",
        message: trimmedLine,
        syslogIdentifier: "system"
      });
    } catch (e) {
      console.error("Eroare la procesarea unei linii de log:", e);
      // Dacă avem erori de parsare, adăugăm linia brută
      logs.push({
        timestamp: new Date().toISOString(),
        level: "info",
        message: trimmedLine,
        syslogIdentifier: "system"
      });
    }
  }
  
  return logs;
}

// Funcție pentru a converti diverse formate de dată în ISO
function convertToISODate(dateString, isFormat2 = false, isFormat3 = false) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    
    if (isFormat2) {
      // Format: 13.03.2025 13:24:49
      const [datePart, timePart] = dateString.split(' ');
      const [day, month, yearPart] = datePart.split('.');
      
      return new Date(`${yearPart}-${month}-${day}T${timePart}`).toISOString();
    } else if (isFormat3) {
      // Format: Mar 13 13:27:33
      const parts = dateString.split(' ');
      const month = getMonthNumber(parts[0]);
      const day = parts[1];
      const time = parts[2];
      
      return new Date(`${year}-${month}-${day}T${time}`).toISOString();
    } else {
      // Format: 25-03-13 13:27:23
      const [datePart, timePart] = dateString.split(' ');
      const [yy, mm, dd] = datePart.split('-');
      
      // Presupunem că yy este anul curent dacă are doar 2 cifre
      const fullYear = yy.length === 2 ? `20${yy}` : yy;
      
      return new Date(`${fullYear}-${mm}-${dd}T${timePart}`).toISOString();
    }
  } catch (e) {
    console.error("Eroare la conversia datei:", e, dateString);
    return new Date().toISOString();
  }
}

// Funcție pentru a obține numărul lunii din numele abreviat
function getMonthNumber(monthName) {
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  return months[monthName] || '01';
}

// Funcție pentru a determina nivelul log-ului
function mapLogLevel(level) {
  level = level.toUpperCase();
  
  if (level === 'ERROR' || level === 'ERR' || level === 'FATAL' || level === 'EE') {
    return 'error';
  } else if (level === 'WARN' || level === 'WARNING') {
    return 'warning';
  } else if (level === 'DEBUG' || level === 'TRACE' || level === 'VERBOSE') {
    return 'debug';
  } else {
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
