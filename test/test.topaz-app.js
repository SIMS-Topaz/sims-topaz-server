var should = require("should");
var topaz = require('../topaz-app.js');
var mysql_helper = require('../mysql-helper.js');
var conf = require('../conf.js');

mysql_helper.openConnection(conf.mysql);

//Convenience functions
var insert_dummy_message = function(message, callback){
  var query = 'INSERT INTO test_messages (`text`, `lat`, `long`, `date`, `user_id`)'
    + ' VALUES(:text, :lat, :long, :date, :user_id)';
  message.date = new Date().getTime();
  message.user_id = 99;
  mysql_helper.doQuery(query, message, function(error, results){
    if(error !== null){throw Error('Unable to create a dummy message'+error);};
    var inserted_message = message;
    inserted_message.id = results.insertId;
    callback(inserted_message);
  });
};

var insert_dummy_comment = function(params, callback){
  var query = 'INSERT INTO test_comments (`text`, `date`, `message_id`, `user_id`)'
    + ' VALUES (:text, :date, :message_id, :user_id)';
  params.date = new Date().getTime();
  mysql_helper.doQuery(query, params, function(error, results){
    if(error !== null){throw Error('Unable to create a dummy comment'+error);};
    var inserted_comment = params;
    inserted_comment.id = results.insertId;
    callback(inserted_comment);
  });
};

var insert_dummy_user = function(params, callback){
  var query = 'INSERT INTO test_users (`name`, `email`, `salt`, `password`)'
    + ' VALUES (:name, :email, :salt, :pass)';
  params.salt = 'b176e76607ef6286a8e54a7e2aa7ef39446efb55';
  mysql_helper.doQuery(query, params, function(error, results){
    if(error !== null){throw Error('Unable to create a dummy user'+error);};
    var inserted_user = params;
    inserted_user.id = results.insertId;
    callback(inserted_user);
  });
};

//Actual tests
describe('topaz-app.js', function(){
  after(function(done){
    mysql_helper.doQuery("DELETE FROM `test_messages`; DELETE FROM `test_users`;", {}, function(error, results){
      mysql_helper.closeConnection();
      done();
    });
  });

  describe('formatError()', function(){
    it('should return a formatted error object', function(done){
      var code = 500, msg = 'SERVER_ERR', details = 'A server error happened';
      var actual = topaz.formatError(500, msg, details);

      actual.should.eql({'error': {'code': code, 'msg': msg, 'details': details}});
      done();
    });
  });

  describe('formatResponse()', function(){
    it('should return a formatted response object', function(done){
      var data = [{'id': 1, 'value': 'Hello World'}, {'id': 2, 'value': '42'}];
      var actual = topaz.formatResponse('v1.1', 200, 'OK', data);

      actual.should.eql({'success': {'code': 200, 'msg': 'OK'}, 'data': data});
      done();
    });
  });

  describe('handleError()', function(){
    it('should return the first false assertion that it finds and null otherwise', function(done){
      
      var rule1 = {'rule': false, 'code': 123, 'msg': 'UKNOWN_ERR_1', 'details': "First rule went wrong"};
      var rule2 = {'rule': false, 'code': 456, 'msg': 'UKNOWN_ERR_2', 'details': "Second rule went wrong"};
      var rules = [rule1, rule2];

      var actual = topaz.formatError(rule1.code, rule1.msg, rule1.details);
      actual.should.eql(topaz.handleError(rules));

      rule1.rule = true;
      var actual = topaz.formatError(rule2.code, rule2.msg, rule2.details);
      actual.should.eql(topaz.handleError(rules));
      done();
    });
  });

  describe('prepare_get_previews()', function(){
    it('should return the correct parameters to get previews', function(done){
      var input = {'version': 'v1.1', 'lat1': 12, 'lat2': 34, 'long1': 56, 'long2': 78};
      var req = {'params': input};

      var actual = topaz.prepare_get_previews(req);
      input.error = null;
      actual.should.eql(input);

      var input = {'version': 'v1.1', 'lat1': 12, 'lat2': 34};
      var req = {'params': input};

      var actual = topaz.prepare_get_previews(req);
      actual.error.should.not.equal(null);
      actual.error.should.not.equal(undefined);
      actual.error.error.code.should.equal(400);
      actual.error.error.msg.should.equal('PARAM_ERR');
      done();
    });
  });

  describe('get_previews()', function(){
    var input = {'lat': 12, 'long': 34, 'text': 'Hello World'};
    it('should return a formatted list of previews', function(done){
      insert_dummy_message(input, function(message){
        var req = {'params': {'lat1': 11, 'lat2': 13, 'long1': 33, 'long2': 35}};
        var res = {'json': function(object){
          object.success.should.not.equal(undefined);
          object.data.should.includeEql(message);
          done();
        }};
        topaz.get_previews(req, res);
      });
    });
  });

  describe('prepare_get_message()', function(){
    var input = {'id': 98, 'version': 'v1.1'};
    var req = {'params': input};

    it('should return a formatted query to get a message', function(done){
      var actual = topaz.prepare_get_message(req);
      (actual.error === null).should.be.true;
      delete actual.error;
      actual.should.eql(input);
      done();
    });
  });

  describe('get_message()', function(){
    var input = {'lat': 98, 'long': 76, 'text': '99 Luftballons'};

    it('should return a message', function(done){
      insert_dummy_message(input, function(message){
        var req = {'params': {'version': 'v1.1', 'id': message.id}};
        var res = {
          json: function(actual){
            actual.should.eql(topaz.formatResponse('v1.1', 200, 'OK', message));
            done();
          }
        };
        topaz.get_message(req, res);
      });
    });
  });

  describe('prepare_post_message()', function(){
    it('should return a valid post_message query', function(done){
      var input = {'lat': 21, 'long': 43, 'text': 'I wear my sunglasses at night !'};
      var req = {'body': input, 'params': {'version': 'v1.1'}};
      var actual = topaz.prepare_post_message(req);

      (actual.error === null).should.be.true;
      actual.should.eql({'error': null, 'message': input, 'version': 'v1.1'});

      delete input.lat;
      actual = topaz.prepare_post_message(req);
      actual.error.should.not.eql(null);
      actual.error.error.code.should.eql(400);
      actual.error.error.msg.should.eql('PARAM_ERR');
      done();
    });
  });

  describe('post_message()', function(){
    it('should return a valid post_message response', function(done){
      var input = {'lat': 10, 'long': 29, 'text': 'No, I am your father !'};
      var req = {'body': input, 'session': {'user_id': 313}, 'params': {'version': 'v1.1'}};
      var res = {
        json: function(actual){
          actual.should.eql(topaz.formatResponse('v1.1', 201, 'Created', input));
          done();
        }
      };
      topaz.post_message(req, res);
    });
  });

  describe('prepare_get_comments()', function(){
    it('should return a valid prepared get_comments query', function(done){
      var input = {'message_id': 1234, 'version': 'v1.1'};
      var req = {'params': input};

      var actual = topaz.prepare_get_comments(req);
      input.error = null;
      actual.should.eql(input);
      done();
    });
  });

  describe('get_comments()', function(){
    it('should return a res with comments', function(done){
      var comment = {'text': 'I come to the valley of the rich', 'message_id': 199, 'user_id': 99};
      insert_dummy_comment(comment, function(inserted_comment){
      var req = {'params': {'message_id': comment.message_id}};
      var res = {
        json: function(actual){
          (actual.error === undefined).should.be.true;
          actual.data.should.includeEql(comment);
          done();
        }
      };
      topaz.get_comments(req, res);
      });
    });
  });

  describe('prepare_post_signup()', function(){
    it('should return a valid signup query', function(done){
      var name = 'mr_test', pass = 'yours_truly_2095', email = 'mr_test@mock.org';
      var req = {'body': {'user_name': name, 'user_password': pass, 'user_email': email}};

      var actual = topaz.prepare_post_signup(req);
      (actual.error === null).should.be.true;
      actual.user_name.should.equal(name);
      actual.user_password.should.equal(pass);
      actual.user_email.should.equal(email);
      done();
    });
  });

  describe('post_signup()', function(){
    it('should create a user', function(done){
      var name = 'oliver_queen';
      var input = {'user_name': name, 'user_password': 'felicity', 'user_email': 'oli.queen@staronline.com'};
      var req = {'body': input};
      var res = {
        json: function(actual){
          (actual.error === undefined).should.be.true;
          actual.success.code.should.equal(201);
          actual.data.user_name.should.equal(name);
          done();
        }
      };
      topaz.post_signup(req, res);
    });
  });
});
