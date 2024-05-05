let Seneca = require('seneca')
let app = require('../web.js')

Seneca({tag: 'web', timeout: 60000})
//.test('print')
  .use('promisify')
/*
  .use('entity')
  .use('jsonfile-store', {folder: '/opt/msr/data'})
  .use('user')
*/
  .listen(8020)
  .client({pin:'role:associate', port:8005})
  .client({pin:'role:descriptor', port:8015})
  .client({pin:'role:mediator', port:8025})
  .client({pin:'role:properties', port:8030})
  .client({pin:'role:reason', port:8035})
  .client({pin:'role:relation', port:8040})
  .client({pin:'role:store', port:8045})
  .ready(function(){
    let server = app({seneca: this})
    //this.log.info(server.info)
  })
