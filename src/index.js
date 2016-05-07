/* eslint-disable no-console */
const defaults = {
  log: console.log.bind(console),
  logError: console.error.bind(console),
  exit: () => process.exit(),
  exitError: () => process.exit(1),
  timeout: 10000,
}

export default (handlers = [], {
  timeout = defaults.timeout,
  log = defaults.log,
  logError = defaults.logError,
  exit = defaults.exit,
  exitError = defaults.exitError,
} = {}) => {
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
        exit()
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
  log = () => {},
  forceful = false,
} = {}) => (
  new Promise((resolve, reject) => {
    if (forceful) {
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
      httpServer.close((_err) => {
        if (_err) return reject(_err)
        resolve()
      })
    })
  })
)

