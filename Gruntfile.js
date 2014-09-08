/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 12.12.13
 * Time: 0:31
 */
'use strict';
module.exports = function (grunt) {
  require('time-grunt')(grunt);

  grunt.initConfig({
    //pkg: grunt.file.readJSON('package.json'),
    watch: {
      files: ['lib/**/*.js'],
      tasks: ['browserify']
    },

    browserify: {
      dev: {
        options: {
          browserifyOptions: {
            debug: true,
            standalone: 'storage'
          }
        },
        src: 'lib/index.js',
        dest: 'storage.debug.js'
      },
      dist: {
        options: {
          browserifyOptions: {
            standalone: 'storage'
          }
        },
        src: 'lib/index.js',
        dest: 'storage.js'
      }
    },

    uglify: {
      main: {
        files: {
          'storage.min.js': ['storage.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('default', ['browserify', 'uglify'] );
  grunt.registerTask('dev', ['browserify:dev', 'watch'] );
};