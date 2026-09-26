<?php

declare(strict_types=1);

return [
    'routes' => [
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
        ['name' => 'settings#getSelectedBoards', 'url' => '/settings/boards', 'verb' => 'GET'],
        ['name' => 'settings#setSelectedBoards', 'url' => '/settings/boards', 'verb' => 'PUT'],
        ['name' => 'settings#getCalendarSettings', 'url' => '/settings/calendars', 'verb' => 'GET'],
        ['name' => 'settings#setCalendarSettings', 'url' => '/settings/calendars', 'verb' => 'PUT'],
        ['name' => 'calendar#index', 'url' => '/calendars', 'verb' => 'GET'],
        ['name' => 'calendar#events', 'url' => '/calendar-events', 'verb' => 'GET'],
        ['name' => 'settings#getPreferences', 'url' => '/settings/preferences', 'verb' => 'GET'],
        ['name' => 'settings#setPreferences', 'url' => '/settings/preferences', 'verb' => 'PUT'],
    ],
];
