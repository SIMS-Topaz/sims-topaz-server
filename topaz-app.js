var mock = require('./mock.js');

exports.get_index = function(req, res){
  res.send('Topaz Server Working!');
};

exports.get_previews = function(req, res){
  res.send(mock.get_previews(req.params.lat, req.params.long));
};

exports.get_message = function(req, res){
  res.send(mock.get_message(req.params.id));
};

exports.post_message = function(req, res){
  //curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/post_message -d "{lat:12,long:12,text:'Hello World'}" 
  res.send(mock.post_message(req.body));
};
