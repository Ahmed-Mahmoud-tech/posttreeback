const fs = require('fs').promises;
const path = require('path');
const pool = require('../../config/database');
const { logger } = require('../../services/monitoringService');

class Migrations {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'scripts');
  }

  async createMigrationsTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    const result = await pool.query('SELECT name FROM migrations');
    return result.rows.map(row => row.name);
  }

  async run() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await this.createMigrationsTable();
      const executedMigrations = await this.getExecutedMigrations();

      // Get all migration files
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files.filter(f => f.endsWith('.sql')).sort();

      // Execute new migrations
      for (const file of migrationFiles) {
        if (!executedMigrations.includes(file)) {
          const filePath = path.join(this.migrationsPath, file);
          const sql = await fs.readFile(filePath, 'utf-8');

          logger.info(`Executing migration: ${file}`);
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [
            file,
          ]);
          logger.info(`Migration completed: ${file}`);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new Migrations();
