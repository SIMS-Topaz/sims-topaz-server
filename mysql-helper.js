/***************************************************************************
mysql-helper:
communique avec la DB topaz
**************************************************************************/

var conf  = require('./conf.js');
var mysql = require('mysql');
var _     = require('underscore');
var client;

/*=========================== CONNECTION ===========================*/
var openConnection = function(){
	client = mysql.createConnection(conf.mysql);

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
var doQuery = function(query, callback){
  var _query = client.query(query, function(error, results){
    if(error){
      console.error('ERROR mysql-helper.doQuery' + error);
    }else if(_.isFunction(callback)){
      callback(results);
    }
    console.dir(results);
  });
  console.log('sql query:');
  console.log(_query.sql);
};

// asks previews of all messages around position [lat, long]
var getPreviews = function(lat, long, radius, callback){
  if(!lat || !long){
    return null;
  }
  else{
    var query = 'SELECT id, LEFT(text, ' + conf.PREVIEW_SIZE + ') AS `text`, lat, `long`, is_full, date '
      + ' FROM messages WHERE lat BETWEEN ' + (lat-radius) + ' AND ' + (lat+radius)
      + ' AND `long` BETWEEN ' + (long-radius) + ' AND ' + (long+radius);
    doQuery(query, callback);
  }
};

// asks message with id 'id'
var getMessage = function(id, callback){
  if(!id){
    return null;
  }
  else{
    var query = 'SELECT id, `text`, lat, `long`, date FROM messages WHERE id=' + id;
    doQuery(query, callback);
  }
};

// inserts new message in DB
var postMessage = function(message, callback){
  if(!_.isObject(message)){
    return null;
  }else{
    if(_.isString(message.text) && message.text != ''
    && _.isNumber(message.lat) && _.isNumber(message.long))
    {
      message.is_full = (message.text.length <= conf.PREVIEW_SIZE) ? 1 : 0;
      message.date = new Date();
      var query = 'INSERT INTO messages (`text`, lat, `long`, is_full) '
        + ' VALUES (' + message.text + ', ' + message.lat + ', '
        + message.long + ', ' + message.is_full + ')';
      doQuery(query, callback);
    }else{
      return null;
    }
  }
};

// removes a row
var removeData = function(table, id){
	client.query('DELETE FROM ' + table + ' WHERE id = ' + id, function(error){
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
exports.removeData       = removeData;
