// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

let _fs = require('fs'),
    _path = require('path'),
    _url = require('url'),
    _os = require('os');

/** @constant {string} */
const REGISTRY_FILE = 'registry.json';

/** @constant {string} */
const REGISTRY_LOCKFILE = 'registry.lock.json';

/** @constant {string} */
const MAGIC_REGISTRY_LOCKNAME = '{name}';

/** @constant {string} */
const REGISTRY_LOCAL_LOCKFILE = 'registry.' + MAGIC_REGISTRY_LOCKNAME + '.lock.json';

let dev = require('dev');

/**
 * Read the registry file
 * 
 * @return {object} Content of `registry.json` file
 */
function readRegistry() {
    let registryPath = _path.resolve(dev.devHome.root, REGISTRY_FILE);

    if (!_fs.existsSync(registryPath)) {
        throw dev.createError('Registry file not found!');;
    }

    let registry = require(registryPath);
    
    if (typeof registry !== 'object') {
        throw dev.createError('Invalid content type of registry file.');
    }
    
    return registry; 
}

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
        if (!(devTool instanceof dev.DevTool)) {
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
        dev.printf('    list      - List all registry entries');
        dev.printf('    show      - Show details of a registry entry');
        dev.printf('    remove    - Remove a registry entry');
        dev.printf('    update    - Update information of a registry entry');
        dev.printf('    install   - Add new entries for registry');
        dev.printf();
        dev.printf('  Options:');
        dev.printf('    ?         - ???');
    }
    
    /**
     * List all registry entries
     * 
     * @param {object} options - Command options
     */
    listAction(options) {
        let registry = readRegistry(),
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
            registry = readRegistry(),
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
            registry = readRegistry(),
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

        let registry = readRegistry(),
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
     * Download binary files to local cache
     */
    getBinariesAction(options) {
        if (typeof options.scope !== 'string') {
            throw dev.createError('Registry get-binaries usage: dev registry get-binaries --scope={scope-name}');
        }
        
        dev.logger.verbose('get-binaries action...');
    }
}

let _args = process.argv.slice(2);

if (_args.length === 3 && _args[0] === 'wget') {
    dev.download(_args[1], _args[2]);
} else {

    let devcom = new Registry();

    devcom.run(new dev.DevTool(), {
        args: ['get-binaries'],
        scope: 'e5r-devcom',
        //scope: 'TOOL_DEFAULT_SCOPE'
    });
}

// $> dev registry list
// >> {args:['list']}

// $> dev registry show e5r-devcom
// >> {args:['show', 'e5r-devcom']}

// $> dev registry remove user-entry
// >> {args:['remove', 'user-entry']}

// $> dev registry get-binaries --scope=e5r-devcom
// >> {args:['get-binaries'], scope:'e5r-devcom'}

/** @todo: Implements get-tools
// $> dev registry get-tools --scope=e5r-devcom

module.exports = devcom;
}

/*
DEVCOM padrões:

- help -> builtin
    Exibe o arquivo /help/devcom/command.html no navegador
    ou, /help/devcom/command.man/ no prompt

- registry -> builtin
    * list -> Lista os nomes dos registros em `registry.json`
    * show [name] -> Exibe as informações do registro X em `registry.json`
    * remove [name] -> Remove um registro da lista
    * update [url for registry.json] -> Faz um merge do `registry.json` atual com o baixado da url
    Todos os registros no remoto serão adicionados ou substituirão os existentes localmente
*/

// Ideia
/*
// let cmd = lib.require('cmd://registry');
//
// cmd.run(toolInstance, [
//     'install',
//     '--resources', 'bin,doc',
//     '--scope', TOOL_DEFAULT_SCOPE
// ]);
//
// Lib.require => Usa lib.getResources('DevComName') pra baixar arquivos da Web
//                depois carrega.
//
// Registry.js {
        let command = args.splice(0, 1);
        let params = lib.parseParams(args);
        
        if(command === 'install') {
            lib.getResources(params.resources, params.scope);
            return;
        }
        
        ...
// }
*/
