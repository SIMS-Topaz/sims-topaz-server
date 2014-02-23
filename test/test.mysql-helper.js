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

//Actual tests
describe('mysql-helper.js', function(){
  describe('doQuery()', function(){
    it('should do a query', function(done){
      var query = 'SHOW STATUS';
      var params = {};
      mysql_helper.doQuery(query, params, function(error, results){
        (error === null).should.be.true;
        done();
      });
    });
  });

  describe('getPreviews()', function(){
    it('should return a list containing previews', function(done){
      var message = {'lat': 123, 'long': 456, 'text': '221B Baker Street'};
      insert_dummy_message(message, function(inserted_message){
        mysql_helper.getPreviews(122, 455, 124, 457, function(error, actual){
          (error === null).should.be.true;
          actual.length.should.be.above(0);
          actual.should.includeEql(inserted_message);
          done();
        });
      });
    });
  });

  describe('postMessage()', function(){
    it('should insert a message in the db and return an ack', function(done){
      var message = {'lat':48,'long':15,'text':'Flynn Lives !', 'user_id': 456};
      mysql_helper.postMessage(message, function(error, actual){
        (error === null).should.be.true;
        done();
      });
    });
  });

  describe('getMessage()', function(){
    it('should get a message from the database', function(done){
      var message = {'lat': 25, 'long': 26, 'text': 'Draco Dormiens Nunquam Titillandus'};
      insert_dummy_message(message, function(inserted_message){
        mysql_helper.getMessage(inserted_message.id, function(error, actual){
          (error === null).should.be.true;
          actual.should.eql(inserted_message);
          done();
        });
      });
    }); 
  });

  describe('postComment', function(){
    it('should insert a comment in the database', function(done){
      var comment = {'text': 'hello', 'message_id': 1, 'user_id': 2};
      mysql_helper.postComment(comment, function(error, actual){
        (error === null).should.be.true;
        actual.should.not.be.undefined;
        actual.insertId.should.be.above(0);
        done();
      });
    });
  });

  describe('getComments', function(){
    it('should get a list of comments', function(done){
      var message_id = 3;
      insert_dummy_comment({'user_id': 1, 'message_id': message_id, 'text': 'dummy comment'}, function(inserted_comment){
        mysql_helper.getComments(message_id, function(error, actual){
          (error === null).should.be.true;
          actual.should.includeEql(inserted_comment);
          done();
        });
      });
    });
  });
});
