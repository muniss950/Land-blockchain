const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Database configuration
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345',
  database: 'land_registry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database table
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS property_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_hash VARCHAR(66) NOT NULL UNIQUE,
        block_number VARCHAR(20) NOT NULL,
        property_id BIGINT NOT NULL,
        location VARCHAR(255) NOT NULL,
        area BIGINT NOT NULL,
        owner VARCHAR(42) NOT NULL,
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// API endpoints
app.post('/api/properties', async (req, res) => {
  try {
    const { transaction_hash, block_number, property_id, location, area, owner, timestamp } = req.body;
    console.log('Received property record:', { transaction_hash, block_number, property_id, location, area, owner, timestamp });
    
    // Convert ISO timestamp to MySQL datetime format
    const mysqlTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
    
    const connection = await pool.getConnection();
    console.log('Database connection established');
    
    const [result] = await connection.query(
      'INSERT INTO property_records (transaction_hash, block_number, property_id, location, area, owner, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transaction_hash, block_number, property_id, location, area, owner, mysqlTimestamp]
    );
    console.log('Insert result:', result);
    
    connection.release();
    res.status(201).json({ message: 'Property record created successfully' });
  } catch (error) {
    console.error('Error creating property record:', error);
    res.status(500).json({ error: 'Failed to create property record' });
  }
});

app.get('/api/properties', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM property_records ORDER BY created_at DESC');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching property records:', error);
    res.status(500).json({ error: 'Failed to fetch property records' });
  }
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}); 
