# Day Planner

A Nextcloud app for scheduling Deck cards on a time-grid timeline, in the
style of Obsidian's Day Planner plugin. Drag cards from a backlog onto a
day/3-day/week view, resize them to set their duration, and see your
calendar events alongside them. See [`plan.md`](plan.md) for the full
design.

App id: `dayplanner`. Requires Nextcloud 32+ and the Deck app - the
frontend talks to Deck's existing REST API over HTTP using the logged-in
session, so there's no PHP or JS package dependency on Deck itself, only
a runtime requirement that it's installed and enabled.

## Features

- Day, 3-day and week timeline views (FullCalendar), with a backlog of
  unscheduled Deck cards you can drag onto the grid or quick-add via
  drag-select
- Move/resize on the timeline writes straight back to the card's Deck
  `startdate`/`duedate` - no separate database, the schedule lives on the
  card itself
- Full card editor: title, done, dates, duration, Markdown description
  with preview, labels, assignees, move between boards/lists, archive,
  delete, plus comments and attachments
- Backlog filters (list, label, assigned-to-me, due-soon) and due-date
  markers for cards that only have a due date
- Read-only calendar events shown alongside cards, from any of your
  CalDAV calendars
- Personal settings for working hours, snap step and default duration
  (Settings → Personal → Day Planner)
- A "Today's plan" Dashboard widget

## Known limitations

- No activity feed for cards - `OCP\Activity\IManager` is publish-only
  from an app's side; querying it requires the separate "activity" app,
  which isn't a dependency here.
- No embedded Nextcloud Text editor for the description field (uses a
  plain Markdown textarea with a preview toggle instead).
- No automated test suite yet.

## Installation

This app isn't in the App Store - install it from source. Either script
below builds the frontend (`npm`) and PHP autoloader (`composer`), so
have Node.js/npm and Composer available on the machine you run them from.

### Nextcloud AIO

Run from any machine with `docker` access to the AIO host:

```sh
git clone https://github.com/blauvster/nc-dayplanner.git
cd nc-dayplanner
./scripts/install-aio.sh
```

This builds the app, copies it into the container's
`custom_apps/dayplanner`, fixes ownership and enables it via `occ`. Re-run
the same command after a `git pull` to update.

### Bare-metal / other Docker Nextcloud

```sh
git clone https://github.com/blauvster/nc-dayplanner.git
cd nc-dayplanner
sudo ./scripts/install-baremetal.sh /var/www/nextcloud
```

The first argument is your Nextcloud install path; a second, optional
argument overrides the web server user (defaults to `www-data`).

Prerequisites, if you don't already have them:

**Debian / Ubuntu**
```sh
sudo apt update
sudo apt install -y git nodejs npm composer php-cli
```

**Alpine**
```sh
sudo apk add git nodejs npm composer php83-cli
```
(match the `php83` package to whatever PHP version your Nextcloud install
uses)

### Manual build

Both scripts are just a wrapper around this:

```sh
npm install
npm run build       # -> js/dayplanner-main.mjs
composer install --no-dev
```

Then copy the repo into your Nextcloud's `custom_apps/dayplanner`
(excluding `.git` and `node_modules`), make sure the web server user owns
it, and run `occ app:enable dayplanner`.

## Project layout

```
appinfo/       app id, navigation entry, routes (info.xml, routes.php)
lib/           PHP backend (OCA\DayPlanner namespace)
  AppInfo/     app bootstrap
  Controller/  page controller serving the Vue app shell
templates/     PHP template that mounts the Vue app
src/           Vue 3 frontend source
scripts/       install-aio.sh / install-baremetal.sh
js/            built frontend output (generated, gitignored)
vendor/        composer dependencies (generated, gitignored)
```

## Development

There's no standalone dev server - the app has to run inside Nextcloud.
The quickest way (no docker-compose project needed) is the standalone dev
container from [`nextcloud-docker-dev`](https://github.com/nextcloud/nextcloud-docker-dev),
which fetches a given Nextcloud server branch and lets you mount your app
straight in:

```sh
docker run -d --name nc-dev -p 8080:80 \
  -e SERVER_BRANCH=stable34 \
  -v /path/to/nc-dayplanner:/var/www/html/apps-extra/dayplanner \
  ghcr.io/nextcloud/nextcloud-dev-php84:latest
```

- Match `SERVER_BRANCH` (`stable34`, `stable32`, a tag like `v32.0.1`, ...)
  and the PHP image tag (`-php84`, `-php83`, ...) to your target Nextcloud
  version.
- First boot clones the server source and takes a minute or two; watch
  `docker logs -f nc-dev` until you see `Nextcloud already installed`.
  The image ships a pre-installed `admin` account with an unknown
  password - set one explicitly:
  ```sh
  docker exec -u www-data -e OC_PASS=<your-password> nc-dev php occ user:resetpassword admin --password-from-env
  ```
- Install Deck and enable this app once:
  ```sh
  docker exec -u www-data nc-dev php occ app:install deck
  docker exec -u www-data nc-dev php occ app:enable dayplanner
  ```
- `npm run watch` on the host rebuilds on change; the container mounts
  the directory directly so a browser refresh picks it up. This dev image
  ships `debug` mode on, which drops the normal cache-busting query
  string on built assets - so bump `<version>` in `appinfo/info.xml`
  after a frontend change and re-run `occ app:disable dayplanner && occ
  app:enable dayplanner` to make sure the browser actually reloads it.
- Visit `http://localhost:8080/apps/dayplanner/`. Nextcloud's login form
  is finicky to script headlessly (CSRF token round-tripped through
  cookies, and pretty URLs lose the HTTP method on this image's
  mod_rewrite) - use `/index.php/...` explicitly, or HTTP Basic Auth for
  quick command-line checks: `curl -u admin:<password>
  http://localhost:8080/index.php/apps/dayplanner/`.
- Tear down with `docker rm -f nc-dev`.
