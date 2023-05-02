#!/usr/bin/env bash

set -e

# Set variables.
PREFIX="refs/tags/"
VERSION=${1#"$PREFIX"}

echo "Preparing npm publish v${VERSION}..."

# Change version string.
cat package.json | jq ".version = \"${VERSION}\"" > package.json.tmp
rm package.json
mv package.json.tmp package.json
