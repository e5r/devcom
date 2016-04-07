// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let dev = require('e5r-dev');

/** @constant {object} */
const ALIAS = {
    'install': {
        'alias': ['i', 'in'],
        'doc': 'Install a new version'
    },
    'uninstall': {
        'alias': ['u', 'un'],
        'doc': 'Uninstall a version'
    },
    'list': {
        'alias': ['l', 'li'],
        'doc': 'List all installed versions'
    },
    'activate': {
        'alias': ['a', 'ac'],
        'doc': 'Activate a version to use in shell'
    },
    'deactivate': {
        'alias': ['d', 'de'],
        'doc': 'Deactivate a version'
    }
};

/**
 * Ensures that 'action' is an expected name.
 * 
 * @param {string} action - Name or alias of action
 */
function ensureAction(action) {
    for (let name in ALIAS) {
        if (name === action) return action;
        if (-1 < ALIAS[name].alias.indexOf(action)) return name;
    }
}

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

        if (!options || !Array.isArray(options.args) || 2 > options.args.length) {
            this.usage();
            return;
        }

        let action = ensureAction(options.args.shift()),
            env = options.args.shift();
            
        if (!action) {
            this.usage();
            return;
        }
        
        let envLib = dev.require('lib://env/' + env),
            actionFn = envLib[action];
        
        if (typeof (actionFn) != 'function') {
            throw dev.createError('Environment '
                + env.toUpperCase() + ' does not support the '
                + action.toUpperCase() + ' action.');
        }
        
        envLib.devTool = devTool;
        actionFn.bind(envLib)(options);
    }
    
    /**
     * Show usage information for DevCom
     */
    usage() {
        dev.printf('Usage: dev env <action> <name> [options]');
        dev.printf();
        dev.printf('Actions:');

        for (let name in ALIAS) {
            let space = '                 ';
            let printName = name + space.substring(name.length, space.length - 1);
            dev.printf('  ' + printName, '-', ALIAS[name].doc);
        }

        dev.printf();
        dev.printf('Options:');
        dev.printf('  -v, --version    - Version of environment');
        dev.printf();
    }
}

module.exports = new Environment();
