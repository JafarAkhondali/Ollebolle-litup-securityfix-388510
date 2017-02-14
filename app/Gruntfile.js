module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      dist: ['build']
    },
    sass: {
      build: {
        options: {
          style: 'compressed'
        },
        files: {
          'css/app.min.css': 'sass/app.sass'
        }
      }
    },
    watch: {
      styles: {
        files: ['sass/*.sass', 'sass/partials/*.sass'],
        tasks: ['regenerate-sass']
      },
    },
  });
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['sass']);
  grunt.registerTask('regenerate-sass', ['sass']);
};
