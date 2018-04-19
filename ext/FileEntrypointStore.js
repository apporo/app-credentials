'use strict';

var fs = require('fs');
var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('pinbug');
var debugx = debug('app-tokenify:lib:FileEntrypointStore');

var CommonMethods = require('./CommonMethods');

var FileEntrypointStore = function(params) {
  params = params || {};
  this.fieldNameRef = params.fieldNameRef;

  var readEntrypointStoreFile = function(configFile, context) {
    var store = {};
    try {
      store = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (err) {
      if (err.code == 'ENOENT') {
        debugx.enabled && debugx(' - entrypointStoreFile[%s] not found', configFile);
      } else {
        debugx.enabled && debugx(' - error: %s', JSON.stringify(err));
      }
    }
    return store;
  };

  var entrypointStore = readEntrypointStoreFile(params.entrypointStoreFile);
  var entrypointList = entrypointStore.entrypoints || [];
  if (!lodash.isArray(entrypointList)) entrypointList = [];
  entrypointList = lodash.filter(entrypointList, function(item) {
    return (item.enabled != false);
  });
  this.entrypointHash = lodash.keyBy(entrypointList, 'key');

  this.authenticate = CommonMethods.authenticateOnHash.bind(this);
  this.getApiSecret = CommonMethods.getApiSecretOnHash.bind(this);
};

module.exports = FileEntrypointStore;
