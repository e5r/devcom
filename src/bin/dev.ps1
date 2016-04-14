# Copyright (c) E5R Development Team. All rights reserved.
# Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

#Requires -Version 2

for($count = 0; $count -lt $args.length; $count++) {
    $value = $args[$count]
    if("$value".contains(" ")) {
        $value = "$value".replace("`"", "```"")
        $value = "`"$value`""
    }
    $args[$count] = $value
}

$jsengine = [io.path]::getfullpath("$psscriptroot\..\tools\jsengine.exe")
$devscript = [io.path]::getfullpath("$psscriptroot\..\lib\node_modules\e5r-dev.js")
$postfile = [io.path]::getfullpath("$psscriptroot\..\tools\dev-envvars.ps1")
$env:E5RDEV_CALLER = "powershell"

if(!(test-path "$jsengine")) {
    "`"$jsengine`" not found!" | Write-Host
    "Run installer for E5R Tools for Development Team before." | Write-Host
    return
}

iex "& `"$jsengine`" `"$devscript`" $args --shell=powershell"

if(test-path $postfile){
    iex "& $postfile"
    remove-item $postfile
}