// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _dev = require('e5r-dev'),
    _os = require('os');

/**
 * @todo: Implements no supported platforms.
 * 
 * 'win32', 'freebsd', 'linux', 'sunos'
 */

/** @constant {array} */
const SUPPORTED_PLATFORMS = [
    'darwin'
];

/**
 * Management NODE Environment
 * @class
 */
class NodeEnvironment {
    constructor() {
        let platform = _os.platform();

        if (0 > SUPPORTED_PLATFORMS.indexOf(platform)) {
            throw _dev.createError('Environment NODE does not support the ' + platform.toUpperCase() + ' platform.');
        }
    }
}

module.exports = new NodeEnvironment();
