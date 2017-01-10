// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _dev = require('e5r-dev'),
    _path = require('path'),
    _fs = require('fs');

/** @constant {string} */
const CACHE_FOLDER = 'cache';

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
 * Load a version cache information
 * 
 * @param {string} envName - Environment name
 * 
 * @return {object} Or null if file not exists or expired
 */
function loadVersionCacheInfo(envName) {
    const EXPIRES_CONFIG_KEY = 'e5r.cmd.env.cache.versionInfoExpires';

    // In seconds. Default 24h: 60 * 60 * 24 => 86.400
    const DEFAULT_VERSIONINFO_EXPIRES = 86400;

    let cacheDirPath = _path.join(_dev.devHome.root, CACHE_FOLDER, 'env'),
        versionInfoFileName = '{env}-versions.cache.json'.replace('{env}', envName),
        versionInfoFilePath = _path.join(cacheDirPath, versionInfoFileName);

    if (!_dev.directoryExists(cacheDirPath)) {
        _dev.mkdir(cacheDirPath);
    }

    if (!_dev.fileExists(versionInfoFilePath)) {
        return null;
    }

    let versionInfoExpires = _dev.getConfiguration(EXPIRES_CONFIG_KEY, DEFAULT_VERSIONINFO_EXPIRES),
        fileTime = _fs.statSync(versionInfoFilePath).mtime.getTime(),
        now = new Date(),
        limitOldTime = now.getTime() - (versionInfoExpires * 1000);

    if (fileTime < limitOldTime) {
        return null;
    }

    let fileContent = require(versionInfoFilePath);

    return fileContent;
}

/**
 * Save a version cache information data
 * 
 * @param {string} envName - Environment name
 * @param {object} cache - Cache data
 * 
 * @return {object} Saved content
 */
function saveVersionCacheInfo(envName, cache) {
    let cacheDirPath = _path.join(_dev.devHome.root, CACHE_FOLDER, 'env'),
        versionInfoFileName = '{env}-versions.cache.json'.replace('{env}', envName),
        versionInfoFilePath = _path.join(cacheDirPath, versionInfoFileName);

    if (!_dev.directoryExists(cacheDirPath)) {
        _dev.mkdir(cacheDirPath);
    }

    _fs.writeFileSync(versionInfoFilePath, JSON.stringify(cache || {}, null, 4), 'utf8');

    return require(versionInfoFilePath);
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

        if (envLib.name !== env) {
            throw _dev.createError(env.toUpperCase()
                + ' environment with invalid name.');
        }

        if (ALIAS[action]) {
            this.runEnvCommonEngine(envLib, action, devTool, options);
            return;
        }

        this.runEnvEngine(envLib, action, devTool, options);
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
                + engine.name.toUpperCase() + ' does not support the '
                + actionName.toUpperCase() + ' common action.');
        }

        actionFn.bind(this)(engine, devTool, options);
    }

    /**
     * Run the environment action logic on specific engine
     * 
     * @param {object} engine - The environment engine
     * @param {string} actionName - The action name
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    runEnvEngine(engine, actionName, devTool, options) {
        let actionFn = engine[actionName + 'Action'];

        if (typeof (actionFn) != 'function') {
            throw _dev.createError('Environment '
                + engine.name.toUpperCase() + ' does not support the '
                + actionName.toUpperCase() + ' action.');
        }

        let initFn = engine['init'];

        if (typeof (initFn) != 'function') {
            throw _dev.createError('Environment '
                + engine.name.toUpperCase() + ' does not implements init() method.');
        }

        initFn.bind(engine)(devTool, options);
        actionFn.bind(engine)();
    }

    /**
     * Boot `env boot ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    bootCommonAction(engine, devTool, options) {
        throw 'Not implemented [bootCommonAction]';
    }

    /**
     * Install `env install ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    installCommonAction(engine, devTool, options) {
        let versionCacheInfo = loadVersionCacheInfo(engine.name);

        if (!versionCacheInfo) {
            let getVersionsFn = engine['getVersions'];

            if (typeof (getVersionsFn) != 'function') {
                throw _dev.createError('Environment '
                    + engine.name.toUpperCase() + ' does not implements getVersions() method.');
            }

            versionCacheInfo = saveVersionCacheInfo(engine.name, getVersionsFn.bind(engine)());
        }

        throw 'Not implemented [installCommonAction]';
    }

    /**
     * Uninstall `env uninstall ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    uninstallCommonAction(engine, devTool, options) {
        throw 'Not implemented [uninstallCommonAction]';
    }

    /**
     * List `env list ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    listCommonAction(engine, devTool, options) {
        throw 'Not implemented [listCommonAction]';
    }

    /**
     * Select `env select ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    selectCommonAction(engine, devTool, options) {
        throw 'Not implemented [selectCommonAction]';
    }

    /**
     * Test `env test ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    testCommonAction(engine, devTool, options) {
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
