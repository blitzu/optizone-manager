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
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Secret pentru JWT
const JWT_SECRET = process.env.JWT_SECRET || 'optizone-fleet-manager-secret-key';

// Path pentru fișierul cu utilizatori
const USERS_FILE_PATH = path.join(__dirname, 'users.json');
// Path pentru fișierul cu mașini
const MACHINES_FILE_PATH = path.join(__dirname, 'machines.json');

// Middleware
app.use(cors());
app.use(express.json());

// Servim fișierele statice ale aplicației în modul producție
console.log('Serving static files from:', path.join(__dirname, '../dist'));
app.use(express.static(path.join(__dirname, '../dist')));

// Funcție pentru a citi utilizatorii din fișier
function getUsers() {
  if (!fs.existsSync(USERS_FILE_PATH)) {
    // Inițializăm cu utilizatori impliciti dacă fișierul nu există
    const defaultUsers = [
      {
        id: "1",
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        role: "admin"
      },
      {
        id: "2",
        username: "user",
        password: bcrypt.hashSync("user123", 10),
        role: "user"
      }
    ];
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  
  const usersData = fs.readFileSync(USERS_FILE_PATH, 'utf8');
  return JSON.parse(usersData);
}

// Funcție pentru a salva utilizatorii în fișier
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
}

// Funcție pentru a citi mașinile din fișier
function getMachines() {
  if (!fs.existsSync(MACHINES_FILE_PATH)) {
    // Inițializăm cu un array gol dacă fișierul nu există
    fs.writeFileSync(MACHINES_FILE_PATH, JSON.stringify([], null, 2));
    return [];
  }
  
  const machinesData = fs.readFileSync(MACHINES_FILE_PATH, 'utf8');
  return JSON.parse(machinesData);
}

// Funcție pentru a salva mașinile în fișier
function saveMachines(machines) {
  fs.writeFileSync(MACHINES_FILE_PATH, JSON.stringify(machines, null, 2));
}

// Verifică autentificarea pentru rutele protejate
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autentificare lipsă' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token invalid sau expirat' });
    }
    
    req.user = user;
    next();
  });
}

// Verifică dacă utilizatorul este admin
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Permisiune refuzată. Rolul de administrator este necesar.' });
  }
  
  next();
}

// Endpoint pentru autentificare
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Numele de utilizator și parola sunt obligatorii' 
    });
  }
  
  const users = getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Nume de utilizator sau parolă incorecte' 
    });
  }
  
  // Verificare folosind bcrypt sau comparație directă dacă avem parole nehash-uite
  let passwordValid;
  if (user.password.startsWith('$2')) {
    // Parola este hash-uită cu bcrypt
    passwordValid = bcrypt.compareSync(password, user.password);
  } else {
    // Parola este în plain text (pentru compatibilitate)
    passwordValid = password === user.password;
  }
  
  if (!passwordValid) {
    return res.status(401).json({ 
      success: false, 
      message: 'Nume de utilizator sau parolă incorecte' 
    });
  }
  
  // Verificăm dacă utilizatorul trebuie să-și schimbe parola
  if (user.requirePasswordChange) {
    // Generăm un token temporar pentru schimbarea parolei
    const tempToken = crypto.randomBytes(20).toString('hex');
    
    // Actualizăm utilizatorul cu token-ul temporar
    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, tempToken } : u
    );
    
    saveUsers(updatedUsers);
    
    // Returnăm un răspuns special pentru schimbarea parolei
    return res.json({
      success: true,
      requirePasswordChange: true,
      tempToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  }
  
  // Generăm token-ul JWT pentru autentificare
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

// Endpoint pentru schimbare parolă temporară
app.post('/api/change-temp-password', (req, res) => {
  const { username, tempToken, newPassword } = req.body;
  
  if (!username || !tempToken || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Date incomplete pentru schimbarea parolei' 
    });
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.username === username && u.tempToken === tempToken);
  
  if (userIndex === -1) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token temporar invalid sau expirat' 
    });
  }
  
  // Actualizăm parola utilizatorului
  users[userIndex].password = bcrypt.hashSync(newPassword, 10);
  users[userIndex].requirePasswordChange = false;
  users[userIndex].tempToken = undefined; // Ștergem token-ul temporar
  
  saveUsers(users);
  
  // Generăm token-ul JWT pentru autentificare
  const token = jwt.sign(
    { id: users[userIndex].id, username: users[userIndex].username, role: users[userIndex].role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    success: true,
    token,
    message: 'Parola a fost schimbată cu succes'
  });
});

// Endpoint pentru verificarea autentificării
app.get('/api/verify-auth', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Endpoint pentru schimbarea parolei utilizatorului curent
app.post('/api/change-password', authenticateToken, (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  
  if (userId !== req.user.id) {
    return res.status(403).json({ 
      success: false, 
      message: 'Nu aveți permisiunea de a schimba parola altui utilizator' 
    });
  }
  
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'Utilizatorul nu a fost găsit' 
    });
  }
  
  // Verificare folosind bcrypt sau comparație directă
  let passwordValid;
  if (user.password.startsWith('$2')) {
    passwordValid = bcrypt.compareSync(oldPassword, user.password);
  } else {
    passwordValid = oldPassword === user.password;
  }
  
  if (!passwordValid) {
    return res.status(401).json({ 
      success: false, 
      message: 'Parola actuală este incorectă' 
    });
  }
  
  // Actualizăm parola
  const updatedUsers = users.map(u => 
    u.id === userId ? { ...u, password: bcrypt.hashSync(newPassword, 10) } : u
  );
  
  saveUsers(updatedUsers);
  
  res.json({
    success: true,
    message: 'Parola a fost schimbată cu succes'
  });
});

// Endpoint pentru obținerea tuturor utilizatorilor (doar admin)
app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
  const users = getUsers();
  
  // Returnăm utilizatorii fără parole
  const sanitizedUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    requirePasswordChange: !!u.requirePasswordChange
  }));
  
  res.json({
    success: true,
    users: sanitizedUsers
  });
});

// Endpoint pentru crearea unui utilizator nou (doar admin)
app.post('/api/users', authenticateToken, isAdmin, (req, res) => {
  const { username, password, role, requirePasswordChange = false } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nume de utilizator, parolă și rol sunt obligatorii' 
    });
  }
  
  const users = getUsers();
  
  // Verificăm dacă username-ul există deja
  if (users.some(u => u.username === username)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Numele de utilizator există deja' 
    });
  }
  
  // Generăm un ID nou
  const newId = Math.max(...users.map(u => parseInt(u.id)), 0) + 1;
  
  // Creăm utilizatorul nou
  const newUser = {
    id: newId.toString(),
    username,
    password: bcrypt.hashSync(password, 10),
    role,
    requirePasswordChange
  };
  
  // Adăugăm utilizatorul în lista
  users.push(newUser);
  saveUsers(users);
  
  res.json({
    success: true,
    message: 'Utilizatorul a fost creat cu succes',
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      requirePasswordChange: newUser.requirePasswordChange
    }
  });
});

// Endpoint pentru ștergerea unui utilizator (doar admin)
app.delete('/api/users/:id', authenticateToken, isAdmin, (req, res) => {
  const userId = req.params.id;
  
  // Admin-ul nu își poate șterge propriul cont
  if (userId === req.user.id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nu vă puteți șterge propriul cont' 
    });
  }
  
  const users = getUsers();
  const filteredUsers = users.filter(u => u.id !== userId);
  
  // Verificăm dacă utilizatorul a fost găsit și șters
  if (filteredUsers.length === users.length) {
    return res.status(404).json({ 
      success: false, 
      message: 'Utilizatorul nu a fost găsit' 
    });
  }
  
  saveUsers(filteredUsers);
  
  res.json({
    success: true,
    message: 'Utilizatorul a fost șters cu succes'
  });
});

// Endpoint pentru resetarea parolei unui utilizator (doar admin)
app.post('/api/users/:id/reset-password', authenticateToken, isAdmin, (req, res) => {
  const userId = req.params.id;
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Utilizatorul nu a fost găsit' 
    });
  }
  
  // Generăm o parolă temporară
  const temporaryPassword = crypto.randomBytes(4).toString('hex');
  
  // Actualizăm utilizatorul cu parola temporară
  users[userIndex].password = bcrypt.hashSync(temporaryPassword, 10);
  users[userIndex].requirePasswordChange = true;
  
  saveUsers(users);
  
  res.json({
    success: true,
    message: 'Parola a fost resetată cu succes',
    temporaryPassword
  });
});

// Endpoint pentru schimbarea parolei unui utilizator de către admin
app.post('/api/users/:id/change-password', authenticateToken, isAdmin, (req, res) => {
  const userId = req.params.id;
  const { newPassword, requirePasswordChange = false } = req.body;
  
  if (!newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Parola nouă este obligatorie' 
    });
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Utilizatorul nu a fost găsit' 
    });
  }
  
  // Actualizăm parola utilizatorului
  users[userIndex].password = bcrypt.hashSync(newPassword, 10);
  users[userIndex].requirePasswordChange = requirePasswordChange;
  
  saveUsers(users);
  
  res.json({
    success: true,
    message: 'Parola a fost schimbată cu succes'
  });
});

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
  let finalCommand = command;
  
  // Verificăm dacă comanda este de tip sudo și modificăm comanda pentru a utiliza parola SSH
  if (command.startsWith('sudo ') && sshPassword) {
    // Folosim echo pentru a trimite parola la stdin pentru comanda sudo
    finalCommand = `echo "${sshPassword}" | sudo -S ${command.substring(5)}`;
    console.log(`Comando sudo detectată și modificată pentru execuție automată cu parolă`);
  }
  
  conn.on('ready', () => {
    console.log(`Conexiune SSH stabilită pentru executarea comenzii la ${ip}`);
    
    conn.exec(finalCommand, (err, stream) => {
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

// Endpoint pentru obținerea tuturor mașinilor
app.get('/api/machines', authenticateToken, (req, res) => {
  try {
    const machines = getMachines();
    
    // Filtrăm mașinile în funcție de rolul utilizatorului
    let filteredMachines;
    if (req.user.role === 'admin') {
      // Administratorii văd toate mașinile
      filteredMachines = machines;
    } else {
      // Utilizatorii standard văd doar mașinile asociate cu ei sau fără proprietar
      filteredMachines = machines.filter(m => !m.userId || m.userId === req.user.id);
    }
    
    res.json({
      success: true,
      machines: filteredMachines
    });
  } catch (error) {
    console.error("Eroare la obținerea mașinilor:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la obținerea mașinilor"
    });
  }
});

// Endpoint pentru a adăuga o mașină nouă
app.post('/api/machines', authenticateToken, (req, res) => {
  try {
    const { ip, hostname, sshUsername, sshPassword } = req.body;
    
    if (!ip || !hostname) {
      return res.status(400).json({
        success: false,
        message: "IP-ul și hostname-ul sunt obligatorii"
      });
    }
    
    const machines = getMachines();
    
    // Verificăm dacă mașina cu acest IP sau hostname există deja
    if (machines.some(m => m.ip === ip)) {
      return res.status(400).json({
        success: false,
        message: "O mașină cu acest IP există deja"
      });
    }
    
    if (machines.some(m => m.hostname === hostname)) {
      return res.status(400).json({
        success: false,
        message: "O mașină cu acest hostname există deja"
      });
    }
    
    // Generăm un ID unic pentru mașină
    const id = crypto.randomUUID();
    
    // Creăm mașina nouă
    const newMachine = {
      id,
      ip,
      hostname,
      sshUsername,
      sshPassword,
      userId: req.user.id // Asociem mașina cu utilizatorul curent
    };
    
    // Adăugăm mașina în listă
    machines.push(newMachine);
    saveMachines(machines);
    
    res.json({
      success: true,
      message: "Mașina a fost adăugată cu succes",
      machine: newMachine
    });
  } catch (error) {
    console.error("Eroare la adăugarea mașinii:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la adăugarea mașinii"
    });
  }
});

// Endpoint pentru a actualiza o mașină existentă
app.put('/api/machines/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { ip, hostname, sshUsername, sshPassword } = req.body;
    
    if (!ip || !hostname) {
      return res.status(400).json({
        success: false,
        message: "IP-ul și hostname-ul sunt obligatorii"
      });
    }
    
    const machines = getMachines();
    
    // Găsim mașina după ID
    const machineIndex = machines.findIndex(m => m.id === id);
    
    if (machineIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Mașina nu a fost găsită"
      });
    }
    
    // Verificăm dacă utilizatorul are permisiunea să modifice mașina
    if (req.user.role !== 'admin' && machines[machineIndex].userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Nu aveți permisiunea de a modifica această mașină"
      });
    }
    
    // Verificăm dacă IP-ul sau hostname-ul actualizat există deja la altă mașină
    const otherMachines = machines.filter(m => m.id !== id);
    
    if (otherMachines.some(m => m.ip === ip)) {
      return res.status(400).json({
        success: false,
        message: "O altă mașină cu acest IP există deja"
      });
    }
    
    if (otherMachines.some(m => m.hostname === hostname)) {
      return res.status(400).json({
        success: false,
        message: "O altă mașină cu acest hostname există deja"
      });
    }
    
    // Actualizăm mașina
    const updatedMachine = {
      ...machines[machineIndex],
      ip,
      hostname,
      sshUsername,
      sshPassword
    };
    
    machines[machineIndex] = updatedMachine;
    saveMachines(machines);
    
    res.json({
      success: true,
      message: "Mașina a fost actualizată cu succes",
      machine: updatedMachine
    });
  } catch (error) {
    console.error("Eroare la actualizarea mașinii:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la actualizarea mașinii"
    });
  }
});

// Endpoint pentru a șterge o mașină
app.delete('/api/machines/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const machines = getMachines();
    
    // Găsim mașina după ID
    const machine = machines.find(m => m.id === id);
    
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: "Mașina nu a fost găsită"
      });
    }
    
    // Verificăm dacă utilizatorul are permisiunea să șteargă mașina
    if (req.user.role !== 'admin' && machine.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Nu aveți permisiunea de a șterge această mașină"
      });
    }
    
    // Ștergem mașina
    const updatedMachines = machines.filter(m => m.id !== id);
    saveMachines(updatedMachines);
    
    res.json({
      success: true,
      message: "Mașina a fost ștearsă cu succes"
    });
  } catch (error) {
    console.error("Eroare la ștergerea mașinii:", error);
    res.status(500).json({
      success: false,
      message: "Eroare la ștergerea mașinii"
    });
  }
});

// API fallback - toate cererile API care nu sunt prinse de rutele definite
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API Endpoint Not Found' });
});

// Funcție pentru a procesa log-urile brute în format structurat cu îmbunătățiri pentru formatarea MobaXterm
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
            originalLine: trimmedLine // Păstrăm linia originală pentru debugging și formatare
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
          
          // Îmbunătățit - determinăm nivelul de log pentru MobaXterm
          if (message.includes('ERROR') || message.includes('Error') || message.includes('error') || 
              message.includes('fail') || message.includes('FAIL') || message.includes('exception') ||
              message.includes('CRITICAL')) {
            level = 'error';
          } else if (message.includes('WARNING') || message.includes('Warning') || message.includes('warning') || 
                    message.includes('warn')) {
            level = 'warning';
          } else if (message.includes('DEBUG') || message.includes('Debug') || message.includes('debug')) {
            level = 'debug';
          } else {
            level = 'info';
          }
          
          logs.push({
            timestamp: convertToISODate(timestamp, false, true),
            level: level,
            message: message,
            syslogIdentifier: `${component}[${pid}]`,
            originalLine: trimmedLine // Păstrăm linia originală pentru debugging și formatare
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
          
          // Determinare nivel de log bazat pe componenta - mai precis pentru MobaXterm
          if (component.includes('ERROR') || component.includes('FATAL') || 
              (component.includes('MAIN') && message.includes('ERROR'))) {
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
      
      // Dacă nu am putut identifica formatul, folosim detectarea îmbunătățită 
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

// Funcție îmbunătățită pentru a determina nivelul de log pe baza conținutului
function determineLogLevel(logLine) {
  const originalLine = logLine.toLowerCase();
  
  // Pentru a matcha mai bine stilul de afișare al MobaXterm
  if (originalLine.includes('error') || originalLine.includes('fail') || originalLine.includes('fatal') || 
      originalLine.startsWith('[ee]') || originalLine.includes('exception') || 
      originalLine.includes('critical') || originalLine.includes('unable to') ||
      originalLine.includes('not found') && originalLine.includes('error')) {
    return 'error';
  }
  
  if (originalLine.includes('warn') || originalLine.includes('warning')) {
    return 'warning';
  }
  
  if (originalLine.includes('debug') || originalLine.includes('trace') || 
     (originalLine.includes('checking') && !originalLine.includes('error'))) {
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
// Această rută trebuie să fie ultimul middleware și acum este configurată doar pentru producție
app.get('*', (req, res) => {
  console.log(`Serving index.html for path: ${req.path}`);
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Pornirea serverului
app.listen(PORT, () => {
  console.log(`API Server pentru Optizone Fleet Manager rulează pe portul ${PORT}`);
  console.log(`Mode: production`);


