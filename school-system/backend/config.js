require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'school-system-secret-key',
    expiresIn: '24h'
  },
  
  server: {
    port: process.env.PORT || 3000
  }
};