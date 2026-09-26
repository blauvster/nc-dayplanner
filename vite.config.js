import { createAppConfig } from '@nextcloud/vite-config'

export default createAppConfig({
	main: 'src/main.js',
	settings: 'src/settings-personal.js',
	dashboard: 'src/dashboard.js',
}, {
	// With more than one entry point, vite-plugin-css-injected-by-js
	// otherwise picks a single arbitrary entry to hold all injected CSS,
	// leaving the others with none - make sure every entry chunk gets its
	// own copy instead.
	inlineCSS: {
		jsAssetsFilterFunction: (chunk) => chunk.isEntry,
	},
	config: {
		build: {
			cssCodeSplit: true,
		},
	},
})
