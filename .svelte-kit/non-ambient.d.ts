
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/about" | "/history" | "/queue" | "/settings";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/about": Record<string, never>;
			"/history": Record<string, never>;
			"/queue": Record<string, never>;
			"/settings": Record<string, never>
		};
		Pathname(): "/" | "/about" | "/history" | "/queue" | "/settings";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/platform-icons/bandcamp.svg" | "/platform-icons/bilibili.svg" | "/platform-icons/dailymotion.svg" | "/platform-icons/facebook.svg" | "/platform-icons/instagram.svg" | "/platform-icons/niconico.svg" | "/platform-icons/odysee.svg" | "/platform-icons/pinterest.svg" | "/platform-icons/reddit.svg" | "/platform-icons/rumble.svg" | "/platform-icons/soundcloud.svg" | "/platform-icons/tiktok.svg" | "/platform-icons/twitch.svg" | "/platform-icons/twitter.svg" | "/platform-icons/vimeo.svg" | "/platform-icons/vk.svg" | "/platform-icons/youtube.svg" | "/svelte.svg" | "/tauri.svg" | "/vite.svg" | string & {};
	}
}