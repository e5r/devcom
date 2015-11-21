// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

var gulp = require('gulp'),
    fs = require('fs'),
    del = require('del'),
    glob = require('glob');

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
