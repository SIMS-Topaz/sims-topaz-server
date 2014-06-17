'use strict';

var users = require('../controllers/users');
var config = require('../../config/conf');
var _ = require('lodash');

module.exports = function(app, passport){
  app
    .get('/api/:version/user_auth', users.getUserAuth)
    .post('/api/:version/user_auth', passport.authenticate('local', {
      failureRedirect: '/',
      failureFlash: true
    }), users.session)
    .post('/api/:version/signup', users.signup)
    .get('/api/:version/signout', users.signout)
    .get('/api/:version/user_info/:user_id?', users.user)
    .post('/api/:version/user_info/:user_id?', users.updateUser);

  /*********************************** OAUTH ROUTES ***********************************/
    // Setting the local strategy route, sign in
  app.post('/users/session', passport.authenticate('local', {
    failureRedirect: '/signin',
    failureFlash: true
  }), users.session);

  // Setting the facebook oauth routes
  if(!_.isEmpty(config.facebook)){
    app
      .get('/auth/facebook', passport.authenticate('facebook', {
        scope: ['email', 'publish_actions'],
        failureRedirect: '/'
      }), users.session)
      .get('/auth/facebook/callback', passport.authenticate('facebook', {
        failureRedirect: '/'
      }), users.authCallback);
  }

  // Setting the twitter oauth routes
  if(!_.isEmpty(config.twitter)){
    app
      .get('/auth/twitter', passport.authenticate('twitter', {
        failureRedirect: '/'
      }), users.session)
      .get('/auth/twitter/callback', passport.authenticate('twitter', {
        failureRedirect: '/'
      }), users.authCallback);
  }
  /*********************************** CONNECT ROUTES ***********************************/
    // linking local account
  app.post('/connect/local', users.signup);

  // linking facebook account
  if(!_.isEmpty(config.facebook)){
    app
      .get('/connect/facebook', passport.authorize('facebook', {
        scope: ['email', 'user_about_me', 'publish_actions'],
        failureRedirect: '/'
      }), users.session)
      .get('/connect/facebook/callback', passport.authorize('facebook', {
        failureRedirect: '/'
      }), users.authCallback);
  }

  // linking twitter account
  if(!_.isEmpty(config.twitter)){
    app
      .get('/connect/twitter', passport.authorize('twitter', {
        failureRedirect: '/'
      }), users.session)
      .get('/connect/twitter/callback', passport.authorize('twitter', {
        failureRedirect: '/'
      }), users.authCallback);
  }
  /**************************************************************************************/
  // unlink an account
  app.get('/unlink/:account', users.unlink);
};
