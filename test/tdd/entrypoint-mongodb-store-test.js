'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var Injektor = Devebot.require('injektor');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');
var loader = Devebot.require('loader');
var assert = require('chai').assert;
var path = require('path');
var util = require('util');
var envmask = require('envmask').instance;

var ACCOUNT_COLLECTION = 'OAuthAppAccessTokens';
var DATASET = [
  {
    "accessToken" : "0880cf98ea96af558f49eb5dd49a6a97f47c8baa",
    "clientId" : "paxplus_vileh_p",
    "userId" : "5bcd5589cf78b512f5aad406",
    "username" : "5bcd5589cf78b512f5aad406",
    "firstName" : "Thành",
    "lastName" : "Nguyễn",
    "fleetId" : "vileh",
    "phone" : "+84935236987",
    "appType" : "passenger",
    "expires" : new Date("2018-10-24T08:50:21.716Z"),
    "createdDate" : new Date("2018-10-23T08:50:21.743Z")
  },
  {
    "accessToken" : "1880cf98ea96af558f49eb5dd49a6a97f47c8bab",
    "clientId" : "paxplus_vileh_p",
    "userId" : "5bcd5589cf78b512f5aad406",
    "username" : "5bcd5589cf78b512f5aad406",
    "firstName" : "Thành",
    "lastName" : "Nguyễn",
    "fleetId" : "vileh",
    "phone" : "+84935236987",
    "appType" : "passenger",
    "expires" : new Date("2018-10-29T08:50:21.716Z"),
    "createdDate" : new Date("2018-10-24T08:50:21.743Z")
  }
];

describe('tdd:app-credentials:entrypoint-mongodb-store', function() {
  this.timeout(60000);

  before(function() {
    envmask.setup({
      NODE_ENV: 'test',
      LOGOLITE_ALWAYS_ENABLED: 'all',
      LOGOLITE_ALWAYS_MUTED: 'all'
    });
  });

  it('passed if access-token has been existing and expired time has not occurred yet', function(done) {
    var app = require(path.join(__dirname, '../app'));
    var flow = app.server.start()
    flow = flow.then(function(info) {
      var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
      var sub = Promise.resolve();
      sub = sub.then(function() {
        return mongoManipulator.deleteDocument(ACCOUNT_COLLECTION, {});
      })
      sub = sub.then(function(info) {
        return mongoManipulator.insertDocument(ACCOUNT_COLLECTION, DATASET);
      });
      return sub;
    }).delay(10)
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        accessToken: '1880cf98ea96af558f49eb5dd49a6a97f47c8bab'
      }, {
        type: 'access-token'
      });
      p = p.then(function(r) {
        assert.deepEqual(r, {
          "accessToken":"1880cf98ea96af558f49eb5dd49a6a97f47c8bab",
          "expires":"2018-10-29T08:50:21.716Z",
          "status":0,
          "store":"entrypointMongodbStore"
        });
        false && console.log('Result: ', JSON.stringify(r));
        return r;
      })
      p = p.catch(function(exception) {
        console.log('Exception: ', exception);
        return Promise.reject(exception);
      });
      return p;
    }).delay(10)
    flow = flow.then(function(info) {
      var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
      var sub = Promise.resolve();
      sub = sub.then(function() {
        return mongoManipulator.deleteDocument(ACCOUNT_COLLECTION, {});
      })
      sub = sub.then(function() {
        return mongoManipulator.stats().then(function(stats) {
          return stats;
        });
      })
      return sub;
    }).delay(10)
    flow.finally(function() {
      app.server.stop()
    })
    flow.asCallback(done)
  });

  it('failed if access-token has been existing and expired time has occurred already', function(done) {
    var app = require(path.join(__dirname, '../app'));
    var flow = app.server.start()
    flow = flow.then(function(info) {
      var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
      var sub = Promise.resolve();
      sub = sub.then(function() {
        return mongoManipulator.deleteDocument(ACCOUNT_COLLECTION, {});
      })
      sub = sub.then(function(info) {
        return mongoManipulator.insertDocument(ACCOUNT_COLLECTION, DATASET);
      });
      return sub;
    }).delay(10)
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        accessToken: '0880cf98ea96af558f49eb5dd49a6a97f47c8baa'
      }, {
        type: 'access-token'
      });
      p = p.catch(function(exception) {
        true && console.log('Exception: ', JSON.stringify(exception));
        assert.deepEqual(exception, {
          "accessToken":"0880cf98ea96af558f49eb5dd49a6a97f47c8baa",
          "expires":"2018-10-24T08:50:21.716Z",
          "status":3,
          "store":"entrypointMongodbStore"
        });
        return Promise.resolve(exception);
      });
      return p;
    }).delay(10)
    flow = flow.then(function(info) {
      var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
      var sub = Promise.resolve();
      sub = sub.then(function() {
        return mongoManipulator.deleteDocument(ACCOUNT_COLLECTION, {});
      })
      sub = sub.then(function() {
        return mongoManipulator.stats().then(function(stats) {
          return stats;
        });
      })
      return sub;
    }).delay(10)
    flow.finally(function() {
      app.server.stop()
    })
    flow.asCallback(done)
  });

  after(function() {
    envmask.reset();
  });
});
