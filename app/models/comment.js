'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');

/**
 * Comment Schema
 */
var CommentSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true },
  message_id: { type: Schema.Types.ObjectId, required: true },
  text: String,
  date: { type: Date, default: Date.now }
});

mongoose.model('Comment', CommentSchema);
