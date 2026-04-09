require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const dns = require('dns')

// Force Node's DNS resolver off localhost (common cause of ECONNREFUSED on Windows).
// You can override via DNS_SERVERS="8.8.8.8,1.1.1.1".
dns.setServers(
  (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .concat(['8.8.8.8', '1.1.1.1'])
    .filter((v, i, a) => a.indexOf(v) === i),
)
const dnsPromises = dns.promises

const authRoutes = require('./routes/auth')
const designerRoutes = require('./routes/designers')
const reviewRoutes = require('./routes/reviews')
const devRoutes = require('./routes/dev')
const bookingRoutes = require('./routes/bookings')

const app = express()

app.use(
  cors({
    // Reflect incoming Origin so Vercel preview/prod domains work without hardcoding.
    origin: true,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'InteriorConnect API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/designers', designerRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dev', devRoutes)
app.use('/api/test', require('./routes/test-auth'))

const PORT = process.env.PORT || 4000
const MONGO_URI = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/interiorconnect').trim()

const getMongoSrvHost = (uri) => {
  const prefix = 'mongodb+srv://'
  if (typeof uri !== 'string' || !uri.startsWith(prefix)) return null
  const rest = uri.slice(prefix.length)
  const atIdx = rest.lastIndexOf('@')
  const hostStart = atIdx >= 0 ? atIdx + 1 : 0
  const afterCreds = rest.slice(hostStart)
  const endIdx = afterCreds.search(/[/?#]/)
  return (endIdx === -1 ? afterCreds : afterCreds.slice(0, endIdx)).trim() || null
}

const maybeExplainSrvDnsError = async (err) => {
  const srvHost = getMongoSrvHost(MONGO_URI)
  if (!srvHost) return

  const msg = String(err?.message || '')
  if (!msg.includes('querySrv')) return

  const record = `_mongodb._tcp.${srvHost}`
  try {
    await dnsPromises.resolveSrv(record)
  } catch (dnsErr) {
    const code = dnsErr?.code || 'UNKNOWN'
    console.error(
      [
        'MongoDB Atlas SRV DNS lookup failed.',
        `- record: ${record}`,
        `- dns error: ${code}`,
        '',
        'This is usually caused by DNS/VPN/firewall/ad-blocking that blocks SRV lookups (UDP/TCP 53) or returns REFUSED.',
        'Fix options:',
        '- Switch your network DNS to 1.1.1.1 or 8.8.8.8, or disconnect VPN/ad-blocking DNS.',
        '- Or use Atlas "Standard connection string" (mongodb:// with explicit hosts) instead of mongodb+srv://.',
      ].join('\n'),
    )
  }
}

// Retry connection with exponential backoff
const connectDB = async (retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      console.log('✓ Connected to MongoDB')
      return true
    } catch (err) {
      console.warn(`MongoDB connection attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`)
      await maybeExplainSrvDnsError(err)
      if (i === retries - 1) {
        console.error('✗ Failed to connect to MongoDB after all retries', err.message)
        return false
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
}

connectDB().then((connected) => {
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`)
    if (!connected) {
      console.warn('⚠️  Server running but MongoDB is not connected. Database operations will fail.')
    }
  })
})

