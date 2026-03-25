const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (typeof window === 'undefined') {
		return defaultValue;
	}
	const storage = window.localStorage;
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (typeof window === 'undefined') {
		return {
			appId: process.env.NEXT_PUBLIC_BASE44_APP_ID || null,
			token: null,
			fromUrl: '',
			functionsVersion: process.env.NEXT_PUBLIC_BASE44_FUNCTIONS_VERSION || null,
			appBaseUrl: process.env.NEXT_PUBLIC_BASE44_APP_BASE_URL || null,
		};
	}
	
	const storage = window.localStorage;
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: process.env.NEXT_PUBLIC_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: process.env.NEXT_PUBLIC_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: process.env.NEXT_PUBLIC_BASE44_APP_BASE_URL }),
	}
}

// Use getter to lazy-evaluate on first access
let _appParams = null;
export const appParams = new Proxy({}, {
	get(target, prop) {
		if (_appParams === null) {
			_appParams = getAppParams();
		}
		return _appParams[prop];
	}
});
