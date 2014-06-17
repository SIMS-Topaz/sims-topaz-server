'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var utils = require('../utils/utils');
var _ = require('lodash');

/**
 * Message Schema
 */
var MessageSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true },
  text: String,
  lat: Number,
  long: Number,
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  tags: [String],
  picture_url: String
});

MessageSchema.path('text').validate(function(text){
  return (typeof text === 'string' && text.length > 0);
}, 'Message Text cannot be blank');

mongoose.model('Message', MessageSchema);
