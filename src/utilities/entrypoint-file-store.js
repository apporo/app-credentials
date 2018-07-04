'use strict';

const fs = require('fs');
const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const CommonMethods = require('./common-methods');

function EntrypointFileStore(params) {
  params = params || {};

  let {L, T} = params;
  this.fieldNameRef = params.fieldNameRef;

  let readEntrypointFileStore = function(configFile, context) {
    let store = {};
    try {
      store = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (err) {
      if (err.code == 'ENOENT') {
        L.has('silly') && L.log('silly', 'entrypointStoreFile[%s] not found', configFile);
      } else {
        L.has('silly') && L.log('silly', 'error: %s', JSON.stringify(err));
      }
    }
    return store;
  };

  let entrypointStore = readEntrypointFileStore(params.entrypointStoreFile);
  let entrypointList = entrypointStore.entrypoints || [];
  if (!lodash.isArray(entrypointList)) entrypointList = [];
  entrypointList = lodash.filter(entrypointList, function(item) {
    return (item.enabled != false);
  });
  this.entrypointHash = lodash.keyBy(entrypointList, 'key');

  this.authenticate = CommonMethods.authenticateOnHash.bind(this);
  this.getApiSecret = CommonMethods.getApiSecretOnHash.bind(this);
};

module.exports = EntrypointFileStore;
