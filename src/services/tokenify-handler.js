'use strict';

const crypto = require('crypto');
const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const loader = Devebot.require('loader');
const debugx = Devebot.require('pinbug')('app-tokenify:handler');

const basicAuth = require('basic-auth');
const jwt = require('jsonwebtoken');

function TokenifyHandler(params) {
  params = params || {};

  let self = this;
  let L = params.loggingFactory.getLogger();
  let T = params.loggingFactory.getTracer();
  let pluginCfg = params.sandboxConfig;

  let methodCfg = {};
  let httpauthCfg = methodCfg['httpauth'] = lodash.get(pluginCfg, ['httpauth'], {});
  let tokenCfg = methodCfg['token'] = lodash.get(pluginCfg, ['token'], {});
  let jwtCfg = methodCfg['jwt'] = lodash.get(pluginCfg, ['jwt'], {});
  let kstCfg = methodCfg['kst'] = lodash.get(pluginCfg, ['kst'], {});

  debugx.enabled && debugx(' - appTokenify.httpauthCfg: %s', JSON.stringify(httpauthCfg));
  debugx.enabled && debugx(' - appTokenify.tokenCfg: %s', JSON.stringify(tokenCfg));
  debugx.enabled && debugx(' - appTokenify.jwtCfg: %s', JSON.stringify(jwtCfg));
  debugx.enabled && debugx(' - appTokenify.kstCfg: %s', JSON.stringify(kstCfg));

  let getRequestId = function(req) {
    return req && req[pluginCfg.tracingRequestName || 'requestId'];
  }

  let defaultAuthMethods = ['httpauth', 'token', 'jwt', 'kst'];
  let enabledAuthMethods = lodash.filter(defaultAuthMethods, function (authMethod) {
    return (methodCfg[authMethod] && (methodCfg[authMethod].enabled != false));
  });
  debugx.enabled && debugx(' - Enabled authentication methods: %s', JSON.stringify(enabledAuthMethods));

  let verifier = {};

  self.verifyHttpAuth = function (req, res, next) {
    if (httpauthCfg.enabled == false && process.env.NODE_ENV != 'production') {
      debugx.enabled && debugx(' - The HttpAuth verification is bypassed in NODE_ENV[%s]', process.env.NODE_ENV);
      L.log('debug', 'The HttpAuth verification is bypassed in NODE_ENV[%s] - Request[%s]', process.env.NODE_ENV, getRequestId(req));
      req[pluginCfg.sessionObjectName] = { enabled: false };
      return next();
    }
    verifyHttpAuth(req).then(function () {
      L.log('debug', 'HttpAuth verification passed - Request[%s]', getRequestId(req));
      next();
    }).catch(function (error) {
      debugx.enabled && debugx(' - HttpAuth verification failed, return an error code 401');
      L.log('debug', 'HttpAuth verification failed, return 401 - Request[%s]', getRequestId(req));
      res.set('WWW-Authenticate', 'Basic realm="tokenify"');
      res.set('Content-Type', 'application/json');
      if (lodash.isObject(error)) {
        res.status(401).json(error);
      } else {
        res.status(401).send({ success: false, message: error });
      }
    })
  };

  let verifyHttpAuth = verifier['httpauth'] = function (req) {
    debugx.enabled && debugx(' - check credentials name/pass for Basic authentication');

    let credentials = basicAuth(req);
    if (!credentials || !credentials.name || !credentials.pass) {
      return Promise.reject({
        success: false,
        type: 'HttpAuth',
        message: 'Invalid username/password'
      });
    }
    debugx.enabled && debugx(' - Basic authentication credentials: %s', JSON.stringify(credentials));

    let credential = {};
    let parts = credentials.name.split("/");
    if (parts.length >= 2) {
      credential[pluginCfg.fieldNameRef.scope] = parts[0];
      credential[pluginCfg.fieldNameRef.key] = parts[1];
    } else {
      credential[pluginCfg.fieldNameRef.key] = credentials.name;
    }
    credential[pluginCfg.fieldNameRef.secret] = credentials.pass;
    debugx.enabled && debugx(' - Internal authentication credential: %s', JSON.stringify(credential));

    return params.tokenifyStorage.authenticate(credential, {
      traceRequestId: getRequestId(req)
    }).then(function (result) {
      result = result || {};
      if (result.status == 0) {
        delete credential[pluginCfg.fieldNameRef.secret];
        let sessionObject = {
          user: lodash.assign(credential, lodash.omit(result, ['status']))
        };
        debugx.enabled && debugx(' - SessionObject will be saved: %s', JSON.stringify(sessionObject));
        L.log('debug', 'Created sessionObject:%s - Request[%s]', JSON.stringify(sessionObject), getRequestId(req));
        req[pluginCfg.sessionObjectName] = sessionObject;
        return Promise.resolve();
      }
      return Promise.reject({
        success: false,
        type: 'HttpAuth',
        message: 'Internal authenticate() failed'
      });
    }).catch(function (error) {
      return Promise.reject({
        success: false,
        type: 'HttpAuth',
        message: 'Internal authenticate() error'
      });
    });
  };

  self.verifyToken = function (req, res, next) {
    if (tokenCfg.enabled == false && process.env.NODE_ENV != 'production') {
      debugx.enabled && debugx(' - The Token verification is bypassed in NODE_ENV[%s]', process.env.NODE_ENV);
      L.log('debug', 'The Token verification is bypassed in NODE_ENV[%s] - Request[%s]', process.env.NODE_ENV, getRequestId(req));
      req[pluginCfg.sessionObjectName] = { enabled: false };
      return next();
    }
    verifyToken(req).then(function () {
      L.log('debug', 'Token verification passed - Request[%s]', getRequestId(req));
      next();
    }).catch(function (error) {
      debugx.enabled && debugx(' - Token verification failed, return an error code 401');
      L.log('debug', 'Token verification failed, return 401 - Request[%s]', getRequestId(req));
      if (lodash.isObject(error)) {
        res.status(401).json(error);
      } else {
        res.status(401).send({ success: false, message: error });
      }
    })
  };

  let verifyToken = verifier['token'] = function (req) {
    debugx.enabled && debugx(' - check credentials token');

    let credential = {};
    let tokenField = pluginCfg.fieldNameRef.token || 'token';
    credential[tokenField] = req.headers[tokenField];
    debugx.enabled && debugx(' - Internal authentication credential: %s', JSON.stringify(credential));

    return params.tokenifyStorage.authenticate(credential, {
      traceRequestId: getRequestId(req)
    }).then(function (result) {
      result = result || {};
      if (result.status == 0) {
        delete credential[pluginCfg.fieldNameRef.secret];
        let sessionObject = {
          user: lodash.assign(credential, lodash.omit(result, ['status']))
        };
        debugx.enabled && debugx(' - SessionObject will be saved: %s', JSON.stringify(sessionObject));
        L.log('debug', 'Created sessionObject:%s - Request[%s]', JSON.stringify(sessionObject), getRequestId(req));
        req[pluginCfg.sessionObjectName] = sessionObject;
        return Promise.resolve();
      }
      return Promise.reject({
        success: false,
        type: 'token',
        message: 'Internal token authenticate() failed'
      });
    }).catch(function (error) {
      return Promise.reject({
        success: false,
        type: 'token',
        message: 'Internal token authenticate() error'
      });
    });
  };

  self.authenticate = function (req, res, next) {
    debugx.enabled && debugx(' + Client make an authentication');
    L.log('debug', 'Client authenticate username:%s - Request[%s]', req.body.username, getRequestId(req));

    let credential = lodash.pick(req.body, lodash.values(pluginCfg.fieldNameRef));

    params.tokenifyStorage.authenticate(credential, {
      traceRequestId: getRequestId(req)
    }).then(function (result) {
      result = result || {};
      if (result.status == 0) {
        delete credential[pluginCfg.fieldNameRef.secret];
        let tokenObject = {
          user: lodash.assign(credential, lodash.omit(result, ['status']))
        };
        debugx.enabled && debugx(' - TokenObject will be saved: %s', JSON.stringify(tokenObject));
        let token = jwt.sign(tokenObject, jwtCfg.secretkey || 't0ps3cr3t', {
          expiresIn: jwtCfg.expiresIn || 86400 // expires in 24 hours
        });
        L.log('debug', 'Successful authentication. Created token:%s - Request[%s]', token, getRequestId(req));
        res.json({
          success: true,
          message: 'Successful authentication.',
          token: token
        });
        return 0;
      }
      L.log('debug', 'Authentication failed. status:%s - Request[%s]', result.status, getRequestId(req));
      res.json({
        success: false,
        message: result.message || 'Authentication failed. Invalid username or password'
      });
      return 1;
    }).catch(function (error) {
      L.log('debug', 'Authentication failed. status:%s - Request[%s]', error.status, getRequestId(req));
      error.success = false;
      res.status(400).json(error);
    }).finally(function () {
      L.log('debug', 'Authentication finish - Request[%s]', getRequestId(req));
    });
  };

  self.verifyJWT = function (req, res, next) {
    if (jwtCfg.enabled == false && process.env.NODE_ENV != 'production') {
      debugx.enabled && debugx(' - The JWT verification is bypassed in NODE_ENV[%s]', process.env.NODE_ENV);
      L.log('debug', 'The JWT verification is bypassed in NODE_ENV[%s] - Request[%s]', process.env.NODE_ENV, getRequestId(req));
      req[pluginCfg.sessionObjectName] = { enabled: false };
      return next();
    }
    verifyJWT(req).then(function () {
      debugx.enabled && debugx('JWT verification passed - Request[%s]', getRequestId(req));
      L.log('debug', 'JWT verification passed - Request[%s]', getRequestId(req));
      next();
    }).catch(function (error) {
      debugx.enabled && debugx(' - JWT verification failed, return an error code 403');
      L.log('debug', 'JWT verification failed, return 403 - Request[%s]', getRequestId(req));
      if (lodash.isObject(error)) {
        res.status(403).json(error);
      } else {
        res.status(403).send({ success: false, message: error });
      }
    })
  };

  let verifyJWT = verifier['jwt'] = function (req) {
    debugx.enabled && debugx(' - check header/url-params/post-params for JWT token');
    let reqHeaders = req.headers || {}, reqParams = req.params || {}, reqBody = req.body || {};
    let token = reqHeaders[jwtCfg.tokenHeaderName] || reqParams[jwtCfg.tokenQueryName] || reqBody[jwtCfg.tokenQueryName];
    if (token) {
      L.log('debug', 'JWT token found: [%s] - Request[%s]', token, getRequestId(req));
      let tokenOpts = {
        ignoreExpiration: jwtCfg.ignoreExpiration || false
      };
      debugx.enabled && debugx(' - decode token, verifies secret and checks exp');
      L.log('debug', 'Call jwt.verify() with options: %s - Request[%s]', JSON.stringify(tokenOpts), getRequestId(req));
      return new Promise(function (resolve, reject) {
        jwt.verify(token, jwtCfg.secretkey || 't0ps3cr3t', tokenOpts, function (err, decoded) {
          if (err) {
            debugx.enabled && debugx(' - verify token error: %s', JSON.stringify(err));
            L.log('debug', 'Verification failed, error: %s - Request[%s]', JSON.stringify(err), getRequestId(req));
            return reject({
              success: false,
              type: 'JWT',
              message: 'Failed to authenticate token.'
            });
          } else {
            debugx.enabled && debugx(' - save to request for use in other routes');
            L.log('debug', 'Verification success, token: %s - Request[%s]', JSON.stringify(decoded), getRequestId(req));
            req[pluginCfg.sessionObjectName] = decoded;
            return resolve();
          }
        });
      });
    } else {
      L.log('debug', 'JWT token not found - Request[%s]', getRequestId(req));
      return Promise.reject({
        success: false,
        type: 'JWT',
        message: 'Token not found'
      });
    }
  }

  self.verifyKST = function (req, res, next) {
    if (kstCfg.enabled == false && process.env.NODE_ENV != 'production') {
      debugx.enabled && debugx(' - The KST verification is bypassed in NODE_ENV[%s]', process.env.NODE_ENV);
      L.log('debug', 'The KST verification is bypassed in NODE_ENV[%s] - Request[%s]', process.env.NODE_ENV, getRequestId(req));
      req[pluginCfg.sessionObjectName] = { enabled: false };
      return next();
    }
    verifyKST(req).then(function () {
      L.log('debug', 'KST verification passed - Request[%s]', getRequestId(req));
      next();
    }).catch(function (error) {
      debugx.enabled && debugx(' - KST verification failed, return an error code 403');
      L.log('debug', 'KST verification failed, return 403 - Request[%s]', getRequestId(req));
      if (lodash.isObject(error)) {
        res.status(403).json(error);
      } else {
        res.status(403).send({ success: false, message: error });
      }
    })
  };

  let verifyKST = verifier['kst'] = function (req) {
    debugx.enabled && debugx(' - check header/url-params/post-params for KST token');
    let reqHeaders = req.headers || {};
    let authHeaders = {
      key: reqHeaders[kstCfg.keyHeaderName],
      nonce: reqHeaders[kstCfg.nonceHeaderName],
      timestamp: reqHeaders[kstCfg.timestampHeaderName],
      signature: reqHeaders[kstCfg.signatureHeaderName]
    };
    if (authHeaders.key && authHeaders.nonce && authHeaders.timestamp && authHeaders.signature) {
      return params.tokenifyStorage.getApiSecret({
        key: authHeaders.key
      }, {
          traceRequestId: getRequestId(req)
        }).then(function (result) {
          let sessionObject = {};
          let signatureOpts = {
            key: authHeaders.key,
            timestamp: authHeaders.timestamp,
            nonce: authHeaders.nonce,
            secret: result.secret,
            method: req.method,
            path: req.path
          };
          if (lodash.isObject(req.body) && !lodash.isEmpty(req.body)) {
            signatureOpts.data = req.body;
          }
          debugx.enabled && debugx(' - Building signature parameters: %s', JSON.stringify(signatureOpts));
          let signature = buildSignature(signatureOpts);
          debugx.enabled && debugx(' - Server-built signature: %s', signature);

          if (signature != authHeaders.signature) {
            self.log.debug('Client-signature[] !~ Server-signature - Request[%s]', authHeaders.signature, signature, getRequestId(req));
            return Promise.reject({
              success: false,
              type: 'KST',
              message: 'Invalid signature'
            });
          }

          if (validateTimestamp(authHeaders.timestamp) == false) {
            return Promise.reject({
              success: false,
              type: 'KST',
              message: 'Invalid timestamp'
            });
          }

          req[pluginCfg.sessionObjectName] = sessionObject;
          return Promise.resolve();
        })
    } else {
      L.log('debug', 'KST token is invalid - Request[%s]', getRequestId(req));
      return Promise.reject({
        success: false,
        type: 'KST',
        message: 'Token not found'
      });
    }
  };

  let buildSignature = function (input) {
    input = input || {};
    let keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
      if ((keys[i] != 'data') && (input[keys[i]] == null)) return null;
    }

    let auth_words = [input.key, input.timestamp, input.nonce, input.method.toUpperCase(), input.path];
    if (input.data) {
      auth_words.push(JSON.stringify(input.data));
    }
    let auth_string = auth_words.join('&');

    let hmac = crypto.createHmac('sha256', input.secret);
    hmac.update(auth_string);
    let auth_signature = hmac.digest('base64');

    return auth_signature;
  };

  let validateTimestamp = function (timestamp, minutes) {
    try {
      let t1 = Math.floor((new Date().valueOf() - minutes * 60000) / 1000).toString();
      let t2 = parseInt(timestamp);
      return (t1 < t2);
    } catch (exception) {
      return false;
    }
  };

  self.verifyMIX = function (authMethods) {
    authMethods = authMethods || [];

    let mixtureAuthMethods = enabledAuthMethods;
    if (lodash.isArray(authMethods) && !lodash.isEmpty(authMethods)) {
      mixtureAuthMethods = lodash.intersection(mixtureAuthMethods, authMethods);
    }
    debugx.enabled && debugx(' - Mixture authentication methods: %s', JSON.stringify(mixtureAuthMethods));

    return function (req, res, next) {
      L.log('debug', 'MIX verification: %s - Request[%s]', JSON.stringify(mixtureAuthMethods), getRequestId(req));
      if (lodash.isEmpty(mixtureAuthMethods)) {
        next();
        return;
      }
      Promise.any(lodash.map(mixtureAuthMethods, function (authMethod) {
        return verifier[authMethod](req);
      })).then(function () {
        L.log('debug', 'The MIX verification passed - Request[%s]', getRequestId(req));
        next();
      }).catch(Promise.AggregateError, function (error) {
        (pluginCfg.verbose === true) && console.log("verifyMIX() -> Promise.any(): ", error);
        debugx.enabled && debugx(' - The MIX verification failed, return an error code 401');
        L.log('debug', 'The MIX verification failed, return 401 - Request[%s]', getRequestId(req));
        res.set('WWW-Authenticate', 'Basic realm="tokenify"');
        res.set('Content-Type', 'application/json');
        res.status(401).send({
          success: false,
          message: 'All of HttpAuth, JWT, KST authentications failed'
        });
      });
    };
  };
};

TokenifyHandler.referenceList = ['tokenifyStorage'];

module.exports = TokenifyHandler;
