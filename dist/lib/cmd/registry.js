// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */

let dev = require('dev');

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
        
        let parseParams = (params) => {
            
        }
        
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
