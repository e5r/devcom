// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _dev = require('e5r-dev'),
    _path = require('path'),
    _url = require('url'),
    _fs = require('fs'),
    _os = require('os');

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
 * Get a current architecture
 */
function getArchitecture() {
    let arch = _os.arch();

    if (arch === 'ia32') {
        return 'x86';
    }

    return arch;
}

/**
 * Get a current platform
 */
function getPlatform() {
    let platform = _os.platform();

    if (platform === 'darwin') {
        return 'osx';
    }

    if (platform === 'win32') {
        return 'win';
    }

    return platform;
}

/**
 * Make a installation directory path to a version
 * 
 * @param {string} version - Version number
 * @param {string} envName - Name of environment
 */
function makeInstallDirectoryPath(version, envName) {
    let installDirectoryRoot = _path.join(_dev.devHome.root, 'env', envName);

    if (!_dev.directoryExists(installDirectoryRoot)) {
        _dev.mkdir(installDirectoryRoot);
    }

    return _path.join(installDirectoryRoot, version);
}

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

    prepareVersionInfo(cache, envName);

    _fs.writeFileSync(versionInfoFilePath, JSON.stringify(cache || {}, null, 4), 'utf8');

    return require(versionInfoFilePath);
}

/**
 * Remove a object propertie if exists
 * 
 * @param {object[]} objList - The object list
 * @param {string[]} propList - The propertie name list
 */
function removeProperty(objList, propList) {
    if (!Array.isArray(objList) || !Array.isArray(propList)) {
        return;
    }

    objList.map(obj => propList.map(prop => {
        if (Object.getOwnPropertyDescriptor(obj, prop)) {
            delete obj[prop];
        }
    }));
}

/**
 * Prepare a platform and architecture object properties.
 * 
 * @param {object} objList - The object list
 */
function preparePlatformArchitectureObject(objList) {
    if (!Array.isArray(objList)) {
        objList = [objList];
    }

    objList.map(obj => {
        if (!Array.isArray(obj.files)) {
            return;
        }

        if (typeof obj.platforms !== 'object') {
            obj.platforms = {};
        }

        obj.files.map(file => {
            let parts = new RegExp('^(\\w+)-(\\w+).*$', 'g').exec(file);

            if (!Array.isArray(parts)) {
                return;
            }

            let platform = parts[1],
                arch = parts[2];

            if (!Array.isArray(obj.platforms[platform])) {
                obj.platforms[platform] = [];
            }

            if (0 > obj.platforms[platform].indexOf(arch)) {
                obj.platforms[platform].push(arch);
            }
        });
    });
}

/**
 * Short and validate version info
 * 
 * @param {object} versionInfo - Version information
 * @param {string} envName - Name of environment
 */
function prepareVersionInfo(versionInfo, envName) {
    const INVALID_MESSAGE = 'Invalid ' + envName.toUpperCase() + ' version information format.';

    if (versionInfo.environment !== envName) {
        throw _dev.createError(INVALID_MESSAGE);
    }

    if (!Array.isArray(versionInfo.versions)) {
        throw _dev.createError(INVALID_MESSAGE);
    }

    let finalVersions = [];

    // Sort by version number DESC
    // Prepare platform and architecture information
    // Remove unnecessary information. (e.g: files, openssl, npm, etc.)
    versionInfo.versions.sort((a, b) => {
        if (typeof a.version !== 'string' || typeof b.version !== 'string') {
            throw _dev.createError(INVALID_MESSAGE);
        }

        if ((a.files && !Array.isArray(a.files)) || (b.files && !Array.isArray(b.files))) {
            throw _dev.createError(INVALID_MESSAGE);
        }

        // Prepare platform and architecture information
        preparePlatformArchitectureObject([a, b]);

        // Remove unnecessary information. (e.g: files, openssl, npm, etc.)
        removeProperty([a, b], [
            'date',
            'npm',
            'v8',
            'uv',
            'zlib',
            'openssl',
            'modules',
            'lts',
            'files'
        ]);

        // Sort by version number DESC
        let aParts = a.version.split('.').splice(0, 3),
            bParts = b.version.split('.').splice(0, 3);

        aParts = aParts.concat(new Array(1 + 3 - aParts.length)
            .join('0').split(''))
            .map((v) => parseInt(v || '0', 10));

        bParts = bParts.concat(new Array(1 + 3 - bParts.length)
            .join('0')
            .split('')).map((v) => parseInt(v || '0', 10));

        let diff = 0, idx = 0;

        do {
            diff = bParts[idx] - aParts[idx];
            idx++;
        } while (diff === 0 && idx < 3);

        return diff;
    });

    let validVersions = [];

    versionInfo.versions.map(version => {
        if (Object.getOwnPropertyNames(version.platforms).length > 0) {
            validVersions.push(version);
        }
    });

    versionInfo.versions = validVersions;
}

/**
 * Make a semver valid version string
 * 
 * @param {string} requiredVersion - Partial version number
 * @param {object} versionInfo - All version available
 * @param {object} options - Options
 * @param {object} engine - The environment engine
 */
function getFullVersionNumber(requiredVersion, versionInfo, options, engine) {
    if (!Array.isArray(versionInfo.versions) || versionInfo.versions.length < 1) {
        return null;
    }

    requiredVersion = requiredVersion === 'latest' ? null : requiredVersion;

    let resultVersion = null,
        requiredVersionParts = requiredVersion === null
            ? []
            : requiredVersion
                .split('.')
                .map(v => parseInt(v, 10)),
        platform = getPlatform(),
        arch = options.arch || getArchitecture(),
        versionIsValidFn = engine['versionIsValid'];

    if (typeof (versionIsValidFn) != 'function') {
        throw _dev.createError('Environment '
            + engine.name.toUpperCase() + ' does not implements versionIsValid() method.');
    }

    for (let idx = 0; idx < versionInfo.versions.length; idx++) {
        let version = versionInfo.versions[idx],
            versionParts = version.version.split('.').map(v => parseInt(v, 10)),
            versionPlatform = version.platforms[platform];

        /*
         * @note: 1. required version > version THEN required version not found
         *        2. version > required version THEN skip to next
         */
        let notFound = false,
            skip = false;

        requiredVersionParts.map((v, i) => {
            if (notFound || skip) {
                return;
            }
            if (v > versionParts[i]) {
                notFound = true;
                return;
            }
            if (versionParts[i] > v) {
                skip = true;
                return;
            }
        });

        if (notFound) {
            break;
        }

        if (skip) {
            continue;
        }

        if (Array.isArray(versionPlatform) &&
            versionPlatform.indexOf(arch) >= 0 &&
            versionIsValidFn.bind(engine)(version)) {

            resultVersion = version.version;
            break;
        }
    }

    if (resultVersion) {
        let getFullVersionNumberFn = engine['getFullVersionNumber'];

        if (typeof (getFullVersionNumberFn) != 'function') {
            throw _dev.createError('Environment '
                + engine.name.toUpperCase() + ' does not implements getFullVersionNumber() method.');
        }

        return getFullVersionNumberFn.bind(engine)(resultVersion);
    }

    return null;
}

/**
 * Split filename into name and extensio
 * 
 * @param {string} fileName - The file name
 * 
 * @return {string[]} Array with 2 itens; 0 is a name and 1 is a extension or null
 */
function splitFileNameExtension(fileName) {
    let reg = new Array(2),
        knowExtensions = ['tar.xz', 'tar.gz'],
        found = false;

    knowExtensions.map(ext => {
        if (found) return;

        let indexOf = fileName.lastIndexOf('.' + ext);

        if (indexOf > 0) {
            reg[0] = fileName.substring(0, indexOf);
            reg[1] = fileName.substring(indexOf + 1);
            found = true;
        }
    });

    if (found) return reg;

    let indexOf = fileName.lastIndexOf('.');

    if (indexOf > 0) {
        reg[0] = fileName.substring(0, indexOf);
        reg[1] = fileName.substring(indexOf + 1);
    } else {
        reg[0] = fileName;
    }

    return reg;
}

/**
 * Install a new version of environment
 * 
 * @param {object} engine - The environment engine
 * @param {string} version - Version number
 * @param {string} installPath - Path of installation
 */
function installNewVersion(engine, version, installPath) {
    let tempDir = _dev.generateTempDir(),
        extractedDir = _path.join(tempDir, 'extracted');

    try {
        let getDownloadFileListFn = engine['getDownloadFileList'];

        if (typeof (getDownloadFileListFn) != 'function') {
            throw _dev.createError('Environment '
                + engine.name.toUpperCase() + ' does not implements getDownloadFileList() method.');
        }

        let downloadFileList = getDownloadFileListFn.bind(engine)(version);

        if (!Array.isArray(downloadFileList) || downloadFileList.length < 1) {
            throw _dev.createError('Environment '
                + engine.name.toUpperCase()
                + '.getDownloadFileList() returned an invalid download file list.');
        }

        // Creating temporary directory
        _dev.mkdir(tempDir);
        _dev.mkdir(extractedDir);

        // Download files to temporary directory
        _dev.printf('Downloading files...');

        let downloadedFiles = [];

        for (let fileIdx = 0; fileIdx < downloadFileList.length; fileIdx++) {
            let fileUrl = downloadFileList[fileIdx],
                fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1),
                filePath = _path.join(tempDir, fileName);

            _dev.printf('  ->', fileName);
            _dev.downloadSync(fileUrl, filePath);
            downloadedFiles.push(fileName);
        }

        // Extract files
        _dev.printf('Extracting files...');

        for (let fileIdx = 0; fileIdx < downloadedFiles.length; fileIdx++) {
            let fileName = downloadedFiles[fileIdx],
                filePath = _path.join(tempDir, fileName),
                fileNameInfo = splitFileNameExtension(fileName),
                fileExtractDir = _path.join(extractedDir, fileNameInfo[0]);

            if (fileNameInfo[1] && ['zip', 'tar.gz'].indexOf(fileNameInfo[1])) {
                _dev.printf('  ->', fileName);
                _dev.extractFile(filePath, fileExtractDir);
            }
        }

        let installFilesFn = engine['installFiles'];

        if (typeof (installFilesFn) != 'function') {
            throw _dev.createError('Environment '
                + engine.name.toUpperCase() + ' does not implements installFiles() method.');
        }

        _dev.printf('Installing files...');

        // Creating installation directory
        _dev.mkdir(installPath);

        installFilesFn.bind(engine)(tempDir, extractedDir, installPath, version);

        _dev.printf('Cleaning temporary files...');

        // Cleaning temporary directory
        if (_dev.directoryExists(tempDir)) {
            _dev.rmdir(tempDir);
        }
    } catch (error) {
        // Cleaning directories

        if (_dev.directoryExists(installPath)) {
            _dev.rmdir(installPath);
        }

        if (_dev.directoryExists(tempDir)) {
            _dev.rmdir(tempDir);
        }

        throw error;
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

        let envEngine;

        if (options.devmode && (process.env['DEVCOM_MODE'] || '').toUpperCase() === 'DEVELOPMENT') {
            let devModulePath = _path.join(process.cwd(), './src/lib/env/' + env);
            envEngine = require(devModulePath);
        } else {
            envEngine = _dev.require('lib://env/' + env);
        }

        if (envEngine.name !== env) {
            throw _dev.createError(env.toUpperCase()
                + ' environment with invalid name.');
        }

        let initFn = envEngine['init'];

        if (typeof (initFn) != 'function') {
            throw _dev.createError('Environment '
                + env.toUpperCase() + ' does not implements init() method.');
        }

        initFn.bind(envEngine)(devTool, options);

        if (ALIAS[action]) {
            this.runEnvCommonEngine(envEngine, action, devTool, options);
            return;
        }

        this.runEnvEngine(envEngine, action, devTool, options);
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
        // Load version info from cache
        let versionCacheInfo = loadVersionCacheInfo(engine.name);

        if (!versionCacheInfo) {
            let getVersionsFn = engine['getVersions'];

            if (typeof (getVersionsFn) != 'function') {
                throw _dev.createError('Environment '
                    + engine.name.toUpperCase()
                    + ' does not implements getVersions() method.');
            }

            versionCacheInfo = saveVersionCacheInfo(engine.name, getVersionsFn.bind(engine)());
        }

        if (!versionCacheInfo) {
            throw _dev.createError('Error on retrieve '
                + engine.name.toUpperCase() + ' versions information.');
        }

        // Find version info
        let version = options.args[0] || 'latest',
            fullVersion = getFullVersionNumber(version, versionCacheInfo, options, engine);

        if (!fullVersion) {
            throw _dev.createError(engine.name.toUpperCase() + ' version "'
                + version + '" not found.');
        }

        let installDirectoryPath = makeInstallDirectoryPath(fullVersion, engine.name);

        // Clearing an incomplete installation directory if necessary
        if (!_dev.directoryIsEmpty(installDirectoryPath)) {
            let successfullyInstalledFn = engine['successfullyInstalled'];

            if (typeof (successfullyInstalledFn) != 'function') {
                throw _dev.createError('Environment '
                    + engine.name.toUpperCase()
                    + ' does not implements successfullyInstalled() method.');
            }

            if (!successfullyInstalledFn.bind(engine)(fullVersion, installDirectoryPath)) {
                _dev.rmdir(installDirectoryPath);
            }
        }

        if (_dev.directoryExists(installDirectoryPath)) {
            if (!_dev.directoryIsEmpty(installDirectoryPath)) {
                _dev.printf(engine.name.toUpperCase(),
                    'version "' + fullVersion + '" already installed.');
                return;
            }

            _dev.rmdir(installDirectoryPath);
        }

        installNewVersion(engine, fullVersion, installDirectoryPath);

        _dev.printf(engine.name.toUpperCase(),
            'version "' + fullVersion + '" installed successfully!');
    }



    /**
     * Uninstall `env uninstall ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    uninstallCommonAction(engine, devTool, options) {
        throw _dev.createError('Not implemented [uninstallCommonAction]');
    }

    /**
     * List `env list ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    listCommonAction(engine, devTool, options) {
        throw _dev.createError('Not implemented [listCommonAction]');
    }

    /**
     * Select `env select ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    selectCommonAction(engine, devTool, options) {
        throw _dev.createError('Not implemented [selectCommonAction]');
    }

    /**
     * Test `env test ...` common action
     * 
     * @param {object} engine - The environment engine
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    testCommonAction(engine, devTool, options) {
        throw _dev.createError('Not implemented [testCommonAction]');
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
