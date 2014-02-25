/***************************************************************************
topaz-server:
service REST + websocket (maybe)
**************************************************************************/
var conf    = require('./conf.js');
var _       = require('underscore');
var express = require('express');
var app     = express();
var topaz   = require('./topaz-app.js');
var mysql_helper = require('./mysql-helper.js');
var RedisStore = require('connect-redis')(express);

mysql_helper.openConnection();

app.use(express.json())
.use(express.urlencoded())
.use(express.cookieParser())
.use(express.session({
  store: new RedisStore({
    host: 'localhost',
    port: 6379,
  }),
  secret: '12345'
}))
.get('/', topaz.get_index)
.get('/api/:version/get_previews/:lat1?/:long1?/:lat2?/:long2?', topaz.get_previews)
.get('/api/:version/get_message/:id?', topaz.get_message)
.get('/api/:version/get_comments/:message_id?', topaz.get_comments)
.post('/api/:version/post_message', topaz.post_message)
.post('/api/:version/post_comment/:id', topaz.post_comment)
.get('/api/:version/user_auth', topaz.get_user_auth)
.post('/api/:version/user_auth', topaz.post_user_auth)
.post('/api/:version/signup', topaz.post_signup)
.listen(conf.node.port);

console.log('topaz-server running at ' + conf.node.url + ':' + conf.node.port);
