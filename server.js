// ----------------------------------------------------------------------------

// core
const http = require('http')

// npm
const log = require('logfmtr').default()

// local
const env = require('./lib/env.js')
const app = require('./lib/app.js')
const api = require('./lib/api.js')

// ----------------------------------------------------------------------------
// setup

log.info('started')
console.log('===============================================================================')
console.log('env:', env)
console.log('===============================================================================')

if (env.isDev) {
  log.info(env, 'env')
}

// ----------------------------------------------------------------------------
// housekeeping

// function cleanup(callback) {
//   console.log('Closing server ...')
//   server.close(() => {
//     console.log('Server Closed')

//     console.log('Closing Database ...')
//     api.close((err) => {
//       if (err) {
//         console.warn(err)
//         return callback(err)
//       }
//       console.log('Database Closed')
//       callback()
//     })
//   })
// }

function cleanup (callback) {
  setTimeout(callback, 100)
}

// we'll get this from nodemon in development
process.once('SIGUSR2', () => {
  log.info('SIGUSR2')
  cleanup((err) => {
    console.log('Finished')
    if (err) {
      console.warn(err)
    }
    process.kill(process.pid, 'SIGUSR2')
  })
})

process.on('SIGTERM', () => {
  log.info('SIGTERM')
  cleanup((err) => {
    console.log('Finished')
    if (err) {
      console.warn(err)
    }
    process.exit(err ? 2 : 0)
  })
})

process.on('SIGINT', () => {
  log.info('SIGINT')
  cleanup((err) => {
    console.log('Finished')
    if (err) {
      console.warn(err)
    }
    process.exit(err ? 2 : 0)
  })
})

// ----------------------------------------------------------------------------
// server

api.patch((err) => {
  if (err) {
    log.error(err, 'database-patch-failed')
    return process.exit(2)
  }

  log.info('database-patched')

  // server
  const server = http.createServer()
  server.on('request', app)

  const port = env.port
  server.listen(port, () => {
    log.info({ port }, 'listening')
  })
})

// ----------------------------------------------------------------------------
