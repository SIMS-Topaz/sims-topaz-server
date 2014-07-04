'use strict';

var mongoose = require('mongoose');
var Comment = mongoose.model('Comment');
var Message = mongoose.model('Message');
var _ = require('lodash');
var utils = require('../utils/utils');
var config = require('../../config/conf');

var preGetComments = function(req){
  var rules = [{
    rule: req.params.message_id,
    code: 400,
    msg: 'PARAM_ERR',
    details: "Missing 'message_id' parameter"
  }];

  return {
    error: utils.handleError(rules),
    version: req.params.version,
    message_id: req.params.message_id
  };
};

var prePostComment = function(req){
  var comment = req.body;
  comment.user_id = req.session.user_id;
  comment.message_id = req.params.message_id;

  var rules = [
    {
      rule: comment.message_id,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'message_id' parameter"
    }, {
      rule: _.isString(comment.text),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'text' parameter"
    }, {
      rule: _.isString(comment.user_name),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'user_name' parameter"
    }
  ];

  return {
    error: utils.handleError(rules),
    version: req.params.version,
    comment: comment
  };  
};

exports.getComments = function(req, res){
  var prep = preGetComments(req);
  if(prep.error) return res.json(prep.error);

  Comment.getComments(prep.message_id, function(err, results){
    if(err) res.json(utils.formatError(500, 'MONGO_ERR', 'Internal Server Error.'));
    else res.json(utils.formatResponse(prep.version, 200, 'OK', results));
  });
};

exports.postComment = function(req, res){
  var prep = prePostComment(req);
  if(prep.error) return res.json(prep.error);

  Message.getMessage(prep.comment.message_id, function(err, message){
    if(err) return res.json(utils.formatError(500, 'MONGO_ERR', 'Internal Server Error'));
    if(!message) return res.json(utils.formatError(404, 'MSG_ERR', 'Message not found'));
    var comment = new Comment(prep.comment);
    comment.save(function(save_err){
      if(save_err) return res.json(utils.formatError(500, 'MONGO_ERR', 'Internal Server Error'));
      comment = comment.toObject();
      comment._id = comment._id.toString();
      comment.user_id = comment.user_id.toString();
      comment.message_id = comment.message_id.toString();
      res.json(utils.formatResponse(prep.version, 201, 'Created', comment));
    });
  });
};
