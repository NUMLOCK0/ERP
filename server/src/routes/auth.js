const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database');
const config = require('../config');
const Response = require('../utils/response');

// 登录
router.post('/login', (req, res) => {
  try {
    const db = getDatabase();
    const { username, password } = req.body;
    if (!username || !password) return res.json(Response.error('用户名和密码不能为空'));
    const user = db.prepare('SELECT * FROM sys_user WHERE username = ? AND status = 1').get(username);
    if (!user) return res.json(Response.error('用户名或密码错误'));
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.json(Response.error('用户名或密码错误'));
    const role = db.prepare('SELECT * FROM sys_role WHERE id = ?').get(user.role_id);
    const token = jwt.sign({ id: user.id, username: user.username, role_id: user.role_id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    writeSystemLog(db, user.id, '系统认证', '登录', user.username);
    res.json(Response.success({
      token,
      user: {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        role_id: user.role_id,
        permissions: role ? JSON.parse(role.permissions || '{}') : {}
      }
    }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// 获取当前用户信息
router.get('/userinfo', (req, res) => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT id, username, real_name, phone, email, role_id, status, created_at FROM sys_user WHERE id = ?').get(req.user.id);
    if (!user) return res.json(Response.error('用户不存在'));
    const role = db.prepare('SELECT * FROM sys_role WHERE id = ?').get(user.role_id);
    res.json(Response.success({ ...user, permissions: role ? JSON.parse(role.permissions || '{}') : {} }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
