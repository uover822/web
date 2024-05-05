FROM msr-shared:1
FROM node:18.17.1
ADD app /app/
WORKDIR app
#RUN npm i -g npm@9.7.2
RUN npm install -f; sed -i s/remove_cv_t/remove_cv/ /root/.cache/node-gyp/18.17.1/include/node/v8-internal.h
RUN npm install seneca lodash @hapi/hapi @hapi/cookie @hapi/vision @hapi/inert handlebars seneca-entity seneca-promisify bluebird prom-client uniqid ip
#RUN npm install seneca lodash @hapi/hapi @hapi/cookie @hapi/vision @hapi/inert handlebars seneca-zipkin-tracer seneca-statsd seneca-entity seneca-jsonfile-store @seneca/user@6.2.0 seneca-promisify bluebird prom-client uniqid ip
RUN mv -f logging.js node_modules/seneca/lib; mv -f user.js node_modules/@seneca/user; mv -f jsonfile-store.js node_modules/seneca-jsonfile-store
CMD ["node", "/app/srv/web-stage.js"]
