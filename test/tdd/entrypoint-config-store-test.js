'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var assert = require('chai').assert;
var path = require('path');
var util = require('util');
var envmask = require('envmask').instance;
var STATUS = require('../../lib/utilities/common-status');

describe('tdd:app-credentials:entrypoint-config-store', function() {
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

  it('passed if username-password has been existing', function(done) {
    var flow = Promise.resolve();
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        username: 'static1',
        password: 'password'
      }, {
        type: 'user-password'
      });
      p = p.then(function(r) {
        assert.deepEqual(r, {
          "stores": ["config"],
          "store":"entrypointConfigStore",
          "username":"static1",
          "status":0,
          "message": "Successful authentication."
        });
        false && console.log('Result: ', JSON.stringify(r));
        return r;
      })
      p = p.catch(function(exception) {
        true && console.log('Exception: ', exception);
        return Promise.reject(exception);
      });
      return p;
    });
    flow.asCallback(done);
  });

  it('failed if username is not found', function(done) {
    var flow = Promise.resolve();
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        username: 'static0',
        password: 'password'
      }, {
        entrypoints: ['config'],
        type: 'user-password'
      });
      p = p.then(function(result) {
        return Promise.reject(result);
      }, function(exception) {
        assert.deepEqual(exception, {
          "stores": ["config"],
          "store": "entrypointConfigStore",
          "username": "static0",
          "status": STATUS.KEY_NOT_FOUND,
          "message": "Authentication failed. [username] not found."
        });
        false && console.log('Exception: ', exception);
        return Promise.resolve(exception);
      });
      return p;
    });
    flow.asCallback(done);
  });

  it('failed if password is incorrected', function(done) {
    var flow = Promise.resolve();
    flow = flow.then(function(info) {
      var storageService = app.server.getSandboxService('storage');
      var p = storageService.authenticate({
        username: 'static3',
        password: 'incorrected'
      }, {
        entrypoints: ['config'],
        type: 'user-password'
      });
      p = p.then(function(result) {
        return Promise.reject(result);
      }, function(exception) {
        assert.deepEqual(exception, {
          "stores": ["config"],
          "store": "entrypointConfigStore",
          "username": "static3",
          "status": STATUS.SECRET_INCORRECT,
          "message": "Authentication failed. Wrong [password]."
        });
        false && console.log('Exception: ', exception);
        return Promise.resolve(exception);
      });
      return p;
    });
    flow.asCallback(done);
  });

  after(function(done) {
    envmask.reset();
    app.server.stop().asCallback(done);
  });
});
