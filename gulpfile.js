// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

var gulp = require('gulp'),
    del = require('del');

gulp.task('clean', function () {
    return del('dist/*');
});

gulp.task('dist', ['clean'], function () {
    gulp.src('src/**/*')
        .pipe(gulp.dest('dist'));
});
