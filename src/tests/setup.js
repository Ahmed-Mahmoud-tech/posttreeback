const { pool } = require('../config/database');

beforeAll(async () => {
  // Create test database tables
  await pool.query(`
    // ... your schema creation SQL ...
  `);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean up tables before each test
  await pool.query('TRUNCATE users, posts, comments CASCADE');
});
