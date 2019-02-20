'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const bcrypt = require('bcryptjs');
const util = require('util');
const STATUS = require('./common-status');

function EntrypointConfigStore(params) {
  params = params || {};
  this.fieldNameRef = params.fieldNameRef;

  let entrypointStore = params.entrypointInlineStore || params.entrypointStore || {};
  let entrypointList = entrypointStore.entrypoints || [];
  if (!lodash.isArray(entrypointList)) entrypointList = [];
  entrypointList = lodash.filter(entrypointList, function(item) {
    return (item.enabled != false);
  });
  this.entrypointHash = lodash.keyBy(entrypointList, 'key');

  this.authenticate = function(data, opts) {
    let self = this;
    data = data || {};
    opts = opts || {};

    let entrypointItem = this.entrypointHash[data[self.fieldNameRef.key]];
    if (entrypointItem) {
      let bcrypt_compare = Promise.promisify(bcrypt.compare, {context: bcrypt});
      return bcrypt_compare(data[this.fieldNameRef.secret], entrypointItem.secret).then(function(ok) {
        if (ok) {
          return {
            status: STATUS.OK,
            message: 'Successful authentication.'
          }
        } else {
          return {
            status: STATUS.SECRET_INCORRECT,
            message: util.format('Authentication failed. Wrong [%s].', self.fieldNameRef.secret)
          }
        }
      });
    } else {
      return Promise.resolve({
        status: STATUS.KEY_NOT_IN_STORE,
        message: util.format('Authentication failed. [%s] not found.', self.fieldNameRef.key)
      });
    }
  };

  this.getCredentials = function(data, opts) {
    let self = this;
    data = data || {};
    opts = opts || {};
    if (opts.type === 'key-secret') {
      let entrypointItem = self.entrypointHash[data[self.fieldNameRef.key]];
      if (entrypointItem) {
        let output = { status: STATUS.OK };
        lodash.forEach(['key', 'secret', 'token'], function(name) {
          if (entrypointItem[name] != null) {
            output[sef.fieldNameRef[name]] = entrypointItem[name];
          }
        });
        return output;
      } else {
        let output = { status: STATUS.KEY_NOT_IN_STORE };
        output[self.fieldNameRef.key] = data[self.fieldNameRef.key];
        return output;
      }
    } else {
      
    }
  };

  this.getApiSecret = function(data, opts) {
    let that = this;
    data = data || {};
    opts = opts || {};

    if (that.entrypointHash[data[that.fieldNameRef.key]]) {
      let entrypointItem = that.entrypointHash[data[that.fieldNameRef.key]];
      let output = { status: STATUS.OK };
      output[that.fieldNameRef.key] = entrypointItem.key;
      output[that.fieldNameRef.secret] = entrypointItem.secret;
      return output;
    } else {
      let output = { status: STATUS.KEY_NOT_IN_STORE };
      output[that.fieldNameRef.key] = data[that.fieldNameRef.key];
      return output;
    }
  };
};

module.exports = EntrypointConfigStore;