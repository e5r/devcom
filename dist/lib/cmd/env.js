// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _dev = require('e5r-dev');

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
class Environment extends _dev.DevCom {
    
    /**
     * Run the `env` devcom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    run(devTool, options) {
        if ((process.env['DEVCOM_MODE'] || '').toUpperCase() !== 'DEVELOPMENT' && !(devTool instanceof _dev.DevTool)) {
            throw _dev.createError('Env should be performed only via DEV command.');
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
        
        let envLib = _dev.require('lib://env/' + env),
            actionFn = envLib[action];
        
        if (typeof (actionFn) != 'function') {
            throw _dev.createError('Environment '
                + env.toUpperCase() + ' does not support the '
                + action.toUpperCase() + ' action.');
        }
        
        actionFn.bind(envLib)(devTool, options);
    }
    
    /**
     * Show usage information for DevCom
     */
    usage() {
        /** @todo: See `php.js` ensuresVersion() */
        _dev.printf('Usage: dev env <action> <name> [options]');
        _dev.printf();
        _dev.printf('Actions:');

        for (let name in ALIAS) {
            let space = '                 ';
            let printName = name + space.substring(name.length, space.length - 1);
            _dev.printf('  ' + printName, '-', ALIAS[name].doc);
        }

        _dev.printf();
        _dev.printf('Options:');
        _dev.printf('  --version    - Version of environment');
        _dev.printf();
    }
}

module.exports = new Environment();

// Run Env DevCom on developer instance
if (!module.parent && module.filename === __filename) {
    let _devTool = _dev.devToolDefaultInstance,
        _devCom = module.exports,
        _options = _dev.parseOptions(process.argv.slice(2));

    try {
        _devCom.run(_devTool, _options);
    } catch (error) {
        _dev.logger.error(error);
        _devTool.exitCode = error.code || 1;
    }

    _devTool.exit();
}
