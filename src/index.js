/* eslint-disable no-console */
const noop = () => {}
const defaults = {
  stop: {
    timeout: 10000,
    log: noop,
    logError: noop,
    exit: noop,
    exitError: noop,
  },
  shutdown: {
    timeout: 10000,
    log: console.log.bind(console),
    logError: console.error.bind(console),
    exit: () => process.exit(),
    exitError: () => process.exit(1),
  },
}

export default (handlers = [], opts = {}) => {
  const actualOpts = opts.shutdown ? {
    ...defaults.shutdown,
    ...opts,
  } : {
    ...defaults.stop,
    ...opts,
  }
  const {
    timeout,
    log,
    logError,
    exit,
    exitError,
  } = actualOpts

  let shutdownInProgress = false
  let forceExited = false
  let forcefulExitTimer

  const handleError = (err) => {
    logError('Error during shutdown')
    logError(err)
    if (err.stack) logError(err.stack)
    exitError()
    // If exitError doesn't call process.exit
    throw err
  }

  const forcefulExit = () => {
    forceExited = true
    logError('Forcefully shutting down.')
    exitError()
    // If exitError doesn't call process.exit
    return Promise.all(handlers.map(fn => fn({
      log,
      logError,
      forceful: true,
    })))
  }

  const gracefulExit = () => (
    Promise.all(handlers.map(fn => fn({ log, logError })))
      .then(() => {
        // FIXME: es6 doesn't support canceling promises :(
        if (forceExited) return
        clearTimeout(forcefulExitTimer)
        return exit()
      })
      .catch(handleError)
  )

  return () => {
    if (shutdownInProgress) {
      // This means gracefulShutdown was called twice
      // We force shutdown
      /* eslint-disable no-use-before-define */
      clearTimeout(forcefulExitTimer)
      return forcefulExit()
    }
    shutdownInProgress = true
    forcefulExitTimer = setTimeout(() => {
      logError(`Graceful shutdown timed out after ${timeout} ms.`)
      forcefulExit()
    }, timeout)

    log('Graceful shutdown requested.')
    // log('Enter Ctrl-C one more time to force shutdown.')
    return gracefulExit()
  }
}

export const stopHttpServer = (httpServer) => ({
  log = noop,
  forceful = false,
} = {}) => (
  new Promise((resolve, reject) => {
    if (forceful) {
      // TODO: keep track of new connections and destroy them
      return httpServer.close((err) => {
        if (err) return reject(err)
        resolve()
      })
    }
    httpServer.getConnections((err, count) => {
      if (err) return reject(err)
      if (count) {
        log(`Waiting for ${count} connection(s) to close`)
      }
      // Wait for connections to close...
      httpServer.close((_err) => {
        if (_err) return reject(_err)
        resolve()
      })
    })
  })
)

export const stopKnex = (knex) => () => knex.destroy()
