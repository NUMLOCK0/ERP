const { getPool } = require('../database');
const isSystemAdmin = require('../utils/systemAdmin');

module.exports = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT su.role_id, sr.name AS role_name
       FROM sys_user su
       LEFT JOIN sys_role sr ON su.role_id = sr.id
       WHERE su.id = ? AND su.status = 1`,
      [req.user.id]
    );

    if (!isSystemAdmin(rows[0])) {
      return res.json({ code: 403, message: '仅系统管理员可访问职员管理' });
    }

    next();
  } catch (err) {
    return res.json({ code: -1, message: err.message });
  }
};
