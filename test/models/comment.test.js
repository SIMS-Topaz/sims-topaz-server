'use strict';

var should = require('should');
var mongoose = require('mongoose');
var Comment = mongoose.model('Comment');
var ObjectId = mongoose.Types.ObjectId;
var async = require('async');
var _ = require('lodash');

describe('<Unit Tests>', function(){
  describe('Model Comment', function(){
    describe('Static Method getComments', function(){
      var comments = [];
      var message_id = '53a890448ad8da1a8a44dd6b';
      var expected = [];
      
      before(function(ready){
        var oid = new ObjectId(message_id);
        var com = { user_id: oid, message_id: oid, text: 'test comment #0', user_name: 'Beel' };
        comments.push(new Comment(com));
        com.text = 'test comment #1';
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
        Comment.getComments(message_id, function(err, actuals){
          if(err) console.log(err);
          _.isArray(actuals).should.equal(true);
          actuals.length.should.equal(2);
          actuals.should.containDeep(expected);
          done();
        });
      });
      
      after(function(finish){
        comments.forEach(function(comment){
          comment.remove();
        });
        finish();
      });
    });
  });
});
