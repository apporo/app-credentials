'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const bcrypt = require('bcryptjs');
const util = require('util');
const STATUS = require('./common-status');

module.exports = {
  authenticateOnHash: function(data, opts) {
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
  },

  getApiSecretOnHash: function(data, opts) {
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
  },

  hidePassword: function(data, opts) {
    let replacePassword = function(password) {
      return lodash.pad('', password.length, '*');
    }
    if (lodash.isString(data)) {
      data = replacePassword(data);
    }
    if (lodash.isObject(data)) {
      opts = opts || {};
      opts.fieldName = opts.fieldName || 'password';
      opts.clone = opts.clone !== false;
      if (data[opts.fieldName]) {
        if (opts.clone) {
          data = lodash.clone(data);
        }
        data[opts.fieldName] = replacePassword(data[opts.fieldName]);
      }
    }
    return data;
  }
};