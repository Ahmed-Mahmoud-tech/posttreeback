const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const donationController = {
  // Create donation intent
  async createDonationIntent(req, res) {
    try {
      const { amount, to_user_id, on_post_id } = req.body;
      const from_user_id = req.user.id;

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        metadata: {
          from_user_id,
          to_user_id,
          on_post_id,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Complete donation after successful payment
  async completeDonation(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { payment_intent_id } = req.body;

      // Verify payment with Stripe
      const paymentIntent =
        await stripe.paymentIntents.retrieve(payment_intent_id);

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not successful');
      }

      // Create donation record
      const result = await client.query(
        `INSERT INTO donations 
        (from_user_id, to_user_id, on_post_id, amount) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *`,
        [
          paymentIntent.metadata.from_user_id,
          paymentIntent.metadata.to_user_id,
          paymentIntent.metadata.on_post_id,
          paymentIntent.amount / 100, // Convert back from cents
        ]
      );

      // Create notification
      await client.query(
        `INSERT INTO notifications 
        (author_user_id, to_user_id, content) 
        VALUES ($1, $2, $3)`,
        [
          paymentIntent.metadata.from_user_id,
          paymentIntent.metadata.to_user_id,
          `You received a donation of $${paymentIntent.amount / 100}`,
        ]
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  },

  // Get user's donation history
  async getDonationHistory(req, res) {
    try {
      const user_id = req.user.id;

      const result = await pool.query(
        `SELECT d.*, 
          u_from.name as from_user_name,
          u_to.name as to_user_name,
          p.title as post_title
         FROM donations d
         JOIN users u_from ON d.from_user_id = u_from.id
         JOIN users u_to ON d.to_user_id = u_to.id
         JOIN posts p ON d.on_post_id = p.id
         WHERE d.from_user_id = $1 OR d.to_user_id = $1
         ORDER BY d.created_at DESC`,
        [user_id]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = donationController;
