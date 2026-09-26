# Day Planner: plan

A Nextcloud app for scheduling Deck cards on a timeline. It follows the interaction model of [Obsidian Day Planner](https://community.obsidian.md/plugins/obsidian-day-planner): a vertical time grid where cards sit as blocks, a backlog to drag them from, and quick-add straight onto the timeline.

A Gantt chart with one row per card wastes screen space. A time grid with side-by-side blocks fits a whole day on one screen.

**Scope:** personal use on my own server, running the latest Nextcloud (32 or newer) and Deck. An App Store release may come later but doesn't drive the design.

## 1. How it works

- **Day or multi-day timeline** with time running down the screen. Each scheduled card is a block whose height is its duration. Blocks that overlap sit side by side.
- **Board selection first:** the left panel lists your boards with a checkbox each. Only cards on ticked boards appear, on the timeline and in the backlog. The selection is saved. With nothing ticked, the timeline shows a prompt to pick a board.
- **All cards on the selected boards** show by default, whoever they're assigned to. Blocks are colored by board.
- **Backlog sidebar** listing cards on the selected boards that have no start date yet. Filters narrow it down by list (stack), label, "assigned to me" and "due soon". Drag a card onto the timeline to schedule it.
- **Direct editing:** drag a block to move it, pull its edge to change the duration, or tick it done.
- **Done cards** stay on the timeline, faded with the title struck through, so the day shows what actually got done.
- **Missed cards:** a card scheduled in the past that isn't done simply stays where it was. There is no overdue list and no automatic roll-over.
- **Card editor panel on the right:** clicking a block or a backlog card opens its details in a panel next to the timeline, so you never have to leave the app for Deck. The panel can be hidden and shown again, and the app remembers which you chose.
- **Quick add:** drag across empty time, type a title, pick a board and list, and the app creates a real Deck card with that slot already set.
- **Context:** a line showing the current time, and markers where Deck due dates fall.
- **Calendar events:** your Nextcloud calendar events show on the timeline next to your cards, so you can plan work around meetings. See "Calendar events" below.

### Layout

```
+-------------+------------------------------+----------------+
| Boards [x]  | Timeline (day / 3-day / week)| Card editor    |
| Calendars   |                              | (right,        |
| Backlog     |  08:00  [Card A     ]        | can be hidden) |
| (left, can  |  09:00  [Card B][Card C]     |                |
| be hidden)  |  10:00                       |                |
+-------------+------------------------------+----------------+
```

This is the standard Nextcloud app layout: `NcAppNavigation` on the left, `NcAppContent` in the middle and `NcAppSidebar` on the right. Hiding either side panel gives the timeline more room.

### Card editor panel

It edits the card through Deck's API. Changes save automatically after a short pause in typing, and each field shows when it is saving and when it has saved.

| Section  | Fields                                                                |
|----------|-----------------------------------------------------------------------|
| Header   | Title, done checkbox, board and list (changing them moves the card)   |
| Schedule | Start date and time, due date and time, duration (rules in section 2) |
| Details  | Description (Markdown), labels, assigned users                        |
| Actions  | Unschedule, archive, delete, open in Deck                             |

- **Description:** start with a Markdown text box with a preview. Later, use the Nextcloud Text editor, as Deck itself does, when the Text app is installed.
- **Later:** comments, attachments and activity as extra tabs in the panel. Until then, "open in Deck" covers them.
- **Keyboard:** `Esc` closes the panel. Arrow keys move between cards on the timeline while the panel is open.
- **Narrow screens:** the panel covers the timeline instead of sitting next to it.

### Calendar events

- **When they appear:** whenever the user has calendars. Calendars are part of Nextcloud itself, so this doesn't depend on the Calendar app. The Calendar app only matters for the "open in Calendar" link, which is shown only when that app is enabled.
- **How they look:** in each calendar's own color, but drawn differently from cards (outlined or striped, no done checkbox), so it's always clear what is a card and what is an event. All-day events go in the all-day row at the top of the timeline.
- **Read-only:** events can't be dragged or resized. Clicking one opens a small popover with the time and location, plus a link that opens the event in the Calendar app when it is installed. Cards can be dropped on top of events; they show side by side.
- **Choosing calendars:** the left panel gets a "Calendars" section with a checkbox per calendar, plus a switch to hide all events. The choice is saved in personal settings.
- **No duplicates:** Deck publishes its boards as calendars, so cards with dates also appear as calendar events. Those Deck calendars are always left out, otherwise every card would show twice.
- **Recurring events** show each occurrence in the visible range.
- **Updates:** events reload when the visible range changes and at a regular interval.

## 2. Key design decision: the schedule lives in Deck

Deck cards have both a **start date** (`startdate`) and a **due date** (`duedate`). The schedule is stored directly on the card, so the app doesn't need a table of its own for it.

- **Block on the timeline =** `startdate` **to** `duedate`**.** Moving a block changes both dates. Resizing it changes `duedate`.
- **Scheduling from the backlog** sets `startdate` to where the card was dropped and `duedate` to start plus a default duration (for example 30 minutes, set in settings).
- **"Unscheduled"** means the card has no `startdate`.
- **Cards with only a due date** show up in the backlog with a due-date marker on the timeline. Dropping one on the timeline sets its start and keeps its due date if that is later than the start. Otherwise the default duration is used.
- **Cards with only a start date** show up as blocks with the default duration.
- **Unscheduling** a block clears `startdate` and leaves `duedate` alone.

### Setting a duration

Besides dragging, a card's length can be typed in as a **duration**. The field appears in the card editor panel, in quick-add and in the backlog. It accepts `90m`, `1h30`, `1:30` or `1.5h`, and there are preset buttons (15m, 30m, 1h, 2h).

Deck has no duration field. The app works out the duration from the two dates and writes the result back as dates:

| Dates set on the card | What entering a duration does                             |
|-----------------------|-----------------------------------------------------------|
| Start and due         | Keeps the start and sets **due = start + duration**       |
| Only start            | Sets **due = start + duration**                           |
| Only due              | <details>                                                 | \
|                       | <summary></summary>                                       | \
|                       | Sets **start = due âˆ’ duration**                           | \
|                       |                                                           | \
|                       | </details>                                                | \
|                       |                                                           |
| Neither               | The field is disabled until a start or due date is picked |

- The field shows the current duration (due minus start) when both dates are set.
- A duration must be greater than zero. Durations that cross midnight are allowed and show as a block that continues into the next day in multi-day views.

What follows from this:

- **The schedule is shared.** Everyone on the board sees the same dates, in Deck and here. There is no separate personal plan.
- **The due date is the end of the planned block**, not a separate deadline. Dragging a block always moves the start and due date together. This is a deliberate choice: there is no "keep due date" mode.
- **One time range per card.** Splitting work over several sessions would need either several cards or, later, a small table of extra slots kept by this app.
- **It works elsewhere too:** Deck's calendar integration and other clients will show the same dates.

## 3. Architecture

| Layer           | Choice                                                                                                                                                                                                                                                                                                                                   |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| App skeleton    | Nextcloud app generator (apps.nextcloud.com/developer/apps/generate)                                                                                                                                                                                                                                                                     |
| Backend         | Thin PHP: serves the app page and stores personal settings (selected boards, selected calendars, working hours, snap step, default duration). No database table for the schedule.                                                                                                                                                        |
| Target versions | Nextcloud 32 or newer, and the latest Deck (it must include card start dates). No support for older versions.                                                                                                                                                                                                                            |
| Deck access     | The frontend calls Deck's REST API (`/apps/deck/api/v1.0/...`) using the logged-in session. It reads cards and writes `title`, `startdate`, `duedate` and `done`.                                                                                                                                                                        |
| Calendar access | A backend endpoint returns the events for a time range. It uses Nextcloud's public calendar API (`OCP\Calendar\IManager`), leaves out Deck's calendars and expands recurring events. If that API doesn't expand recurrences reliably, fall back to a CalDAV `REPORT` with `expand` from the frontend. It works without the Calendar app. |
| Frontend        | Vue 3, `@nextcloud/vue`, Vite (`@nextcloud/vite-config`), Pinia                                                                                                                                                                                                                                                                          |
| Timeline        | **FullCalendar** day and week time-grid views, with dragging from the backlog. The Nextcloud Calendar app uses the same library, so it looks native, and it already handles overlaps, resizing and snapping.                                                                                                                             |
| Dev environment | Docker (`juliushaertl/nextcloud-docker-dev`) with Deck installed                                                                                                                                                                                                                                                                         |

## 4. Phases

1. **Setup**
   - Skeleton app, Docker dev instance, Deck installed, empty page that loads.
2. **MVP**
   - Board checkboxes in the left panel, saved in settings
   - Load cards from the selected boards, including `startdate` and `duedate`
   - Day view and backlog, blocks colored by board, done cards faded and struck through
   - Drag to schedule, move and resize
   - Card editor panel with the basics: title, done, start, due, description, open in Deck
3. **Card creation and views**
   - Quick-add on the timeline and in the backlog
   - Duration field with presets (rules in section 2)
   - Full card editor panel: labels, assigned users, moving to another board or list, archive, delete
   - 3-day and week views
   - Done checkbox
   - Current-time line and due-date markers
   - Backlog filters
4. **Integration**
   - Calendar events on the timeline: read-only, per-calendar toggles, Deck calendars left out, recurring events expanded
   - Comments, attachments and activity in the card editor panel
   - Nextcloud Text editor for descriptions
   - Dashboard widget showing "today's plan"
   - Personal settings (working hours, snap step, default duration)
5. **Polish**
   - Mobile layout, keyboard shortcuts
   - Tests (PHPUnit and Vitest)
   - Later, if wanted: translations and an App Store release

## 5. Risks

- **Performance:** loading every card on every board can be slow when there are many boards. If needed, add a backend endpoint that combines them, and cache the results.
- **Deck API changes:** start dates are a recent addition to Deck (confirmed on my server: Deck's built-in Gantt view uses them). Keep all Deck calls in one API module so changes to the API only need fixing in one place.
- **Busy boards:** showing all cards on several shared boards can crowd the timeline. Board coloring and the backlog filters are the first answer. An "assigned to me" filter on the timeline itself can be added if it gets too full.
- **Time zones:** Deck stores dates as timestamps. Show them in the browser's time zone.
- **Recurring calendar events:** the public calendar API may not expand repeats the way the Calendar app does. Test this early in phase 4 and use the CalDAV fallback if needed.
- **Editing conflicts:** another user may change a card's dates while it is shown here. Refresh cards regularly and before each write.

## 6. Decisions made

| Question               | Decision                                                                     |
|------------------------|------------------------------------------------------------------------------|
| Which cards show       | All cards on the boards ticked in the left panel; filters narrow the backlog |
| Several boards at once | Yes, ticked in the left panel, colored by board                              |
| Missed cards           | Stay where they were; no overdue list or roll-over                           |
| Dragging a block       | Start and due date move together                                             |
| Done cards             | Stay on the timeline, faded and struck through                               |
| Calendar events        | Shown whenever the user has calendars, with or without the Calendar app      |
| Audience               | Personal use on my own server                                                |
| Versions               | Nextcloud 32 or newer, latest Deck (start dates confirmed on the server)     |
