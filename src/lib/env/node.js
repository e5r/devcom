// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let _dev = require('e5r-dev'),
    _path = require('path'),
    _os = require('os');

/**
 * @todo: Implements no supported platforms.
 * 
 * 'win32', 'freebsd', 'linux', 'sunos'
 */

/** @constant {array} */
const SUPPORTED_PLATFORMS = [
    'darwin'
];

/** @constant {string} */
const NODE_VERSION_INDEX_URL = "https://nodejs.org/dist/index.json";

/**
 * Management NODE Environment
 * @class
 */
class NodeEnvironment {
    constructor() {
        let platform = _os.platform();

        if (0 > SUPPORTED_PLATFORMS.indexOf(platform)) {
            throw _dev.createError('Environment NODE does not support the ' + platform.toUpperCase() + ' platform.');
        }
    }

    /** @required */
    get name() {
        return 'node';
    }

    get devTool() {
        return this._devTool;
    }

    get options() {
        return this._options;
    }

    /** @required */
    init(devTool, options) {
        this._devTool = devTool;
        this._options = options;
    }

    /** @required */
    getVersions() {
        let tempDir = _dev.generateTempDir(),
            tempFilePath = _path.join(tempDir, 'node-index.json'),
            versionsInfo = {
                "environment": this.name,
                "versions": []
            };

        try {
            if (!_dev.directoryExists(tempDir)) {
                _dev.mkdir(tempDir);
            }

            _dev.downloadSync(NODE_VERSION_INDEX_URL, tempFilePath);

            let nodeIndex = require(tempFilePath);

            if (!Array.isArray(nodeIndex)) {
                throw 'Invalid downloaded file content for NODE versions information.'
            }

            versionsInfo.versions = nodeIndex;

            // Remove "v" from "v7.0.0" version number
            for (let idx in versionsInfo.versions) {
                let version = versionsInfo.versions[idx];
                version.version = version.version.substring(1);
            }

            if (_dev.directoryExists(tempDir)) {
                _dev.rmdir(tempDir);
            }
        } catch (error) {
            if (_dev.directoryExists(tempDir)) {
                _dev.rmdir(tempDir);
            }

            throw error;
        }

        return versionsInfo;
    }
}

module.exports = new NodeEnvironment();
