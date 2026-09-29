<?php

declare(strict_types=1);

namespace OCA\DayPlanner\Controller;

use DateInterval;
use DateTimeImmutable;
use Exception;
use OCA\DayPlanner\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\Calendar\ICalendar;
use OCP\Calendar\IManager;
use OCP\IRequest;

class CalendarController extends Controller {
	public function __construct(
		IRequest $request,
		private IManager $calendarManager,
		private ?string $userId,
	) {
		parent::__construct(Application::APP_ID, $request);
	}

	/** Calendars the user can pick from in the left panel. */
	#[NoAdminRequired]
	public function index(): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}

		$calendars = [];
		foreach ($this->calendarManager->getCalendarsForPrincipal($this->principalUri()) as $calendar) {
			if ($calendar->isDeleted()) {
				continue;
			}
			$calendars[] = [
				'uri' => $calendar->getUri(),
				'displayName' => $calendar->getDisplayName() ?? $calendar->getUri(),
				'color' => $calendar->getDisplayColor() ?? '#0082c9',
			];
		}
		return new DataResponse($calendars);
	}

	/**
	 * Events across the given calendars (or all, if none given) within a
	 * time range. Recurring events are expanded to individual occurrences.
	 */
	#[NoAdminRequired]
	public function events(string $start, string $end, array $calendars = []): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}

		try {
			$startDate = new DateTimeImmutable($start);
			$endDate = new DateTimeImmutable($end);
		} catch (Exception $e) {
			return new DataResponse(['message' => 'Invalid start/end'], Http::STATUS_BAD_REQUEST);
		}

		$events = [];
		foreach ($this->calendarManager->getCalendarsForPrincipal($this->principalUri()) as $calendar) {
			if ($calendar->isDeleted()) {
				continue;
			}
			if (!empty($calendars) && !in_array($calendar->getUri(), $calendars, true)) {
				continue;
			}

			$results = $calendar->search('', [], [
				'timerange' => ['start' => $startDate, 'end' => $endDate],
				'types' => ['VEVENT'],
			]);

			foreach ($results as $result) {
				$objectUri = $result['uri'] ?? null;
				foreach ($result['objects'] as $object) {
					$event = $this->toEvent($object, $calendar, $objectUri);
					if ($event !== null) {
						$events[] = $event;
					}
				}
			}
		}
		return new DataResponse($events);
	}

	private function principalUri(): string {
		return 'principals/users/' . $this->userId;
	}

	/**
	 * @param array $object one expanded VEVENT, as returned by
	 *                      ICalendar::search() - see OCP\Calendar\IManager
	 *                      for the raw shape.
	 * @param ?string $objectUri the underlying calendar object's filename
	 *                           (e.g. "abc123.ics"), used to build a direct
	 *                           link to the Calendar app's editor for this
	 *                           event - null if the search result didn't
	 *                           carry a 'uri' (defensive; every backend
	 *                           we've seen returns one).
	 */
	private function toEvent(array $object, ICalendar $calendar, ?string $objectUri): ?array {
		if (!isset($object['DTSTART'])) {
			return null;
		}

		[$start, $startParams] = $object['DTSTART'];
		$isAllDay = isset($startParams['VALUE']) && (string)$startParams['VALUE'] === 'DATE';

		$end = null;
		if (isset($object['DTEND'])) {
			[$end] = $object['DTEND'];
		} elseif (isset($object['DURATION'])) {
			[$durationValue] = $object['DURATION'];
			try {
				$end = $start->add(new DateInterval($durationValue));
			} catch (Exception $e) {
				$end = null;
			}
		}
		if ($end === null) {
			$end = $isAllDay ? $start->modify('+1 day') : $start->modify('+1 hour');
		}

		$uid = $object['UID'][0] ?? $calendar->getUri();

		// The Calendar app's "direct edit" route (/apps/calendar/edit/{objectId}/{recurrenceId})
		// takes a base64-encoded CalDAV object path and the occurrence's
		// start time as a Unix timestamp - reverse-engineered by watching
		// what URL Calendar's own UI navigates to when you click an event,
		// since this isn't documented anywhere. Lets "Open in Calendar"
		// jump straight to that event's editor instead of just the day view.
		$objectId = $objectUri !== null
			? base64_encode('/remote.php/dav/calendars/' . $this->userId . '/' . $calendar->getUri() . '/' . $objectUri)
			: null;

		return [
			'id' => $uid . '-' . $start->getTimestamp(),
			'title' => $object['SUMMARY'][0] ?? '(No title)',
			'start' => $start->format(DateTimeImmutable::ATOM),
			'end' => $end->format(DateTimeImmutable::ATOM),
			'allDay' => $isAllDay,
			'location' => $object['LOCATION'][0] ?? null,
			'calendarUri' => $calendar->getUri(),
			'color' => $calendar->getDisplayColor() ?? '#0082c9',
			'objectId' => $objectId,
			'recurrenceId' => $start->getTimestamp(),
		];
	}
}
