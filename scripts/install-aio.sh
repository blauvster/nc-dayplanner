#!/bin/sh
# Build Day Planner and install it into a running Nextcloud AIO instance,
# then enable it. Run this on any machine with `docker` access to the AIO
# host (it doesn't need to be the host itself).
#
# Usage:
#   ./scripts/install-aio.sh
#
# Re-run this same command to pick up updates after a `git pull`.
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CONTAINER=nextcloud-aio-nextcloud
APP_ID=dayplanner
TARGET="/var/www/html/custom_apps/$APP_ID"

command -v docker >/dev/null 2>&1 || { echo "docker is required on PATH." >&2; exit 1; }
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || {
	echo "No running container named '$CONTAINER' - is Nextcloud AIO running?" >&2
	exit 1
}

occ_needs_upgrade() {
	docker exec --user www-data "$CONTAINER" php occ status 2>&1 | grep -q "needsDbUpgrade: true"
}

# A pending upgrade (core, or another app's un-run migration) is a much
# bigger, riskier operation than installing an app - this script won't
# trigger one for you, just refuse to proceed on top of one.
if occ_needs_upgrade; then
	echo "Nextcloud already has a pending upgrade. Run this first, then re-run this script:" >&2
	echo "  docker exec --user www-data $CONTAINER php occ upgrade" >&2
	exit 1
fi

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

# A version bump between releases registers a pending migration for
# Nextcloud to run, which blocks the web UI (with a "command line updater"
# message) until `occ upgrade` runs - same as any other app update. Tell
# the user right away instead of leaving them to discover this cold.
if occ_needs_upgrade; then
	echo "" >&2
	echo "This update needs Nextcloud to finish applying it before the web UI works again. Run:" >&2
	echo "  docker exec --user www-data $CONTAINER php occ upgrade" >&2
	exit 1
fi

echo "Done - Day Planner is installed and enabled in $CONTAINER."
