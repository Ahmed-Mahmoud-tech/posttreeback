const pool = require('../config/database');
const { Client } = require('@elastic/elasticsearch');
const elastic = new Client({ node: process.env.ELASTICSEARCH_URL });

const searchController = {
  // Search posts
  async searchPosts(req, res) {
    try {
      const { query, category, tags } = req.query;

      // Build Elasticsearch query
      const searchQuery = {
        index: 'posts',
        body: {
          query: {
            bool: {
              must: [
                query
                  ? {
                      multi_match: {
                        query,
                        fields: ['title^2', 'description', 'tags'],
                      },
                    }
                  : { match_all: {} },
              ],
              filter: [{ term: { status: 'published' } }],
            },
          },
        },
      };

      if (category) {
        searchQuery.body.query.bool.filter.push({
          term: { category },
        });
      }

      if (tags) {
        searchQuery.body.query.bool.filter.push({
          terms: { tags: tags.split(',') },
        });
      }

      const result = await elastic.search(searchQuery);

      // Get full post details from PostgreSQL
      const postIds = result.hits.hits.map(hit => hit._id);

      const dbResult = await pool.query(
        `SELECT p.*, u.name as author_name 
         FROM posts p 
         JOIN users u ON p.author_user_id = u.id 
         WHERE p.id = ANY($1)`,
        [postIds]
      );

      res.json(dbResult.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = searchController;
