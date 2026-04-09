const express = require('express')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const auth = require('../middleware/auth')

const router = express.Router()

function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys missing (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)')
  }
  return new Razorpay({ key_id, key_secret })
}

// Create an order (server-side) for secure Razorpay checkout
router.post('/razorpay/order', auth(true), async (req, res) => {
  try {
    const { amountPaise, currency, receipt, notes } = req.body || {}

    const amt = Number(amountPaise)
    if (!Number.isFinite(amt) || amt < 100) {
      return res.status(400).json({ message: 'amountPaise must be a number >= 100' })
    }

    const rp = getRazorpayClient()
    const order = await rp.orders.create({
      amount: Math.round(amt),
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: typeof notes === 'object' && notes ? notes : undefined,
    })

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (err) {
    console.error('Razorpay order create failed:', err)
    return res.status(500).json({ message: 'Failed to start payment' })
  }
})

// Verify payment signature (server-side)
router.post('/razorpay/verify', auth(true), async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body || {}
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'orderId, paymentId, signature are required' })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return res.status(500).json({ message: 'Razorpay secret missing' })
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (expected !== signature) {
      return res.status(400).json({ message: 'Payment verification failed' })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('Razorpay verify failed:', err)
    return res.status(500).json({ message: 'Payment verification error' })
  }
})

module.exports = router

