'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const bcrypt = require('bcryptjs');
const STATUS = require('./common-status');

module.exports = {
  authenticateOnHash: function(data, opts) {
    data = data || {};
    opts = opts || {};

    let entrypointItem = this.entrypointHash[data[this.fieldNameRef.key]];
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
            status: STATUS.INCORRECT_PASSWORD,
            message: 'Authentication failed. Wrong secret.'
          }
        }
      });
    } else {
      return Promise.resolve({
        status: STATUS.USER_NOT_IN_STORE,
        message: 'Authentication failed. Key not found.'
      });
    }
  },

  getApiSecretOnHash: function(data, opts) {
    data = data || {};
    opts = opts || {};
    let that = this;

    if (that.entrypointHash[data[that.fieldNameRef.key]]) {
      let entrypointItem = that.entrypointHash[data[that.fieldNameRef.key]];
      let output = { status: STATUS.OK };
      output[that.fieldNameRef.key] = entrypointItem.key;
      output[that.fieldNameRef.secret] = entrypointItem.secret;
      return output;
    } else {
      let output = { status: STATUS.USER_NOT_IN_STORE };
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