var should = require("should");
var topaz = require('../../topaz-app.js');
var mysql_helper = require('../../mysql-helper.js');
var conf = require('../../config/conf.js');

mysql_helper.openConnection(conf.mysql);

//Convenience functions
var insert_dummy_message = function(message, callback){
  var query = 'INSERT INTO test_messages (`text`, `lat`, `long`, `date`, `user_id`)'
    + ' VALUES(:text, :lat, :long, :date, :user_id)';
  message.date = new Date().getTime();
  message.user_id = message.user_id || 99;
  mysql_helper.doQuery(query, message, function(error, results){
    if(error !== null){throw Error('Unable to create a dummy message'+error);}
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
    if(error !== null){throw Error('Unable to create a dummy comment'+error);}
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
    if(error !== null){throw Error('Unable to create a dummy user'+error);}
    var inserted_user = params;
    inserted_user.id = results.insertId;
    callback(inserted_user);
  });
};

//Actual tests
describe('topaz-app.js', function(){
  after(function(done){
    var query = 'DELETE FROM `test_messages`; DELETE FROM `test_users`; '
      + 'DELETE FROM `test_comments`; DELETE FROM `test_votes`; DELETE FROM test_tags; ';
    mysql_helper.doQuery(query, {}, function(error, results){
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
      var actual2 = topaz.formatError(rule2.code, rule2.msg, rule2.details);
      actual2.should.eql(topaz.handleError(rules));
      done();
    });
  });

  describe('prepare_get_previews()', function(){
    describe('without tag', function(){
      it('should return the correct parameters to get previews', function(done){
        var input = {'version': 'v1.1', 'lat1': 12, 'lat2': 34, 'long1': 56, 'long2': 78};
        var req = {'params': input};

        var actual = topaz.prepare_get_previews(req);
        input.error = null;
        delete actual.tag;
        actual.should.eql(input);

        var bad_input = {'version': 'v1.1', 'lat1': 12, 'lat2': 34};
        var bad_req = {'params': bad_input};

        var bad_actual = topaz.prepare_get_previews(bad_req);
        bad_actual.error.should.not.equal(null);
        bad_actual.error.should.not.equal(undefined);
        bad_actual.error.error.code.should.equal(400);
        bad_actual.error.error.msg.should.equal('PARAM_ERR');
        done();
      });
    });
    
    describe('with tag', function(){
      it('should still work!', function(done){
        var input = {'version': 'v1.3', 'lat1': 12, 'lat2': 34, 'long1': 56, 'long2': 78,
          'by_tag': 'BY_TAG'};
        var req = {'params': input, 'query': {tag: 'tag'}};

        var actual = topaz.prepare_get_previews(req);
        input.error = null;
        delete input.by_tag;
        input.tag = '#'+req.query.tag;
        actual.should.eql(input);

        var bad_input = {'version': 'v1.1', 'lat1': 12, 'lat2': 34};
        var bad_req = {'params': bad_input};

        var bad_actual = topaz.prepare_get_previews(bad_req);
        bad_actual.error.should.not.equal(null);
        bad_actual.error.should.not.equal(undefined);
        bad_actual.error.error.code.should.equal(400);
        bad_actual.error.error.msg.should.equal('PARAM_ERR');
        done();
      });
    });
  });

  describe('get_previews()', function(){
    describe('standard use', function(){
      var message;
      before(function(ready){
        insert_dummy_user({name: 'Bob', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
          var input = {'lat': 12, 'long': 34, 'text': 'Hello World', 'user_id': user.id, 'picture_url': null};
          insert_dummy_message(input, function(inserted_message){
            message = inserted_message;
            message.likes = 0;
            message.dislikes = 0;
            message.user_name = user.name;
            ready();
          });
        });
      });
      it('should return a formatted list of previews', function(done){
        var req = {'params': {'lat1': 11, 'lat2': 13, 'long1': 33, 'long2': 35, 'version': 'v1.3'},
          session: {user_id: 1}};
        var res = {'json': function(object){
          message.tags = [];
          object.success.should.not.equal(undefined);
          object.data.should.includeEql(message);
          done();
        }};
        topaz.get_previews(req, res);
      });
    });
    describe('by tag research', function(){
      var message;
      before(function(ready){
        insert_dummy_user({name: 'Bobybob', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
          var input = {'lat': 12, 'long': 34, 'text': 'Hello World', 'user_id': user.id, 'picture_url': null};
          insert_dummy_message(input, function(inserted_message){
            message = inserted_message;
            message.likes = 0;
            message.dislikes = 0;
            message.user_name = user.name;
            var query = 'INSERT INTO test_tags (`tag`) VALUES (:tag)';
            mysql_helper.doQuery(query, {'tag': '#tagtag'}, function(err, tag_stats){
              mysql_helper.insertTagLink(tag_stats.insertId, inserted_message.id, function(error, result){
                ready();
              });
            });
          });
        });
      });
      it('should return a formatted list of previews filtered by tag', function(done){
        var req = {'params': {'lat1': 11, 'lat2': 13, 'long1': 33, 'long2': 35, 'by_tag': 'BY_TAG',
          'version': 'v1.3'},
          'session': {user_id: 1},
          'query': {tag: 'tagtag'}};
        var res = {'json': function(object){
          message.tags = ['#tagtag'];
          object.success.should.not.equal(undefined);
          object.data.should.includeEql(message);
          done();
        }};
        topaz.get_previews(req, res);
      });
    });    
  });

  describe('prepare_get_message()', function(){
    var input = {version: 'v1.1'};
    var req;
    var ref;
    before(function(ready){
      insert_dummy_user({name: 'Bobi', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
        var input_message = {'lat': 12, 'long': 34, 'text': 'Hello World', 'user_id': user.id};
        insert_dummy_message(input_message, function(inserted_message){
          input.id = inserted_message.id;
          req = {'params': input, 'session': {'user_id': user.id}};
          ref = {'error': null, 'version': 'v1.1', 'id': inserted_message.id, 'user_id': user.id, 'with_comments': undefined};
          ready();
        });
      });
    });
    it('should return a formatted query to get a message', function(done){
      var actual = topaz.prepare_get_message(req);
      (actual.error === null).should.be.true;
      actual.should.eql(ref);
      done();
    });
  });

  describe('get_message()', function(){
    var message;
    before(function(ready){
      insert_dummy_user({name: 'Bobibob', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
        var input = {'lat': 98, 'long': 76, 'text': '99 Luftballons', 'user_id': user.id, 'picture_url': null, 'tags': []};
        insert_dummy_message(input, function(inserted_message){
          message = inserted_message;
          message.likes = 0;
          message.dislikes = 0;
          message.user_name = user.name;
          message.likeStatus = 'NONE';
          ready();
        });
      });
    });

    it('should return a message', function(done){
      var req = {'params': {'version': 'v1.1', 'id': message.id}, session: {user_id: message.user_id}};
      var res = {
        json: function(actual){
          var reponse = topaz.formatResponse('v1.1', 200, 'OK', message);
          actual.should.eql(reponse);
          done();
        }
      };
      topaz.get_message(req, res);
    });
  });

  describe('prepare_post_message()', function(){
    var input = {'lat': 21, 'long': 43, 'text': 'I wear my sunglasses at night !'};
    before(function(ready){
      insert_dummy_user({name: 'Bobibobuy', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
        input.user_id = user.id;
        ready();
      });
    });
    it('should return a valid post_message query', function(done){
      var req = {'body': input, 'params': {'version': 'v1.1'}, session: {user_id: input.user_id}};
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
      var input = {'lat': 10, 'long': 29, 'text': 'No, I am your father !', 'picture_url': null};
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
    var comment;
    before(function(ready){
      var user = {name: 'Badfafa', email: 'bob@email.fr', pass:'a', salt:'a'};
      insert_dummy_user(user, function(new_user){
        var com = {'text': 'I come to the valley of the rich', 'message_id': 199, 'user_id': new_user.id};
        insert_dummy_comment(com, function(inserted_comment){
          comment = inserted_comment;
          comment.user_name = new_user.name;
          ready();
        });
      });
    });
    it('should return a res with comments', function(done){
      var req = {'params': {'message_id': comment.message_id}, session: {user_id: comment.user_id}};
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
      var input = {user_name: name, user_password: 'felicity', user_email: 'oli.queen@staronline.com', version: 'v1.1'};
      var req = {body: input, 'session': {}};
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
  
  describe('prepapre_post_like_status', function(){
    describe('with correct input', function(){
      it('should return a valid prepared get_comments query', function(done){
        var input = {id: 55, likeStatus: 'NONE'};
        var likeStatus = {message_id: input.id, user_id: 101, likeStatus: input.likeStatus};
        var req = {params: {version: 'v1.1'}, body: input, session: {user_id: 101}};
        var actual = topaz.prepare_post_like_status(req);
        var ref = {error: null, version: 'v1.1', likeStatus: likeStatus};
        actual.should.eql(ref);
        done();
      });
    });
    
    describe('with bad input', function(){
      it('should return an error 400', function(done){
        var input = {id: 55, likeStatus: 'UNRECOGNIZED'};
        var req = {params: {version: 'v1.1'}, body: input, session: {user_id: 101}};
        var actual = topaz.prepare_post_like_status(req);
        var ref = {error: {code: 400, msg: 'PARAM_ERR', details: "Invalid 'likeStatus' parameter"}};
        actual.error.should.eql(ref);
        done();
      });
    });
    
  });
  
  describe('post_like_status', function(){
    var obj = {};
    before(function(ready){
      insert_dummy_user({name: 'Bobugua', email: 'bob@email.fr', pass:'a', salt:'a'}, function(user){
        obj.user_id = user.id;
        insert_dummy_message({text: 'test_postLikeStatus', lat: 101, long:202, user_id: user.id}, function(message){
          obj.message_id = message.id;
          obj.date = message.date;
          ready();
        });
      });
    });
    it('should return a 201 response', function(done){
      var input = {id: obj.message_id, likeStatus: 'LIKED'};
      var ref = {id: obj.message_id, text: 'test_postLikeStatus', user_name: 'Bobugua', likes: 1, dislikes: 0, date: obj.date, likeStatus: 'LIKED'};
      var req = {params: {version: 'v1.1'}, body: input, session: {user_id: obj.user_id}};
      var res = {
        json: function(actual){
          (actual.error === undefined).should.be.true;
          actual.success.code.should.equal(201);
          actual.data.should.eql(ref);
          done();
        }
      };
      topaz.post_like_status(req, res);
    });
  });

  describe('upload_picture()', function(){
    it('should return the url of a picture', function (done){
      var picture_path = '12345';
      var req = {'files': {'picture': {'path': '/uploads/'+picture_path}}, 'params': {'version': 'v1.3'}, 'session': {'user_name': 'dr_no', 'user_id': 1}};
      var res = {
        json: function(actual){
          actual.should.have.property('data').with.have.property('picture_url').with.equal('img/'+picture_path);
          done();
        }
      };
      topaz.upload_picture(req, res);
    });
  });
  
  describe('prepare_get_user_info()', function(){
    it('should return the correct parameters to get user info', function(done){
      var input = {version: 'v1.3', user_id: 1, error: null};
      var req = {params: input};

      var actual = topaz.prepare_get_user_info(req);
      actual.should.eql(input);

      var bad_input = {version: 'v1.3'};
      var bad_req = {params: bad_input};

      var bad_actual = topaz.prepare_get_previews(bad_req);
      bad_actual.error.should.not.equal(null);
      bad_actual.error.should.not.equal(undefined);
      bad_actual.error.error.code.should.equal(400);
      bad_actual.error.error.msg.should.equal('PARAM_ERR');
      done();
    });
  });
  
  describe('get_user_info()', function(){
    var user_id;
    var user_name;
    var message_id;
    var ref_user = {user_name: 'Ice Cream Boy', user_email:'icecream@boy.com', user_picture: null};
    var new_message;
    before(function(ready){
      var user = {name: 'Ice Cream Boy', email:'icecream@boy.com', pass: 'vanilla'};
      insert_dummy_user(user, function(inserted_user){
        ref_user.user_id = inserted_user.id;
        user_id = inserted_user.id;
        user_name = inserted_user.name;
        var message = {'lat': 25, 'long': 26, 'text': 'Ice Cream what else!', picture_url: null,
          user_id: inserted_user.id, user_name: user.name, likes: 0, dislikes: 0, likeStatus: 'NONE'};
        insert_dummy_message(message, function(inserted_message){
          message_id = inserted_message.id;
          new_message = inserted_message;
          delete new_message.user_id;
          delete new_message.likeStatus;
          ref_user.user_messages = [new_message];
          ready();
        });
      });
    });
    it('should return the user info and his message', function(done){
      var req = {params: {version: 'v1.3', user_id: user_id}, session: {user_id: user_id}};
      var res = {
        json: function(actual){
          ref_user.user_status = null;
          var reponse = topaz.formatResponse('v1.3', 200, 'OK', ref_user);
          actual.should.eql(reponse);
          done();
        }
      };
      topaz.get_user_info(req, res);
    });
  });
  
  describe('prepare_post_user_info()', function(){
    it('should return the correct parameters to post new user info', function(done){
      var input = {user_id: 1, user_name: 'Lanky Kong', user_status: 'clown',
        user_email: 'lanky@kong.fr', user_password: 'banana', user_picture: 'bla/bla.jpg'};
      var req = {'body': input, 'params': {'version': 'v1.3'}, session: {user_id: input.user_id}};

      var actual = topaz.prepare_post_user_info(req);
      (actual.user).should.eql(input);
      (actual.error === null).should.be.true;
      (actual.version === req.params.version).should.be.true;
      
      var bad_input = {user_id: 1, user_name: 'Lanky Kong', user_email: 'lanky@kong.fr',
        user_password: 'banana'};
      var bad_req = {'body': bad_input, 'params': {'version': 'v1.3'}, session: {user_id: bad_input.user_id}};

      var bad_actual = topaz.prepare_post_user_info(bad_req);
      bad_actual.error.should.not.equal(null);
      bad_actual.error.should.not.equal(undefined);
      bad_actual.error.error.code.should.equal(400);
      bad_actual.error.error.msg.should.equal('PARAM_ERR');
      done();
    });
  });
  
  describe('post_user_info()', function(){
    var old_user = {name: 'Donkey Kong', email: 'donkey@kong.fr', pass: 'banana'};
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
      var new_user = {user_id: old_user.id, user_name: old_user.name, user_email: 'kong@donkey.fr',
        user_status: 'Asleep', user_picture: 'DK/new_avatar.jpg'};
      
      var req = {params: {version: 'v1.3'}, body: new_user, session: {user_id: new_user.user_id}};
      var res = {
        json: function(actual){
          var reponse = topaz.formatResponse('v1.3', 200, 'OK', new_user);
          actual.should.eql(reponse);
          done();
        }
      };
      topaz.post_user_info(req, res);
    });
  });
});
