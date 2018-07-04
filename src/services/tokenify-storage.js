'use strict';

const fs = require('fs');
const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const loader = Devebot.require('loader');
const debugx = Devebot.require('pinbug')('app-tokenify:storage');

const EntrypointCachedStore = require('../utilities/entrypoint-cached-store');
const EntrypointConfigStore = require('../utilities/entrypoint-config-store');
const EntrypointFileStore = require('../utilities/entrypoint-file-store');
const EntrypointRestStore = require('../utilities/entrypoint-rest-store');

function TokenifyStorage(params) {
  params = params || {};

  let self = this;
  let L = params.loggingFactory.getLogger();
  let T = params.loggingFactory.getTracer();
  let pluginCfg = params.sandboxConfig;

  let entrypointCachedStore = new EntrypointCachedStore(lodash.pick(pluginCfg, ['fieldNameRef', 'secretEncrypted']));
  let ep = {};
  ep.entrypointConfigStore = new EntrypointConfigStore(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStore']));
  ep.entrypointFileStore = new EntrypointFileStore(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStoreFile']));
  ep.entrypointRestStore = new EntrypointRestStore(lodash.pick(pluginCfg, ['fieldNameRef', 'entrypointStoreRest']));

  self.authenticate = function (data, opts) {
    data = data || {};
    opts = opts || {};

    return Promise.reduce(Object.keys(ep), function (result, entrypointName) {
      if (result.status == 0) return Promise.resolve(result);
      if (result.status == 1) return Promise.reject(result);
      return ep[entrypointName].authenticate(data, opts).then(function (result) {
        result[pluginCfg.fieldNameRef.key] = data[pluginCfg.fieldNameRef.key];
        result.store = entrypointName;
        return result;
      });
    }, entrypointCachedStore.authenticate(data, opts)).then(function (result) {
      debugx.enabled && debugx('final check: %s', JSON.stringify(result));
      if (result.status == 0) {
        if (result.type != 'token') entrypointCachedStore.update(data, result);
        return Promise.resolve(result);
      }
      if (result.status != 0) return Promise.reject(result);
    });
  };

  self.getApiSecret = function (data, opts) {
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

module.exports = TokenifyStorage;
