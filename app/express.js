'use strict';

var config = require('../config/conf');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var utils = require('./utils/utils');
var uploadDir = config.root+'/uploads/';

module.exports = function(app, passport){
  /*************************** MIDDLEWARE BEFORE ROUTES ***************************/
  app.set('showStackError', true);
  // Enable jsonp
  app.enable('jsonp callback');
  // The cookieParser should be above session
  app.use(require('cookie-parser')());
  app.use(require('body-parser')());
  app.use(require('multer')({ dest: uploadDir }));
  // Express/Mongo session storage
  app.use(session({
    secret: config.sessionSecret,
    store: new RedisStore(config.redis)
  }));
  /********************************************************************************/

  /************************************ ROUTES ************************************/
  // Bootstrap routes
  utils.load(config.root + '/app/routes', 'middlewares', function(path){
    require(path)(app, passport);
  });
  /********************************************************************************/

  /*************************** MIDDLEWARE AFTER ROUTES ***************************/
  app.use('/img', require('express').static(uploadDir));
  // Assume "not found" in the error msgs is a 404. this is somewhat
  // silly, but valid, you can do whatever you like, set properties,
  // use instanceof etc.
  app.use(function(err, req, res, next){
    // Treat as 404
    if(~err.message.indexOf('not found')) return next();
    console.error(err.stack);
    res.status(500).render('error', { error: { code: 500, msg: err.stack } });
  });
  // Assume 404 since no middleware responded
  app.use(function(req, res){
    res.status(404).render('error', { url: req.originalUrl, error: { code: 404, msg: 'Not found' } });
  });
  /********************************************************************************/
};
