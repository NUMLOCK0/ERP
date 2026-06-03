const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../database');
const config = require('../config');
const Response = require('../utils/response');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const pool = getPool();
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json(Response.error('用户名和密码不能为空'));
    }

    const [rows] = await pool.execute(
      'SELECT * FROM sys_user WHERE username = ? AND status = 1',
      [username]
    );
    const user = rows[0];
    if (!user) {
      return res.json(Response.error('用户名不存在或账户已禁用'));
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.json(Response.error('密码错误'));
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    delete user.password_hash;
    res.json(Response.success({ token, user }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

module.exports = router;
