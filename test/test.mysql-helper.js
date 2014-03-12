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
    describe('standard use', function(){
      var inserted_user;
      var inserted_message;
      before(function(done){
        var user = {name: 'Someone', email: 'someone@someone.fr', pass: 'pass'};
        insert_dummy_user(user, function(new_user){
          inserted_user = new_user;
          var message = {'lat': 123, 'long': 456, 'text': '221B Baker Street', 'user_id': new_user.id, 'picture_url': null};
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
        mysql_helper.getPreviews(122, 455, 124, 457, null, function(error, actual){
          inserted_message.tags = [];
          (error === null).should.be.true;
          actual.length.should.be.above(0);
          actual.should.includeEql(inserted_message);
          done();
        });
      });
    });
    describe('by tag research', function(){
      var inserted_user;
      var inserted_message;
      before(function(done){
        var user = {name: 'SomeoneElse', email: 'someone@someone.fr', pass: 'pass'};
        insert_dummy_user(user, function(new_user){
          inserted_user = new_user;
          var message = {'lat': 123, 'long': 456, 'text': '221B Baker Street', 'user_id': new_user.id, 'picture_url': null};
          insert_dummy_message(message, function(new_message){
            inserted_message = new_message;
            inserted_message.likes = 0;
            inserted_message.dislikes = 0;
            inserted_message.user_name = user.name;
            var query = 'INSERT INTO test_tags (`tag`) VALUES (:tag)';
            mysql_helper.doQuery(query, {'tag': '#by_tag_previews'}, function(err, tag_stats){
              mysql_helper.insertTagLink(tag_stats.insertId, new_message.id, function(error, result){
                done();
              });
            });
          });
        });
      });
      it('should return a list containing previews filtered by tag', function(done){
        mysql_helper.getPreviews(122, 455, 124, 457, '#by_tag_previews', function(error, actual){
          inserted_message.tags = ['#by_tag_previews'];
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
      var message = {'lat':48,'long':15,'text':'Flynn Lives !', 'user_id': 456, 'picture_url': null, 'tags': []};
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
          'user_id': inserted_user.id, 'user_name': user.name, 'picture_url': null, 'tags': []};
        insert_dummy_message(message, function(inserted_message){
          inserted_message.dislikes = 0;
          inserted_message.likes = 0;
          inserted_message.likeStatus = 'NONE';
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
    describe('Comment on a non existing message', function(){
      it('should return an error', function(done){
        var comment = {'text': 'hello', 'message_id': -1, 'user_id': 2};
        mysql_helper.postComment(comment, function(error, actual){
          (error !== null).should.be.true;
          (actual === null).should.be.true;
          done();
        });
      });
    });
    
    describe('Comment on an existing message', function(){
      var message_id;
      before(function(ready){
        insert_dummy_message({text: 'test post comment on not existing message', lat: 101, long:202, user_id: 1}, function(message){
          message_id = message.id;
          ready();
        });
      });
      it('should insert a comment in the database', function(done){
        var comment = {'text': 'hello all', 'message_id': message_id, 'user_id': 2};
        mysql_helper.postComment(comment, function(error, actual){
          (error === null).should.be.true;
          actual.should.not.be.undefined;
          actual.insertId.should.be.above(0);
          done();
        });
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
          user.picture_url = null;
          user.status = null;
          actual.should.eql(user);
          done();
        });
      });
    });
  });

  describe('doPostLikeStatus', function(){
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
        mysql_helper.doPostLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bob', text: 'test_postLikeStatus_noneToLiked', likes: 1, dislikes: 0, likeStatus: 'LIKED'};
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
        mysql_helper.doPostLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bab', text: 'test_postLikeStatus_noneToDisliked', likes: 0, dislikes: 1, likeStatus: 'DISLIKED'};
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
            mysql_helper.doPostLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should dislike a message after having liked it', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'DISLIKED'};
        mysql_helper.doPostLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bub', text: 'test_postLikeStatus_likedToDisliked', likes: 0, dislikes: 1, likeStatus: 'DISLIKED'};
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
            mysql_helper.doPostLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should revert a LIKED vote', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'NONE'};
        mysql_helper.doPostLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Bib', text: 'test_postLikeStatus_likedToNone', likes: 0, dislikes: 0, likeStatus: 'NONE'};
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
            mysql_helper.doPostLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should like a message after having disliked it', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'LIKED'};
        mysql_helper.doPostLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Beb', text: 'test_postLikeStatus_dislikedToLiked', likes: 1, dislikes: 0, likeStatus: 'LIKED'};
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
            mysql_helper.doPostLikeStatus(likeStatus, function(error, result){
              if(error) console.log(error);
              ready();
            });
          });
        });
      });
      it('should revert a DISLIKED vote', function(done){
        var likeStatus = {message_id: obj.message_id, user_id: obj.user_id, likeStatus: 'NONE'};
        mysql_helper.doPostLikeStatus(likeStatus, function(error, actual){
          var ref = {id: obj.message_id, user_name: 'Byb', text: 'test_postLikeStatus_dislikedToNone', likes: 0, dislikes: 0, likeStatus: 'NONE'};
          (error === null).should.be.true;
          delete actual.date;
          actual.should.eql(ref);
          done();
        });
      });
    });
  });
  
  describe('messageExists', function(){
    describe('message DOES exist', function(){
      var message_id;
      before(function(ready){
        var message = {'lat':408,'long':105,'text':'Troulalilalou !', 'user_id': 1, 'picture_url': null, 'tags': []};
        mysql_helper.postMessage(message, function(error, actual){
          (error === null).should.be.true;
          message_id = actual.insertId;
          ready();
        });
      });
      it('should return true', function(done){
        mysql_helper.messageExists(message_id, function(error, exists){
          (exists === true).should.be.true;
          done();
        });
      });
    });
    
    describe('message does NOT exist', function(){
      it('should return false', function(done){
        mysql_helper.messageExists(-1, function(error, exists){
          (exists === false).should.be.true;
          done();
        });
      });
    });
  });

  describe('getUserInfo()', function(){
    var user_id;
    var user_name;
    var message_id;
    before(function(ready){
      var user = {name: 'Beer Lady', email:'beer@lady.com', pass: 'beer'};
      insert_dummy_user(user, function(inserted_user){
        user_id = inserted_user.id;
        user_name = inserted_user.name;
        var message = {'lat': 25, 'long': 26, 'text': 'I <3 beer!',
          user_id: inserted_user.id, user_name: user.name, likes: 0, dislikes: 0, likeStatus: 'NONE'};
        insert_dummy_message(message, function(inserted_message){
          message_id = inserted_message.id;
          ready();
        });
      });
    });
    it('should return the user info and his message', function(done){
      mysql_helper.getUserInfo(user_id, function(error, user_info){
        (error === null).should.be.true;
        (user_info.user_id == user_id).should.be.true;
        (user_info.user_messages[0].id == message_id).should.be.true;
        (user_info.user_messages[0].user_name == user_name).should.be.true;
        
        done();
      });
    });
  });
  
  describe('postUserInfo()', function(){
    var old_user = {name: 'Chunky Kong', email: 'chunky@kong.fr', pass: 'banana'};
    before(function(ready){
      insert_dummy_user(old_user, function(inserted_user){
        old_user.id = inserted_user.id;
        ready();
      });
    });
    it('should post new info', function(done){
      /*old_user.picture_url = 'DK/avatar.jpg';
      old_user.password = old_user.pass;
      old_user.status = 'Hungry';
      delete old_user.pass;
      delete old_user.salt;*/
      var new_user = {user_id: old_user.id, user_name: old_user.name, user_email: 'kong@chunky.fr',
        user_password: 'watermelon', user_status: 'Asleep', user_picture: 'DK/new_avatar.jpg'};
      mysql_helper.postUserInfo(new_user, function(error, user){
        (error === null).should.be.true;
        user.should.eql(new_user);
        done();
      }); 
    });
  });

  describe('insertTagLink()', function(){
    var tag_id, message_id;
    before(function(done){
      var message = {'lat': 12, 'long': 34, 'text': "Are you goin' to Scarborough Fair?"};
      insert_dummy_message(message, function(inserted_message){
        message_id = inserted_message.id;
        var query = 'INSERT INTO test_tags (`tag`) VALUES (:tag)';
        mysql_helper.doQuery(query, {'tag': '#test'}, function(err, tag_stats){
          tag_id = tag_stats.insertId;
          done();
        });
      });
    });
    it('should insert a tag_link', function(done){
      mysql_helper.insertTagLink(tag_id, message_id, function (err, stats){
        (err === null).should.be.true;
        stats.insertId.should.be.above(0);
        done();
      });
    });
  });
});
