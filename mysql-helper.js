/***************************************************************************
mysql-helper:
communique avec la DB topaz
**************************************************************************/

var crypto = require('crypto');
var conf  = require('./conf.js');
var mysql = require('mysql');
var _     = require('underscore');
var client;
var comment_table = (process.env.NODE_ENV==='test')?'test_comments':'comments';
var message_table = (process.env.NODE_ENV==='test')?'test_messages':'messages';
var user_table = (process.env.NODE_ENV==='test')?'test_users':'users';
var vote_table = (process.env.NODE_ENV==='test')?'test_votes':'votes';

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
var doQuery = exports.doQuery = function(query, params, callback){
  client.query(query, params, function(error, results){
    if(error) console.error(error);
    callback(error, results);
  });
};

// asks previews of all messages around position [lat, long]
var getPreviews = exports.getPreviews = function(lat, long, lat2, long2, callback){
  var query = 'SELECT `messages`.`id`, LEFT(`text`, :preview_size) AS `text`,'
    + ' `lat`, `long`, `date`, `user_id`, `name` AS `user_name`, `likes`, `dislikes`'
    + ' FROM '+message_table+' AS `messages`, '+user_table+' AS `users`'
    + ' WHERE `lat` BETWEEN :min_lat AND :max_lat AND `long` BETWEEN :min_long AND :max_long'
    + ' AND `users`.`id` = `user_id`'
    + ' ORDER BY `messages`.`id` DESC LIMIT 1000';
  var params = {
    preview_size : conf.PREVIEW_SIZE,
    min_lat      : lat,
    max_lat      : lat2,
    min_long     : long,
    max_long     : long2
  };
  
  doQuery(query, params, callback);
};

// asks message with id 'id'
var getMessage = exports.getMessage = function(id, user_id, callback){
  var query = 'SELECT `messages`.`id`, `text`, `lat`, `long`, `date`, `user_id`, `name` AS `user_name`, '
    + '`likes`, `dislikes`'
    + ' FROM '+message_table+' AS `messages` LEFT JOIN '+user_table+' AS `users` ON `users`.`id`=`messages`.`user_id`'
    + ' WHERE `messages`.`id`= :id; ';
  query += 'SELECT `vote` AS `likeStatus` FROM ' + vote_table
    + ' WHERE `message_id` = :id AND `user_id` = :user_id';
  var params = {id: id, user_id: user_id};
  doQuery(query, params, function(error, results){
    if(error){
      callback(error, null);
    }else{
      results = _.flatten(results);
      var final_result = _.extend(results[0], results[1]);
      final_result.likeStatus = final_result.likeStatus || 'NONE';
      final_result = (error===null) ? final_result || null : null;
      callback(error, final_result);
    }
  });
};

// inserts new message in DB
var postMessage = exports.postMessage = function(message, callback){
  message.date = new Date().getTime();
  var query = 'INSERT INTO '+message_table+' (`text`, `lat`, `long`, `date`, `user_id`, `picture_url`)'
    + ' VALUES (:text, :lat, :long, :date, :user_id, :picture_url); ';
  query += 'SELECT `name` AS `user_name` FROM '+user_table+' WHERE `id` = :user_id; ';
  doQuery(query, message, function(error, results){
    if(error){
      callback(error, null);
    }else{
      results = _.flatten(results);
      callback(error, _.extend(results[0], results[1]));
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

// inserts new comment
var postComment = exports.postComment = function(comment, callback){
  comment.date = new Date().getTime();
  var query = 'INSERT INTO ' + comment_table + ' (`text`, `date`, `message_id`, `user_id`)'
    + ' VALUES (:text, :date, :message_id, :user_id)';
  doQuery(query, comment, callback);
};

/*
 * @param {object} likeStatus: {message_id, user_id, likeStatus}
 * @param {function} callback
 * @returns {object} {id, text, date, likes, dislikes, name}
 */
var postLikeStatus = exports.postLikeStatus = function(likeStatus, callback){
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
        //console.dir(params);
        var query = 'INSERT INTO '+user_table+' (`name`, `email`, `salt`, `password`)'
          + ' VALUES (:name, :email, :salt, :pass)';
        doQuery(query, params, callback);
      }
    }
  });
};
