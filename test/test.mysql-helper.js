var crypto = require('crypto');

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
  message.user_id = message.user_id || 99;
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
describe('mysql-helper.js', function(){
  before(function(ready){
    var delete_all = 'DELETE FROM `test_messages`; DELETE FROM `test_users`; '
      + 'DELETE FROM `test_comments`; DELETE FROM `test_votes`;';
    mysql_helper.doQuery(delete_all, {}, function(error, results){
      ready();
    });
  });
  
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
    var inserted_user;
    var inserted_message;
    before(function(done){
      var user = {name: 'Someone', email: 'someone@someone.fr', pass: 'pass'};
      insert_dummy_user(user, function(new_user){
        inserted_user = new_user;
        var message = {'lat': 123, 'long': 456, 'text': '221B Baker Street', user_id: new_user.id};
        insert_dummy_message(message, function(new_message){
          inserted_message = new_message;
          inserted_message.likes = 0;
          inserted_message.dislikes = 0;
          inserted_message.user_name = user.name;
          done();
        });
      });
    });
    it('should return a list containing previews', function(done){
      mysql_helper.getPreviews(122, 455, 124, 457, function(error, actual){
        (error === null).should.be.true;
        actual.length.should.be.above(0);
        actual.should.includeEql(inserted_message);
        done();
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
      var user = {name: 'TestUser', email:'test@test.test', pass: 'test'};
      insert_dummy_user(user, function(inserted_user){
        var message = {'lat': 25, 'long': 26, 'text': 'Draco Dormiens Nunquam Titillandus',
          user_id: inserted_user.id, user_name: user.name, likes: 0, dislikes: 0, likeStatus: 'NONE'};
        insert_dummy_message(message, function(inserted_message){
          mysql_helper.getMessage(inserted_message.id, inserted_user.id, function(error, actual){
            (error === null).should.be.true;
            actual.should.eql(inserted_message);
            done();
          });
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
    var inserted_comment;
    var message_id = 3;
    before(function(ready){
      var user = {name: 'Azerty', email:'test@test.test', pass: 'test'};
      insert_dummy_user(user, function(new_user){
        var comment = {user_id: new_user.id, message_id: message_id, text: 'dummy comment'};
        insert_dummy_comment(comment, function(new_comment){
          inserted_comment = new_comment;
          inserted_comment.user_name = user.name;
          ready();
        });
      });
    });
    it('should get a list of comments', function(done){    
      mysql_helper.getComments(message_id, function(error, actual){
        (error === null).should.be.true;
        actual.should.includeEql(inserted_comment);
        done();
      });
    });
  });

  describe('postSignup', function(){
    it('should insert a new user in the database', function(done){
      var name = 'sarah_lance', pass = 'tommy', email = 'sarah.lance@staronline.com';
      var user = {'name': name, 'password': pass, 'email': email};
      mysql_helper.postSignup(name, pass, email, function(error, result){
        (error === null).should.be.true;
        mysql_helper.doQuery('SELECT * FROM `test_users` WHERE id=:id', {'id': result.insertId}, function(error, actual){
          actual.length.should.be.above(0);
          actual = actual[0];
          user.id = result.insertId;
          var shasum = crypto.createHash('sha1').update(actual.salt+pass);
          var hpass = shasum.digest('hex');
          user.password = hpass;
          user.salt = actual.salt;
          actual.should.eql(user);
          done();
        });
      });
    });
  });

  describe('postLikeStatus', function(){
    describe('NoneToLiked', function(){
      var obj = {};
      before(function(ready){
        insert_dummy_user({name: 'Bob', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
          obj.user_id = user.id;
          insert_dummy_message({text: 'test_postLikeStatus_noneToLiked', lat: 101, long:202, user_id: user.id}, function(message){
            obj.message_id = message.id;
            ready();
          });
        });
      });
      it('should like a message for the first time', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'LIKED'};
        mysql_helper.postLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bob', text: 'test_postLikeStatus_noneToLiked', likes: 1, dislikes: 0};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
    
    describe('NoneToDisliked', function(){
      var obj = {};
      before(function(ready){
        insert_dummy_user({name: 'Bab', email: 'bab@email.fr', pass:'a', salt:'a'}, function(user){
          obj.user_id = user.id;
          insert_dummy_message({text: 'test_postLikeStatus_noneToDisliked', lat: 101, long:202, user_id: user.id}, function(message){
            obj.message_id = message.id;
            ready();
          });
        });
      });
      it('should dislike a message for the first time', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'DISLIKED'};
        mysql_helper.postLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bab', text: 'test_postLikeStatus_noneToDisliked', likes: 0, dislikes: 1};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
    
    describe('LikedToDisliked', function(){
      var obj = {};
      before(function(ready){
        insert_dummy_user({name: 'Bub', email: 'bub@email.fr', pass:'a', salt:'a'}, function(user){
          obj.user_id = user.id;
          insert_dummy_message({text: 'test_postLikeStatus_likedToDisliked', lat: 101, long:202, user_id: user.id}, function(message){
            obj.message_id = message.id;
            var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'LIKED'};
            mysql_helper.postLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should dislike a message after having liked it', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'DISLIKED'};
        mysql_helper.postLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bub', text: 'test_postLikeStatus_likedToDisliked', likes: 0, dislikes: 1};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
    
    describe('LikedToNone', function(){
      var obj = {};
      before(function(ready){
        insert_dummy_user({name: 'Bib', email: 'bib@email.fr', pass:'a', salt:'a'}, function(user){
          obj.user_id = user.id;
          insert_dummy_message({text: 'test_postLikeStatus_likedToNone', lat: 101, long:202, user_id: user.id}, function(message){
            obj.message_id = message.id;
            var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'LIKED'};
            mysql_helper.postLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should revert a LIKED vote', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'NONE'};
        mysql_helper.postLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bib', text: 'test_postLikeStatus_likedToNone', likes: 0, dislikes: 0};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
    
    describe('DislikedToLiked', function(){
      var obj = {};
      before(function(ready){
        insert_dummy_user({name: 'Beb', email: 'beb@email.fr', pass:'a', salt:'a'}, function(user){
          obj.user_id = user.id;
          insert_dummy_message({text: 'test_postLikeStatus_dislikedToLiked', lat: 101, long:202, user_id: user.id}, function(message){
            obj.message_id = message.id;
            var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'DISLIKED'};
            mysql_helper.postLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should like a message after having disliked it', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'LIKED'};
        mysql_helper.postLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Beb', text: 'test_postLikeStatus_dislikedToLiked', likes: 1, dislikes: 0};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
    
    describe('DislikedToNone', function(){
      var obj = {};
      before(function(ready){
        insert_dummy_user({name: 'Byb', email: 'byb@email.fr', pass:'a', salt:'a'}, function(user){
          obj.user_id = user.id;
          insert_dummy_message({text: 'test_postLikeStatus_dislikedToNone', lat: 101, long:202, user_id: user.id}, function(message){
            obj.message_id = message.id;
            var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'DISLIKED'};
            mysql_helper.postLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should revert a DISLIKED vote', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'NONE'};
        mysql_helper.postLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Byb', text: 'test_postLikeStatus_dislikedToNone', likes: 0, dislikes: 0};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
  });

});
