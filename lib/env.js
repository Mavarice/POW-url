// ----------------------------------------------------------------------------

// local
const pkg = require('../package.json')

// ----------------------------------------------------------------------------
// setup

const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
const isDev = !isProd

const apex = pkg.name
const protocol = process.env.PROTOCOL || 'https'
const baseUrl = `${protocol}://${apex}`
const port = process.env.PORT || 3000

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
  databaseUrl,
  googleAnalytics,
}

// ----------------------------------------------------------------------------
