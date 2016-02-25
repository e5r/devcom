// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let dev = require('e5r-dev');

/**
 * DevCom `env` command
 * @class
 * 
 * Manage coder environment for E5R Tools for Development Team
 */
class Environment extends dev.DevCom {
    
    /**
     * Run the `env` devcom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    run(devTool, options) {
        if ((process.env['DEVCOM_MODE'] || '').toUpperCase() !== 'DEVELOPMENT' && !(devTool instanceof dev.DevTool)) {
            throw dev.createError('Env should be performed only via DEV command.');
        }

        if (!options || !Array.isArray(options.args) || 1 > options.args.length) {
            this.usage();
            return;
        }

        let environment = options.args.shift();

        dev.printf('You perform environment', environment);
    }
    
    /**
     * Show usage information for DevCom
     */
    usage() {
        dev.printf('Usage: dev env <name> <action> [options]');
        dev.printf();
        dev.printf('  Options:');
        dev.printf('    -v, --version    - Version of environment');
    }
}

module.exports = new Environment();
