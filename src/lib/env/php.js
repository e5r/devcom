// Copyright (c) E5R Development Team. All rights reserved.
// Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

/* global process, __filename, __dirname */
"use strict";

let dev = require('e5r-dev'),
    _os = require('os'),
    _fs = require('fs'),
    _url = require('url'),
    _path = require('path');

/** @constant {string} */
const ENVIRONMENT_DIRECTORY = 'environment';

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
    "latest,7,7.0 => 7.0.3",
    "5,5.6 => 5.6.18",
    "5.5 => 5.5.32",
    "5.4 => 5.4.45"
];

/** @todo: Move to JSON file and concat on make dist */
/** @todo: Auto make a JSON file from http://windows.php.net/downloads/releases */
const WINDOWS_METADATA = {
    "base_download_url": "http://windows.php.net/downloads/releases/",
    "archive_download_url": "http://windows.php.net/downloads/releases/archives",
    "versions": [
        {
            "version": "7.0.3",
            "nts": true,
            "vc": "14",
            "arch": ["x64", "x86"],
            "is_archive": false
        },
        {
            "version": "7.0.2",
            "nts": true,
            "vc": "14",
            "arch": ["x64", "x86"],
            "is_archive": true
        },
        {
            "version": "7.0.1",
            "nts": true,
            "vc": "14",
            "arch": ["x64", "x86"],
            "is_archive": true
        },
        {
            "version": "5.6.18",
            "nts": true,
            "vc": "11",
            "arch": ["x64", "x86"],
            "is_archive": false
        },
        {
            "version": "5.5.32",
            "nts": true,
            "vc": "11",
            "arch": ["x64", "x86"],
            "is_archive": false
        },
        {
            "version": "5.4.45",
            "nts": true,
            "vc": "9",
            "arch": ["x86"],
            "is_archive": false
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
                version_alias = (version_parts[0] || '').trim().split(','),
                version_value = (version_parts[1] || '').trim();
            if (-1 < version_alias.indexOf(version)) return version_value;
        }

        return null
    }
    
    downloadPackageFile(versionMetadata, options){
        let ntsAvailable = !!versionMetadata.nts,
            ntsRequired =  !!options.nts,
            arch = (options.arch ? options.arch : dev.arch).toLowerCase();
        
        if (0 > versionMetadata.arch.indexOf(arch)) {
            throw dev.createError('PHP not available for "' + arch + '" architecture.');
        }
        
        if (ntsRequired && !ntsAvailable) {
            throw dev.createError('PHP version '
                + versionMetadata.version
                + ' not available for "Non Thread Safe" mode.')
        }
        
        let fileName = this.makePackageFileName(versionMetadata, options, ntsRequired),
            fileUrl = this.makePackageUrl(versionMetadata, fileName),
            filePath = this.makePackagePath(fileName);
        
        dev.printf('#fileName:', fileName);
        dev.printf('#url:', fileUrl);
        dev.printf('#path:', filePath);
        dev.printf('> METADATA:', JSON.stringify(versionMetadata, null, 4));
        dev.printf('> OPTIONS:', JSON.stringify(options, null, 4));
        dev.printf('>>', !!versionMetadata.nts, '->', !!options.nts);
        
        dev.downloadSync(fileUrl, filePath);
        
        if (!_fs.statSync(filePath).isFile()) {
            throw dev.createError('Error on download from ' + fileUrl);
        }
        
        
        
        throw dev.createError('PhpEnvironmentTool->downloadPackageFile() not implemented!');
    }
    
    getEnvironmentPath() {
        return _path.join(dev.devHome.root, ENVIRONMENT_DIRECTORY, 'php');
    }

    makePackagePath(fileName) {
        return _path.join(this.getEnvironmentPath(), fileName);
    }

    makePackageFileName(versionMetadata, options, ntsRequired) {
        throw dev.createError('PhpEnvironmentTool->makePackageFileName() not implemented!');
    }
    
    makePackageUrl(versionMetadata, packageFileName) {
        throw dev.createError('PhpEnvironmentTool->makePackageUrl() not implemented!');
    }
    
    getVersionMetadata(version) {
        throw dev.createError('PhpEnvironmentTool->getVersionMetadata() not implemented!');
    }
    
    ensuresDirectoryVersion(version) {
        throw dev.createError('PhpEnvironmentTool->ensuresDirectoryVersion() not implemented!');
    }
    
    destroyPackageFile(filePath){
        throw dev.createError('PhpEnvironmentTool->destroyPackageFile() not implemented!');
    }

    unpackFile(version, downloadedFile) {
        throw dev.createError('PhpEnvironmentTool->unpackFile() not implemented!');
    }

    rollbackVersion(version) {
        throw dev.createError('PhpEnvironmentTool->rollbackVersion() not implemented!');
    }
}

/**
 * A tool set for Win32 platform
 * @class
 */
class PhpEnvironmentToolWin32 extends PhpEnvironmentTool {
    
    /**
     * Load metadata version from WINDOWS_METADATA
     */
    getVersionMetadata(version) {
        for (let index in WINDOWS_METADATA.versions) {
            let metadata = WINDOWS_METADATA.versions[index];
            if (metadata.version === version) {
                return metadata;
            }
        }
        throw dev.createError('Metadata not found for version ' + version + '.');
    }
    
    /**
     * Make a download filename
     */
    makePackageFileName(versionMetadata, options, ntsRequired) {
        let fileName = 'php-{version}{nts}-Win32-VC{vc}-{arch}.zip'
            .replace('{version}', versionMetadata.version)
            .replace('{nts}', ntsRequired ? '-nts' : '')
            .replace('{vc}', versionMetadata.vc)
            .replace('{arch}', options.arch ? options.arch : dev.arch);

        return fileName;
    }
    
    /**
     * Make a download url
     */
    makePackageUrl(versionMetadata, packageFileName) {
        let baseUrl = versionMetadata.is_archive
            ? WINDOWS_METADATA.archive_download_url
            : WINDOWS_METADATA.base_download_url;
        baseUrl += baseUrl.length - 1 !== baseUrl.lastIndexOf('/')
            ? '/'
            : '';
        return _url.resolve(baseUrl, packageFileName);
    }
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
        let version = this.ensuresVersion(options);
        
        if (!version && options.version) {
            throw dev.createError('Version ' + options.version +' not found or invalid formated!');
        }

        if (!version) {
            throw dev.createError('Parameter @version is required');
        }
        
        let versionMetadata = this._toolset.getVersionMetadata(version);
        let packageFile = this._toolset.downloadPackageFile(versionMetadata, options);
        
        try {
            this._toolset.ensuresDirectoryVersion(version);
            this._toolset.unpackFile(version, packageFile);
            this._toolset.destroyPackageFile()
        } catch (error) {
            this._toolset.rollbackVersion(version);
            throw error;
        }
        
        dev.printf('PHP version ' + version + ' installed successfuly!')
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
