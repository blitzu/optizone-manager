
/**
 * Configurația aplicației pentru diferite medii
 * În producție, aceste valori ar trebui înlocuite cu valorile reale
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
  apiUrl: '/api', // În producție, folosim o cale relativă sau un URL complet
  defaultSshUsername: 'gts',
  defaultSshPassword: '1qaz2wsx',
  env: 'production'
};

// Exportăm configurația în funcție de mediu
export const appConfig = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;
