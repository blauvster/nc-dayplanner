<?php

declare(strict_types=1);

namespace OCA\DayPlanner\Dashboard;

use OCA\DayPlanner\AppInfo\Application;
use OCP\Dashboard\IWidget;
use OCP\IURLGenerator;
use OCP\Util;

/**
 * Renders as a plain OCA.Dashboard.register() JS widget (src/dashboard.js)
 * rather than a server-side IAPIWidget: the card data lives in Deck, which
 * this app only ever talks to from the browser (plan.md section 3) - there
 * is no supported way to query it from PHP here.
 */
class TodayWidget implements IWidget {
	public function __construct(
		private IURLGenerator $urlGenerator,
	) {
	}

	public function getId(): string {
		return 'dayplanner-today';
	}

	public function getTitle(): string {
		return 'Today\'s plan';
	}

	public function getOrder(): int {
		return 10;
	}

	public function getIconClass(): string {
		return 'icon-dayplanner-widget';
	}

	public function getUrl(): ?string {
		return $this->urlGenerator->linkToRoute('dayplanner.page.index');
	}

	public function load(): void {
		Util::addStyle(Application::APP_ID, 'dayplanner-dashboard-icon');
		Util::addScript(Application::APP_ID, 'dayplanner-dashboard');
	}
}
