// Bản quyền © 2026 PGS. TS. Nguyễn Châu Lân, Trường Đại học Giao thông vận tải. Bảo lưu mọi quyền – xem LICENSE.
// Ổn định mái dốc theo mưa có kể lực hút dính (SWCC van Genuchten + Vanapalli), mái vô hạn, đới ngấm Lumb.
// Cùng công thức với scripts/on_dinh.py (cảnh báo tự động) – xem mô tả chi tiết ở đó.
// scripts/dong_goi_web.sh nhúng thông số du_lieu/on_dinh*.json vào bản này và ghi ra docs/on_dinh.js cho WebGIS.
(function (root) {
  const GW = 9.81, H_MIN = 0.3, NGUONG = [1.0, 1.2, 1.3];
  const MAC_DINH = {};               // mọi thông số lấy từ bản nhúng du_lieu/on_dinh.json (đủ khóa)
  // thông số nhúng lúc đóng gói: {'': QL6 (du_lieu/on_dinh.json), 'lao-cai': du_lieu/on_dinh_lao-cai.json, ...}
  const CFG_VUNG = {"": {"mac_dinh": {"gamma": 19.0, "gamma_sat": 20.0, "c": 8.0, "phi": 26.0, "n": 0.45, "theta_r": 0.12, "a_vg": 0.05, "n_vg": 1.5, "S0": 0.8, "k": 0.85, "frac": 0.8, "cap": 86.0, "D_max": 3.0, "D_min": 0.5, "beta_min": 20.0, "beta_max": 55.0, "beta": 35.0}, "khu_vuc": {"KV1": {}, "KV2": {}, "KV3": {}}, "diem": {}, "nguong_fs": [1.0, 1.2, 1.3], "hieu_chinh": "03/10/2026: chọn k = 0,85; S0 = 0,80; c' = 8 kPa; φ' = 26°; D_max = 3 m bằng dò lưới 192 bộ thông số trên mưa Open-Meteo Historical Forecast 01/2023–09/2026 (19 điểm): bắt 3/5 sự kiện mưa (Yagi 9/2024, Km121+700 8/2025, Chiềng Pấc 8/2026) với FS < 1,2 khoảng 24 ngày-khu vực/năm (~5–6 đợt/năm cho cả 3 khu vực). Huổi Lóng 7/2026 không bắt được vì mưa mô hình chỉ 20–30 mm/ngày (trạm đo 149 mm). Mẫu nhỏ – cần hiệu chỉnh lại khi có thí nghiệm đất và thêm sự cố. Báo cáo kiểm định lưu cùng mã nguồn."}, "lao-cai": {"mac_dinh": {"gamma": 18.5, "gamma_sat": 19.0, "c": 17.0, "phi": 14.0, "n": 0.47, "theta_r": 0.15, "a_vg": 0.015, "n_vg": 1.35, "S0": 0.85, "k": 0.8, "frac": 0.8, "cap": 86.0, "D_max": 5.0, "D_min": 1.5, "beta_min": 20.0, "beta_max": 55.0, "beta": 35.0}, "khu_vuc": {}, "diem": {}, "nguong_fs": [1.0, 1.2, 1.3], "nguon": [{"bai": "Do T.N., Nguyen L.C., Congress S.S.C., Puppala A.J. (2024). Journal of Disaster Research 19(2): 465–477. doi:10.20965/jdr.2024.p0465 (số liệu theo bản thảo bài báo)", "vi_tri": "Cầu Mây, Sa Pa (đường 152)", "chi_tieu": "4 lớp sét pha tàn tích: W 21,9–32,6 %; γ 18,0–18,6 kN/m³; γsat (Plaxis) 18,5–19,6; n 43,4–49,6 %; e 0,77–0,98; Sr 77–89 %; LL 38,6–39,5; PI 14,2–14,9; k 1,7–2,3·10⁻⁷ m/s; c 14–30 kPa; φ 11°48′–13°48′. SWCC buồng áp lực (ASTM D6836): giá trị khí vào 28 kPa (lớp 1), 23 kPa (lớp 2); van Genuchten Sres 0,316/0,307, ga 0,01/0,02, gn 1,4/1,3."}, {"bai": "Nguyen L.C., Do T.N., Nguyen Q.D. (2023). Progress in Landslide Research and Technology 1(2): 403–412. doi:10.1007/978-3-031-18471-0_29", "vi_tri": "Mông Sen, Sa Pa", "chi_tieu": "γ 18,3–19,6 kN/m³; n 39,8–48 %; Sr 87–95 %; LL ≈ 35–36, PI ≈ 10–11,5; tự nhiên c 20,5–23,1 kPa, φ 10,7–23,5°; bão hòa c 18,7–21,8 kPa, φ 14,2–17,9°; γsat 18,7–20,1."}, {"bai": "Duong B.V., Fomenko I.K., Nguyen L.C. và cs. (2023). Progress in Landslide Research and Technology 2(1): 193–207. doi:10.1007/978-3-031-39012-8_8", "vi_tri": "Mông Sen, Sa Pa", "chi_tieu": "Mùa khô γ 18,9, c 22 kPa, φ 16,3°; mùa mưa γ 19,3, c 20 kPa, φ 15,1°; ru 0,286."}, {"bai": "Nguyen C.D., Nguyen D.M., Nguyen C.L. và cs. (2026). Journal of Science and Transport Technology 6(1): 29–47. doi:10.58845/jstt.utt.2026.en.6.1.29-47", "vi_tri": "Mường Bo, Sa Pa", "chi_tieu": "Sét pha (CL): W 31,7 %; γ 18,2, γsat 18,5 kN/m³; n 47,3 %; e 0,90; c 7,22 kPa; φ 10,19°; k ≈ 7,9·10⁻⁷ m/s."}], "chon_thong_so": "γ, γsat, n: trung vị các lớp sét pha tàn tích ở 4 bài. c′ = 17 kPa, φ′ = 14°: trung vị khoảng giá trị bão hòa/mùa mưa (c 7–22 kPa, φ 10–18°). SWCC: θr = Sres·n ≈ 0,15; α = 0,015 kPa⁻¹, n_vG = 1,35 (trung bình 2 lớp Cầu Mây; hiểu ga theo kPa⁻¹ vì khi đó giá trị khí vào ≈ 22–44 kPa khớp số đo 23–28 kPa, còn theo m⁻¹ sẽ ra 220–430 kPa). S0 = 0,85 nằm trong khoảng Sr đo 77–95 %. Tầng phủ 5 m (mái thoải) → 1,5 m (mái dốc), số đo 2,2–12 m ở Cầu Mây.", "hieu_chinh": "03/10/2026: thông số đất cố định theo các bài báo; dò lưới 486 bộ (c 14/17/20; φ 12/14/16; k 0,80/0,85/0,90; S0 0,80/0,85/0,90; D_max 3/5/8; D_min 0,5/1,5) trên mưa Open-Meteo Historical Forecast 01/2023–09/2026 (149 điểm, 5 quốc lộ). Bộ chọn bắt cả 2 sự kiện do mưa (Yagi QL70 9/2024: FS 0,89; Khau Phạ QL32 9/2025: FS 1,15), FS < 1,2 khoảng 12 ngày-tuyến/năm (thông số mượn từ QL6 trước đó: 98), FS < 1 khoảng 2; không điểm nào có FS khô dưới 1,3. Nhạy nhất với S0: S0 = 0,80 → mất sự kiện Khau Phạ; S0 = 0,90 → khoảng 96 ngày-tuyến/năm."}};
  // trang vùng đặt window.VUNG_OD trước khi nạp file này (trang Lào Cai: 'lao-cai'); không có -> QL6
  const VUNG = (typeof globalThis !== 'undefined' && globalThis.VUNG_OD) || (root && root.VUNG_OD) || '';
  const CFG = CFG_VUNG && (CFG_VUNG[VUNG] || CFG_VUNG['']);
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
  const api = {CAU_HINH: CFG, VUNG, thamSo, hutDinh, fsNgay, chuoiFS, mucFS, xacSuat, mucXacSuat, fsKho: p => fsNgay(0, p).FS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OD = api;
})(this);
