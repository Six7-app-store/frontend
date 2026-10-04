/**
 * localStorage keys the app writes. Only UI conveniences live there — the
 * tokens never do (see ``useKeycloak``).
 */

/** The last user profile from ``/users/me``, shown until it is fetched again. */
export const USER_STORAGE_KEY = 'user'

/** The UI language the user picked. */
export const LOCALE_STORAGE_KEY = 'locale'

/**
 * The last ``/ui-settings`` response, so logos and accent are right from the
 * first paint instead of flashing the defaults until the request returns.
 */
export const UI_SETTINGS_STORAGE_KEY = 'ui-settings'

/** The accent stylesheet derived from it; index.html applies it before first paint. */
export const UI_ACCENT_CSS_STORAGE_KEY = 'ui-accent-css'
