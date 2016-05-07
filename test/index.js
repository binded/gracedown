import test from 'blue-tape'

import gracedown, { stopHttpServer } from '../src'
import http from 'http'

/* eslint-disable no-console */

const skipForceful = (fn) => (opts) => {
  if (opts.forceful) return
  return fn(opts)
}

test('boilerplate', (t) => {
  const journal = []

  const httpServer = http.createServer((req, res) => res.end('ok'))
  httpServer.listen()

  const someTimeout = setTimeout(() => {
    journal.push('timeout called')
  }, 3000)

  const shutdown = gracedown([
    stopHttpServer(httpServer),
    // Custom shutdown procedure
    skipForceful(() => { clearTimeout(someTimeout) }),
  ], {
    timeout: 5000,
    exit: () => {
      journal.push('exit')
      t.deepEqual(journal, [
        'log: Graceful shutdown requested.',
        'exit',
      ])
      t.end()
    },
    exitError: () => {
      journal.push('exitError')
      console.error(journal)
      t.fail('failed exit')
    },
    log: (msg) => {
      journal.push(`log: ${msg}`)
    },
    logError: (msg) => {
      journal.push(`logError: ${msg}`)
    },
  })
  shutdown()
})

test('timeout shutdown', (t) => {
  const journal = []

  let timer
  const shutdown = gracedown([
    skipForceful(() => new Promise((resolve) => {
      timer = setTimeout(() => {
        journal.push('timeout called')
        resolve()
      }, 5000)
    })),
  ], {
    timeout: 100,
    exit: () => {
      journal.push('exit')
      console.error(journal)
      t.fail('should call exitError not exit')
    },
    exitError: () => {
      journal.push('exitError')
      t.deepEqual(journal, [
        'log: Graceful shutdown requested.',
        'logError: Graceful shutdown timed out after 100 ms.',
        'logError: Forcefully shutting down.',
        'exitError',
      ])
      clearTimeout(timer) // so test finishes more quickly
      t.end()
    },
    log: (msg) => {
      journal.push(`log: ${msg}`)
    },
    logError: (msg) => {
      journal.push(`logError: ${msg}`)
    },
  })
  shutdown()
})

test('force shutdown', (t) => {
  const journal = []
  let timer

  const shutdown = gracedown([
    skipForceful(() => new Promise((resolve) => {
      timer = setTimeout(resolve, 100000)
    })),
  ], {
    timeout: 500,
    exit: () => {
      journal.push('exit')
      console.error(journal)
      t.fail('should call exitError, not exit')
    },
    exitError: () => {
      journal.push('exitError')
      t.deepEqual(journal, [
        'log: Graceful shutdown requested.',
        'logError: Forcefully shutting down.',
        'exitError',
      ])
      clearTimeout(timer) // speed up test
      t.end()
    },
    log: (msg) => {
      journal.push(`log: ${msg}`)
    },
    logError: (msg) => {
      journal.push(`logError: ${msg}`)
    },
  })
  shutdown()
  // Second calls triggers forceful shut down
  shutdown()
})

test('http waiting 1 connection timeout', (t) => {
  const journal = []

  const httpServer = http.createServer((req, res) => {
    // we dont call res.end so the connection hangs...
    res.write('ongoing request')
    journal.push(req.url)
  })

  let httpClient

  const shutdown = gracedown([
    stopHttpServer(httpServer),
  ], {
    timeout: 500,
    exit: () => {
      journal.push('exit')
      console.error(journal)
      t.fail('should call exitError, not exit')
    },
    exitError: () => {
      journal.push('exitError')
      t.deepEqual(journal, [
        '/',
        'log: Graceful shutdown requested.',
        'log: Waiting for 1 connection(s) to close',
        'logError: Graceful shutdown timed out after 500 ms.',
        'logError: Forcefully shutting down.',
        'exitError',
      ])
      httpClient.abort()
      t.end()
    },
    log: (msg) => {
      journal.push(`log: ${msg}`)
    },
    logError: (msg) => {
      journal.push(`logError: ${msg}`)
    },
  })

  new Promise((resolve, reject) => {
    httpServer.listen((err) => {
      if (err) return reject(err)
      const httpPort = httpServer.address().port
      // this request will hang...
      httpClient = http.get(`http://localhost:${httpPort}`, (res) => {
        res.on('data', () => resolve())
      })
      httpClient.end()
    })
  }).then(() => {
    shutdown()
  })
})
