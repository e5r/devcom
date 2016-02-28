// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let dev = require('e5r-dev'),
    _os = require('os');

/**
 * @todo: Implements no supported platforms.
 * 
 * 'darwin', 'freebsd', 'linux', 'sunos'
 */

/** @constant {array} */
const SUPPORTED_PLATFORMS = [
    'win32'
];

/** @constant {array} */
const LAST_VERSIONS = [
    "7,7.0 => 7.0.3",
    "5,5.6 => 5.6.18",
    "5.5 => 5.5.32",
    "5.4 => 5.4.45"
];

/** @todo: Move to JSON file and concat on make dist */
/** @todo: Auto make a JSON file from http://windows.php.net/downloads/releases */
const WINDOWS_METADATA = {
    "base_download_url": "http://windows.php.net/downloads/releases/",
    "archive_download_url": "http://windows.php.net/downloads/releases/archives/",
    "versions": [
        {
            "version": "7.0.3",
            "nts": "true",
            "vc": "14",
            "x64": "true",
            "x86": "true",
            "is_archive": "false"
        },
        {
            "version": "7.0.2",
            "nts": "true",
            "vc": "14",
            "x64": "true",
            "x86": "true",
            "is_archive": "true"
        },
        {
            "version": "7.0.1",
            "nts": "true",
            "vc": "14",
            "x64": "true",
            "x86": "true",
            "is_archive": "true"
        },
        {
            "version": "5.6.18",
            "nts": "true",
            "vc": "11",
            "x64": "true",
            "x86": "true",
            "is_archive": "false"
        },
        {
            "version": "5.5.32",
            "nts": "true",
            "vc": "11",
            "x64": "true",
            "x86": "true",
            "is_archive": "false"
        },
        {
            "version": "5.4.45",
            "nts": "true",
            "vc": "9",
            "x64": "false",
            "x86": "true",
            "is_archive": "false"
        }
    ]
};

/**
 * A tool set for all or undefined platform
 * @class
 * 
 * Throw exception if method if for a specific platform
 */
class PhpEnvironmentTool {
    
    /**
     * Get a last version corresponding to a given version
     * 
     * @param {string} version
     */
    getLastVersion(version) {
        let parts = (version || '').split('.');

        if (3 === parts.length) {
            if (parts[0].trim() && parts[1].trim() && parts[2].trim()) return version;
            return null;
        }
        
        if (3 < parts.length || 1 > parts.length) return null;

        for (let index in LAST_VERSIONS) {
            let version_parts = LAST_VERSIONS[index].split('=>'),
                version_alias = (version_parts[0] || '').trim(),
                version_value = (version_parts[1] || '').trim();
            if (-1 < version_alias.indexOf(version)) return version_value;
        }

        return null
    }
    
    getVersionMetadata(version) {
        throw dev.createError('PhpEnvironmentTool->getVersionMetadata() not implemented!');
    }
}

/**
 * A tool set for Win32 platform
 * @class
 */
class PhpEnvironmentToolWin32 extends PhpEnvironmentTool {
    
}

/**
 * Management PHP Environment
 * @class
 * 
 * $ dev env php [options]
 */
class PhpEnvironment {
    
    constructor() {
        let platform = _os.platform();
        
        if (0 > SUPPORTED_PLATFORMS.indexOf(platform)) {
            throw dev.createError('Environment PHP does not support the ' + platform.toUpperCase() + ' platform.');
        }
        
        // Configure tool set
        if (platform == 'win32') {
            this._toolset = new PhpEnvironmentToolWin32();
        // } else if (platform == 'darwin') {
        //     /** @todo: Implements `darwin` tool set */
        // } else if (platform == 'freebsd') {
        //     /** @todo: Implements `freebsd` tool set */
        // } else if (platform == 'linux') {
        //     /** @todo: Implements `linux` tool set */
        // } else if (platform == 'sunos') {
        //     /** @todo: Implements `sunos` tool set */
        } else {
            this._toolset = new PhpEnvironmentTool();
        }
    }
    
    /**
     * Get a tool set to current platform
     */
    get toolset() {
        return this._toolset;
    }
    
    /**
     * Ensures that <options> has a suitable version number.
     * 
     * @param {object} options
     * 
     * @return {string} - Return a version string
     */
    ensuresVersion(options) {
        return this._toolset.getLastVersion(options.version);
    }
    
    /**
     * Install a new version of PHP if available
     * 
     * @param {object} options
     */
    install(options) {
        dev.printf('Installing PHP...');

        dev.printf('#php.install():', JSON.stringify(options, null, 4));
        let version = this.ensuresVersion(options);
        dev.printf('  version:', version);
    }
// 
//     uninstall(options) {
// 
//     }
// 
//     list(options) {
// 
//     }
// 
//     activate(options) {
// 
//     }
// 
//     deactivate(options) {
// 
//     }
}

module.exports = new PhpEnvironment();
