#!/bin/sh
# Shared by install-aio.sh and install-baremetal.sh - not meant to be run
# directly.

build_app() {
	repo_dir="$1"

	command -v npm >/dev/null 2>&1 || { echo "npm is required to build the frontend (needs Node.js)." >&2; exit 1; }
	command -v composer >/dev/null 2>&1 || { echo "composer is required to install PHP dependencies." >&2; exit 1; }

	(
		cd "$repo_dir"
		echo "==> Installing npm dependencies..."
		npm install
		echo "==> Building frontend..."
		npm run build
		echo "==> Installing composer dependencies..."
		composer install --no-dev
	)
}
