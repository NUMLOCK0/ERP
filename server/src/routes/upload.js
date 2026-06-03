const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../database');
const config = require('../config');

// 确保上传目录存在
const uploadAbsDir = path.resolve(__dirname, '../../', config.uploadDir);
if (!fs.existsSync(uploadAbsDir)) {
  fs.mkdirSync(uploadAbsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.mimetype.startsWith('image/') ? 'images' : 'files';
    const dest = path.join(uploadAbsDir, subDir);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, basename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 单文件上传
router.post('/file', upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ code: -1, message: '上传失败' });
  const url = `/uploads/${req.file.mimetype.startsWith('image/') ? 'images' : 'files'}/${req.file.filename}`;
  res.json({ code: 0, data: { url, filename: req.file.filename, originalname: req.file.originalname, size: req.file.size }, message: 'success' });
});

// 多文件上传
router.post('/multiple', upload.array('files', 10), (req, res) => {
  if (!req.files || !req.files.length) return res.json({ code: -1, message: '上传失败' });
  const urls = req.files.map(f => ({
    url: `/uploads/${f.mimetype.startsWith('image/') ? 'images' : 'files'}/${f.filename}`,
    filename: f.filename,
    originalname: f.originalname,
    size: f.size
  }));
  res.json({ code: 0, data: urls, message: 'success' });
});

module.exports = router;
