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

mysql_helper.openConnection();

app.use(express.json())
.use(express.urlencoded())
.get('/', topaz.get_index)
.get('/api/:version/get_previews/:lat1?/:long1?/:lat2?/:long2?', topaz.get_previews)
.get('/api/:version/get_message/:id?', topaz.get_message)
.post('/api/:version/post_message', topaz.post_message)
.listen(conf.node.port);

console.log('topaz-server running at ' + conf.node.url + ':' + conf.node.port);
