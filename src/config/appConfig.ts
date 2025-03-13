
/**
 * Configurația aplicației pentru diferite medii
 */

// Valori implicite pentru mediul de dezvoltare
const devConfig = {
  apiUrl: 'http://localhost:3001/api',
  defaultSshUsername: 'gts',
  defaultSshPassword: '1qaz2wsx',
  env: 'development'
};

// Valori pentru mediul de producție
const prodConfig = {
  apiUrl: '/api',
  defaultSshUsername: 'gts',
  defaultSshPassword: '1qaz2wsx',
  env: 'production'
};

// Exportăm configurația în funcție de mediu
export const appConfig = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;
