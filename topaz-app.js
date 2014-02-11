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

var handleResponse = function(url, result, message)
{
  return (url.indexOf('v1.1') != -1) ? {success: message, data: result} : result;
};

exports.get_index = function(req, res){
  res.send('Topaz Server Working!');
};

exports.get_previews = function(req, res){
  var rules = [
    {
      rule: (req.params.lat1 !== undefined),
      code: 400,
      msg: "Missing 'lat1' parameter"
    }, {
      rule: (req.params.long1 !== undefined),
      code: 400,
      msg: "Missing 'long1' parameter"
    }
  ];
  if(req.url.indexOf('v1.1') != -1){
    rules = rules.concat(
    {
      rule: (req.params.lat2 !== undefined),
      code: 400,
      msg: "Missing 'lat2' parameter"
    }, {
      rule: (req.params.long2 !== undefined),
      code: 400,
      msg: "Missing 'long2' parameter"
    });
  }
  
  var error = handleError(rules);
  
  if(error !== null){
    res.json(error);
  }else{
    var lat1  = parseFloat(req.params.lat1);
    var long1 = parseFloat(req.params.long1);
    var lat2  = parseFloat(req.params.lat2) || 50;
    var long2 = parseFloat(req.params.long2) || null;
    mysql_helper.getPreviews(lat1, long1, lat2, long2, function (error, results) {
      if(error)
        console.error(error);
      results = _.map (results, function (result) {
        result['is_full'] = true;
        return result;
      });
      res.json(handleResponse(req.url, results, {code: 200, msg: 'OK'}));
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
      res.json(handleResponse(req.url, results, {code: 200, msg: 'OK'}));
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
      res.json(handleResponse(req.url, message, {code: 201, msg: 'Created'}));
    });
  }
};
