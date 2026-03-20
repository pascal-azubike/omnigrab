export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","platform-icons/bandcamp.svg","platform-icons/bilibili.svg","platform-icons/dailymotion.svg","platform-icons/facebook.svg","platform-icons/instagram.svg","platform-icons/niconico.svg","platform-icons/odysee.svg","platform-icons/pinterest.svg","platform-icons/reddit.svg","platform-icons/rumble.svg","platform-icons/soundcloud.svg","platform-icons/tiktok.svg","platform-icons/twitch.svg","platform-icons/twitter.svg","platform-icons/vimeo.svg","platform-icons/vk.svg","platform-icons/youtube.svg","svelte.svg","tauri.svg","vite.svg"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.DL9Mg1CY.js",app:"_app/immutable/entry/app.CM9IxQCo.js",imports:["_app/immutable/entry/start.DL9Mg1CY.js","_app/immutable/chunks/DratqCw1.js","_app/immutable/chunks/CcjQ2sI4.js","_app/immutable/chunks/BKg1gC6M.js","_app/immutable/entry/app.CM9IxQCo.js","_app/immutable/chunks/CcjQ2sI4.js","_app/immutable/chunks/DucHZydB.js","_app/immutable/chunks/BKg1gC6M.js","_app/immutable/chunks/BPsoYOe9.js","_app/immutable/chunks/0Epib6Pp.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/about",
				pattern: /^\/about\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/history",
				pattern: /^\/history\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/queue",
				pattern: /^\/queue\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
