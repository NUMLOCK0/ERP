const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const COS = require('cos-nodejs-sdk-v5');
const config = require('../config');

const uploadAbsDir = path.resolve(__dirname, '../../', config.uploadDir);
if (!fs.existsSync(uploadAbsDir)) {
  fs.mkdirSync(uploadAbsDir, { recursive: true });
}

const allowedExtPattern = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)$/i;
const maxFileSize = 10 * 1024 * 1024;
const cosEnabled = Boolean(
  config.cos?.enabled &&
  config.cos.secretId &&
  config.cos.secretKey &&
  config.cos.bucket &&
  config.cos.region
);

const cosClient = cosEnabled
  ? new COS({
    SecretId: config.cos.secretId,
    SecretKey: config.cos.secretKey
  })
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    if (allowedExtPattern.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: -1, message: '上传失败' });
    const data = cosEnabled ? await uploadToCos(req.file) : await uploadToLocal(req.file);
    res.json({ code: 0, data, message: 'success' });
  } catch (err) {
    res.json({ code: -1, message: err.message || '上传失败' });
  }
});

router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.json({ code: -1, message: '上传失败' });
    const data = [];
    for (const file of req.files) {
      data.push(cosEnabled ? await uploadToCos(file) : await uploadToLocal(file));
    }
    res.json({ code: 0, data, message: 'success' });
  } catch (err) {
    res.json({ code: -1, message: err.message || '上传失败' });
  }
});

async function uploadToCos(file) {
  const subDir = file.mimetype.startsWith('image/') ? 'images' : 'files';
  const filename = buildFilename(file.originalname);
  const key = [trimSlashes(config.cos.prefix), subDir, filename].filter(Boolean).join('/');

  await putObject({
    Bucket: config.cos.bucket,
    Region: config.cos.region,
    Key: key,
    Body: file.buffer,
    ContentLength: file.size,
    ContentType: file.mimetype
  });

  return {
    url: buildCosUrl(key),
    key,
    filename,
    originalname: file.originalname,
    size: file.size,
    storage: 'cos'
  };
}

function putObject(params) {
  return new Promise((resolve, reject) => {
    cosClient.putObject(params, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

async function uploadToLocal(file) {
  const subDir = file.mimetype.startsWith('image/') ? 'images' : 'files';
  const dest = path.join(uploadAbsDir, subDir);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const filename = buildFilename(file.originalname);
  await fs.promises.writeFile(path.join(dest, filename), file.buffer);
  return {
    url: `/uploads/${subDir}/${filename}`,
    filename,
    originalname: file.originalname,
    size: file.size,
    storage: 'local'
  };
}

function buildFilename(originalname) {
  const ext = path.extname(originalname);
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
}

function trimSlashes(value = '') {
  return String(value).replace(/^\/+|\/+$/g, '');
}

function buildCosUrl(key) {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  if (config.cos.domain) return `${String(config.cos.domain).replace(/\/$/, '')}/${encodedKey}`;
  return `https://${config.cos.bucket}.cos.${config.cos.region}.myqcloud.com/${encodedKey}`;
}

module.exports = router;
