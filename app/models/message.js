'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var utils = require('../utils/utils');
var config = require('../../config/conf');
var _ = require('lodash');
var console = require('logbrok')(__filename);

/**
 * Message Schema
 */
var MessageSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true },
  user_name: String,
  text: String,
  lat: { type: Number, required: true },
  long: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  tags: [String],
  picture_url: String
});

MessageSchema.path('text').validate(function(text){
  return (typeof text === 'string' && text.length > 0);
}, 'Message Text cannot be blank');

MessageSchema.statics.getPreviews = function(criteria, callback){
  var query = mongoose.model('Message')
    .where('lat').gte(criteria.min_lat).lte(criteria.max_lat)
    .where('long').gte(criteria.min_long).lte(criteria.max_long);
  if(criteria.tags) query.where('tags').in(criteria.tags);
  query
    .limit(1000)
    .lean()
    .exec(function(err, previews){
      if(_.isEmpty(previews)) previews = [];
      else previews = previews.map(function(preview){
        preview._id = preview._id.toString();
        preview.user_id = preview.user_id.toString();
        preview.text = preview.text.substr(0, config.PREVIEW_SIZE);
        return preview;
      });
      
      callback(err, previews);
    });
};

MessageSchema.statics.getMessage = function(id, callback){
  mongoose.model('Message')
    .findById(id)
    .lean()
    .exec(function(err, message){
      if(message){
        message._id = message._id.toString(); 
        message.user_id = message.user_id.toString();
      }
      callback(err, message);
    });
};

mongoose.model('Message', MessageSchema);
