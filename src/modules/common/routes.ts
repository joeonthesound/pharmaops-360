export const APP_ROUTES = {
  activos: {
    master: '/activos',
    hvac: '/activos/hvac',
    hvacProfileSearch: '/activos/hvac/ver',
    hvacProfile: (id: string) => `/activos/hvac/ver/${encodeURIComponent(id)}`,
  },
  mantenimiento: {
    root: '/mantenimiento',
    hvac: '/mantenimiento/hvac',
    rui: {
      activo: '/mantenimiento/hvac/rui/activo',
      enviado: '/mantenimiento/hvac/rui/enviado',
      rechazado: '/mantenimiento/hvac/rui/rechazado',
      historial: '/mantenimiento/hvac/rui/ht',
      historialDetalle: (id: string) => `/mantenimiento/hvac/rui/ht/${encodeURIComponent(id)}`,
    },
    crearOrdenes: '/mantenimiento/crear-ordenes',
  },
} as const;
