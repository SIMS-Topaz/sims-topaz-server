'use strict';

var index = require('../controllers/index');

module.exports = function(app){
  app.get('/', index.getIndex);
};
