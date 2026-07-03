export async function registerNotificationsServiceWorker() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
  } catch (error) {
    console.warn('[PharmaOps Notifications] Service worker registration skipped', error);
    return null;
  }
}
