// ----------------------------------------------------------------------------

"use strict"

// core
const path = require('path')

// npm
const pg = require('pg')
const pgpatcher = require('pg-patcher')
const pgx = require('pg-x')
const log = require('logfmtr').default()

// local
const env = require('./env.js')

// ----------------------------------------------------------------------------
// setup

const databasePatchLevel = 3

// create a pool
const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  idleTimeoutMillis: env.isProd ? 1000 : 60 * 1000,
})

function patch(callback) {
  log.info({ level : databasePatchLevel }, 'patching-database')

  const opts = {
    dir: path.join(__dirname, '..', 'schema'),
    logger: console.log.bind(console),
  }
  pgpatcher(pool, databasePatchLevel, opts, callback)
}

// ----------------------------------------------------------------------------

module.exports = {
  // `pg.Pool`
  pool,
  // patch
  patch,
}

// ----------------------------------------------------------------------------
