// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

console.log('require(\'dev\') start...');
var dev = require('dev');
console.log('require(\'dev\') finish...:', dev);

/**
 * DevCom `registry` command
 * @class
 * 
 * Manage registry of E5R Tools for Development Team
 */
class Registry extends dev.DevCom {
    
    /**
     * Run the `registry` devcom
     * 
     * @param {DevToolCommandLine} toolInstance - Instance of DevToolCommandLine
     * @param {Array} args - Argument list
     */
    run(toolInstance, args) {
        dev.logger.verbose('********************************************');
        dev.logger.verbose('Running [REGISTRY] DevCom...');
        dev.logger.verbose('toolInstance:', toolInstance);
        dev.logger.verbose('args:', args);
        dev.logger.verbose('********************************************');
    }
}

module.exports = new Registry();