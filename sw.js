'use strict';

const CACHE = 'sebas-v1';
const PRECACHE = [
  '/', '/index.html', '/health.html', '/gym.html',
  '/finance.html', '/po-water.html', '/topbar.js', '/sync.js',
  '/icon.svg', '/manifest.json'
];

// ── Install: pre-cache static shell ─────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activate: drop old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for static ────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const { pathname } = new URL(e.request.url);

  if (pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});

// ── Push: fired by a push server (future) ───────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Panel de Sebas', body: 'Nueva notificación', url: '/' };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'general',
      renotify: true,
      data: { url: data.url }
    })
  );
});

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Local schedule: page sends { type:'NOTIFY', delay, title, body, tag, url }
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'NOTIFY') return;
  const { delay = 0, title = 'Panel de Sebas', body, tag = 'local', url = '/' } = e.data;
  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag,
      renotify: true,
      data: { url }
    });
  }, Math.max(0, delay));
});
