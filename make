#!/bin/sh

# Copyright (c) E5R Development Team. All rights reserved.
# Licensed under the Apache License, Version 2.0. More license information in LICENSE.txt.

script_file=`readlink -f "${0}"`
script_dir=`dirname ${script_file}`

${script_dir}/node_modules/.bin/gulp ${*}
