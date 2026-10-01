/**
 * Whether a redirect target taken from the address bar (``?target=``,
 * ``?next=``, ``returnUrl``) is a plain path inside this app.
 *
 * A crafted link must not turn one of our redirects into a trip to another
 * site: landing on the wrong page is a nuisance, an open redirect is a
 * phishing tool. ``//host`` and ``/\host`` start with a slash but are
 * protocol-relative — a browser reads both as a different origin.
 */
export function isInAppPath(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return false
  return !raw.startsWith('//') && !raw.startsWith('/\\')
}
