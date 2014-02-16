var topaz = require('./topaz-app.js');

exports.test_formatError = function(test){
  var input = topaz.formatError(500, 'A server error happened');
  var output = {'error': {'code': 500, 'msg': 'A server error happened'}};
  test.deepEqual(input, output);
  test.done();
};

exports.test_formatResponse = function(test){
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
