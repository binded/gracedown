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

Returns a function which can be used with `process.on('SIGTERM', fn)` and `process.on('SIGINT', fn)`.

- **handlers**: array of shutdown functions
- **opts**: configuration object
- **opts.timeout**: timeout in ms before forceful shutdown with exit code 1 (defaults to 10000)
- **opts.log**: logging function (defaults to `console.log`)
- **opts.logError**: logging function for errors (defaults to `console.error`)
- **opts.exit**: exit function (defaults to `process.exit()`)
- **opts.exitError**: exit function (defaults to `process.exit(1)`)

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
], { timeout: 5000 })

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```
