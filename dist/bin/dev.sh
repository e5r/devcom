#!/bin/sh

# Copyright (c) E5R Development Team. All rights reserved.
# Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

localdir="${HOME}/.dev"
jsengine="${localdir}/tools/jsengine"
devscript="${localdir}/lib/node_modules/e5r-dev.js"
postfile="${localdir}/tools/dev-envvars.sh"

if [ ! -f ${jsengine} ]; then
    echo "${jsengine} not found!"
    echo "Run installer for E5R Tools for Development Team before."   
    return 1
fi

# @HACK: Update environment after install
if [ ! "${1}" = "update-devenvvars" ]; then
    ${jsengine} "${devscript}" ${*} --shell=sh
fi

# Update environment from postfile
if [ -f "${postfile}" ]; then
    source "${postfile}"
    rm -f "${postfile}"
fi
