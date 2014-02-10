var mock = require('./mock.js');
var mysql_helper = require('./mysql-helper.js');

mysql_helper.openConnection();

exports.get_index = function(req, res){
  res.send('Topaz Server Working!');
};

exports.get_previews = function(req, res){
  var lat = parseFloat(req.params.lat);
  var long = parseFloat(req.params.long);var radius = 0.0015;
  var radius = 0.0050;
  mysql_helper.getPreviews(lat, long, radius, function (error, results) {
    if(error)
      console.error(error);
    res.json (results);
  });
};

exports.get_message = function(req, res){
  res.send(mock.get_message(req.params.id));
};

exports.post_message = function(req, res){
  //curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/post_message -d "{lat:12,long:12,text:'Hello World'}" 
  res.send(mock.post_message(req.body));
};
