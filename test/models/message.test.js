'use strict';

var should = require('should');
var mongoose = require('mongoose');
var Message = mongoose.model('Message');
var ObjectId = mongoose.Types.ObjectId;
var async = require('async');
var _ = require('lodash');
var config = require('../../config/conf');

describe('<Unit Tests>', function(){
  describe('Model Message', function(){
    describe('Static Method getMessage', function(){
      var message;
      
      before(function(ready){
        message = new Message({
          user_id: '53a890448ad8da1a8a44dd6b',
          user_name: 'Beel',
          text: 'Bub',
          lat: 0,
          long: 0
        });
        message.save(function(err){
          if(err) console.log(err);
          ready();
        })
      });
      
      it('should return the requested message', function(done){
        var expected = message.toObject();
        expected._id = expected._id.toString();
        expected.user_id = expected.user_id.toString();
        
        Message.getMessage(expected._id, function(err, actual){
          should.not.exist(err);
          should.exist(actual);
          actual.should.containEql(expected);
          done();
        });
      });
      
      after(function(finish){
        message.remove();
        finish();
      });
    });
    
    describe('Static Method getPreviews', function(){
      var messages = [];
      var expected = [];
      
      before(function(ready){
        var attr = {
          user_id: '53a890448ad8da1a8a44dd6b',
          user_name: 'Beel',
          text: 'Bub blooooooooooooooooooooooooooooooooooooooooooop ... too long',
          lat: 5,
          long: 5,
          tags: ['preview']
        };
        messages.push(new Message(attr));
        
        attr.text = 'Bub blooooooooooooooooooooooooooooooooooooooooooop ... too long #2';
        messages.push(new Message(attr));
        
        attr.text = 'Bub blooooooooooooooooooooooooooooooooooooooooooop ... too long #3';
        attr.tags = [];
        messages.push(new Message(attr));

        attr.text = 'Bub blooooooooooooooooooooooooooooooooooooooooooop ... too long #4';
        attr.tags = ['preview'];
        attr.lat = 0;
        attr.long = 0;
        messages.push(new Message(attr));


        async.each(messages, function(message, callback){
          message.save(function(err){
            var msg = message.toObject();
            msg._id = msg._id.toString();
            msg.user_id = msg.user_id.toString();
            msg.text = msg.text.substr(0, config.PREVIEW_SIZE);
            expected.push(msg);
            callback(err);
          });
        }, function(err){
          if(err) console.log(err);
          expected = expected.slice(0, 2);
          ready();
        });
      });

      it('should return some previews', function(done){
        var criteria = {
          min_lat: 1,
          max_lat: 10,
          min_long: 1,
          max_long: 10,
          tags: ['preview']
        };
        Message.getPreviews(criteria, function(err, actuals){
          should.not.exist(err);
          _.isArray(actuals).should.equal(true);
          actuals.length.should.equal(2);
          actuals.should.containDeep(expected);
          done();
        });
      });

      after(function(finish){
        messages.forEach(function(message){
          message.remove();
        });
        finish();
      });
    });
  });
});
