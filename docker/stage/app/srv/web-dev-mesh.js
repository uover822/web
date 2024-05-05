/* Copyright (c) 2014-2017 Richard Rodger and other contributors, MIT License */

let Seneca = require('seneca')
let app = require('../web.js')

Seneca({tag: 'web', timeout: 5000})
  //.test()
  //.test('print')
  //.use('monitor')
  .listen(9010)
  .client({pin:'role:mediator', port:9035})
  .use('mesh')
  .ready(function(){
    let server = app({seneca: this})
    //this.log.info(server.info)
  })
