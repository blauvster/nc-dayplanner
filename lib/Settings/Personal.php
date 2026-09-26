<?php

declare(strict_types=1);

namespace OCA\DayPlanner\Settings;

use OCA\DayPlanner\AppInfo\Application;
use OCA\DayPlanner\Service\PreferencesService;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Services\IInitialState;
use OCP\Settings\ISettings;
use OCP\Util;

class Personal implements ISettings {
	public function __construct(
		private IInitialState $initialState,
		private PreferencesService $preferencesService,
		private ?string $userId,
	) {
	}

	public function getForm(): TemplateResponse {
		$this->initialState->provideInitialState(
			'preferences',
			$this->userId === null ? PreferencesService::DEFAULTS : $this->preferencesService->get($this->userId),
		);

		Util::addScript(Application::APP_ID, 'dayplanner-settings');
		return new TemplateResponse(Application::APP_ID, 'settings-personal');
	}

	public function getSection(): string {
		return Application::APP_ID;
	}

	public function getPriority(): int {
		return 50;
	}
}
