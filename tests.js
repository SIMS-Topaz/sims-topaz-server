var topaz = require('./topaz-app.js');
var mysql_helper = require('./mysql-helper.js');
var _ = require('underscore');

exports.test_formatError = function(test){
  test.expect(1);
  var input = topaz.formatError(500, 'A server error happened');
  var output = {'error': {'code': 500, 'msg': 'A server error happened'}};
  test.deepEqual(input, output);
  test.done();
};

exports.test_formatResponse = function(test){
  test.expect(2);
  var data = [{'id': 1, 'value': 'Hello World'}, {'id': 2, 'value': '42'}];
  var input_v1 = topaz.formatResponse('v1', 200, 'OK', data);
  var output_v1 = data;
  var input = topaz.formatResponse('v1.1', 200, 'OK', data);
  var output = {'success': {'code': 200, 'msg': 'OK'}, 'data': data};

  test.deepEqual(input_v1, output_v1);
  test.deepEqual(input, output);
  test.done();
};

exports.test_handleError = function(test){
  test.expect(3);
  var rules = function (first, second){
    return [{'rule': first, 'code': 123, 'msg': "First rule went wrong"},
      {'rule': second, 'code': 456, 'msg': "Second rule went wrong"}];
  };
  test.deepEqual(topaz.handleError(rules(false)), {'error': {'code': 123, 'msg': 'First rule went wrong'}});
  test.deepEqual(topaz.handleError(rules(true, false)), {'error': {'code': 456, 'msg': 'Second rule went wrong'}});
  test.deepEqual(topaz.handleError(rules(false, false)), {'error': {'code': 123, 'msg': 'First rule went wrong'}});
  test.done();
};

exports.test_prepare_get_previews = function(test){
  test.expect(12);
  var input = {'params': {'version': 'v1.1', 'lat1': 25, 'long1': 50, 'lat2': 75, 'long2': 100}};

  topaz.prepare_get_previews(input, function(error, version, lat1, long1, lat2, long2){
    test.equal(arguments.length, 6);
    test.deepEqual([error, version, lat1, long1, lat2, long2], [null, 'v1.1', 25, 50, 75, 100]);
  });

  input = {'params': {'version': 'v1.1', 'lat1': 25, 'long1': 50}};

  topaz.prepare_get_previews(input, function(error, version, lat1, long1, lat2, long2){
    test.equal(arguments.length, 6);
    test.notEqual(error, null);
    test.equal(error.error.code, 400);
  });

  var input_v1 = {'params': {'version': 'v1', 'lat1': 15, 'long1': 30, 'lat2': 45, 'long2': 60}};

  topaz.prepare_get_previews(input_v1, function(error, version, lat1, long1, lat2, long2){
    test.equal(arguments.length, 6);
    test.deepEqual([error, version, lat1, long1, lat2, long2], [null, 'v1', 15, 30, 50, null]);
  });

  input_v1 = {'params': {'version': 'v1', 'lat1': 15, 'long1': 30}};

  topaz.prepare_get_previews(input_v1, function(error, version, lat1, long1, lat2, long2){
    test.equal(arguments.length, 6);
    test.deepEqual([error, version, lat1, long1, lat2, long2], [null, 'v1', 15, 30, 50, null]);
  });

  input_v1 = {'params': {'version': 'v1', 'lat1': 15}};

  topaz.prepare_get_previews(input_v1, function(error, version, lat1, long1, lat2, long2){
    test.equal(arguments.length, 6);
    test.notEqual(error, null);
    test.equal(error.error.code, 400);
  });

  test.done();
};

exports.test_prepare_get_message = function(test){
  test.expect(7);
  var input = {'params': {'version': 'v1.1', 'id': 1234}};

  topaz.prepare_get_message(input, function(error, version, id){
    test.equal(arguments.length, 3);
    test.deepEqual([error, version, id], [null, 'v1.1', 1234]);
  });

  input = {'params': {'version': 'v1.1'}};

  topaz.prepare_get_message(input, function(error, version, id){
    test.equal(arguments.length, 3);
    test.notEqual(error, null);
    test.equal(error.error.code, 400);
  });

  var input_v1 = {'params': {'version': 'v1', 'id': 5678}};

  topaz.prepare_get_message(input_v1, function(error, version, id){
    test.equal(arguments.length, 3);
    test.deepEqual([error, version, id], [null, 'v1', 5678]);
  });

  test.done();
};

exports.test_prepare_post_message = function(test){
  test.expect(4);
  var input = {
    'params': {'version': 'v1.1'},
    'body': {'lat': 10, 'long': 20, 'text': 'Hello World'}
  };
  topaz.prepare_post_message(input, function(error, version, message){
    test.equal(arguments.length, 3);
    test.equal(error, null);
    test.equal(version, 'v1.1');
    test.deepEqual(message, {'lat': 10, 'long': 20, 'text': 'Hello World'});
    test.done();
  });
};

var insert_dummy = function(callback){
  var query = 'INSERT INTO test_messages (`text`, `lat`, `long`, `date`) VALUES (:text, :lat, :long, :date)';
  var params = {'lat': 404,'long': 313,'text': 'Hello World', 'date': new Date().getTime()};
  mysql_helper.doQuery(query, params, function(error, results){
    callback(results.insertId);
  });
};

var delete_dummies = function(callback){
  var query = 'DELETE FROM test_messages';
  mysql_helper.doQuery(query, {}, function(error, results){
    callback();
  });
};

exports.test_mysql_helper = {
  setUp: function(callback){
    mysql_helper.openConnection();
    callback();
  },
  tearDown: function(callback){
    delete_dummies(function(){
      mysql_helper.closeConnection();
      callback();
    });
  },

  _test_environment: function(test){
    test.expect(4);
    test.equal(process.env.ENV, 'test');
    var query = 'SHOW TABLES FROM topaz';
    var params = {};
    mysql_helper.doQuery(query, params, function(error, results){
      test.equal(error, null);
      results = _.map(results, function(table){return table.Tables_in_topaz});
      test.notEqual(_.indexOf(results, 'messages'), -1);
      test.notEqual(_.indexOf(results, 'test_messages'), -1);
      test.done();
    });
  },

  test_doQuery: function(test){
    test.expect(1);
    var query = 'SHOW STATUS';
    var params = {};
    mysql_helper.doQuery(query, params, function(error, results){
      test.equal(error, null);
      test.done();
    });
  },

  test_getPreviews: {
    setUp: function(callback){
      insert_dummy(function(){callback();});
    },
    tearDown: function(callback){
      callback();
    },
    test: function(test){
      test.expect(3);
      mysql_helper.getPreviews(403, 312, 405, 314, function(error, results){
	test.equal(error, null);
	test.notEqual(results.length, 0);
	var any_value = _.any(results, function(result){
	  return result.text === 'Hello World' && result.lat === 404 && result.long === 313;
	});
	test.equal(any_value, true);
	test.done();
      });
    }
  },

  test_postMessage: {
    test: function(test){
      test.expect(4);
      var message = {'lat':48,'long':15,'text':'Flynn Lives !'};
      mysql_helper.postMessage(message, function(error, results){
	test.equal(error, null);
	test.notStrictEqual(results, undefined);
	test.strictEqual(results[0], undefined);
	test.ok(results.insertId);
	test.done();
      });
    }
  },

  test_getMessage: {
    setUp: function(callback){
      var self = this;
      insert_dummy(function(id){
	self.id = id;
	callback();
      });
    },
    test: function(test){
      test.expect(4);
      test.notEqual(this.id, undefined);
      var self = this;
      mysql_helper.getMessage(this.id, function(error, result){
	test.equal(error, null);
	test.strictEqual(result[0], undefined);
	delete result.date;
	test.deepEqual(result, {'id': self.id, 'lat':404, 'long':313, 'text': 'Hello World'});
	test.done();
      });
    }
  }
};
