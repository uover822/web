# web

[![Build Status](https://travis-ci.org/msr/web.svg?branch=master)](https://travis-ci.org/msr/web)
[![Gitter Chat](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/msr/org)

This is a repository in the microservice demonstration system for
the [Tao of Microservices](//bit.ly/rmtaomicro) book (chapter 9). This
code is live at [msr.com](http://msr.com). To get started,
visit the [msr/tao](//github.com/msr/tao) repository.

__This microservice provides the web functionality.__


## Running

To run this microservice normally, use the tooling describing in
the [msr/tao](//github.com/msr/tao) repository, which shows you how to run
the entire system of microservices (of which this is only one of many) in
production ([Kubernetes](//kubernetes.io)), staging
([Docker](//docker.com)), and development
([fuge](//github.com/apparatus/fuge)) modes.

To run from the terminal for testing and debugging, see
the [Running from the terminal](#running-from-the-terminal) section
below.


## Message flows

The table shows how this microservice acts on the `Accepted` message
patterns and performs appropriate business `Actions`, as a result of
which, new messages are possibly `Sent`.

|Accepted |Actions |Sent
|--|--|--
|`role:web,cmd:insert (AO)` |Insert an entry into the web engine | cmd:add,role:web
|`role:web,cmd:web (SC)` |Provide a list of results |

(KEY: A: asynchronous, S: synchronous, O: observed, C: consumed)

### Service interactions

![web](web.png?raw=true "web")


## Testing

Unit tests are in the [test](test) folder. To run, use:

```sh
$ npm test
```

Note that this is a learning system, and the tests are not intended to
be high coverage.


## Running from the terminal

This microservice is written in [node.js](//nodejs.org), which you
will need to download and install. Fork and checkout this repository,
and then run `npm` inside the repository folder to install its dependencies:

```sh
$ npm install
```

To run this microservice separately, for development, debug, or
testing purposes, use the service scripts in the [`srv`](srv) folder:

* [`web-dev.js`](srv/web-dev.js) : run the development configuration
  with hard-coded network ports.

  ```sh
  $ node srv/web-dev.js
  ```

  This script listens for messages on port 9020 and provides a REPL on
  port 10020 (try `$ telnet localhost 10020`).

  A [seneca-mesh](//github.com/senecajs/seneca-mesh) version, for
  testing purposes, is also shown in the
  script [`web-dev-mesh.js`](srv/web-dev-mesh.js). For more on
  this, see the [repl](//github.com/msr/repl)
  repository.

* [`web-stage.js`](srv/web-stage.js) : run the staging
  configuration. This configuration is intended to run in a Docker
  container so listens on port 9000 by default, but you can change
  that by providing an optional argument to the script.

  ```sh
  $ node srv/web-stage.js [PORT]
  ```

* [`web-prod.js`](srv/web-prod.js) : run the production
  configuration. This configuration is intended to run under
  Kubernetes in a [seneca-mesh](//github.com/senecajs/seneca-mesh)
  network. If running in a terminal (only do this for testing), you'll
  need to provide the mesh base nodes in the `BASES` environment
  variable.

  ```sh
  $ BASES=x.x.x.x:port node srv/web-prod.js
  ```
