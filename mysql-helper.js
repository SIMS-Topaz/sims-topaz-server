var crypto = require('crypto');

var _     = require('underscore');
var mysql = require('mysql');
var async = require('async');

var conf  = require('./conf.js');

var client;
var comment_table  = 'comments';
var message_table  = 'messages';
var user_table     = 'users';
var vote_table     = 'votes';
var tag_table      = 'tags';
var tag_link_table = 'tag_links';

if(process.env.NODE_ENV==='test'){
  comment_table  = 'test_comments';
  message_table  = 'test_messages';
  user_table     = 'test_users';
  vote_table     = 'test_votes';
  tag_table      = 'test_tags';
  tag_link_table = 'test_tag_links';
}

var openConnection = exports.openConnection = function(){
  client = mysql.createConnection(conf.mysql);
  
  client.config.queryFormat = function (query, values){
    if(!values) return query;
    
    return query.replace(/\:(\w+)/g, function (txt, key){
      if(values.hasOwnProperty(key)){
        return this.escape(values[key]);
      }
      return txt;
    }.bind(this));
  };

  client.connect(function(error){
    if(error){
      console.error('ERROR while connecting to DB ' + conf.mysql.database);
      setTimeout(openConnection, 2000);
    }
  });

  client.on('error', function(error){
    if(error.code === 'PROTOCOL_CONNECTION_LOST') handleDisconnect();
    else console.error('ERROR: mysql-helper.openConnection: ' + error);
  });
};

var closeConnection = exports.closeConnection = function(){
  client.end(function(error){
    if(error) console.error('ERROR mysql-helper.closeConnection: ' + error);
  });
};

var handleDisconnect = exports.handleDisconnect = function(){
  // Recreate the connection, since the old one cannot be reused.
  client = mysql.createConnection(conf.mysql);

  /* The server is either down or restarting (takes a while sometimes).
     We introduce a delay before attempting to reconnect,
     to avoid a hot loop, and to allow our node script to
     process asynchronous requests in the meantime.
     If you're also serving http, display a 503 error.
  */
  client.connect(function(error){
    if(error){
      console.error('ERROR while connecting to DB: ' + error);
      setTimeout(handleDisconnect, 2000);
    }
  });

  client.on('error', function(error){
    /* Connection to the MySQL server is usually lost due to either server restart, or a
       connnection idle timeout (the wait_timeout server variable configures this)
    */
    if(error.code === 'PROTOCOL_CONNECTION_LOST'){
      handleDisconnect();
    }else{
      console.error('ERROR mysql-helper.handleDisconnect:' + error);
    }
  });
};

// does request 'query' and call 'callback' with the query's result
var doQuery = exports.doQuery = function(query, params, callback, print){
  var q = client.query(query, params, function(error, results){
    if(error) console.error(error);
    callback(error, results);
  });
  if(print) console.log(q.sql);
};

// asks previews of all messages around position [lat, long]
var getPreviews = exports.getPreviews = function(lat, long, lat2, long2, tag, callback){
  var sub_query_select_from = 'SELECT `messages`.`id`, LEFT(`text`, 50) AS `text`,'
    + ' `lat`, `long`, `date`, `user_id`, `name` AS `user_name`, `likes`, `dislikes`,'
    + ' `messages`.`picture_url` AS `picture_url`'
    + ' FROM '+message_table+' AS `messages`, '+user_table+' AS `users`';
  var sub_query_where = ' WHERE ';
  var sub_query_order = ' ORDER BY `messages`.`id` DESC LIMIT 1000';

  var query_select_from = 'SELECT `info`.*, group_concat(`tags`.`tag` SEPARATOR ";") AS `tag` FROM';
  var query_join = ' LEFT JOIN '+tag_link_table+' AS `links` ON `links`.`message_id` = `info`.`id`'
    + ' LEFT JOIN '+tag_table+' AS `tags` ON `tags`.`id` = `links`.`tag_id`';
  var query_group = ' GROUP BY `info`.`id`';

  if(tag){
    var tag_id = 'SELECT `_tags`.`id` FROM '+tag_table+' AS `_tags` WHERE `_tags`.`tag` = :tag';
    var tagged_messages = 'SELECT `tag_links`.`message_id`'
      + ' FROM '+tag_link_table+' AS `tag_links`'
      + ' WHERE `tag_links`.`tag_id` = ( '+tag_id+' )';
    sub_query_where += '`messages`.`id` IN ( '+tagged_messages+' ) AND ';
  }
  sub_query_where += '`lat` BETWEEN :min_lat AND :max_lat AND `long` BETWEEN :min_long AND :max_long'
    + ' AND `users`.`id` = `user_id`';

  var sub_query = sub_query_select_from
    + sub_query_where
    + sub_query_order;

  var query = query_select_from
    + ' ( '+sub_query+' ) AS info'
    + query_join
    + query_group;
    
  var params = {
    preview_size : conf.PREVIEW_SIZE,
    min_lat      : lat,
    max_lat      : lat2,
    min_long     : long,
    max_long     : long2,
    tag          : tag
  };

  doQuery(query, params, function(error, messages){
    if(error){
      callback(error, null);
    }else{
      _.each(messages, function(message){
        message.tags = (message.tag) ? message.tag.split(';') : [];
        delete message.tag;
      });
      callback(error, messages);
    }
  });
};

// asks message with id 'id'
var getMessage = exports.getMessage = function(id, user_id, callback){
  async.parallel({
    message:function(cb){
      var query = 'SELECT `messages`.`id`, `text`, `lat`, `long`, `date`, `user_id`, `name` AS `user_name`, '
        + '`likes`, `dislikes`, `messages`.`picture_url` AS `picture_url`'
        + ' FROM '+message_table+' AS `messages` LEFT JOIN '+user_table+' AS `users` ON `users`.`id`=`messages`.`user_id`'
        + ' WHERE `messages`.`id`= :id; ';
      query += 'SELECT `vote` AS `likeStatus` FROM ' + vote_table
        + ' WHERE `message_id` = :id AND `user_id` = :user_id';
      var params = {id: id, user_id: user_id};
      doQuery(query, params, function(error, results){
        cb(error, results);
      });
    },
    tags:function(cb){
      var query = 'SELECT `tag` FROM `tag_links` RIGHT JOIN `tags` ON `tags`.`id`=`tag_id` WHERE `message_id`=:message_id';
      doQuery(query, {'message_id': id}, function(err, results){
        cb(err, _.pluck(results, ['tag']));
      });
    }
  }, function(error, data){
    if(error){
      callback(error, null);
    }else{
      var results = _.flatten(data.message);
      if(results.length > 0){
        var final_result = _.extend(results[0], results[1]);
        final_result.likeStatus = final_result.likeStatus || 'NONE';
        final_result = (error===null) ? final_result || null : null;
        final_result.tags = data.tags;
        callback(null, final_result);
      }else{
        callback(null, null);
      }
    }
  });
};

var insertTagLink = exports.insertTagLink = function(tag_id, message_id, callback){
  var query = 'INSERT INTO '+tag_link_table+' (`tag_id`, `message_id`) VALUES (:tag_id, :message_id);';
  doQuery(query, {'tag_id': tag_id, 'message_id': message_id}, function(err, stats){
    callback(err, stats);
  });
};

// inserts new message in DB
var postMessage = exports.postMessage = function(message, callback){
  message.date = new Date().getTime();
  var query = 'INSERT INTO '+message_table+' (`text`, `lat`, `long`, `date`, `user_id`, `picture_url`)'
    + ' VALUES (:text, :lat, :long, :date, :user_id, :picture_url); ';
  doQuery(query, message, function(error, message_stats){
    if(error){
      callback(error, null);
    }else{
      async.eachSeries(message.tags, function(tag, cb){
        var query = 'SELECT `id` FROM '+tag_table+' WHERE `tag` = :tag';
        doQuery(query, {'tag': tag}, function(err, results){
          var result = results[0] || null;
          if(result){
            insertTagLink(result.id, message_stats.insertId, function (err, stats){
              cb(err);
            });
          }else{
            var query = 'INSERT INTO '+tag_table+' (`tag`) VALUES (:tag)';
            doQuery(query, {'tag': tag}, function(err, tag_stats){
              insertTagLink(tag_stats.insertId, message_stats.insertId, function (err, stats){
                cb(err);
              });
            });
          }
        });
      }, function(err){
        callback(err || null, message_stats);
      });
    }
  });
};

// get comments related to 'message_id'
var getComments = exports.getComments = function(message_id, callback){
  var query = 'SELECT `comments`.`id`, `text`, `date`, `user_id`, `message_id`, `name` AS `user_name`'
    + ' FROM '+comment_table+' AS `comments`, '+user_table+' AS `users`'
    + ' WHERE `message_id` = :message_id AND `users`.`id` = `user_id`';
  var params = {message_id: message_id};
  doQuery(query, params, callback);
};

var messageExists = exports.messageExists = function(message_id, callback)
{
  var query = 'SELECT id FROM '+message_table+' WHERE id= :message_id';
  var params = {message_id: message_id};
  doQuery(query, params, function(error, result){
    var res;
    if(error){
      res = false;
    }else{
      if(result[0]) res = (result[0].id) ? true : false;
      else res = false;
    }
    callback(error, res);
  });
};

// inserts new comment
var postComment = exports.postComment = function(comment, callback){
  messageExists(comment.message_id, function(error, exists){
    if(error){
      callback(error, null);
    }else if(!exists){
      callback('MSG_ERR', null);
    }else{
      comment.date = new Date().getTime();
      var query = 'INSERT INTO ' + comment_table + ' (`text`, `date`, `message_id`, `user_id`)'
        + ' VALUES (:text, :date, :message_id, :user_id)';
      doQuery(query, comment, callback);
    }
  });
};

var postLikeStatus = exports.postLikeStatus = function(likeStatus, callback){
  messageExists(likeStatus.message_id, function(error, exists){
    if(error){
      callback(error, null);
    }else if(!exists){
      callback(true, null);
    }else{
      doPostLikeStatus(likeStatus, callback);
    }
  });
};

/*
 * @param {object} likeStatus: {message_id, user_id, likeStatus}
 * @param {function} callback
 * @returns {object} {id, text, date, likes, dislikes, name}
 */
var doPostLikeStatus = exports.doPostLikeStatus = function(likeStatus, callback){
  var query_vote = 'SELECT `vote` FROM ' + vote_table
    + ' WHERE `message_id` = :message_id AND `user_id` = :user_id';
  var query_firstVote = function(vote){
    var query_update = 'UPDATE '+message_table+' SET `'+vote+'` = `'+vote+'` + 1 WHERE `id` = :message_id; ';
    var query_insert = 'INSERT INTO '+vote_table+' (`user_id`, `message_id`, `vote`)'
      + ' VALUES (:user_id, :message_id, :likeStatus); ';
    return query_update+query_insert;
  };
  var query_cancelVote = function(vote){
    var query_delete = 'DELETE FROM '+vote_table+' WHERE `message_id` = :message_id AND `user_id` = :user_id; ';
    var query_update = 'UPDATE '+message_table+' SET `'+vote+'` = `'+vote+'` - 1 WHERE `id` = :message_id; ';
    return query_delete+query_update;
  };
  var query_updateVote = function(previous_vote, current_vote){
    var query_update_vote = 'UPDATE '+vote_table+' SET `vote` = :likeStatus'
      + ' WHERE `message_id` = :message_id AND `user_id` = :user_id; ';
    var query_update_message = 'UPDATE '+message_table+' SET `'+current_vote+'` = `'+current_vote+'` + 1, `'
      + previous_vote+'` = `'+previous_vote+'` - 1 WHERE `id` = :message_id; ';
    return query_update_vote+query_update_message;
  };
  var last_query = 'SELECT `messages`.`id`, `text`, `date`, `likes`, `dislikes`, `name` AS `user_name`'
    + ' FROM '+message_table+' AS `messages`, '+user_table+' AS `users`'
    + ' WHERE `messages`.`id` = :message_id AND `users`.`id` = `user_id`; ';
  
  doQuery(query_vote, likeStatus, function(error_vote, result_vote){
    if(error_vote){
      callback(error_vote, null);
    }else{
      var previous_vote = (_.isArray(result_vote) && _.isObject(result_vote[0])) ? result_vote[0].vote : 'NONE';
      var current_vote  = likeStatus.likeStatus;
      var queries = '';
      
      if(previous_vote != current_vote){
        if(previous_vote == 'NONE'){
          var vote = (current_vote == 'DISLIKED') ? 'dislikes' : 'likes';
          queries += query_firstVote(vote);
        }else if(current_vote == 'NONE'){
          var vote = (previous_vote == 'DISLIKED') ? 'dislikes' : 'likes';
          queries += query_cancelVote(vote);
        }else{
          if(previous_vote == 'DISLIKED') queries += query_updateVote('dislikes', 'likes');
          else queries += query_updateVote('likes', 'dislikes');
        }
      }
      
      queries += last_query;
      doQuery(queries, likeStatus, function(error, results){
        if(error){
          callback(error, null);
        }else{
          var result = _.last(results);
          var final_result = (_.isArray(result)) ? result[0] : result;
          final_result.likeStatus = likeStatus.likeStatus;
          callback(error, final_result);
        }
      });
    }
  });
};

// removes a row
//TODO: upgrade it to be useful
var removeData = exports.removeData = function(id){
  client.query('DELETE FROM '+message_table+' WHERE `id` = :id', {id: id}, function(error){
    if(error){
      console.error('ERROR mysql-helper.removeData:' + error);
    }
  });
};

var getUser = exports.getUser = function(username, callback){
  var query = 'SELECT `id`, `name`, `salt`, `password` FROM `'+user_table+'` WHERE `name`=:username';
  var params = {'username': username};
  doQuery(query, params, function(error, results){
    callback(error, (error===null)?results[0]||null:null);
  });
};

var postSignup = exports.postSignup = function(user_name, user_password, user_email, callback){
  var exist_query = 'SELECT `nb_name`, `nb_email` FROM (SELECT COUNT(`id`) AS `nb_name` FROM '+user_table+' WHERE `name`=:name) a'
    + ' CROSS JOIN (SELECT COUNT(`id`) AS `nb_email` FROM users WHERE `email`=:email) b;';
  var exist_params = {'name': user_name, 'email': user_email};
  doQuery(exist_query, exist_params, function(error, results){
    if(error){
      callback(error, null);
    }else{
      if(results[0].nb_name > 0){
        callback(null, {'insertId': -1, 'nb_name': results[0].nb_name});
      }else if(results[0].nb_email > 0){
        callback(null, {'insertId': -1, 'nb_email': results[0].nb_email});
      }else{
        var salt = crypto.pseudoRandomBytes(256);
        var shasum = crypto.createHash('sha1').update(salt);
        var hsalt = shasum.digest('hex');
        var shasum = crypto.createHash('sha1').update(hsalt+user_password);
        var hpass = shasum.digest('hex');
        var params = {'name': user_name, 'pass': hpass, 'salt': hsalt, 'email': user_email};
        var query = 'INSERT INTO '+user_table+' (`name`, `email`, `salt`, `password`)'
          + ' VALUES (:name, :email, :salt, :pass)';
        doQuery(query, params, callback);
      }
    }
  });
};

var getUserInfo = exports.getUserInfo = function(user_id, callback){
  var query_user = 'SELECT `id` AS `user_id`, `name` AS `user_name`, `email` AS `user_email`,'
    + ' `picture_url` AS `user_picture`, `status` AS `user_status`'
    + ' FROM '+user_table
    + ' WHERE id=:user_id; ';
  var query_messages = 'SELECT `id`, `text`, `lat`, `long`, `date`, `likes`, `dislikes`, `picture_url`'
    + ' FROM '+message_table
    + ' WHERE `user_id`= :user_id'
    + ' ORDER BY `id` DESC LIMIT 10';
  var params = {user_id: user_id};
  doQuery(query_user+query_messages, params, function(error, results){
    if(error){
      callback(error, null);
    }else{
      var user_info = (results[0]) ? results[0] : {};
      if(_.isArray(user_info)) user_info = user_info[0];
      if(!_.isEmpty(user_info)){
        user_info.user_messages = (results[1]) ? results[1] : [];
        _.each(user_info.user_messages, function(user_message){
          user_message.user_name = user_info.user_name;
        });
      }
      callback(error, user_info);
    }
  });
};

var postUserInfo = exports.postUserInfo = function(new_user, callback){
  var query_get_user = 'SELECT `password` AS `user_password`, `salt`, `email` AS `user_email`,'
    + ' `picture_url` AS `usesr_picture`, `status` AS `user_status`, `name` AS `user_name`'
    + ' FROM '+user_table
    + ' WHERE `id`=:user_id';
  var params_update = {};

  doQuery(query_get_user, new_user, function(error_get, old_user){
    if(error_get){
      callback(error_get, null);
    }else{
      old_user = old_user[0];
      if(new_user.user_password){
        var old_shasum = crypto.createHash('sha1');
        old_shasum.update(old_user.salt+new_user.user_old_password);
        var old_hash = old_shasum.digest('hex');
        
        if(old_hash !== old_user.user_password){
          callback('PASS_ERR', null);
        }else{
          var salt = crypto.pseudoRandomBytes(256);
          var shasum = crypto.createHash('sha1').update(salt);
          var hsalt = shasum.digest('hex');
          var shasum = crypto.createHash('sha1').update(hsalt+new_user.user_password);
          var hpass = shasum.digest('hex');
          delete new_user.user_password;
          params_update.password = hpass;
          params_update.salt = hsalt;
        }
      }
      if(new_user.user_status != old_user.user_status){
        params_update.status = new_user.user_status;
      }
      if(new_user.user_picture != old_user.user_picture){
        params_update.picture_url = new_user.user_picture;
      }
      
      var diff_name  = (new_user.user_name  != old_user.user_name);
      var diff_email = (new_user.user_email != old_user.user_email);
      
      if(diff_name || diff_email){
        var exist_query = 'SELECT `nb_name`, `nb_email` FROM (SELECT COUNT(`id`) AS `nb_name`'
          + ' FROM '+user_table+' WHERE `name`=:name) a'
          + ' CROSS JOIN (SELECT COUNT(`id`) AS `nb_email` FROM '+user_table+' WHERE `email`=:email) b;';
        var exist_params = {'name': new_user.user_name, 'email': new_user.user_email};
        
        doQuery(exist_query, exist_params, function(error_exist, result_exist){
          if(error_exist){
            callback(error_exist, null);
          }else{
            if(diff_name){
              if(result_exist[0].nb_name > 0){
                return callback('USERNAME_ERR', null);
              }else{
                params_update.name = new_user.user_name;
              }
            }  
            if(diff_email){
              if(result_exist[0].nb_email > 0){
                return callback('EMAIL_ERR', null);
              }else{
                params_update.email = new_user.user_email;
              }
            }
            completePostUserInfo(params_update, new_user);   
          }
        });
      }else{
        completePostUserInfo(params_update, new_user);   
      }
    }
  });

  var completePostUserInfo = function(params_update, new_user){
    var query_update = 'UPDATE '+user_table+' SET ';
    _.each(params_update, function(value, key){
      query_update += '`'+key+'`=:'+key+', ';
    });
    params_update.user_id = new_user.user_id;
    query_update = query_update.substring(0, query_update.length-2);
    query_update += ' WHERE `id`=:user_id';

    doQuery(query_update, params_update, function(error){
      callback(error, new_user);
    });
  };
};
