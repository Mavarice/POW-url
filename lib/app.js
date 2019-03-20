// --------------------------------------------------------------------------------------------------------------------

// core
const path = require('path')
const crypto = require('crypto')

// npm
const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const favicon = require('serve-favicon')
const errorHandler = require('errorhandler')
const LogFmtr = require('logfmtr')
const yid = require('yid')
const dateFns = require('date-fns')
const rateLimit = require('express-rate-limit')
const ms = require('ms')
const validator = require('validator')

// local
const pkg = require('../package.json')
const env = require('./env.js')
const stats = require('./stats.js')
const api = require('./api.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

const log = LogFmtr.default()

const faviconFilename = path.join(__dirname, '..', 'public', 'favicon.ico')

// create the sitemap
const sitemap = [
  `${env.baseUrl}/`
]
const sitemapTxt = sitemap.join('\n') + '\n'

function createTsSig () {
  const ts = (new Date()).toISOString()
  const sig = crypto.createHmac('sha256', env.hmacSecretKey)
    .update(ts)
    .digest('hex')
  return { ts, sig }
}

function checkTsSig (ts, sig) {
  const sigCheck = crypto.createHmac('sha256', env.hmacSecretKey)
    .update(ts)
    .digest('hex')
  return sigCheck === sig
}

const limiter = rateLimit({
  // one hour
  windowMs: env.isProd ? ms('1 hour') : ms('1 min'),
  // limit to 10 requests per `windowMs`
  max: env.isProd ? 10 : 3
})

const validatorUrlOpts = {
  protocols: [ 'http', 'https' ],
  require_tld: true,
  require_protocol: true,
  require_host: true,
  require_valid_protocol: true,
  allow_underscores: false,
  host_whitelist: false,
  host_blacklist: false,
  allow_trailing_dot: false,
  allow_protocol_relative_urls: false,
  disallow_auth: true
}

// --------------------------------------------------------------------------------------------------------------------
// app

const app = express()
app.set('view engine', 'pug')
app.enable('strict routing')
app.enable('case sensitive routing')
app.disable('x-powered-by')
if (env.isProd) {
  app.enable('trust proxy')
}

app.locals.pkg = pkg
app.locals.env = env

// middleware
app.use(compression())
app.use(favicon(faviconFilename))
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// --------------------------------------------------------------------------------------------------------------------
// middleware

app.use((req, res, next) => {
  // add a Request ID
  req._rid = yid()

  // create a RequestID and set it on the `req.log`
  req.log = log.withFields({ rid: req._rid })

  next()
})

app.use(LogFmtr.middleware)

app.use((req, res, next) => {
  // From: http://blog.netdna.com/opensource/bootstrapcdn/accept-encoding-its-vary-important/
  res.setHeader('Vary', 'Accept-Encoding')

  next()
})

// --------------------------------------------------------------------------------------------------------------------
// routes

app.get(
  '/',
  (req, res) => {
    stats.home.inc()

    const hmac = createTsSig()
    res.render('index', {
      menu: 'home',
      ts: hmac.ts,
      sig: hmac.sig,
      form: {}
    })
  }
)

app.post(
  '/',
  limiter,
  async (req, res) => {
    // deconstruct all of the input fields
    console.log('body:', req.body)
    const { url, name, email, location, ts, sig } = req.body

    // before SPAM check that URL is defined
    if (url === '') {
      stats.blank.inc()
      const hmac = createTsSig()
      res.render('index', {
        ts: hmac.ts,
        sig: hmac.sig,
        menu: 'home',
        err: 'Provide a URL',
        form: {}
      })
      return
    }

    // and validate the URL itself
    const valid = validator.isURL(url, validatorUrlOpts)
    if (!valid) {
      stats.invalid.inc()
      const hmac = createTsSig()
      res.render('index', {
        ts: hmac.ts,
        sig: hmac.sig,
        menu: 'home',
        err: 'Invalid URL',
        form: {
          url
        }
      })
      return
    }

    // For SPAM, we're going to check the following:
    //
    // 1. the dummy field 'name' is (and should always be) blank/empty
    // 2. the dummy field 'email' is (and always should be) 'me@example.com'
    // 3. the dummy field 'location' is (and always should be) exactly the same as 'url'
    // 4. the field 'ts' is (and always should be) within the past 5 mins
    // 5. the signature field should be valid and dependent on the 'ts'
    //
    // Note: None of this stops people from adding spam links, it just won't
    // (or shouldn't) allow automated bots to do it.

    // 1. firstly check that the 'name' input is still blank
    if (name !== '') {
      stats.name.inc()
      res.send('Thanks')
      return
    }

    // 2. the dummy field 'email' is (and always should be) 'me@example.com'
    if (email !== 'me@example.com') {
      stats.email.inc()
      res.send('Thanks')
      return
    }

    // 3. the dummy field 'location' is (and always should be) exactly the same as 'url'
    if (location !== url) {
      stats.location.inc()
      res.send('Thanks')
      return
    }

    // 4. the field 'ts' is (and always should be) within the past 5 mins
    // check it actually looks like a timestamp e.g. '2019-03-18T20:05:42.276Z'
    if (!ts.match(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z$/)) {
      stats.tsinvalid.inc()
      res.send('Thanks')
      return
    }
    const diffInMins = dateFns.differenceInMinutes(new Date(ts), new Date())
    if (diffInMins < 0 || diffInMins > 5) {
      stats.tsold.inc()
      res.send('Thanks')
      return
    }

    // 5. the signature field should be valid and dependent on the 'ts'
    if (!checkTsSig(ts, sig)) {
      stats.sig.inc()
      res.send('Thanks')
      return
    }

    stats.shorten.inc()

    const result = await api.createUrl(url)
    if (!result.ok) {
      if (result.msg === 'Banned domain') {
        stats.banneddomain.inc()
      }
      const hmac = createTsSig()
      res.render('index', {
        ts: hmac.ts,
        sig: hmac.sig,
        menu: 'home',
        err: result.msg,
        form: {
          url: req.body.url
        }
      })
      return
    }

    // all okay
    res.redirect(`${env.baseUrl}/${result.payload.code}+`)
  }
)

app.get(
  '/stats',
  (req, res, next) => {
    let finished = false
    let got = 0
    let currentStats = {}

    // get some bits
    stats.pages.forEach((hitName) => {
      stats[hitName].values((err, data) => {
        if (finished) return
        if (err) {
          finished = true
          return next(err)
        }

        got += 1

        // save this hit
        data.forEach((hit) => {
          currentStats[hit.ts] = currentStats[hit.ts] || {}
          currentStats[hit.ts][hitName] = hit.val
        })

        // if we've got all the results, render the page
        if (got === stats.pages.length) {
          finished = true
          res.render('stats', { stats: currentStats, title: 'stats' })
        }
      })
    })
  }
)

app.get(
  '/:code',
  async (req, res, next) => {
    // firstly, see if we need to knock the last '+' off
    let codeOrPage = 'code'
    let code = req.params.code
    if (req.params.code.endsWith('+')) {
      codeOrPage = 'page'
      code = code.slice(0, code.length - 1)
    }

    // get this URL
    const result = await api.getUrl(code)
    if (!result.ok) {
      next(new Error(result.msg))
      return
    }

    // if not found
    if (!result.payload) {
      stats.notfound.inc()
      res.status(404).send('404 - Not Found')
      return
    }

    if (codeOrPage === 'code') {
      stats.expand.inc()
      res.redirect(result.payload.url, 301)
    } else {
      stats.view.inc()
      res.send('page')
    }
  }
)

app.get(
  '/sitemap.txt',
  (req, res) => {
    res.setHeader('Content-Type', 'text/plain')
    res.send(sitemapTxt)
  }
)

app.use((err, req, res, next) => {
  // connect.multipart() says the file is too big
  if (err.status === 413) {
    if (req.xhr) {
      const data = {
        ok: false,
        msg: 'File is too big, should be less than 5MB.'
      }
      return res.json(data)
    } else {
      res.setHeader('Content-Type', 'text/plain')
      return res.status(413).send('File is too big, should be less than 5MB.')
    }
  }
  next(err)
})

// error handlers
if (!env.isProd) {
  app.use(errorHandler({ dumpExceptions: true, showStack: true }))
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = app

// --------------------------------------------------------------------------------------------------------------------
