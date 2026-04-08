const { verifyToken } = require('../utils/jwt')

function auth(required = true, roles = []) {
  return (req, res, next) => {
    // Extract token from Authorization header (ONLY source of truth)
    let token = null
    const authHeader = req.headers.authorization || req.headers.Authorization
    
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ')
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1]
      }
    }

    console.log(`[Auth] ${req.method} ${req.path} - Token: ${token ? 'YES' : 'NO'}`)

    if (!token) {
      if (!required) {
        console.log(`[Auth] ${req.path} - Optional auth, continuing without user`)
        return next()
      }
      console.log(`[Auth] ${req.path} - Required auth missing`)
      return res.status(401).json({ message: 'No token. Please log in.' })
    }

    try {
      const payload = verifyToken(token)
      req.user = payload

      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ message: 'Access denied' })
      }

      return next()
    } catch (err) {
      console.error(`[Auth] ✗ Token verification failed: ${err.message}`)
      if (!required) return next()
      return res.status(401).json({ message: `Token error: ${err.message}` })
    }
  }
}

module.exports = auth

