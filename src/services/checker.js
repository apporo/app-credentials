'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function Checker(params) {
  params = params || {};

  let self = this;
  let L = params.loggingFactory.getLogger();
  let T = params.loggingFactory.getTracer();
  let pluginCfg = params.sandboxConfig;
  let authorizationCfg = pluginCfg.authorization || {};

  let declaredRules = authorizationCfg.permissionRules || [];
  let compiledRules = [];
  lodash.forEach(declaredRules, function (rule) {
    if (rule.enabled != false) {
      let compiledRule = lodash.omit(rule, ['url']);
      compiledRule.urlPattern = new RegExp(rule.url || '/(.*)');
      compiledRules.push(compiledRule);
    }
  });

  let permissionExtractor = null;
  let permPath = authorizationCfg.permissionPath;
  if (lodash.isArray(permPath) && !lodash.isEmpty(permPath)) {
    L.has('silly') && L.log('silly', 'permissionPath: %s', JSON.stringify(permPath));
    permissionExtractor = function (req) {
      return lodash.get(req, permPath, []);
    }
  } else if (lodash.isFunction(authorizationCfg.permissionExtractor)) {
    L.has('silly') && L.log('silly', 'use the configured permissionExtractor() function');
    permissionExtractor = authorizationCfg.permissionExtractor;
  } else {
    L.has('silly') && L.log('silly', 'use the null returned permissionExtractor() function');
    permissionExtractor = function (req) { return null; }
  }

  this.checkPermissions = function(req) {
    let checked = false, passed = null;
    for (let i = 0; i < compiledRules.length; i++) {
      let rule = compiledRules[i];
      if (req.url && req.url.match(rule.urlPattern)) {
        if (lodash.isEmpty(rule.methods) || (req.method && rule.methods.indexOf(req.method) >= 0)) {
          let permissions = permissionExtractor(req);
          L.has('silly') && L.log('silly', 'extracted permissions: %s', JSON.stringify(permissions));
          if (lodash.isEmpty(rule.permission) || (lodash.isArray(permissions) && permissions.indexOf(rule.permission) >= 0)) {
            L.has('silly') && L.log('silly', 'permission accepted: %s', rule.permission);
            passed = true;
          } else {
            passed = false;
          }
          checked = true;
          break;
        }
      }
    }
    return passed;
  }

  this.buildPermissionChecker = function (express) {
    let router = express.Router();
    router.all('*', function (req, res, next) {
      let passed = self.checkPermissions(req);
      if (passed === null) return next();
      if (passed) return next();
      return res.status(403).json({ success: false, message: 'Insufficient permission to grant access' });
    });
    return router;
  };
};

module.exports = Checker;
