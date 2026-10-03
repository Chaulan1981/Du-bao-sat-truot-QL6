// Bản quyền © 2026 PGS. TS. Nguyễn Châu Lân, Trường Đại học Giao thông vận tải. Bảo lưu mọi quyền – xem LICENSE.
// Ổn định mái dốc theo mưa có kể lực hút dính (SWCC van Genuchten + Vanapalli), mái vô hạn, đới ngấm Lumb.
// Cùng công thức với scripts/on_dinh.py (cảnh báo tự động) – xem mô tả chi tiết ở đó.
// scripts/dong_goi_web.sh nhúng thông số du_lieu/on_dinh.json vào bản này và ghi ra docs/on_dinh.js cho WebGIS.
(function (root) {
  const GW = 9.81, H_MIN = 0.3, NGUONG = [1.0, 1.2, 1.3];
  const MAC_DINH = {};               // mọi thông số lấy từ bản nhúng du_lieu/on_dinh.json (đủ khóa)
  const CFG = {"mac_dinh": {"gamma": 19.0, "gamma_sat": 20.0, "c": 8.0, "phi": 26.0, "n": 0.45, "theta_r": 0.12, "a_vg": 0.05, "n_vg": 1.5, "S0": 0.8, "k": 0.85, "frac": 0.8, "cap": 86.0, "D_max": 3.0, "D_min": 0.5, "beta_min": 20.0, "beta_max": 55.0, "beta": 35.0}, "khu_vuc": {"KV1": {}, "KV2": {}, "KV3": {}}, "diem": {}, "nguong_fs": [1.0, 1.2, 1.3]};      // thông số nhúng lúc đóng gói (du_lieu/on_dinh.json)
  const rad = d => d * Math.PI / 180, num = v => typeof v === 'number' && isFinite(v);
  const chon = o => { const r = {}; Object.keys(o || {}).forEach(k => { if (num(o[k])) r[k] = o[k]; }); return r; };

  function thamSo(st, cfg, dh) {
    cfg = cfg || CFG || {}; dh = dh || {};
    const p = Object.assign({}, MAC_DINH, chon(cfg.mac_dinh), chon((cfg.khu_vuc || {})[st.zone]));
    p.nguon_doc = 'mặc định';
    const g = (dh.diem || {})[st.id] || {};
    if (num(g.doc)) { p.beta = g.doc; p.nguon_doc = dh.nguon || 'DEM'; }
    const tay = (cfg.diem || {})[st.id] || {};
    Object.assign(p, chon(tay)); if ('beta' in tay) p.nguon_doc = 'nhập tay';
    const b = Math.min(Math.max(p.beta, 1), p.beta_max);
    const t = Math.tan(rad(b)), t0 = Math.tan(rad(p.beta_min)), t1 = Math.tan(rad(p.beta_max));
    const f = Math.min(Math.max((t - t0) / (t1 - t0), 0), 1);
    p.beta_tinh = b; p.D = p.D_max - (p.D_max - p.D_min) * f; p.nguong = (cfg.nguong_fs || NGUONG).slice();
    return p;
  }
  function hutDinh(S, p) {
    const n = p.n, tr = p.theta_r; const Se = Math.min(Math.max((S * n - tr) / (n - tr), 1e-6), 1);
    if (Se >= 1) return [0, 1];
    const m = 1 - 1 / p.n_vg; return [Math.pow(Math.pow(Se, -1 / m) - 1, 1 / p.n_vg) / p.a_vg, Se];
  }
  function fsMat(z, h, hw, p) {
    const b = rad(p.beta_tinh), c2 = Math.cos(b) ** 2, sc = Math.sin(b) * Math.cos(b);
    const wet = Math.min(h, z), Wz = p.gamma_sat * wet + p.gamma * (z - wet), tp = Math.tan(rad(p.phi));
    const [psi, Se] = h >= z ? [0, 1] : hutDinh(p.S0, p);
    return [(p.c + (Wz * c2 - GW * hw * c2) * tp + psi * Se * tp) / (Wz * sc), psi];
  }
  function fsNgay(W, p) {
    const D = p.D, h = W / 1000 / (p.n * (1 - p.S0));
    let FS, psi, z = D, hw = 0;
    if (h < D) {
      [FS, psi] = fsMat(D, h, 0, p);
      if (h >= H_MIN) { const F2 = fsMat(h, h, 0, p)[0]; if (F2 < FS) { FS = F2; z = h; } }
    } else { hw = Math.min(D, h - D); [FS, psi] = fsMat(D, h, hw, p); }
    return {FS, h: Math.min(h, D), hw, z, psi, W};
  }
  const buoc = (W, P, p) => p.k * W + Math.min(p.frac * (P || 0), p.cap);
  function chuoiFS(pr, p) { let W = 0; return pr.map(P => { W = buoc(W, P, p); return fsNgay(W, p); }); }
  function mucFS(FS, p) { const [a, b, c] = (p && p.nguong) || NGUONG; return FS < a ? 3 : FS < b ? 2 : FS < c ? 1 : 0; }
  function xacSuat(pr, tList, members, p) {
    if (!members || !members.length) return null;
    let W0 = 0; pr.slice(0, tList[0]).forEach(P => { W0 = buoc(W0, P, p); });
    const per = tList.map(() => []);
    members.forEach(mb => { let W = W0; mb.forEach((P, i) => { W = buoc(W, P, p); per[i].push(fsNgay(W, p).FS); }); });
    const [a, b] = p.nguong;
    return per.map(v => {
      const n = v.length, s = v.slice().sort((x, y) => x - y), q = f => s[Math.min(n - 1, Math.round(f * (n - 1)))];
      return {n, p1: v.filter(x => x < a).length / n, p12: v.filter(x => x < b).length / n, FS10: q(.1), FS50: q(.5), FS90: q(.9)};
    });
  }
  function mucXacSuat(e, hi = 0.5, mid = 0.3) {
    if (!e) return 0; if (e.p1 >= hi) return 3; if (e.p1 >= mid || e.p12 >= hi) return 2; return e.p12 >= mid ? 1 : 0;
  }
  const api = {CAU_HINH: CFG, thamSo, hutDinh, fsNgay, chuoiFS, mucFS, xacSuat, mucXacSuat, fsKho: p => fsNgay(0, p).FS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OD = api;
})(this);
