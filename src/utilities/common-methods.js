'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

module.exports = {
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