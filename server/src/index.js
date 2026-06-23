const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./database');
const authMiddleware = require('./middleware/auth');

const app = express();

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', config.uploadDir)));

// 公开路由（无需认证）
app.use('/api/auth', require('./routes/auth'));

// 认证中间件 — 以下所有路由都需要 JWT
app.use('/api', authMiddleware);

// 受保护路由
app.use('/api/product', require('./routes/product'));
app.use('/api/category', require('./routes/category'));
app.use('/api/brand', require('./routes/brand'));
app.use('/api/unit', require('./routes/unit'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/supplier', require('./routes/supplier'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/sale', require('./routes/sale'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/processing', require('./routes/processing'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/report', require('./routes/report'));
app.use('/api/system', require('./routes/system'));
app.use('/api/upload', require('./routes/upload'));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: -1, message: '服务器内部错误' });
});

// 异步启动
(async () => {
  try {
    await initDatabase();
    app.listen(config.port, () => {
      console.log(`进销存系统后端服务已启动，端口：${config.port}`);
      console.log(`数据库：${config.db.host}:${config.db.port}/${config.db.database}`);
    });
  } catch (err) {
    console.error('启动失败:', err.message);
    process.exit(1);
  }
})();
