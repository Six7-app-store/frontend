/**
 * localStorage keys the app writes. Only UI conveniences live there — the
 * tokens never do (see ``useKeycloak``).
 */

/** The last user profile from ``/users/me``, shown until it is fetched again. */
export const USER_STORAGE_KEY = 'user'

/** The UI language the user picked. */
export const LOCALE_STORAGE_KEY = 'locale'
