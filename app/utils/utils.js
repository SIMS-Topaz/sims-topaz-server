'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

/*
 require all the files in modulePath directory, excluding excludeDir directories.
 if no callback provided, callback = require
 excludeDir is optional and can be either a string like 'dir1 dir2 dir3' or an array ['dir1', 'dir2', 'dir3']
 */
exports.load = function load(modulesPath, excludeDir, callback){
  var loaded = {};
  if(arguments.length === 1){
    excludeDir = [];
    callback = require;
  }else if(arguments.length === 2){
    if(_.isFunction(excludeDir)){
      callback = excludeDir;
      excludeDir = [];
    }else{
      callback = require;
    }
  }
  if(_.isString(excludeDir)) excludeDir = excludeDir.split(' ');

  fs
    .readdirSync(modulesPath)
    .forEach(function(file){
      var newPath = path.join(modulesPath, file);
      try{
        var stat = fs.statSync(newPath);
        if(stat.isFile() && /(.*)\.js$/.test(file)){
          var filename = file.replace(/.js$/, '');
          loaded[filename] = callback(newPath);
        }else if(stat.isDirectory() && excludeDir.indexOf(file) === -1){
          load(newPath, excludeDir, callback);
        }
      }catch(err){
        console.log('Error while loading', newPath, err.message);
      }
    });
  
  return loaded;
};

exports.validatePresenceOf = function(value){
  return value && value.length;
};

exports.formatResponse = function(version, success_code, success_msg, data){
  if(version === 'v1') return data;
  return {
    data: data,
    success: {
      code: success_code,
      msg: success_msg
    }
  };
};

var formatError = exports.formatError = function(error_code, error_msg, error_details){
  return {
    error: {
      code: error_code,
      msg: error_msg,
      details: error_details
    }
  };
};

exports.handleError = function(rules){
  var error = null;

  _.every(rules, function(rule){
    if(!rule.rule){
      error = formatError(rule.code, rule.msg, rule.details);
      return false;
    }
    return true;
  });
  return error;
};