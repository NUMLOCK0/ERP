module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'jxc_server_jwt_secret_2024',
  jwtExpiresIn: '24h',
  db: {
    host: process.env.DB_HOST || '119.91.117.163',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'erp',
    user: process.env.DB_USER || 'erp',
    password: process.env.DB_PASSWORD || '7mmiZN63mdCjG2tJ'
  },
  uploadDir: 'uploads',
  pageSize: 20
};
