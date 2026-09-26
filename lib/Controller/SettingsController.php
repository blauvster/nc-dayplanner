<?php

declare(strict_types=1);

namespace OCA\DayPlanner\Controller;

use OCA\DayPlanner\AppInfo\Application;
use OCA\DayPlanner\Service\PreferencesService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IConfig;
use OCP\IRequest;

class SettingsController extends Controller {
	public function __construct(
		IRequest $request,
		private IConfig $config,
		private PreferencesService $preferencesService,
		private ?string $userId,
	) {
		parent::__construct(Application::APP_ID, $request);
	}

	#[NoAdminRequired]
	public function getSelectedBoards(): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}
		return new DataResponse(['boardIds' => $this->readSelectedBoards()]);
	}

	#[NoAdminRequired]
	public function setSelectedBoards(array $boardIds): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}
		$ids = array_values(array_unique(array_map('intval', $boardIds)));
		$this->config->setUserValue($this->userId, Application::APP_ID, 'selected_boards', json_encode($ids));
		return new DataResponse(['boardIds' => $ids]);
	}

	private function readSelectedBoards(): array {
		$value = $this->config->getUserValue($this->userId, Application::APP_ID, 'selected_boards', '[]');
		$ids = json_decode($value, true);
		return is_array($ids) ? $ids : [];
	}

	#[NoAdminRequired]
	public function getCalendarSettings(): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}
		return new DataResponse($this->readCalendarSettings());
	}

	#[NoAdminRequired]
	public function setCalendarSettings(array $calendarUris, bool $hideAll = false): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}
		$uris = array_values(array_unique(array_map('strval', $calendarUris)));
		$this->config->setUserValue($this->userId, Application::APP_ID, 'selected_calendars', json_encode($uris));
		$this->config->setUserValue($this->userId, Application::APP_ID, 'hide_calendar_events', $hideAll ? '1' : '0');
		return new DataResponse(['calendarUris' => $uris, 'hideAll' => $hideAll]);
	}

	private function readCalendarSettings(): array {
		$value = $this->config->getUserValue($this->userId, Application::APP_ID, 'selected_calendars', '[]');
		$uris = json_decode($value, true);
		$hideAll = $this->config->getUserValue($this->userId, Application::APP_ID, 'hide_calendar_events', '0') === '1';
		return ['calendarUris' => is_array($uris) ? $uris : [], 'hideAll' => $hideAll];
	}

	#[NoAdminRequired]
	public function getPreferences(): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}
		return new DataResponse($this->preferencesService->get($this->userId));
	}

	#[NoAdminRequired]
	public function setPreferences(
		string $workingHoursStart,
		string $workingHoursEnd,
		int $snapStepMinutes,
		int $defaultDurationMinutes,
	): DataResponse {
		if ($this->userId === null) {
			return new DataResponse(['message' => 'Not logged in'], Http::STATUS_UNAUTHORIZED);
		}
		if ($snapStepMinutes <= 0 || $defaultDurationMinutes <= 0) {
			return new DataResponse(['message' => 'Values must be greater than zero'], Http::STATUS_BAD_REQUEST);
		}
		return new DataResponse($this->preferencesService->set(
			$this->userId,
			$workingHoursStart,
			$workingHoursEnd,
			$snapStepMinutes,
			$defaultDurationMinutes,
		));
	}
}
