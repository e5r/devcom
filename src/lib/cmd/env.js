// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _dev = require('e5r-dev'),
    _path = require('path');

/** @constant {object} */
const ALIAS = {
    'boot': {
        'alias': ['b', 'bt'],
        'doc': 'Initialize project environment'
    },
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
    'select': {
        'alias': ['s', 'sl'],
        'doc': 'Select a version to use in shell'
    },
    'test': {
        'alias': ['t', 'ts'],
        'doc': 'Checks if the version is installed'
    }
};

/**
 * Ensures that 'action' is an expected name.
 * 
 * @param {string} action - Name or alias of action
 */
function ensureAction(action) {

    let actionName = action;

    for (let name in ALIAS) {
        if (name === action) break;

        if (-1 < ALIAS[name].alias.indexOf(action)) {
            actionName = name;
            break;
        }
    }

    return _dev.makeCamelCaseName(actionName);
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

        let envLib;

        if (options.devmode && (process.env['DEVCOM_MODE'] || '').toUpperCase() === 'DEVELOPMENT') {
            let devModulePath = _path.join(process.cwd(), './src/lib/env/' + env);
            envLib = require(devModulePath);
        } else {
            envLib = _dev.require('lib://env/' + env);
        }

        if (ALIAS[action]) {
            this.runEnvCommonEngine(envLib, action, devTool, options);
            return;
        }

        let actionFn = envLib[action + 'Action'];

        if (typeof (actionFn) != 'function') {
            throw _dev.createError('Environment '
                + env.toUpperCase() + ' does not support the '
                + action.toUpperCase() + ' action.');
        }

        this.runEnvEngine(envLib, actionFn, devTool, options);
    }

    /**
     * Run the common environment action logic
     * 
     * @param {object} engine - The environment engine
     * @param {string} actionName - The action name
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    runEnvCommonEngine(engine, actionName, devTool, options) {
        let actionFn = this[actionName + 'CommonAction'];

        if (typeof (actionFn) != 'function') {
            throw _dev.createError('Environment '
                + env.toUpperCase() + ' does not support the '
                + action.toUpperCase() + ' common action.');
        }

        actionFn.bind(this)(devTool, options);
    }

    /**
     * Run the environment action logic on specific engine
     * 
     * @param {object} engine - The environment engine
     * @param {function} fn - The engine function
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    runEnvEngine(engine, fn, devTool, options) {
        fn.bind(engine)(devTool, options);
    }

    /**
     * Boot `env boot ...` common action
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    bootCommonAction(devTool, options) {
        throw 'Not implemented [bootCommonAction]';
    }

    /**
     * Install `env install ...` common action
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    installCommonAction(devTool, options) {
        throw 'Not implemented [installCommonAction]';
    }

    /**
     * Uninstall `env uninstall ...` common action
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    uninstallCommonAction(devTool, options) {
        throw 'Not implemented [uninstallCommonAction]';
    }

    /**
     * List `env list ...` common action
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    listCommonAction(devTool, options) {
        throw 'Not implemented [listCommonAction]';
    }

    /**
     * Select `env select ...` common action
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    selectCommonAction(devTool, options) {
        throw 'Not implemented [selectCommonAction]';
    }

    /**
     * Test `env test ...` common action
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    testCommonAction(devTool, options) {
        throw 'Not implemented [testCommonAction]';
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
        _options = _devTool._options;

    try {
        _devCom.run(_devTool, _options);
    } catch (error) {
        _dev.logger.error(error);
        _devTool.exitCode = error.code || 1;
    }

    _devTool.exit();
}
