'use strict';

module.exports = function(grunt) {
  // Project Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      js: {
        files: ['gruntfile.js', 'server.js', 'app/**/*.js', 'test/**/*.js'],
        tasks: ['jshint'],
        options: {
          livereload: true
        }
      }
    },
    jshint: {
      all: {
        src: ['gruntfile.js', 'server.js', 'app/**/*.js', 'test/**/*.js'],
        options: {
          jshintrc: true
        }
      }
    },
    nodemon: {
      topaz: {
        script: 'server.js',
        options: {
          args: [],
          ignore: [],
          ext: 'js',
          nodeArgs: ['--debug'],
          delayTime: 1,
          env: {
            PORT: 8080
          },
          cwd: __dirname
        }
      }
    },
    concurrent: {
      tasks: ['nodemon', 'watch'],
      options: {
        logConcurrentOutput: true
      }
    },
    mochaTest: {
      topaz: {
        options: {
          reporter: 'spec',
          require: 'server.js'
        },
        src: ['test/**/*.js', '!test/mysql/*']
      }
    },
    env: {
      test: {
        NODE_ENV: 'test'
      }
    }
  });

  //Load NPM tasks
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-env');

  //Making grunt default to force in order not to break the project.
  grunt.option('force', true);

  //Default task(s).
  grunt.registerTask('default', ['jshint', 'concurrent']);

  //Test task.
  grunt.registerTask('test', ['env:test', 'mochaTest']);
};
