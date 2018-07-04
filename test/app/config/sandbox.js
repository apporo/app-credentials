'use strict';

var sessionObjectName = 'credentials';

module.exports = {
  application: {
  },
  plugins: {
    appCredentials: {
      fieldNameRef: {
        scope: 'realm',
        key: 'username',
        secret: 'password'
      },
      secretEncrypted: false,
      entrypointStore: {
        entrypoints: [
          {
            "key": "static1",
            "secret": "$2a$10$hl4zIIfRYkI752hmVSm5yutLmqDk6FFQcqTDBgZocXH5uTUosDUnm"
          },
          {
            "key": "static2",
            "secret": "$2a$10$oWnKP2qCtqwau7klj8P4NeCAf9cAQGGamKtP8/biF03VAr5mamdd2"
          },
          {
            "key": "static3",
            "secret": "$2a$10$dmjbCNaf5RA3mlJ2558bUe6k8FviQdXgLOHrbzfzsppqKgJLGyGOK"
          }
        ]
      },
      entrypointStoreFile: require('path').join(__dirname, '../data/entrypointstore.json'),
      entrypointStoreRest: {
        sources: [
          {
            enabled: true,
            url: 'http://localhost:9000/auth',
            auth: {
              type: 'none'
            },
            transform: function(response) { return response; }
          }
        ]
      },
      authorization: {
        permissionPath: [sessionObjectName, 'user', 'permissions'],
        permissionExtractor: function(req) {
          if (!req || !req[sessionObjectName] || !req[sessionObjectName].user || !req[sessionObjectName].user.permissions) {
            return null;
          }
          return req[sessionObjectName].user.permissions;
        },
        permissionRules: [
          {
            enabled: true,
            url: '/tool(.*)',
            methods: ['GET', 'POST'],
            permission: 'user'
          }
        ]
      }
    }
  }
};
