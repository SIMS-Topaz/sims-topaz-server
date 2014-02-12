/***************************************************************************
topaz-server:
service REST + websocket (maybe)
**************************************************************************/
var conf    = require('./conf.js');
var _       = require('underscore');
var express = require('express');
var app     = express();
var topaz   = require('./topaz-app.js');

app.use(express.json())
.use(express.urlencoded())
.get('/', topaz.get_index)
// api v1.0
.get('/api/v1/get_previews/:lat1?/:long1?', topaz.get_previews)
.get('/api/v1/get_message/:id?', topaz.get_message)
.post('/api/v1/post_message', topaz.post_message)
// api v1.1
.get('/api/v1.1/get_previews/:lat1?/:long1?/:lat2?/:long2?', topaz.get_previews)
.get('/api/v1.1/get_message/:id?', topaz.get_message)
.post('/api/v1.1/post_message', topaz.post_message)
.listen(conf.node.port);

console.log('topaz-server running at ' + conf.node.url + ':' + conf.node.port);
