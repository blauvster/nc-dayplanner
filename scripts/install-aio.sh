#!/bin/sh
# Build Day Planner and install it into a running Nextcloud AIO instance,
# then enable it. Run this on any machine with `docker` access to the AIO
# host (it doesn't need to be the host itself).
#
# Usage:
#   ./scripts/install-aio.sh [container-name]
#
# Defaults to the standard AIO container name; pass a different one if
# you've renamed it, or set the CONTAINER environment variable. Re-run
# this same command to pick up updates after a `git pull`.
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CONTAINER="${1:-${CONTAINER:-nextcloud-aio-nextcloud}}"
APP_ID=dayplanner
TARGET="/var/www/html/custom_apps/$APP_ID"

command -v docker >/dev/null 2>&1 || { echo "docker is required on PATH." >&2; exit 1; }
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || {
	echo "No running container named '$CONTAINER'." >&2
	echo "Usage: $0 [container-name]" >&2
	exit 1
}

. "$SCRIPT_DIR/_build.sh"
build_app "$REPO_DIR"

echo "==> Copying into $CONTAINER:$TARGET ..."
docker exec "$CONTAINER" rm -rf "$TARGET"
docker cp "$REPO_DIR" "$CONTAINER:$TARGET"
docker exec "$CONTAINER" rm -rf "$TARGET/.git" "$TARGET/node_modules"

echo "==> Fixing ownership..."
docker exec --user root "$CONTAINER" chown -R www-data:www-data "$TARGET"

echo "==> Enabling the app..."
docker exec --user www-data "$CONTAINER" php occ app:enable "$APP_ID"

if ! docker exec --user www-data "$CONTAINER" php occ app:list | grep -q '^  - deck:'; then
	echo "Note: the Deck app isn't enabled yet, and Day Planner needs it:" >&2
	echo "  docker exec --user www-data $CONTAINER php occ app:install deck" >&2
fi

echo "Done - Day Planner is installed and enabled in $CONTAINER."
