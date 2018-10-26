'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const CommonMethods = require('./common-methods');

function EntrypointCachedStore(params) {
  params = params || {};

  let self = this;
  let {L, T} = params;
  this.fieldNameRef = params.fieldNameRef;
  this.secretEncrypted = params.secretEncrypted;

  let credentialCache = new NodeCache({ stdTTL: 600, useClones: true });
  let credentialKey = function (data) {
    return (data[self.fieldNameRef.scope] ? (data[self.fieldNameRef.scope] + '/') : '') +
      data[self.fieldNameRef.key];
  }

  let hashCode = function (text) {
    if (!self.secretEncrypted) return text;
    let hash = crypto.createHash('sha1');
    hash.update(text);
    return hash.digest('hex');
  }

  this.authenticate = function (data, ctx) {
    L.has('silly') && L.log('silly', 'authenticate(%s)', JSON.stringify(CommonMethods.hidePassword(data, {
      fieldName: self.fieldNameRef.secret
    })));
    let key = credentialKey(data);
    let obj = credentialCache.get(key);
    L.has('silly') && L.log('silly', 'authenticate() - cached data: %s', JSON.stringify(CommonMethods.hidePassword(obj, {
      fieldName: self.fieldNameRef.secret
    })));
    if (obj) {
      if (obj[this.fieldNameRef.secret] === hashCode(data[this.fieldNameRef.secret])) {
        obj.status = 0;
        return (obj);
      } else {
        credentialCache.del(key);
        return ({ status: -1 });
      }
    } else {
      return ({ status: -2 });
    }
  }

  this.update = function (data, result) {
    let key = credentialKey(data);
    let obj = lodash.pick(data, lodash.values(this.fieldNameRef));
    lodash.assign(obj, result);
    obj[this.fieldNameRef.secret] = hashCode(obj[this.fieldNameRef.secret]);
    L.has('silly') && L.log('silly', 'update() - [%s]: %s', key, JSON.stringify(CommonMethods.hidePassword(obj, {
      fieldName: self.fieldNameRef.secret
    })));
    credentialCache.set(key, obj);
  }
}

module.exports = EntrypointCachedStore;
