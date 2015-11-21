// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

let _fs = require('fs'),
    _path = require('path'),
    _url = require('url'),
    _os = require('os'),
    dev = require('e5r-dev');

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
        throw dev.createError('Invalid content type of registry.');
    }

    let registryPath = _path.resolve(dev.devHome.root, REGISTRY_FILE),
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
        throw dev.createError('Invalid entryName. Must be an string.');
    }

    let lockFileName = REGISTRY_LOCAL_LOCKFILE.replace(MAGIC_REGISTRY_LOCKNAME, entryName),
        lockFilePath = _path.resolve(dev.devHome.root, lockFileName);

    if (!_fs.existsSync(lockFilePath)) {
        throw dev.createError('Lock file registry "' + lockFileName + '" not found!');
    }

    let lockRegistry = require(lockFilePath);

    if (!Array.isArray(lockRegistry)) {
        throw dev.createError('Invalid lock content. Must be an array of file paths.');
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
        throw dev.createError('Invalid lockFiles. Must be an array.');
    }

    let buffer = [],
        binExt = {
            "darwin": [],
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
class Registry extends dev.DevCom {
    
    /**
     * Run the `registry` devcom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    run(devTool, options) {
        if ((process.env['DEVCOM_MODE'] || '').toUpperCase() !== 'DEVELOPMENT' && !(devTool instanceof dev.DevTool)) {
            throw dev.createError('Registry should be performed only via DEV command.');
        }

        if (!options || !Array.isArray(options.args) || 1 > options.args.length) {
            this.usage();
            return;
        }

        let actionName = dev.makeCamelCaseName(options.args.shift()),
            actionFn = this[actionName + 'Action'];

        if (typeof actionFn !== 'function') {
            throw dev.createError('Unknown action "' + actionName + '" for registry DevCom.');
        }

        actionFn(options);
    }
    
    /**
     * Show usage information for DevCom
     */
    usage() {
        dev.printf('Usage: dev registry [action] [options]');
        dev.printf();
        dev.printf('  Actions:');
        dev.printf('    list         - List all registry entries');
        dev.printf('    show         - Show details of a registry entry');
        dev.printf('    remove       - Remove a registry entry');
        dev.printf('    add          - Add new entries for registry');
        dev.printf('    get-binaries - Download and install binaries');
        dev.printf();
        dev.printf('  Options:');
        dev.printf('    --scope      - Entry name in registry.json');
    }
    
    /**
     * List all registry entries
     * 
     * @param {object} options - Command options
     */
    listAction(options) {
        let registry = dev.getRegistry(),
            entries = [];

        for (let property in registry) {
            entries.push(property);
        }

        if (1 > entries.length) {
            dev.printf('Registry is empty!');
            dev.printf('Usage: dev registry add [URL] -> to add entries for registry');
            return;
        }

        dev.printf('Registry entries:');
        dev.printf('  + ' + entries.join(_os.EOL + '  + '));
    }
    
    /**
     * Show details of a registry entry
     * 
     * @param {object} options - Command options
     */
    showAction(options) {
        if (1 > options.args.length) {
            throw dev.createError('Registry show usage: dev registry show [entry]');
        }

        let entryName = options.args[0],
            registry = dev.getRegistry(),
            entry;

        for (let e in registry) {
            if (e === entryName) {
                entry = registry[e];
                break;
            }
        }

        if (!entry) {
            throw dev.createError('Registry entry "' + entryName + '" not found.');
        }

        let found = false,
            registryType = (entry.type || '').toLowerCase(),
            urlLockFile = dev.normalizeUrl(dev.makeRegistryUrl(entry)).concat(REGISTRY_LOCKFILE),
            lockFileName = REGISTRY_LOCAL_LOCKFILE.replace(MAGIC_REGISTRY_LOCKNAME, entryName),
            pathLockFile = _path.resolve(dev.devHome.root, lockFileName);
         
        // GitHub entry
        if (registryType === 'github') {
            let urlOwner = 'https://github.com/{owner}'.replace('{owner}', entry.owner),
                urlProject = '{ownerUrl}/{repository}'.replace('{ownerUrl}', urlOwner).replace('{repository}', entry.repository);

            dev.printf('GitHub Registry [' + entryName + ']');
            dev.printf('  Owner profile:', urlOwner);
            dev.printf('  Project:', urlProject);

            found = true;
        }
        
        // URL entry
        if (registryType === 'url') {
            let url = dev.makeRegistryUrl(entry);

            dev.printf('URL Registry [' + entryName + ']');
            dev.printf('  Registry URL:', url);

            found = true;
        }

        if (!found) {
            throw dev.createError('Invalid registry entry: ' + JSON.stringify(entry, null, 2));
        }

        dev.printf('  Lock file:', urlLockFile);
        dev.printf('  Local lock file:', pathLockFile);

        if (_fs.existsSync(pathLockFile)) {
            let counts = countLockFiles(entryName);

            dev.printf('  Lock file counts:');
            dev.printf('    - Binary:        %d', counts.bin);
            dev.printf('    - Documentation: %d', counts.doc);
            dev.printf('    - Library:       %d', counts.lib);
            dev.printf('    - DevCom:        %d', counts.cmd);
        } else {
            dev.printf('  Lock file counts: *** NOT PRESENT ***');
        }
    }
    
    /**
     * Remove an entry of registry
     * 
     * @param {object} options - Command options
     */
    removeAction(options) {
        if (1 > options.args.length) {
            throw dev.createError('Registry remove usage: dev registry remove [entry]');
        }

        let entryName = options.args[0],
            registry = dev.getRegistry(),
            found = false;

        for (let e in registry) {
            if (e === entryName) {
                delete registry[e];
                found = true;
                break;
            }
        }

        if (!found) {
            throw dev.createError('Registry entry "' + entryName + '" not found.');
        }

        writeRegistry(registry);

        dev.printf('Registry entry "' + entryName + '" successfully removed.');
    }
    
    /**
     * Add a new entries for `registry.json`.
     * Replace a exist entries.
     * 
     * @param {object} options - Command options
     */
    addAction(options) {
        if (1 > options.args.length) {
            throw dev.createError('Registry add usage: dev registry add [url]');
        }

        let url = _url.parse(options.args[0]),
            urlValidProtocol = -1 < ['http', 'https'].indexOf(url.protocol.split(':')[0]),
            urlValidPath = url.path.endsWith(REGISTRY_FILE);

        if (!url.host || !urlValidProtocol || !urlValidPath) {
            throw dev.createError('Invalid URL value: ' + options.args[0]);
        }

        let _crypto = require('crypto'),
            tmpFilePath = _path.resolve(_os.tmpdir(), 'tmp-registry-' + _crypto.randomBytes(10).readUInt32LE(0) + '.json');

        if (_fs.existsSync(tmpFilePath)) {
            _fs.unlinkSync(tmpFilePath);
        }

        dev.downloadSync(url.href, tmpFilePath);

        if (!_fs.existsSync(tmpFilePath)) {
            throw dev.createError('Registry "' + url.href + '" not found.');
        }

        let registry = dev.getRegistry(),
            registryUpdate = require(tmpFilePath);

        if (typeof registryUpdate !== 'object') {
            throw dev.createError('Invalid content type of web registry.');
        }

        for (let p in registryUpdate) {
            let entry = registryUpdate[p];

            if (typeof entry !== 'object') {
                throw dev.createError('Invalid content type of web registry.');
            }

            registry[p] = entry;
        }

        _fs.unlinkSync(tmpFilePath);

        writeRegistry(registry);

        dev.printf('Registry entries updated!');
    }
    
    /**
     * Download and install binaries
     * 
     * @param {object} options - Command options
     */
    getBinariesAction(options) {
        let registry = dev.getRegistry(),
            scopes = Object.getOwnPropertyNames(registry),
            binaryBuffer = [];

        for (let s in scopes) {
            let scopeName = scopes[s],
                scope = registry[scopeName];

            if (!options.scope || options.scope === scopeName) {
                let lock = dev.getRegistryLock(scopeName),
                    lockBinary = getBinaryLockFiles(lock),
                    scopeUrl = dev.makeRegistryUrl(scope);

                lockBinary.map((sufix) => {
                    let url = dev.normalizeUrl(scopeUrl) + sufix;
                    binaryBuffer.push({ url: url, path: sufix });
                });

                continue;
            }

            dev.logger.debug('Skeep scope "' + scope + '"...');
        }

        if (1 > binaryBuffer.length) {
            dev.printf('No binary found!');
            return;
        }

        binaryBuffer.map((binary) => {
            if (binary.path.startsWith('bin/')) {
                binary.path = binary.path.substring('/bin'.length);
            }
            binary.path = _path.resolve(dev.devHome.bin, binary.path);
            dev.downloadSync(binary.url, binary.path);
        });

        dev.printf('%d binary successfully installed.', binaryBuffer.length);
    }
}

module.exports = new Registry();
