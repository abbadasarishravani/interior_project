const express = require('express')
const mongoose = require('mongoose')
const auth = require('../middleware/auth')
const Booking = require('../models/Booking')

const router = express.Router()

// Create a booking (online/offline)
router.post('/create', auth(true), async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'User ID missing from token' })

    const {
      designerId,
      customerName,
      customerEmail,
      customerPhone,
      projectDescription,
      bookingType,
      preferredDate,
      preferredTime,
      visitPlace,
      budgetRange,
      status,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amountPaise,
      currency,
    } = req.body || {}

    if (!designerId || !mongoose.Types.ObjectId.isValid(designerId)) {
      return res.status(400).json({ message: 'Valid designerId is required' })
    }
    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ message: 'customerName, customerEmail, customerPhone are required' })
    }
    if (bookingType !== 'online' && bookingType !== 'offline') {
      return res.status(400).json({ message: 'bookingType must be online or offline' })
    }

    if (bookingType === 'offline') {
      if (!preferredDate) return res.status(400).json({ message: 'preferredDate is required for offline booking' })
      if (!visitPlace) return res.status(400).json({ message: 'visitPlace is required for offline booking' })
    }

    const booking = await Booking.create({
      designerId,
      customerUserId: userId,
      customerName,
      customerEmail,
      customerPhone,
      projectDescription: projectDescription || '',
      bookingType,
      status: status || (bookingType === 'online' ? 'confirmed' : 'pending'),
      preferredDate: preferredDate || '',
      preferredTime: preferredTime || '',
      visitPlace: visitPlace || '',
      budgetRange: budgetRange || '',
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      razorpaySignature: razorpaySignature || null,
      amountPaise: Number.isFinite(Number(amountPaise)) ? Number(amountPaise) : null,
      currency: currency || 'INR',
    })

    return res.status(201).json({ message: 'Booking created', booking })
  } catch (err) {
    console.error('Booking create failed:', err)
    return res.status(500).json({ message: 'Error while submitting consultancy form' })
  }
})

module.exports = router

