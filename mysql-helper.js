/***************************************************************************
mysql-helper:
communique avec la DB topaz
**************************************************************************/

var conf  = require('./conf.js');
var mysql = require('mysql');
var _     = require('underscore');
var client;
var table = (process.env.ENV==='test')?'test_messages':'messages';
var comment_table = (process.env.NODE_ENV==='test')?'test_comments':'comments';

/*=========================== CONNECTION ===========================*/
var openConnection = function(){
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

var closeConnection = function(){
  client.end(function(error){
    if(error) console.error('ERROR mysql-helper.closeConnection: ' + error);
  });
};

var handleDisconnect = function(){
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
/*============================================================*/

/*=========================== DATA ===========================*/
// does request 'query' and call 'callback' with the query's result
var doQuery = function(query, params, callback){
  client.query(query, params, function(error, results){
    callback(error, results);
  });
};

// asks previews of all messages around position [lat, long]
var getPreviews = function(lat, long, lat2, long2, callback){
  var query = 'SELECT `id`, LEFT(`text`, :preview_size) AS `text`, `lat`, `long`, `date`'
    + ' FROM '+table+' WHERE `lat` BETWEEN :min_lat AND :max_lat'
    + ' AND `long` BETWEEN :min_long AND :max_long'
    + ' ORDER BY `id` DESC LIMIT 1000';
  var params = {};
  
  if(!long2){
    //getPreviews v1
    var radius = lat2;
    params = {
      preview_size : conf.PREVIEW_SIZE,
      min_lat      : lat-radius,
      max_lat      : lat+radius,
      min_long     : long-radius,
      max_long     : long+radius
    };
  }else{
    //getPreviews v1.1
    params = {
      preview_size : conf.PREVIEW_SIZE,
      min_lat      : lat,
      max_lat      : lat2,
      min_long     : long,
      max_long     : long2
    };
  }
  
  doQuery(query, params, callback);
};

// asks message with id 'id'
var getMessage = function(id, callback){
  var query = 'SELECT `id`, `text`, `lat`, `long`, `date`'
   + ' FROM '+table
   + ' WHERE `id`= :id';
  var params = {id: id};
  doQuery(query, params, function(error, results){
    callback(error, results[0]||null);
  });
};

// inserts new message in DB
var postMessage = function(message, callback){
  message.date = new Date().getTime();
  var query = 'INSERT INTO '+table+' (`text`, `lat`, `long`, `date`)'
    + ' VALUES (:text, :lat, :long, :date)';
  doQuery(query, message, callback);
};

// get comments related to 'message_id'
var getComments = function(message_id, callback){
  var query = 'SELECT `id`, `text`, `date`, `user_id`, `likes`, `dislikes`'
    + ' FROM  '+comment_table
    + ' WHERE `message_id` = :message_id';
  var params = {message_id: message_id};
  doQuery(query, params, function(error, results){
    callback(error, results);
  });
};

// inserts new comment
var postComment = function(comment, callback){
  comment.date = new Date().getTime();
  comment.user_id = 'Mr DEFAULT';
  var query = 'INSERT INTO ' + comment_table + ' (`text`, `date`, `message_id`, `user_id`)'
    + ' VALUES (:text, :date, :message_id, :user_id)';
  doQuery(query, comment, callback);
};

// removes a row
//TODO: upgrade it to be useful
var removeData = function(id){
  client.query('DELETE FROM '+table+' WHERE `id` = :id', {id: id}, function(error){
    if(error){
      console.error('ERROR mysql-helper.removeData:' + error);
    }
  });
};
/*===============================================================*/

/*=========================== EXPORTS ===========================*/
exports.doQuery          = doQuery;
exports.openConnection   = openConnection;
exports.closeConnection  = closeConnection;
exports.handleDisconnect = handleDisconnect;
exports.getPreviews      = getPreviews;
exports.getMessage       = getMessage;
exports.postMessage      = postMessage;
exports.getComments      = getComments;
exports.postComment      = postComment;
exports.removeData       = removeData;
