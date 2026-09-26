<?php

declare(strict_types=1);

namespace OCA\DayPlanner\Service;

use OCA\DayPlanner\AppInfo\Application;
use OCP\IConfig;

/**
 * Personal preferences shared between the settings page (lib/Settings) and
 * the app's own settings REST endpoint (Controller/SettingsController).
 */
class PreferencesService {
	public const DEFAULTS = [
		'workingHoursStart' => '09:00',
		'workingHoursEnd' => '18:00',
		'snapStepMinutes' => 15,
		'defaultDurationMinutes' => 30,
	];

	public function __construct(
		private IConfig $config,
	) {
	}

	public function get(string $userId): array {
		return [
			'workingHoursStart' => $this->config->getUserValue(
				$userId, Application::APP_ID, 'working_hours_start', self::DEFAULTS['workingHoursStart']),
			'workingHoursEnd' => $this->config->getUserValue(
				$userId, Application::APP_ID, 'working_hours_end', self::DEFAULTS['workingHoursEnd']),
			'snapStepMinutes' => (int)$this->config->getUserValue(
				$userId, Application::APP_ID, 'snap_step_minutes', (string)self::DEFAULTS['snapStepMinutes']),
			'defaultDurationMinutes' => (int)$this->config->getUserValue(
				$userId, Application::APP_ID, 'default_duration_minutes', (string)self::DEFAULTS['defaultDurationMinutes']),
		];
	}

	public function set(
		string $userId,
		string $workingHoursStart,
		string $workingHoursEnd,
		int $snapStepMinutes,
		int $defaultDurationMinutes,
	): array {
		$this->config->setUserValue($userId, Application::APP_ID, 'working_hours_start', $workingHoursStart);
		$this->config->setUserValue($userId, Application::APP_ID, 'working_hours_end', $workingHoursEnd);
		$this->config->setUserValue($userId, Application::APP_ID, 'snap_step_minutes', (string)$snapStepMinutes);
		$this->config->setUserValue($userId, Application::APP_ID, 'default_duration_minutes', (string)$defaultDurationMinutes);
		return $this->get($userId);
	}
}
