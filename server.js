var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var passport = require('passport');
var config = require('./config/conf.js');
var mongoose = require('mongoose');
var utils = require('./app/utils/utils');

// Bootstrap db connection
mongoose.connect(config.mongo.uri, config.mongo.options);
// Bootstrap models
utils.load(__dirname+'/app/models');
// Bootstrap passport config
require('./app/passport')(passport);

var app = express();
require('./app/express')(app, passport);

http.createServer(app).listen(config.node.http_port);
console.log('Topaz Server (HTTP) running at',config.node.url+':'+config.node.http_port);

try{
  var credentials = {
    key: fs.readFileSync('sslcert/key.pem', 'utf8'),
    cert: fs.readFileSync('sslcert/cert.pem', 'utf8')
  };
  https.createServer(credentials, app).listen(config.node.https_port);
  console.log('Topaz Server (HTTPS) running at',config.node.url+':'+config.node.https_port);
}catch(err){
  console.log('Failed to start Topaz Server (HTTPS):', err);
}
