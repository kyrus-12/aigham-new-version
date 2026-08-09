const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// 1. Initialize PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
});

// 2. Automatically create the table on server start
async function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS section_unlocks (
        section_id VARCHAR(50) NOT NULL,
        module_key VARCHAR(100) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (section_id, module_key)
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('PostgreSQL: section_unlocks table is ready.');
  } catch (err) {
    console.error('PostgreSQL initialization error:', err);
  }
}

// Run the setup function
initDatabase();

// 3. API Route: Fetch unlocks for a section
app.get('/api/unlocks/:sectionId', async (req, res) => {
  const { sectionId } = req.params;
  try {
    const result = await pool.query(
      'SELECT module_key FROM section_unlocks WHERE section_id = $1',
      [sectionId]
    );
    const unlockedKeys = result.rows.map(row => row.module_key);
    res.json(unlockedKeys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. API Route: Unlock a module for a section
app.post('/api/unlock', async (req, res) => {
  const { sectionId, moduleKey } = req.body;
  try {
    await pool.query(
      `INSERT INTO section_unlocks (section_id, module_key) 
       VALUES ($1, $2) 
       ON CONFLICT (section_id, module_key) DO NOTHING`,
      [sectionId, moduleKey]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
