# gracedown

[![Build Status](https://travis-ci.org/blockai/gracedown.svg?branch=master)](https://travis-ci.org/blockai/gracedown)

Collection of consolidated graceful/forceful shutdown procedures for
common Node.js libraries.

Currently supports:

- http server / express
- send PR for more!

## Install

```
npm install --save gracedown
```

## Usage

### gracedown(handlers, [, opts])

Returns a function which can be called to gracefully shutdown your application.

The returned function doesn't call `process.exit` or output any text by
default, unless `opts.shutdown` is set to true.

- **handlers**: array of [shutdown handlers](#shutdown-handlers)
- **opts.shutdown**: if true, changes default option values (defaults to `false`)
- **opts.timeout**: timeout in ms before forceful shutdown (defaults to `10000`)
- **opts.log**: logging function
- **opts.logError**: logging function for errors
- **opts.exit**: exit function
- **opts.exitError**: exit function on error

Default values if `shutdown` is `false`:

```javascript
// where noop = () => {}
{
  timeout: 10000,
  log: noop,
  logError: noop,
  exit: noop,
  exitError: noop,
}
```

Default values if `shutdown` is `true`:

```javascript
{
  timeout: 10000,
  log: console.log.bind(console),
  logError: console.error.bind(console),
  exit: () => process.exit(),
  exitError: () => process.exit(1),
}
```

### shutdownHandler(opts)

Handlers are Promise-returning functions which take the following options object:

- **opts.log** and **opts.logError**: same as above
- **opts.forceful**: `true` if we want to shutdown as quick as possible (defaults to `false`).
    For example, the http server handle doesn't wait for connections to
    close if this is true.

### Shutdown Handlers

The following functions return shutdown handlers for common Node.js
libraries/modules.

#### stopHttpServer(httpServer)

**httpServer**: Node.js http server instance

## Example

```javascript
import gracedown, { stopHttpServer } from 'gracedown'
import http from 'http'

const httpServer = http.createServer((req, res) => res.end('ok'))
httpServer.listen()

const someTimeout = setTimeout(() => {
  console.log('timeout called')
}, 3000)

const shutdown = gracedown([
  stopHttpServer(httpServer),
  // Custom shutdown procedure
  () => {
    clearTimeout(someTimeout)
  }
], { timeout: 5000, shutdown: true })

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```
