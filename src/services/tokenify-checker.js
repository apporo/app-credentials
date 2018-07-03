'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const debugx = Devebot.require('pinbug')('app-tokenify:checker');

function TokenifyChecker(params) {
  debugx.enabled && debugx(' + constructor begin ...');

  params = params || {};

  let self = this;
  let logger = params.loggingFactory.getLogger();
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
    debugx.enabled && debugx(' - define permissionExtractor() function from permissionPath');
    if (permPath.indexOf(pluginCfg.sessionObjectName) != 0) {
      permPath = [pluginCfg.sessionObjectName].concat(permPath);
    }
    debugx.enabled && debugx(' - permissionPath: %s', JSON.stringify(permPath));
    permissionExtractor = function (req) {
      return lodash.get(req, permPath, []);
    }
  } else if (lodash.isFunction(authorizationCfg.permissionExtractor)) {
    debugx.enabled && debugx(' - use the configured permissionExtractor() function');
    permissionExtractor = authorizationCfg.permissionExtractor;
  } else {
    debugx.enabled && debugx(' - use the null returned permissionExtractor() function');
    permissionExtractor = function (req) { return null; }
  }

  self.buildPermissionChecker = function (express) {
    let router = express.Router();

    router.all('*', function (req, res, next) {
      for (let i = 0; i < compiledRules.length; i++) {
        let rule = compiledRules[i];
        if (req.url.match(rule.urlPattern)) {
          if (lodash.isEmpty(rule.methods) || (rule.methods.indexOf(req.method) >= 0)) {
            let permissions = permissionExtractor(req);
            debugx.enabled && debugx(' - extracted permissions: %s', JSON.stringify(permissions));
            if (lodash.isEmpty(rule.permission) || (lodash.isArray(permissions) && permissions.indexOf(rule.permission) >= 0)) {
              debugx.enabled && debugx(' - permission accepted: %s', rule.permission);
              return next();
            } else {
              return res.status(403).json({ success: false, message: 'Insufficient permission to grant access' });
            }
          }
        }
      }
      return next();
    });

    return router;
  };

  debugx.enabled && debugx(' - constructor end!');
};

module.exports = TokenifyChecker;
