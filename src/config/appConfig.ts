
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

// Forțăm modul producție, indiferent de valoarea NODE_ENV
export const appConfig = prodConfig;
