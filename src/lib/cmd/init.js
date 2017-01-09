// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _fs = require('fs'),
    _os = require('os'),
    _path = require('path'),
    _vm = require('vm'),
    _dev = require('e5r-dev');

const UNDEFINED = 'undefined';
const WIZARD_FILE = '.initwizard.e5r';
const TEMPLATE_DEFAULT = 'e5r/empty-project@develop';
const TEMPLATE_ZIP_FILE_NAME = '{version}.zip';
const TEMPLATE_GITHUB_URL = 'https://codeload.github.com/{user}/{repository}/zip/{version}';
const TEMPLATE_ZIP_FOLDER = '{repository}-{version}';
const WIZARD_GET_PROPERTY_LINE = '  > {title}{options}{default}: ';
const IF_EXPRESSION_TRUE_RESULT = '__IFE_TRUE__';

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

        if (options && Array.isArray(options.args) && options.args.length === 0) {
            options.args.push(TEMPLATE_DEFAULT);
        }

        if (options.hasOwnProperty('help') || options.hasOwnProperty('h')) {
            this.help(devTool);
            return;
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
        if (!_dev.directoryIsEmpty(workdir, ['.git'])) {
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

        _dev.downloadSync(urlGitHub, zipFilePath, { quiet: true });
        _dev.extractFile(zipFilePath, tmpPath);

        let context = this.loadContext(wizardFilePath, workdir, options);

        this.expandFiles(context);
        this.copyFiles(context);
        this.removeFiles(context);
        this.renameFiles(context);
        this.showSuccess(context, options);

        try {
            _dev.rmdir(tmpPath);
        } catch (_) { /*quiet*/ }
    }

    /**
     * Expand content files, replacing magic strings "{% expression }%"
     * for values of context.
     * 
     * @param {object} context The wizard context
     */
    expandFiles(context) {
        context.filesToExpand.map((file) => {
            let filePath = _path.join(context.tempContainer, file),
                fileContent = _fs.readFileSync(filePath),
                expanded = this.expandString(fileContent.toString(), context);

            if (0 < expanded.count) {
                _fs.writeFileSync(filePath, expanded.value);
            }
        });
    }

    /**
     * Copy files to workdir
     * 
     * @param {object} context The wizard context
     */
    copyFiles(context) {
        context.filesToCopy.map((file) => {
            let fileFromPath = _path.join(context.tempContainer, file),
                fileToPath = _path.join(context.builtin.workdir, file),
                fileToFolder = _path.dirname(fileToPath);

            _dev.mkdir(fileToFolder);
            _fs.writeFileSync(fileToPath, _fs.readFileSync(fileFromPath));
        });
    }

    /**
     * Remove files from workdir based on defWizard
     * 
     * @param {object} context The wizard context
     */
    removeFiles(context) {
        (context.defWizard.remove || []).map((def) => {
            if ((typeof def.match === 'string' || typeof def.path === 'string') && this.evalIfExpression(def.if || 'false', context)) {
                let removeList = [];

                if (def.match) {
                    let match = def.match;
                    match = (0 !== match.indexOf('^') ? '^' : '') + match;
                    match = match + (match.length - 1 !== match.lastIndexOf('$') ? '$' : '');

                    context.filesToCopy.map((file) => {
                        if (new RegExp(match).test(file)) {
                            removeList.push(_path.join(context.builtin.workdir, file));
                        }
                    });
                }

                if (def.path) {
                    let path = _path.join(context.builtin.workdir, def.path);
                    if (_dev.pathExists(path)) {
                        removeList.push(path);
                    }
                }

                removeList.map((path) => {
                    if (_dev.fileExists(path)) _fs.unlinkSync(path);
                    if (_dev.directoryExists(path)) _dev.rmdir(path);
                });
            }
        });
    }

    /**
     * Rename files from workdir based on defWizard
     * 
     * @param {object} context The wizard context
     */
    renameFiles(context) {
        for (let p in (context.defWizard.rename || {})) {
            let pathTo = _path.join(context.builtin.workdir, p),
                pathFrom = _path.join(context.builtin.workdir, context.defWizard.rename[p]);

            _dev.rename(pathFrom, pathTo);
        };
    }

    /**
     * Print success message
     */
    showSuccess(context, options) {
        _dev.printf('New project started in "{0}".'.replace('{0}', context.builtin.workdir));
        _dev.printf(JSON.stringify(context.wizard, null, 2));
    }

    /**
     * Make a data context from wizard object
     * 
     * @param {object} wizard - Wizard object
     * @param {string} workdir - Work directory
     * @param {object} options - Options for arguments of command
     * @return {object}
     */
    loadContext(wizardFilePath, workdir, options) {
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
                year: now.getFullYear().toString(),
                month: (now.getMonth() + 1).toString(),
                day: now.getDate().toString(),
                hour: now.getHours().toString(),
                minute: now.getMinutes().toString(),
                second: now.getSeconds().toString(),
                milliseconds: now.getMilliseconds().toString(),
                weekday: (now.getDay() + 1).toString()
            },
            tempContainer: _path.dirname(wizardFilePath),
            defWizard: wizard,
            wizard: {}
        }
        // 1 -> 01
        context.builtin.month = 2 > context.builtin.month.length ? '0' + context.builtin.month : context.builtin.month;
        context.builtin.day = 2 > context.builtin.day.length ? '0' + context.builtin.day : context.builtin.day;

        this.runWizard(context, options);

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

        for (let p in wizard.properties) {
            p = wizard.properties[p];
            if (typeof p.name !== 'string') return false;
            if (typeof p.title !== UNDEFINED && typeof p.title !== 'string') return false;
            if (typeof p.match !== UNDEFINED && typeof p.match !== 'string') return false;
            if (typeof p.default !== UNDEFINED && typeof p.default !== 'string') return false;
            if (typeof p.options !== UNDEFINED && !Array.isArray(p.options)) return false;
        }

        if (typeof wizard.remove !== UNDEFINED && !Array.isArray(wizard.remove)) return false;
        if (typeof wizard.rename !== UNDEFINED && typeof wizard.rename !== 'object') return false;
        if (typeof wizard.expandExcludes !== UNDEFINED && !Array.isArray(wizard.expandExcludes)) return false;
        if (typeof wizard.copyExcludes !== UNDEFINED && !Array.isArray(wizard.copyExcludes)) return false;

        return true;
    }

    /**
     * Run wizard and make a context
     * 
     * @param {object} context - Object context
     * @param {object} options - Options for arguments of command
     */
    runWizard(context, options) {
        if (!options.devmode) {
            this.showWelcomeMessage(context.defWizard, options);
        }
        this.addProperties(context, options);

        context.filesToExpand = this.searchFiles(context.tempContainer, context.defWizard.expandExcludes);
        context.filesToCopy = this.searchFiles(context.tempContainer, context.defWizard.copyExcludes);
    }

    /**
     * Show a wizard welcome message
     * 
     * @param {object} wizard - Object wizard
     * @param {object} options - Options for arguments of command
     */
    showWelcomeMessage(wizard, options) {
        let message = wizard.message;

        if (Array.isArray(message)) {
            message = message.join(_os.EOL);
        }

        _dev.printf(message);
    }

    /**
     * Add wizard properties to context
     * 
     * @param {object} context - Object context
     * @param {object} toolOptions - Options for arguments of command
     */
    addProperties(context, toolOptions) {
        context.defWizard.properties.map((p, idx) => {
            let name = p.name,
                title = this.expandString(p.title || p.name).value,
                defaultValue = this.expandString(p.default || '', context).value,
                value = defaultValue;

            if (!toolOptions.devmode) {

                let options = (p.options || []),
                    optionsText = options.length > 0
                        ? ' ({0})'.replace('{0}', options.join(', '))
                        : '',
                    defaultText = defaultValue !== ''
                        ? ' [{0}]'.replace('{0}', defaultValue)
                        : defaultValue,
                    lineText = WIZARD_GET_PROPERTY_LINE
                        .replace('{title}', title)
                        .replace('{options}', optionsText)
                        .replace('{default}', defaultText);
                value = _dev.prompt(lineText) || defaultValue;

                if (typeof p.match === 'string' && !(new RegExp(p.match).test(value))) {
                    _dev.printf('#WARNING: Invalid value. Assuming default value. [' + defaultValue + ']');
                    value = defaultValue;
                }

                if (Array.isArray(p.options) && 0 > p.options.indexOf(value)) {
                    _dev.printf('#WARNING: Invalid value. Assuming default value. [' + defaultValue + ']');
                    value = defaultValue;
                }
            }

            context.wizard[name] = value;
        });
    }

    /**
     * Expand strings "{% x %}" based on context values.
     * 
     * @param {string} str      String with "{%x%}" expression
     * @param {object} context  Object context
     * @return {object} Expanded string
     */
    expandString(str, context) {
        let rx = new RegExp('{%([^%]+)%}', 'gi'),
            result = {
                value: str,
                count: 0
            },
            rs;

        while (rs = rx.exec(result.value)) {
            let original = rs[0],
                jsExp = rs[1],
                jsResult;

            try {
                jsResult = _vm.runInNewContext(jsExp, context) || '';
            } catch (_) {
                jsResult = '[#ERROR: ' + (_.message || _) + ']';
            }

            result.value = result.value.replace(original, jsResult);
            rx.lastIndex = 0;
            result.count++;
        }

        return result;
    }

    /**
     * Evaluate a expression on context.
     * 
     * @param {string} ifExpress If expression
     * @param {object} context Object context
     * @return {bool} True if success, or False if not success or exception
     */
    evalIfExpression(ifExpress, context) {
        try {
            ifExpress = '(' + ifExpress + ') ? "' + IF_EXPRESSION_TRUE_RESULT + '" : ""';
            let jsResult = _vm.runInNewContext(ifExpress, context) || '';
            return jsResult === IF_EXPRESSION_TRUE_RESULT;
        } catch (_) { /* quiet */ }

        return false;
    }

    /**
     * Search and index a list files on directory
     * 
     * @todo: Move to e5r-dev lib.
     * 
     * @param {string} basePath Base path to start search
     * @param {Array} excludes  Paths to excludes
     * @param {string} prefix   Prefix to names, used on recursive
     */
    searchFiles(basePath, excludes, prefix) {
        let results = [];
        excludes = excludes || [];
        prefix = typeof prefix === 'string' ? prefix : '';

        if (!Array.isArray(excludes)) {
            throw _dev.createError('Parameter excludes must be an Array.');
        }

        if (!_fs.statSync(basePath).isDirectory()) {
            throw _dev.createError('Path "' + basePath + '" is not a directory.');
        }

        let list = _fs.readdirSync(basePath);

        for (let i in list) {
            let childName = list[i],
                childSegments = (0 < prefix.length ? prefix + '/' : '') + childName,
                childPath = _path.join(basePath, childName),
                excluded = false;

            if (childName === "." || childName === "..") continue;
            if (childSegments === WIZARD_FILE) continue;

            for (let ex in excludes) {
                ex = excludes[ex] || '';
                ex = (0 !== ex.indexOf('^') ? '^' : '') + ex;
                ex = ex + (ex.length - 1 !== ex.lastIndexOf('$') ? '$' : '');

                if (new RegExp(ex).test(childSegments)) {
                    excluded = true;
                    break;
                }
            }

            if (excluded) continue;

            let stat = _fs.statSync(childPath);

            if (stat.isDirectory()) {
                let _basePath = _path.join(basePath, childName),
                    _prefix = childSegments;

                let _results = this.searchFiles(_basePath, excludes, _prefix);
                results = results.concat(_results);

                continue;
            }

            results.push(childSegments);
        }

        return results;
    }

    /**
     * Show help information for DevCom
     * 
     * @param {object} devTool - Instance of DevToolCommandLine
     */
    help(devTool) {
        _dev.printf('DevCom INIT');
        _dev.printf('');
        _dev.printf('Fill a directory with a default structure for a new project');
        _dev.printf('of a E5R Development Team.');
        _dev.printf('');

        this.usage(devTool);
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
        _dev.printf('    -D             - Always use default values');
        _dev.printf('    -Y             - Yes to all questions');
    }
}

module.exports = new Init();

// Run Init DevCom on developer instance
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
