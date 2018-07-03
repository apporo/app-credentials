'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const debug = Devebot.require('pinbug');
const debugx = debug('app-tokenify:lib:EntrypointCachedStore');
const crypto = require('crypto');
const NodeCache = require('node-cache');

function EntrypointCachedStore(params) {
  params = params || {};

  let self = this;
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
    debugx.enabled && debugx('authenticate(%s)', JSON.stringify(data));
    let key = credentialKey(data);
    let obj = credentialCache.get(key);
    debugx.enabled && debugx('authenticate() - cached data', JSON.stringify(obj));
    if (obj) {
      if (obj[this.fieldNameRef.secret] === hashCode(data[this.fieldNameRef.secret])) {
        obj.status = 0;
        return (obj);
      } else {
        credentialCache.del(key);
        return ({ status: 2 });
      }
    } else {
      return ({ status: 2 });
    }
  }

  this.update = function (data, result) {
    let key = credentialKey(data);
    let obj = lodash.pick(data, lodash.values(this.fieldNameRef));
    lodash.assign(obj, result);
    obj[this.fieldNameRef.secret] = hashCode(obj[this.fieldNameRef.secret]);
    debugx.enabled && debugx('update() - [%s]: %s', key, JSON.stringify(obj));
    credentialCache.set(key, obj);
  }
}

module.exports = EntrypointCachedStore;
