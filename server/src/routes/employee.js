const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getPool } = require('../database');
const Response = require('../utils/response');
const requireSystemAdmin = require('../middleware/systemAdmin');

router.get('/', requireSystemAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    let where = '1=1';
    const params = [];
    if (keyword) {
      where += ' AND (e.name LIKE ? OR e.phone LIKE ? OR u.username LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status !== '') {
      where += ' AND e.status = ?';
      params.push(Number(status));
    }

    const offset = (Number(page) - 1) * Number(pageSize);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM employee e
       LEFT JOIN sys_user u ON e.user_id = u.id
       WHERE ${where}`,
      params
    );
    const [list] = await pool.execute(
      `SELECT e.*, u.username
       FROM employee e
       LEFT JOIN sys_user u ON e.user_id = u.id
       WHERE ${where}
       ORDER BY e.id DESC LIMIT ?, ?`,
      [...params, offset, Number(pageSize)]
    );
    res.json(Response.paginate(list, Number(totalRows[0].cnt), Number(page), Number(pageSize)));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/all', async (req, res) => {
  try {
    const pool = getPool();
    const [list] = await pool.execute(
      'SELECT id, name, position, department FROM employee WHERE status = 1 ORDER BY id DESC'
    );
    res.json(Response.success(list));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.get('/:id', requireSystemAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT e.*, u.username
       FROM employee e
       LEFT JOIN sys_user u ON e.user_id = u.id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.json(Response.error('职员不存在'));
    res.json(Response.success(rows[0]));
  } catch (err) {
    res.json(Response.error(err.message));
  }
});

router.post('/', requireSystemAdmin, async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const {
      username,
      password,
      name,
      phone = '',
      position = '',
      department = '',
      status = 1
    } = req.body;
    if (!username) return res.json(Response.error('登录账号不能为空'));
    if (!password || String(password).length < 6) {
      return res.json(Response.error('登录密码不能少于6位'));
    }
    if (!name) return res.json(Response.error('姓名不能为空'));

    await connection.beginTransaction();
    const [existingUsers] = await connection.execute(
      'SELECT id FROM sys_user WHERE username = ?',
      [username]
    );
    if (existingUsers.length) {
      await connection.rollback();
      return res.json(Response.error('登录账号已存在'));
    }

    const roleId = await getEmployeeRoleId(connection);
    const [userResult] = await connection.execute(
      `INSERT INTO sys_user
       (username, password_hash, real_name, phone, role_id, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, bcrypt.hashSync(password, 10), name, phone, roleId, status]
    );
    const [employeeResult] = await connection.execute(
      `INSERT INTO employee
       (user_id, name, phone, position, department, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userResult.insertId, name, phone, position, department, status]
    );
    await writeSystemLog(connection, req.user.id, '职员管理', '新增职员', name);
    await connection.commit();
    res.json(Response.success({ id: employeeResult.insertId }));
  } catch (err) {
    await connection.rollback();
    res.json(Response.error(err.message));
  } finally {
    connection.release();
  }
});

router.put('/:id', requireSystemAdmin, async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const { username, password, name, phone = '', position = '', department = '', status = 1 } = req.body;
    if (!username) return res.json(Response.error('登录账号不能为空'));
    if (!name) return res.json(Response.error('姓名不能为空'));

    await connection.beginTransaction();
    const [employeeRows] = await connection.execute(
      'SELECT user_id FROM employee WHERE id = ?',
      [req.params.id]
    );
    if (!employeeRows.length) {
      await connection.rollback();
      return res.json(Response.error('职员不存在'));
    }

    let userId = Number(employeeRows[0].user_id || 0);
    if (userId) {
      const [existingUsers] = await connection.execute(
        'SELECT id FROM sys_user WHERE username = ? AND id <> ?',
        [username, userId]
      );
      if (existingUsers.length) {
        await connection.rollback();
        return res.json(Response.error('登录账号已存在'));
      }

      const fields = ['username=?', 'real_name=?', 'phone=?', 'status=?'];
      const params = [username, name, phone, status];
      if (password) {
        if (String(password).length < 6) {
          await connection.rollback();
          return res.json(Response.error('登录密码不能少于6位'));
        }
        fields.push('password_hash=?');
        params.push(bcrypt.hashSync(password, 10));
      }
      params.push(userId);
      await connection.execute(`UPDATE sys_user SET ${fields.join(',')} WHERE id=?`, params);
    } else {
      if (!password || String(password).length < 6) {
        await connection.rollback();
        return res.json(Response.error('未关联账号的职员需要设置至少6位登录密码'));
      }
      const [existingUsers] = await connection.execute(
        'SELECT id FROM sys_user WHERE username = ?',
        [username]
      );
      if (existingUsers.length) {
        await connection.rollback();
        return res.json(Response.error('登录账号已存在'));
      }

      const roleId = await getEmployeeRoleId(connection);
      const [userResult] = await connection.execute(
        `INSERT INTO sys_user
         (username, password_hash, real_name, phone, role_id, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, bcrypt.hashSync(password, 10), name, phone, roleId, status]
      );
      userId = userResult.insertId;
    }

    await connection.execute(
      `UPDATE employee
       SET user_id=?, name=?, phone=?, position=?, department=?, status=?
       WHERE id=?`,
      [userId, name, phone, position, department, status, req.params.id]
    );
    await writeSystemLog(connection, req.user.id, '职员管理', '编辑职员', name);
    await connection.commit();
    res.json(Response.success());
  } catch (err) {
    await connection.rollback();
    res.json(Response.error(err.message));
  } finally {
    connection.release();
  }
});

router.delete('/:id', requireSystemAdmin, async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT user_id FROM employee WHERE id = ?',
      [req.params.id]
    );
    await connection.execute('DELETE FROM employee WHERE id = ?', [req.params.id]);
    if (rows[0]?.user_id) {
      await connection.execute(
        'DELETE FROM sys_user WHERE id = ? AND role_id <> 1',
        [rows[0].user_id]
      );
    }
    await writeSystemLog(connection, req.user.id, '职员管理', '删除职员', String(req.params.id));
    await connection.commit();
    res.json(Response.success());
  } catch (err) {
    await connection.rollback();
    res.json(Response.error(err.message));
  } finally {
    connection.release();
  }
});

async function getEmployeeRoleId(connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM sys_role WHERE LOWER(name) = 'employee' LIMIT 1"
  );
  return rows[0]?.id || 0;
}

async function writeSystemLog(connection, userId, module, action, target) {
  await connection.execute(
    'INSERT INTO system_log (user_id, module, action, target) VALUES (?, ?, ?, ?)',
    [userId, module, action, target]
  );
}

module.exports = router;
