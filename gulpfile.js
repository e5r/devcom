// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

var gulp = require('gulp');

gulp.task('dist', function(){
    gulp.src('src/**/*')
        .pipe(gulp.dest('dist'));
});
