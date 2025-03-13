
import axios from 'axios';
import { Machine, LogEntry, LogRequest } from '@/types';
import { appConfig } from '@/config/appConfig';

// Folosim URL-ul API din configurație
const API_URL = appConfig.apiUrl;

/**
 * Serviciu pentru conectarea la mașini prin SSH și extragerea log-urilor
 */
export const sshService = {
  /**
   * Extrage log-uri de pe o mașină remote
   */
  fetchLogs: async (request: LogRequest): Promise<LogEntry[]> => {
    try {
      // În producție, aceasta ar fi o cerere reală către un backend
      const response = await axios.post(`${API_URL}/logs`, request);
      return response.data;
    } catch (error) {
      console.error('Eroare la extragerea log-urilor:', error);
      
      // Pentru testare, generăm log-uri simulate dacă backend-ul nu este disponibil
      if (appConfig.env === 'development') {
        console.log('Folosim log-uri simulate în modul de dezvoltare');
        return generateMockLogs(request);
      }
      
      throw error;
    }
  },
  
  /**
   * Testează conexiunea SSH la o mașină
   */
  testConnection: async (machine: Machine): Promise<{ success: boolean; message: string }> => {
    try {
      // În producție, aceasta ar fi o cerere reală către un backend
      const response = await axios.post(`${API_URL}/test-connection`, machine);
      return response.data;
    } catch (error) {
      console.error('Eroare la testarea conexiunii:', error);
      
      // Pentru testare, simulăm un răspuns pozitiv dacă backend-ul nu este disponibil
      if (appConfig.env === 'development') {
        // Simulăm o conexiune de succes în 80% din cazuri
        const success = Math.random() > 0.2;
        return {
          success,
          message: success 
            ? `Conexiune SSH reușită la ${machine.hostname} (${machine.ip})` 
            : 'Conexiunea SSH a eșuat. Verificați credențialele și firewall-ul.'
        };
      }
      
      throw error;
    }
  }
};

/**
 * Generează log-uri simulate pentru dezvoltare și testare
 */
const generateMockLogs = (request: LogRequest): LogEntry[] => {
  const { machineId, startDate, endDate, liveMode } = request;
  
  // Obținem mașina din localStorage pentru simulare
  const machines = JSON.parse(localStorage.getItem('optizone-machines') || '[]');
  const machine = machines.find((m: Machine) => m.id === machineId);
  
  if (!machine) {
    console.error(`Mașina cu ID-ul ${machineId} nu a fost găsită`);
    return [];
  }
  
  // Generăm log-uri aleatorii pentru simulare
  const levels: LogEntry['level'][] = ['info', 'warning', 'error', 'debug'];
  const logs: LogEntry[] = [];
  
  const totalLogs = liveMode ? 20 : Math.floor(Math.random() * 50) + 20;
  
  // Tipuri de mesaje de log care ar putea apărea pe un server real
  const logMessages = [
    `Started sshd service on ${machine.hostname}`,
    `User ${machine.sshUsername} logged in from 192.168.1.${Math.floor(Math.random() * 255)}`,
    'System load average: 0.72, 0.84, 0.92',
    'Checking filesystems integrity',
    'Low disk space warning: /var/log (85% used)',
    'Network interface eth0 is up',
    'Detected hardware change: USB device connected',
    'Security update available: kernel-3.10.0-1160',
    'Firewall blocked connection from 203.0.113.42:2201',
    'Process apache2 using high CPU: 92%',
    `Database backup completed on ${machine.hostname}`,
    'Authentication failure for invalid user root',
    'CRON job completed: logrotate',
    'System reboot required for kernel update',
    'Mail queue is empty, mail system is running',
    'Memory usage warning: 87% used',
    'Temperature sensor reading: CPU 62°C',
    'Successful yum update: openssh-7.4p1-21',
    'Docker container restarted: postgres',
    'SELinux enforcing mode active'
  ];
  
  for (let i = 0; i < totalLogs; i++) {
    const date = startDate && endDate 
      ? new Date(new Date(startDate).getTime() + Math.random() * (new Date(endDate).getTime() - new Date(startDate).getTime()))
      : new Date(Date.now() - Math.random() * 86400000);
      
    logs.push({
      timestamp: date.toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: logMessages[Math.floor(Math.random() * logMessages.length)]
    });
  }
  
  // Sortăm log-urile după timestamp
  logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return logs;
};
