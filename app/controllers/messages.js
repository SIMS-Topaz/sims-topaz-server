'use strict';

var mongoose = require('mongoose');
var Message = mongoose.model('Message');
var _ = require('lodash');
var utils = require('../utils/utils');
var config = require('../../config/conf');

exports.getPreviews = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};

exports.getMessage = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};

exports.postMessage = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};

exports.postLikeStatus = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};

exports.uploadPicture = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};
