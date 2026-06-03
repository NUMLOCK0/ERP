const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database');
const Response = require('../utils/response');

// ==================== 管理员管理 ====================

router.get('/user', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (username LIKE ? OR real_name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM sys_user WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT u.*, r.name AS role_name FROM sys_user u LEFT JOIN sys_role r ON u.role_id = r.id WHERE ${where} ORDER BY u.id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    list.forEach(u => { delete u.password_hash; });
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/user/:id', (req, res) => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM sys_user WHERE id = ?').get(req.params.id);
    if (!user) return res.json(Response.error('用户不存在'));
    delete user.password_hash;
    res.json(Response.success(user));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/user', (req, res) => {
  try {
    const db = getDatabase();
    const { username, password, real_name = '', phone = '', email = '', role_id = 0, status = 1 } = req.body;
    if (!username || !password) return res.json(Response.error('用户名和密码不能为空'));
    const exists = db.prepare('SELECT id FROM sys_user WHERE username = ?').get(username);
    if (exists) return res.json(Response.error('用户名已存在'));
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`INSERT INTO sys_user (username, password_hash, real_name, phone, email, role_id, status) VALUES (?,?,?,?,?,?,?)`).run(username, hash, real_name, phone, email, role_id, status);
    writeSystemLog(db, req.user.id, '系统管理', '新增管理员', username);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/user/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { username, password, real_name, phone, email, role_id, status } = req.body;
    const fields = [];
    const params = [];
    if (username) { fields.push('username=?'); params.push(username); }
    if (password) { fields.push('password_hash=?'); params.push(bcrypt.hashSync(password, 10)); }
    if (real_name !== undefined) { fields.push('real_name=?'); params.push(real_name); }
    if (phone !== undefined) { fields.push('phone=?'); params.push(phone); }
    if (email !== undefined) { fields.push('email=?'); params.push(email); }
    if (role_id !== undefined) { fields.push('role_id=?'); params.push(role_id); }
    if (status !== undefined) { fields.push('status=?'); params.push(status); }
    if (!fields.length) return res.json(Response.error('无更新数据'));
    fields.push("updated_at=datetime('now','localtime')");
    params.push(req.params.id);
    db.prepare(`UPDATE sys_user SET ${fields.join(',')} WHERE id=?`).run(...params);
    writeSystemLog(db, req.user.id, '系统管理', '编辑管理员', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/user/:id', (req, res) => {
  try {
    const db = getDatabase();
    if (Number(req.params.id) === 1) return res.json(Response.error('不能删除超级管理员'));
    db.prepare('DELETE FROM sys_user WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '系统管理', '删除管理员', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 角色管理 ====================

router.get('/role', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND name LIKE ?'; params.push(`%${keyword}%`); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM sys_role WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM sys_role WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/role/all', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare('SELECT id, name FROM sys_role ORDER BY id ASC').all();
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/role/:id', (req, res) => {
  try {
    const db = getDatabase();
    const role = db.prepare('SELECT * FROM sys_role WHERE id = ?').get(req.params.id);
    if (!role) return res.json(Response.error('角色不存在'));
    res.json(Response.success(role));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/role', (req, res) => {
  try {
    const db = getDatabase();
    const { name, permissions = {}, description = '' } = req.body;
    if (!name) return res.json(Response.error('角色名称不能为空'));
    const result = db.prepare('INSERT INTO sys_role (name, permissions, description) VALUES (?,?,?)').run(name, JSON.stringify(permissions), description);
    writeSystemLog(db, req.user.id, '系统管理', '新增角色', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/role/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, permissions, description } = req.body;
    if (!name) return res.json(Response.error('角色名称不能为空'));
    db.prepare('UPDATE sys_role SET name=?, permissions=?, description=? WHERE id=?').run(name, JSON.stringify(permissions ?? {}), description ?? '', req.params.id);
    writeSystemLog(db, req.user.id, '系统管理', '编辑角色', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/role/:id', (req, res) => {
  try {
    const db = getDatabase();
    if (Number(req.params.id) === 1) return res.json(Response.error('不能删除超级管理员角色'));
    db.prepare('DELETE FROM sys_role WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '系统管理', '删除角色', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 操作日志 ====================

router.get('/log', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, keyword = '', module = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (target LIKE ? OR content LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (module) { where += ' AND module = ?'; params.push(module); }
    if (start_date) { where += ' AND created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM system_log WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT sl.*, u.username, u.real_name FROM system_log sl LEFT JOIN sys_user u ON sl.user_id = u.id WHERE ${where} ORDER BY sl.id DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 系统设置 ====================

router.get('/config', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare('SELECT * FROM system_config ORDER BY id ASC').all();
    const configMap = {};
    list.forEach(c => { configMap[c.key] = c.value; });
    res.json(Response.success(configMap));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/config', (req, res) => {
  try {
    const db = getDatabase();
    const configs = req.body;
    const updateStmt = db.prepare('UPDATE system_config SET value = ? WHERE key = ?');
    const tx = db.transaction(() => {
      Object.keys(configs).forEach(key => {
        updateStmt.run(String(configs[key]), key);
      });
    });
    tx();
    writeSystemLog(db, req.user.id, '系统管理', '修改系统配置', '批量更新');
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 打印模板 ====================

router.get('/print-template', (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, pageSize = 20, type = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (type) { where += ' AND type = ?'; params.push(type); }
    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM print_template WHERE ${where}`).get(...params).cnt;
    const list = db.prepare(`SELECT * FROM print_template WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), (page - 1) * pageSize);
    res.json(Response.paginate(list, total, page, pageSize));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/print-template/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM print_template WHERE id = ?').get(req.params.id);
    if (!row) return res.json(Response.error('模板不存在'));
    res.json(Response.success(row));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/print-template', (req, res) => {
  try {
    const db = getDatabase();
    const { name, type = '', content = '', is_default = 0 } = req.body;
    if (!name) return res.json(Response.error('模板名称不能为空'));
    const result = db.prepare('INSERT INTO print_template (name, type, content, is_default) VALUES (?,?,?,?)').run(name, type, content, is_default);
    writeSystemLog(db, req.user.id, '系统管理', '新增打印模板', name);
    res.json(Response.success({ id: result.lastInsertRowid }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/print-template/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, type, content, is_default } = req.body;
    if (!name) return res.json(Response.error('模板名称不能为空'));
    db.prepare('UPDATE print_template SET name=?, type=?, content=?, is_default=? WHERE id=?').run(name, type ?? '', content ?? '', is_default ?? 0, req.params.id);
    writeSystemLog(db, req.user.id, '系统管理', '编辑打印模板', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/print-template/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM print_template WHERE id = ?').run(req.params.id);
    writeSystemLog(db, req.user.id, '系统管理', '删除打印模板', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

function writeSystemLog(db, userId, module, action, target) {
  db.prepare('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)').run(userId, module, action, target);
}

module.exports = router;
