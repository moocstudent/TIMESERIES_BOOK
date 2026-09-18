/* =========================================================
   viz2.jsx — benches for Modules III–V (t9–t16)
   ---------------------------------------------------------
   Reuses the prelude and domain helpers defined in viz.jsx
   (shared lexical scope between classic scripts). Exported as
   window.__TS_VIZ_2 and merged into the registry in viz4.jsx.
   ========================================================= */

/* =========================================================
   t9 · exoLab — marginal gain against availability risk
   ========================================================= */
const DRIVERS = [
  { k: "cdd",   zh: "气温(度日数变换)",   en: "Temperature (degree days)", risk: 0.15, riskZh: "需要气象预报,预报本身有误差", riskEn: "needs a forecast, which has its own error" },
  { k: "cddLag",zh: "气温滞后 2 小时",      en: "Temperature lagged 2 h",    risk: 0.15, riskZh: "同上,捕捉厂房热惯性",       riskEn: "same source, captures thermal inertia" },
  { k: "plan",  zh: "排产计划(明日产量)", en: "Production plan (tomorrow)", risk: 0.45, riskZh: "MES 常常前一晚才定稿,且会改", riskEn: "MES often finalises the night before, and changes" },
  { k: "shift", zh: "班次日历",             en: "Shift calendar",            risk: 0.02, riskZh: "日历,永远可得",             riskEn: "a calendar — always available" },
  { k: "maint", zh: "检修计划",             en: "Maintenance schedule",      risk: 0.25, riskZh: "计划内可得,临时检修不可得", riskEn: "planned yes, unplanned no" },
  { k: "humid", zh: "湿度",                 en: "Humidity",                  risk: 0.15, riskZh: "可得,但这条产线上没什么信息", riskEn: "available, but carries little here" },
];
function ExoViz() {
  const L = useL();
  const lang = useLang();
  const [on, setOn] = React.useState({ cdd: true, cddLag: false, plan: true, shift: false, maint: false, humid: false });
  const [countRisk, setCountRisk] = React.useState(true);
  const [planNoise, setPlanNoise] = React.useState(0.12);

  const R = React.useMemo(() => {
    const days = 42, S = synth({ days, seed: 19, noise: 0.85, maint: 30 });
    const n = S.y.length, r = rng(3);
    const cdd = S.temp.map((t) => Math.pow(Math.max(0, t - 24), 1.25));
    const cddLag = cdd.map((_, i) => cdd[clamp(i - 8, 0, n - 1)]);
    // the plan is knowable in advance but the MES copy is not exact
    const plan = S.proc.map((v) => v * (1 + planNoise * gauss(r)));
    const humid = S.temp.map(() => 60 + 12 * gauss(r));       // real column, no signal
    const shift = S.t.map((i) => ((i % SLOTS) / 4 >= 7.5 && (i % SLOTS) / 4 < 23 ? 1 : 0));
    const maint = S.t.map((i) => (Math.floor(i / SLOTS) === 30 ? 1 : 0));
    const cols = { cdd, cddLag, plan: plan.map((v) => v / 1000), shift, maint, humid: humid.map((v) => v / 100) };

    const build = (keys) => {
      const X = [];
      for (let i = 7 * SLOTS; i < n; i++) {
        const s = i % SLOTS;
        const row = [1, S.y[i - SLOTS] / 1000, S.y[i - 7 * SLOTS] / 1000, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS)];
        keys.forEach((k) => row.push(cols[k][i]));
        X.push(row);
      }
      return X;
    };
    const y = S.y.slice(7 * SLOTS);
    const cut = Math.floor(y.length * 0.75);
    const fit = (keys) => {
      const X = build(keys);
      const b = ridge(X.slice(0, cut), y.slice(0, cut), 1e-2);
      return wape(y.slice(cut), X.slice(cut).map((x) => dot(b, x)));
    };
    const base = fit([]);
    const marg = {};
    DRIVERS.forEach((d) => { marg[d.k] = (base - fit([d.k])) / base; });
    const chosen = DRIVERS.filter((d) => on[d.k]).map((d) => d.k);
    return { base, marg, err: fit(chosen), chosen };
  }, [on, planNoise]);

  const gain = (R.base - R.err) / R.base;
  const riskWeighted = DRIVERS.filter((d) => on[d.k]).reduce((s, d) => s + R.marg[d.k] * (countRisk ? 1 - d.risk : 1), 0);
  const maxMarg = Math.max(...DRIVERS.map((d) => Math.abs(R.marg[d.k])), 0.01);

  return (
    <div>
      <VizHead idx="FE2" title={L("外生变量:能降多少误差,和上线那天拿不拿得到", "Exogenous drivers: how much error each removes, and whether it exists on go-live day")} />
      <div className="viz-ctrl">
        <Toggle label={L("按可获得性折算增益", "Discount gain by availability risk")} value={countRisk} onChange={setCountRisk} />
        <Slider label={L("排产计划的偏差", "Error in the production plan")} min={0} max={0.5} step={0.02} value={planNoise} onChange={setPlanNoise} fmt={pct} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {DRIVERS.map((d) => (
          <span key={d.k} className={`ts-pill click ${on[d.k] ? "on" : ""}`} onClick={() => setOn({ ...on, [d.k]: !on[d.k] })}>{pick(lang, d)}</span>
        ))}
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("只用滞后与日历", "Lags and calendar only")} value={pct1(R.base)} tone="mut" hint={L("外生变量的起点", "the starting point")} />
        <Kpi label={L("当前组合的 WAPE", "WAPE with your selection")} value={pct1(R.err)} tone={gain > 0.08 ? "ok" : "acc"} />
        <Kpi label={L("误差下降", "Error removed")} value={pct1(Math.max(0, gain))} tone={gain > 0.08 ? "ok" : "warn"} />
        <Kpi label={L("折算可获得性后", "After availability discount")} value={pct1(Math.max(0, riskWeighted))} tone="acc" hint={L("拿不到的变量价值为零", "a driver you cannot get is worth zero")} />
      </div>

      <div style={{ marginTop: 10 }}>
        {DRIVERS.map((d) => (
          <Bar key={d.k} label={`${pick(lang, d)}${on[d.k] ? L("(已选)", " (on)") : ""} · ${L("风险", "risk")} ${pct(d.risk)}`}
            value={Math.max(0, R.marg[d.k])} max={maxMarg * 1.15}
            tone={R.marg[d.k] <= 0.005 ? "mut" : d.risk > 0.3 ? "warn" : "ok"} valText={`${R.marg[d.k] > 0 ? "-" : "+"}${pct1(Math.abs(R.marg[d.k]))}`} />
        ))}
      </div>

      <Note mark="→" tone={R.chosen.includes("plan") && planNoise > 0.25 ? "bad" : "on"}>
        {L(`单独看,排产计划是信息量最大的一条——它几乎直接决定功率,而且属于「未来可知」的那一类。但它的可获得性风险也最高:很多厂的 MES 前一晚才定稿,而且第二天还会改。把「排产计划的偏差」拖到 ${pct(0.3)} 以上,它的增益会被自己的误差吃掉大半。湿度是另一个极端:它永远拿得到,但在这条产线上几乎不携带信息(${pct1(Math.abs(R.marg.humid))}),加进去只是给模型多一个过拟合的机会。这一章要你同时看两列:增益,和上线那天你还有没有它。`,
            `Taken alone, the production plan carries the most information — it almost directly determines power draw, and it belongs to the knowable-in-advance family. It also carries the highest availability risk: many plants finalise the MES schedule the night before and change it the next day. Push the plan's error past ${pct(0.3)} and its own inaccuracy eats most of the gain. Humidity is the opposite extreme: always available, and on this line it carries almost nothing (${pct1(Math.abs(R.marg.humid))}), so adding it only gives the model one more chance to overfit. This chapter asks you to read two columns at once: the gain, and whether you will still have it on go-live day.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t10 · horizonLab — recursive, direct, anchored
   ========================================================= */
function HorizonViz() {
  const L = useL();
  const [noise, setNoise] = React.useState(1);
  const [anchors, setAnchors] = React.useState(6);
  const [showH, setShowH] = React.useState(96);

  const R = React.useMemo(() => {
    const days = 45, S = synth({ days, seed: 23, noise });
    const y = S.y, n = y.length, cut = Math.floor(n * 0.78);
    const slotF = (i) => [Math.sin((2 * Math.PI * (i % SLOTS)) / SLOTS), Math.cos((2 * Math.PI * (i % SLOTS)) / SLOTS)];
    // one-step model, used recursively
    const rowsOne = [], tgtOne = [], rowsPure = [], tgtPure = [];
    for (let i = 7 * SLOTS; i < cut; i++) {
      rowsOne.push([1, y[i - 1] / 1000, y[i - 2] / 1000, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, ...slotF(i)]);
      rowsPure.push([1, y[i - 1] / 1000, y[i - 2] / 1000, y[i - 3] / 1000, y[i - 4] / 1000]);
      tgtOne.push(y[i] / 1000); tgtPure.push(y[i] / 1000);
    }
    const bOne = ridge(rowsOne, tgtOne, 1e-3);
    const bPure = ridge(rowsPure, tgtPure, 1e-3);

    const HS = [1, 2, 4, 8, 16, 24, 32, 48, 64, 80, 96];
    // direct model at a given horizon: only lags that exist h steps ahead
    const fitDirect = (h) => {
      const X = [], t = [];
      for (let i = 7 * SLOTS; i < cut; i++) {
        X.push([1, y[i - h] / 1000, y[i - h - 1] / 1000, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, ...slotF(i)]);
        t.push(y[i] / 1000);
      }
      return ridge(X, t, 1e-3);
    };
    const directB = {}; HS.forEach((h) => { directB[h] = fitDirect(h); });

    const evalAt = (h, kind, ab) => {
      const yt = [], pr = [];
      for (let i = cut; i < n - 1; i += 4) {
        if (kind === "rec" || kind === "pure") {
          // roll the one-step model forward h times from the origin i-h
          const buf = y.slice(0, i - h + 1).map((v) => v);
          for (let k = 0; k < h; k++) {
            const j = buf.length;
            const v = kind === "pure"
              ? dot(bPure, [1, buf[j - 1] / 1000, buf[j - 2] / 1000, buf[j - 3] / 1000, buf[j - 4] / 1000]) * 1000
              : dot(bOne, [1, buf[j - 1] / 1000, buf[j - 2] / 1000, buf[j - SLOTS] / 1000, buf[j - 7 * SLOTS] / 1000, ...slotF(j)]) * 1000;
            buf.push(v);
          }
          yt.push(y[i]); pr.push(buf[buf.length - 1]);
        } else {
          const b = kind === "dir" ? directB[h] : ab;
          pr.push(dot(b, [1, y[i - h] / 1000, y[i - h - 1] / 1000, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, ...slotF(i)]) * 1000);
          yt.push(y[i]);
        }
      }
      return wape(yt, pr);
    };
    // anchored: fit only `anchors` horizons and interpolate the coefficients
    const anchorHs = [];
    for (let a = 0; a < anchors; a++) anchorHs.push(Math.max(1, Math.round(1 + (a * 95) / Math.max(1, anchors - 1))));
    const anchorB = {}; anchorHs.forEach((h) => { anchorB[h] = fitDirect(h); });
    const interpB = (h) => {
      let lo = anchorHs[0], hi = anchorHs[anchorHs.length - 1];
      for (const a of anchorHs) { if (a <= h) lo = a; }
      for (let i = anchorHs.length - 1; i >= 0; i--) { if (anchorHs[i] >= h) hi = anchorHs[i]; }
      if (lo === hi) return anchorB[lo];
      const w = (h - lo) / (hi - lo);
      return anchorB[lo].map((v, i) => v * (1 - w) + anchorB[hi][i] * w);
    };
    const pure = HS.map((h) => ({ x: h, y: clamp(evalAt(h, "pure"), 0, 2) }));
    const rec = HS.map((h) => ({ x: h, y: evalAt(h, "rec") }));
    const dir = HS.map((h) => ({ x: h, y: evalAt(h, "dir") }));
    const anc = HS.map((h) => ({ x: h, y: evalAt(h, "anc", interpB(h)) }));
    return { HS, pure, rec, dir, anc, nModels: anchors };
  }, [noise, anchors]);

  const iH = R.HS.indexOf(R.HS.reduce((a, b) => (Math.abs(b - showH) < Math.abs(a - showH) ? b : a)));
  const cross = R.HS.find((h, i) => R.pure[i].y > R.dir[i].y * 1.2) || null;
  const lastI = R.HS.length - 1;

  return (
    <div>
      <VizHead idx="FE3" title={L("递归 vs 直接多步:误差随步长怎么长", "Recursive against direct multi-step: how error grows with horizon")} />
      <div className="viz-ctrl">
        <Slider label={L("噪声水平", "Noise level")} min={0.3} max={2.5} step={0.1} value={noise} onChange={setNoise} />
        <Slider label={L("锚点步长个数", "Anchor horizons")} min={2} max={12} value={anchors} onChange={setAnchors} unit={L(" 个", "")} />
        <Slider label={L("看这个步长", "Inspect this horizon")} min={1} max={96} value={showH} onChange={setShowH} fmt={(v) => `${nf(v / 4, 1)} h`} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L(`纯短滞后递归 @ ${nf(R.HS[iH] / 4, 1)} h`, `Short-lag recursive @ ${nf(R.HS[iH] / 4, 1)} h`)} value={pct1(R.pure[iH].y)} tone={R.pure[iH].y > R.dir[iH].y * 1.2 ? "warn" : "ok"} hint={L("只有 lag1–lag4", "lag1–lag4 only")} />
        <Kpi label={L(`带季节锚点的递归 @ ${nf(R.HS[iH] / 4, 1)} h`, `Recursive with seasonal lags @ ${nf(R.HS[iH] / 4, 1)} h`)} value={pct1(R.rec[iH].y)} tone="ok" hint={L("1 个模型", "1 model")} />
        <Kpi label={L(`直接多步 @ ${nf(R.HS[iH] / 4, 1)} h`, `Direct @ ${nf(R.HS[iH] / 4, 1)} h`)} value={pct1(R.dir[iH].y)} tone="ok" hint={L("96 个模型", "96 models")} />
        <Kpi label={L(`锚点插值(${R.nModels} 个模型)`, `Anchored (${R.nModels} models)`)} value={pct1(R.anc[iH].y)} tone="acc" hint={L(`直接多步是 ${pct1(R.dir[iH].y)}`, `direct gives ${pct1(R.dir[iH].y)}`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("误差随预测步长(上=纯短滞后递归,中=带季节锚点的递归,下=直接多步)", "Error against horizon (top: short-lag recursive, middle: recursive with seasonal lags, bottom: direct)")}</div>
        <MiniPlot data={R.pure} h={90} yMin={0} yMax={Math.max(...R.pure.map((d) => d.y)) * 1.1} />
        <MiniPlot data={R.rec} h={90} yMin={0} yMax={Math.max(...R.pure.map((d) => d.y)) * 1.1} stroke="var(--accent)" />
        <MiniPlot data={R.dir} h={90} yMin={0} yMax={Math.max(...R.pure.map((d) => d.y)) * 1.1} stroke="#2e9e6b" />
      </div>

      <Note mark="→" tone="on">
        {L(`递归预测会不会爆,取决于它有多少输入是自己编出来的。纯短滞后递归只有 lag1–lag4,滚到 ${nf(R.HS[lastI] / 4, 1)} 小时时每一个输入都是上一轮的预测,误差从 ${pct1(R.pure[0].y)} 滚到 ${pct1(R.pure[lastI].y)};而带季节锚点的递归同样只有一个模型,却因为 lag96 和 lag672 是真值、不需要编,只从 ${pct1(R.rec[0].y)} 涨到 ${pct1(R.rec[lastI].y)},几乎追平训了 96 个模型的直接多步(${pct1(R.dir[lastI].y)})。这才是这一章的准确说法:误差累积正比于你必须合成的那部分输入,而不是"递归天生不行"。最后一行是实用折中——只训 ${R.nModels} 个锚点步长、中间插值,${pct1(R.anc[lastI].y)},把 96 个模型压到 ${R.nModels} 个。`,
            `Whether recursion explodes depends on how much of its own input it has to invent. The short-lag version has only lag1–lag4, so by ${nf(R.HS[lastI] / 4, 1)} hours every input is a previous prediction and error rolls from ${pct1(R.pure[0].y)} to ${pct1(R.pure[lastI].y)}. The version with seasonal anchors is also a single model, but lag96 and lag672 are true values it never has to invent, so it climbs only from ${pct1(R.rec[0].y)} to ${pct1(R.rec[lastI].y)} — nearly matching direct multi-step (${pct1(R.dir[lastI].y)}), which needed 96 models. That is the precise form of the lesson: compounding is proportional to the share of the input you must synthesise, not to recursion as such. The last line is the practical compromise — fit ${R.nModels} anchor horizons and interpolate between them for ${pct1(R.anc[lastI].y)}, compressing 96 models into ${R.nModels}.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t11 · arimaLab — stationarity, differencing, residuals
   ========================================================= */
// chi-square upper quantile via the Wilson-Hilferty approximation
function chi2Crit(df, p = 0.95) {
  const z = p === 0.95 ? 1.6449 : 2.3263;
  return df * Math.pow(1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df)), 3);
}
function ArimaViz() {
  const L = useL();
  const [d, setD] = React.useState(0);
  const [bigD, setBigD] = React.useState(0);
  const [p, setP] = React.useState(2);
  const [noise, setNoise] = React.useState(1);

  const R = React.useMemo(() => {
    const S = synth({ days: 30, seed: 29, noise });
    let x = S.y.slice();
    if (bigD) x = x.map((v, i) => (i >= SLOTS ? v - x[i - SLOTS] : NaN)).filter((v) => isFinite(v));
    if (d) x = x.map((v, i) => (i >= 1 ? v - x[i - 1] : NaN)).filter((v) => isFinite(v));
    const raw = S.y;
    const acfRaw = [], acfDif = [];
    for (let l = 1; l <= 220; l += 2) { acfRaw.push({ x: l, y: acfAt(raw, l) }); acfDif.push({ x: l, y: acfAt(x, l) }); }
    // AR(p) by least squares on the differenced series
    const X = [], t = [];
    for (let i = p; i < x.length; i++) { X.push([1, ...Array.from({ length: p }, (_, k) => x[i - k - 1] / 1000)]); t.push(x[i] / 1000); }
    const b = ridge(X, t, 1e-6);
    const res = t.map((v, i) => v - dot(b, X[i]));
    const acfRes = [];
    for (let l = 1; l <= 200; l += 2) acfRes.push({ x: l, y: acfAt(res, l) });
    // Ljung-Box over the first m lags
    const m = 24, nn = res.length;
    let Q = 0; for (let l = 1; l <= m; l++) { const rho = acfAt(res, l); Q += (rho * rho) / (nn - l); }
    Q *= nn * (nn + 2);
    const df = Math.max(1, m - p);
    return { x, acfRaw, acfDif, acfRes, Q, crit: chi2Crit(df), df, resSd: sd(res) * 1000, a1: acfAt(x, 1), aS: acfAt(x, SLOTS), rawS: acfAt(raw, SLOTS) };
  }, [d, bigD, p, noise]);

  const white = R.Q < R.crit;

  return (
    <div>
      <VizHead idx="ML1" title={L("平稳化与残差诊断:模型还有没有漏掉结构", "Differencing and residual diagnostics: has the model left structure behind")} />
      <div className="viz-ctrl">
        <Slider label={L("一阶差分 d", "First difference d")} min={0} max={1} value={d} onChange={setD} />
        <Slider label={L("季节差分 D(96 步)", "Seasonal difference D (96)")} min={0} max={1} value={bigD} onChange={setBigD} />
        <Slider label={L("AR 阶数 p", "AR order p")} min={1} max={8} value={p} onChange={setP} />
        <Slider label={L("噪声水平", "Noise level")} min={0.3} max={2.5} step={0.1} value={noise} onChange={setNoise} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("原序列 ACF(96)", "Raw ACF(96)")} value={nf(R.rawS, 2)} tone="warn" hint={L("日周期,强非平稳", "the daily cycle — strongly non-stationary")} />
        <Kpi label={L("差分后 ACF(96)", "ACF(96) after differencing")} value={nf(R.aS, 2)} tone={Math.abs(R.aS) < 0.2 ? "ok" : "warn"} />
        <Kpi label={L("残差 Ljung-Box Q", "Residual Ljung-Box Q")} value={nf(R.Q, 0)} tone={white ? "ok" : "warn"} hint={L(`临界值 ${nf(R.crit, 0)} (df=${R.df})`, `critical ${nf(R.crit, 0)} (df=${R.df})`)} />
        <Kpi label={L("残差是白噪声吗", "Are residuals white")} value={white ? L("是", "yes") : L("否", "no")} tone={white ? "ok" : "warn"} hint={L(`标准差 ${kw(R.resSd)}`, `sd ${kw(R.resSd)}`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("ACF:原序列(上)、差分后(中)、AR 残差(下)", "ACF: raw (top), differenced (middle), AR residuals (bottom)")}</div>
        <MiniPlot data={R.acfRaw} h={86} yMin={-0.6} yMax={1} />
        <MiniPlot data={R.acfDif} h={86} yMin={-0.6} yMax={1} stroke="var(--accent)" />
        <MiniPlot data={R.acfRes} h={86} yMin={-0.6} yMax={1} stroke="#2e9e6b" />
      </div>

      <Note mark="→" tone={white ? "on" : "bad"}>
        {!bigD
          ? L(`原序列在 lag 96 上的自相关是 ${nf(R.rawS, 2)}——这条曲线每天重复一次,它不平稳,直接拿去拟合 AR 模型,模型会把大部分容量花在追这个周期上。把「季节差分 D」打开(减去 96 步之前的值),看中间那条 ACF 怎么塌下来。`,
              `The raw series has autocorrelation ${nf(R.rawS, 2)} at lag 96 — it repeats daily and is not stationary, and an AR model fitted to it spends most of its capacity chasing that cycle. Switch on the seasonal difference D (subtract the value 96 steps back) and watch the middle correlogram collapse.`)
          : white
          ? L(`季节差分把日周期拿掉(ACF(96) 从 ${nf(R.rawS, 2)} 降到 ${nf(R.aS, 2)}),AR(${p}) 再把短期相关吃掉,残差的 Ljung-Box Q=${nf(R.Q, 0)} 低于临界值 ${nf(R.crit, 0)},统计上已经是白噪声——没有剩下的结构可学了。这套残差诊断不是 ARIMA 专用的:把任何模型(包括你后面训的 LightGBM 和 PatchTST)的残差画成这张图,如果还看得见尖峰,就说明还有周期没被吃掉。`,
              `The seasonal difference removes the daily cycle (ACF(96) falls from ${nf(R.rawS, 2)} to ${nf(R.aS, 2)}), AR(${p}) absorbs the short-range correlation, and the residual Ljung-Box Q=${nf(R.Q, 0)} sits below the critical ${nf(R.crit, 0)} — statistically white, with no structure left to learn. These diagnostics are not ARIMA's private property: plot the residuals of any model, including the LightGBM and PatchTST you train later, and a visible spike means a cycle you have not absorbed.`)
          : L(`差分做了,但残差的 Ljung-Box Q=${nf(R.Q, 0)} 仍然高于临界值 ${nf(R.crit, 0)}——还有结构没被吃掉。把 AR 阶数 p 加大试试;如果加到 8 仍然不白,那说明剩下的结构不是线性自相关能表达的(比如工况切换这种由外部事件驱动的跳变),这正是下一章要换梯度提升的理由。`,
              `Differencing is on, yet the residual Ljung-Box Q=${nf(R.Q, 0)} is still above the critical ${nf(R.crit, 0)} — structure remains. Raise the AR order p; if it is still not white at 8, the remainder is not expressible as linear autocorrelation (regime switching driven by external events, for instance), which is exactly why the next chapter reaches for gradient boosting.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t12 · gbmLab — a real gradient-boosted tree, grown live
   ========================================================= */
// Histogram-based regression tree on pre-binned features, squared loss.
// This is the LightGBM idea in about forty lines: bin once, then every split
// search is a scan over bins instead of a sort over rows.
function binFeatures(X, bins = 32) {
  const k = X[0].length, n = X.length;
  const cuts = [], B = Array.from({ length: n }, () => new Uint8Array(k));
  for (let f = 0; f < k; f++) {
    const col = X.map((r) => r[f]).sort((a, b) => a - b);
    const c = [];
    for (let b = 1; b < bins; b++) c.push(col[Math.floor((b * n) / bins)]);
    cuts.push(c);
    for (let i = 0; i < n; i++) {
      let lo = 0, hi = c.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (X[i][f] <= c[m]) hi = m; else lo = m + 1; }
      B[i][f] = lo;
    }
  }
  return { B, cuts, bins };
}
function growTree(B, resid, idx, depth, minLeaf, nBins, nFeat) {
  const sum = idx.reduce((s, i) => s + resid[i], 0);
  const node = { value: sum / idx.length };
  if (depth === 0 || idx.length < 2 * minLeaf) return node;
  let best = null;
  for (let f = 0; f < nFeat; f++) {
    const cs = new Float64Array(nBins), cc = new Float64Array(nBins);
    for (const i of idx) { const b = B[i][f]; cs[b] += resid[i]; cc[b] += 1; }
    let sl = 0, cl = 0;
    const parent = (sum * sum) / idx.length;
    for (let b = 0; b < nBins - 1; b++) {
      sl += cs[b]; cl += cc[b];
      const sr = sum - sl, cr = idx.length - cl;
      if (cl < minLeaf || cr < minLeaf) continue;
      const gain = (sl * sl) / cl + (sr * sr) / cr - parent;
      if (!best || gain > best.gain) best = { gain, f, b };
    }
  }
  if (!best || best.gain <= 1e-9) return node;
  const li = [], ri = [];
  for (const i of idx) (B[i][best.f] <= best.b ? li : ri).push(i);
  if (li.length < minLeaf || ri.length < minLeaf) return node;
  node.f = best.f; node.b = best.b;
  node.L = growTree(B, resid, li, depth - 1, minLeaf, nBins, nFeat);
  node.R = growTree(B, resid, ri, depth - 1, minLeaf, nBins, nFeat);
  return node;
}
const treePred = (node, row) => (node.f === undefined ? node.value : treePred(row[node.f] <= node.b ? node.L : node.R, row));

function GbmViz() {
  const L = useL();
  const [trees, setTrees] = React.useState(200);
  const [lr, setLr] = React.useState(0.15);
  const [depth, setDepth] = React.useState(6);
  const [minLeaf, setMinLeaf] = React.useState(5);
  const [valMode, setValMode] = React.useState("random");

  const R = React.useMemo(() => {
    // Deliberately little data for this much tree: that is the regime in which
    // early stopping matters at all, and therefore the regime in which choosing
    // the validation split wrongly costs you something.
    const days = 22, S = synth({ days, seed: 37, noise: 1.2 });
    const y = S.y, n = y.length, rows = [], tgt = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const s = i % SLOTS, dow = Math.floor(i / SLOTS) % 7;
      rows.push([y[i - SLOTS], y[i - 7 * SLOTS], mean(y.slice(i - SLOTS - 4, i - SLOTS)), s, dow, Math.pow(Math.max(0, S.temp[i] - 24), 1.25)]);
      tgt.push(y[i]);
    }
    const N = rows.length;
    const testStart = Math.floor(N * 0.85);          // the final, untouched segment
    const pool = Array.from({ length: testStart }, (_, i) => i);
    let trainI, valI;
    if (valMode === "time") {
      const c = Math.floor(testStart * 0.8);
      trainI = pool.slice(0, c); valI = pool.slice(c);
    } else {
      const r = rng(4), sh = pool.slice();
      for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
      const c = Math.floor(sh.length * 0.8);
      trainI = sh.slice(0, c); valI = sh.slice(c);
    }
    const testI = Array.from({ length: N - testStart }, (_, i) => testStart + i);
    const { B, bins } = binFeatures(rows);
    const nFeat = rows[0].length;
    const base = mean(trainI.map((i) => tgt[i]));
    const pred = new Float64Array(N).fill(base);
    const curve = [];
    let bestIt = 1, bestVal = Infinity, testAtBest = 1;
    for (let t = 1; t <= trees; t++) {
      const resid = new Float64Array(N);
      for (const i of trainI) resid[i] = tgt[i] - pred[i];
      const tree = growTree(B, resid, trainI, depth, minLeaf, bins, nFeat);
      for (let i = 0; i < N; i++) pred[i] += lr * treePred(tree, B[i]);
      const trE = wape(trainI.map((i) => tgt[i]), trainI.map((i) => pred[i]));
      const vaE = wape(valI.map((i) => tgt[i]), valI.map((i) => pred[i]));
      const teE = wape(testI.map((i) => tgt[i]), testI.map((i) => pred[i]));
      if (vaE < bestVal) { bestVal = vaE; bestIt = t; testAtBest = teE; }
      curve.push({ t, tr: trE, va: vaE, te: teE });
    }
    const bestTest = curve.reduce((a, b) => (b.te < a.te ? b : a));
    return { curve, bestIt, bestVal, testAtBest, bestTest, N, nTrain: trainI.length };
  }, [trees, lr, depth, minLeaf, valMode]);

  const regret = R.testAtBest - R.bestTest.te;
  const bias = R.testAtBest - R.bestVal;     // how much the validation set flatters you

  return (
    <div>
      <VizHead idx="ML2" title={L("一棵一棵地加树:训练误差、验证误差与早停点", "Tree by tree: training error, validation error and where to stop")} />
      <div className="viz-ctrl">
        <Slider label={L("树的棵数", "Number of trees")} min={20} max={300} step={10} value={trees} onChange={setTrees} />
        <Slider label={L("学习率", "Learning rate")} min={0.02} max={0.4} step={0.02} value={lr} onChange={setLr} />
        <Slider label={L("树深", "Max depth")} min={1} max={8} value={depth} onChange={setDepth} />
        <Slider label={L("叶子最小样本", "Min data in leaf")} min={5} max={120} step={5} value={minLeaf} onChange={setMinLeaf} />
        <Seg value={valMode} onChange={setValMode} options={[{ v: "random", l: L("随机验证集", "random validation") }, { v: "time", l: L("时间靠后验证集", "later-in-time validation") }]} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("早停选中的迭代", "Iteration early stopping picks")} value={R.bestIt} tone="acc" hint={L(`共 ${trees} 棵`, `of ${trees} trees`)} />
        <Kpi label={L("验证集报告的误差", "Error the validation set reports")} value={pct1(R.bestVal)} tone={bias > 0.006 ? "warn" : "ok"} hint={L("你会写进汇报的那个数", "the number that goes in the report")} />
        <Kpi label={L("真实测试误差", "True test error")} value={pct1(R.testAtBest)} tone="acc" hint={L("从未参与任何选择", "never took part in any choice")} />
        <Kpi label={L("验证集的乐观偏差", "Validation optimism")} value={`${bias >= 0 ? "+" : ""}${nf(bias * 100, 2)} pt`} tone={bias > 0.006 ? "warn" : "ok"} hint={L(`离最好的 ${pct1(R.bestTest.te)} 差 ${nf(regret * 100, 2)} pt`, `${nf(regret * 100, 2)} pt from the best, ${pct1(R.bestTest.te)}`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("训练误差(上)、验证误差(中)、从未参与选择的测试误差(下)", "Training (top), validation (middle), and the test set that never took part in any choice (bottom)")}</div>
        <MiniPlot data={R.curve.map((c) => ({ x: c.t, y: c.tr }))} h={86} yMin={0} yMax={Math.max(...R.curve.map((c) => c.va)) * 1.1} />
        <MiniPlot data={R.curve.map((c) => ({ x: c.t, y: c.va }))} h={86} markIndex={R.bestIt - 1} yMin={0} yMax={Math.max(...R.curve.map((c) => c.va)) * 1.1} stroke="var(--accent)" />
        <MiniPlot data={R.curve.map((c) => ({ x: c.t, y: c.te }))} h={86} markIndex={R.bestIt - 1} yMin={0} yMax={Math.max(...R.curve.map((c) => c.va)) * 1.1} stroke="#2e9e6b" />
      </div>

      <Note mark="→" tone={valMode === "random" && regret > 0.004 ? "bad" : "on"}>
        {valMode === "random"
          ? L(`随机验证集报告 ${pct1(R.bestVal)},而这个模型真实的测试误差是 ${pct1(R.testAtBest)}——乐观了 ${nf(bias * 100, 2)} 个点。原因和 DT4 一样:每个验证样本的邻居就坐在训练集里,模型见过它周围的一切。注意它作为「停在哪里」的信号其实不算差(选在第 ${R.bestIt} 棵,离最优的第 ${R.bestTest.t} 棵只差 ${nf(regret * 100, 2)} 个点);真正被它骗掉的是误差的绝对水平,也就是你写进汇报、写进合同的那个数。切到「时间靠后验证集」看另一半故事。`,
              `The random validation set reports ${pct1(R.bestVal)} while this model's true test error is ${pct1(R.testAtBest)} — optimistic by ${nf(bias * 100, 2)} points. The cause is DT4's again: every held-out row has its neighbours sitting in training, so the model has seen everything around it. Note that as a signal for WHERE to stop it is not bad (tree ${R.bestIt} against an optimum at ${R.bestTest.t}, worth ${nf(regret * 100, 2)} points); what it lies about is the absolute level of the error — the number that goes into your report and your contract. Switch to a later-in-time validation set for the other half of the story.`)
          : L(`时间靠后的验证集诚实得多:它报告 ${pct1(R.bestVal)},真实测试误差 ${pct1(R.testAtBest)},偏差只有 ${nf(Math.abs(bias) * 100, 2)} 个点。但它有另一个毛病——样本少、又只覆盖一小段时间,作为停止信号很抖,这一次它停在第 ${R.bestIt} 棵,而最优是第 ${R.bestTest.t} 棵,白丢了 ${nf(regret * 100, 2)} 个点。两种错法的性质不同:随机切分骗的是误差水平,时间切分丢的是停止精度。正确的解法不是二选一,而是 EV1 的滚动回测——多折的均值既不偏、又比单折稳。`,
              `A later-in-time validation set is far more honest: it reports ${pct1(R.bestVal)} against a true ${pct1(R.testAtBest)}, a bias of only ${nf(Math.abs(bias) * 100, 2)} points. It has a different weakness — few samples covering one short stretch makes it a jumpy stopping signal, and here it stopped at tree ${R.bestIt} when the optimum was ${R.bestTest.t}, giving away ${nf(regret * 100, 2)} points. The two failures differ in kind: a random split lies about the level, a time split loses precision about where to stop. The answer is not to choose between them but EV1's rolling-origin backtest, whose multi-fold mean is both unbiased and steadier than any single fold.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t13 · quantLab — pinball loss, coverage, and P90
   ========================================================= */
function QuantViz() {
  const L = useL();
  const [nominal, setNominal] = React.useState(0.8);     // nominal central interval
  const [hetero, setHetero] = React.useState(1);         // how much error scales with load
  const [sortFix, setSortFix] = React.useState(false);
  const [iters, setIters] = React.useState(500);

  const R = React.useMemo(() => {
    const days = 40, S = synth({ days, seed: 43, noise: 0.5 });
    const y0 = S.y, n = y0.length, r = rng(8);
    // heteroskedastic reality: the busy hours are the uncertain ones
    const y = y0.map((v, i) => v + hetero * 0.09 * v * gauss(r));
    const X = [], t = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const s = i % SLOTS;
      X.push([1, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS)]);
      t.push(y[i] / 1000);
    }
    const cut = Math.floor(X.length * 0.75);
    const Xtr = X.slice(0, cut), ttr = t.slice(0, cut), Xte = X.slice(cut), tte = t.slice(cut);
    // linear quantile regression by subgradient descent on the pinball loss
    const fitQ = (tau) => {
      let b = ridge(Xtr, ttr, 1e-2);
      const k = b.length, m = Xtr.length;
      let step = 0.5;
      for (let it = 0; it < iters; it++) {
        const g = new Float64Array(k);
        for (let i = 0; i < m; i++) {
          const e = ttr[i] - dot(b, Xtr[i]);
          const w = e >= 0 ? -tau : 1 - tau;
          for (let j = 0; j < k; j++) g[j] += w * Xtr[i][j];
        }
        for (let j = 0; j < k; j++) b[j] -= (step / m) * g[j];
        step *= 0.997;
      }
      return b;
    };
    const lo = (1 - nominal) / 2, hi = 1 - lo;
    const bLo = fitQ(lo), bMid = fitQ(0.5), bHi = fitQ(hi);
    let pLo = Xte.map((x) => dot(bLo, x)), pMid = Xte.map((x) => dot(bMid, x)), pHi = Xte.map((x) => dot(bHi, x));
    let crossings = 0;
    for (let i = 0; i < pLo.length; i++) if (pHi[i] < pLo[i] || pMid[i] < pLo[i] || pMid[i] > pHi[i]) crossings++;
    if (sortFix) for (let i = 0; i < pLo.length; i++) { const v = [pLo[i], pMid[i], pHi[i]].sort((a, b) => a - b); pLo[i] = v[0]; pMid[i] = v[1]; pHi[i] = v[2]; }
    const inside = tte.filter((v, i) => v >= pLo[i] && v <= pHi[i]).length / tte.length;
    const above = tte.filter((v, i) => v > pHi[i]).length / tte.length;
    // the alternative people actually use: a point model plus a constant margin
    const bM = ridge(Xtr, ttr, 1e-2);
    const resid = ttr.map((v, i) => v - dot(bM, Xtr[i]));
    const margin = quantileOf(resid, hi);
    const pFlat = Xte.map((x) => dot(bM, x) + margin);
    const flatAbove = tte.filter((v, i) => v > pFlat[i]).length / tte.length;
    // where the constant margin fails: split the test set into low and high load
    const med = quantileOf(tte, 0.5);
    const loIdx = tte.map((v, i) => i).filter((i) => tte[i] <= med), hiIdx = tte.map((v, i) => i).filter((i) => tte[i] > med);
    const exceed = (idx, p) => idx.filter((i) => tte[i] > p[i]).length / idx.length;
    return {
      inside, above, crossings, pinLo: pinball(tte, pLo, lo), pinHi: pinball(tte, pHi, hi),
      flatAbove, flatLo: exceed(loIdx, pFlat), flatHi: exceed(hiIdx, pFlat),
      qLo: exceed(loIdx, pHi), qHi: exceed(hiIdx, pHi), tte, pLo, pMid, pHi,
    };
  }, [nominal, hetero, sortFix, iters]);

  const target = 1 - (1 - nominal) / 2;
  const nomAbove = (1 - nominal) / 2;

  return (
    <div>
      <VizHead idx="ML3" title={L("分位数回归:一个区间,和它真实的覆盖率", "Quantile regression: an interval, and what it actually covers")} />
      <div className="viz-ctrl">
        <Slider label={L("名义区间", "Nominal interval")} min={0.5} max={0.98} step={0.02} value={nominal} onChange={setNominal} fmt={pct} />
        <Slider label={L("异方差强度(忙时更不确定)", "Heteroskedasticity")} min={0} max={2} step={0.1} value={hetero} onChange={setHetero} />
        <Slider label={L("优化轮数", "Descent iterations")} min={100} max={1200} step={100} value={iters} onChange={setIters} />
        <Toggle label={L("对分位数做排序修正", "Sort quantiles after fitting")} value={sortFix} onChange={setSortFix} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("名义覆盖率 / 实际覆盖率", "Nominal / actual coverage")} value={`${pct(nominal)} → ${pct1(R.inside)}`} tone={Math.abs(R.inside - nominal) < 0.05 ? "ok" : "warn"} />
        <Kpi label={L("上界被突破的比例", "Share above the upper bound")} value={pct1(R.above)} tone={Math.abs(R.above - nomAbove) < 0.03 ? "ok" : "warn"} hint={L(`名义应为 ${pct(nomAbove)}`, `nominal ${pct(nomAbove)}`)} />
        <Kpi label={L("分位数交叉次数", "Quantile crossings")} value={R.crossings} tone={R.crossings > 0 && !sortFix ? "warn" : "ok"} hint={sortFix ? L("已排序修正", "sorted after fitting") : L("P90 低于 P50 就是这个", "this is P90 below P50")} />
        <Kpi label={L("pinball(上分位)", "Pinball (upper)")} value={nf(R.pinHi * 1000, 1)} unit=" kW" tone="acc" />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("同一个上界,在低负荷时段与高负荷时段分别被突破多少", "The same upper bound, exceeded in low-load and high-load hours")}</div>
        <Bar label={L("分位数回归 · 低负荷时段", "Quantile regression · low-load hours")} value={R.qLo} max={Math.max(0.3, R.flatLo * 1.2)} tone={Math.abs(R.qLo - nomAbove) < 0.06 ? "ok" : "warn"} valText={pct1(R.qLo)} />
        <Bar label={L("分位数回归 · 高负荷时段", "Quantile regression · high-load hours")} value={R.qHi} max={Math.max(0.3, R.flatLo * 1.2)} tone={Math.abs(R.qHi - nomAbove) < 0.06 ? "ok" : "warn"} valText={pct1(R.qHi)} />
        <Bar label={L("点预测 + 常数裕度 · 低负荷", "Point model + constant margin · low-load")} value={R.flatLo} max={Math.max(0.3, R.flatLo * 1.2)} tone="mut" valText={pct1(R.flatLo)} />
        <Bar label={L("点预测 + 常数裕度 · 高负荷", "Point model + constant margin · high-load")} value={R.flatHi} max={Math.max(0.3, R.flatLo * 1.2)} tone={Math.abs(R.flatHi - nomAbove) > 0.06 ? "warn" : "mut"} valText={pct1(R.flatHi)} />
      </div>

      <Note mark="→" tone={Math.abs(R.above - nomAbove) < 0.03 ? "on" : "bad"}>
        {L(`把损失函数从 MSE 换成 pinball,同一套特征、同一个线性模型,训 ${nf(nominal * 100, 0)}% 区间的上下界:实际覆盖率 ${pct1(R.inside)},上界被突破 ${pct1(R.above)}(名义 ${pct(nomAbove)})。请特别注意最后两条:点预测加一个常数裕度看起来也能达到差不多的总体覆盖率,但它在低负荷时段过宽(只被突破 ${pct1(R.flatLo)})、在高负荷时段不够(被突破 ${pct1(R.flatHi)})——而高负荷时段恰恰是你真正关心的那一段。误差的大小本身随负荷变化,常数裕度表达不了这件事,分位数回归可以。`,
            `Swap MSE for pinball and the same features and the same linear model give you the bounds of a ${nf(nominal * 100, 0)}% interval: actual coverage ${pct1(R.inside)}, upper bound exceeded ${pct1(R.above)} of the time against a nominal ${pct(nomAbove)}. Look hard at the last two bars: a point forecast plus a constant margin reaches a similar overall coverage, but it is too wide in low-load hours (exceeded only ${pct1(R.flatLo)}) and too narrow in high-load hours (exceeded ${pct1(R.flatHi)}) — and high load is the part you actually care about. The size of the error itself scales with load, which a constant margin cannot express and a quantile model can.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t14 · globalLab — one model for a thousand series
   ========================================================= */
function GlobalViz() {
  const L = useL();
  const [nSeries, setNSeries] = React.useState(24);
  const [shortDays, setShortDays] = React.useState(6);
  const [hetero, setHetero] = React.useState(0.25);
  const [normalise, setNormalise] = React.useState(true);

  const R = React.useMemo(() => {
    const LONG = 40, TEST_DAYS = 4;
    const set = [];
    for (let s = 0; s < nSeries; s++) {
      const r = rng(100 + s);
      const isShort = s % 3 === 0;                     // a third of the meters are new
      const scale = 0.12 + 3.4 * r();                  // the fleet spans two orders of magnitude
      const shape = 1 + hetero * (r() * 2 - 1) * 2;    // how differently this line runs
      const S = synth({ days: LONG + TEST_DAYS, seed: 200 + s, shift: shape, noise: 1.1, weekend: 0.2 + 0.6 * r() });
      set.push({ s, isShort, y: S.y.map((v) => v * scale), temp: S.temp });
    }
    const featOf = (y, temp, i, sc) => {
      const slot = i % SLOTS, d = normalise ? sc : 1;
      return [1, y[i - SLOTS] / d, y[i - 7 * SLOTS] / d, y[i - 2 * SLOTS] / d, mean(y.slice(i - SLOTS - 4, i - SLOTS)) / d,
              Math.sin((2 * Math.PI * slot) / SLOTS), Math.cos((2 * Math.PI * slot) / SLOTS),
              Math.sin((4 * Math.PI * slot) / SLOTS), Math.cos((4 * Math.PI * slot) / SLOTS),
              Math.pow(Math.max(0, temp[i] - 24), 1.25) / 10, normalise ? Math.log(sc) : sc];
    };
    // Every series is scored on the SAME final window. The only difference between
    // a new meter and an old one is how far back its history goes.
    const testFrom = LONG * SLOTS;
    const local = [], gTrainX = [], gTrainY = [], holdout = [];
    for (const it of set) {
      const n = it.y.length;
      const sc = normalise ? mean(it.y.slice(0, testFrom)) : 1;
      const trainFrom = it.isShort ? Math.max(7 * SLOTS, testFrom - shortDays * SLOTS) : 7 * SLOTS;
      const Xtr = [], ttr = [];
      for (let i = trainFrom; i < testFrom; i++) { Xtr.push(featOf(it.y, it.temp, i, sc)); ttr.push(it.y[i] / (normalise ? sc : 1)); }
      const Xte = [], tte = [];
      for (let i = testFrom; i < n; i++) { Xte.push(featOf(it.y, it.temp, i, sc)); tte.push(it.y[i] / (normalise ? sc : 1)); }
      const b = ridge(Xtr, ttr, 1e-2);
      const back = (v) => v * (normalise ? sc : 1);
      local.push({ s: it.s, isShort: it.isShort, err: wape(tte.map(back), Xte.map((x) => back(dot(b, x)))), rows: Xtr.length });
      for (let i = 0; i < Xtr.length; i++) { gTrainX.push(Xtr[i]); gTrainY.push(ttr[i]); }
      holdout.push({ s: it.s, isShort: it.isShort, Xte, tte, sc });
    }
    const bG = ridge(gTrainX, gTrainY, 1e-2);
    const glob = holdout.map((h) => {
      const back = (v) => v * (normalise ? h.sc : 1);
      return { s: h.s, isShort: h.isShort, err: wape(h.tte.map(back), h.Xte.map((x) => back(dot(bG, x)))) };
    });
    const avg = (a, f) => mean(a.filter(f).map((x) => x.err));
    return {
      locAll: avg(local, () => true), gloAll: avg(glob, () => true),
      locShort: avg(local, (x) => x.isShort), gloShort: avg(glob, (x) => x.isShort),
      locLong: avg(local, (x) => !x.isShort), gloLong: avg(glob, (x) => !x.isShort),
      nModels: nSeries, nShort: local.filter((x) => x.isShort).length,
      shortRows: Math.round(mean(local.filter((x) => x.isShort).map((x) => x.rows))),
    };
  }, [nSeries, shortDays, hetero, normalise]);

  const winAll = R.locAll - R.gloAll, winShort = R.locShort - R.gloShort;
  const mx = Math.max(R.locAll, R.gloAll, R.locShort, R.gloShort) * 1.15;

  return (
    <div>
      <VizHead idx="ML4" title={L("一个全局模型 vs 每条序列一个模型", "One global model against one model per series")} />
      <div className="viz-ctrl">
        <Slider label={L("序列数量", "Number of series")} min={6} max={60} step={3} value={nSeries} onChange={setNSeries} />
        <Slider label={L("新表的历史长度", "History of the new meters")} min={2} max={40} value={shortDays} onChange={setShortDays} unit={L(" 天", " d")} />
        <Slider label={L("序列间异质性", "Heterogeneity between series")} min={0} max={1} step={0.05} value={hetero} onChange={setHetero} fmt={pct} />
        <Toggle label={L("按序列规模归一化", "Normalise by series scale")} value={normalise} onChange={setNormalise} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("全部序列 · 局部模型", "All series · local models")} value={pct1(R.locAll)} tone="mut" hint={L(`${R.nModels} 个模型`, `${R.nModels} models`)} />
        <Kpi label={L("全部序列 · 全局模型", "All series · one global model")} value={pct1(R.gloAll)} tone={winAll > 0 ? "ok" : "warn"} hint={L("1 个模型", "1 model")} />
        <Kpi label={L("短历史新表 · 局部", "New meters · local")} value={pct1(R.locShort)} tone="warn" hint={L(`${R.nShort} 条,各 ${shortDays} 天 / ${R.shortRows} 行`, `${R.nShort} series, ${shortDays} d = ${R.shortRows} rows`)} />
        <Kpi label={L("短历史新表 · 全局", "New meters · global")} value={pct1(R.gloShort)} tone={winShort > 0 ? "ok" : "warn"} hint={L(`借力 ${nf(winShort * 100, 1)} 个点`, `${nf(winShort * 100, 1)} pt borrowed`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("局部模型 · 历史充足的表", "Local · meters with full history")} value={R.locLong} max={mx} tone="mut" valText={pct1(R.locLong)} />
        <Bar label={L("全局模型 · 历史充足的表", "Global · meters with full history")} value={R.gloLong} max={mx} tone="acc" valText={pct1(R.gloLong)} />
        <Bar label={L("局部模型 · 新表", "Local · new meters")} value={R.locShort} max={mx} tone="warn" valText={pct1(R.locShort)} />
        <Bar label={L("全局模型 · 新表", "Global · new meters")} value={R.gloShort} max={mx} tone="ok" valText={pct1(R.gloShort)} />
      </div>

      <Note mark="→" tone={normalise ? "on" : "bad"}>
        {!normalise
          ? L(`关掉归一化,全局模型立刻垮掉(${pct1(R.gloAll)}):这个表群的量级差着两个数量级,损失函数被最大的那几台设备主导,小表被当成噪声忽略。这是全局模型最常见的一次性失败——不是思路错了,是量纲错了。把归一化打开。`,
              `With normalisation off the global model collapses (${pct1(R.gloAll)}): this fleet spans two orders of magnitude, the loss is dominated by the largest machines, and the small meters are treated as noise. This is the most common one-shot failure of a global model — not a wrong idea, a wrong scale. Switch normalisation back on.`)
          : L(`历史充足的表上,局部 ${pct1(R.locLong)} 与全局 ${pct1(R.gloLong)} 差不多——数据够的时候,专用模型不吃亏。真正的差距在只有 ${shortDays} 天历史的新表上:局部 ${pct1(R.locShort)},全局 ${pct1(R.gloShort)},白拿 ${nf(winShort * 100, 1)} 个点。它们借的是别的表的日周期与温度响应,这就是「借力」的全部含义,也是新设备冷启动唯一便宜的解法。把异质性拖到 ${pct(0.8)} 以上再看:当各条产线行为差别过大时,强行共享会互相干扰,那时候正确的做法是先聚类、每组一个全局模型。`,
              `On meters with full history, local ${pct1(R.locLong)} and global ${pct1(R.gloLong)} are close — with enough data a dedicated model loses nothing. The real gap is on the new meters with only ${shortDays} days: local ${pct1(R.locShort)} against global ${pct1(R.gloShort)}, ${nf(winShort * 100, 1)} points for free. What they borrow is the daily cycle and temperature response of the other meters, which is the whole meaning of borrowing strength and the only cheap answer to cold start. Now push heterogeneity past ${pct(0.8)}: when lines behave too differently, forced sharing makes them interfere, and the right move becomes clustering first and one global model per cluster.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t15 · dlLab — capacity against data
   ========================================================= */
function DlViz() {
  const L = useL();
  const [nTrain, setNTrain] = React.useState(200);
  const [cap, setCap] = React.useState(120);       // model capacity: random features
  const [lam, setLam] = React.useState(0.004);
  const [noise, setNoise] = React.useState(1);

  const R = React.useMemo(() => {
    const days = 60, S = synth({ days, seed: 47, noise });
    const y = S.y, n = y.length;
    const raw = [], tgt = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const s = i % SLOTS;
      raw.push([y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, mean(y.slice(i - SLOTS - 4, i - SLOTS)) / 1000,
                Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS), Math.pow(Math.max(0, S.temp[i] - 24), 1.25) / 10]);
      tgt.push(y[i] / 1000);
    }
    // A capacity knob with the same overfitting behaviour a neural net has:
    // random Fourier features + ridge. More features = more parameters = more
    // ability to memorise, and the divergence you see is the real phenomenon.
    const D = raw[0].length, MAXK = 160, r = rng(2);
    const W = Array.from({ length: MAXK }, () => Array.from({ length: D }, () => 1.9 * gauss(r)));
    const bph = Array.from({ length: MAXK }, () => 2 * Math.PI * r());
    const feat = (row, k) => { const f = [1]; for (let j = 0; j < k; j++) f.push(Math.cos(dot(W[j], row) + bph[j])); return f; };

    const cut = Math.floor(raw.length * 0.75);
    const trPool = raw.slice(0, cut), trT = tgt.slice(0, cut);
    const vaX = raw.slice(cut), vaT = tgt.slice(cut);
    const run = (k, m) => {
      const mm = Math.min(m, trPool.length);
      const X = trPool.slice(trPool.length - mm).map((x) => feat(x, k));
      const t = trT.slice(trT.length - mm);
      const b = ridge(X, t, lam);
      return { tr: wape(t, X.map((x) => dot(b, x))), va: wape(vaT, vaX.map((x) => dot(feat(x, k), b))) };
    };
    const cur = run(cap, nTrain);
    const sweep = [];
    for (let k = 4; k <= MAXK; k += 6) { const e = run(k, nTrain); sweep.push({ x: k, y: e.va, tr: e.tr }); }
    const best = sweep.reduce((a, b) => (b.y < a.y ? b : a));
    const dataSweep = [];
    for (let m = 80; m <= trPool.length; m = Math.round(m * 1.35)) dataSweep.push({ x: m, y: run(cap, m).va });
    return { cur, sweep, best, dataSweep, maxTrain: trPool.length };
  }, [nTrain, cap, lam, noise]);

  const gap = R.cur.va - R.cur.tr;
  const params = R.cur ? cap + 1 : 0;

  return (
    <div>
      <VizHead idx="DL1" title={L("模型容量 × 数据量:过拟合不是风险,是必然", "Capacity against data: overfitting is not a risk, it is an arithmetic certainty")} />
      <div className="viz-ctrl">
        <Slider label={L("训练样本数", "Training samples")} min={80} max={4000} step={40} value={nTrain} onChange={setNTrain} />
        <Slider label={L("模型容量(参数个数)", "Model capacity (parameters)")} min={4} max={160} step={4} value={cap} onChange={setCap} />
        <Slider label={L("正则强度 λ", "Regularisation λ")} min={0.001} max={0.5} step={0.001} value={lam} onChange={setLam} fmt={(v) => nf(v, 3)} />
        <Slider label={L("噪声水平", "Noise level")} min={0.3} max={2.5} step={0.1} value={noise} onChange={setNoise} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("训练误差", "Training error")} value={pct1(R.cur.tr)} tone="mut" />
        <Kpi label={L("验证误差", "Validation error")} value={pct1(R.cur.va)} tone={gap > 0.02 ? "warn" : "ok"} />
        <Kpi label={L("泛化间隙", "Generalisation gap")} value={`${nf(gap * 100, 1)} pt`} tone={gap > 0.02 ? "warn" : "ok"} hint={L("间隙越大,你拟合的越是噪声", "the wider it is, the more noise you fitted")} />
        <Kpi label={L("这个数据量的最优容量", "Best capacity for this data size")} value={R.best.x} tone="acc" hint={L(`验证误差 ${pct1(R.best.y)}`, `validation ${pct1(R.best.y)}`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("验证误差随模型容量(上)/ 随训练样本数(下)", "Validation error against capacity (top) and against training size (bottom)")}</div>
        <MiniPlot data={R.sweep} h={100} markIndex={Math.round((cap - 4) / 6)} yMin={0} />
        <MiniPlot data={R.dataSweep} h={100} yMin={0} stroke="var(--accent)" />
      </div>

      <Note mark="→" tone={cap > R.best.x * 1.8 ? "bad" : "on"}>
        {L(`用 ${nf(nTrain, 0)} 个样本训 ${params} 个参数,训练误差 ${pct1(R.cur.tr)}、验证误差 ${pct1(R.cur.va)},间隙 ${nf(gap * 100, 1)} 个点;这个数据量下的最优容量是 ${R.best.x} 个参数。把容量拖到 160、样本数拖到 80,你会看到训练误差趋近于零而验证误差翻倍——这就是「在三万五千个点上训两百万参数」的缩小版,区别只是数量级。上深度模型之前请先回答一个问题:你的数据量把树模型撑满了吗?如果没有,加容量买到的只是更贵的过拟合。(这里的容量旋钮是随机特征 + 岭回归,不是神经网络,但过拟合的机制与曲线形状完全是同一件事。)`,
            `Training ${params} parameters on ${nf(nTrain, 0)} samples gives ${pct1(R.cur.tr)} training error against ${pct1(R.cur.va)} validation — a gap of ${nf(gap * 100, 1)} points — while the best capacity at this data size is ${R.best.x} parameters. Push capacity to 160 and samples down to 80 and training error approaches zero while validation doubles: that is a scale model of training two million parameters on thirty-five thousand points, differing only in the exponent. Before reaching for a deep model, answer one question: has your data saturated the tree model? If not, extra capacity buys nothing but more expensive overfitting. (The capacity knob here is random features plus ridge rather than a neural network, but the overfitting mechanism and the shape of the curve are exactly the same thing.)`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t16 · archLab — decomposition, patching and a linear layer
   ========================================================= */
function ArchViz() {
  const L = useL();
  const [days, setDays] = React.useState(50);
  const [patch, setPatch] = React.useState(4);
  const [instNorm, setInstNorm] = React.useState(true);
  const [noise, setNoise] = React.useState(1);

  const R = React.useMemo(() => {
    const S = synth({ days, seed: 53, noise });
    const y = S.y, n = y.length;
    const LOOK = 96, STRIDE = 2;                    // 24 h of history, subsampled
    const HS = [4, 12, 24, 40, 56, 72, 88, 96];     // horizons actually evaluated
    const win = [], at = [];
    for (let i = LOOK; i < n - 96; i += 3) {
      const w = []; for (let k = LOOK; k > 0; k -= STRIDE) w.push(y[i - k] / 1000);
      win.push(w); at.push(i);
    }
    const cut = Math.floor(win.length * 0.75);
    const maLen = 8;
    const decomp = (w) => {                          // DLinear: trend + seasonal
      const tr = w.map((_, i) => mean(w.slice(Math.max(0, i - maLen + 1), i + 1)));
      return { tr, se: w.map((v, i) => v - tr[i]) };
    };
    const down = (a, m) => { const o = []; for (let i = 0; i + m <= a.length; i += m) o.push(mean(a.slice(i, i + m))); return o; };

    const cal = (i) => { const sl = i % SLOTS; return [Math.sin((2 * Math.PI * sl) / SLOTS), Math.cos((2 * Math.PI * sl) / SLOTS), Math.sin((4 * Math.PI * sl) / SLOTS), Math.cos((4 * Math.PI * sl) / SLOTS)]; };
    const models = {
      linear: (w, i) => [1, ...w, ...cal(i)],
      dlinear: (w, i) => { const { tr, se } = decomp(w); return [1, ...down(tr, 4), ...down(se, 4), ...cal(i)]; },
      patch: (w, i) => [1, ...down(w, patch), ...cal(i)],
    };
    const out = {};
    for (const key of Object.keys(models)) {
      const errs = [];
      for (const h of HS) {
        const X = [], t = [];
        for (let j = 0; j < win.length; j++) {
          const i = at[j], mu = instNorm ? mean(win[j]) : 0;
          const w = instNorm ? win[j].map((v) => v - mu) : win[j];
          X.push(models[key](w, i + h - 1)); t.push(y[i + h - 1] / 1000 - mu);
        }
        const b = ridge(X.slice(0, cut), t.slice(0, cut), 1e-3);
        const yt = [], pr = [];
        for (let j = cut; j < win.length; j++) {
          const mu = instNorm ? mean(win[j]) : 0;
          yt.push(t[j] + mu); pr.push(dot(b, X[j]) + mu);
        }
        errs.push({ h, e: wape(yt, pr) });
      }
      out[key] = { errs, mean: mean(errs.map((x) => x.e)), params: models[key](win[0], 0).length * HS.length };
    }
    // seasonal naive over the same evaluation points
    const nYt = [], nPr = [];
    for (let j = cut; j < win.length; j++) for (const h of HS) { const i = at[j]; nYt.push(y[i + h - 1]); nPr.push(y[i + h - 1 - SLOTS]); }
    out.naive = { errs: HS.map((h) => ({ h, e: 0 })), mean: wape(nYt, nPr), params: 0 };
    return out;
  }, [days, patch, instNorm, noise]);

  const ROWS = [
    { k: "naive", zh: "季节朴素(零参数)", en: "Seasonal naive (no parameters)" },
    { k: "linear", zh: "直接线性(整窗 → 每步)", en: "Direct linear (whole window)" },
    { k: "dlinear", zh: "DLinear(趋势+季节分解)", en: "DLinear (trend + seasonal)" },
    { k: "patch", zh: `Patch 线性(patch=${patch})`, en: `Patch linear (patch=${patch})` },
  ];
  const lang = useLang();
  const best = ROWS.slice(1).reduce((a, b) => (R[b.k].mean < R[a.k].mean ? b : a));
  const mx = Math.max(...ROWS.map((r) => R[r.k].mean)) * 1.15;

  return (
    <div>
      <VizHead idx="DL2" title={L("同一份数据、同一个预算:分解与切片值多少", "Same data, same budget: what decomposition and patching are worth")} />
      <div className="viz-ctrl">
        <Slider label={L("历史长度", "History")} min={20} max={80} value={days} onChange={setDays} unit={L(" 天", " d")} />
        <Slider label={L("patch 大小", "Patch size")} min={2} max={12} value={patch} onChange={setPatch} />
        <Slider label={L("噪声水平", "Noise level")} min={0.3} max={2.5} step={0.1} value={noise} onChange={setNoise} />
        <Toggle label={L("实例归一化(减去窗口均值)", "Instance normalisation")} value={instNorm} onChange={setInstNorm} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("最好的模型", "Best model")} value={pick(lang, best)} tone="ok" hint={pct1(R[best.k].mean)} />
        <Kpi label={L("DLinear 的参数量", "DLinear parameters")} value={nf(R.dlinear.params, 0)} tone="acc" hint={L(`直接线性是 ${nf(R.linear.params, 0)}`, `direct linear uses ${nf(R.linear.params, 0)}`)} />
        <Kpi label={L("Patch 线性的参数量", "Patch linear parameters")} value={nf(R.patch.params, 0)} tone="acc" hint={L(`约为直接线性的 ${pct(R.patch.params / R.linear.params)}`, `${pct(R.patch.params / R.linear.params)} of direct linear`)} />
        <Kpi label={L("比季节朴素好了", "Better than seasonal naive by")} value={`${nf((R.naive.mean - R[best.k].mean) * 100, 1)} pt`} tone={R[best.k].mean < R.naive.mean ? "ok" : "warn"} />
      </div>

      <div style={{ marginTop: 10 }}>
        {ROWS.map((r) => (
          <Bar key={r.k} label={`${pick(lang, r)} · ${nf(R[r.k].params, 0)} ${L("参数", "params")}`} value={R[r.k].mean} max={mx}
            tone={r.k === best.k ? "ok" : r.k === "naive" ? "mut" : "acc"} valText={pct1(R[r.k].mean)} />
        ))}
      </div>

      <Note mark="→" tone={instNorm ? "on" : "bad"}>
        {!instNorm
          ? L(`关掉实例归一化,三个模型一起变差。这是 DLinear 那篇论文里最被低估的一半:把每个输入窗口减去自己的均值再预测、预测完加回去,模型就不必再花容量去记住"这一段大概在什么水平",而只需要学形状。很多被归到"架构"头上的收益,其实来自这一步。`,
              `Switch instance normalisation off and all three models get worse together. This is the underrated half of the DLinear paper: subtract each input window's own mean before predicting and add it back afterwards, and the model no longer spends capacity remembering roughly what level this stretch sits at — it only has to learn the shape. A good deal of what gets credited to architecture comes from this one step.`)
          : L(`诚实地报告这张表:在这份数据上,参数最多的直接线性最好(${pct1(R.linear.mean)}),DLinear ${pct1(R.dlinear.mean)},Patch 线性 ${pct1(R.patch.mean)}——分解和切片并没有反超,把历史长度拖到 20 天也没有。真正值得注意的是差距的尺度:三者相差不到 ${nf(Math.abs(R.patch.mean - R.linear.mean) * 100, 1)} 个点,而它们全体距离零参数的季节朴素只有 ${nf((R.naive.mean - R[best.k].mean) * 100, 1)} 个点。也就是说,在这条产线上,架构不是误差所在的地方——数据、特征和对齐才是。这正是 DLinear 那篇论文真正的警告:不是注意力没用,而是在一个诚实调过的简单基线面前,很多架构收益小到会被方差吃掉。Patch 线性用 ${pct(R.patch.params / R.linear.params)} 的参数做到只差 ${nf((R.patch.mean - R.linear.mean) * 100, 1)} 个点,这才是它真正的卖点:同样的精度,更便宜。`,
              `Read this table honestly: on this data the model with the most parameters — direct linear — wins at ${pct1(R.linear.mean)}, with DLinear at ${pct1(R.dlinear.mean)} and patch linear at ${pct1(R.patch.mean)}. Decomposition and patching do not overtake it, and shortening the history to twenty days does not change that. What deserves attention is the scale of the differences: under ${nf(Math.abs(R.patch.mean - R.linear.mean) * 100, 1)} points separate the three, and all of them sit only ${nf((R.naive.mean - R[best.k].mean) * 100, 1)} points from a seasonal naive with no parameters at all. On this line, in other words, the architecture is not where the error lives — the data, the features and the alignment are. That is DLinear's real warning: not that attention is useless, but that against an honestly tuned simple baseline many architectural gains are small enough for variance to eat. Patch linear reaching within ${nf((R.patch.mean - R.linear.mean) * 100, 1)} points on ${pct(R.patch.params / R.linear.params)} of the parameters is its actual selling point: the same accuracy, cheaper.`)}
      </Note>
    </div>
  );
}

window.__TS_VIZ_2 = { exoLab: ExoViz, horizonLab: HorizonViz, arimaLab: ArimaViz, gbmLab: GbmViz, quantLab: QuantViz, globalLab: GlobalViz, dlLab: DlViz, archLab: ArchViz };
