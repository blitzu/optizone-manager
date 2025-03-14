
import axios from 'axios';
import { Machine, LogEntry, LogRequest, SSHCommandRequest } from '@/types';
import { appConfig } from '@/config/appConfig';
import { toast } from '@/hooks/use-toast';

// Folosim URL-ul API din configurație
const API_URL = appConfig.apiUrl;

/**
 * Serviciu pentru conectarea la mașini prin SSH și extragerea log-urilor
 */
export const sshService = {
  /**
   * Testează conexiunea SSH la o mașină
   */
  testConnection: async (machine: Machine): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(`Testing SSH connection to: ${machine.hostname} (${machine.ip})`);
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('SSH test eșuat: Nu s-a găsit token de autentificare');
        throw new Error('No authentication token found');
      }
      
      // Adăugăm timeout pentru a evita așteptarea prea lungă
      const response = await axios.post(`${API_URL}/test-connection`, machine, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000 // 15 secunde timeout
      });
      
      console.log(`SSH connection test response for ${machine.hostname}:`, response.data);
      
      // Verificăm explicit ce conține response.data
      if (!response.data) {
        console.error(`Test SSH eșuat pentru ${machine.hostname}: răspunsul nu conține date`);
        return { success: false, message: "Răspuns invalid de la server" };
      }
      
      return response.data;
    } catch (error) {
      console.error(`Eroare la testarea conexiunii SSH pentru ${machine.hostname}:`, error);
      // Adăugăm mai multe detalii despre eroare
      if (axios.isAxiosError(error)) {
        console.error(`Detalii eroare Axios pentru testare SSH ${machine.hostname}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      
      throw error;
    }
  },

  /**
   * Extrage log-uri de pe o mașină remote
   */
  fetchLogs: async (request: LogRequest): Promise<LogEntry[]> => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.post(`${API_URL}/logs`, request, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Eroare la extragerea log-urilor:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut obține log-urile. Verificați conexiunea SSH.",
        variant: "destructive"
      });
      throw error;
    }
  },
  
  /**
   * Descarcă log-uri brute (nealterate) de pe o mașină remote
   */
  downloadRawLogs: async (request: LogRequest): Promise<string> => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Adăugăm un parametru pentru a indica că dorim log-uri brute
      const requestWithRawFlag = {
        ...request,
        rawFormat: true
      };
      
      const response = await axios.post(`${API_URL}/logs/raw`, requestWithRawFlag, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.rawLogs;
    } catch (error) {
      console.error('Eroare la descărcarea log-urilor brute:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut descărca log-urile. Verificați conexiunea SSH.",
        variant: "destructive"
      });
      throw error;
    }
  },
  
  /**
   * Execută o comandă SSH pe o mașină remote
   */
  executeCommand: async (request: SSHCommandRequest): Promise<{ success: boolean; output: string }> => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Verificăm dacă comanda este sudo și adăugăm parola
      let modifiedRequest = { ...request };
      
      if (request.command.startsWith('sudo ') && request.sshPassword) {
        // Trimitem comanda specială pentru sudo cu parola inclusă
        modifiedRequest.command = `echo "${request.sshPassword}" | sudo -S ${request.command.substring(5)}`;
      }
      
      const response = await axios.post(`${API_URL}/execute-command`, modifiedRequest, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Eroare la executarea comenzii:', error);
      throw error;
    }
  }
};
