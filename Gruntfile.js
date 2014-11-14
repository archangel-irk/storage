'use strict';

module.exports = function (grunt) {
  require('time-grunt')(grunt);

  grunt.initConfig({
    //pkg: grunt.file.readJSON('package.json'),
    watch: {
      files: ['lib/**/*.js'],
      tasks: ['browserify:dev']
    },

    browserify: {
      //browserify lib/ --standalone storage > storage.js -d
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

      // browserify lib/ --standalone storage > storage.js
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
        options: {
          mangle: false
        },
        files: {
          'storage.min.js': ['storage.js']
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      lib: {
        src: [
          'lib/**/*.js'
          //'storage.debug.js'
        ]
      },
      tests: {
        src: [
          'test/*.js',
          'Gruntfile.js',
          'karma.conf.js'
        ]
      }
    },

    karma: {
      options: {
        configFile: 'karma.conf.js'
      },

      local: {
        browsers: [
          'Chrome'
        ],
        preprocessors: {
          // source files, that you wanna generate coverage for
          // do not include tests or libraries
          // (these files will be instrumented by Istanbul)
          './storage.js': ['coverage']
        },
        // coverage reporter generates the coverage
        reporters: [
          'dots',
          'coverage'
        ],
        // optionally, configure the reporter
        coverageReporter: {
          type: 'html',
          dir: 'test/coverage'
        }
      },

      phantom: {
        browsers: [
          'PhantomJS'
        ],
        preprocessors: {
          // source files, that you wanna generate coverage for
          // do not include tests or libraries
          // (these files will be instrumented by Istanbul)
          './storage.js': ['coverage']
        },
        // coverage reporter generates the coverage
        reporters: [
          'dots',
          'coverage'
        ],
        // optionally, configure the reporter
        coverageReporter: {
          type: 'lcovonly',
          dir: 'test/coverage'
        }
      },

      sauce: {
        reporters: [
          'dots',
          'saucelabs'
        ],
        browsers: [
          'sauce_chrome',
          //'sauce_chrome_linux',
          'sauce_firefox',
          //'sauce_firefox_linux',
          'sauce_safari',
          //'sauce_ie_8',
          'sauce_ie_9',
          'sauce_ie_10',
          'sauce_ie_11'
        ]
      }
    },

    coveralls: {
      options: {
        coverage_dir: 'test/coverage',
        recursive: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-karma-coveralls');

  grunt.registerTask('default', [
    'build',
    'test'
  ]);

  grunt.registerTask('lint', [
    'jshint'
  ]);

  grunt.registerTask('build', [
    //'lint',
    //'complexity',
    'browserify',
    'uglify'
  ]);

  grunt.registerTask('dev', [
    'browserify:dev',
    'watch'
  ]);

  grunt.registerTask('test', [
    'browserify:dist',
    'karma:local'
  ]);

  grunt.registerTask('travis', [
    'build',
    'karma:phantom',
    'karma:sauce'
  ]);
};