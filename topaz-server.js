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
.get('/api/get_previews/:lat/:long', topaz.get_previews)
.get('/api/get_message/:id', topaz.get_message)
.post('/api/post_message', topaz.post_message)
.listen(conf.node.port);

console.log('topaz-server running at ' + conf.node.url + ':' + conf.node.port);
