var topaz = require('./topaz-app.js');
var mysql_helper = require('./mysql-helper.js');
var _ = require('underscore');
var crypto = require('crypto');

exports.test_formatError = function(test){
  test.expect(1);
  var code = 500, msg = 'SERVER_ERR', details = 'A server error happened';
  var input = topaz.formatError(500, msg, details);
  var output = {'error': {'code': code, 'msg': msg, 'details': details}};
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
  test.expect(2);
  var rule_1 = {'rule': false, 'code': 123, 'msg': 'UKNOWN_ERR_1', 'details': "First rule went wrong"};
  var rule_2 = {'rule': false, 'code': 456, 'msg': 'UKNOWN_ERR_2', 'details': "Second rule went wrong"};
  var rules = [rule_1, rule_2];
  var error = function(rule){delete rule.rule; return rule;};

  test.deepEqual(topaz.handleError(rules), {'error': error(rule_1)});
  var rule_1 = {'rule': true, 'code': 123, 'msg': 'UKNOWN_ERR_1', 'details': "First rule went wrong"};
  var rules = [rule_1, rule_2];
  test.deepEqual(topaz.handleError(rules), {'error': error(rule_2)});
  test.done();
};

exports.test_prepare_get_previews = function(test){
  test.expect(3);
  var input = {'params': {'version': 'v1.1', 'lat1': 25, 'long1': 50, 'lat2': 75, 'long2': 100}};

  var prep = topaz.prepare_get_previews(input);
  test.deepEqual([prep.error, prep.version, prep.lat1, prep.long1, prep.lat2, prep.long2], [null, 'v1.1', 25, 50, 75, 100]);

  input = {'params': {'version': 'v1.1', 'lat1': 25, 'long1': 50}};

  prep = topaz.prepare_get_previews(input);
  test.notEqual(prep.error, null);
  test.equal(prep.error.error.code, 400);

  /*var input_v1 = {'params': {'version': 'v1', 'lat1': 15, 'long1': 30, 'lat2': 45, 'long2': 60}};

  prep = topaz.prepare_get_previews(input_v1);
  test.deepEqual([prep.error, prep.version, prep.lat1, prep.long1, prep.lat2, prep.long2], [null, 'v1', 15, 30, 50, null]);

  input_v1 = {'params': {'version': 'v1', 'lat1': 15, 'long1': 30}};

  prep = topaz.prepare_get_previews(input_v1);
  test.deepEqual([prep.error, prep.version, prep.lat1, prep.long1, prep.lat2, prep.long2], [null, 'v1', 15, 30, 50, null]);

  input_v1 = {'params': {'version': 'v1', 'lat1': 15}};

  prep = topaz.prepare_get_previews(input_v1);
  test.notEqual(prep.error, null);
  test.equal(prep.error.error.code, 400);*/

  test.done();
};

exports.test_prepare_get_message = function(test){
  test.expect(4);
  var input = {'params': {'version': 'v1.1', 'id': 1234}};

  var prep = topaz.prepare_get_message(input);
  test.deepEqual([prep.error, prep.version, prep.id], [null, 'v1.1', 1234]);

  input = {'params': {'version': 'v1.1'}};

  prep = topaz.prepare_get_message(input);
  test.notEqual(prep.error, null);
  test.equal(prep.error.error.code, 400);

  var input_v1 = {'params': {'version': 'v1', 'id': 5678}};

  prep = topaz.prepare_get_message(input_v1);
  test.deepEqual([prep.error, prep.version, prep.id], [null, 'v1', 5678]);

  test.done();
};

exports.test_prepare_post_message = function(test){
  test.expect(3);
  var input = {
    'params': {'version': 'v1.1'},
    'body': {'lat': 10, 'long': 20, 'text': 'Hello World'}
  };
  var prep = topaz.prepare_post_message(input);
  test.equal(prep.error, null);
  test.equal(prep.version, 'v1.1');
  test.deepEqual(prep.message, {'lat': 10, 'long': 20, 'text': 'Hello World'});
  test.done();
};

exports.test_prepare_post_like_status = function(test){
  test.expect(5);
  var input = {params: {version: 'v1.1'}, session: {user_id: 2}, body: {id: 1, likeStatus: 'LIKED'}};
  var prep = topaz.prepare_post_like_status(input);
  
  test.deepEqual(prep, {error: null, version: 'v1.1', likeStatus: {message_id: 1, user_id: 2, likeStatus: 'LIKED'}});
  
  input.body.likeStatus = 'BAD';
  prep = topaz.prepare_post_like_status(input);
  test.notEqual(prep.error, null);
  test.equal(prep.error.error.code, 400);
  
  delete input.body.user_id;
  prep = topaz.prepare_post_like_status(input);
  test.notEqual(prep.error, null);
  test.equal(prep.error.error.code, 400);
  
  test.done();
};

var insert_dummy_message = function(params, callback){
  params.user_id = params.user_id || 99;
  var query = 'INSERT INTO test_messages (`text`, `lat`, `long`, `date`, `user_id`)'
    + ' VALUES(:text, :lat, :long, :date, :user_id)';
  params.date = new Date().getTime();
  mysql_helper.doQuery(query, params, function(error, results){
    callback(results.insertId);
  });
};

var insert_dummy_comment = function(params, callback){
  var query = 'INSERT INTO test_comments (`text`, `date`, `message_id`, `user_id`)'
    + ' VALUES (:text, :date, :message_id, :user_id)';
  params.date = new Date().getTime();
  mysql_helper.doQuery(query, params, function(error, results){
    callback(results.insertId);
  });
};

var insert_dummy_user = function(params, callback){
  var query = 'INSERT INTO test_users (`name`, `email`, `password`, `salt`)'
    + ' VALUES (:name, :email, :password, :salt)';
  mysql_helper.doQuery(query, params, function(error, result){
    callback(result.insertId);
  });
};

exports.test_mysql_helper = {
  setUp: function(callback){
    mysql_helper.openConnection();
    callback();
  },
  tearDown: function(callback){
    mysql_helper.doQuery("DELETE FROM `test_users`; DELETE FROM `test_messages`; DELETE FROM `test_comments`;", {}, function(error, results){
      mysql_helper.closeConnection();
      callback();
    });
  },

  test_environment: function(test){
    test.expect(4);
    test.equal(process.env.NODE_ENV, 'test');
    var query = 'SHOW TABLES FROM topaz';
    var params = {};
    mysql_helper.doQuery(query, params, function(error, results){
      test.equal(error, null);
      results = _.map(results, function(table){return table.Tables_in_topaz;});
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
      insert_dummy_message({'lat': 123, 'long': 456, 'text': '221B Baker Street'}, function(){callback();});
    },
    test: function(test){
      test.expect(3);
      mysql_helper.getPreviews(122, 455, 124, 457, function(error, results){
        test.equal(error, null);
        test.notEqual(results.length, 0);
        var any_value = _.any(results, function(result){
          return result.text === '221B Baker Street' && result.lat === 123 && result.long === 456
            && result.name === 'user99';
        });
        test.equal(any_value, true);
        test.done();
      });
    }
  },

  test_get_previews: {
    setUp: function(callback){
      insert_dummy_message({'lat': 111, 'long': 101, 'text': 'Don\'t panic !'}, function(){callback();});
    },
    test: function(test){
      var req = {'params':{'version': 'v1.1', 'lat1': 99, 'long1': 79, 'lat2': 199, 'long2': 179}};
      var res = {
        json: function(object){
          test.strictEqual(object.error, undefined);
          test.notEqual(object.data.length, 0);
          var any_value = _.any(object.data, function(result){
            return result.text === 'Don\'t panic !' && result.lat === 111 && result.long === 101;
          });
          test.equal(any_value, true);
          test.done();
        }
      };
      topaz.get_previews(req, res);
    }
  },

  test_postMessage: {
    test: function(test){
      test.expect(4);
      var message = {'lat':48,'long':15,'text':'Flynn Lives !', 'user_id': 456};
      mysql_helper.postMessage(message, function(error, results){
        test.equal(error, null);
        test.notStrictEqual(results, undefined);
        test.strictEqual(results[0], undefined);
        test.ok(results.insertId);
        test.done();
      });
    }
  },

  test_post_message: {
    test: function(test){
      test.expect(4);
      var input = {'lat':23,'long':42,'text':'The cake is a lie'};
      var req = {'params': {'version': 'v1.1'}, 'body': input, 'session': {'user_id': 123}};
      var res = {
        'json': function(object){
           test.equal(object.error, null);
           test.ok(object.data.date);
           test.ok(object.data.id);
           delete object.data.date;
           delete object.data.id;
	  test.deepEqual(object, {'success': {'code': 201, 'msg': 'Created'}, 'data': input});
	  test.done();
	}
      };
      topaz.post_message(req, res);
    }
  },

  test_getMessage: {
    setUp: function(callback){
      var self = this;
      insert_dummy_message({'lat': 25, 'long': 26, 'text': 'Draco Dormiens Nunquam Titillandus'}, function(id){
        self.id = id;
        callback();
      });
    },
    test: function(test){
      test.expect(5);
      test.notEqual(this.id, undefined);
      var self = this;
      mysql_helper.getMessage(this.id, function(error, result){
        test.equal(error, null);
        test.strictEqual(result[0], undefined);
        test.ok(result.date);
        delete result.date;
        test.deepEqual(result, {'id': self.id, 'lat':25, 'long':26, 'text': 'Draco Dormiens Nunquam Titillandus', user_id: 99});
        test.done();
      });
    }
  },

  test_get_message: {
    setUp: function(callback){
      var self = this;
      insert_dummy_message({'lat': 23, 'long': 8, 'text': 'Move fast and break things.'}, function(id){
        self.id = id;
        callback();
      });
    },
    test: function(test){
      test.expect(3);
      var req = {'params': {'version': 'v1.1', 'id': this.id}};
      var self = this;
      var res = {
        json: function(object){
          test.equal(object.error, undefined);
          test.ok(object.data.date);
          delete object.data.date;
          test.deepEqual(object.data, {'id': self.id, 'lat': 23, 'long': 8, 'text': 'Move fast and break things.', user_id: 99});
          test.done();
        }
      };
      topaz.get_message(req, res);
    }
  },

  test_postComment: {
    test: function(test){
      test.expect(4);
      var comment = {'text': 'hello', 'message_id': 1, 'user_id': 2};
      mysql_helper.postComment(comment, function(error, results){
        test.equal(error, null);
        test.notStrictEqual(results, undefined);
        test.strictEqual(results[0], undefined);
        test.ok(results.insertId);
        test.done();
      });
    }
  },

  test_getComments: {
    setUp: function(callback){
      this.message_id = 3;
      insert_dummy_comment({'user_id': 99,'message_id': this.message_id,'text': 'dummy comment'}, function(){
        callback();
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      mysql_helper.getComments(this.message_id, function(error, results){
	    test.equal(error, null);
      delete results[0].date;
      delete results[0].id;
	    test.deepEqual(results[0], {'user_id': 99, name: 'user99', message_id: self.message_id, 'text': 'dummy comment'});
	    test.done();
      });
    }
  },

  test_get_user_auth: {
    test_auth: function(test){
      test.expect(2);
      var input = {'user_name': 'sherlock', 'user_id': 99};
      var req = {'session': input};
      var res = {
	json: function(object){
	  test.notStrictEqual(object.success, undefined);
	  test.deepEqual(object.data, input);
	  test.done();
	}
      };
      topaz.get_user_auth(req, res);
    },
    test_unauth: function(test){
      test.expect(1);
      var input = {};
      var req = {'session': input};
      var res = {
	json: function(object){
	  test.notStrictEqual(object.error, undefined);
	  test.done();
	}
      };
      topaz.get_user_auth(req, res);
    }
  },
  test_post_user_auth: {
    setUp: function(callback){
      var shasum = crypto.createHash('sha1');
      shasum.update('abcdef'+'watson');
      var hash = shasum.digest('hex');
      var self = this;
      mysql_helper.doQuery(
	"INSERT INTO `test_users` VALUES(null, 'john', 'john@mock.org', '"+hash+"', 'abcdef')",
	function(error, results){
	  self.user_id = results.insertId;
	  callback();
	}
      );
    },
    test_auth: function(test){
      test.expect(2);
      var input = {'user_name': 'john', 'user_id': this.user_id};
      var req = {'session': input};
      var res = {
	json: function(object){
	  test.notStrictEqual(object.error, undefined);
	  test.equal(object.error.code, 403);
	  test.done();
	}
      };
      topaz.post_user_auth(req, res);
    },
    test_unauth_no_user: function(test){
      test.expect(2);
      var input = {'user_name': 'mrs_hudson'};
      var req = {'session': {}, body: input};
      var res = {
	json: function(object){
	  test.notStrictEqual(object.error, undefined);
	  test.equal(object.error.code, 401);
	  test.done();
	}
      };
      topaz.post_user_auth(req, res);
    },
    test_unauth_no_pwd: function(test){
      test.expect(2);
      var input = {'user_name': 'john', 'user_password': 'doe'};
      var req = {'session': {}, 'body': input};
      var res = {
	json: function(object){
	  test.notStrictEqual(object.error, undefined);
	  test.equal(object.error.code, 401);
	  test.done();
	}
      };
      topaz.post_user_auth(req, res);
    },
    test_unauth: function(test){
      test.expect(2);
      var input = {'user_name': 'john', 'user_password': 'watson'};
      var req = {'session': {}, 'body': input};
      var res = {
	json: function(object){
	  test.notStrictEqual(object.success, undefined);
	  test.equal(object.data.user_name, 'john');
	  test.done();
	}
      };
      topaz.post_user_auth(req, res);
    }
  },
  
  test_postLikeStatus_noneToLiked: {
    setUp: function(callback){
      var self = this;
      insert_dummy_user({name: 'Bob', email: 'bob@email.fr', password:'a', salt:'a'}, function(user_id){
        self.user_id = user_id;
        insert_dummy_message({text: 'test_postLikeStatus_noneToLiked', lat: 101, long:202, user_id: user_id}, function(message_id){
          self.message_id = message_id;
          callback();
        });
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      var likeStatus = {message_id: this.message_id, user_id: this.user_id, likeStatus: 'LIKED'};
      mysql_helper.postLikeStatus(likeStatus, function(error, message){
        if(error) console.log(error);
        test.equal(error, null);
        delete message.date;
        test.deepEqual(message, {id: self.message_id, name: 'Bob', text: 'test_postLikeStatus_noneToLiked', likes: 1, dislikes: 0});
        test.done();
      });
    }
  },
  
  test_postLikeStatus_noneToDisliked: {
    setUp: function(callback){
      var self = this;
      insert_dummy_user({name: 'Bab', email: 'bab@email.fr', password:'a', salt:'a'}, function(user_id){
        self.user_id = user_id;
        insert_dummy_message({text: 'test_postLikeStatus_noneToDisliked', lat: 101, long:202, user_id: user_id}, function(message_id){
          self.message_id = message_id;
          callback();
        });
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      var likeStatus = {message_id: this.message_id, user_id: this.user_id, likeStatus: 'DISLIKED'};
      mysql_helper.postLikeStatus(likeStatus, function(error, message){
        if(error) console.log(error);
        test.equal(error, null);
        delete message.date;
        test.deepEqual(message, {id: self.message_id, name: 'Bab', text: 'test_postLikeStatus_noneToDisliked', likes: 0, dislikes: 1});
        test.done();
      });
    }
  },
  
  test_postLikeStatus_likedToDisliked: {
    setUp: function(callback){
      var self = this;
      insert_dummy_user({name: 'Bub', email: 'bub@email.fr', password:'a', salt:'a'}, function(user_id){
        self.user_id = user_id;
        insert_dummy_message({text: 'test_postLikeStatus_likedToDisliked', lat: 111, long:222, user_id: user_id}, function(message_id){
          self.message_id = message_id;
          var likeStatus = {message_id: self.message_id, user_id: self.user_id, likeStatus: 'LIKED'};
          mysql_helper.postLikeStatus(likeStatus, function(error, result){
            if(error) console.log(error);
            callback();
          });
        });
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      var likeStatus = {message_id: this.message_id, user_id: this.user_id, likeStatus: 'DISLIKED'};
      mysql_helper.postLikeStatus(likeStatus, function(error, message){
        if(error) console.log(error);
        test.equal(error, null);
        delete message.date;
        test.deepEqual(message, {id: self.message_id, name: 'Bub', text: 'test_postLikeStatus_likedToDisliked', likes: 0, dislikes: 1});
        test.done();
      });
    }
  },
  
  test_postLikeStatus_likedToNone: {
    setUp: function(callback){
      var self = this;
      insert_dummy_user({name: 'Bib', email: 'bib@email.fr', password:'a', salt:'a'}, function(user_id){
        self.user_id = user_id;
        insert_dummy_message({text: 'test_postLikeStatus_likedToNone', lat: 111, long:222, user_id: user_id}, function(message_id){
          self.message_id = message_id;
          var likeStatus = {message_id: self.message_id, user_id: self.user_id, likeStatus: 'LIKED'};
          mysql_helper.postLikeStatus(likeStatus, function(error, result){
            if(error) console.log(error);
            callback();
          });
        });
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      var likeStatus = {message_id: this.message_id, user_id: this.user_id, likeStatus: 'NONE'};
      mysql_helper.postLikeStatus(likeStatus, function(error, message){
        if(error) console.log(error);
        test.equal(error, null);
        delete message.date;
        test.deepEqual(message, {id: self.message_id, name: 'Bib', text: 'test_postLikeStatus_likedToNone', likes: 0, dislikes: 0});
        test.done();
      });
    }
  },
  
  test_postLikeStatus_dislikedToLiked: {
    setUp: function(callback){
      var self = this;
      insert_dummy_user({name: 'Beb', email: 'beb@email.fr', password:'a', salt:'a'}, function(user_id){
        self.user_id = user_id;
        insert_dummy_message({text: 'test_postLikeStatus_dislikedToLiked', lat: 111, long:222, user_id: user_id}, function(message_id){
          self.message_id = message_id;
          var likeStatus = {message_id: self.message_id, user_id: self.user_id, likeStatus: 'DISLIKED'};
          mysql_helper.postLikeStatus(likeStatus, function(error, result){
            if(error) console.log(error);
            callback();
          });
        });
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      var likeStatus = {message_id: this.message_id, user_id: this.user_id, likeStatus: 'LIKED'};
      mysql_helper.postLikeStatus(likeStatus, function(error, message){
        if(error) console.log(error);
        test.equal(error, null);
        delete message.date;
        test.deepEqual(message, {id: self.message_id, name: 'Beb', text: 'test_postLikeStatus_dislikedToLiked', likes: 1, dislikes: 0});
        test.done();
      });
    }
  },
  
  test_postLikeStatus_dislikedToNone: {
    setUp: function(callback){
      var self = this;
      insert_dummy_user({name: 'Byb', email: 'byb@email.fr', password:'a', salt:'a'}, function(user_id){
        self.user_id = user_id;
        insert_dummy_message({text: 'test_postLikeStatus_dislikedToNone', lat: 111, long:222, user_id: user_id}, function(message_id){
          self.message_id = message_id;
          var likeStatus = {message_id: self.message_id, user_id: self.user_id, likeStatus: 'DISLIKED'};
          mysql_helper.postLikeStatus(likeStatus, function(error, result){
            if(error) console.log(error);
            callback();
          });
        });
      });
    },
    test: function(test){
      test.expect(2);
      var self = this;
      var likeStatus = {message_id: this.message_id, user_id: this.user_id, likeStatus: 'NONE'};
      mysql_helper.postLikeStatus(likeStatus, function(error, message){
        if(error) console.log(error);
        test.equal(error, null);
        delete message.date;
        test.deepEqual(message, {id: self.message_id, name: 'Byb', text: 'test_postLikeStatus_dislikedToNone', likes: 0, dislikes: 0});
        test.done();
      });
    }
  }
};

