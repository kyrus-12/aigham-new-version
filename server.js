const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Serve static files (CSS, JS, images) from the repository root
app.use(express.static(path.join(__dirname)));

// 2. Database Connection Pool Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Auto-create Database Table on Startup
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
initDatabase();

// 3. Serve index.html on the Root Path ("/")
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. API Routes
app.get('/api/unlocks/:sectionId', async (req, res) => {
  const { sectionId } = req.params;
  try {
    const result = await pool.query(
      'SELECT module_key FROM section_unlocks WHERE section_id = $1',
      [sectionId]
    );
    res.json(result.rows.map(row => row.module_key));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
