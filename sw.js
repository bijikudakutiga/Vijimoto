// Service worker sederhana: cache-first untuk asset statis,
// network-first untuk data supaya info penjualan selalu terbaru saat online.
const CACHE_NAME = "vijimoto-pos-v1";
const STATIC_ASSETS = ["/dashboard", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// TODO (tahap offline-first berikutnya): antrian transaksi yang dibuat saat
// offline disimpan di IndexedDB oleh client, lalu di-sync ke Supabase lewat
// Background Sync API saat koneksi kembali online.
