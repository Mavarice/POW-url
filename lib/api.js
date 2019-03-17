// ----------------------------------------------------------------------------

'use strict'

// core
const path = require('path')

// npm
const pg = require('pg')
const pgpatcher = require('pg-patcher')
const log = require('logfmtr').default()
const zid = require('zid')

// local
const env = require('./env.js')

// ----------------------------------------------------------------------------
// setup

const databasePatchLevel = 3

// create a pool
const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  idleTimeoutMillis: env.isProd ? 1000 : 60 * 1000
})

function patch (callback) {
  log.info({ level: databasePatchLevel }, 'patching-database')

  return new Promise((resolve, reject) => {
    const opts = {
      dir: path.join(__dirname, '..', 'schema'),
      logger: console.log.bind(console)
    }
    pgpatcher(pool, databasePatchLevel, opts, (err) => {
      if (err) {
        return callback ? callback(err) : reject(err)
      }
      return callback ? callback() : resolve()
    })
  })
}

// ----------------------------------------------------------------------------
// URLs

const insUrlSql = 'INSERT INTO url(code, url) VALUES($1, $2) RETURNING *'

async function createUrl (url) {
  try {
    const params = [ zid(6), url ]
    const result = await pool.query(insUrlSql, params)
    return {
      ok: true,
      payload: result.rows[0]
    }
  } catch (err) {
    console.error(err)
    return {
      ok: false,
      msg: 'Internal Server Error'
    }
  }
}

const getUrlSql = 'SELECT * FROM url WHERE code = $1'

async function getUrl (url) {
  try {
    const params = [ url ]
    const result = await pool.query(getUrlSql, params)
    return {
      ok: true,
      msg: result.rows.length ? 'Retrieved' : 'Not Found',
      payload: result.rows.length ? result.rows[0] : null
    }
  } catch (err) {
    console.error(err)
    return {
      ok: false,
      msg: 'Internal Server Error'
    }
  }
}

// ----------------------------------------------------------------------------

module.exports = {
  // general
  pool,
  patch,
  // insUrl
  createUrl,
  getUrl
}

// ----------------------------------------------------------------------------
