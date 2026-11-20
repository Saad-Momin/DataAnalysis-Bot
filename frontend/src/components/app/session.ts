/**
 * Tiny module-level flags shared by the app shell.
 * - `intentionalExit`: set right before logout / account deletion so the auth guard
 *   does not bounce the user to /login with a "session expired" notice.
 * - `sessionExpired`: set by the fetch watcher when an API call returns 401.
 */
let intentionalExit = false;
let sessionExpired = false;

export const markIntentionalExit = () => {
  intentionalExit = true;
};
export const markSessionExpired = () => {
  sessionExpired = true;
};
export const consumeExitState = () => {
  const s = { intentionalExit, sessionExpired };
  intentionalExit = false;
  sessionExpired = false;
  return s;
};
export const isIntentionalExit = () => intentionalExit;
