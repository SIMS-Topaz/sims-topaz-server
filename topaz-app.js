var mock = require('./mock.js');
var mysql_helper = require('./mysql-helper.js');
var conf  = require('./conf.js');

mysql_helper.openConnection();

exports.get_index = function(req, res){
  res.send('Topaz Server Working!');
};

exports.get_previews = function(req, res){
  var lat = parseFloat(req.params.lat);
  var long = parseFloat(req.params.long);
  var radius = 0.0050;
  mysql_helper.getPreviews(lat, long, radius, function (error, results) {
    if(error)
      console.error(error);
    res.json (results);
  });
};

exports.get_message = function(req, res){
  var id = req.params.id;
  mysql_helper.getMessage(id, function (error, results){
    if(error)
      console.error(error);
    res.send(results);
  });
};

exports.post_message = function(req, res){
  // curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/api/post_message -d '{"lat":12,"long":12,"text":"Hello World"}'
  var message = req.body;
  message.is_full = (message.text.length <= conf.PREVIEW_SIZE) ? 1 : 0;
  message.date = new Date().getTime();
  mysql_helper.postMessage(message, function (error, result){
    if(error)
      console.error(error);
    message['id'] = result.insertId;
    res.json (message);
  });
};
