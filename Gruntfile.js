module.exports = function(grunt) {
	
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-umd');
	
	grunt.initConfig({
		clean: {
			dist: ["dist"]
		},
		compress: {
			dist: {
				files: [
					{
						expand: true,
						ext: '.css.gz',
						extDot: 'last',
						src: ['dist/css/**/*.min.css']
					},
					{
						expand: true,
						ext: '.js.gz',
						extDot: 'last',
						src: ['dist/js/**/*.min.js']
					}
				],
				options: {
					mode: 'gzip',
					level: 9
				}
			}
		},
		concat: {
			// on the core and bundle files
			banner: {
				expand: true,
				src: ['dist/js/!(*.min).js'],
				options: {
					banner:
						'/**\n' +
						' * <%= pkg.name %> v<%= pkg.version %>\n' +
						' * https://github.com/louisameline/tooltipster-follower/\n' +
						' * Developed by Louis Ameline\n' +
						' * MIT license\n' +
						' */\n'
				}
			},
			// on the core and bundle min files
			bannerMin: {
				expand: true,
				src: ['dist/js/*.min.js'],
				options: {
					banner: '/* <%= pkg.name %> v<%= pkg.version %> */'
				}
			},
			UMDReturn: {
				expand: true,
				src: ['dist/js/**/!(*.min).js'],
				options: {
					footer: 'return $;'
				}
			}
		},
		copy: {
			dist: {
				files: {
					'dist/js/tooltipster-follower.js': 'src/js/tooltipster-follower.js'
				}
			}
		},
		cssmin: {
			dist: {
				files: [
					{
						cwd: 'src/css',
						dest: 'dist/css',
						expand: true,
						ext: '.min.css',
						extDot: 'last',
						src: ['**/*.css']
					}
				]
			}
		},
		pkg: grunt.file.readJSON('package.json'),
		'string-replace': {
			dist: {
				files: {
					'dist/js/tooltipster.core.js': 'dist/js/tooltipster.core.js'
				},
				options: {
					replacements: [{
						pattern: 'semVer: \'\'',
						replacement: 'semVer: \'<%= pkg.version %>\''
					}]
				}
			}
		},
		uglify: {
			options: {
				compress: true,
				mangle: true,
				preserveComments: false
			},
			dist: {
				files: [{
					expand: true,
					ext: '.min.js',
					extDot: 'last',
					src: ['dist/js/**/!(*.min).js']
				}]
			}
		},
		umd: {
			dist: {
				options: {
					deps: {
						default: [{'tooltipster': '$'}],
						global: [{jQuery: '$'}]
					},
					src: 'dist/js/tooltipster-follower.js'
				}
			}
		}
	});
	
	grunt.registerTask('default', [
		// 'clean',
		'copy',
		'concat:UMDReturn',
		'umd',
		'uglify',
		'concat:banner',
		'concat:bannerMin',
		'cssmin',
		'compress'
	]);
};
