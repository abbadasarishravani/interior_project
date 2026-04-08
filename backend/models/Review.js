const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Designer', required: true },
  },
  { timestamps: true },
)

// One review per user per design (customer can edit their review)
reviewSchema.index({ user: 1, design: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)