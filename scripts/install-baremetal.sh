#!/bin/sh
# Build Day Planner and install it into a native (non-Docker) Nextcloud
# instance, then enable it. Run as root (needed to chown files to the web
# server user and to sudo -u it for occ).
#
# Usage:
#   ./scripts/install-baremetal.sh /path/to/nextcloud [web-user]
#
# web-user defaults to www-data (Debian/Ubuntu, and most Alpine setups
# too - check yours if unsure). Re-run this same command to pick up
# updates after a `git pull`.
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
NEXTCLOUD_PATH="${1:?Usage: $0 /path/to/nextcloud [web-user]}"
WEB_USER="${2:-www-data}"
APP_ID=dayplanner
TARGET="$NEXTCLOUD_PATH/custom_apps/$APP_ID"

[ -f "$NEXTCLOUD_PATH/occ" ] || {
	echo "'$NEXTCLOUD_PATH' doesn't look like a Nextcloud install (no occ found there)." >&2
	exit 1
}

. "$SCRIPT_DIR/_build.sh"
build_app "$REPO_DIR"

echo "==> Copying into $TARGET ..."
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -a "$REPO_DIR"/. "$TARGET"/
rm -rf "$TARGET/.git" "$TARGET/node_modules"

echo "==> Fixing ownership..."
chown -R "$WEB_USER":"$WEB_USER" "$TARGET"

echo "==> Enabling the app..."
sudo -u "$WEB_USER" php "$NEXTCLOUD_PATH/occ" app:enable "$APP_ID"

if ! sudo -u "$WEB_USER" php "$NEXTCLOUD_PATH/occ" app:list | grep -q '^  - deck:'; then
	echo "Note: the Deck app isn't enabled yet, and Day Planner needs it:" >&2
	echo "  sudo -u $WEB_USER php $NEXTCLOUD_PATH/occ app:install deck" >&2
fi

echo "Done - Day Planner is installed and enabled in $NEXTCLOUD_PATH."
