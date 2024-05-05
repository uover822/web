/* Copyright (c) 2014-2017 Richard Rodger and other contributors, MIT License */

let MOCK_SEARCH = JSON.parse(process.env.MOCK_SEARCH || 'false')
let MOCK_INFO = JSON.parse(process.env.MOCK_INFO || 'false')
let MOCK_SUGGEST = JSON.parse(process.env.MOCK_SUGGEST || 'false')
let MOCK = MOCK_SEARCH || MOCK_INFO || MOCK_SUGGEST

let Seneca = require('seneca')
let app = require('../web.js')

Seneca({tag: 'web', timeout: 5000})
//.test('print')
  .use('promisify')
  .use('entity')
/*
  .use('jsonfile-store', {folder: '/opt/data'})
  .use('user')
*/
  .listen(9020)
  .client({pin:'role:associate', port:9005})
  .client({pin:'role:descriptor', port:9015})
  .client({pin:'role:mediator', port:9025})
  .client({pin:'role:properties', port:9030})
  .client({pin:'role:reason', port:9035})
  .client({pin:'role:relation', port:9040})
  .client({pin:'role:store', port:9045})
  .ready(function(){
    let server = app({seneca: this})
    //this.log.info(server.info)
  })

// Run mock services that this service depends on.
if (MOCK) {
  let mock = Seneca({tag:'mock'})
        .test('print')

  if (MOCK_SEARCH) {
    mock
    .listen(9020)
    .add('role:search', function (msg, reply) {
      reply({

        // Create fake results using each term of the query.
        items: msg.query.split(/\s+/).map(function (term) {
          return {name:term, version:'1.0.0', desc:term+'!'}
        })
      })
    })
  }

  if (MOCK_INFO) {
    mock
    .listen(9030)
    .add('role:info', function (msg, reply) {
      reply({npm:{name:msg.name, version:'1.0.0'}})
    })
  }

  if (MOCK_SUGGEST) {
    mock
    .listen(9060)
    .add('role:suggest', function (msg, reply) {
      reply(msg.query.split(''))
    })
  }
}
