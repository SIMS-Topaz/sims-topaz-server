'use strict';

var mongoose = require('mongoose');
var Comment = mongoose.model('Comment');
var _ = require('lodash');
var utils = require('../utils/utils');
var config = require('../../config/conf');

exports.getComments = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};

exports.postComment = function(req, res){
  res.json(utils.formatError(500, 'SERVER_ERR', 'Functionality not implemented yet.'));
};
