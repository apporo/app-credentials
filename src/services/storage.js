'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const util = require('util');
const hideSecret = require('hide-secret');
const CachedStore = require('../utilities/entrypoint-cached-store');
const STATUS = require('../utilities/common-status');

const STORE_MAPPINGS = {
  "config": { cfgname: "entrypointStore", label: "entrypointConfigStore" },
  "file": { cfgname: "entrypointStoreFile", label: "entrypointFileStore" },
  "mongodb": { cfgname: "entrypointStoreMongodb", label: "entrypointMongodbStore" },
  "mongodp": { cfgname: "entrypointStoreMongodp", label: "entrypointMongodpStore" },
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

  let stores = lodash.pickBy(STORE_MAPPINGS, function(mappings, key) {
    const cfg = pluginCfg[mappings.cfgname];
    if (cfg && cfg.enabled !== false) {
      return true;
    }
    return false;
  })

  let ep = lodash.mapValues(stores, function(mappings, key) {
    let clazz = require(util.format('../utilities/entrypoint-%s-store', key));
    let refs = (key === "mongodb" || key === "mongodp") ? {mongoManipulator} : {};
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

    let p = Promise.reduce(entrypoints, function (accum, entrypointName) {
      if (!(entrypointName in ep)) return accum;
      if (accum.status != null && accum.status >= STATUS.OK) return accum;
      return ep[entrypointName].authenticate(data, opts).then(function (result) {
        result.stores = accum.stores || [];
        result.stores.push(entrypointName);
        result.store = STORE_MAPPINGS[entrypointName].label;
        if (data[pluginCfg.fieldNameRef.key]) {
          result[pluginCfg.fieldNameRef.key] = data[pluginCfg.fieldNameRef.key];
        }
        return result;
      });
    }, cachedStore.authenticate(data, opts));

    p = p.then(function (result) {
      L.has('silly') && L.log('silly', 'final check: %s', JSON.stringify(result));
      if (result.status === STATUS.OK) {
        if (opts.type != 'access-token') cachedStore.update(data, result);
        return Promise.resolve(result);
      }
      if (result.status < STATUS.OK) {
        result.status = STATUS.KEY_NOT_FOUND;
      }
      if (result.status !== STATUS.OK) return Promise.reject(result);
    });

    p = p.catch(function(exception) {
      L.has('error') && L.log('error', 'authentication has been failed: [%s] - [%s]',
          exception.name, exception.message);
      return Promise.reject(exception);
    });

    return p;
  };

  this.getApiSecret = function (data, opts) {
    let result;
    data = data || {};
    opts = opts || {};

    result = ep.entrypointConfigStore.getApiSecret(data, opts);
    result.store = 'entrypointConfigStore';
    if (result.status == STATUS.OK) {
      return Promise.resolve(result);
    }

    result = ep.entrypointFileStore.getApiSecret(data, opts);
    result.store = 'entrypointFileStore';
    if (result.status == STATUS.OK) {
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
