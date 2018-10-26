'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const loader = Devebot.require('loader');
const fs = require('fs');
const util = require('util');
const hideSecret = require('hide-secret');
const CachedStore = require('../utilities/entrypoint-cached-store');

const STORE_MAPPINGS = {
  "config": { cfgname: "entrypointStore", label: "entrypointConfigStore" },
  "file": { cfgname: "entrypointStoreFile", label: "entrypointFileStore" },
  "mongodb": { cfgname: "entrypointStoreMongodb", label: "entrypointMongodbStore" },
  "rest": { cfgname: "entrypointStoreRest", label: "entrypointRestStore" }
}

function Storage(params) {
  params = params || {};

  let self = this;
  let L = params.loggingFactory.getLogger();
  let T = params.loggingFactory.getTracer();
  let C = { L, T };
  let pluginCfg = params.sandboxConfig || {};

  let mongoManipulator = params["mongojs#manipulator"];

  let ep = lodash.mapValues(STORE_MAPPINGS, function(mappings, key) {
    let clazz = require(util.format('../utilities/entrypoint-%s-store', key));
    let refs = (key === "mongodb") ? {mongoManipulator} : {};
    return new clazz(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', mappings.cfgname]), C, refs));
  });
  let cachedStore = new CachedStore(lodash.assign(lodash.pick(pluginCfg, ['fieldNameRef', 'secretEncrypted']), C));

  this.authenticate = function (data, opts) {
    data = data || {};
    opts = opts || {};

    let entrypoints = Object.keys(ep);
    if (lodash.isArray(opts.entrypoints)) {
      entrypoints = opts.entrypoints;
    } 

    let p = Promise.reduce(entrypoints, function (result, entrypointName) {
      if (!(entrypointName in ep)) return result;
      if (result.status != null && result.status >= 0) return result;
      return ep[entrypointName].authenticate(data, opts).then(function (result) {
        if (data[pluginCfg.fieldNameRef.key]) {
          result[pluginCfg.fieldNameRef.key] = data[pluginCfg.fieldNameRef.key];
        }
        result.store = STORE_MAPPINGS[entrypointName].label;
        return result;
      });
    }, cachedStore.authenticate(data, opts));

    p = p.then(function (result) {
      L.has('silly') && L.log('silly', 'final check: %s', JSON.stringify(result));
      if (result.status === 0) {
        if (result.type != 'token') cachedStore.update(data, result);
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
