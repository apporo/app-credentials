'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const loader = Devebot.require('loader');
const fs = require('fs');
const hideSecret = require('hide-secret');
const EntrypointCachedStore = require('../utilities/entrypoint-cached-store');
const EntrypointConfigStore = require('../utilities/entrypoint-config-store');
const EntrypointFileStore = require('../utilities/entrypoint-file-store');
const EntrypointMongodbStore = require('../utilities/entrypoint-mongodb-store');
const EntrypointRestStore = require('../utilities/entrypoint-rest-store');

function Storage(params) {
  params = params || {};

  let self = this;
  let L = params.loggingFactory.getLogger();
  let T = params.loggingFactory.getTracer();
  let C = { L, T };
  let pluginCfg = params.sandboxConfig || {};

  let mongoManipulator = params["mongojs#manipulator"];

  let ep = {};
  ep.entrypointConfigStore = new EntrypointConfigStore(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStore']), C));
  ep.entrypointFileStore = new EntrypointFileStore(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStoreFile']), C));
  ep.entrypointMongodbStore = new EntrypointMongodbStore(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStoreMongodb']), {mongoManipulator}, C));
  ep.entrypointRestStore = new EntrypointRestStore(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStoreRest']), C));
  let entrypointCachedStore = new EntrypointCachedStore(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', 'secretEncrypted']), C));

  this.authenticate = function (data, opts) {
    data = data || {};
    opts = opts || {};

    let p = Promise.reduce(Object.keys(ep), function (result, entrypointName) {
      if (result.status != null && result.status >= 0) return Promise.resolve(result);
      return ep[entrypointName].authenticate(data, opts).then(function (result) {
        if (data[pluginCfg.fieldNameRef.key]) {
          result[pluginCfg.fieldNameRef.key] = data[pluginCfg.fieldNameRef.key];
        }
        result.store = entrypointName;
        return result;
      });
    }, entrypointCachedStore.authenticate(data, opts));

    p = p.then(function (result) {
      L.has('silly') && L.log('silly', 'final check: %s', JSON.stringify(result));
      if (result.status === 0) {
        if (result.type != 'token') entrypointCachedStore.update(data, result);
        return Promise.resolve(result);
      }
      if (result.status !== 0) return Promise.reject(result);
    });

    return p;
  };

  this.getApiSecret = function (data, opts) {
    let result;
    data = data || {};
    opts = opts || {};

    result = ep.entrypointConfigStore.getApiSecret(data, opts);
    result.store = 'entrypointConfigStore';
    if (result.status == 0) {
      return Promise.resolve(result);
    }

    result = ep.entrypointFileStore.getApiSecret(data, opts);
    result.store = 'entrypointFileStore';
    if (result.status == 0) {
      return Promise.resolve(result);
    }

    return Promise.reject({
      status: 2,
      message: 'Entrypoint key/secret not found'
    });
  };
};

Storage.referenceList = ["mongojs#manipulator"];

module.exports = Storage;
