'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');
var ObjectId = Schema.Types.ObjectId;

/**
 * Comment Schema
 */
var CommentSchema = new Schema({
  user_id: { type: ObjectId, required: true },
  user_name: String,
  message_id: { type: ObjectId, required: true },
  text: String,
  date: { type: Date, default: Date.now }
});

CommentSchema.statics.getComments = function(message_id, callback){
  mongoose.model('Comment')
    .find({message_id: mongoose.Types.ObjectId(message_id)})
    .lean()
    .exec(function(err, comments){
      if(_.isEmpty(comments)) comments = [];
      else comments = comments.map(function(comment){
        comment._id = comment._id.toString();
        comment.user_id = comment.user_id.toString();
        comment.message_id = comment.message_id.toString();
        return comment;
      });
      callback(err, comments);
    });
};

mongoose.model('Comment', CommentSchema);
