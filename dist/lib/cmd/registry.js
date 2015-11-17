// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

console.log('require(\'dev\') start...');
console.log('PATHS: ', module.paths);

console.log('Verify exists file DEV.JS');
for(var p in module.paths){
    var fs = require('fs'),
        path = require('path'),
        filePath = path.resolve(module.paths[p], 'dev.js');
        
    console.log(filePath, '=>', fs.existsSync(filePath));
}

var dev = require('dev');

console.log('require(\'dev\') finish...:', dev);

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
     * @param {DevToolCommandLine} toolInstance - Instance of DevToolCommandLine
     * @param {Array} args - Argument list
     */
    run(toolInstance, args) {
        dev.logger.verbose('********************************************');
        dev.logger.verbose('Running [REGISTRY] DevCom...');
        dev.logger.verbose('toolInstance:', toolInstance);
        dev.logger.verbose('args:', args);
        dev.logger.verbose('********************************************');
    }
}

module.exports = new Registry();

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