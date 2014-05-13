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
      files: ['test/**/*', 'src/**/*.js'],
      tasks: ['concat_sourcemap']
    },

    concat_sourcemap: {
      dist: {
        src: [
          'src/intro.js',

          'src/events.js',
          'src/mpath.js',

          // STORAGE
          'src/utils.js',
          'src/error.js',
          'src/types/objectid.js',
          'src/types/embedded.js',
          'src/types/array.js',
          'src/types/documentarray.js',

          'src/statemachine.js',
          'src/internal.js',
          'src/virtualtype.js',

          'src/schematype.js',
          'src/schema/string.js',
          'src/schema/boolean.js',
          'src/schema/number.js',
          'src/schema/objectid.js',
          'src/schema/date.js',
          'src/schema/mixed.js',
          'src/schema/array.js',
          'src/schema/documentarray.js',

          'src/schema.js',
          'src/document.js',
          'src/collection.js',
          'src/storage.js',
          'src/outro.js'
        ],
        dest: 'storage.js',
        nonull: true
      }
    },

    clean: ['dist']
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-concat-sourcemap');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('default', ['clean', 'concat_sourcemap'] );
  grunt.registerTask('dev', ['clean', 'concat_sourcemap', 'watch'] );
};