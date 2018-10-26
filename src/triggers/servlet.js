'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function Servlet(params) {
  params = params || {};

  let mongoManipulator = params["mongojs#manipulator"];

  this.start = function() {
    return Promise.resolve();
  };

  this.stop = function() {
    return mongoManipulator.close();
  };
};

Servlet.referenceList = [ "mongojs#manipulator" ];

module.exports = Servlet;
