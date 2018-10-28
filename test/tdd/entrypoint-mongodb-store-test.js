'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var assert = require('chai').assert;
var path = require('path');
var util = require('util');
var envmask = require('envmask').instance;

var ACCOUNT_COLLECTION_NAME = 'OAuthAppAccessTokens';
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

  var app = require(path.join(__dirname, '../app'));

  before(function(done) {
    envmask.setup({
      NODE_ENV: 'test',
      LOGOLITE_ALWAYS_ENABLED: 'all',
      LOGOLITE_ALWAYS_MUTED: 'all'
    });
    app.server.start().asCallback(done);
  });

  beforeEach(function(done) {
    var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
    var flow = Promise.resolve();
    flow = flow.then(function(info) {
      return mongoManipulator.deleteDocument(ACCOUNT_COLLECTION_NAME, {});
    });
    flow = flow.then(function(info) {
      return mongoManipulator.insertDocument(ACCOUNT_COLLECTION_NAME, DATASET);
    });
    flow = flow.delay(10);
    flow.asCallback(done);
  })

  it('passed if access-token has been existing and expired time has not occurred yet', function(done) {
    var flow = Promise.resolve();
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
    });
    flow = flow.delay(10);
    flow.asCallback(done);
  });

  it('failed if access-token has been existing and expired time has occurred already', function(done) {
    var flow = Promise.resolve();
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        accessToken: '0880cf98ea96af558f49eb5dd49a6a97f47c8baa'
      }, {
        type: 'access-token'
      });
      p = p.catch(function(exception) {
        false && console.log('Exception: ', JSON.stringify(exception));
        assert.deepEqual(exception, {
          "accessToken":"0880cf98ea96af558f49eb5dd49a6a97f47c8baa",
          "expires":"2018-10-24T08:50:21.716Z",
          "status":3,
          "store":"entrypointMongodbStore"
        });
        return Promise.resolve(exception);
      });
      return p;
    });
    flow = flow.delay(10);
    flow.asCallback(done);
  });

  // it.only('failed if access-token is not found', function(done) {
  //   var app = require(path.join(__dirname, '../app'));
  //   var flow = app.server.start()
  //   flow = flow.then(function(info) {
  //     var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
  //     var sub = Promise.resolve();
  //     sub = sub.then(function() {
  //       return mongoManipulator.deleteDocument(ACCOUNT_COLLECTION_NAME, {});
  //     })
  //     sub = sub.then(function(info) {
  //       return mongoManipulator.insertDocument(ACCOUNT_COLLECTION_NAME, DATASET);
  //     });
  //     return sub;
  //   }).delay(10)
  //   flow = flow.then(function(info) {
  //     var storageService = app.server.getSandboxService('storage');
  //     var p = storageService.authenticate({
  //       accessToken: 'this-is-a-not-found-access-token'
  //     }, {
  //       type: 'access-token'
  //     });
  //     p = p.catch(function(exception) {
  //       true && console.log('Exception: ', JSON.stringify(exception));
  //       assert.deepEqual(exception, {
  //         "accessToken":"0880cf98ea96af558f49eb5dd49a6a97f47c8baa",
  //         "expires":"2018-10-24T08:50:21.716Z",
  //         "status":3,
  //         "store":"entrypointMongodbStore"
  //       });
  //       return Promise.resolve(exception);
  //     });
  //     return p;
  //   }).delay(10)
  //   flow.asCallback(done)
  // });

  after(function(done) {
    envmask.reset();
    app.server.stop().asCallback(done);
  });
});
