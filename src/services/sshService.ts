
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
      const response = await axios.post(`${API_URL}/logs`, request);
      return response.data;
    } catch (error) {
      console.error('Eroare la extragerea log-urilor:', error);
      throw error;
    }
  },
  
  /**
   * Testează conexiunea SSH la o mașină
   */
  testConnection: async (machine: Machine): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${API_URL}/test-connection`, machine);
      return response.data;
    } catch (error) {
      console.error('Eroare la testarea conexiunii:', error);
      throw error;
    }
  }
};
