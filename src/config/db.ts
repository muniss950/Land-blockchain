import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'aryan@012',
  database: 'land_registry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // MariaDB specific configuration
  timezone: 'Z',
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
});

export default pool; 