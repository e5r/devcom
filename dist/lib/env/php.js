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

/** @constant {string} */
const ENVIRONMENT_VARNAME = 'E5R_ENV_PHP';

/**
 * @todo: Implements no supported platforms.
 * 
 * 'darwin', 'freebsd', 'linux', 'sunos'
 */

/** @constant {array} */
const SUPPORTED_PLATFORMS = [
    'win32'
];

/**
 * A tool set for all or undefined platform
 * @class
 * 
 * @todo: move to separated file
 * 
 * Throw exception if method if for a specific platform
 */
class PhpEnvironmentTool {

    constructor() {
        this.__metadata = {};
    }

    get devTool() {
        return this.__devTool;
    }

    set devTool(value) {
        this.__devTool = value;
    }

    get options() {
        return this.__options;
    }

    set options(value) {
        this.__options = value;
    }

    get metadata() {
        return this.__metadata;
    }

    set metadata(value) {
        this.__metadata = value;
    }

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

        for (let index in this.metadata.last_versions) {
            let version_parts = this.metadata.last_versions[index].split('=>'),
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
            throw dev.createError('PHP v' + versionMetadata.version + ' not available for "' + arch + '" architecture.');
        }

        if (ntsRequired && !ntsAvailable) {
            throw dev.createError('PHP v'
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
        let versionPath = this.makeVersionPath(version),
            versionPathNew = versionPath + '_new',
            versionPathOld = versionPath + '_old';

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
    postInstall(version) {
        let directories = this.makeDirectoriesVersion(version),
            pathToken = dev.getEnvironmentVarToken(ENVIRONMENT_VARNAME, this.devTool.shell);
        dev.setUserEnvironment(ENVIRONMENT_VARNAME, directories.path, this.devTool.shellOptions);
        dev.addPathToEnvironmentPath(pathToken, this.devTool);
        
        if(this.devTool.shell === 'powershell'){
            let cmdToken = dev.getEnvironmentVarToken(ENVIRONMENT_VARNAME, 'cmd');
            dev.addPathToEnvironmentPath(cmdToken, this.devTool, true);
        }
    }

    /**
     * Update a metadata
     * 
     * @note: Implemented only derived classes
     */
    updateMetadata() {
        throw dev.createError('PhpEnvironmentTool->updateMetadata() not implemented!');
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
        for (let index in this.metadata.versions) {
            let metadata = this.metadata.versions[index];
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
            ? this.metadata.archive_url
            : this.metadata.base_url;
        baseUrl += baseUrl.length - 1 !== baseUrl.lastIndexOf('/')
            ? '/'
            : '';
        return _url.resolve(baseUrl, packageFileName);
    }

    /**
     * Update a metadata
     * 
     * Read HTML from http://windows.php.net and compiles the information in a local
     * cache file valid for 1 day.
     */
    updateMetadata() {
        let metaFilePath = _path.join(this.getEnvironmentPath(), 'metadata-win32.json'),
            tmpFilePath = _path.join(_os.tmpdir(), 'e5r-env-php-metadata-download.html');

        this.metadata = {
            "base_url": "http://windows.php.net/downloads/releases/",
            "base_link_prefix": "/downloads/releases",
            "archive_url": "http://windows.php.net/downloads/releases/archives/",
            "archive_link_prefix": "/downloads/releases/archives",
            "last_versions": [],
            "versions": []
        };

        if (dev.fileExists(metaFilePath)) {
            let stat = _fs.statSync(metaFilePath),
                now = new Date(),
                today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                mdate = new Date(stat.mtime.getFullYear(), stat.mtime.getMonth(), stat.mtime.getDate());

            if (!(mdate < today)) {
                this.metadata = JSON.parse(_fs.readFileSync(metaFilePath));
                return;
            }
        }

        let addVersion = (version, nts, vc, arch, archive) => {
            let metaVersion;

            for (let v in this.metadata.versions) {
                if (this.metadata.versions[v].version === version) {
                    metaVersion = this.metadata.versions[v];
                    break;
                }
            };

            if (!metaVersion) {
                metaVersion = {
                    "version": version,
                    "nts": nts,
                    "vc": vc,
                    "arch": [arch],
                    "is_archive": archive
                };
                this.metadata.versions.push(metaVersion);
            }

            metaVersion.nts = metaVersion.nts || nts;

            if (0 > metaVersion.arch.indexOf(arch)) metaVersion.arch.push(arch);
        }

        let delegateRun = (url, prefix, archive) => {
            dev.downloadSync(url, tmpFilePath);

            let _content = _fs.readFileSync(tmpFilePath).toString(),
                _vr = '[0-9\.]{5,10}',  // Version Regex
                _nr = 'nts-win32|win32', // NTS Regex
                _vcr = '[0-9]{1,2}', // VC Regex
                _ar = 'x86|x64', // Arch Regex
                _fr = '(php-(' + _vr + ')-(' + _nr + ')-vc(' + _vcr + ')-(' + _ar + ')\.zip)', // Filename Regex
                _link = '<a href="' + prefix + '/(.{10,50})">' + _fr + '</a>',
                _rx = new RegExp(_link, 'gi'),
                _rs;

            while (_rs = _rx.exec(_content)) {
                let version = _rs[3],
                    nts = /nts/i.test(_rs[4]),
                    vc = _rs[5],
                    arch = _rs[6];
                addVersion(version, nts, vc, arch, archive);
            }

            _fs.unlinkSync(tmpFilePath);
        }

        dev.mkdir(this.getEnvironmentPath());
        delegateRun(this.metadata.base_url, this.metadata.base_link_prefix, false);
        delegateRun(this.metadata.archive_url, this.metadata.archive_link_prefix, true);

        // Update Minor (X.Y) version
        this.metadata.last_versions = this.metadata.versions.reduce((p, c, i, a) => {
            let result = i === 1 ? [] : p;

            (i === 1 ? [p.version, c.version] : [c.version]).map(version => {
                let __ = version.split('.'),
                    _mj = __[0],
                    _mn = __[1],
                    _fx = __[2],
                    _re = new RegExp(_mj + '\.' + _mn + ' => ' + _mj + '\.' + _mn + '\.([0-9]{1,2})', 'gi');

                let _found = _re.exec(result.toString());

                if (!_found) result.push(_mj + '.' + _mn + ' => ' + version);
                if (_found && parseInt(_found[1]) < parseInt(_fx)) {
                    result[result.indexOf(_found[0])] = _mj + '.' + _mn + ' => ' + version;
                }
            });

            return result;
        });

        // Update Major (X) version

        /**
         * @note: { "5": [3, 0] };
         *           ^    ^  ^
         *           |    |  |.-> Index of Up Minor version
         *           |    |_..--> Up Minor version
         *           |___...----> Major version
         */
        let mj_idx = {},
            mj_number = 0;

        this.metadata.last_versions.map((v, i, a) => {
            let __ = v.split(' => ')[0].split('.'),
                _mj = __[0],
                _mn = __[1];
            if (!mj_idx[_mj]) mj_idx[_mj] = [_mn, i];
            if (mj_idx[_mj] && mj_idx[_mj][0] < _mn) {
                mj_idx[_mj] = [_mn, i];
            }
            if (mj_number < parseInt(_mj)) mj_number = parseInt(_mj);
        });

        // Set Major (X) version
        for (let _idx in mj_idx) {
            let _a = mj_idx[_idx],
                _value = this.metadata.last_versions[_a[1]];
            this.metadata.last_versions[_a[1]] = [_idx, _value].join(',');
        };

        // Set latest version
        if (0 < mj_number) {
            let _idx = mj_idx[mj_number][1],
                _value = this.metadata.last_versions[_idx];
            this.metadata.last_versions[_idx] = ['latest', _value].join(',');
        }

        _fs.writeFileSync(metaFilePath, JSON.stringify(this.metadata, null, 4));
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
        /**
         * @todo: usage dev env install <name> --version <version>
         *    or  usage dev env install <name> <version>
         */
        let version = options.version;
        
        return this._toolset.getLastVersion(version);
    }

    /**
     * Install a new version of PHP if available
     * 
     * @param {object} options
     */
    install(devTool, options) {
        this.toolset.devTool = devTool;
        this.toolset.options = options;
        this.toolset.updateMetadata();

        let version = this.ensuresVersion(options);

        if (!version && options.version) {
            throw dev.createError('PHP v' + options.version + ' not found or invalid formated!');
        }

        if (!version) {
            throw dev.createError('Parameter @version is required');
        }

        try {
            dev.printf('Installing PHP v' + version + '...');

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

        dev.printf('PHP v' + version + ' installed successfuly!')
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
