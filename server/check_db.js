const mysql = require('mysql2/promise');
const config = require('./src/config.js');

async function main() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password
  });
  
  try {
    const [rows] = await connection.execute('SELECT * FROM product_category');
    console.log('Categories in DB:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
