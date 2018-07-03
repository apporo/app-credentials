'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const bcrypt = require('bcryptjs');

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
            status: 0,
            message: 'Successful authentication.'
          }
        } else {
          return {
            status: 1,
            message: 'Authentication failed. Wrong secret.'
          }
        }
      });
    } else {
      return Promise.resolve({
        status: 2,
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
      let output = { status: 0 };
      output[that.fieldNameRef.key] = entrypointItem.key;
      output[that.fieldNameRef.secret] = entrypointItem.secret;
      return output;
    } else {
      let output = { status: 1 };
      output[that.fieldNameRef.key] = data[that.fieldNameRef.key];
      return output;
    }
  }
};