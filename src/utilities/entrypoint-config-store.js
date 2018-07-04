'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const CommonMethods = require('./common-methods');

function EntrypointConfigStore(params) {
  params = params || {};
  this.fieldNameRef = params.fieldNameRef;

  let entrypointStore = params.entrypointStore || {};
  let entrypointList = entrypointStore.entrypoints || [];
  if (!lodash.isArray(entrypointList)) entrypointList = [];
  entrypointList = lodash.filter(entrypointList, function(item) {
    return (item.enabled != false);
  });
  this.entrypointHash = lodash.keyBy(entrypointList, 'key');

  this.authenticate = CommonMethods.authenticateOnHash.bind(this);
  this.getApiSecret = CommonMethods.getApiSecretOnHash.bind(this);
};

module.exports = EntrypointConfigStore;