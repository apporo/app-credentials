'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var Injektor = Devebot.require('injektor');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');
var loader = Devebot.require('loader');
var debugx = Devebot.require('pinbug')('tdd:devebot:core:sandbox-manager');
var assert = require('chai').assert;
var path = require('path');
var util = require('util');
var envmask = require('envmask').instance;

describe('tdd:app-credentials:storage', function() {
  this.timeout(60000);

  before(function() {
    envmask.setup({
      NODE_ENV: 'test',
      LOGOLITE_ALWAYS_ENABLED: 'all',
      LOGOLITE_ALWAYS_MUTED: 'all'
    });
  });

  it('something here', function(done) {
    var app = require(path.join(__dirname, '../app'));
    var flow = app.server.start()
    flow = flow.then(function(info) {
      var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
      var sub = Promise.resolve();
      sub = sub.then(function() {
        return mongoManipulator.deleteDocument('OAuthAppAccessTokens', {});
      })
      sub = sub.then(function(info) {
        return mongoManipulator.insertDocument('OAuthAppAccessTokens', [
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
        ])
      });
      return sub;
    })
    flow = flow.delay(10)
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        accessToken: '1880cf98ea96af558f49eb5dd49a6a97f47c8bab'
        // accessToken: '0880cf98ea96af558f49eb5dd49a6a97f47c8baa'
      }, {
        type: 'access-token'
      });
      p = p.then(function(r) {
        console.log('Result: ', r);
        return r;
      })
      p = p.catch(function(exception) {
        console.log('Exception: ', exception);
        return Promise.reject(exception);
      });
      return p;
    })
    flow = flow.delay(10)
    flow = flow.then(function(info) {
      var mongoManipulator = app.server.getSandboxService('mongojs#manipulator');
      var sub = Promise.resolve();
      sub = sub.then(function() {
        return mongoManipulator.deleteDocument('OAuthAppAccessTokens', {});
      })
      sub = sub.then(function() {
        return mongoManipulator.stats().then(function(stats) {
          console.log(stats);
          return stats;
        });
      })
      return sub;
    })
    flow = flow.delay(10)
    flow.finally(function() {
      app.server.stop()
    })
    flow.asCallback(done)
  });

  after(function() {
    envmask.reset();
  });
});
