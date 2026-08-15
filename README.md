# Vijimoto Super POS

Sistem POS penjualan — Next.js + Supabase + Cloudflare Pages.

## Setup

1. `npm install`
2. Buat project di [supabase.com](https://supabase.com), lalu jalankan berurutan
   di SQL Editor Supabase:
   - `schema.sql`
   - `triggers_and_rls.sql`
3. Buat user pertama (Super Admin) lewat Supabase Auth Dashboard dengan email
   `kudahijau664@gmail.com`, lalu tambahkan row-nya ke tabel `profiles` dengan
   `role_id` yang mengarah ke role `super_admin`.
4. Salin `.env.local.example` menjadi `.env.local`, isi dengan URL & anon key
   project Supabase Anda.
5. Ganti file di `public/icons/` dengan logo Vijimoto dalam berbagai ukuran
   (192x192, 512x512, dan versi maskable) — dipakai untuk ikon PWA saat
   diinstall di Android/iPhone.
6. `npm run dev` untuk menjalankan secara lokal.

## Struktur folder

- `src/app/login` — halaman login
- `src/app/(app)` — semua halaman setelah login (dashboard, penjualan, customer, stok, kas, pengaturan), dibungkus sidebar & proteksi auth otomatis lewat `middleware.ts`
- `src/lib/supabase` — koneksi Supabase (client, server, middleware)
- `src/lib/permissions.ts` — helper cek role & hak akses untuk UI
- `src/components` — komponen bersama (sidebar, topbar, install prompt PWA)
- `public/manifest.json` + `public/sw.js` — konfigurasi PWA (installable + offline dasar)

## Status pengerjaan

Fondasi sudah siap: autentikasi, struktur navigasi, desain sistem (warna,
tipografi), dan halaman Dashboard sudah tersambung ke data Supabase asli.
Halaman submenu lain (Input Penjualan, Data Customer, dst) masih berupa
kerangka — dikerjakan bertahap menu per menu.

## Deploy ke Cloudflare Pages

Hubungkan repo GitHub ke Cloudflare Pages, gunakan preset "Next.js", lalu
tambahkan environment variable `NEXT_PUBLIC_SUPABASE_URL` dan
`NEXT_PUBLIC_SUPABASE_ANON_KEY` di pengaturan project Cloudflare Pages.
  tes 
