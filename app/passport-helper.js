'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var _ = require('lodash');

var link = function(user, provider, accessToken, refreshToken, profile, done){
  // protection: if the provider account is already linked, skip
  if(user.providers.indexOf(provider) !== -1 || user[provider] && user[provider].token) return done(null, user);
  
  console.log('Linking', provider, 'account of user', user.name);
  user[provider] = _.omit(profile, ['_raw', '_json', 'emails', 'provider']);
  if(accessToken){
    user[provider].token = { access: accessToken, secret: refreshToken };
    user.providers.push(provider);
  }
  if(provider !== 'twitter'){
    user[provider].email = profile.emails[0].value;
    if(user.mails.length === 0 && profile.emails[0].value){
      user.mails.push(profile.emails[0].value);
    }
  }

  user.save(function(err){
    if(err) console.log(err);
    return done(err, user);
  });
};

var create = function(provider, profile, done){
  var user = new User({
    name: profile.displayName || profile.username
  });
  console.log('Creation of new user:', user.name);
  link(user, provider, null, null, profile, done);
};

var linkAndRemove = function(current_user, user, provider, accessToken, refreshToken, profile, done){
  user.remove(function(err, user){
    console.log('Removing old user', user.name);
    if(err){
      console.log(err);
      return done(err);
    }
    link(current_user, provider, accessToken, refreshToken, profile, done);
  });
};

exports.process = function(provider, req, accessToken, refreshToken, profile, done){
  process.nextTick(function(){
    //var id = (provider === 'twitter') ? 'id_str' : 'id';
    var criteria = {};
    criteria[provider+'.id'] = profile.id;

    User.findOne(criteria, function(err, user){
      if(err) return done(err);
      if(!req.user){ // user not already logged, so he wants to sign in with this provider
        if(!user){ // no corresponding provider account found in the db
          create(provider, profile, done);
        }else{ // this provider account was already registered in the db
          link(user, provider, accessToken, refreshToken, profile, done);
        }
      }else{ // the user is already logged, so he wants to link this provider account
        if(!user){ // no corresponding provider account found in the db
          link(req.user, provider, accessToken, refreshToken, profile, done);
        }else{ // this provider account was already registered in the db
          linkAndRemove(req.user, user, provider, accessToken, refreshToken, profile, done);
        }
      }
    });
  });
};
