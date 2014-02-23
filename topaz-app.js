var mysql_helper = require('./mysql-helper.js');
var conf  = require('./conf.js');
var _ = require ('underscore');
var crypto = require('crypto');

var get_index = function(req, res){
  res.send('Topaz Server Working!');
};

var prepare_get_previews = function(req){
  var version = req.params.version;
  var lat1 = req.params.lat1;
  var lat2 = req.params.lat2;
  var long1 = req.params.long1;
  var long2 = req.params.long2;

  var rules = [
    {
      rule: lat1 !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'lat1' parameter"
    },{
      rule: !isNaN(parseFloat(lat1)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'lat1' parameter"
    },{
      rule: long1 !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'long1' parameter"
    },{
      rule: !isNaN(parseFloat(long1)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'long1' parameter"
    },{
      rule: lat2 !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'lat2' parameter"
    },{
      rule: !isNaN(parseFloat(lat2)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'lat2' parameter"
    },{
      rule: long2 !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'long2' parameter"
    },{
      rule: !isNaN(parseFloat(long2)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'long2' parameter"
    }
  ];
  
  var error = handleError(rules);
  lat1  = parseFloat(lat1);
  long1 = parseFloat(long1);
  lat2  = parseFloat(lat2);
  long2 = parseFloat(long2);

  return {'error': error, 'version': version, 'lat1': lat1, 'long1': long1, 'lat2': lat2, 'long2': long2};
};

var get_previews = function(req, res){
  var prep = prepare_get_previews(req);
  if(prep.error !== null){
    res.json(prep.error);
  }else{
    mysql_helper.getPreviews(prep.lat1, prep.long1, prep.lat2, prep.long2, function (error, results) {
      if(error){
        console.error(error);
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        res.json(formatResponse(prep.version, 200, 'OK', results));
      }
    });
  }
};

var prepare_get_message = function(req){
  var id = req.params.id;
  var version = req.params.version;

  var rules = [{
      rule: (id !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'id' parameter"
    }];

  var error = handleError(rules);
  return {'error': error, 'version': version, 'id': id};
};

var get_message = function(req, res){
  var prep = prepare_get_message(req);
  if(prep.error !== null){
    res.json(prep.error);
  }else{
    mysql_helper.getMessage(prep.id, function (error, result){
      if(error){
        console.error(error);
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        res.json(formatResponse(prep.version, 200, 'OK', result));
      }
    });
  }
};

var prepare_post_message = function(req){
  // curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/api/v1.1/post_message -d '{"lat":12,"long":12,"text":"Hello World"}'
  var message = req.body;
  var version = req.params.version;
  var rules = [
    {
      rule: message.lat !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'lat' parameter"
    },{
      rule: !isNaN(parseFloat(message.lat)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'lat' parameter"
    },{
      rule: message.long !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'long' parameter"
    },{
      rule: !isNaN(parseFloat(message.long)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'long' parameter"
    },{
      rule: message.text !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'text' parameter"
    }
  ];
  var error = handleError(rules);
  return {'error': error, 'version': version, 'message': message};
};

var post_message = function(req, res){
  var prep = prepare_post_message(req);
  var message = prep.message;
  message.user_id = req.session.user_id;
  if(prep.error !== null){
    res.json(prep.error);
  }else{
    mysql_helper.postMessage(message, function (error, result){
      if(error){
        console.error(error);
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        message['id'] = result.insertId;
        res.json(formatResponse(prep.version, 201, 'Created', message));
      }
    });
  }
};

var prepare_get_comments = function(req){
  var message_id = req.params.message_id;

  var rules = [{
    rule: (message_id !== undefined),
    code: 400,
    msg: 'PARAM_ERR',
    details: "Missing 'message_id' parameter"
  }];

  var error = handleError(rules);
  return {error: error, version: req.params.version, message_id: message_id};
};

var get_comments = function(req, res){
  var prep = prepare_get_comments(req);
  if(prep.error !== null){
    res.json(prep.error);
  }else{
    mysql_helper.getComments(prep.message_id, function(error, results){
      if(error){
        console.error(error);
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        res.json(formatResponse(prep.version, 200, 'OK', results));
      }
    });
  }
};

var prepare_post_comment = function(req){
  var comment = req.body;

  var rules = [
    {
      rule: (comment.message_id !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'message_id' parameter"
    },{
      rule: (_.isString(comment.user)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'user' parameter"
    },{
      rule: (_.isString(comment.text)),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'text' parameter"
    }
  ];
  var error = handleError(rules);
  return {error: error, version: req.params.version, comment: comment};
};

var post_comment = function(req, res){
  var prep = prepare_post_comment(req);
  
  if(prep.error !== null) res.json(prep.error);
  else{
    mysql_helper.postComment(prep.comment, function(error, result){
      if(error){
        console.error(error);
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        prep.comment['id'] = result.insertId;
        res.json(formatResponse(prep.version, 201, 'Created', prep.comment));
      }
    });
  }
};

var get_user_auth = function(req, res){
  if(req.session.user_name !== undefined && req.session.user_id !== undefined){
    res.json({'success': {'code': 200, 'msg': 'OK'},
      'data': {'user_name': req.session.user_name, 'user_id': req.session.user_id}});
  }else{
    res.json({'error': {'code': 401, 'msg': 'NOT_AUTH_ERR', 'details': 'User not authenticated'}});
  }
};

var post_user_auth = function(req, res){
  if(req.session.user_name !== undefined || req.session.user_id !== undefined){
    res.json({'error': {'code': 403, 'msg': 'ALRDY_AUTH_ERR', 'details': 'The user is already authenticated'}});
  }else{
    mysql_helper.getUser(req.body.user_name, function(error, result){
      if(error){
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        if(result === null){
          res.json({'error': {'code': 401, 'msg': 'USER_ERR', 'details': 'The user does not exist'}});
        }else{
          var shasum = crypto.createHash('sha1');
          shasum.update(result.salt+req.body.user_password);
          var hash = shasum.digest('hex');
          if(hash !== result.password){
            res.json({'error': {'code': 401, 'msg': 'PASS_ERR', 'details': 'The password does not match'}});
          }else{
            req.session.user_name = result.name;
            req.session.user_id = result.id;
            res.json({'success': {'code': 201, 'msg': 'OK'},
              'data': {'user_id': result.id, 'user_name': result.name}});
          }
        }
      }
    });
  }
};

var handleError = function(rules){
  var result = null;

  _.every(rules, function(rule){
    if(!rule.rule){
      result = formatError(rule.code, rule.msg, rule.details);
      return false;
    }
    return true;
  });
  return result;
};

var formatResponse = function(version, success_code, success_msg, data){
  return (version === 'v1') ? data : {'success': {'code': success_code, 'msg': success_msg}, 'data': data};
};

var formatError = function(error_code, error_msg, error_details){
  return {'error': {'code': error_code, 'msg': error_msg, 'details': error_details}};
};

exports.get_index = get_index;
exports.prepare_get_previews = prepare_get_previews;
exports.get_previews = get_previews;
exports.prepare_get_message = prepare_get_message;
exports.get_message = get_message;
exports.prepare_post_message = prepare_post_message;
exports.post_message = post_message;
exports.prepare_get_comments = prepare_get_comments;
exports.get_comments = get_comments;
exports.prepare_post_comment = prepare_post_comment;
exports.post_comment = post_comment;
exports.get_user_auth = get_user_auth;
exports.post_user_auth = post_user_auth;
exports.handleError = handleError;
exports.formatResponse = formatResponse;
exports.formatError = formatError;
