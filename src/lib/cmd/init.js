// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _os = require('os'),
    _fs = require('fs'),
    _path = require('path'),
    _crypto = require('crypto'),
    _dev = require('e5r-dev');

const WIZARD_FILE = 'initwizard.e5r';
const TEMPLATE_ZIP_FILE_NAME = '{version}.zip';

// e5r/empty-project@1.0.0 -> https://codeload.github.com/e5r/empty-project/zip/v1.0.0
const TEMPLATE_GITHUB_URL = 'https://codeload.github.com/{user}/{repository}/zip/{version}';
const TEMPLATE_ZIP_FOLDER = '{repository}-{version}';

/**
 * DevCom `init` command
 * @class
 * 
 * Start E5R New Project Wizard.
 */
class Init extends _dev.DevCom {

    /**
     * Run the `init` devcom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     * @param {object} options - Options for arguments of command
     */
    run(devTool, options) {

        if ((process.env['DEVCOM_MODE'] || '').toUpperCase() !== 'DEVELOPMENT' && !(devTool instanceof _dev.DevTool)) {
            throw _dev.createError('Init should be performed only via DEV command.');
        }

        // Check parameter [0] format. githubuser/repository@version
        // - @version is optional, default is master
        if (!options || !Array.isArray(options.args) || 1 > options.args.length) {
            this.usage();
            return;
        }

        let r = new RegExp('^([a-zA-Z0-9_\\-\\.]+)/([a-zA-Z0-9_\\-\\.]+)(@?)([a-zA-Z0-9_\\-\\.]*)$'),
            template = r.exec(options.args[0]);
        if (!template) {
            throw _dev.createError('Invalid template format.');
        }

        let user = template[1],
            repository = template[2],
            version = template[4] || 'master',
            workdir = options.workdir || process.cwd(),
            zipFileName = TEMPLATE_ZIP_FILE_NAME.replace('{version}', version);

        // Create if --workdir not exists
        if (!_dev.directoryExists(workdir)) {
            _dev.mkdir(workdir);
        }

        // Up exception if --workdir is not empty
        if (!_dev.directoryIsEmpty(workdir)) {
            throw _dev.createError('Directory [' + workdir + '] is not empty.');
        }

        // Generate GitHub URL. 
        let urlGitHub = TEMPLATE_GITHUB_URL
            .replace('{user}', user)
            .replace('{repository}', repository)
            .replace('{version}', version),
            zipFolderName = TEMPLATE_ZIP_FOLDER
                .replace('{repository}', repository)
                .replace('{version}', version),
            tmpPath = _dev.generateTempDir(),
            zipFilePath = _path.join(tmpPath, zipFileName),
            zipFolderPath = _path.join(tmpPath, zipFolderName),
            wizardFilePath = _path.join(zipFolderPath, WIZARD_FILE);

        if (!_dev.directoryExists(tmpPath)) {
            _dev.mkdir(tmpPath);
        }

        _dev.printf('TMP:', tmpPath);
        _dev.printf('Zip folder:', zipFolderPath);

        // Download ZIP file to temporary directory
        _dev.downloadSync(urlGitHub, zipFilePath);

        // 6. Extract ZIP file
        _dev.extractFile(zipFilePath, tmpPath);

        // 7. Read '.init-template.json' from temporary directory
        if (!_dev.fileExists(wizardFilePath)) {
            throw _dev.createError('Template wizard file [' + WIZARD_FILE + '] not found.');
        }

        let wizard = JSON.parse(_fs.readFileSync(wizardFilePath));

        let pause = true;

        // 8. Start wizard based on '.init-template.json' properties
    }

    /**
     * Show usage information for DevCom
     */
    usage() {
        _dev.printf('Usage: _dev init [options]');
        _dev.printf();
        _dev.printf('  Options:');
        _dev.printf('    template       - Template signature: Ex: <user>/<repository>[@<version>]');
        _dev.printf('      > user       - GitHub user or organization name');
        _dev.printf('      > repository - GitHub repository name');
        _dev.printf('      > version    - Branch/Tag name. Default: master');
    }

    /**
     * Generate a temporary directory name
     */
    getTempDir() {
        let tmpdir = _crypto.randomBytes(16).toString('hex');
        return _path.join(_os.tmpdir(), tmpdir);
    }
}

module.exports = new Init();

// devcom.run(this, parseArgOptions(this._args));
// Run Init DevCom on developer instance
if (!module.parent && module.filename === __filename) {
    let _devTool = _dev.devToolDefaultInstance,
        _devCom = module.exports,
        _options = _dev.parseOptions(process.argv.slice(2));

    try {
        _devCom.run(_devTool, _options);
    } catch (error) {
        _dev.logger.error(error);
        _devTool.exitCode = error.code || 1;
    }

    _devTool.exit();
}