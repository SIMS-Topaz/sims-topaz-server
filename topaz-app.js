var mysql_helper = require('./mysql-helper.js');
var conf  = require('./conf.js');
var _ = require ('underscore');

var get_index = function(req, res){
  res.send('Topaz Server Working!');
};

var prepare_get_previews = function(req, callback){
  var version = req.params.version;
  var lat1 = req.params.lat1;
  var lat2 = req.params.lat2;
  var long1 = req.params.long1;
  var long2 = req.params.long2;

  var rules = [
    {
      rule: (lat1 !== undefined),
      code: 400,
      msg: "Missing 'lat1' parameter"
    }, {
      rule: (long1 !== undefined),
      code: 400,
      msg: "Missing 'long1' parameter"
    }
  ];

  if(version === 'v1.1'){
    rules = rules.concat(
    {
      rule: (lat2 !== undefined),
      code: 400,
      msg: "Missing 'lat2' parameter"
    }, {
      rule: (long2 !== undefined),
      code: 400,
      msg: "Missing 'long2' parameter"
    });
  }
  
  var error = handleError(rules);
  lat1  = parseFloat(lat1);
  long1 = parseFloat(long1);
  if(version === 'v1'){
    lat2  = 50;
    long2 = null;
  }else{
    lat2  = parseFloat(lat2);
    long2 = parseFloat(long2);
  }
  callback (error, version, lat1, long1, lat2, long2);
};

var get_previews = function(req, res){
  prepare_get_previews(req, function(error, version, lat1, long1, lat2, long2){
    if(error !== null){
      res.json(error);
    }else{
      mysql_helper.getPreviews(lat1, long1, lat2, long2, function (error, results) {
	if(error){
	  console.error(error);
	  res.json(formatError(500, error));
	}else{
	  results = _.map (results, function (result) {
	    result['is_full'] = true;
	    return result;
	  });
	  res.json(formatResponse(version, 200, 'OK', results));
	}
      });
    }
  });
};

var prepare_get_message = function(req, callback){
  var id = req.params.id;
  var version = req.params.version;

  var rules = [{
      rule: (id !== undefined),
      code: 400,
      msg: "Missing 'id' parameter"
    }];

  var error = handleError(rules);
  callback(error, version, id);
};

var get_message = function(req, res){
  prepare_get_message(req, function(error, version, id){
    if(error !== null){
      res.json(error);
    }else{
      mysql_helper.getMessage(id, function (error, results){
	if(error){
	  console.error(error);
	  res.json(formatError(500, error));
	}else{
	  res.json(formatResponse(version, 200, 'OK', results[0]||null));
	}
      });
    }
  });
};

var prepare_post_message = function(req, callback){
  // curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/api/v1.1/post_message -d '{"lat":12,"long":12,"text":"Hello World"}'
  var message = req.body;
  var version = req.params.version;

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
  callback(error, version, message);
};

var post_message = function(req, res){
  prepare_post_message(req, function(error, version, message){
    if(error !== null){
      res.json(error);
    }else{
      message.date = new Date().getTime();
      mysql_helper.postMessage(message, function (error, result){
	if(error){
	  console.error(error);
	  res.json(formatError(500, error));
	}else{
	  message['id'] = result.insertId;
	  res.json(formatResponse(version, 201, 'Created', message));
	}
      });
    }
  });
};

var handleError = function(rules){
  var result = null;

  _.every(rules, function(rule){
    if(!rule.rule){
      result = formatError(rule.code, rule.msg);
      return false;
    }
    return true;
  });
  return result;
};

var formatResponse = function(version, success_code, success_msg, data){
  return (version === 'v1') ? data : {'success': {'code': success_code, 'msg': success_msg}, 'data': data};
};

var formatError = function(error_code, error_msg){
  return {'error': {'code': error_code, 'msg': error_msg}};
};

exports.get_index = get_index;
exports.prepare_get_previews = prepare_get_previews;
exports.get_previews = get_previews;
exports.prepare_get_message = prepare_get_message;
exports.get_message = get_message;
exports.prepare_post_message = prepare_post_message;
exports.post_message = post_message;
exports.handleError = handleError;
exports.formatResponse = formatResponse;
exports.formatError = formatError;
