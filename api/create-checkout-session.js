// /api/create-checkout-session.js
// Vercel serverless function — creates a one-time Stripe Checkout session.
// REQUIRES the environment variable STRIPE_SECRET_KEY, set in
// Vercel > Project > Settings > Environment Variables. Never hard-code the key here.

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Stripe is not configured yet.' });
  }
  const stripe = new Stripe(key);

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

    const dollars = Math.round(Number(body && body.amount));
    if (!Number.isFinite(dollars) || dollars < 1 || dollars > 100000) {
      return res.status(400).json({ error: 'Please enter a valid donation amount.' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: dollars * 100, // Stripe expects the amount in cents
          product_data: {
            name: 'Donation to Essential Threads',
            description: 'Thank you for supporting Essential Threads, a registered 501(c)(3) nonprofit.'
          }
        }
      }],
      success_url: `${origin}/?donation=success`,
      cancel_url: `${origin}/?donation=cancelled`
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Unable to start checkout. Please try again.' });
  }
};
