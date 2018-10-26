'use strict';

var path = require('path');

module.exports = {
  plugins: {
    appCredentials: {
      enabled: true,
      fieldNameRef: {
        scope: 'realm',
        key: 'key',
        secret: 'secret',
        token: 'accessToken'
      },
      entrypointStore: {
        entrypoints: [
          {
            key: 'master',
            secret: '$2a$10$L9t1sDIP4u2xcKGnte8D7uWhzPDRUTPSKD1AFWVEw833/cqp0gyPC',
            hint: 'z********xs**-rs-**-t'
          },
          {
            key: 'nobody',
            secret: '$2a$10$L9t1sDIP4u2xcKGnte8D7uWhzPDRUTPSKD1AFWVEw833/cqp0gyPC',
            enabled: false
          }
        ]
      },
      entrypointStoreFile: path.join(__dirname, '../data/entrypointstore.json'),
      entrypointStoreRest: {
        sources: [
          {
            enabled: false,
            url: 'http://localhost:3000/auth',
            auth: {
              type: 'none',
              config: {
                basic: {
                  user: 'agent',
                  pass: 'secret'
                },
                digest: {
                  user: 'agent',
                  pass: 'secret'
                },
                bearer: {
                  token: 'bearerToken string or generator function'
                }
              }
            },
            ssl: {
              type: 'none',
              config: {
                cert: {
                  certFile: path.join(__dirname, '../data/ssl/client-cert.pem'),
                  keyFile: path.join(__dirname, '../data/ssl/client-key.pem'),
                  passphrase: 'secure4keyfile',
                  securityOptions: 'SSL_OP_NO_SSLv3'
                },
                certserverside: {
                  caFile: path.join(__dirname, '../data/ssl/ca.pem'),
                  certFile: path.join(__dirname, '../data/ssl/server-cert.pem'),
                  keyFile: path.join(__dirname, '../data/ssl/server-key.pem'),
                  passphrase: 'secure4keyfile'
                }
              }
            },
            transform: function(response) { return response; }
          }
        ]
      },
      authorization: {
        permissionPath: [],
        permissionExtractor: function(req) { return []; },
        permissionRules: []
      }
    }
  },
  bridges: {
    mongojs: {
      appCredentials: {
        manipulator: {
          connection_options: {
            host: '127.0.0.1',
            port: '27017',
            name: 'credentials'
          }
        }
      }
    }
  }
};
