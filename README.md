# Day Planner

A Nextcloud app for scheduling Deck cards on a time-grid timeline. See
[`plan.md`](plan.md) for the full design.

App id: `dayplanner`. Targets Nextcloud 32+ and the latest Deck.

## Status

- **Phase 1 (setup)**: done. Empty app page loading inside Nextcloud.
- **Phase 2 (MVP)**: done, confirmed working in a real browser. Board
  checkboxes (persisted via a small settings endpoint), a day-view
  timeline (FullCalendar) showing cards from selected boards colored by
  board, a backlog of unscheduled cards draggable onto the timeline,
  move/resize writing back to Deck's `startdate`/`duedate`, and a card
  editor sidebar (title, done, start/due, description, open-in-Deck).
- **Phase 3 (card creation and views)**: implemented, not yet
  browser-verified (this dev environment has no browser). Quick-add via
  drag-select on the timeline and a `+ Add` button in the backlog (both
  through a shared dialog with board/list pickers); a duration field
  (`90m`/`1h30`/`1:30`/`1.5h` plus 15m/30m/1h/2h presets) wired into the
  card editor per plan.md's rules; a fuller card editor (labels,
  assigned users, move to another board/list, archive, delete); 3-day
  and week views alongside the day view; due-date markers on the
  timeline for backlog cards that have only a due date; and backlog
  filters (list, label, assigned-to-me, due-soon).
- **Phase 4 (integration)**: done. No activity tab (see below) and no
  Nextcloud Text editor upgrade (see below); everything else shipped.
  - **Calendar events**: verified against real recurring/all-day/timed
    events created via CalDAV. A `CalendarController` uses Nextcloud's
    public `OCP\Calendar\IManager` API (no CalDAV REPORT fallback
    needed - it reliably expands recurrences itself); calendars get a
    checkbox section in the left panel plus a "hide all" switch, both
    persisted; the timeline shows read-only, diagonally-striped events
    that reload when the visible range changes and every 5 minutes;
    clicking one opens a small dialog with time/location and, if the
    Calendar app is enabled, a link to that day in Calendar. Deck's
    board-calendars turned out not to be registered through this API at
    all, so the "exclude Deck's own calendars" concern from plan.md
    doesn't actually apply here - nothing to filter out. All-day events
    are not shown at all - see Known Issues.
  - **Personal settings**: working hours, snap step and default
    duration are a real settings page (Settings → Personal → Day
    Planner) via a `PreferencesService` + REST endpoints, wired into
    the timeline's visible hour range/snap grid and into backlog-drag
    and quick-add default durations.
  - **Comments and attachments**: tabs in the card editor. Deck's own
    frontend turned out to use a simpler, separate set of OCS-style
    routes for these (found by watching the server access log during
    manual testing) rather than the board/stack-scoped ones the rest of
    this app uses - comments and attachment list/upload/delete go
    through those; attachment download still needs the older
    board/stack-scoped route since there's no OCS equivalent for it.
  - **Description preview**: a Markdown preview toggle (`NcRichText`,
    `useMarkdown`/`useExtendedMarkdown`) per plan.md's "start with a
    Markdown text box with a preview." The Text-app upgrade mentioned
    right after that in the plan is *not* done - the Text app isn't
    installable in this dev container (appstore lookup fails, likely a
    version-compatibility gap for a Nextcloud release this new), so
    there was no way to verify its embedding API here.
  - **Dashboard widget**: "Today's plan" - a classic `IWidget` (not
    server-rendered `IAPIWidget`, since the card data lives in Deck and
    this app only ever talks to Deck from the browser) that mounts its
    own small Vue app into the Dashboard grid via
    `OCA.Dashboard.register()`, listing today's scheduled cards from
    your selected boards.
  - **Activity tab: dropped, not just deferred.** `OCP\Activity\IManager`
    (the core interface) is publish/settings-only - no query method at
    all. Activity storage and retrieval genuinely lives in the separate
    "activity" app, and neither this dev container nor the target
    server actually has it installed (confirmed: no Deck card activity
    shows up there either). There's nothing to integrate against, so
    this isn't being built.

## Known issues

- **No all-day row.** `allDaySlot` is off in `Timeline.vue`. FullCalendar's
  all-day row resisted every attempt to keep it sized to its actual content
  once events loaded - it would balloon to a few hundred pixels of empty
  space above the hourly grid instead of staying compact. Tried, in order:
  a plain CSS `min-height` override, the same with `!important` (FullCalendar
  sets the real height inline via JS row-balancing, so a static stylesheet
  rule can't reliably outrank it), forcing the inline style back down via JS
  on `eventsSet`/`datesSet`, and finally a `MutationObserver` reacting to
  FullCalendar's own DOM changes so the correction couldn't lose a timing
  race - none of it stuck. The row-balancing logic appears to run somewhere
  we don't have a hook into (or on every animation frame, rather than in
  response to a DOM mutation we can observe). Net effect: all-day calendar
  events are fetched but filtered out of what's passed to FullCalendar
  (`Timeline.vue`'s `calendarEvents` computed) rather than shown badly.
  Revisit if a future FullCalendar version changes this, or if someone
  finds the actual mechanism (worth checking FullCalendar's own GitHub
  issues for `slotMinTime`/`allDaySlot` + row height, which weren't
  searched during this pass).

Notable bug caught and fixed along the way: adding a second Vite entry
point (for the settings page) tripped up
`vite-plugin-css-injected-by-js`, which by default injects all CSS into
only one arbitrarily-chosen entry when there are several - it picked
the settings bundle, silently leaving the main app with none of its
`@nextcloud/vue` component styles. Fixed via `jsAssetsFilterFunction`
in `vite.config.js` so every entry gets its own copy.

Note for local dev: this dev container ships with Nextcloud's `debug`
config on, which disables its normal cache-busting query string on
built assets (intentionally, to support Chrome workspace overrides) —
but the static file server still sends a long `Cache-Control`. We
turned `debug` off so the app's `<version>` in `appinfo/info.xml`
drives cache-busting instead (matching how a real, non-debug server
behaves); bump that version after any frontend change you want a
browser to actually pick up, and re-run `occ app:disable dayplanner &&
occ app:enable dayplanner` in this dev container to apply it.

## Project layout

```
appinfo/       app id, navigation entry, routes (info.xml, routes.php)
lib/           PHP backend (OCA\DayPlanner namespace)
  AppInfo/     app bootstrap
  Controller/  page controller serving the Vue app shell
templates/     PHP template that mounts the Vue app
src/           Vue 3 frontend source
js/            built frontend output (generated, gitignored)
vendor/        composer dependencies (generated, gitignored)
```

## Building the frontend

```sh
npm install
npm run build      # production build -> js/dayplanner-main.mjs
npm run watch       # rebuild on change, for development
```

```sh
composer install
```

## Running it against a real Nextcloud + Deck instance

This app has no standalone dev server — it has to run inside Nextcloud.
The quickest way (no docker-compose project needed) is the standalone dev
container from the [`nextcloud-docker-dev`](https://github.com/nextcloud/nextcloud-docker-dev)
project, which fetches a given Nextcloud server branch and lets you mount
your app straight in:

```sh
docker run -d --name nc-dev -p 8080:80 \
  -e SERVER_BRANCH=stable34 \
  -v /path/to/nc-dayplanner:/var/www/html/apps-extra/dayplanner \
  ghcr.io/nextcloud/nextcloud-dev-php84:latest
```

- `SERVER_BRANCH` should match your Nextcloud server's major version
  (`stable34`, `stable32`, a tag like `v32.0.1`, etc). Match the PHP image
  tag (`nextcloud-dev-php84`, `-php83`, ...) to what that server version
  supports — NC 34 does not yet run on the `-php85` image at the time of
  writing.
- First boot clones the server source and takes a minute or two; watch
  `docker logs -f nc-dev` until you see `Nextcloud already installed` (the
  image ships pre-installed with default accounts - **not** `admin`/`admin`
  despite what you might expect; `occ user:list` only shows uid/display
  name, never the password. Set one explicitly instead of guessing:
  ```sh
  docker exec -u www-data -e OC_PASS=<your-password> nc-dev php occ user:resetpassword admin --password-from-env
  ```
- Install and enable Deck and this app once, via `occ` (no app store UI
  round-trip needed):
  ```sh
  docker exec -u www-data nc-dev php occ app:install deck
  docker exec -u www-data nc-dev php occ app:enable dayplanner
  ```
- Build the frontend on the host as above (`npm install && npm run
  build`, or `npm run watch` while developing) — the container mounts
  this directory directly, so a rebuild is picked up on the next request,
  no container restart needed.
- Visit `http://localhost:8080/apps/dayplanner/`, logging in as `admin`
  with the password you set above.
  - Nextcloud's own login form is finicky to script headlessly (it
    round-trips a CSRF token through cookies, and pretty URLs silently
    lose the HTTP method on this dev image's broken mod_rewrite - use
    `/index.php/...` explicitly); for quick command-line checks, HTTP
    Basic Auth works directly against app routes:
    `curl -u admin:<password> http://localhost:8080/index.php/apps/dayplanner/`.
- Tear down with `docker rm -f nc-dev` (add `-v` if you also want to drop
  its state, though `--rm`-less containers here don't persist anywhere
  else by default).

`docker` and `docker compose` themselves may need installing first
(`apt-get install -y docker.io docker-compose`, then `systemctl start
docker`) in a bare environment.

If Docker truly isn't available, the frontend/backend can still be built
and unit-tested (`npm run build`, `php -l`, later `composer test`), but
the app itself has to be smoke-tested in a real Nextcloud instance as
above.

## Adding Deck as a real composer/npm dependency

Not needed: the frontend talks to Deck's existing REST API
(`/apps/deck/api/v1.0/...`) over HTTP using the logged-in session, so
there's no PHP or JS package dependency on Deck itself — only a runtime
requirement that the Deck app is installed and enabled.
