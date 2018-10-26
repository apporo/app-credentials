'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const STATUS = require('./common-status');

function EntrypointMongodbStore(params) {
  params = params || {};

  let {L, T, fieldNameRef, entrypointStoreMongodb, mongoManipulator} = params;
  let credentialsCollectionName = entrypointStoreMongodb.credentialsCollectionName || 'accounts';
  let tokenFieldName = entrypointStoreMongodb.tokenFieldName || fieldNameRef.token || 'accessToken';
  let usernameFieldName = entrypointStoreMongodb.usernameFieldName || fieldNameRef.key || 'username';
  let passwordFieldName = entrypointStoreMongodb.passwordFieldName || fieldNameRef.secret || 'password';
  let expiredTimeFieldName = entrypointStoreMongodb.expiredTimeFieldName;
  let returnedFieldNames = entrypointStoreMongodb.returnedFieldNames;
  if (!lodash.isArray(returnedFieldNames)) returnedFieldNames = null;
  let transformOutput = entrypointStoreMongodb.transformOutput;
  if (!lodash.isFunction(transformOutput)) transformOutput = null;

  this.authenticate = function (credential, ctx) {
    credential = credential || {};
    ctx = ctx || {};
    let q = null;
    if (ctx.type === 'access-token') {
      q = {};
      q[tokenFieldName] = credential[fieldNameRef.token];
    } else {
      q = {};
      q[usernameFieldName] = credential[fieldNameRef.key];
      q[passwordFieldName] = credential[fieldNameRef.secret];
    }
    let p = mongoManipulator.findOneDocument(credentialsCollectionName, q);
    p = p.then(function(r) {
      if (r) {
        r = transformOutput ? transformOutput(r) : r;
        r = returnedFieldNames ? lodash.pick(r, returnedFieldNames) : r;
        r.status = STATUS.OK;
        if (expiredTimeFieldName && r[expiredTimeFieldName]) {
          if (new Date(r[expiredTimeFieldName]).getTime() < Date.now()) {
            r.status = STATUS.HAS_EXPIRED;
          }
        }
      } else {
        r = { status: STATUS.USER_NOT_IN_STORE };
      }
      return r;
    });
    return p;
  }
}

module.exports = EntrypointMongodbStore;
