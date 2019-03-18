// ----------------------------------------------------------------------------

// local
const pkg = require('../package.json')

// ----------------------------------------------------------------------------
// setup

const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
const isDev = !isProd

const apex = process.env.APEX || pkg.name
const protocol = process.env.PROTOCOL || 'https'
const baseUrl = `${protocol}://${apex}`
const port = process.env.PORT || 3000

const hmacSecretKey = process.env.HMAC_SECRET_KEY

const databaseUrl = process.env.DATABASE_URL

const googleAnalytics = process.env.GOOGLE_ANALYTICS

// ----------------------------------------------------------------------------

module.exports = {
  apex,
  protocol,
  baseUrl,
  port,
  isProd,
  isDev,
  hmacSecretKey,
  databaseUrl,
  googleAnalytics
}

// ----------------------------------------------------------------------------
