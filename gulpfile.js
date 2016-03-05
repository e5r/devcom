// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

var gulp = require('gulp'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    del = require('del'),
    glob = require('glob');

var E5R_DIR = '.dev';
var E5R_BIN_DIR = path.join(os.homedir(), E5R_DIR, 'bin');
var E5R_LIB_DIR = path.join(os.homedir(), E5R_DIR, 'lib');

gulp.task('clean', function () {
    return del('dist/*');
});

gulp.task('lock-map', function () {
    return glob('**/*.{js,cmd,ps1,sh}', {
        cwd: 'src'
    }, function (globError, files) {
        if (globError) throw globError;

        fs.writeFile('dist/registry.lock.json', JSON.stringify(files, null, 4), {
            encoding: 'utf8'
        }, function (writeError) {
            if (writeError) throw writeError;
            console.log('registry.lock.json writed!');
        });
    });
});

gulp.task('dist', ['clean', 'lock-map'], function () {
    gulp.src('src/**/*')
        .pipe(gulp.dest('dist'));
});

gulp.task('install', [], function () {
    var binFilter = '*.sh';

    if (os.platform() == 'win32') {
        binFilter = '*.{cmd,ps1}';
    }

    gulp.src('src/bin/' + binFilter)
        .pipe(gulp.dest(E5R_BIN_DIR));

    gulp.src('src/lib/**/*')
        .pipe(gulp.dest(E5R_LIB_DIR));
});
