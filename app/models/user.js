'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var crypto = require('crypto');
var utils = require('../utils/utils');
var _ = require('lodash');

/**
 * User Schema
 */
var UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  providers: [String],
  marked_messages: [{ message: Schema.Types.ObjectId, mark: String }],
  local: {
    name: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    hashed_password: String,
    salt: String
  },
  facebook: {},
  twitter: {}
});

/**
 * Virtuals
 */
UserSchema
  .virtual('local.password')
  .set(function(password){
    this.local._password = password;
    this.local.salt = this.makeSalt();
    this.local.hashed_password = this.encryptPassword(password);
  })
  .get(function(){
    return this.local._password;
  });

/**
 * Validations
 */
// The 3 validations below only apply if you are signing up traditionally.
UserSchema.path('local.name').validate(function(name){
  // If you are authenticating by any of the oauth strategies, validate.
  if(this.providers.indexOf('local') === -1) return true;
  return (typeof name === 'string' && name.length > 0);
}, 'Name cannot be blank');

UserSchema.path('local.email').validate(function(email){
  // If you are authenticating by any of the oauth strategies, validate.
  if(this.providers.indexOf('local') === -1) return true;
  return (typeof email === 'string' && email.length > 0);
}, 'Email cannot be blank');

UserSchema.path('local.hashed_password').validate(function(hashed_password){
  // If you are authenticating by any of the oauth strategies, validate.
  if(this.providers.indexOf('local') === -1) return true;
  return (typeof hashed_password === 'string' && hashed_password.length > 0);
}, 'Password cannot be blank');


/**
 * Pre-save hook
 */
UserSchema.pre('save', function(next){
  if(!this.isNew) return next();

  if(this.providers.indexOf('local') !== -1 && !utils.validatePresenceOf(this.local.password)){
    next(new Error('Invalid password for local account'));
  }else{
    next();
  }
});

/**
 * Methods
 */
UserSchema.methods.authenticate = function(plainText){
  return this.encryptPassword(plainText) === this.local.hashed_password;
};

UserSchema.methods.makeSalt = function() {
  return crypto.randomBytes(16).toString('base64');
};

UserSchema.methods.encryptPassword = function(password){
  if (!password || !this.local.salt) return '';
  var salt = new Buffer(this.local.salt, 'base64');
  return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
};

/**
 * Statics
 */
UserSchema.statics.getTokens = function(userId, callback){
  this
    .model('User')
    .findById(userId, 'facebook.token twitter.token -_id')
    .lean()
    .exec(function(err, tokens){
      if(err) return callback(err);
      if(_.isEmpty(tokens)) return callback();
      callback(null, tokens);
    });
};

UserSchema.statics.getUserNames = function(callback){
  this
    .model('User')
    .find({}, 'name -_id')
    .lean()
    .exec(function(err, names){
      if(err) return callback(err);
      if(_.isEmpty(names)) return callback();
      names = _.pluck(names, 'name');
      return callback(null, names);
    });
};

UserSchema.statics.userExists = function(user, callback){
  this
    .model('User')
    .findOne(user)
    .lean()
    .exec(function(err, res){
      if(err) return callback(err);
      return callback(null, !_.isEmpty(res));
    });
};

mongoose.model('User', UserSchema);
