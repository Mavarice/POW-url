// ----------------------------------------------------------------------------

// npm
const redis = require('redis')
const rustle = require('rustle')

// local
const pkg = require('../package.json')

// ----------------------------------------------------------------------------

// redis
const client = redis.createClient()

const stats = {}

const pages = [ 'home', 'shorten', 'expand' ];
pages.forEach((name) => {
  stats[name] = rustle({
    client       : client,
    domain       : pkg.name,        // \
    category     : 'hits',          //  >- Keys: "<domain>:<category>:<name>"
    name         : name,            // /
    period       : 24 * 60 * 60,    // one day
    aggregation  : 'sum',
  })
})

stats.pages = pages

// --------------------------------------------------------------------------------------------------------------------

module.exports = stats

// --------------------------------------------------------------------------------------------------------------------
