// Bản quyền © 2026 PGS. TS. Nguyễn Châu Lân, Trường Đại học Giao thông vận tải. Bảo lưu mọi quyền – xem LICENSE.
// Service worker: mở được app khi mất mạng (hiện dự báo lần cuối), cập nhật khi có mạng.
const CACHE = "ql6-v19";
const SHELL = ['./', './index.html', './on_dinh.js', './danh_gia_anh.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/layers.png', './vendor/leaflet/images/layers-2x.png', './chinh-sach-rieng-tu.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;
  // Dự báo mưa Open-Meteo: KHÔNG lưu, KHÔNG trả bản cũ. Nếu trả bản lưu khi mất mạng, trang sẽ tưởng là số liệu mới và ghi
  // "Cập nhật lúc <bây giờ>" cho dự báo đã cũ. Để lỗi mạng lộ ra, trang tự chuyển sang dự báo đã lưu và ghi rõ thời điểm lưu.
  let host = ''; try { host = new URL(url).hostname; } catch (_) {}
  if (host === 'open-meteo.com' || host.endsWith('.open-meteo.com')) return;
  // Số liệu cảnh báo/vệ tinh (có ghi thời điểm cập nhật) và trang chính: ưu tiên mạng, mất mạng thì dùng bản lưu gần nhất.
  // Chỉ lưu phản hồi thành công – không để trang lỗi 404/500 ghi đè bản lưu tốt.
  if (url.includes('/data/') || url.includes('on_dinh.js') || url.includes('danh_gia_anh.js') || e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: e.request.mode === 'navigate'}).then(m => m || Response.error())));
    return;
  }
  // Thư viện, icon, ô bản đồ: ưu tiên bản lưu
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
    if (url.includes('tile.openstreetmap') || url.includes('opentopomap') || url.includes('arcgisonline')) {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp));
    }
    return r;
  })));
});
