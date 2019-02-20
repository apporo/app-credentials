'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const CommonMethods = require('./common-methods');
const STATUS = require('./common-status');

function EntrypointCachedStore(params) {
  params = params || {};

  let self = this;
  let {L, T} = params;
  this.fieldNameRef = params.fieldNameRef || { scope: 'realm', key: 'key', secret: 'secret' };
  this.secretEncrypted = ('secretEncrypted' in params) ? params.secretEncrypted : true;

  let credentialCache = new NodeCache({ stdTTL: 600, useClones: true });

  let getCredentialKey = function (data) {
    return (data[self.fieldNameRef.scope] ? (data[self.fieldNameRef.scope] + '/') : '') +
      data[self.fieldNameRef.key];
  }

  let getHashCode = function (text) {
    if (!self.secretEncrypted) return text;
    text = (text != null) ? text : '';
    text = (typeof(text) === 'string') ? text : text.toString();
    let hash = crypto.createHash('sha1');
    hash.update(text);
    return hash.digest('hex');
  }

  this.authenticate = function (data, ctx) {
    ctx = ctx || {};
    if (ctx.type === 'access-token') return { status: STATUS.SKIP_CACHED_STORE };
    L.has('silly') && L.log('silly', 'authenticate(%s)', JSON.stringify(CommonMethods.hidePassword(data, {
      fieldName: self.fieldNameRef.secret
    })));
    let key = getCredentialKey(data);
    let obj = credentialCache.get(key);
    L.has('silly') && L.log('silly', 'authenticate() - cached data: %s', JSON.stringify(CommonMethods.hidePassword(obj, {
      fieldName: self.fieldNameRef.secret
    })));
    if (obj) {
      if (obj[this.fieldNameRef.secret] === getHashCode(data[this.fieldNameRef.secret])) {
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
    let key = getCredentialKey(data);
    let obj = lodash.pick(data, lodash.values(this.fieldNameRef));
    lodash.assign(obj, result);
    obj[this.fieldNameRef.secret] = getHashCode(obj[this.fieldNameRef.secret]);
    L.has('silly') && L.log('silly', 'update() - [%s]: %s', key, JSON.stringify(CommonMethods.hidePassword(obj, {
      fieldName: self.fieldNameRef.secret
    })));
    credentialCache.set(key, obj);
  }
}

module.exports = EntrypointCachedStore;
