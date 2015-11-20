:: Copyright (c) E5R Development Team. All rights reserved.
:: Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

@echo off

set JSENGINE=%~dp0..\tools\jsengine.exe
set JSOPTIONS = --use_strict --caller=cmd
set DEVSCRIPT=%~dp0..\tools\dev.js
set POSTFILE=%~dp0..\tools\dev-envvars.cmd

if not exist "%JSENGINE%" (
    echo "%JSENGINE%" not found!
    echo Run installer for E5R Tools for Development Team before.
    goto :end
)

"%JSENGINE%" %JSOPTIONS% "%DEVSCRIPT%" %*

if exist %POSTFILE% (
    call %POSTFILE%
    del %POSTFILE%
)

:end