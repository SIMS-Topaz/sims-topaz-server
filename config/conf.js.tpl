'use strict';

/***************************************************************************
conf:
Configuration file for Backend process
**************************************************************************/
module.exports = {
  // root path of the project
  root: require('path').normalize(__dirname + '/..'),
  sessionSecret: 'sessionSecret',
  // maximum size of a message preview
  PREVIEW_SIZE: 50,
  node: {
    url: 'localhost',
    http_port: 8080,
    https_port: 8081
  },
  mysql: {
    url: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'topaz',
    multipleStatements: true
  },
  redis: {
    url: 'localhost',
    port: 6379
  },
  mongo: {
    uri: 'mongodb://localhost/topaz',
    options: {
      user: 'topaz',
      pass: 'password'
    }
  },
  facebook: {
    clientID: 'clientID',
    clientSecret: 'clientSecret',
    callbackURL: 'http://localhost:3000/auth/facebook/callback'
  },
  twitter: {
    clientID: 'clientID',
    clientSecret: 'clientSecret',
    callbackURL: 'http://localhost:3000/auth/twitter/callback'
  }
};
