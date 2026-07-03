'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import type {
  NotificacionesRow,
  NotificationRoleContext,
  NotificationSeverity,
} from '@/types/database.types';

export type NotificationItem = NotificacionesRow;

type NotificationsBellProps = {
  activeRoleContext: NotificationRoleContext;
  items?: NotificationItem[];
  onClearAll?: () => void | Promise<void>;
  onMarkAsRead?: (notificationId: string) => void | Promise<void>;
};

const emptyStateByRole: Record<NotificationRoleContext, string> = {
  technician: 'Sin alertas tecnicas pendientes para ejecucion en planta.',
  supervisor: 'Sin revisiones operativas pendientes de supervisor.',
  quality: 'Sin liberaciones o desvios GxP pendientes de Calidad.',
  management: 'Sin escalaciones ejecutivas pendientes de Gerencia.',
};

function getSeverityClass(severity: NotificationSeverity, isRead: boolean) {
  if (severity === 'critical_gxp') {
    return isRead
      ? 'border-red-100 bg-white text-slate-700'
      : 'border-red-300 bg-red-50 text-red-950';
  }

  if (severity === 'warning') {
    return isRead
      ? 'border-amber-100 bg-white text-slate-700'
      : 'border-amber-300 bg-amber-50 text-amber-950';
  }

  return isRead
    ? 'border-slate-200 bg-white text-slate-600'
    : 'border-sky-200 bg-sky-50 text-sky-950';
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Panama',
  }).format(date);
}

export function NotificationsBell({
  activeRoleContext,
  items = [],
  onClearAll,
  onMarkAsRead,
}: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(items);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const unreadItems = useMemo(
    () => notifications.filter((item) => !item.is_read),
    [notifications],
  );
  const unreadCount = unreadItems.length;
  const hasUnreadCritical = unreadItems.some((item) => item.severity === 'critical_gxp');
  const sortedItems = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [notifications],
  );

  useEffect(() => {
    setNotifications(items);
  }, [items]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user?.id) {
        return;
      }

      setCurrentUserId(user.id);

      const { data } = await supabase
        .from('notificaciones')
        .select(
          'id, user_id, role_context, title, message, severity, related_record_code, is_read, created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (isMounted && Array.isArray(data)) {
        setNotifications(data as NotificationItem[]);
      }
    }

    void hydrateNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const channel = supabase
      .channel(`notificaciones:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const nextNotification = payload.new as NotificationItem;

          setNotifications((current) => {
            if (current.some((item) => item.id === nextNotification.id)) {
              return current;
            }

            return [nextNotification, ...current].slice(0, 25);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function handleMarkAsRead(notificationId: string) {
    if (onMarkAsRead) {
      await onMarkAsRead(notificationId);
    } else {
      await supabase.from('notificaciones').update({ is_read: true }).eq('id', notificationId);
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item,
      ),
    );
  }

  async function handleClearAll() {
    if (onClearAll) {
      await onClearAll();
    } else if (currentUserId) {
      await supabase
        .from('notificaciones')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);
    }

    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={`Notificaciones pendientes: ${unreadCount}`}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Bell aria-hidden="true" size={19} />
        {unreadCount > 0 ? (
          <span
            className={`absolute -right-1 -top-1 min-h-5 min-w-5 rounded-full px-1.5 text-center text-[11px] font-black leading-5 text-white ring-2 ring-white ${
              hasUnreadCritical ? 'animate-pulse bg-red-500' : 'bg-red-700'
            }`}
            style={hasUnreadCritical ? { backgroundColor: '#ef4444' } : undefined}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="absolute right-0 top-12 z-[70] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Centro de alertas
              </p>
              <h2 className="text-sm font-black text-slate-950">Notificaciones GxP</h2>
            </div>
            <button
              aria-label="Cerrar notificaciones"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </header>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {sortedItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                {emptyStateByRole[activeRoleContext]}
              </div>
            ) : (
              <div className="grid gap-2">
                {sortedItems.map((item) => {
                  const content = (
                    <>
                      <span className="block text-sm font-black">{item.title}</span>
                      <span className="mt-1 block text-sm font-semibold leading-5 opacity-85">
                        {item.message}
                      </span>
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-wide opacity-70">
                        {item.severity} / {formatNotificationDate(item.created_at)}
                        {item.related_record_code ? ` / ${item.related_record_code}` : ''}
                      </span>
                    </>
                  );

                  return (
                    <article
                      className={`rounded-lg border p-3 ${getSeverityClass(
                        item.severity,
                        item.is_read,
                      )}`}
                      key={item.id}
                    >
                      <div className="min-h-11">{content}</div>

                      {!item.is_read ? (
                        <button
                          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-white/70 bg-white/80 px-3 text-sm font-black text-slate-900 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          onClick={() => void handleMarkAsRead(item.id)}
                          type="button"
                        >
                          <CheckCircle2 aria-hidden="true" size={16} />
                          Marcar como leido
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {unreadCount > 0 ? (
            <footer className="border-t border-slate-200 p-3">
              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                onClick={() => void handleClearAll()}
                type="button"
              >
                Marcar todas como leidas
              </button>
            </footer>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
