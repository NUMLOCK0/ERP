module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'jxc_server_jwt_secret_2024',
  jwtExpiresIn: '24h',
  dbPath: process.env.DB_PATH || 'jxc.db',
  uploadDir: 'uploads',
  pageSize: 20
};
