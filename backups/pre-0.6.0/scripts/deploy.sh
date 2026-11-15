#!/bin/sh
# Deploy the rebuilt client bundle to the desktop profile.
#
# The profile may install this package as a `link:`, in which case the profile
# already serves the files from this checkout and there is nothing to copy:
# rebuild, then fully restart the app (a page refresh is not enough, because the
# host half only reloads on restart).
#
# On a legacy npm install (real directory in node_modules) the script falls
# back to overwriting only `client/client.js`, as before.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROFILE_DIR="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}"
TARGET_DIR="$PROFILE_DIR/node_modules/dsh-charlotte"

if [ ! -e "$TARGET_DIR" ]; then
  echo "deploy: dsh-charlotte is not installed in $PROFILE_DIR" >&2
  exit 1
fi

node "$HERE/build-client.mjs"

if [ -L "$TARGET_DIR" ]; then
  echo "deploy: profile links this checkout, nothing to copy."
  echo "deploy: fully quit and reopen the app to load host + client changes."
  exit 0
fi

cp "$HERE/../client/client.js" "$TARGET_DIR/client/client.js"
echo "deployed client bundle -> $TARGET_DIR/client/client.js"
echo "refresh the Harness page (Cmd+R) to load it."
