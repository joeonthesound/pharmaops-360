const ALLOWED_NOTIFICATION_PATHS = [
  /^\/dashboard$/,
  /^\/mantenimiento\/hvac\/rui\/activo$/,
  /^\/mantenimiento\/hvac\/rui\/activo\/[A-Za-z0-9._:-]+$/,
  /^\/mantenimiento\/hvac\/rui\/enviado$/,
  /^\/mantenimiento\/hvac\/rui\/rechazado$/,
  /^\/mantenimiento\/hvac\/rui\/ht$/,
  /^\/activos\/hvac\/ver\/[0-9a-f-]+$/i,
];

function sanitizeTargetPath(targetPath) {
  if (typeof targetPath !== 'string' || !targetPath.startsWith('/')) {
    return '/dashboard';
  }

  if (targetPath.startsWith('//') || targetPath.includes('://')) {
    return '/dashboard';
  }

  return ALLOWED_NOTIFICATION_PATHS.some((pattern) => pattern.test(targetPath))
    ? targetPath
    : '/dashboard';
}

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const severityLevel = payload.severityLevel || payload.severity || 'info';
  const targetPath = sanitizeTargetPath(payload.targetPath);
  const title = payload.title || 'PharmaOps 360';
  const message = payload.message || 'Nueva notificacion GxP disponible.';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      tag: payload.tag || payload.notificationId || 'pharmaops-notification',
      renotify: severityLevel === 'critical_gxp',
      requireInteraction: severityLevel === 'critical_gxp',
      data: {
        notificationId: payload.notificationId || null,
        relatedRecordCode: payload.relatedRecordCode || null,
        severityLevel,
        targetPath,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = sanitizeTargetPath(event.notification.data?.targetPath);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url === targetUrl);

      if (existingClient) {
        return existingClient.focus();
      }

      return clients.openWindow(targetPath);
    }),
  );
});
