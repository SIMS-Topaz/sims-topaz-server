'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');
var ObjectId = mongoose.Types.ObjectId;

/**
 * Vote Schema
 */
var VoteSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true },
  message_id: { type: Schema.Types.ObjectId, required: true },
  likeStatus: String
});

VoteSchema.statics.getLikeStatus = function(criteria, callback){
  mongoose.model('Vote')
    .find({user_id: new ObjectId(criteria.user_id), message_id: new ObjectId(criteria.message_id)}, 'likeStatus -_id')
    .lean()
    .exec(function(err, status){
      status = _.isEmpty(status) ? null : status.likeStatus;
      callback(err, status);
    });
};

mongoose.model('Vote', VoteSchema);
