'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const fs = require('fs');
const util = require('util');
const EntrypointInlineStore = require('./entrypoint-config-store');

function EntrypointFileStore(params) {
  params = params || {};

  let {L, T} = params;

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

  EntrypointInlineStore.call(this,
    lodash.assign(lodash.omit(params, ['entrypointInlineStore']), {
      entrypointStore: readEntrypointFileStore(params.entrypointStoreFile)
    }));
};

util.inherits(EntrypointFileStore, EntrypointInlineStore);

module.exports = EntrypointFileStore;
