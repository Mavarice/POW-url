// --------------------------------------------------------------------------------------------------------------------

// core
const path = require('path')

// npm
const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const favicon = require('serve-favicon')
const errorHandler = require('errorhandler')
const LogFmtr = require('logfmtr')
const yid = require('yid')

// local
const pkg = require('../package.json')
const env = require('./env.js')
const stats = require('./stats.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

const log = LogFmtr.default()

const faviconFilename = path.join(__dirname, '..', 'public', 'favicon.ico')

// create the sitemap
const sitemap = [
  `${env.baseUrl}/`
]
const sitemapTxt = sitemap.join('\n') + '\n'

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
    res.render('index', {
      menu: 'home'
    })
  }
)

app.post(
  '/',
  (req, res) => {
    stats.shorten.inc()
    res.render('index', {
      menu: 'home'
    })
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
