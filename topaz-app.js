var crypto = require('crypto');
var path = require('path');

var _ = require ('underscore');

var mysql_helper = require('./mysql-helper.js');
var conf  = require('./conf.js');

var get_index = exports.get_index = function(req, res){
  res.send('Topaz Server Working!');
};

var prepare_get_previews = exports.prepare_get_previews = function(req){
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

var get_previews = exports.get_previews = function(req, res){
  if(!req.session.user_id){
    res.json(formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  }else{
    var prep = prepare_get_previews(req);
    if(prep.error !== null){
      res.json(prep.error);
    }else{
      mysql_helper.getPreviews(prep.lat1, prep.long1, prep.lat2, prep.long2, function (error, results) {
        if(error){
          res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
        }else{
          res.json(formatResponse(prep.version, 200, 'OK', results));
        }
      });
    }
  }
};

var prepare_get_message = exports.prepare_get_message = function(req){
  var id = req.params.id;
  var user_id = req.session.user_id;
  var with_comments = req.params.with_comments;

  var rules = [
    {
      rule: (id !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'id' parameter"
    },{
      rule: (with_comments === undefined || with_comments == 'MSG' || with_comments == 'WITH_COMMENTS'),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'with_comments' parameter"
    }];

  var error = handleError(rules);
  return {'error': error, 'version': req.params.version,
    'id': id, user_id: user_id, with_comments: with_comments};
};

var get_message = exports.get_message = function(req, res){
  if(!req.session.user_id){
    res.json(formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  }else{
    var prep = prepare_get_message(req);
    if(prep.error !== null){
      res.json(prep.error);
    }else{
      mysql_helper.getMessage(prep.id, prep.user_id, function (error, message){
        if(error){
          res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
        }else{
          if(prep.with_comments == 'WITH_COMMENTS'){
            mysql_helper.getComments(prep.id, function(err, comments){
              if(err){
                res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
              }else{
                message.comments = comments;
                res.json(formatResponse(prep.version, 200, 'OK', message));
              }
            });
          }else{
            res.json(formatResponse(prep.version, 200, 'OK', message));
          }
        }
      });
    }
  }
};

var prepare_post_message = exports.prepare_post_message = function(req){
  // curl -X POST -H "Content-Type:application/json" -H "Accept:application/json" http://localhost:8080/api/v1.1/post_message -d '{"lat":12,"long":12,"text":"Hello World"}'
  var version = req.params.version;
  var message;
  if(version === 'v1.3')
    message = JSON.parse(req.body.request);
  else
    message = req.body;
  message.user_id = req.session.user_id;
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

var post_message = exports.post_message = function(req, res){
  if(!req.session.user_id){
    res.json(formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  }else{
    var prep = prepare_post_message(req);
    if(prep.error !== null){
      res.json(prep.error);
    }else{
      if(req.files)
        prep.message['picture_url'] = 'img/'+path.basename(req.files.file.path);
      mysql_helper.postMessage(prep.message, function (error, result){
        if(error){
          res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
        }else{
          prep.message['id'] = result.insertId;
          prep.message['user_name'] = result.user_name;
          res.json(formatResponse(prep.version, 201, 'Created', prep.message));
        }
      });
    }
  }
};

var prepare_get_comments = exports.prepare_get_comments = function(req){
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

var get_comments = exports.get_comments = function(req, res){
  if(!req.session.user_id){
    res.json(formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  }else{
    var prep = prepare_get_comments(req);
    if(prep.error !== null){
      res.json(prep.error);
    }else{
      mysql_helper.getComments(prep.message_id, function(error, results){
        if(error){
          res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
        }else{
          res.json(formatResponse(prep.version, 200, 'OK', results));
        }
      });
    }
  }
};

var prepare_post_comment = prepare_post_comment = function(req){
  var comment = req.body;
  comment.user_id = req.session.user_id;
  comment.message_id = req.params.message_id;

  var rules = [
    {
      rule: (comment.message_id !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'message_id' parameter"
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

var post_comment = exports.post_comment = function(req, res){
  if(!req.session.user_id){
    res.json(formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  }else{
    var prep = prepare_post_comment(req);
 
    if(prep.error !== null) res.json(prep.error);
    else{
      mysql_helper.postComment(prep.comment, function(error, result){
        if(error){
          res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
        }else{
          prep.comment['id'] = result.insertId;
          res.json(formatResponse(prep.version, 201, 'Created', prep.comment));
        }
      });
    }
  }
};

var get_user_auth = exports.get_user_auth = function(req, res){
  if(req.session.user_id !== undefined){
    res.json({'success': {'code': 200, 'msg': 'OK'},
      'data': {'user_name': req.session.user_name, 'user_id': req.session.user_id}});
  }else{
    res.json({'error': {'code': 401, 'msg': 'NOT_AUTH_ERR', 'details': 'User not authenticated'}});
  }
};

var post_user_auth = exports.post_user_auth = function(req, res){
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

var prepare_post_like_status = exports.prepare_post_like_status = function(req){
  var likeStatus = req.body;
  likeStatus.message_id = likeStatus.id;
  delete likeStatus.id;
  likeStatus.user_id = req.session.user_id;
  
  var rules = [
    {
      rule: likeStatus.message_id !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'message_id' parameter"
    },{
      rule: likeStatus.likeStatus !== undefined,
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'likeStatus' parameter"
    },{
      rule: likeStatus.likeStatus == 'NONE' || likeStatus.likeStatus == 'LIKED' || likeStatus.likeStatus == 'DISLIKED',
      code: 400,
      msg: 'PARAM_ERR',
      details: "Invalid 'likeStatus' parameter"
    }
  ];
  var error = handleError(rules);
  return {error: error, version: req.params.version, likeStatus: likeStatus};
};

var post_like_status = exports.post_like_status = function(req, res){
  if(!req.session.user_id){
    res.json(formatError(401, 'NOT_AUTH_ERR', 'User not authenticated'));
  }else{
    var prep = prepare_post_like_status(req);
    if(prep.error !== null) res.json(prep.error);
    else{
      mysql_helper.postLikeStatus(prep.likeStatus, function(error, message){
        if(error){
          res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
        }else{
          res.json(formatResponse(prep.version, 201, 'Created', message));
        }
      });
    }
  }
};

var prepare_post_signup = exports.prepare_post_signup = function(req){
  var user_name = req.body.user_name;
  var user_password = req.body.user_password;
  var user_email = req.body.user_email;
  var version = req.body.version;
  var rules = [{
      rule: (user_name !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'user_name' parameter"
    },{
      rule: (user_name !== undefined && user_name.length >= 4),
      code: 400,
      msg: 'PARAM_ERR',
      details: "'user_name' parameter too short"
    },{
      rule: (user_password !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'user_password' parameter"
    },{
      rule: (user_password !== undefined && user_password.length >= 4),
      code: 400,
      msg: 'PARAM_ERR',
      details: "'user_password' parameter too short"
    },{
      rule: (user_email !== undefined),
      code: 400,
      msg: 'PARAM_ERR',
      details: "Missing 'user_email' parameter"
    }];

  var error = handleError(rules);
  return {'error': error, 'version': version, 'user_name': user_name, 'user_password': user_password, 'user_email': user_email};
};

var post_signup = exports.post_signup = function(req, res){
  var prep = prepare_post_signup(req);

  if(prep.error !== null){
    res.json(prep.error);
  }else{
    mysql_helper.postSignup(prep.user_name, prep.user_password, prep.user_email, function(error, result){
      if(error){
        res.json(formatError(500, 'SQL_ERR', 'Internal Server Error'));
      }else{
        if(result.insertId === -1){
          if(result.nb_email > 0){
            res.json(formatError(409, 'EMAIL_ERR', 'Email already in use'));
          }else{
            res.json(formatError(409, 'USERNAME_ERR', 'User name already in use'));
          }
        }else{
          req.session.user_name = prep.user_name;
          req.session.user_id = result.insertId;
          res.json(formatResponse(prep.version, 201, 'Created', {'user_id': result.insertId, 'user_name': prep.user_name}));
        }
      }
    });
  }
};

var handleError = exports.handleError = function(rules){
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

var formatResponse = exports.formatResponse = function(version, success_code, success_msg, data){
  return (version === 'v1') ? data : {'success': {'code': success_code, 'msg': success_msg}, 'data': data};
};

var formatError = exports.formatError = function(error_code, error_msg, error_details){
  return {'error': {'code': error_code, 'msg': error_msg, 'details': error_details}};
};
