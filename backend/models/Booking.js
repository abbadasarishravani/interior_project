const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    designerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designer', required: true },
    customerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    customerPhone: { type: String, required: true, trim: true },
    projectDescription: { type: String, default: '', trim: true },

    bookingType: { type: String, enum: ['online', 'offline'], required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'failed'], default: 'pending' },

    preferredDate: { type: String, default: '' },
    preferredTime: { type: String, default: '' },
    visitPlace: { type: String, default: '' },
    budgetRange: { type: String, default: '' },

    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amountPaise: { type: Number, default: null },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Booking', bookingSchema)

