const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../database');
const Response = require('../utils/response');

// ==================== 管理员管理 ====================

router.get('/admin', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) { where += ' AND (username LIKE ? OR real_name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(`SELECT COUNT(*) AS cnt FROM sys_user WHERE ${where}`, params);
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT su.*, sr.name AS role_name FROM sys_user su LEFT JOIN sys_role sr ON su.role_id = sr.id WHERE ${where} ORDER BY su.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    // 移除密码哈希
    list.forEach(u => { delete u.password_hash; });
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/admin/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sys_user WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('管理员不存在'));
    const user = rows[0];
    delete user.password_hash;
    res.json(Response.success(user));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/admin', async (req, res) => {
  try {
    const pool = getPool();
    const { username, password, real_name = '', phone = '', email = '', role_id = 0, status = 1 } = req.body;
    if (!username) return res.json(Response.error('用户名不能为空'));
    if (!password) return res.json(Response.error('密码不能为空'));

    const [existRows] = await pool.execute('SELECT id FROM sys_user WHERE username = ?', [username]);
    if (existRows.length) return res.json(Response.error('用户名已存在'));

    const hash = bcrypt.hashSync(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO sys_user (username, password_hash, real_name, phone, email, role_id, status) VALUES (?,?,?,?,?,?,?)',
      [username, hash, real_name, phone, email, role_id, status]
    );
    await writeSystemLog(pool, req.user.id, '系统管理', '新增管理员', username);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/admin/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { username, password, real_name, phone, email, role_id, status } = req.body;
    const fields = [], params = [];
    if (username !== undefined) { fields.push('username=?'); params.push(username); }
    if (real_name !== undefined) { fields.push('real_name=?'); params.push(real_name); }
    if (phone !== undefined) { fields.push('phone=?'); params.push(phone); }
    if (email !== undefined) { fields.push('email=?'); params.push(email); }
    if (role_id !== undefined) { fields.push('role_id=?'); params.push(role_id); }
    if (status !== undefined) { fields.push('status=?'); params.push(status); }
    if (password) {
      fields.push('password_hash=?');
      params.push(bcrypt.hashSync(password, 10));
    }
    params.push(req.params.id);
    if (fields.length) {
      await pool.execute(`UPDATE sys_user SET ${fields.join(',')} WHERE id=?`, params);
    }
    await writeSystemLog(pool, req.user.id, '系统管理', '编辑管理员', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/admin/:id/password', async (req, res) => {
  try {
    const pool = getPool();
    const { password } = req.body;
    if (!password) return res.json(Response.error('密码不能为空'));
    await pool.execute(
      'UPDATE sys_user SET password_hash=? WHERE id=?',
      [bcrypt.hashSync(password, 10), req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '系统管理', '重置管理员密码', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/admin/:id', async (req, res) => {
  try {
    const pool = getPool();
    if (Number(req.params.id) === 1) return res.json(Response.error('不能删除超级管理员'));
    await pool.execute('DELETE FROM sys_user WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '系统管理', '删除管理员', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 角色管理 ====================

router.get('/role', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute('SELECT * FROM sys_role ORDER BY id ASC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/role/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM sys_role WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('角色不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/role', async (req, res) => {
  try {
    const pool = getPool();
    const { name, permissions = {}, description = '' } = req.body;
    if (!name) return res.json(Response.error('角色名称不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO sys_role (name, permissions, description) VALUES (?,?,?)',
      [name, JSON.stringify(permissions), description]
    );
    await writeSystemLog(pool, req.user.id, '系统管理', '新增角色', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/role/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, permissions, description } = req.body;
    if (!name) return res.json(Response.error('角色名称不能为空'));
    await pool.execute(
      'UPDATE sys_role SET name=?, permissions=?, description=? WHERE id=?',
      [name, JSON.stringify(permissions ?? {}), description ?? '', req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '系统管理', '编辑角色', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.delete('/role/:id', async (req, res) => {
  try {
    const pool = getPool();
    if (Number(req.params.id) === 1) return res.json(Response.error('不能删除超级管理员角色'));
    const [userRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM sys_user WHERE role_id = ?', [req.params.id]);
    if (Number(userRows[0].cnt) > 0) return res.json(Response.error('该角色下还有用户，不能删除'));
    await pool.execute('DELETE FROM sys_role WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '系统管理', '删除角色', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 操作日志 ====================

router.get('/log', async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, module = '', action = '', keyword = '', start_date = '', end_date = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (module) { where += ' AND module = ?'; params.push(module); }
    if (action) { where += ' AND action = ?'; params.push(action); }
    if (keyword) { where += ' AND (target LIKE ? OR content LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (start_date) { where += ' AND created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND created_at <= ?'; params.push(end_date + ' 23:59:59'); }
    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(`SELECT COUNT(*) AS cnt FROM system_log WHERE ${where}`, params);
    const total = Number(totalRows[0].cnt);
    const [list] = await pool.execute(
      `SELECT sl.*, su.real_name AS user_name FROM system_log sl LEFT JOIN sys_user su ON sl.user_id = su.id WHERE ${where} ORDER BY sl.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 系统配置 ====================

router.get('/config', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute('SELECT * FROM system_config ORDER BY id ASC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/config', async (req, res) => {
  try {
    const pool = getPool();
    const configs = req.body;
    if (!configs || typeof configs !== 'object') return res.json(Response.error('参数格式错误'));

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [key, value] of Object.entries(configs)) {
        const [rows] = await conn.execute('SELECT id FROM system_config WHERE `key` = ?', [key]);
        if (rows.length) {
          await conn.execute('UPDATE system_config SET value = ? WHERE `key` = ?', [String(value ?? ''), key]);
        } else {
          await conn.execute('INSERT INTO system_config (`key`, value) VALUES (?, ?)', [key, String(value ?? '')]);
        }
      }
      await conn.commit();
      await writeSystemLog(pool, req.user.id, '系统管理', '保存系统配置', '');
      res.json(Response.success());
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

// ==================== 打印模板 ====================

router.get('/print-template', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute('SELECT * FROM print_template ORDER BY id ASC');
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/print-template/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM print_template WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('模板不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/print-template', async (req, res) => {
  try {
    const pool = getPool();
    const { name, type = '', content = '', is_default = 0 } = req.body;
    if (!name) return res.json(Response.error('模板名称不能为空'));
    const [result] = await pool.execute(
      'INSERT INTO print_template (name, type, content, is_default) VALUES (?,?,?,?)',
      [name, type, content, is_default]
    );
    await writeSystemLog(pool, req.user.id, '系统管理', '新增打印模板', name);
    res.json(Response.success({ id: result.insertId }));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.put('/print-template/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { name, type, content, is_default } = req.body;
    if (!name) return res.json(Response.error('模板名称不能为空'));
    await pool.execute(
      'UPDATE print_template SET name=?, type=?, content=?, is_default=? WHERE id=?',
      [name, type ?? '', content ?? '', is_default ?? 0, req.params.id]
    );
    await writeSystemLog(pool, req.user.id, '系统管理', '编辑打印模板', name);
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/print-template/:id/default', async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute('SELECT id, type FROM print_template WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.json(Response.error('模板不存在'));
    const template = rows[0];
    await conn.beginTransaction();
    await conn.execute('UPDATE print_template SET is_default = 0 WHERE type = ?', [template.type]);
    await conn.execute('UPDATE print_template SET is_default = 1 WHERE id = ?', [template.id]);
    await conn.commit();
    await writeSystemLog(pool, req.user.id, '系统管理', '设置默认打印模板', String(template.id));
    res.json(Response.success());
  } catch (err) {
    await conn.rollback();
    res.json(Response.error(err.message));
  } finally {
    conn.release();
  }
});

router.delete('/print-template/:id', async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM print_template WHERE id = ?', [req.params.id]);
    await writeSystemLog(pool, req.user.id, '系统管理', '删除打印模板', String(req.params.id));
    res.json(Response.success());
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

async function writeSystemLog(pool, userId, module, action, target) {
  await pool.execute('INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)', [userId, module, action, target]);
}

module.exports = router;
