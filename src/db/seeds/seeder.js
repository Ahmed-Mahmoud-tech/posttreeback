const pool = require('../../config/database');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

class Seeder {
  async run() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Seed users
      const users = await this.seedUsers(50);

      // Seed posts
      await this.seedPosts(users, 200);

      // Seed comments
      await this.seedComments(users, 1000);

      // Seed relationships
      await this.seedRelationships(users);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async seedUsers(count) {
    const users = [];
    const password = await bcrypt.hash('password123', 10);

    for (let i = 0; i < count; i++) {
      const result = await pool.query(
        `INSERT INTO users (name, email, password, description, image)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          faker.person.fullName(),
          faker.internet.email(),
          password,
          faker.lorem.paragraph(),
          faker.image.avatar(),
        ]
      );
      users.push(result.rows[0].id);
    }

    return users;
  }

  async seedPosts(userIds, count) {
    for (let i = 0; i < count; i++) {
      await pool.query(
        `INSERT INTO posts (author_user_id, title, description, category, tags)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          faker.helpers.arrayElement(userIds),
          faker.lorem.sentence(),
          faker.lorem.paragraphs(),
          faker.helpers.arrayElement(['tech', 'science', 'art', 'music']),
          faker.helpers.arrayElements(['tag1', 'tag2', 'tag3', 'tag4'], 2),
        ]
      );
    }
  }

  // Add more seeding methods as needed
}

module.exports = new Seeder();
