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
    "latest,7,7.0 => 7.0.4",
    "5,5.6 => 5.6.19",
    "5.5 => 5.5.33",
    "5.4 => 5.4.45"
];

/** @todo: Move to JSON file and concat on make dist */
/** @todo: Auto make a JSON file from http://windows.php.net/downloads/releases */
const WINDOWS_METADATA = {
    "base_download_url": "http://windows.php.net/downloads/releases/",
    "archive_download_url": "http://windows.php.net/downloads/releases/archives",
    "versions": [
        {
            "version": "7.0.4",
            "nts": true,
            "vc": "14",
            "arch": ["x64", "x86"],
            "is_archive": false
        },
        {
            "version": "7.0.3",
            "nts": true,
            "vc": "14",
            "arch": ["x64", "x86"],
            "is_archive": true
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
            "version": "5.6.19",
            "nts": true,
            "vc": "11",
            "arch": ["x64", "x86"],
            "is_archive": false
        },
        {
            "version": "5.6.18",
            "nts": true,
            "vc": "11",
            "arch": ["x64", "x86"],
            "is_archive": true
        },
        {
            "version": "5.5.33",
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
            "is_archive": true
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
 * @todo: move to separated file
 * 
 * Throw exception if method if for a specific platform
 */
class PhpEnvironmentTool {
    
    /**
     * Get a last version corresponding to a given version
     * 
     * @param {string} version
     * 
     * @return {string}
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

    /**
     * Download a packed file from web
     * 
     * @param {object} versionMetadata
     * @param {object} options
     * 
     * @return {string} Return a downloaded file path
     */
    downloadPackageFile(versionMetadata, options) {
        let ntsAvailable = !!versionMetadata.nts,
            ntsRequired = !!options.nts,
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

        if (dev.pathExists(filePath)) {
            _fs.unlink(filePath);
        }

        dev.downloadSync(fileUrl, filePath);

        if (!_fs.statSync(filePath).isFile()) {
            throw dev.createError('Error on download from ' + fileUrl);
        }

        return filePath;
    }

    /**
     * Get a path to environments artifacts
     * 
     * @return {string}
     */
    getEnvironmentPath() {
        return _path.join(dev.devHome.root, ENVIRONMENT_DIRECTORY, 'php');
    }

    /**
     * Make a path from packed file name
     * 
     * @param {string} fileName
     * 
     * @return {string}
     */
    makePackagePath(fileName) {
        return _path.join(this.getEnvironmentPath(), fileName);
    }

    /**
     * Make a directory version path
     * 
     * @param {string} version
     * 
     * @return {string}
     */
    makeVersionPath(version) {
        return _path.join(this.getEnvironmentPath(), version);
    }

    /**
     * Make a directories path from version string
     * 
     * @param {string} version
     * 
     * @return {object}
     */
    makeDirectoriesVersion(version) {
        let versionPath = this.makeVersionPath(version);
        let versionPathNew = versionPath + '_new';
        let versionPathOld = versionPath + '_old';

        return {
            path: versionPath,
            pathNew: versionPathNew,
            pathOld: versionPathOld
        }
    }

    /**
     * Create directories and backs up if necessary
     * 
     * @param {string} version
     * 
     * @return {object}
     */
    ensuresDirectoryVersion(version) {
        let directories = this.makeDirectoriesVersion(version);

        if (dev.pathExists(directories.pathNew)) dev.rmdir(directories.pathNew);
        if (dev.pathExists(directories.pathOld)) dev.rmdir(directories.pathOld);

        dev.mkdir(directories.pathNew);

        if (dev.pathExists(directories.path)) {
            dev.rename(directories.path, directories.pathOld)
        }

        return directories;
    }

    /**
     * Unpack a file to a directory
     * 
     * @param {string} directory
     * @param {string} packFile
     */
    unpackFile(directory, packFile) {
        dev.extractFile(packFile, directory);
    }

    /**
     * Rollback a version if on error
     * 
     * @param {string} version
     * @param {object} options
     */
    rollbackVersion(version, options) {
        try {
            let metadata = this.getVersionMetadata(version),
                directories = this.makeDirectoriesVersion(version),
                fileName = this.makePackageFileName(metadata, options, !!options.nts),
                filePath = this.makePackagePath(fileName);

            if (dev.pathExists(directories.path) && dev.pathExists(directories.pathOld)) {
                dev.rmdir(directories.path);
            }

            if (dev.pathExists(directories.pathNew)) {
                dev.rmdir(directories.pathNew);
            }

            if (dev.pathExists(directories.pathOld)) {
                dev.rename(directories.pathOld, directories.path);
            }

            if (dev.pathExists(filePath)) {
                _fs.unlinkSync(filePath);
            }
        } catch (_) { /* quiet */ }
    }
    
    /**
     * Make a packed file name from metadata
     * 
     * @note: Implemented only derived classes
     * 
     * @param {object} versionMetadata
     * @param {object} options
     * @param {bool} ntsRequired
     * 
     * @return {string}
     */
    makePackageFileName(versionMetadata, options, ntsRequired) {
        throw dev.createError('PhpEnvironmentTool->makePackageFileName() not implemented!');
    }

    /**
     * Make a packed file url from metadata
     * 
     * @note: Implemented only derived classes
     * 
     * @param {object} versionMetadata
     * @param {string} packageFileName
     * 
     * @return {string}
     */
    makePackageUrl(versionMetadata, packageFileName) {
        throw dev.createError('PhpEnvironmentTool->makePackageUrl() not implemented!');
    }

    /**
     * Get a version metadata from version string
     * 
     * @note: Implemented only derived classes
     * 
     * @param {string} version
     * 
     * @return {object}
     */
    getVersionMetadata(version) {
        throw dev.createError('PhpEnvironmentTool->getVersionMetadata() not implemented!');
    }
    
    /**
     * Post install steps
     * 
     * @note: Implemented only derived classes
     * 
     * @param {string} version
     */
    postInstall(version){
        throw dev.createError('PhpEnvironmentTool->postInstall() not implemented!');
    }
}

/**
 * A tool set for Win32 platform
 * @class
 * 
 * @todo: Move to a separated file
 */
class PhpEnvironmentToolWin32 extends PhpEnvironmentTool {
    
    /**
     * Get a version metadata from version string
     * 
     * @param {string} version
     * 
     * @return {object}
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
     * Make a packed file name from metadata
     * 
     * @param {object} versionMetadata
     * @param {object} options
     * @param {bool} ntsRequired
     * 
     * @return {string}
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
     * Make a packed file url from metadata
     * 
     * @param {object} versionMetadata
     * @param {string} packageFileName
     * 
     * @return {string}
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
            throw dev.createError('Version ' + options.version + ' not found or invalid formated!');
        }

        if (!version) {
            throw dev.createError('Parameter @version is required');
        }

        try {
            let versionMetadata = this._toolset.getVersionMetadata(version);
            let packageFilePath = this._toolset.downloadPackageFile(versionMetadata, options);
            let versionDirectories = this._toolset.ensuresDirectoryVersion(version);

            this._toolset.unpackFile(versionDirectories.pathNew, packageFilePath);
            _fs.unlinkSync(packageFilePath);
            dev.rename(versionDirectories.pathNew, versionDirectories.path);

            if (dev.pathExists(versionDirectories.pathOld)) {
                dev.rmdir(versionDirectories.pathOld);
            }
            
            this._toolset.postInstall(version);
        } catch (error) {
            this._toolset.rollbackVersion(version, options);
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
