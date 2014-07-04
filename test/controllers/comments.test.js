'use strict';

var should = require('should');
var mongoose = require('mongoose');
var Comment = mongoose.model('Comment');
var Message = mongoose.model('Message');
var ObjectId = mongoose.Types.ObjectId;
var controller = require('../../app/controllers/comments');
var async = require('async');
var _ = require('lodash');

describe('<Unit Tests>', function(){
  describe('Controller comments', function(){
    describe('Method getComments', function(){
      var comments = [];
      var message_id = '53a890448ad8da1a8a44dd6b';
      var expected = [];

      before(function(ready){
        var oid = new ObjectId(message_id);
        var com = { user_id: oid, message_id: oid, text: 'test comments #0', user_name: 'Beel' };
        comments.push(new Comment(com));
        com.text = 'test comments #1';
        comments.push(new Comment(com));

        async.each(comments, function(comment, callback){
          comment.save(function(err){
            var com = comment.toObject();
            com._id = com._id.toString();
            com.user_id = com.user_id.toString();
            com.message_id = com.message_id.toString();
            expected.push(com);
            callback(err);
          });
        }, function(err){
          if(err) console.log(err);
          ready();
        });
      });

      it('should return 2 comments', function(done){
        var req = { params: { version: 3, message_id: message_id } };
        var res = { json: function(actual){
          should.not.exist(actual.error);
          should.exist(actual.success);
          should.exist(actual.data);
          _.isArray(actual.data).should.equal(true);
          actual.data.length.should.equal(2);
          actual.data.should.containDeep(expected);
          done();
        }};
        controller.getComments(req, res);
      });
      
      it('should failed', function(done){
        var req = { params: { version: 3} };
        var res = { json: function(actual){
          should.exist(actual.error);
          should.not.exist(actual.success);
          should.not.exist(actual.data);
          actual.error.should.containEql({
            code: 400,
            msg: 'PARAM_ERR',
            details: "Missing 'message_id' parameter"
          });
          done();
        }};
        controller.getComments(req, res);
      });

      after(function(finish){
        comments.forEach(function(comment){
          comment.remove();
        });
        finish();
      });
    });
    
    describe('Method postComment', function(){
      var to_remove = {};
      var id;
      
      before(function(ready){
        var message = new Message({
          user_id: '53a890448ad8da1a8a44dd6b',
          user_name: 'Beel',
          text: 'Bub',
          lat: 0,
          long: 0
        });
        message.save(function(err){
          if(err) console.log(err);
          id = message._id.toString();
          to_remove.msg = id;
          ready();
        });
      });
      
      it('should post a new comment', function(done){  
        var expected = {
          user_id: id,
          user_name: 'Beel',
          message_id: id,
          text: 'Bub'
        };
        var req = {
          params: { version: 3, message_id: id},
          session: { user_id: id},
          body: { user_name: 'Beel', text: 'Bub' }
        };
        var res = { json: function(actual){
          should.not.exist(actual.error);
          should.exist(actual.success);
          should.exist(actual.data);
          to_remove.com = actual.data._id;
          delete actual.data.__v;
          delete actual.data._id;
          delete actual.data.date;
          actual.data.should.containEql(expected);
          done();
        }};
        controller.postComment(req, res);
      });
      
      it('should failed because no message_id', function(done){
        var req = {
          params: { version: 3},
          session: { user_id: id},
          body: { user_name: 'Beel', text: 'Bub' }
        };
        var res = { json: function(actual){
          should.exist(actual.error);
          should.not.exist(actual.success);
          should.not.exist(actual.data);
          actual.error.should.containEql({
            code: 400,
            msg: 'PARAM_ERR',
            details: "Missing 'message_id' parameter"
          });
          done();
        }};
        controller.postComment(req, res);
      });

      it('should failed because no user_name', function(done){
        var req = {
          params: { version: 3, message_id: id},
          session: { user_id: id},
          body: { text: 'Bub' }
        };
        var res = { json: function(actual){
          should.exist(actual.error);
          should.not.exist(actual.success);
          should.not.exist(actual.data);
          actual.error.should.containEql({
            code: 400,
            msg: 'PARAM_ERR',
            details: "Missing 'user_name' parameter"
          });
          done();
        }};
        controller.postComment(req, res);
      });

      it('should failed because no text', function(done){
        var req = {
          params: { version: 3, message_id: id},
          session: { user_id: id},
          body: { user_name: 'Beel' }
        };
        var res = { json: function(actual){
          should.exist(actual.error);
          should.not.exist(actual.success);
          should.not.exist(actual.data);
          actual.error.should.containEql({
            code: 400,
            msg: 'PARAM_ERR',
            details: "Missing 'text' parameter"
          });
          done();
        }};
        controller.postComment(req, res);
      });
      
      after(function(finish){
        async.parallel({
          com: function(callback){
            Comment.findByIdAndRemove(to_remove.com, callback);
          },
          msg: function(callback){
            Message.findByIdAndRemove(to_remove.msg, callback);
          }
        }, function(err){
          if(err) console.log(err);
          finish();
        });
        
      });
    });
  });
});
