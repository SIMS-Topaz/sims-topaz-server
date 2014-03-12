var http    = require('http');
var https   = require('https');
var fs   = require('fs');

var _       = require('underscore');
var express = require('express');

var conf    = require('./conf.js');
var topaz   = require('./topaz-app.js');
var mysql_helper = require('./mysql-helper.js');

var app     = express();
var RedisStore = require('connect-redis')(express);

mysql_helper.openConnection();

app
.use(express.bodyParser({ keepExtensions: true, uploadDir: './uploads/' }))
.use(express.cookieParser())
.use(express.session({
  store: new RedisStore({
    host: 'localhost',
    port: 6379,
  }),
  secret: '12345'
}))
.use('/img', express.static(__dirname + '/uploads'))
.get('/', topaz.get_index)
.get('/api/:version/get_previews/:lat1?/:long1?/:lat2?/:long2?/:by_tag?', topaz.get_previews)
.get('/api/:version/get_message/:id?/:with_comments?', topaz.get_message)
.get('/api/:version/get_comments/:message_id?', topaz.get_comments)
.post('/api/:version/upload_picture', topaz.upload_picture)
.post('/api/:version/post_message', topaz.post_message)
.post('/api/:version/post_comment/:message_id?', topaz.post_comment)
.post('/api/:version/post_like_status', topaz.post_like_status)
.get('/api/:version/user_auth', topaz.get_user_auth)
.post('/api/:version/user_auth', topaz.post_user_auth)
.post('/api/:version/signup', topaz.post_signup)
.get('/api/:version/user_info/:user_id?', topaz.get_user_info)
.post('/api/:version/user_info/:user_id?', topaz.post_user_info);

http.createServer(app).listen(conf.node.http_port);

var error, cred;
try{
  cred = {
    key: fs.readFileSync('sslcert/key.pem', 'utf8'),
    cert: fs.readFileSync('sslcert/cert.pem', 'utf8')
  };
}catch(err){
  error = err;
}finally{
  if(!error)
    https.createServer(cred, app).listen(conf.node.https_port);
  console.log('topaz-server running at '+conf.node.url+':'+conf.node.http_port+' (HTTP)'+(!error?'/'+conf.node.https_port+' (HTTPS)':''));
}
