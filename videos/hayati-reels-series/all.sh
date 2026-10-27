#!/bin/bash
cd "$(dirname "$0")"
for v in "$@"; do VARIANT=$v node render.js >/dev/null && V=$v ./mix.sh; done
