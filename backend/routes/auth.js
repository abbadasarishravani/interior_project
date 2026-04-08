const express = require('express')
const crypto = require('crypto')
const User = require('../models/User')
const auth = require('../middleware/auth')
const { createToken, verifyToken } = require('../utils/jwt')

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    console.log('[Register] Request received:', { email, hasName: !!name, hasPassword: !!password, role })
    
    if (!name || !email || !password) {
      console.warn('[Register] Validation failed - missing fields')
      return res.status(400).json({ message: 'Name, email and password required' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      console.warn('[Register] Email already in use:', email)
      return res.status(400).json({ message: 'Email already in use' })
    }

    const passwordHash = await User.hashPassword(password)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role === 'designer' ? 'designer' : 'customer',
    })

    const token = createToken(user)
    console.log('[Register] ✓ User created:', { id: user._id, email: user.email, hasToken: !!token })
    
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    })
  } catch (err) {
    console.error('[Register] Error:', err.message)
    res.status(500).json({ message: 'Registration failed: ' + err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    console.log('[Login] Request for:', email)
    
    const user = await User.findOne({ email })
    if (!user) {
      console.warn('[Login] User not found:', email)
      return res.status(400).json({ message: 'Invalid credentials' })
    }
    
    const ok = await user.comparePassword(password)
    if (!ok) {
      console.warn('[Login] Password mismatch for:', email)
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = createToken(user)
    console.log('[Login] ✓ Login successful:', { id: user._id, email, hasToken: !!token })
    
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    })
  } catch (err) {
    console.error('[Login] Error:', err.message)
    res.status(500).json({ message: 'Login failed: ' + err.message })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out' })
})

router.get('/me', async (req, res) => {
  try {
    // Get token from Authorization header (Bearer) first, then cookies
    let token = null
    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ')
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1]
      }
    }
    if (!token) {
      token = req.cookies.token
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    
    const decoded = verifyToken(token)
    const user = await User.findById(decoded.id).select('-passwordHash')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo || null,
      },
    })
  } catch (err) {
    console.error('Auth /me error:', err.message)
    res.status(401).json({ message: err.message || 'Invalid token' })
  }
})

// Optional profile photo update (stored as a data URL string)
router.post('/photo', auth(true), async (req, res) => {
  try {
    const { photo } = req.body || {}
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'User ID missing from token' })

    if (photo !== undefined && photo !== null && typeof photo !== 'string') {
      return res.status(400).json({ message: 'photo must be a string' })
    }

    // Allow clearing the photo by sending null / empty string.
    const trimmed = typeof photo === 'string' ? photo.trim() : ''
    const nextPhoto = trimmed ? trimmed : null

    // Very small safety check to avoid storing huge payloads.
    if (nextPhoto && nextPhoto.length > 1_000_000) {
      return res.status(400).json({ message: 'Photo is too large' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.photo = nextPhoto
    await user.save()

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo || null,
      },
    })
  } catch (err) {
    console.error('Auth /photo error:', err.message)
    res.status(500).json({ message: 'Failed to update photo' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    console.log('[ForgotPassword] Request for:', email)
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      // For security, don't reveal if email exists - just return success
      console.log('[ForgotPassword] User not found:', email)
      return res.json({ message: 'If this email exists, a reset link will be sent' })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour expiry

    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    // In a real app, send email with reset link
    // For demo, log it
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`
    console.log('[ForgotPassword] ✓ Reset token generated for:', email)
    console.log('[ForgotPassword] Reset URL (for demo):', resetUrl)
    console.log('[ForgotPassword] Token:', resetToken)

    res.json({
      message: 'If this email exists, a password reset link will be sent. (Check console for demo token)',
      token: resetToken, // Return for demo purposes only - remove in production
      resetUrl: resetUrl, // Demo only
    })
  } catch (err) {
    console.error('[ForgotPassword] Error:', err.message)
    res.status(500).json({ message: 'Failed to process forgot password request' })
  }
})

router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body
    console.log('[VerifyResetToken] Verifying token')

    if (!token) {
      return res.status(400).json({ message: 'Token is required' })
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    console.log('[VerifyResetToken] ✓ Token valid for:', user.email)
    res.json({ message: 'Token is valid', email: user.email })
  } catch (err) {
    console.error('[VerifyResetToken] Error:', err.message)
    res.status(500).json({ message: 'Failed to verify token' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    console.log('[ResetPassword] Attempting password reset with token')

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' })
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    // Update password
    user.passwordHash = await User.hashPassword(password)
    user.resetToken = null
    user.resetTokenExpiry = null
    await user.save()

    console.log('[ResetPassword] ✓ Password reset successfully for:', user.email)
    res.json({ message: 'Password has been reset successfully' })
  } catch (err) {
    console.error('[ResetPassword] Error:', err.message)
    res.status(500).json({ message: 'Failed to reset password' })
  }
})

module.exports = router

