'use strict';

var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var User = mongoose.model('User');
var config = require('./../config/conf');
var passportHelper = require('./passport-helper');
var _ = require('lodash');

module.exports = function(passport) {

  // Serialize the user id to push into the session
  passport.serializeUser(function(user, done){
    done(null, user.id);
  });

  // Deserialize the user object based on a pre-serialized token
  // which is the user id
  passport.deserializeUser(function(id, done){
    User.findOne({ _id: id }, '-salt -hashed_password', function(err, user){
      done(err, user);
    });
  });

  // Use local strategy
  passport.use(new LocalStrategy({
      usernameField: 'name',
      passwordField: 'password',
      passReqToCallback: true
    },
    function(req, name, password, done){
      process.nextTick(function(){
        User.findOne({ 'local.name': name }, function(err, user){
          if(err) return done(err);
          if(!user || !user.authenticate(password)) return done(null, false);
          return done(null, user);
        });
      });
    }));

  // Use twitter strategy if it is configured
  if(!_.isEmpty(config.twitter)){
    passport.use(new TwitterStrategy({
        consumerKey: config.twitter.clientID,
        consumerSecret: config.twitter.clientSecret,
        callbackURL: config.twitter.callbackURL,
        passReqToCallback: true
      },
      function(req, token, tokenSecret, profile, done){
        passportHelper.process('twitter', req, token, tokenSecret, profile, done);
      }));
  }

  // Use facebook strategy if it is configured
  if(!_.isEmpty(config.facebook)){
    passport.use(new FacebookStrategy({
        clientID: config.facebook.clientID,
        clientSecret: config.facebook.clientSecret,
        callbackURL: config.facebook.callbackURL,
        profileFields: ['id', 'displayName', 'username', 'name', 'emails'],
        passReqToCallback: true
      },
      function(req, accessToken, refreshToken, profile, done){
        passportHelper.process('facebook', req, accessToken, refreshToken, profile, done);
      }));
  }
};
