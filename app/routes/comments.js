'use strict';

var comments = require('../controllers/comments');
var config = require('../../config/conf');
var _ = require('lodash');

module.exports = function(app){
  app
    .get('/api/:version/get_comments/:message_id?', comments.getComments)
    .post('/api/:version/post_comment/:message_id?', comments.postComment);
};
