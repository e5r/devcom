// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _fs = require('fs'),
    _path = require('path'),
    _url = require('url'),
    _os = require('os'),
    _dev = require('e5r-dev');

/** @constant {string} */
const UNDEFINED = 'undefined';

/** @constant {string} */
const REGISTRY_FILE = 'registry.json';

/** @constant {string} */
const REGISTRY_LOCKFILE = 'registry.lock.json';

/** @constant {string} */
const MAGIC_REGISTRY_LOCKNAME = '{name}';

/** @constant {string} */
const REGISTRY_LOCAL_LOCKFILE = 'registry.' + MAGIC_REGISTRY_LOCKNAME + '.lock.json';

/**
 * Write the registry file
 * 
 * @param {object} registry - Data to write `registry.json` file
 */
function writeRegistry(registry) {
    if (typeof registry !== 'object') {
        throw _dev.createError('Invalid content type of registry.');
    }

    let registryPath = _path.resolve(_dev.devHome.root, REGISTRY_FILE),
        registryContent = JSON.stringify(registry, null, 4);

    _fs.writeFileSync(registryPath, registryContent, 'utf8');
}

/**
 * Read the lock file registry
 * 
 * @param {string} entryName - Name of entry in `registry.json`
 * @return {object} Content of `registry.{ENTRY}.lock.json` file
 */
function readLockFileRegistry(entryName) {
    if (typeof entryName !== 'string') {
        throw _dev.createError('Invalid entryName. Must be an string.');
    }

    let lockFileName = REGISTRY_LOCAL_LOCKFILE.replace(MAGIC_REGISTRY_LOCKNAME, entryName),
        lockFilePath = _path.resolve(_dev.devHome.root, lockFileName);

    if (!_fs.existsSync(lockFilePath)) {
        throw _dev.createError('Lock file registry "' + lockFileName + '" not found!');
    }

    let lockRegistry = require(lockFilePath);

    if (!Array.isArray(lockRegistry)) {
        throw _dev.createError('Invalid lock content. Must be an array of file paths.');
    }

    return lockRegistry;
}

/**
 * Read the registry lock file and count map file by type
 * 
 * @param {string} entryName - Name of entry in `registry.json`
 * @return {object} Summary of counts
 */
function countLockFiles(entryName) {
    let counts = { bin: 0, doc: 0, lib: 0, cmd: 0 };

    readLockFileRegistry(entryName).map((value) => {
        if (value.startsWith('lib/cmd/')) {
            return ++counts.cmd;
        }

        if (value.startsWith('lib/')) {
            return ++counts.lib;
        }

        if (value.startsWith('doc/')) {
            return ++counts.doc;
        }

        if (value.startsWith('bin/')) {
            return ++counts.bin;
        }
    });

    return counts;
}

/**
 * Return only binary lock files
 * 
 * @param {array} lockFiles - List of lock files
 * @return {array}
 */
function getBinaryLockFiles(lockFiles) {
    if (!Array.isArray(lockFiles)) {
        throw _dev.createError('Invalid lockFiles. Must be an array.');
    }

    let buffer = [],
        binExt = {
            "darwin": ['.sh'],
            "freebsd": [],
            "linux": ['.sh'],
            "sunos": [],
            "win32": ['.cmd', '.bat', '.ps1']
        }[_os.platform()];

    lockFiles.map((path) => {
        let p = _path.parse(path);
        if (p.dir === 'bin' && -1 < binExt.indexOf(p.ext)) {
            buffer.push(path);
        }
    });

    return buffer;
}

/**
 * DevCom `registry` command
 * @class
 * 
 * Manage registry of E5R Tools for Development Team
 */
class Registry extends _dev.DevCom {

    /**
     * Run the `registry` devcom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    run(devTool, options) {
        if ((process.env['DEVCOM_MODE'] || '').toUpperCase() !== 'DEVELOPMENT' && !(devTool instanceof _dev.DevTool)) {
            throw _dev.createError('Registry should be performed only via DEV command.');
        }

        if (!options || !Array.isArray(options.args) || 1 > options.args.length) {
            this.usage();
            return;
        }

        let actionName = _dev.makeCamelCaseName(options.args.shift()),
            actionFn = this[actionName + 'Action'];

        if (typeof actionFn !== 'function') {
            throw _dev.createError('Unknown action "' + actionName + '" for registry DevCom.');
        }

        actionFn(options);
    }

    /**
     * Show usage information for DevCom
     */
    usage() {
        _dev.printf('Usage: dev registry [action] [options]');
        _dev.printf();
        _dev.printf('  Actions:');
        _dev.printf('    list         - List all registry entries');
        _dev.printf('    show         - Show details of a registry entry');
        _dev.printf('    remove       - Remove a registry entry');
        _dev.printf('    add          - Add new entries for registry');
        _dev.printf('    get-binaries - Download and install binaries');
        _dev.printf('    lock-update  - Update lock files');
        _dev.printf('    lock-clean   - Remove lock files');
        _dev.printf();
        _dev.printf('  Options:');
        _dev.printf('    --scope      - Entry name in registry.json');
    }

    /**
     * List all registry entries
     * 
     * @param {object} options - Command options
     */
    listAction(options) {
        let registry = _dev.getRegistry(),
            entries = [];

        for (let property in registry) {
            entries.push(property);
        }

        if (1 > entries.length) {
            _dev.printf('Registry is empty!');
            _dev.printf('Usage: dev registry add [URL] -> to add entries for registry');
            return;
        }

        _dev.printf('Registry entries:');
        _dev.printf('  + ' + entries.join(_os.EOL + '  + '));
    }

    /**
     * Show details of a registry entry
     * 
     * @param {object} options - Command options
     */
    showAction(options) {
        if (1 > options.args.length) {
            throw _dev.createError('Registry show usage: dev registry show [entry]');
        }

        let entryName = options.args[0],
            registry = _dev.getRegistry(),
            entry;

        for (let e in registry) {
            if (e === entryName) {
                entry = registry[e];
                break;
            }
        }

        if (!entry) {
            throw _dev.createError('Registry entry "' + entryName + '" not found.');
        }

        let found = false,
            registryType = (entry.type || '').toLowerCase(),
            urlLockFile = _dev.normalizeUrl(_dev.makeRegistryUrl(entry)).concat(REGISTRY_LOCKFILE),
            lockFileName = REGISTRY_LOCAL_LOCKFILE.replace(MAGIC_REGISTRY_LOCKNAME, entryName),
            pathLockFile = _path.resolve(_dev.devHome.root, lockFileName);

        // GitHub entry
        if (registryType === 'github') {
            let urlOwner = 'https://github.com/{owner}'.replace('{owner}', entry.owner),
                urlProject = '{ownerUrl}/{repository}'.replace('{ownerUrl}', urlOwner).replace('{repository}', entry.repository);

            _dev.printf('GitHub Registry [' + entryName + ']');
            _dev.printf('  Owner profile:', urlOwner);
            _dev.printf('  Project:', urlProject);

            found = true;
        }

        // URL entry
        if (registryType === 'url') {
            let url = _dev.makeRegistryUrl(entry);

            _dev.printf('URL Registry [' + entryName + ']');
            _dev.printf('  Registry URL:', url);

            found = true;
        }

        if (!found) {
            throw _dev.createError('Invalid registry entry: ' + JSON.stringify(entry, null, 2));
        }

        _dev.printf('  Lock file:', urlLockFile);
        _dev.printf('  Local lock file:', pathLockFile);

        if (_fs.existsSync(pathLockFile)) {
            let counts = countLockFiles(entryName);

            _dev.printf('  Lock file counts:');
            _dev.printf('    - Binary:        %d', counts.bin);
            _dev.printf('    - Documentation: %d', counts.doc);
            _dev.printf('    - Library:       %d', counts.lib);
            _dev.printf('    - DevCom:        %d', counts.cmd);
        } else {
            _dev.printf('  Lock file counts: *** NOT PRESENT ***');
        }
    }

    /**
     * Remove an entry of registry
     * 
     * @param {object} options - Command options
     */
    removeAction(options) {
        if (1 > options.args.length) {
            throw _dev.createError('Registry remove usage: dev registry remove [entry]');
        }

        let entryName = options.args[0],
            registry = _dev.getRegistry(),
            found = false;

        for (let e in registry) {
            if (e === entryName) {
                delete registry[e];
                found = true;
                break;
            }
        }

        if (!found) {
            throw _dev.createError('Registry entry "' + entryName + '" not found.');
        }

        writeRegistry(registry);

        _dev.printf('Registry entry "' + entryName + '" successfully removed.');
    }

    /**
     * Add a new entries for `registry.json`.
     * Replace a exist entries.
     * 
     * @param {object} options - Command options
     */
    addAction(options) {
        if (1 > options.args.length) {
            throw _dev.createError('Registry add usage: dev registry add [url]');
        }

        let url = _url.parse(options.args[0]),
            urlValidProtocol = -1 < ['http', 'https'].indexOf(url.protocol.split(':')[0]),
            urlValidPath = url.path.endsWith(REGISTRY_FILE);

        if (!url.host || !urlValidProtocol || !urlValidPath) {
            throw _dev.createError('Invalid URL value: ' + options.args[0]);
        }

        let _crypto = require('crypto'),
            tmpFilePath = _path.resolve(_os.tmpdir(), 'tmp-registry-' + _crypto.randomBytes(10).readUInt32LE(0) + '.json');

        if (_fs.existsSync(tmpFilePath)) {
            _fs.unlinkSync(tmpFilePath);
        }

        _dev.downloadSync(url.href, tmpFilePath);

        if (!_fs.existsSync(tmpFilePath)) {
            throw _dev.createError('Registry "' + url.href + '" not found.');
        }

        let registry = _dev.getRegistry(),
            registryUpdate = require(tmpFilePath);

        if (typeof registryUpdate !== 'object') {
            throw _dev.createError('Invalid content type of web registry.');
        }

        for (let p in registryUpdate) {
            let entry = registryUpdate[p];

            if (typeof entry !== 'object') {
                throw _dev.createError('Invalid content type of web registry.');
            }

            registry[p] = entry;
        }

        _fs.unlinkSync(tmpFilePath);

        writeRegistry(registry);

        _dev.printf('Registry entries updated!');
    }

    /**
     * Download and install binaries
     * 
     * @param {object} options - Command options
     */
    getBinariesAction(options) {
        let registry = _dev.getRegistry(),
            scopes = Object.getOwnPropertyNames(registry),
            binaryBuffer = [];

        for (let s in scopes) {
            let scopeName = scopes[s],
                scope = registry[scopeName];

            if (!options.scope || options.scope === scopeName) {
                let lock = _dev.getRegistryLock(scopeName),
                    lockBinary = getBinaryLockFiles(lock),
                    scopeUrl = _dev.makeRegistryUrl(scope);

                lockBinary.map((sufix) => {
                    let url = _dev.normalizeUrl(scopeUrl) + sufix;
                    binaryBuffer.push({ url: url, path: sufix });
                });

                continue;
            }

            _dev.logger.debug('Skeep scope "' + scope + '"...');
        }

        if (1 > binaryBuffer.length) {
            _dev.printf('No binary found!');
            return;
        }

        binaryBuffer.map((binary) => {
            if (binary.path.startsWith('bin/')) {
                binary.path = binary.path.substring('/bin'.length);
            }

            binary.path = _path.resolve(_dev.devHome.bin, binary.path);

            // Convert `file.sh` to `file`
            let extIdx = binary.path.lastIndexOf('.sh');
            if (-1 < extIdx) binary.path = binary.path.slice(0, extIdx);

            _dev.downloadSync(binary.url, binary.path);

            // Set executable flag for *nix
            if (_os.platform() !== 'win32') _fs.chmodSync(binary.path, '750');
        });

        _dev.printf('%d binary successfully installed.', binaryBuffer.length);
    }

    /**
     * Update/replace all lock files
     *
     * @param {object} options - Command options 
     */
    lockUpdateAction(options) {
        for (let property in _dev.getRegistry()) {
            let registry = _dev.getRegistryLock(property, true, { quiet: true }),
                path = _dev.makeRegistryLockFilePath(property);

            _dev.printf('*', _path.basename(path), '[UPDATED]');

            if (!!options.v || typeof options.verbose !== UNDEFINED) {
                _dev.printf(JSON.stringify(registry, null, 2));
            }
        }
    }

    /**
     * Remove all lock files
     * 
     * @param {object} options - Command options
     */
    lockCleanAction(options) {
        for (let property in _dev.getRegistry()) {
            let registry = _dev.getRegistryLock(property, true, { quiet: true }),
                path = _dev.makeRegistryLockFilePath(property);

            // Removing lock file
            if (_dev.fileExists(path)) {
                _fs.unlinkSync(path);
            }
            _dev.printf('*', _path.basename(path), '[REMOVED]');

            // Removing content files
            for (let r in registry) {
                let reg = registry[r],
                    filePath = _path.join(_dev.devHome.root, reg);

                if (reg.startsWith('bin/')) continue;

                if (_dev.fileExists(filePath)) {
                    _fs.unlinkSync(filePath);
                    if (!!options.v || typeof options.verbose !== UNDEFINED) {
                        _dev.printf('-', registry[r], '[REMOVED]');
                    }
                }

            }
        }
    }
}

module.exports = new Registry();

// Run Registry DevCom on developer instance
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
