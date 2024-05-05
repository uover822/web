const hapi       = require('@hapi/hapi')
const vision     = require('@hapi/vision')
const inert      = require('@hapi/inert')
const handlebars = require('handlebars')
const cookie     = require('@hapi/cookie')
const client = require('prom-client')
const ip = require('ip')
const uniqid = require('uniqid')

const registry = new client.Registry()

/*
const internals = {
  uuid: 1             // Use seq instead of proper unique identifiers for demo only
}

internals.login = async (request, h) => {

  if (request.auth.isAuthorized) {

    return h.redirect('/')
  }

  let message = ''
  let account = null
  let s = request.server.seneca

  if (request.method === 'post') {
    if (!request.payload.username ||
        !request.payload.password) {
      message = ' '
    }
    else {
      let u = await s.post('sys:user,get:user', {
        handle: request.payload.username
      })
      if (!u.ok && !u.user)
        u = await s.post('sys:user,register:user', {
          handle: request.payload.username
        })
      
      let l = await s.post('sys:user,login:user', {
        handle: request.payload.username,
        auto: true
      })
      if (l.ok)
        account = request.payload.username
      else
        message = 'Invalid username or password';
    }
  }

  if (request.method === 'get' ||
      message) {

    return '<html><head><title>Login page</title></head><body>' +
      (message ? '<h3>' + message + '</h3><br/>' : '') +
      '<form method="post" action="/login">' +
      '<div style="position:absolute;bottom:30px;right:10px;">' +
      'Username: <input type="text" name="username"><br>' +
      'Password: <input type="password" name="password"><br/>' +
      '<input type="submit" value="Login"></div></form></body></html>';
  }

  const sid = String(++internals.uuid)

  await request.server.app.cache.set(sid, { account }, 0)
  request.cookieAuth.set({ sid })

  return h.redirect('/')
}

internals.logout = async (request, h) => {

  let s = request.server.seneca
  await s.post('sys:user,logout:user', {
    handle: request.auth.credentials
  })
  
  request.server.app.cache.drop(request.state['sid-example'].sid)
  request.cookieAuth.clear()

  return h.redirect('/')
}
*/

module.exports = async (options) => {

  try {
    let folder = options.folder || __dirname
    
    let server = new hapi.Server({
      port: options.port || 8000
    })

    let gauges = {}

    function pack (begin_ts, end_ts) {
      // pack begin_ts with 1/ e_tm
      let pe_tm = 1 / (end_ts - begin_ts)
    return begin_ts + pe_tm
    }

    await server.register(vision)
    await server.register(inert)
    //await server.register(cookie)

    let Seneca = options.seneca
    server.seneca = Seneca
    let Promise = require('bluebird')
    let senact = Promise.promisify(Seneca.act, {context: Seneca})

    let particles = []
    let magnets = []
    let springs = []

    client.collectDefaultMetrics({registry})

    /*
    const cache = server.cache({ segment: 'sessions', expiresIn: 3 * 24 * 60 * 60 * 1000 })
    server.app.cache = cache

    server.auth.strategy('session', 'cookie', {
      cookie: {
        name: 'sid-example',
        password: 'password-should-be-32-characters',
        isSecure: false
      },
      redirectTo: '/login',
      validateFunc: async (request, session) => {

        const cached = await cache.get(session.sid)
        const out = {
          valid: !!cached
        }

        if (out.valid) {
          out.credentials = cached.account
        }

        return out
      }
    })

    server.auth.default('session')
    */

    server.views({
      engines: {html: handlebars},
      path: folder + '/www',
      layout: true
    })

    server.route([{
        method: 'GET',
        path: '/', 
        config: {handler: (request, reply) => {
          return reply.view('index', {title: 'msr'})
        }}
      },
      /*
      {method: ['GET', 'POST'],
       path: '/login',
       config: { handler: internals.login, auth: {mode: 'try'}, plugins: {'hapi-auth-cookie': {redirectTo: false}}}},
      {method: 'GET', path: '/logout', config: {handler: internals.logout}},
      */
      {
        method: 'GET',
        path: '/{path*}',
        handler: {
          directory: {
            path: folder + '/www',
          }
        }
      }
    ])

    server.route({
      method: 'GET',
      path: '/healthy',
      handler: (request, reply) => {
        return 'yup'
      }
    })

    server.route({
      method: 'GET',
      path: '/api/associate.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:associate,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({
      method: 'GET',
      path: '/api/descriptor.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:descriptor,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({
      method: 'GET',
      path: '/api/mediator.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:mediator,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({ 
      method: 'GET',
      path: '/api/properties.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:properties,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({ 
      method: 'GET',
      path: '/api/reason.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:reason,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({ 
      method: 'GET',
      path: '/api/relation.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:relation,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({ 
      method: 'GET',
      path: '/api/store.metrics.collect',
      handler: async (request, reply) => {
        return await senact('role:store,cmd:metrics.collect',
                            {}).then ((o) => {
                              return o.result
                            })
      }
    })

    server.route({ 
      method: 'GET',
      path: '/api/web.metrics.collect',
      handler: async (request, reply) => {
        return await registry.metrics()
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/metaroot.rcv',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['metaroot.rcv.ts'])
          gauges['metaroot.rcv.ts'] = new client.Gauge({
            name: 'perf_web_metaroot_rcv_ts',
            help: 'ts when receiving a metaroot',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let r = (await senact('role:mediator,cmd:metaroot.rcv',
                                    //d).then ((o) => {
                                    {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                      return o
                                    }))

        gauges['metaroot.rcv.ts'].set({event:'metaroot.rcv', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return r
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.add',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.add.ts'])
          gauges['descriptor.add.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_add_ts',
            help: 'ts when adding a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.add',
                              {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['descriptor.add.ts'].set({event:'descriptor.add', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.instantiate',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.instantiate.ts'])
          gauges['descriptor.instantiate.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_instantiate_ts',
            help: 'ts when instantiating a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.instantiate',
                            {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                              return o
                            }))

        gauges['descriptor.instantiate.ts'].set({event:'descriptor.instantiate', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.push',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.push.ts'])
          gauges['descriptor.push.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_push_ts',
            help: 'ts when pushing a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.push',
                              {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['descriptor.push.ts'].set({event:'descriptor.push', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.get',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.get.ts'])
          gauges['descriptor.get.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_get_ts',
            help: 'ts when getting a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.get',
                              {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['descriptor.get.ts'].set({event:'descriptor.get', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.rcv',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.rcv.ts'])
          gauges['descriptor.rcv.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_rcv_ts',
            help: 'ts when receiving a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.rcv',
                              {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['descriptor.rcv.ts'].set({event:'descriptor.rcv', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.drp',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.drp.ts'])
          gauges['descriptor.drp.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_drp_ts',
            help: 'ts when dropping a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.drp',
                              {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['descriptor.drp.ts'].set({event:'descriptor.drp', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/descriptor.rsn',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['descriptor.rsn.ts'])
          gauges['descriptor.rsn.ts'] = new client.Gauge({
            name: 'perf_web_descriptor_rsn_ts',
            help: 'ts when reasoning a descriptor',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let descriptor = request.payload
        let cid = uniqid()
        let d = (await senact('role:mediator,cmd:descriptor.rsn',
                              {descriptor:descriptor, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['descriptor.rsn.ts'].set({event:'descriptor.rsn', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return d
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/properties.upd',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['properties.upd.ts'])
          gauges['properties.upd.ts'] = new client.Gauge({
            name: 'perf_web_properties_upd_ts',
            help: 'ts when updating properties',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let properties = request.payload
        let cid = uniqid()
        let ps = (await senact('role:mediator,cmd:properties.upd',
                               {properties:properties, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                 return o
                               }))

        gauges['properties.upd.ts'].set({event:'properties.upd', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return ps
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/associate.add',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['associate.add.ts'])
          gauges['associate.add.ts'] = new client.Gauge({
            name: 'perf_web_associate_add_ts',
            help: 'ts when adding an associate',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let associate = request.payload
        let cid = uniqid()
        let a = (await senact('role:mediator,cmd:associate.add',
                              {associate:associate, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['associate.add.ts'].set({event:'associate.add', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return a
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/associate.drp',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['associate.drp.ts'])
          gauges['associate.drp.ts'] = new client.Gauge({
            name: 'perf_web_associate_drp_ts',
            help: 'ts when dropping an associate',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let associate = request.payload
        let cid = uniqid()
        let a = (await senact('role:mediator,cmd:associate.drp',
                              {associate:associate, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['associate.drp.ts'].set({event:'associate.drp', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return a
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/relation.add',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['relation.add.ts'])
          gauges['relation.add.ts'] = new client.Gauge({
            name: 'perf_web_relation_add_ts',
            help: 'ts when adding a relation',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let relation = request.payload
        let cid = uniqid()
        let r = (await senact('role:mediator,cmd:relation.add',
                              {relation:relation, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['relation.add.ts'].set({event:'relation.add', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return r
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/relation.get',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['relation.get.ts'])
          gauges['relation.get.ts'] = new client.Gauge({
            name: 'perf_web_relation_get_ts',
            help: 'ts when getting a relation',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let relation = request.payload
        let cid = uniqid()
        let r = (await senact('role:mediator,cmd:relation.get',
                            {relation:relation, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                              return o
                            }))

        gauges['relation.get.ts'].set({event:'relation.get', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return r
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/relation.upd',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['relation.upd.ts'])
          gauges['relation.upd.ts'] = new client.Gauge({
            name: 'perf_web_relation_upd_ts',
            help: 'ts when updating a relation',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let relation = request.payload
        let cid = uniqid()
        let r = (await senact('role:mediator,cmd:relation.upd',
                              {relation:relation, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                                return o
                              }))

        gauges['relation.upd.ts'].set({event:'relation.upd', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return r
      }
    })

    server.route({ 
      method: 'POST',
      path: '/api/relation.drp',
      handler: async (request, reply) => {

        let begin_ts = Date.now()

        if (!gauges['relation.drp.ts'])
          gauges['relation.drp.ts'] = new client.Gauge({
            name: 'perf_web_relation_drp_ts',
            help: 'ts when dropping a relation',
            labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        let relation = request.payload
        let cid = uniqid()
        let r = (await senact('role:mediator,cmd:relation.drp',
                            {relation:relation, cid:cid, auth:{user:'john', groups:['staff']}}).then ((o) => {
                              return o
                            }))

        gauges['relation.drp.ts'].set({event:'relation.drp', return_code:'200', service:'web', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:cid}, pack(begin_ts, Date.now()))

        return r
      }
    })

    server.start()

    return server
  }
  catch(e) {
    console.error(e)
  }
}
