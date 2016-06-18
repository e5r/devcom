// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _fs = require('fs'),
    _path = require('path'),
    _url = require('url'),
    _os = require('os'),
    dev = require('e5r-dev');

/**
 * DevCom `init` command
 * @class
 * 
 * Init new project. Start E5R New Project Wizard.
 */
class Init extends dev.DevCom {

    /**
     * Run the `init` devcom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    run(devTool, options) {
        if ((process.env['DEVCOM_MODE'] || '').toUpperCase() !== 'DEVELOPMENT' && !(devTool instanceof dev.DevTool)) {
            throw dev.createError('Init should be performed only via DEV command.');
        }

        // 1. Check parameter [0] format. githubuser/repository@version
        //    @version is optional, default is master
        //    Ex: e5r/empty-project@1.0.0 -> https://github.com/e5r/empty-project/archive/v1.0.0.zip
        if (!options || !Array.isArray(options.args) || 1 > options.args.length) {
            this.usage();
            return;
        }

        let r = new RegExp('^([a-zA-Z0-9_\\-\\.]+)/([a-zA-Z0-9_\\-\\.]+)(@?)([a-zA-Z0-9_\\-\\.]*)$'),
            template = r.exec(options.args[0]);

        if (!template) {
            throw dev.createError('Invalid template format.');
        }

        let user = template[1],
            repository = template[2],
            version = template[4] || 'master',
            workdir = options.workdir || process.cwd();

        let urlGitHub = 'https://github.com/{user}/{repository}/archive/{version}.zip'
            .replace('{user}', user)
            .replace('{repository}', repository)
            .replace('{version}', version);

        // 2. Create if --workdir not exists
        if (!dev.directoryExists(workdir)) {
            dev.mkdir(workdir);
        }

        // 3. Up exception if --workdir is not empty
        if (!dev.directoryIsEmpty(workdir)) {
            throw dev.createError('Directory [' + workdir + '] is not empty.');
        }

        let pause = true;

        // 4. Get a temporary directory

        // 5. Download ZIP file to temporary directory

        // 6. Extract ZIP file

        // 7. Read '.init-template.json' from temporary directory

        // 8. Start wizard based on '.init-template.json' properties
    }

    /**
     * Show usage information for DevCom
     */
    usage() {
        dev.printf('Usage: dev init [options]');
        dev.printf();
        dev.printf('  Options:');
        dev.printf('    template       - Template signature: Ex: <user>/<repository>[@<version>]');
        dev.printf('      > user       - GitHub user or organization name');
        dev.printf('      > repository - GitHub repository name');
        dev.printf('      > version    - Branch/Tag name. Default: master');
    }
}

module.exports = new Init();

// devcom.run(this, parseArgOptions(this._args));
// Run Init DevCom on developer instance
if (!module.parent && module.filename === __filename) {
    let _devTool = dev.devToolDefaultInstance,
        _devCom = module.exports,
        _options = dev.parseOptions(process.argv.slice(2));

    try {
        _devCom.run(_devTool, _options);
    } catch (error) {
        dev.logger.error(error);
        _devTool.exitCode = error.code || 1;
    }

    _devTool.exit();
}