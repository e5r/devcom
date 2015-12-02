:: Copyright (c) E5R Development Team. All rights reserved.
:: Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

@echo off

set JSENGINE=%~dp0..\tools\jsengine.exe
set DEVSCRIPT=%~dp0..\lib\node_modules\e5r-dev.js
set POSTFILE=%~dp0..\tools\dev-envvars.cmd
set E5RDEV_CALLER=cmd

if not exist "%JSENGINE%" (
    echo "%JSENGINE%" not found!
    echo Run installer for E5R Tools for Development Team before.
    goto :end
)

:: @HACK: Update environment after install
if "%1" neq "update-devenvvars" (
    "%JSENGINE%" "%DEVSCRIPT%" %* --shell=cmd
)

if exist %POSTFILE% (
    call %POSTFILE%
    del %POSTFILE%
)

:end