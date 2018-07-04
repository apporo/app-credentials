'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const fs = require('fs');
const request = require('request');

function EntrypointRestStore(params) {
  params = params || {};

  let {L, T} = params;
  let sources = lodash.get(params, ['entrypointStoreRest', 'sources'], []);
  sources = lodash.filter(sources, function (source) {
    return (source.enabled != false);
  });
  lodash.forEach(sources, function (source) {
    if (lodash.isEmpty(source.requestOpts)) {
      L.has('silly') && L.log('silly', 'requestOpts not found, creates a new one');
      let requestOpts = source.requestOpts = { url: source.url, method: 'POST', json: true };
      if (source.auth && source.auth.type && source.auth.config && source.auth.config[source.auth.type]) {
        if (source.auth.type == 'basic') {
          requestOpts.auth = {
            user: source.auth.config[source.auth.type].user,
            pass: source.auth.config[source.auth.type].pass,
            sendImmediately: true
          };
        } else
          if (source.auth.type == 'digest') {
            requestOpts.auth = {
              user: source.auth.config[source.auth.type].user,
              pass: source.auth.config[source.auth.type].pass,
              sendImmediately: false
            };
          } else
            if (source.auth.type == 'bearer') {
              requestOpts.auth = {
                bearer: source.auth.config[source.auth.type].bearer || source.auth.config[source.auth.type].token
              };
            }
      }
      if (source.ssl && source.ssl.type && source.ssl.config && source.ssl.config[source.ssl.type]) {
        if (source.ssl.type == 'cert') {
          let clientCertOptions = {
            cert: fs.readFileSync(source.ssl.config[source.ssl.type].certFile),
            key: fs.readFileSync(source.ssl.config[source.ssl.type].keyFile)
          }
          if (!lodash.isEmpty(source.ssl.config[source.ssl.type].passphrase)) {
            clientCertOptions.passphrase = source.ssl.config[source.ssl.type].passphrase;
          }
          if (!lodash.isEmpty(source.ssl.config[source.ssl.type].securityOptions)) {
            clientCertOptions.securityOptions = source.ssl.config[source.ssl.type].securityOptions;
          }
          requestOpts.agentOptions = clientCertOptions;
        } else
          if (source.ssl.type == 'certserverside') {
            let serverCertOptions = {
              ca: fs.readFileSync(source.ssl.config[source.ssl.type].caFile),
              cert: fs.readFileSync(source.ssl.config[source.ssl.type].certFile),
              key: fs.readFileSync(source.ssl.config[source.ssl.type].keyFile)
            }
            if (!lodash.isEmpty(source.ssl.config[source.ssl.type].passphrase)) {
              serverCertOptions.passphrase = source.ssl.config[source.ssl.type].passphrase;
            }
            lodash.assign(requestOpts, serverCertOptions);
          }
      }
    } else {
      L.has('silly') && L.log('silly', 'requestOpts has already existed');
    }
    L.has('silly') && L.log('silly', 'source.requestOpts: %s', JSON.stringify(source.requestOpts));
  });

  this.authenticate = function (credential, ctx) {
    if (lodash.isEmpty(sources)) {
      return Promise.reject({
        status: 2,
        message: 'Entrypoint source list is empty'
      });
    }
    return Promise.any(sources.map(function (source) {
      return new Promise(function (resolve, reject) {
        let requestOpts = lodash.assign({ body: credential }, source.requestOpts);
        L.has('silly') && L.log('silly', 'Post to [%s] a request object: %s', source.url, JSON.stringify(requestOpts));
        request(requestOpts, function (err, response, body) {
          if (err) {
            L.has('silly') && L.log('silly', 'Request to [%s] failed. Error: %s', source.url, JSON.stringify(err));
            return reject({
              url: source.url,
              status: -1,
              message: 'Connection failed'
            });
          }

          L.has('silly') && L.log('silly', 'return from [%s]: %s', source.url, JSON.stringify(body));
          if (lodash.isEmpty(body)) {
            return reject({
              url: source.url,
              status: -2,
              message: 'Result is empty'
            });
          }

          let result = (lodash.isFunction(source.transform)) ? source.transform(body) : body;
          L.has('silly') && L.log('silly', 'return from [%s] after transfrom: %s', source.url, JSON.stringify(result));
          return resolve(result);
        });
      });
    })).catch(Promise.AggregateError, function (err) {
      return Promise.resolve({
        status: -1,
        message: 'all of connections are failed',
        error: err
      });
    });
  };
};

module.exports = EntrypointRestStore;
