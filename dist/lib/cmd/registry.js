// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

let _fs = require('fs'),
    _path = require('path'),
    _os = require('os');

/** @constant {string} */
const REGISTRY_FILE = 'registry.json';

/** @constant {string} */
const REGISTRY_LOCKFILE = 'registry.lock.json';

/** @constant {string} */
const MAGIC_REGISTRY_LOCKNAME = '{name}';

/** @constant {string} */
const REGISTRY_LOCAL_LOCKFILE = 'registry.' + MAGIC_REGISTRY_LOCKNAME + '.lock.json';

//let dev = require('dev');
/**
 * @mock - require('dev)
 */
const TOOL_DEVFOLDER = '.dev';

let _rootPath = _path.resolve(_os.homedir(), TOOL_DEVFOLDER);

class DevComMock {}
class DevToolMock {}

let dev = {
    DevCom: DevComMock,
    DevTool: DevToolMock,
    devHome: {
        root: _rootPath,
        tools: _path.join(_rootPath, 'tools'),
        bin: _path.join(_rootPath, 'bin'),
        lib: _path.join(_rootPath, 'lib'),
        cmd: _path.join(_rootPath, 'lib', 'cmd'),
        doc: _path.join(_rootPath, 'doc')
    },
    createError: (msg) => {
        return new Error(msg);
    },
    printf: console.log,
    logger: {
        verbose: console.log
    },
    makeRegistryUrl: (entry) => {
        if (typeof entry !== 'object') {
            throw dev.createError('Invalid content type of registry.');
        }

        let registryType = entry.type.toLowerCase();

        // GitHub type
        if (registryType === 'github' && entry.owner && entry.repository && entry.branch) {
            return 'https://raw.githubusercontent.com/{owner}/{repository}/{branch}/{path}'
                .replace('{owner}', entry.owner)
                .replace('{repository}', entry.repository)
                .replace('{branch}', entry.branch)
                .replace('{path}', entry.path ? entry.path : '');
        }
    
        // URL type
        if(registryType === 'url' && entry.url){
            return '{base}/{path}'
                .replace('{base}', entry.url)
                .replace('{path}', entry.path ? entry.path : '');
        }
        
        throw dev.createError('Invalid registry entry to generate URL: ' + JSON.stringify(entry, null, 2));
    },
    normalizeUrl: (url) => {
        if (typeof url !== 'string') {
            throw dev.createError('Invalid url value. Must be an string.');
        }

        return url.concat(url.lastIndexOf('/') !== url.length - 1 ? '/' : '');
    }
}

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
 * Read the registry lock file and count map file by type
 * 
 * @param {string} path - Path to lock file
 * @return {object} Summary of counts
 */
function countLockFiles(path) {
    let counts = {
        bin: 0,
        doc: 0,
        cmd: 0
    };
    
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
        
        let actionName = options.args.shift(),
            actionFn = this[actionName + 'Action'];
        
        if (typeof actionFn !== 'function') {
            throw dev.createError('Unknown action "' + actionName + '" for registry DevCom.');
        }
        
        actionFn(options);
    }
    
    /**
     * Show usage information for DevCom
     * 
     * @param {string} action - Action name or null
     */
    usage(action) {
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
            dev.printf('Usage: dev registry install [URL] to add entries for registry');
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
            throw dev.createError('Registry show usage: dev registry show [entry]');;
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
            dev.printf('URL Registry');
            dev.printf('  Registry URL:', url);

            found = true;
        }

        if (!found) {
            throw dev.createError('Invalid registry entry: ' + JSON.stringify(entry, null, 2));
        }

        dev.printf('  Lock file:', urlLockFile);
        dev.printf('  Local lock file:', pathLockFile);

        if (_fs.existsSync(pathLockFile)) {
            /** @todo: Implements! */
            dev.printf('  Lock file counts:');
        } else {
            dev.printf('  Lock file counts: *** NOT PRESENT ***');
        }
    }
    
    removeAction(options) {
        
    }
    
    updateAction(options) {
        
    }
    
    installAction(options) {
        
    }
}

let devcom = new Registry();

devcom.run(new DevToolMock() , {
    args: ['show', 'e5r-devcom'],
    //resources: 'bin,doc',
    //scope: 'TOOL_DEFAULT_SCOPE'
});

// $> dev registry list            >> {args:['list']}
// $> dev registry show e5r-devcom >> {args:['show', 'e5r-devcom']}

module.exports = devcom;

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
