'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var _ = require('lodash');
var utils = require('../utils/utils');
var config = require('../../config/conf');

var createUser = function(req, res, next){
  var user = new User({ name: req.body.name, local: req.body });
  console.log('Creation of new user:', user.name);
  user.providers.push('local');
  user.save(function(error){
    if(error){
      console.log('Failed to save user', user.name, error);
      switch(error.code){
        case 11000:
        case 11001:
          error = utils.formatError(409, 'EMAIL_ERR', 'Email already in use');
          //error = utils.formatError(409, 'USERNAME_ERR', 'User name already in use');
          break;
        default:
          error = utils.formatError(409, 'FIELDS_ERR', 'Please fill all the required fields');
          break;
      }
      return res.json(error);
    }
    req.logIn(user, function(err){
      if(err) return next(err);
      req.session.user_name = user.name;
      req.session.user_id = user._id;
      return res.json(utils.formatResponse(201, 'Created', { user_id: user._id, user_name: user.name }, req.body.version));
    });
  });
};

var createLocalAccount = function(req, res){
  var user = req.user;
  var error500 = utils.formatError(500, 'SERVER_ERR', 'Internal Server Error');
  
  User.findOne({'local.name': req.body.username}, function(error, local_account){
    if(error) return res.json(error500);
    if(!local_account) return res.json(utils.formatError(404, 'ACCOUNT_ERR', 'This account does not exist'));
    
    var old_account = _.clone(local_account.toObject());
    _.extend(local_account, user);
    local_account.local = old_account.local;
    local_account.providers = _.union(local_account.providers, old_account.providers);
    User.findByIdAndRemove(old_account._id, function(err){
      if(err) return res.json(error500);
      local_account.save(function(err){
        if(err) return res.json(error500);
        return res.json(utils.formatResponse(200, 'OK', local_account, req.body.version));
      });
    });
  });
};

/**
 * Auth callback
 */
exports.authCallback = function(req, res){
  res.json(utils.formatResponse(200, 'OK', req.user, req.body.version));
};

/**
 * Session
 */
exports.session = function(req, res){
  res.json(utils.formatResponse(200, 'OK', req.user, req.body.version));
};

/**
 * Logout
 */
exports.signout = function(req, res){
  req.logout();
  res.json(utils.formatResponse(200, 'OK', null, req.body.version));
};

/**
 * Create user
 */
exports.signup = function(req, res, next){
  process.nextTick(function(){
    if(!req.user){ // if user not already logged in
      createUser(req, res, next);
    }else if(req.user.providers.indexOf('local') === -1){ // if the user is logged in but has not local account
      createLocalAccount(req, res);
    }else{ // if the user is logged in and has a local account, ignore sign up
      return res.json(utils.formatResponse(200, 'OK', req.user, req.body.version));
    }
  });
};

exports.getUserAuth = function(req, res){
  var response;
  if(req.session.user_id){
    response = {
      success: {
        code: 200,
        msg: 'OK'
      },
      data: {
        user_name: req.session.user_name,
        user_id: req.session.user_id
      }
    };
  }else{
    response = {
      error: {
        code: 401,
        msg: 'NOT_AUTH_ERR',
        details: 'User not authenticated'
      }
    };
  }
  res.json(response);
};

exports.unlink = function(req, res){
  var user = req.user;
  var provider = req.params.account;

  if(provider === 'local' || _.isEmpty(config[provider]) || user.providers.indexOf(provider) === -1){
    return res.send(user);
  }
  console.log('Unlinking', provider, 'account from user', user.name);
  user[provider] = undefined;
  user.providers = _.without(user.providers, provider);
  user.save(function(err){
    if(err) console.log(err);
    res.json(utils.formatResponse(200, 'OK', req.user, req.body.version));
  });
};

/**
 * Send User
 */
exports.me = function(req, res){
  if(!req.user) return res.json(utils.formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  res.json(utils.formatResponse(200, 'OK', req.user, req.body.version));
  res.json(req.user || null);
};

/**
 * Find user by id
 */
exports.user = function(req, res){
  User
    .findOne({ _id: req.params.user_id })
    .exec(function(err, user){
      if(err) return next(err);
      if(!user) return next(new Error('Failed to load User ' + req.params.user_id));
      res.json(utils.formatResponse(200, 'OK', user, req.body.version));
    });
};

exports.updateUser = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};
