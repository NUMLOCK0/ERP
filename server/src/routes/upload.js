const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const Response = require('../utils/response');

// 确保上传目录存在
const uploadPath = path.resolve(__dirname, '..', '..', config.uploadDir);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dir = path.join(uploadPath, dateDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf', '.xls', '.xlsx', '.doc', '.docx', '.csv', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 单文件上传
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.json(Response.error('请选择文件'));
    const relativePath = path.relative(path.resolve(__dirname, '..', '..'), req.file.path).replace(/\\/g, '/');
    res.json(Response.success({
      filename: req.file.originalname,
      path: relativePath,
      url: `/${relativePath}`,
      size: req.file.size
    }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 多文件上传
router.post('/batch', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.json(Response.error('请选择文件'));
    const files = req.files.map(f => {
      const relativePath = path.relative(path.resolve(__dirname, '..', '..'), f.path).replace(/\\/g, '/');
      return { filename: f.originalname, path: relativePath, url: `/${relativePath}`, size: f.size };
    });
    res.json(Response.success(files));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 错误处理
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.json(Response.error('文件大小超过限制（10MB）'));
    return res.json(Response.error(err.message));
  }
  res.json(Response.error(err.message));
});

module.exports = router;
