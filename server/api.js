
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

// Endpoint pentru executarea comenzilor SSH
app.post('/api/execute-command', (req, res) => {
  const { ip, sshUsername, sshPassword, command } = req.body;
  
  if (!ip || !sshUsername || !sshPassword || !command) {
    return res.status(400).json({ 
      success: false, 
      output: 'Lipsesc date necesare pentru executarea comenzii' 
    });
  }
  
  const conn = new Client();
  let commandOutput = '';
  
  conn.on('ready', () => {
    console.log(`Conexiune SSH stabilită pentru executarea comenzii la ${ip}`);
    
    conn.exec(command, (err, stream) => {
      if (err) {
        conn.end();
        return res.status(500).json({ 
          success: false, 
          output: `Eroare la executarea comenzii: ${err.message}` 
        });
      }
      
      stream.on('data', (data) => {
        commandOutput += data.toString();
      });
      
      stream.stderr.on('data', (data) => {
        commandOutput += data.toString();
      });
      
      stream.on('close', (code) => {
        conn.end();
        res.json({ 
          success: code === 0, 
          output: commandOutput 
        });
      });
      
      stream.on('error', (streamErr) => {
        conn.end();
        res.status(500).json({ 
          success: false, 
          output: `Eroare în stream: ${streamErr.message}` 
        });
      });
    });
  }).on('error', (err) => {
    console.error(`Eroare la conexiunea SSH către ${ip}:`, err);
    res.status(500).json({ 
      success: false, 
      output: `Eroare la conexiunea SSH: ${err.message}` 
    });
  }).connect({
    host: ip,
    port: 22,
    username: sshUsername,
    password: sshPassword,
    readyTimeout: 10000,
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
    command = `journalctl -a -n 1000 -u ${appName} -S "${start}" -U "${end}" --output=cat`;
    console.log(`Executare comandă de filtrare după dată: ${command}`);
  } else if (liveMode) {
    // Folosim comanda live specificată în script, cu output=cat pentru a evita prefixele journalctl
    command = `journalctl -a -n 2000 -f -u ${appName} --output=cat`;
    console.log(`Executare comandă live: ${command}`);
  } else {
    // Comandă implicită pentru ultimele log-uri
    command = `journalctl -a -n 1000 -u ${appName} --output=cat`;
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
      // Formate posibile de log-uri conform exemplelor din MobaXterm
      
      // Format 1: [EE][25-03-13 14:17:37][MQ][HE] 17109: ['gema', None, None, None]
      const eeBracketRegex = /\[EE\]\[([0-9-]+\s+[0-9:]+)\]\[([^\]]+)\]\[([^\]]+)\]\s+(.*)/;
      
      // Format 2: Mar 13 14:17:30 gema sh[2702]: 16  live       CVP-11-1     0.1   0.0  6.6   10/10   3.6     0   -1   -1   -1   -1   -1   -1   -1
      const marLogRegex = /(Mar\s+\d+\s+\d+:\d+:\d+)\s+(\w+)\s+(\w+)\[(\d+)\]:\s+(.*)/;
      
      // Format 3: [DCT:VIST-LPR-OUT-1] Log reader thread joined gracefully.
      const componentBracketRegex = /\[([^\]]+)\]\s+(.*)/;
      
      let match;
      let timestamp, level, component, message;
      
      // Încercăm să detectăm formatele cunoscute
      if (trimmedLine.startsWith('[EE]')) {
        // Log-uri de tip [EE]
        match = eeBracketRegex.exec(trimmedLine);
        
        if (match) {
          timestamp = match[1];
          component = `${match[2]}:${match[3]}`;
          message = match[4];
          level = "error"; // [EE] reprezintă erori
          
          logs.push({
            timestamp: convertToISODate(timestamp),
            level: level,
            message: message,
            syslogIdentifier: component,
            originalLine: trimmedLine // Păstrăm linia originală pentru debugging
          });
          continue;
        }
      } else if (trimmedLine.match(/^Mar\s+\d+\s+\d+:\d+:\d+/)) {
        // Log-uri cu prefix Mar 13 14:17:30
        match = marLogRegex.exec(trimmedLine);
        
        if (match) {
          timestamp = match[1];
          const app = match[2];
          component = match[3];
          const pid = match[4];
          message = match[5];
          
          // Determinare nivel de log bazat pe conținut
          if (message.includes('error') || message.includes('fail') || message.includes('invalid')) {
            level = 'error';
          } else if (message.includes('warning') || message.includes('warn')) {
            level = 'warning';
          } else if (message.includes('debug')) {
            level = 'debug';
          } else {
            level = 'info';
          }
          
          logs.push({
            timestamp: convertToISODate(timestamp, false, true),
            level: level,
            message: message,
            syslogIdentifier: `${component}[${pid}]`,
            originalLine: trimmedLine // Păstrăm linia originală pentru debugging
          });
          continue;
        }
      } else if (trimmedLine.match(/^\[.*?\]/)) {
        // Log-uri cu componenta în brackets
        match = componentBracketRegex.exec(trimmedLine);
        
        if (match) {
          component = match[1];
          message = match[2];
          timestamp = new Date().toISOString();
          
          // Determinare nivel de log bazat pe componenta
          if (component.includes('ERROR') || component.includes('FATAL')) {
            level = 'error';
          } else if (component.includes('WARN')) {
            level = 'warning';
          } else if (component.includes('DEBUG')) {
            level = 'debug';
          } else {
            level = 'info';
          }
          
          logs.push({
            timestamp: timestamp,
            level: level,
            message: message,
            syslogIdentifier: component,
            originalLine: trimmedLine
          });
          continue;
        }
      }
      
      // Dacă nu am putut identifica formatul, folosim un format implicit
      logs.push({
        timestamp: new Date().toISOString(),
        level: determineLogLevel(trimmedLine),
        message: trimmedLine,
        syslogIdentifier: "system",
        originalLine: trimmedLine
      });
    } catch (e) {
      console.error("Eroare la procesarea unei linii de log:", e);
      // Dacă avem erori de parsare, adăugăm linia brută
      logs.push({
        timestamp: new Date().toISOString(),
        level: "info",
        message: trimmedLine,
        syslogIdentifier: "system",
        originalLine: trimmedLine
      });
    }
  }
  
  return logs;
}

// Funcție pentru a determina nivelul de log pe baza conținutului
function determineLogLevel(logLine) {
  logLine = logLine.toLowerCase();
  
  if (logLine.includes('error') || logLine.includes('fail') || logLine.includes('fatal') || 
      logLine.startsWith('[ee]') || logLine.includes('exception')) {
    return 'error';
  }
  
  if (logLine.includes('warn') || logLine.includes('warning')) {
    return 'warning';
  }
  
  if (logLine.includes('debug') || logLine.includes('trace')) {
    return 'debug';
  }
  
  return 'info';
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
