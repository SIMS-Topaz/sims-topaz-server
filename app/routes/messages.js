'use strict';

var messages = require('../controllers/messages');
var config = require('../../config/conf');
var _ = require('lodash');

module.exports = function(app){
  app
    .get('/api/:version/get_previews/:lat1?/:long1?/:lat2?/:long2?/:by_tag?', messages.getPreviews)
    .get('/api/:version/get_message/:id?/:with_comments?', messages.getMessage)
    .post('/api/:version/post_message', messages.postMessage)
    .post('/api/:version/post_like_status', messages.postLikeStatus)
    .post('/api/:version/upload_picture', messages.uploadPicture);
};
