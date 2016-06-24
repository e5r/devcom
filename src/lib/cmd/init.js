// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _fs = require('fs'),
    _os = require('os'),
    _path = require('path'),
    _dev = require('e5r-dev');

const UNDEFINED = 'undefined';
const WIZARD_FILE = '.initwizard.e5r';
const TEMPLATE_ZIP_FILE_NAME = '{version}.zip';
const TEMPLATE_GITHUB_URL = 'https://codeload.github.com/{user}/{repository}/zip/{version}';
const TEMPLATE_ZIP_FOLDER = '{repository}-{version}';
const WIZARD_GET_PROPERTY_LINE = '  > {title}{options}{default}:';

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
            this.usage(devTool);
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

        // Generate GitHub URL
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

        // _dev.printf('TMP:', tmpPath);
        // _dev.printf('Zip folder:', zipFolderPath);
        _dev.downloadSync(urlGitHub, zipFilePath, { quiet: true });
        _dev.extractFile(zipFilePath, tmpPath);

        let context = this.loadContext(wizardFilePath, workdir);

        // TODO: this.changeFiles(context);

        try {
            _dev.rmdir(tmpPath);
        } catch (_) { /*quiet*/ }
    }

    /**
     * Make a data context from wizard object
     * 
     * @param {object} wizard - Wizard object
     * @param {string} workdir - Work directory
     * @return {object}
     */
    loadContext(wizardFilePath, workdir) {
        let wizard;

        if (!_dev.fileExists(wizardFilePath)) {
            throw _dev.createError('Template wizard file [' + WIZARD_FILE + '] not found.');
        }

        try {
            wizard = JSON.parse(_fs.readFileSync(wizardFilePath));
            if (!wizard) throw wizard;
        } catch (_) {
            throw _dev.createError('Invalid wizard file [' + WIZARD_FILE + '] format.');
        }

        if (!this.validateWizard(wizard)) {
            throw _dev.createError('Invalid wizard object format.');
        }

        let now = new Date();

        let context = {
            builtin: {
                workdir: workdir,
                folderName: _path.basename(workdir),
                // Date/Time
                year: now.getFullYear(),
                month: now.getMonth(),
                day: now.getDate(),
                hour: now.getHours(),
                minute: now.getMinutes(),
                second: now.getSeconds(),
                milliseconds: now.getMilliseconds(),
                weekday: now.getDay()
            }
        }

        this.runWizard(wizard, context);

        return context;
    }

    /**
     * Validate wizard fields formats.
     * 
     * @param {object} wizard - Wizard object
     * @return {bool}
     */
    validateWizard(wizard) {
        if (typeof wizard !== typeof {}) return false;
        if (typeof wizard.message !== 'string' && !Array.isArray(wizard.message)) return false;
        if (!Array.isArray(wizard.properties)) return false;
        if (typeof wizard.excludes !== UNDEFINED && !Array.isArray(wizard.excludes)) return false;

        return true;
    }

    /**
     * Run wizard and make a context
     * 
     * @param {object} wizard - Object wizard
     * @param {object} context - Object context
     */
    runWizard(wizard, context) {
        this.showWelcomeMessage(wizard);
        this.addProperties(wizard, context);
    }

    /**
     * Show a wizard welcome message
     * 
     * @param {object} wizard - Object wizard
     */
    showWelcomeMessage(wizard) {
        let message = wizard.message;

        if (Array.isArray(message)) {
            message = message.join(_os.EOL);
        }

        _dev.printf(message);
    }

    /**
     * Add wizard properties to context
     * 
     * @param {object} wizard - Object wizard
     * @param {object} context - Object context
     */
    addProperties(wizard, context) {
        wizard.properties.map((p, idx) => {
            if (!p.name) {
                throw _dev.createError('Invalid name for wizard property [' + idx + '].');
            }

            let name = p.name,
                title = p.title || p.name,
                defaultValue = p.default || '',
                options = (p.options || '').split('|');

            let optionsText = options.length > 0
                ? ' ({0})'.replace('{0}', options.join(', '))
                : '';

            let defaultText = defaultValue !== ''
                ? ' [{0}]'.replace('{0}', defaultValue)
                : defaultValue;

            let lineText = WIZARD_GET_PROPERTY_LINE
                .replace('{title}', title)
                .replace('{options}', optionsText)
                .replace('{default}', defaultText);

            let value = _dev.prompt(lineText);

            _dev.printf('   ---> selected (' + value.length + '):', value);
            if (value.length > 0) {
                _dev.printf('      > code:', value.charCodeAt(0));
            }
        });
    }

    /**
     * Show usage information for DevCom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     */
    usage(devTool) {
        _dev.printf('Usage: ' + devTool.name + ' init [options]');
        _dev.printf();
        _dev.printf('  Options:');
        _dev.printf('    template       - Template signature: Ex: <user>/<repository>[@<version>]');
        _dev.printf('      > user       - GitHub user or organization name');
        _dev.printf('      > repository - GitHub repository name');
        _dev.printf('      > version    - Branch/Tag name. Default: master');
    }
}

module.exports = new Init();

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

// $> node src\lib\cmd\init.js --workdir "C:\Users\erlimar\00-e5r-dev-init-test" e5r/empty-project@develop
