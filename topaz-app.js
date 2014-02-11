var mock = require('./mock.js');
var mysql_helper = require('./mysql-helper.js');
var conf  = require('./conf.js');
var _ = require ('underscore');

mysql_helper.openConnection();

var handleError = function(rules){
  var result = null;
  
  _.every(rules, function(rule){
    if(!rule.rule){
      result = {error: {code: rule.code, msg: rule.msg}};
      return false;
    }
    return true;
  });
  return result;
};

exports.get_index = function(req, res){
  res.send('Topaz Server Working!');
};

exports.get_previews = function(req, res){
  var rules = [
    {
      rule: (req.params.lat !== undefined),
      code: 400,
      msg: "Missing 'lat' parameter"
    }, {
      rule: (req.params.long !== undefined),
      code: 400,
      msg: "Missing 'long' parameter"
    }
  ];
  var error = handleError(rules);
  
  if(error !== null){
    res.json(error);
  }else{
    var lat = parseFloat(req.params.lat);
    var long = parseFloat(req.params.long);
    var radius = 50;
    mysql_helper.getPreviews(lat, long, radius, function (error, results) {
      if(error)
        console.error(error);
      results = _.map (results, function (result) {
        result['is_full'] = true;
        return result;
      });
      res.json (results);
    });
  }
};

exports.get_message = function(req, res){
  var rules = [{
      rule: (req.params.id !== undefined),
      code: 400,
      msg: "Missing 'id' parameter"
    }];
  var error = handleError(rules);
  
  if(error !== null){
    res.json(error);
  }else{
    var id = req.params.id;
    mysql_helper.getMessage(id, function (error, results){
      if(error)
        console.error(error);
      res.json(results);
    });
  }
};

exports.post_message = function(req, res){
  // curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/api/post_message -d '{"lat":12,"long":12,"text":"Hello World"}'
  var rules = [
    {
      rule: (_.isNumber(parseFloat(req.body.lat))),
      code: 400,
      msg: "Missing 'lat' parameter"
    },{
      rule: (_.isNumber(parseFloat(req.body.long))),
      code: 400,
      msg: "Missing 'long' parameter"
    },{
      rule: (_.isString(req.body.text)),
      code: 400,
      msg: "Missing 'text' parameter"
    }
  ];
  var error = handleError(rules);
  
  if(error !== null){
    res.json(error);
  }else{
    var message = req.body;
    message.date = new Date().getTime();
    mysql_helper.postMessage(message, function (error, result){
      if(error)
        console.error(error);
      message['id'] = result.insertId;
      res.json (message);
    });
  }
};
