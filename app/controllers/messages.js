'use strict';

var async = require('async');
var mongoose = require('mongoose');
var Message = mongoose.model('Message');
var Vote = mongoose.model('Vote');
var Comment = mongoose.model('Comment');
var _ = require('lodash');
var utils = require('../utils/utils');
var config = require('../../config/conf');

var preGetPreviews = function(req){
  var lat1 = parseFloat(req.params.lat1);
  var lat2 = parseFloat(req.params.lat2);
  var long1 = parseFloat(req.params.long1);
  var long2 = parseFloat(req.params.long2);
  var by_tag = req.params.by_tag;
  var tag;

  var rules = [
    { rule: req.params.lat1,  code: 400, msg: 'PARAM_ERR', details: "Missing 'lat1' parameter" },
    { rule: lat1,             code: 400, msg: 'PARAM_ERR', details: "Invalid 'lat1' parameter" },
    { rule: req.params.long1, code: 400, msg: 'PARAM_ERR', details: "Missing 'long1' parameter" },
    { rule: long1,            code: 400, msg: 'PARAM_ERR', details: "Invalid 'long1' parameter" },
    { rule: req.params.lat2,  code: 400, msg: 'PARAM_ERR', details: "Missing 'lat2' parameter" },
    { rule: lat2,             code: 400, msg: 'PARAM_ERR', details: "Invalid 'lat2' parameter" },
    { rule: req.params.long2, code: 400, msg: 'PARAM_ERR', details: "Missing 'long2' parameter" },
    { rule: long2,            code: 400, msg: 'PARAM_ERR', details: "Invalid 'long2' parameter" }
  ];
  
  if(by_tag){
    if(req.query.tag) tag = '#'+req.query.tag;
    rules.push(
      { rule: by_tag === 'BY_TAG', code: 400, msg: 'PARAM_ERR', details: "Invalid 'by_tag' parameter" },
      { rule: tag, code: 400, msg: 'PARAM_ERR', details: "Missing 'tag' parameter" });
  }

  return {
    error: utils.handleError(rules),
    version: req.params.version,
    min_lat: lat1,
    min_long: long1,
    max_lat: lat2,
    max_long: long2,
    tags: tag ? [tag] : []
  };
};

var preGetMessage = function(req){
  var with_comments = req.params.with_comments;
  var comments_rule = (!with_comments || with_comments === 'MSG' || with_comments === 'WITH_COMMENTS');
  var rules = [
    { rule: req.params.id, code: 400, msg: 'PARAM_ERR', details: "Missing 'id' parameter" },
    { rule: comments_rule, code: 400, msg: 'PARAM_ERR', details: "Invalid 'with_comments' parameter" }
  ];

  return {
    error: handleError(rules),
    version: req.params.version,
    message_id: req.params.id,
    user_id: req.session.user_id,
    with_comments: with_comments
  };
};

exports.getPreviews = function(req, res){
  var prep = preGetPreviews(req);
  if(prep.error) return res.json(prep.error);
  
  Message.getPreviews(_.omit(prep, ['error', 'version']), function(err, results){
    if(err) res.json(utils.formatError(500, 'MONGO_ERR', 'Internal Server Error.'));
    else res.json(utils.formatResponse(prep.version, 200, 'OK', results));
  });
};

exports.getMessage = function(req, res){
  var prep = preGetMessage(req);
  if(prep.error) return res.json(prep.error);
  
  async.parallel({
    message: function(callback){
      Message.getMessage(prep.message_id, callback);
    },
    likeStatus: function(callback){
      Vote.getLikeStatus(prep, callback);
    },
    comments: function(callback){
      if(prep.with_comments !== 'WITH_COMMENTS') callback();
      else Comment.getComments(prep.message_id, callback);
    }
  }, function(err, data){
    if(err) return res.json(utils.formatError(500, 'MONGO_ERR', 'Internal Server Error.'));
    data.message.likeStatus = data.likeStatus;
    if(data.comments) data.message.comments = data.comments;
    res.json(utils.formatResponse(prep.version, 200, 'OK', data.message));
  });  
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
