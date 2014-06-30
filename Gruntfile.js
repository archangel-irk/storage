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
      files: ['src/**/*.js'],
      tasks: ['browserify']
    },

    browserify: {
      main: {
        options: {
          bundleOptions: {
            debug: true,
            standalone: 'storage'
          }
        },
        src: 'src/index.js',
        dest: 'storage.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('default', ['browserify'] );
  grunt.registerTask('dev', ['browserify', 'watch'] );
};