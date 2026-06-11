/**
 * Onboarding state helpers.
 *
 * Completion is stored in localStorage so the tour only shows once per
 * device. It can be replayed any time from Settings → Help & Tutorial,
 * which dispatches REPLAY_ONBOARDING_EVENT (listened for in app/page.tsx).
 */

const ONBOARDING_COMPLETE_KEY = "roadDog:onboardingComplete";

export const REPLAY_ONBOARDING_EVENT = "roaddog-replay-onboarding";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
  } catch {
    // If storage is unavailable, don't trap the user in the tour
    return true;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  } catch {
    // Storage unavailable - onboarding will show again next visit
  }
}

export function requestOnboardingReplay(): void {
  window.dispatchEvent(new CustomEvent(REPLAY_ONBOARDING_EVENT));
}
