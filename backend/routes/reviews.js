const express = require('express')
const auth = require('../middleware/auth')
const Review = require('../models/Review')
const Designer = require('../models/Designer')

const router = express.Router()

// "My Reviews"
// - customers: reviews they wrote
// - designers: reviews received on their designer profile
router.get('/me', auth(true), async (req, res) => {
  try {
    const { id, role } = req.user || {}
    if (!id) return res.status(401).json({ message: 'User ID missing from token' })

    if (role === 'designer') {
      const designer = await Designer.findOne({ user: id }).lean()
      if (!designer) return res.json({ mode: 'received', reviews: [] })

      const reviews = await Review.find({ design: designer._id })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .lean()

      return res.json({ mode: 'received', reviews })
    }

    const reviews = await Review.find({ user: id })
      .populate('design', 'displayName rating reviews image')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ mode: 'given', reviews })
  } catch (err) {
    console.error('Error loading my reviews:', err)
    return res.status(500).json({ message: 'Failed to load reviews' })
  }
})

module.exports = router

