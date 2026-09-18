/* =========================================================
   viz.jsx - interactive benches + shared prelude
   ---------------------------------------------------------
   Dependency-free. Each chapter sets `viz: "<name>"` in
   data.jsx; the chapter page renders <Viz name={...} />.
   Every bench computes its numbers live - real ridge solves,
   real autocorrelation, real deadband compression. No canned
   art. This file: the shared helpers + Modules I-III (t1-t8),
   exported as window.__TS_VIZ_1. t9-t16 live in viz2.jsx,
   t17-t24 in viz3.jsx, t25-t30 + the registry + <Viz> in
   viz4.jsx; index.html loads them in that order.
   ========================================================= */

/* ---------------- shared math helpers ---------------- */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nf = (n, d = 2) => {
  if (!isFinite(n)) return "∞";
  const r = Math.abs(n) >= 1000 ? Math.round(n) : Math.round(n * 10 ** d) / 10 ** d;
  return r.toLocaleString("en-US", { maximumFractionDigits: d });
};
const pct = (x) => `${Math.round(x * 100)}%`;
const pct1 = (x) => `${nf(x * 100, 1)}%`;
const pct2 = (x) => `${nf(x * 100, 2)}%`;
const pct3 = (x) => `${nf(x * 100, 3)}%`;
const big = (n) => {
  if (Math.abs(n) >= 1e9) return `${nf(n / 1e9, 2)}G`;
  if (Math.abs(n) >= 1e6) return `${nf(n / 1e6, 2)}M`;
  if (Math.abs(n) >= 1e3) return `${nf(n / 1e3, 1)}K`;
  return nf(n, 0);
};
// Deterministic PRNG so every run is reproducible across renders.
function rng(seed) {
  // mulberry32. The obvious xorshift32 has correlated low-probability draws once
  // it has been consumed in pairs by gauss(), which quietly biases every Monte
  // Carlo bench in this book — this one does not.
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------------- shared controls ---------------- */
function Slider({ label, min, max, step, value, onChange, unit, fmt }) {
  return (
    <label>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="val">{fmt ? fmt(value) : value}{unit || ""}</span>
    </label>
  );
}
function Choice({ label, value, onChange, options }) {
  return (
    <label>
      <span>{label}</span>
      <select className="ts-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === "object" ? o.v : o;
          const l = typeof o === "object" ? o.l : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}
function Seg({ value, onChange, options }) {
  return (
    <div className="ts-seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
function Toggle({ label, value, onChange }) {
  return (
    <label style={{ cursor: "pointer" }} onClick={() => onChange(!value)}>
      <span>{label}</span>
      <span className={`ts-pill click ${value ? "on" : ""}`} style={{ justifySelf: "start" }}>{value ? "ON" : "OFF"}</span>
    </label>
  );
}
function Kpi({ label, value, unit, hint, tone, sel, onClick }) {
  return (
    <div className={`ts-kpi ${tone || ""} ${sel ? "sel" : ""}`} onClick={onClick}>
      <div className="k-label">{label}</div>
      <div className="k-val">{value}{unit ? <span className="k-unit">{unit}</span> : null}</div>
      {hint ? <div className="k-hint">{hint}</div> : null}
    </div>
  );
}
function Bar({ label, value, max, tone, valText }) {
  const w = clamp((value / (max || 1)) * 100, 0, 100);
  return (
    <div className="ts-bar-row">
      <span>{label}</span>
      <div className="b-track"><div className={`b-fill ${tone || ""}`} style={{ width: `${w}%` }} /></div>
      <span className="b-val">{valText !== undefined ? valText : nf(value, 1)}</span>
    </div>
  );
}
function VizHead({ idx, title }) {
  return <div className="viz-title"><span className="viz-title-idx">{idx}</span><span>{title}</span></div>;
}
function Note({ mark, children, tone }) {
  return <div className={`ts-step ${tone || ""}`}><span className="sn">{mark}</span><div>{children}</div></div>;
}
function Label({ children }) { return <span className="ts-label">{children}</span>; }

// site language → inline bilingual label helper
function useL() {
  const lang = useLang();
  return (zh, en) => (lang === "zh" ? zh : en);
}

/* ---------------- shared viz primitives ---------------- */
// A tiny SVG line plot: data = [{x,y}], marks an index, optional target line.
function MiniPlot({ data, w = 300, h = 110, stroke = "var(--primary)", markIndex, yMax, yMin, pad = 8, fmtY }) {
  if (!data || !data.length) return null;
  const xs = data.map((d) => d.x), ys = data.map((d) => d.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const lo = yMin !== undefined ? yMin : Math.min(...ys, 0);
  const hi = yMax !== undefined ? yMax : Math.max(...ys) * 1.08 || 1;
  const px = (x) => pad + ((x - x0) / (x1 - x0 || 1)) * (w - 2 * pad);
  const py = (y) => h - pad - ((y - lo) / (hi - lo || 1)) * (h - 2 * pad);
  const path = data.map((d, i) => `${i ? "L" : "M"}${px(d.x).toFixed(1)},${py(d.y).toFixed(1)}`).join(" ");
  const mk = markIndex != null ? data[clamp(markIndex, 0, data.length - 1)] : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--hairline-strong)" strokeWidth="1" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
      {mk && <line x1={px(mk.x)} y1={pad} x2={px(mk.x)} y2={h - pad} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />}
      {mk && <circle cx={px(mk.x)} cy={py(mk.y)} r="3.5" fill="var(--accent)" />}
    </svg>
  );
}

// A row of small server/instance boxes with a live/dead/degraded state.
function Boxes({ items, onClick }) {
  const C = { live: "var(--primary)", ok: "#2e9e6b", dead: "#c0453f", warn: "#d98a1f", idle: "var(--muted)" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
      {items.map((it, i) => (
        <div key={i} onClick={onClick ? () => onClick(i) : undefined}
          title={it.title || ""}
          style={{
            minWidth: 30, padding: "5px 7px", textAlign: "center", cursor: onClick ? "pointer" : "default",
            font: "600 11px var(--f-mono)", borderRadius: 4, color: "#fff",
            background: `color-mix(in srgb, ${C[it.state] || C.idle} 82%, transparent)`,
            border: `1px solid color-mix(in srgb, ${C[it.state] || C.idle} 60%, var(--bg))`,
          }}>{it.label}</div>
      ))}
    </div>
  );
}


/* ---------------- domain helpers shared by every bench ---------------- */
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const variance = (a) => { const m = mean(a); return a.length ? mean(a.map((x) => (x - m) * (x - m))) : 0; };
const sd = (a) => Math.sqrt(variance(a));
const kw = (v) => `${nf(v, 0)} kW`;
const yuan = (v) => `¥${nf(v, 0)}`;

// error metrics. `mask` optionally restricts to evaluated points.
function mae(y, p) { let s = 0, n = 0; for (let i = 0; i < y.length; i++) { if (p[i] == null) continue; s += Math.abs(y[i] - p[i]); n++; } return n ? s / n : 0; }
function rmse(y, p) { let s = 0, n = 0; for (let i = 0; i < y.length; i++) { if (p[i] == null) continue; s += (y[i] - p[i]) ** 2; n++; } return n ? Math.sqrt(s / n) : 0; }
function mape(y, p) { let s = 0, n = 0; for (let i = 0; i < y.length; i++) { if (p[i] == null || Math.abs(y[i]) < 1e-9) continue; s += Math.abs((y[i] - p[i]) / y[i]); n++; } return n ? s / n : 0; }
// WAPE divides by the TOTAL, so a zero-load hour cannot blow it up.
function wape(y, p) { let e = 0, t = 0; for (let i = 0; i < y.length; i++) { if (p[i] == null) continue; e += Math.abs(y[i] - p[i]); t += Math.abs(y[i]); } return t ? e / t : 0; }
// MASE: your error over the seasonal-naive error. Below 1 is the only place worth being.
function mase(y, p, season) { const num = mae(y, p); let s = 0, n = 0; for (let i = season; i < y.length; i++) { s += Math.abs(y[i] - y[i - season]); n++; } const den = n ? s / n : 1; return den ? num / den : 0; }
// pinball (quantile) loss at level tau
function pinball(y, p, tau) { let s = 0, n = 0; for (let i = 0; i < y.length; i++) { if (p[i] == null) continue; const d = y[i] - p[i]; s += d >= 0 ? tau * d : (tau - 1) * d; n++; } return n ? s / n : 0; }

const normPdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
function normCdf(z) { // Abramowitz-Stegun 7.1.26
  const s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + s * y);
}
const quantileOf = (arr, q) => { const a = arr.slice().sort((x, y) => x - y); if (!a.length) return 0; const i = clamp(q, 0, 1) * (a.length - 1); const lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };

/* ---- the load synthesiser every bench in this book shares ----
   Four layers, exactly as chapter SG1 describes: a baseline that barely
   moves, a process square-wave cut by shifts and batches, a slow weather
   push, and noise. SLOTS = 96 quarter-hours per day. */
const SLOTS = 96;
function synth({ days = 14, seed = 7, base = 420, shift = 1, weather = 1, noise = 1,
                 weekend = 0.35, maint = -1, tAmp = 6, tMean = 26 } = {}) {
  const r = rng(seed);
  const n = days * SLOTS;
  const L = { base: [], proc: [], wx: [], noise: [], y: [], temp: [], t: [] };
  // per-day production intensity: orders ebb and flow week to week
  const dayRate = [];
  for (let d = 0; d < days; d++) {
    const dow = (d + 1) % 7;                     // 0 = Sunday
    let rate = dow === 0 || dow === 6 ? weekend : 1;
    rate *= 0.88 + 0.24 * r();                   // order-book wobble
    if (d === maint) rate = 0.06;                // planned maintenance day
    dayRate.push(rate);
  }
  for (let i = 0; i < n; i++) {
    const d = Math.floor(i / SLOTS), s = i % SLOTS, hour = s / 4;
    // 1) baseline — standby, lighting, holding power. Drifts a little.
    const b = base * (1 + 0.02 * Math.sin((2 * Math.PI * i) / (SLOTS * 30)));
    // 2) process — three shifts with ramps, plus a lunch dip and changeovers
    let duty = 0;
    if (hour >= 7.5 && hour < 11.5) duty = 1;
    else if (hour >= 11.5 && hour < 12.5) duty = 0.55;      // changeover / lunch
    else if (hour >= 12.5 && hour < 19.5) duty = 1;
    else if (hour >= 19.5 && hour < 23) duty = 0.72;        // evening shift
    else if (hour >= 23 || hour < 1) duty = 0.4;
    else duty = 0.12;                                        // night
    const ramp = (hour >= 7 && hour < 7.5) ? (hour - 7) * 2 : (hour >= 23 && hour < 23.5 ? 1 - (hour - 23) * 2 : 1);
    const p = 980 * shift * duty * dayRate[d] * ramp;
    // 3) weather — diurnal temperature, cooling load above the balance point
    const temp = tMean + tAmp * Math.sin((2 * Math.PI * (hour - 9)) / 24) + 2.2 * Math.sin((2 * Math.PI * d) / 9);
    const cdd = Math.max(0, temp - 24);
    const w = 27 * weather * Math.pow(cdd, 1.25);
    // 4) noise
    const nz = 52 * noise * gauss(r);
    L.base.push(b); L.proc.push(p); L.wx.push(w); L.noise.push(nz);
    L.temp.push(temp); L.t.push(i);
    L.y.push(Math.max(0, b + p + w + nz));
  }
  return L;
}

/* Solve ridge regression by normal equations (X'X + λI)β = X'y with
   Gaussian elimination. Small feature counts only — which is all a lag
   model needs, and it keeps every number on this page honestly computed. */
function ridge(X, y, lam = 1e-3) {
  const k = X[0].length, n = X.length;
  const A = Array.from({ length: k }, () => new Float64Array(k + 1));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) { let s = 0; for (let r = 0; r < n; r++) s += X[r][i] * X[r][j]; A[i][j] = s + (i === j ? lam : 0); }
    let s = 0; for (let r = 0; r < n; r++) s += X[r][i] * y[r]; A[i][k] = s;
  }
  for (let c = 0; c < k; c++) {
    let piv = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    const tmp = A[c]; A[c] = A[piv]; A[piv] = tmp;
    if (Math.abs(A[c][c]) < 1e-12) continue;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j];
    }
  }
  return Array.from({ length: k }, (_, i) => (Math.abs(A[i][i]) < 1e-12 ? 0 : A[i][k] / A[i][i]));
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// Pearson correlation
function corr(a, b) {
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
// autocorrelation at one lag
function acfAt(x, lag) {
  const m = mean(x); let num = 0, den = 0;
  for (let i = 0; i < x.length; i++) { den += (x[i] - m) ** 2; if (i >= lag) num += (x[i] - m) * (x[i - lag] - m); }
  return den ? num / den : 0;
}

/* =========================================================
   t1 · curveLab — the four layers of an industrial curve
   ========================================================= */
function CurveViz() {
  const L = useL();
  const [shift, setShift] = React.useState(1);
  const [weather, setWeather] = React.useState(1);
  const [noise, setNoise] = React.useState(1);
  const [onBase, setOnBase] = React.useState(true);
  const [onProc, setOnProc] = React.useState(true);
  const [onWx, setOnWx] = React.useState(true);
  const [onNz, setOnNz] = React.useState(true);
  const [period, setPeriod] = React.useState(15);   // sampling period, minutes

  const S = React.useMemo(() => synth({ days: 7, shift, weather, noise, maint: 5 }), [shift, weather, noise]);

  // variance contributed by each layer (normalised over the four)
  const vs = [variance(S.base), variance(S.proc), variance(S.wx), variance(S.noise)];
  const vTot = vs.reduce((a, b) => a + b, 0) || 1;
  const share = vs.map((v) => v / vTot);

  const shown = S.y.map((_, i) =>
    (onBase ? S.base[i] : 0) + (onProc ? S.proc[i] : 0) + (onWx ? S.wx[i] : 0) + (onNz ? S.noise[i] : 0));
  const peak = Math.max(...shown), avg = mean(shown);

  // A 40-second, +300 kW inrush: what amplitude survives the sampling period?
  const INRUSH_S = 40, INRUSH_KW = 300;
  const seen = INRUSH_KW * Math.min(1, INRUSH_S / (period * 60));
  const visible = seen > 3 * 52 * noise;   // above the noise floor of one sample

  const curve = shown.map((v, i) => ({ x: i, y: v })).filter((_, i) => i % 2 === 0);

  return (
    <div>
      <VizHead idx="SG1" title={L("四层分解:基线 / 工况 / 环境 / 噪声,各自贡献了多少", "Four layers: baseline, process, weather, noise — and what each contributes")} />
      <div className="viz-ctrl">
        <Slider label={L("工况强度(产量)", "Process intensity")} min={0.3} max={1.6} step={0.05} value={shift} onChange={setShift} />
        <Slider label={L("环境影响(制冷)", "Weather coupling")} min={0} max={2.5} step={0.1} value={weather} onChange={setWeather} />
        <Slider label={L("噪声水平", "Noise level")} min={0} max={3} step={0.1} value={noise} onChange={setNoise} />
        <Choice label={L("采样周期", "Sampling period")} value={String(period)} onChange={(v) => setPeriod(parseInt(v))}
          options={[{ v: "1", l: "1 min" }, { v: "5", l: "5 min" }, { v: "15", l: "15 min" }, { v: "60", l: "60 min" }]} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        <span className={`ts-pill click ${onBase ? "on" : ""}`} onClick={() => setOnBase(!onBase)}>{L("基线", "baseline")}</span>
        <span className={`ts-pill click ${onProc ? "on" : ""}`} onClick={() => setOnProc(!onProc)}>{L("工况", "process")}</span>
        <span className={`ts-pill click ${onWx ? "on" : ""}`} onClick={() => setOnWx(!onWx)}>{L("环境", "weather")}</span>
        <span className={`ts-pill click ${onNz ? "on" : ""}`} onClick={() => setOnNz(!onNz)}>{L("噪声", "noise")}</span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("7 天负荷曲线(含第 6 天检修停机)", "Seven days of load (day 6 is a maintenance shutdown)")}</div>
        <MiniPlot data={curve} h={130} yMin={0} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("工况层方差占比", "Process share of variance")} value={pct1(share[1])} tone={share[1] > 0.6 ? "ok" : "warn"} hint={L("你真正要预测的那一层", "the layer you actually predict")} />
        <Kpi label={L("环境层", "Weather")} value={pct1(share[2])} tone="acc" />
        <Kpi label={L("噪声层", "Noise")} value={pct1(share[3])} tone={share[3] > 0.15 ? "warn" : "mut"} hint={L("模型容量花在这里=过拟合", "capacity spent here is overfitting")} />
        <Kpi label={L("峰均比", "Peak / average")} value={nf(peak / (avg || 1), 2)} tone="acc" hint={kw(peak)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("基线", "Baseline")} value={share[0]} max={1} tone="mut" valText={pct2(share[0])} />
        <Bar label={L("工况", "Process")} value={share[1]} max={1} tone="ok" valText={pct1(share[1])} />
        <Bar label={L("环境", "Weather")} value={share[2]} max={1} tone="acc" valText={pct1(share[2])} />
        <Bar label={L("噪声", "Noise")} value={share[3]} max={1} tone="warn" valText={pct1(share[3])} />
      </div>

      <Note mark="→" tone={visible ? "on" : "bad"}>
        {L(`一次持续 ${INRUSH_S} 秒、幅度 +${INRUSH_KW} kW 的启动冲击,按 ${period} 分钟区间平均后只剩 ${nf(seen, 1)} kW`,
            `A ${INRUSH_S}-second, +${INRUSH_KW} kW inrush, averaged over a ${period}-minute interval, survives as ${nf(seen, 1)} kW`)}
        {visible
          ? L(`,高于单点噪声(约 ${nf(52 * noise, 0)} kW),模型还有机会学到它。`, ` — above the per-sample noise (about ${nf(34 * noise, 0)} kW), so a model still has a chance to learn it.`)
          : L(`,已经淹没在噪声里。它不是「不明显」,而是在这份数据里根本不存在——换任何模型都找不回来。把采样周期调到 1 分钟再看。`, ` — buried in the noise. It is not 'subtle', it does not exist in this data, and no model will recover it. Set the sampling period to 1 minute and look again.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t2 · valueLab — asymmetric error cost picks your loss
   ========================================================= */
const DECISIONS = [
  { k: "declare", zh: "日前申报 / 采购", en: "Day-ahead declaration", cu: 3.0, co: 1.0, unit: "¥/kW", zhNote: "报少了被考核,报多了付冗余", enNote: "under-declare is penalised, over-declare is paid for" },
  { k: "demand",  zh: "需量控制",       en: "Demand-charge control", cu: 6.0, co: 0.8, unit: "¥/kW", zhNote: "顶破需量的代价远大于多削一点", enNote: "breaking the demand cap costs far more than shaving extra" },
  { k: "storage", zh: "储能调度",       en: "Storage dispatch",      cu: 1.4, co: 1.0, unit: "¥/kW", zhNote: "两边都是错过的套利,略不对称", enNote: "both sides are missed arbitrage, mildly asymmetric" },
  { k: "alarm",   zh: "异常告警",       en: "Anomaly alerting",      cu: 12.0, co: 0.6, unit: "¥/kW", zhNote: "漏报=停机,误报=信任", enNote: "a miss is downtime, a false alarm is trust" },
];
function ValueViz() {
  const L = useL();
  const lang = useLang();
  const [dk, setDk] = React.useState("demand");
  const [sigma, setSigma] = React.useState(90);     // forecast error sd, kW
  const [margin, setMargin] = React.useState(0);    // kW added to the forecast
  const D = DECISIONS.find((d) => d.k === dk);

  // E[cost] for a normal error with an added margin m.
  const cost = (m) => {
    const z = m / sigma;
    const eOver = m * normCdf(z) + sigma * normPdf(z);      // E[(e+m)+]
    const eUnder = -m * normCdf(-z) + sigma * normPdf(z);   // E[(-(e+m))+]
    return D.cu * eUnder + D.co * eOver;
  };
  // optimal margin = the (cu/(cu+co)) quantile of the error distribution
  const tau = D.cu / (D.cu + D.co);
  let best = 0, bestC = Infinity;
  for (let m = -1.5 * sigma; m <= 3 * sigma; m += sigma / 100) { const c = cost(m); if (c < bestC) { bestC = c; best = m; } }
  const c0 = cost(0), cNow = cost(margin);
  const curve = [];
  for (let m = -1.2 * sigma; m <= 2.6 * sigma; m += sigma / 20) curve.push({ x: m, y: cost(m) });
  const markI = Math.round((margin + 1.2 * sigma) / (sigma / 20));

  return (
    <div>
      <VizHead idx="SG2" title={L("不对称代价:最优的预测并不是「无偏」的预测", "Asymmetric cost: the best forecast is not the unbiased one")} />
      <div className="viz-ctrl">
        <Choice label={L("下游决策", "Downstream decision")} value={dk} onChange={setDk}
          options={DECISIONS.map((d) => ({ v: d.k, l: pick(lang, d) }))} />
        <Slider label={L("预测误差标准差", "Forecast error sd")} min={20} max={260} step={5} value={sigma} onChange={setSigma} unit=" kW" />
        <Slider label={L("你加的安全裕度", "Safety margin you add")} min={-150} max={400} step={5} value={margin} onChange={setMargin} unit=" kW" />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("低估单价 / 高估单价", "Under / over unit cost")} value={`${nf(D.cu, 1)} : ${nf(D.co, 1)}`} hint={pick(lang, { zh: D.zhNote, en: D.enNote })} />
        <Kpi label={L("最优分位数 τ", "Optimal quantile τ")} value={nf(tau, 3)} tone="acc" hint={L("cu ÷ (cu+co)", "cu ÷ (cu+co)")} />
        <Kpi label={L("最优安全裕度", "Optimal margin")} value={kw(best)} tone="ok" hint={L(`≈ ${nf(best / sigma, 2)} σ`, `≈ ${nf(best / sigma, 2)} σ`)} />
        <Kpi label={L("无裕度 → 最优,成本下降", "Cost cut, zero margin → optimal")} value={pct1((c0 - bestC) / c0)} tone="ok" hint={`${yuan(c0)} → ${yuan(bestC)}`} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("期望代价随安全裕度的变化(虚线为你当前的裕度)", "Expected cost against the margin you add (dashed = your current margin)")}</div>
        <MiniPlot data={curve} h={120} markIndex={markI} yMin={0} />
      </div>

      <div style={{ marginTop: 8 }}>
        <Bar label={L("当前裕度的期望代价", "Cost at your margin")} value={cNow} max={c0 * 1.6} tone={cNow > bestC * 1.15 ? "warn" : "ok"} valText={yuan(cNow)} />
        <Bar label={L("最优裕度的期望代价", "Cost at the optimal margin")} value={bestC} max={c0 * 1.6} tone="ok" valText={yuan(bestC)} />
        <Bar label={L("完美预测(σ=0)", "Perfect forecast (σ=0)")} value={0} max={c0 * 1.6} tone="mut" valText={yuan(0)} />
      </div>

      <Note mark="→" tone={Math.abs(margin - best) < sigma * 0.15 ? "on" : "bad"}>
        {L(`低估比高估贵 ${nf(D.cu / D.co, 1)} 倍,所以最优做法不是把预测做成无偏的,而是整体上抬 ${kw(best)}——这正好等于误差分布的 ${nf(tau, 2)} 分位数。换句话说:你应该直接用 pinball loss 训一个 τ=${nf(tau, 2)} 的分位数模型(ML3),而不是先用 MSE 训一个无偏模型、再手工加一个常数裕度——后者那个常数会在 σ 变化时立刻失效。完美预测每千瓦省下 ${yuan(bestC)},这就是这个项目的价值上限。`,
            `Being low costs ${nf(D.cu / D.co, 1)}× being high, so the best move is not an unbiased forecast but one lifted by ${kw(best)} — which is exactly the ${nf(tau, 2)} quantile of the error distribution. In other words: train a τ=${nf(tau, 2)} quantile model with pinball loss (ML3) rather than fitting MSE and bolting on a constant margin — that constant stops working the moment σ moves. A perfect forecast saves ${yuan(bestC)} per kW, and that is this project's value ceiling.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t3 · baselineLab — the bar every model must clear
   ========================================================= */
function BaselineViz() {
  const L = useL();
  const [weekly, setWeekly] = React.useState(1);     // weekly regularity
  const [noise, setNoise] = React.useState(1);
  const [odd, setOdd] = React.useState(1);           // abnormal days in the test window
  const [weeks, setWeeks] = React.useState(6);

  const R = React.useMemo(() => {
    const days = weeks * 7;
    const S = synth({ days, seed: 11, noise, weekend: weekly > 0.5 ? 0.35 : 0.9, maint: odd >= 1 ? days - 9 : -1 });
    const y = S.y.slice();
    // extra abnormal days: an unscheduled stoppage inside the test window
    if (odd >= 2) for (let i = (days - 4) * SLOTS; i < (days - 4) * SLOTS + SLOTS; i++) y[i] *= 0.25;
    const start = (days - 7) * SLOTS;               // evaluate the last week
    const idx = []; for (let i = start; i < y.length; i++) idx.push(i);
    const take = (f) => idx.map(f);
    const truth = take((i) => y[i]);
    const preds = {
      d1: take((i) => y[i - SLOTS]),
      w1: take((i) => y[i - 7 * SLOTS]),
      med: take((i) => quantileOf([y[i - 7 * SLOTS], y[i - 14 * SLOTS], y[i - 21 * SLOTS], y[i - 28 * SLOTS]].filter((v) => v != null), 0.5)),
      ma: take((i) => mean([y[i - SLOTS], y[i - 2 * SLOTS], y[i - 3 * SLOTS], y[i - 4 * SLOTS]])),
    };
    return { truth, preds };
  }, [weekly, noise, odd, weeks]);

  const rows = [
    { k: "d1", zh: "昨日同刻", en: "Yesterday, same slot" },
    { k: "w1", zh: "上周同刻", en: "Last week, same slot" },
    { k: "med", zh: "近 4 周同刻中位数", en: "4-week same-slot median" },
    { k: "ma", zh: "近 4 日同刻均值", en: "4-day same-slot mean" },
  ].map((r) => {
    const p = R.preds[r.k];
    return { ...r, mape: mape(R.truth, p), wape: wape(R.truth, p), mase: mase(R.truth, p, SLOTS) };
  });
  const best = rows.reduce((a, b) => (b.wape < a.wape ? b : a));
  const worst = rows.reduce((a, b) => (b.wape > a.wape ? b : a));
  const lang = useLang();

  return (
    <div>
      <VizHead idx="SG3" title={L("四条不用训练的基线:先知道自己的数据有多好预测", "Four training-free baselines: learn how predictable your data already is")} />
      <div className="viz-ctrl">
        <Slider label={L("周规律性(三班倒 ↔ 随机排产)", "Weekly regularity")} min={0} max={1} step={0.1} value={weekly} onChange={setWeekly} fmt={pct} />
        <Slider label={L("噪声水平", "Noise level")} min={0.2} max={3} step={0.1} value={noise} onChange={setNoise} />
        <Slider label={L("测试周内异常天数", "Abnormal days in the test week")} min={0} max={2} value={odd} onChange={setOdd} unit={L(" 天", " d")} />
        <Slider label={L("历史长度", "History")} min={5} max={12} value={weeks} onChange={setWeeks} unit={L(" 周", " wk")} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("最好的基线", "Best baseline")} value={pick(lang, best)} tone="ok" hint={`WAPE ${pct1(best.wape)}`} />
        <Kpi label={L("它的 MAPE", "Its MAPE")} value={pct1(best.mape)} tone={best.mape < 0.12 ? "ok" : "warn"} hint={L("这就是你的及格线", "this is your pass mark")} />
        <Kpi label={L("最差的基线", "Worst baseline")} value={pick(lang, worst)} tone="warn" hint={`WAPE ${pct1(worst.wape)}`} />
        <Kpi label={L("最好与最差之差", "Best vs worst")} value={pct1(worst.wape - best.wape)} tone="acc" hint={L("选错基线就白送这么多", "picking the wrong one gives this away")} />
      </div>

      <div style={{ marginTop: 10 }}>
        {rows.map((r) => (
          <Bar key={r.k} label={pick(lang, r)} value={r.wape} max={Math.max(...rows.map((x) => x.wape)) * 1.2} tone={r.k === best.k ? "ok" : "acc"}
            valText={`WAPE ${pct1(r.wape)} · MASE ${nf(r.mase, 2)}`} />
        ))}
      </div>

      <Note mark="→" tone="on">
        {L(`这份数据用「${pick(lang, best)}」这一条规则就能做到 WAPE ${pct1(best.wape)},没有训练、没有特征、没有 GPU。你后面所有模型必须先跨过这根横杆——MASE 小于 1 才算有价值。把周规律性拖到 0(排产随机),你会看到「上周同刻」立刻输给「昨日同刻」:基线的排名本身就是你这条产线规律性的诊断。`,
            `This data reaches WAPE ${pct1(best.wape)} with the single rule '${pick(lang, best)}' — no training, no features, no GPU. Every later model must clear that bar, and only MASE below 1 counts as value. Drag weekly regularity to zero (random scheduling) and last-week-same-slot immediately loses to yesterday-same-slot: the ranking of the baselines is itself a diagnosis of how regular your line is.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t4 · chainLab — where the data deforms on its way to you
   ========================================================= */
function ChainViz() {
  const L = useL();
  const [deadband, setDeadband] = React.useState(2);   // % of full scale
  const [scan, setScan] = React.useState(5);           // historian scan period, minutes
  const [aggr, setAggr] = React.useState("mean");      // mean | last | max
  const [spiky, setSpiky] = React.useState(1);

  const R = React.useMemo(() => {
    // One day of true 1-minute data with short excursions the historian may eat.
    const r = rng(23), n = 1440, truth = [], spikeAt = [];
    for (let i = 0; i < n; i++) {
      const hour = i / 60;
      let duty = hour >= 7.5 && hour < 23 ? 1 : 0.15;
      if (hour >= 11.5 && hour < 12.5) duty = 0.5;
      let v = 420 + 980 * duty + 40 * gauss(r);
      truth.push(Math.max(0, v));
    }
    // compressor / injection inrushes: 2-4 minutes, well above the running load
    for (let i = 60; i < n - 10; i++) {
      const hour = i / 60;
      if (hour > 7.5 && hour < 23 && r() < 0.02 * spiky) {
        const len = 2 + Math.floor(r() * 3), amp = 300 + 220 * r();
        for (let k = 0; k < len; k++) truth[i + k] += amp;
        spikeAt.push({ i, len, amp });
        i += len + 20;
      }
    }
    // What the historian actually keeps: a sample is WRITTEN only at its own scan
    // period and only when the value has moved more than the deadband. Analog tags
    // are then reconstructed by interpolating between stored samples (this is what
    // swinging-door guarantees), so an excursion between two writes disappears.
    const full = Math.max(...truth), db = (deadband / 100) * full;
    const keptI = [0], keptV = [truth[0]];
    for (let i = 1; i < n; i++) {
      if (i % Math.max(1, scan) !== 0) continue;
      if (Math.abs(truth[i] - keptV[keptV.length - 1]) >= db) { keptI.push(i); keptV.push(truth[i]); }
    }
    keptI.push(n - 1); keptV.push(truth[n - 1]);
    const stored = new Array(n);
    for (let k = 0; k + 1 < keptI.length; k++) {
      const a = keptI[k], b = keptI[k + 1];
      for (let i = a; i <= b; i++) stored[i] = keptV[k] + ((keptV[k + 1] - keptV[k]) * (i - a)) / Math.max(1, b - a);
    }
    // Export: 1-min to 15-min under the chosen rule, and under the billing rule.
    const agg = (src, rule) => { const o = []; for (let i = 0; i + 15 <= n; i += 15) { const w = src.slice(i, i + 15); o.push(rule === "mean" ? mean(w) : rule === "max" ? Math.max(...w) : w[w.length - 1]); } return o; };
    const trueQ = agg(truth, "mean"), gotQ = agg(stored, "mean");
    const altQ = agg(truth, aggr);
    // how many injected excursions survive into the delivered archive
    const kept = spikeAt.filter((sp) => Math.max(...stored.slice(sp.i, sp.i + sp.len)) > truth[sp.i - 1] + sp.amp * 0.5).length;
    return { truth, stored, trueQ, gotQ, altQ, spikes: spikeAt.length, kept, writes: keptI.length };
  }, [deadband, scan, aggr, spiky]);

  // Compression removes the excursion itself, so measure it on the tag, not on
  // the 15-min mean (where interpolating a kept peak widens it instead).
  const peakTrue = Math.max(...R.truth), peakGot = Math.max(...R.stored);
  const peakLoss = (peakTrue - peakGot) / peakTrue;
  const dTrue = Math.max(...R.trueQ), dGot = Math.max(...R.gotQ);
  const demandLoss = (dTrue - dGot) / dTrue;
  const energyErr = (mean(R.gotQ) - mean(R.trueQ)) / mean(R.trueQ);
  const aggrGap = (Math.max(...R.altQ) - peakTrue) / peakTrue;
  const lost = R.spikes - R.kept;

  return (
    <div>
      <VizHead idx="DT1" title={L("采集链路:一条干净的曲线,怎么变成你手上那份数据", "The chain: how a clean curve becomes the file you actually have")} />
      <div className="viz-ctrl">
        <Slider label={L("历史库死区", "Historian deadband")} min={0} max={8} step={0.5} value={deadband} onChange={setDeadband} unit=" %" />
        <Slider label={L("历史库存储周期", "Historian scan period")} min={1} max={30} value={scan} onChange={setScan} unit=" min" />
        <Choice label={L("15 分钟聚合口径", "15-min aggregation")} value={aggr} onChange={setAggr}
          options={[{ v: "mean", l: L("区间均值(计费口径)", "interval mean (billing)") }, { v: "last", l: L("末值采样", "last value") }, { v: "max", l: L("区间最大", "interval max") }]} />
        <Slider label={L("冲击负荷密度", "Inrush density")} min={0} max={2} step={0.1} value={spiky} onChange={setSpiky} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("瞬时峰值被削掉", "Instantaneous peak shaved")} value={pct1(Math.max(0, peakLoss))} tone={peakLoss > 0.02 ? "warn" : "ok"} hint={`${kw(peakTrue)} → ${kw(peakGot)}`} />
        <Kpi label={L("电量误差", "Energy error")} value={pct2(Math.abs(energyErr))} tone={Math.abs(energyErr) > 0.01 ? "warn" : "ok"} hint={L("压缩对总量几乎无损", "compression is near-lossless on totals")} />
        <Kpi label={L("15 分钟需量偏差", "15-min demand deviation")} value={`${demandLoss >= 0 ? "-" : "+"}${pct1(Math.abs(demandLoss))}`} tone={Math.abs(demandLoss) > 0.01 ? "warn" : "ok"} hint={`${kw(dTrue)} → ${kw(dGot)}`} />
        <Kpi label={L("冲击事件丢失", "Inrush events lost")} value={`${lost} / ${R.spikes}`} tone={lost > 0 ? "warn" : "ok"} hint={L(`全天只写了 ${R.writes} 个点`, `only ${R.writes} samples written all day`)} />
        <Kpi label={L("聚合口径偏差", "Aggregation bias")} value={aggr === "mean" ? L("基准", "baseline") : `${aggrGap >= 0 ? "+" : ""}${pct1(aggrGap)}`} tone={aggr === "mean" ? "ok" : "warn"} hint={L("需量只认区间均值", "demand is billed on the interval mean")} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("真实 1 分钟曲线(上)与历史库交回给你的同一天(下)", "The true 1-minute curve (top) and the same day as the historian hands it back (bottom)")}</div>
        <MiniPlot data={R.truth.map((v, i) => ({ x: i, y: v })).filter((_, i) => i % 2 === 0)} h={104} yMin={0} yMax={Math.max(...R.truth) * 1.06} />
        <MiniPlot data={R.stored.map((v, i) => ({ x: i, y: v })).filter((_, i) => i % 2 === 0)} h={104} yMin={0} yMax={Math.max(...R.truth) * 1.06} stroke="var(--accent)" />
      </div>

      <Note mark="→" tone={lost > 0 || peakLoss > 0.02 ? "bad" : "on"}>
        {L(`历史库每 ${scan} 分钟才写一次,且变化不到 ${deadband}% 满量程就不写:全天 1440 个真实采样,最后只存下 ${R.writes} 个点。总电量只差 ${pct2(Math.abs(energyErr))}——这正是压缩算法当年被批准上线的理由;但 ${R.spikes} 次冲击负荷里有 ${lost} 次整段落在两次写入之间、被直接插值抹平,瞬时峰值因此少了 ${pct1(Math.max(0, peakLoss))}(${kw(peakTrue)} → ${kw(peakGot)}),而 15 分钟需量反过来被插值抬高了 ${pct1(Math.abs(demandLoss))}:压缩把窄尖峰抹掉、又把留下来的那些拉宽,于是瞬时值偏低、区间均值偏高——两个方向相反的错,靠"再校准一下"是修不好的。如果你预测的是需量,这一刀正好砍在你唯一要的地方,而且没有任何告警会告诉你——你只会发现模型"莫名其妙地低估峰值"。把存储周期拖到 1 分钟,冲击就全回来了。`,
            `The historian writes only every ${scan} minutes, and only when the value moves more than ${deadband}% of full scale: of 1,440 true samples in the day, ${R.writes} are stored. Total energy is only ${pct2(Math.abs(energyErr))} out — which is exactly why the compression was approved years ago — but ${lost} of the ${R.spikes} inrush events fall entirely between two writes and are interpolated away, taking ${pct1(Math.max(0, peakLoss))} off the instantaneous peak (${kw(peakTrue)} → ${kw(peakGot)}) while the 15-minute demand moves the other way, inflated ${pct1(Math.abs(demandLoss))} by the interpolation: compression deletes the narrow spikes and widens the ones it keeps, so instantaneous values read low and interval means read high — two errors in opposite directions, which no single recalibration can fix. If you are forecasting demand, that cut lands on the one thing you needed, and no alarm will tell you — you will simply find that the model "mysteriously underestimates peaks". Drag the scan period to one minute and the inrushes all come back.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t5 · cleanLab — flag it, or fill it?
   ========================================================= */
const DEFECTS = [
  { k: "comms", zh: "通信中断(30 分钟空洞)", en: "Comms dropout (30-min holes)" },
  { k: "stop",  zh: "计划停机(8 小时零值)",  en: "Planned shutdown (8 h of zeros)" },
  { k: "stuck", zh: "仪表卡死(重复上一值)",  en: "Stuck sensor (last value repeated)" },
  { k: "spike", zh: "坏点尖刺",               en: "Spike outliers" },
  { k: "mixed", zh: "四种混在一起",           en: "All four together" },
];
const TREATS = [
  { k: "none",   zh: "原样不动", en: "Leave as is" },
  { k: "linear", zh: "线性插值", en: "Linear interpolation" },
  { k: "ffill",  zh: "前值填充", en: "Forward fill" },
  { k: "meanf",  zh: "均值填充", en: "Mean fill" },
  { k: "flag",   zh: "标记 + 跳到上一个有效同刻", en: "Flag + fall back to last valid slot" },
  { k: "smart",  zh: "先分类,再按类处理", en: "Classify first, then treat by class" },
];
function CleanViz() {
  const L = useL();
  const lang = useLang();
  const [defect, setDefect] = React.useState("mixed");
  const [treat, setTreat] = React.useState("linear");
  const [severity, setSeverity] = React.useState(1);

  const R = React.useMemo(() => {
    const days = 21;
    const S = synth({ days, seed: 31, noise: 0.9 });
    const truth = S.y.slice();
    const bad = truth.map(() => false);   // what a naive pipeline flags as suspect
    const kind = truth.map(() => "");
    const r = rng(5);
    const use = (k) => defect === "mixed" || defect === k;

    // A planned shutdown is a REAL event, not a recording fault: the true load is
    // standby and the meter records it correctly. It only looks like an anomaly.
    if (use("stop")) for (const d of [days - 10, days - 3]) {
      const st = d * SLOTS + 28;
      for (let i = st; i < st + Math.round(32 * severity); i++) { truth[i] = S.base[i] + 30 + 12 * gauss(r); bad[i] = true; kind[i] = "stop"; }
    }
    // The other three ARE recording faults: the process ran, the record lies.
    const dirty = truth.slice();
    if (use("comms")) for (let d = 3; d < days - 1; d++) {
      if (r() < 0.6 * severity) { const st = d * SLOTS + Math.floor(r() * 80); for (let i = st; i < Math.min(st + 2, truth.length); i++) { dirty[i] = NaN; bad[i] = true; kind[i] = "comms"; } }
    }
    if (use("stuck")) { const st = (days - 14) * SLOTS + 40, v = dirty[st - 1]; for (let i = st; i < st + Math.round(24 * severity); i++) { dirty[i] = v; bad[i] = true; kind[i] = "stuck"; } }
    if (use("spike")) for (let i = 0; i < truth.length; i++) if (!bad[i] && r() < 0.004 * severity) { dirty[i] = truth[i] * (2.6 + r()); bad[i] = true; kind[i] = "spike"; }

    const gmean = mean(truth.filter((v) => v > 0));
    // Apply one blanket treatment to everything the pipeline flagged.
    const apply = (t) => {
      const f = dirty.slice();
      if (t === "linear") {
        for (let i = 0; i < f.length; i++) if (bad[i]) {
          let a = i - 1; while (a >= 0 && bad[a]) a--;
          let b = i + 1; while (b < f.length && bad[b]) b++;
          const va = a >= 0 ? f[a] : gmean, vb = b < f.length ? f[b] : gmean;
          f[i] = va + ((vb - va) * (i - a)) / Math.max(1, b - a);
        }
      } else if (t === "ffill") { for (let i = 1; i < f.length; i++) if (bad[i] || !isFinite(f[i])) f[i] = f[i - 1]; }
      else if (t === "meanf") { for (let i = 0; i < f.length; i++) if (bad[i] || !isFinite(f[i])) f[i] = gmean; }
      else { for (let i = 0; i < f.length; i++) if (!isFinite(f[i])) f[i] = 0; }
      return f;
    };

    const startI = (days - 6) * SLOTS;    // the last 6 days, containing a scheduled shutdown
    const interp = apply("linear");
    // The maintenance calendar is known in advance. Knowing WHEN a shutdown is
    // coming only helps if the history still shows what one LOOKS like — if you
    // interpolated them away, the level the model learns for "shutdown" is a
    // normal day, and the calendar entry buys you nothing.
    const shutLevel = (f) => {
      const v = [];
      for (let i = 0; i < startI; i++) if (kind[i] === "stop") v.push(isFinite(f[i]) ? f[i] : 0);
      return v.length ? mean(v) : 0;
    };
    const score = (t) => {
      const keepsTruth = t === "flag" || t === "smart";
      const filled = keepsTruth ? dirty : apply(t);
      const lvl = shutLevel(filled);
      const yt = [], pr = [];
      for (let i = startI; i < truth.length; i++) {
        let v;
        if (kind[i] === "stop") v = lvl;                    // the calendar says: shutdown today
        else {
          let src = i - SLOTS;
          if (t === "flag") { let g = 0; while (g < 6 && bad[src]) { src -= SLOTS; g++; } v = truth[src]; }
          else if (t === "smart") {
            if (kind[src] === "comms" || kind[src] === "spike") v = interp[src];
            else if (bad[src]) { let g = 0; while (g < 6 && bad[src]) { src -= SLOTS; g++; } v = truth[src]; }
            else v = dirty[src];
          } else v = filled[src];
        }
        if (!isFinite(v)) continue;
        yt.push(truth[i]); pr.push(v);
      }
      return wape(yt, pr);
    };
    const scores = {}; TREATS.forEach((t) => { scores[t.k] = score(t.k); });
    const shown = (treat === "flag" || treat === "smart") ? dirty : apply(treat);
    return { truth, dirty, bad, fixed: shown, scores, badN: bad.filter(Boolean).length };
  }, [defect, treat, severity]);

  const err = R.scores[treat];
  const best = TREATS.reduce((a, b) => (R.scores[b.k] < R.scores[a.k] ? b : a));
  const maxE = Math.max(...TREATS.map((t) => R.scores[t.k]));

  return (
    <div>
      <VizHead idx="DT2" title={L("五类缺陷 × 五种处理:填补得越聪明,模型学到的假东西越多", "Five defects, five treatments: the cleverer the fill, the more fiction the model learns")} />
      <div className="viz-ctrl">
        <Choice label={L("注入的缺陷", "Injected defect")} value={defect} onChange={setDefect} options={DEFECTS.map((d) => ({ v: d.k, l: pick(lang, d) }))} />
        <Choice label={L("处理方式", "Treatment")} value={treat} onChange={setTreat} options={TREATS.map((d) => ({ v: d.k, l: pick(lang, d) }))} />
        <Slider label={L("严重程度", "Severity")} min={0.3} max={2} step={0.1} value={severity} onChange={setSeverity} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("受影响的点", "Affected points")} value={nf(R.badN, 0)} hint={pct1(R.badN / R.truth.length)} tone="acc" />
        <Kpi label={L("当前处理的下游 WAPE", "Downstream WAPE, this treatment")} value={pct1(err)} tone={err > R.scores[best.k] * 1.1 ? "warn" : "ok"} hint={L("季节朴素预测,按真值评分", "seasonal-naive, scored on truth")} />
        <Kpi label={L("最好的处理", "Best treatment")} value={pick(lang, best)} tone="ok" hint={pct1(R.scores[best.k])} />
        <Kpi label={L("你比最好差了", "You are behind by")} value={`${nf((err - R.scores[best.k]) * 100, 1)} pt`} tone={err > R.scores[best.k] * 1.1 ? "warn" : "ok"} />
      </div>

      <div style={{ marginTop: 10 }}>
        {TREATS.map((t) => (
          <Bar key={t.k} label={pick(lang, t) + (t.k === treat ? L("(当前)", " (current)") : "")} value={R.scores[t.k]} max={maxE * 1.15}
            tone={t.k === best.k ? "ok" : t.k === treat ? "acc" : "mut"} valText={pct1(R.scores[t.k])} />
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("真值(上)与处理后的训练序列(下)", "Truth (top) against the treated training series (bottom)")}</div>
        <MiniPlot data={R.truth.map((v, i) => ({ x: i, y: v })).filter((_, i) => i % 3 === 0)} h={100} yMin={0} />
        <MiniPlot data={R.fixed.map((v, i) => ({ x: i, y: isFinite(v) ? v : 0 })).filter((_, i) => i % 3 === 0)} h={100} yMin={0} stroke="var(--accent)" />
      </div>

      <Note mark="→" tone={treat === best.k ? "on" : "bad"}>
        {L(`把缺陷切换成「计划停机」,线性插值立刻垫底——它把停机抹成一条斜坡,等于告诉模型"这天没停过机",而识别停机恰恰是你最需要它学会的事。再切到「坏点尖刺」,线性插值反而最好——孤立的坏点两边都是真值,插出来几乎就是真值,而"跳回上一天同刻"白白引入了一整天的日间差异。这正是本章的论点:没有哪一种填补方法在所有缺陷上都对,先分类再决定动作才对。当前最好的是「${pick(lang, best)}」(WAPE ${pct1(R.scores[best.k])}),你选的是 ${pct1(err)}。在四种缺陷混在一起时,赢的总是「先分类,再按类处理」。`,
            `Switch the defect to a planned shutdown and linear interpolation drops to last place — it turns the shutdown into a ramp, telling the model no shutdown happened, which is precisely the pattern you needed it to learn. Switch to spike outliers and linear interpolation becomes the best — an isolated bad point has true values either side, so the interpolant is nearly the truth, while falling back a whole day imports a day's worth of difference for nothing. That is the chapter's argument: no single filling method is right for every defect, and classification has to come before the decision. Right now the best is "${pick(lang, best)}" at WAPE ${pct1(R.scores[best.k])} against your ${pct1(err)}. When all four defects are mixed together, classify-then-treat wins.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t6 · alignLab — offsets, forecasts and thermal lag
   ========================================================= */
function AlignViz() {
  const L = useL();
  const [offset, setOffset] = React.useState(1);      // hours the weather join is out by
  const [useMeasured, setUseMeasured] = React.useState(true);
  const [fcErr, setFcErr] = React.useState(1.6);      // forecast temperature error, °C
  const [lagH, setLagH] = React.useState(0);          // lag applied to the temp feature
  const TRUE_LAG = 2;                                  // thermal inertia of the building

  const R = React.useMemo(() => {
    const days = 28, S = synth({ days, seed: 17, noise: 0.8 });
    const r = rng(77);
    const tempTrue = S.temp;
    const tempFc = tempTrue.map((v) => v + fcErr * gauss(r));
    // the target already contains a cooling load driven by temp lagged 2 h
    const n = S.y.length, y = S.y.slice();
    for (let i = 0; i < n; i++) {
      const src = Math.max(0, i - TRUE_LAG * 4);
      y[i] += 27 * Math.pow(Math.max(0, tempTrue[src] - 24), 1.25) - S.wx[i];
    }
    const featOf = (base) => base.map((_, i) => base[clamp(i - lagH * 4 + Math.round(offset * 4), 0, n - 1)]);
    const fTrain = featOf(useMeasured ? tempTrue : tempFc);
    const fServe = featOf(tempFc);   // at inference you only ever have the forecast
    const cdd = (t) => Math.pow(Math.max(0, t - 24), 1.25);
    const build = (f) => f.map((t, i) => [1, cdd(t), S.proc[i] / 1000, Math.sin((2 * Math.PI * (i % SLOTS)) / SLOTS), Math.cos((2 * Math.PI * (i % SLOTS)) / SLOTS)]);
    const cut = Math.floor(n * 0.75);
    const Xtr = build(fTrain).slice(0, cut), ytr = y.slice(0, cut);
    const b = ridge(Xtr, ytr, 1e-2);
    const Xte = build(fTrain).slice(cut), XteReal = build(fServe).slice(cut), yte = y.slice(cut);
    const pOff = Xte.map((x) => dot(b, x));
    const pOn = XteReal.map((x) => dot(b, x));
    // a model with no weather feature at all, as the reference
    const b0 = ridge(Xtr.map((x) => [x[0], x[2], x[3], x[4]]), ytr, 1e-2);
    const p0 = Xte.map((x) => dot(b0, [x[0], x[2], x[3], x[4]]));
    // the same model with the feature aligned correctly, as the reference point
    const fBest = tempTrue.map((_, i) => tempTrue[clamp(i - TRUE_LAG * 4, 0, n - 1)]);
    const Xb = build(fBest);
    const bb = ridge(Xb.slice(0, cut), ytr, 1e-2);
    const pBest = Xb.slice(cut).map((x) => dot(bb, x));
    return { y, yte, pOff, pOn, p0, pBest };
  }, [offset, useMeasured, fcErr, lagH]);

  const eOff = wape(R.yte, R.pOff), eOn = wape(R.yte, R.pOn), e0 = wape(R.yte, R.p0);
  const eBest = wape(R.yte, R.pBest);
  const gain = (e0 - eOff) / e0, gainBest = (e0 - eBest) / e0;
  const illusion = eOn - eOff;

  return (
    <div>
      <VizHead idx="DT3" title={L("对齐:时标错一小时,温度特征就白加了", "Alignment: one hour out, and the temperature feature was added for nothing")} />
      <div className="viz-ctrl">
        <Slider label={L("时标偏移(负荷 vs 气象)", "Timestamp offset (load vs weather)")} min={-3} max={3} step={0.25} value={offset} onChange={setOffset} unit=" h" />
        <Slider label={L("特征上加的滞后", "Lag applied to the feature")} min={0} max={5} step={0.25} value={lagH} onChange={setLagH} unit=" h" />
        <Slider label={L("气象预报误差", "Weather forecast error")} min={0} max={4} step={0.2} value={fcErr} onChange={setFcErr} unit=" °C" />
        <Toggle label={L("训练用实测气温(而非预报)", "Train on measured temperature")} value={useMeasured} onChange={setUseMeasured} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("当前对齐下的增益", "Gain at your alignment")} value={pct1(Math.max(0, gain))} tone={gain > gainBest * 0.8 ? "ok" : "warn"} hint={L(`无温度特征 WAPE ${pct1(e0)}`, `WAPE without it: ${pct1(e0)}`)} />
        <Kpi label={L("正确对齐能给的增益", "Gain when aligned correctly")} value={pct1(Math.max(0, gainBest))} tone="ok" hint={L(`偏移 0 h,滞后 ${TRUE_LAG} h`, `offset 0 h, lag ${TRUE_LAG} h`)} />
        <Kpi label={L("离线 WAPE / 上线 WAPE", "Offline / online WAPE")} value={`${pct1(eOff)} → ${pct1(eOn)}`} tone={illusion > 0.005 ? "warn" : "ok"} />
        <Kpi label={L("虚高了", "Score inflated by")} value={`${nf(illusion * 100, 1)} pt`} tone={illusion > 0.005 ? "warn" : "ok"} hint={L("用实测代替预报的代价", "the cost of using measurements for forecasts")} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("不用温度特征", "No temperature feature")} value={e0} max={Math.max(e0, eOn) * 1.2} tone="mut" valText={pct1(e0)} />
        <Bar label={L("离线成绩(你汇报的那个)", "Offline score (the one you report)")} value={eOff} max={Math.max(e0, eOn) * 1.2} tone="ok" valText={pct1(eOff)} />
        <Bar label={L("线上成绩(你实际得到的)", "Online score (the one you get)")} value={eOn} max={Math.max(e0, eOn) * 1.2} tone={illusion > 0.01 ? "warn" : "acc"} valText={pct1(eOn)} />
      </div>

      <Note mark="→" tone={Math.abs(offset) > 0.3 || (useMeasured && illusion > 0.01) ? "bad" : "on"}>
        {L(`这栋厂房的热惯性是 ${TRUE_LAG} 小时——现在的气温驱动的是两小时后的制冷负荷。把「特征上加的滞后」拖到 ${TRUE_LAG} 小时、把时标偏移归零,温度特征能给 ${pct1(Math.max(0, gainBest))} 的增益;在你当前这个对齐下只剩 ${pct1(Math.max(0, gain))}——同一个特征、同一个模型,差别全在对齐上。另一件事更隐蔽:训练用实测气温、上线只有预报,两者差 ${nf(illusion * 100, 1)} 个点——这个差额不会出现在任何离线报告里,它只在上线那天出现。`,
            `This building's thermal inertia is ${TRUE_LAG} hours — today's temperature drives the cooling load two hours later. Set the feature lag to ${TRUE_LAG} and the offset to zero and the temperature feature is worth ${pct1(Math.max(0, gainBest))}; at your current alignment only ${pct1(Math.max(0, gain))} survives — same feature, same model, the whole difference is alignment. The subtler problem: training on measured temperature while inference only ever has a forecast costs ${nf(illusion * 100, 1)} points — a gap that appears in no offline report, only on go-live day.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t7 · leakLab — the same model, two validation schemes
   ========================================================= */
function LeakViz() {
  const L = useL();
  const [shuffle, setShuffle] = React.useState(true);
  const [useLag1, setUseLag1] = React.useState(true);
  const [globalScale, setGlobalScale] = React.useState(true);
  const [rollNow, setRollNow] = React.useState(true);
  const [horizon, setHorizon] = React.useState(96);
  const [gap, setGap] = React.useState(0);

  const R = React.useMemo(() => {
    const days = 40, S = synth({ days, seed: 41, noise: 0.45 });
    const y = S.y, n = y.length;
    const rows = [], tgt = [], idx = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const lagH = y[i - horizon];                 // always legitimate
      const lag1 = y[i - 1];                       // NOT available h steps ahead
      const lagW = y[i - 7 * SLOTS];
      // a rolling window must be half-open on the RIGHT; including i is the
      // single most common leak in feature code, and the most devastating
      const roll = rollNow ? mean(y.slice(i - 7, i + 1)) : mean(y.slice(i - horizon - 8, i - horizon));
      const s = i % SLOTS;
      rows.push([1, lagH, lagW, roll, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS), useLag1 ? lag1 : 0]);
      tgt.push(y[i]); idx.push(i);
    }
    // scaling: "global" uses statistics from the WHOLE set (a leak), otherwise train-only
    const cut = Math.floor(rows.length * 0.75);
    const order = rows.map((_, i) => i);
    if (shuffle) { const r = rng(9); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; } }
    let trainI = order.slice(0, cut), testI = order.slice(cut);
    if (!shuffle && gap > 0) trainI = trainI.filter((i) => i < cut - gap);
    const src = globalScale ? rows : trainI.map((i) => rows[i]);
    const mu = rows[0].map((_, c) => mean(src.map((r) => (Array.isArray(r) ? r[c] : rows[r][c]))));
    const sg = rows[0].map((_, c) => Math.max(1e-6, sd(src.map((r) => (Array.isArray(r) ? r[c] : rows[r][c])))));
    const sc = (r) => r.map((v, c) => (c === 0 ? 1 : (v - mu[c]) / sg[c]));
    const b = ridge(trainI.map((i) => sc(rows[i])), trainI.map((i) => tgt[i]), 1e-2);
    const yt = testI.map((i) => tgt[i]), pr = testI.map((i) => dot(b, sc(rows[i])));
    return { err: wape(yt, pr), mp: mape(yt, pr), nTrain: trainI.length, nTest: testI.length };
  }, [shuffle, useLag1, globalScale, rollNow, horizon, gap]);

  // the honest reference: time split, no lag_1, train-only scaling
  const honest = React.useMemo(() => {
    const days = 40, S = synth({ days, seed: 41, noise: 0.45 }), y = S.y, n = y.length;
    const rows = [], tgt = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const s = i % SLOTS;
      rows.push([1, y[i - horizon], y[i - 7 * SLOTS], mean(y.slice(i - horizon - 8, i - horizon)), Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS), 0]);
      tgt.push(y[i]);
    }
    const cut = Math.floor(rows.length * 0.75);
    const b = ridge(rows.slice(0, cut), tgt.slice(0, cut), 1e-2);
    return wape(tgt.slice(cut), rows.slice(cut).map((x) => dot(b, x)));
  }, [horizon]);

  const leaking = shuffle || useLag1 || globalScale || rollNow;
  const inflate = honest - R.err;

  return (
    <div>
      <VizHead idx="DT4" title={L("同一个模型、同一份数据,两种验证方案", "One model, one dataset, two validation schemes")} />
      <div className="viz-ctrl">
        <Toggle label={L("随机打乱切分(时序上=作弊)", "Shuffled split (cheating on a series)")} value={shuffle} onChange={setShuffle} />
        <Toggle label={L("特征里放 lag_1", "Include lag_1 as a feature")} value={useLag1} onChange={setUseLag1} />
        <Toggle label={L("用全量数据做归一化", "Scale with whole-dataset statistics")} value={globalScale} onChange={setGlobalScale} />
        <Toggle label={L("滚动窗口包含当前点", "Rolling window includes the current point")} value={rollNow} onChange={setRollNow} />
        <Slider label={L("预测提前量", "Forecast lead time")} min={4} max={192} step={4} value={horizon} onChange={setHorizon} fmt={(v) => `${v / 4} h`} />
        <Slider label={L("折间 gap", "Inter-fold gap")} min={0} max={200} step={4} value={gap} onChange={setGap} unit={L(" 点", " pts")} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("当前方案报告的 WAPE", "WAPE this scheme reports")} value={pct1(R.err)} tone={leaking ? "warn" : "ok"} hint={`MAPE ${pct1(R.mp)}`} />
        <Kpi label={L("诚实方案的 WAPE", "WAPE the honest scheme gives")} value={pct1(honest)} tone="acc" hint={L("时间切分 · 无 lag_1 · 训练集归一化", "time split, no lag_1, train-only scaling")} />
        <Kpi label={L("虚高", "Inflation")} value={`${nf(inflate * 100, 1)} pt`} tone={inflate > 0.01 ? "warn" : "ok"} hint={L("你会带着这个数字去开会", "the number you take to the meeting")} />
        <Kpi label={L("泄漏开关", "Leaks enabled")} value={`${[shuffle, useLag1, globalScale, rollNow].filter(Boolean).length} / 4`} tone={leaking ? "warn" : "ok"} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("当前(可能泄漏的)方案", "Current scheme")} value={R.err} max={Math.max(honest, R.err) * 1.25} tone={leaking ? "warn" : "ok"} valText={pct1(R.err)} />
        <Bar label={L("诚实方案", "Honest scheme")} value={honest} max={Math.max(honest, R.err) * 1.25} tone="acc" valText={pct1(honest)} />
      </div>

      <Note mark="→" tone={leaking ? "bad" : "on"}>
        {leaking
          ? L(`这四个开关每一个都能单独把成绩做漂亮。随机打乱让模型拿相邻时刻的真值去预测当前时刻;lag_1 在提前 ${horizon / 4} 小时的场景里推理时根本不存在;滚动窗口把当前点算了进去,等于用答案去算特征;用全量数据算均值方差,等于把测试集的统计量泄漏进了训练。现在报告的是 ${pct1(R.err)},真实水平是 ${pct1(honest)}——差 ${nf(inflate * 100, 1)} 个点,而这 ${nf(inflate * 100, 1)} 个点会在上线第一周原形毕露。`,
              `Each of these four switches alone makes the score look good. Shuffling lets the model use adjacent true values to predict the current one; lag_1 does not exist at inference when you forecast ${horizon / 4} hours ahead; a rolling window that includes the current point computes the feature from the answer; and scaling with whole-dataset statistics leaks the test set's statistics into training. This reports ${pct1(R.err)} while the truth is ${pct1(honest)} — ${nf(inflate * 100, 1)} points of fiction that surface in the first week after go-live.`)
          : L(`四个开关全部关闭,报告值 ${pct1(R.err)} 就是你上线后会拿到的水平。注意 gap:如果预测要提前 ${horizon / 4} 小时做出,训练折和验证折之间至少要留 ${horizon} 个点的空隙,否则边界样本仍然带着泄漏。`,
              `With all four off, the reported ${pct1(R.err)} is what you will actually get. Note the gap: forecasting ${horizon / 4} hours ahead requires at least ${horizon} points between the training and validation folds, or boundary samples still leak.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t8 · lagLab — which lags carry information, and which you may use
   ========================================================= */
function LagViz() {
  const L = useL();
  const [daily, setDaily] = React.useState(1);
  const [weeklyStr, setWeeklyStr] = React.useState(1);
  const [noise, setNoise] = React.useState(1);
  const [horizon, setHorizon] = React.useState(96);

  const R = React.useMemo(() => {
    const S = synth({ days: 35, seed: 13, shift: daily, noise, weekend: weeklyStr > 0.5 ? 0.3 : 0.95 });
    const y = S.y;
    const lags = [1, 2, 4, 8, 16, 32, 48, 96, 144, 192, 288, 384, 480, 576, 672, 768];
    const vals = lags.map((l) => ({ lag: l, r: acfAt(y, l) }));
    const curve = [];
    for (let l = 1; l <= 720; l += 6) curve.push({ x: l, y: acfAt(y, l) });
    return { vals, curve };
  }, [daily, weeklyStr, noise]);

  const sig = R.vals.filter((v) => Math.abs(v.r) > 0.2);
  const usable = sig.filter((v) => v.lag >= horizon);
  const blocked = sig.filter((v) => v.lag < horizon);
  const bestUsable = usable.reduce((a, b) => (Math.abs(b.r) > Math.abs(a?.r ?? 0) ? b : a), null);

  return (
    <div>
      <VizHead idx="FE1" title={L("自相关告诉你哪些滞后有信息,提前量告诉你哪些不能用", "Autocorrelation says which lags carry information; the lead time says which you may use")} />
      <div className="viz-ctrl">
        <Slider label={L("日周期强度(班次规律)", "Daily strength")} min={0.3} max={1.6} step={0.05} value={daily} onChange={setDaily} />
        <Slider label={L("周周期强度(周末停产)", "Weekly strength")} min={0} max={1} step={0.1} value={weeklyStr} onChange={setWeeklyStr} fmt={pct} />
        <Slider label={L("噪声水平", "Noise level")} min={0.2} max={3} step={0.1} value={noise} onChange={setNoise} />
        <Slider label={L("预测提前量", "Forecast lead time")} min={1} max={288} value={horizon} onChange={setHorizon} fmt={(v) => `${nf(v / 4, 1)} h`} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("显著滞后(|r|>0.2)", "Significant lags (|r|>0.2)")} value={sig.length} tone="acc" />
        <Kpi label={L("被提前量禁用的", "Blocked by lead time")} value={blocked.length} tone={blocked.length ? "warn" : "ok"} hint={L(`lag < ${horizon}`, `lag < ${horizon}`)} />
        <Kpi label={L("可用滞后下界", "Lag floor")} value={horizon} unit={L(" 点", " pts")} tone="acc" hint={L(`= ${nf(horizon / 4, 1)} 小时`, `= ${nf(horizon / 4, 1)} h`)} />
        <Kpi label={L("最强的可用滞后", "Strongest usable lag")} value={bestUsable ? `lag ${bestUsable.lag}` : L("无", "none")} tone={bestUsable ? "ok" : "warn"} hint={bestUsable ? `r = ${nf(bestUsable.r, 2)}` : ""} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("自相关函数(横轴 = 滞后点数,1 点 = 15 分钟)", "Autocorrelation (x = lag in points, one point = 15 min)")}</div>
        <MiniPlot data={R.curve} h={120} yMin={-0.4} yMax={1} />
      </div>

      <div style={{ marginTop: 10 }}>
        {R.vals.filter((v) => [1, 4, 96, 192, 672].includes(v.lag)).map((v) => (
          <Bar key={v.lag} label={`lag ${v.lag} · ${nf(v.lag / 4, 1)} h${v.lag < horizon ? L("(不可用)", " (blocked)") : ""}`}
            value={Math.abs(v.r)} max={1} tone={v.lag < horizon ? "warn" : Math.abs(v.r) > 0.5 ? "ok" : "acc"} valText={nf(v.r, 2)} />
        ))}
      </div>

      <Note mark="→" tone={blocked.length ? "bad" : "on"}>
        {L(`lag 96(一天)和 lag 672(一周)上的两根尖峰,就是日周期和周周期的全部证据——不需要任何领域知识,自相关自己会说话。但请看被标红的那几条:要提前 ${nf(horizon / 4, 1)} 小时出预测,lag 1 到 lag ${horizon - 1} 在推理时都不存在,用它们训练就是上一章的泄漏。很多「线下 2% 线上 12%」的案例,根因就是这一行。你能用的最强滞后是 ${bestUsable ? `lag ${bestUsable.lag}(r=${nf(bestUsable.r, 2)})` : L("——没有", "— none")}。`,
            `The two spikes at lag 96 (a day) and lag 672 (a week) are the whole evidence for daily and weekly cycles — no domain knowledge needed, the autocorrelation says it itself. But look at the blocked rows: to publish ${nf(horizon / 4, 1)} hours ahead, lag 1 through lag ${horizon - 1} do not exist at inference, and training on them is the previous chapter's leakage. That one line is the root cause of many '2% offline, 12% online' stories. Your strongest usable lag is ${bestUsable ? `lag ${bestUsable.lag} (r=${nf(bestUsable.r, 2)})` : "— none"}.`)}
      </Note>
    </div>
  );
}

window.__TS_VIZ_1 = { curveLab: CurveViz, valueLab: ValueViz, baselineLab: BaselineViz, chainLab: ChainViz, cleanLab: CleanViz, alignLab: AlignViz, leakLab: LeakViz, lagLab: LagViz };
window.__TS_H = { mean, variance, sd, kw, yuan, mae, rmse, mape, wape, mase, pinball, normPdf, normCdf, quantileOf, synth, ridge, dot, corr, acfAt, SLOTS };
