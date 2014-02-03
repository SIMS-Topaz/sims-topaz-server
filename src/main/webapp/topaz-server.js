/***************************************************************************
topaz-server:
service REST + websocket (maybe)
**************************************************************************/
var conf    = require('conf');
var _u      = require('underscore');
var express = require('express');
var app     = express();

console.log('topaz-server running at ' + conf.node.url + ':' + conf.node.port);

app.get('/', function(req, res)
{
    console.log('/home');
    res.send('Topaz Server Working!');
})
// test
.get('/hello/:corki', function(req, res)
{
    console.log('/sayHello/'+req.params.corki);
    res.send('Hello '+req.params.corki);
})
.use(function(req, res, next)
{
    res.redirect('/');
})
// pour plus tard... peut-etre...
//.use(express.json())
//.use(express.urlencoded())
.listen(conf.node.port);
