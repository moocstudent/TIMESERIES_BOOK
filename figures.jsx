/* =========================================================
   figures.jsx — static lecture figures (t1–t10)
   ---------------------------------------------------------
   Chapter notes carry a line like `@fig t1-layers`, which
   pages.jsx replaces with <Figure name="t1-layers" idx={n} />.
   Each figure is a dependency-free, theme-aware SVG built from
   the primitives below and the site language (useL()).
   Keep in-SVG text to SHORT labels — full sentences belong in
   `cap`, which the browser wraps. figures3.jsx defines <Figure>
   and the window export; figures4.jsx adds the per-module
   architecture diagrams.
   ========================================================= */

const FIGN = {};
const FTONE = { p: "var(--primary)", a: "var(--accent)", m: "var(--muted)", bad: "#c0453f", ok: "#2e9e6b", warn: "#d98a1f", n: "var(--surface-2)" };

function FigFrame({ w = 680, h = 220, cap, idx, children }) {
  const L = useL();
  return (
    <figure className="ts-fig">
      <svg className="ts-fig-svg" viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img">
        {children}
      </svg>
      {cap ? <figcaption>{idx ? <span className="fno">{L(`图 ${idx}`, `Fig. ${idx}`)}</span> : null}{cap}</figcaption> : null}
    </figure>
  );
}
function FArrow({ x1, y1, x2, y2, dash, c = "var(--muted)", wdt = 1.3 }) {
  const ang = Math.atan2(y2 - y1, x2 - x1), s = 5.5;
  const tip = `${x2},${y2} ${(x2 - s * Math.cos(ang - 0.42)).toFixed(1)},${(y2 - s * Math.sin(ang - 0.42)).toFixed(1)} ${(x2 - s * Math.cos(ang + 0.42)).toFixed(1)},${(y2 - s * Math.sin(ang + 0.42)).toFixed(1)}`;
  return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={wdt} strokeDasharray={dash ? "4 3" : ""} /><polygon points={tip} fill={c} /></g>;
}
function FBox({ x, y, w, h, label, sub, tone = "n", dash }) {
  const solid = tone !== "n";
  const c = FTONE[tone] || FTONE.n;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={solid ? `color-mix(in srgb, ${c} 84%, transparent)` : "var(--surface-2)"}
        stroke={c} strokeWidth="1.2" strokeDasharray={dash ? "4 3" : ""} />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -3 : 1)} textAnchor="middle" dominantBaseline="middle" style={{ font: "600 11.5px var(--f-mono)", fill: solid ? "#fff" : "var(--ink)" }}>{label}</text>
      {sub ? <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" style={{ font: "500 8.5px var(--f-mono)", fill: solid ? "rgba(255,255,255,.85)" : "var(--muted)" }}>{sub}</text> : null}
    </g>
  );
}
function FT({ x, y, children, anchor = "middle", cls = "tm" }) {
  return <text x={x} y={y} textAnchor={anchor} className={cls}>{children}</text>;
}
// A polyline. Returns a `points` string — never feed this to a <path d=…>.
function fpts(vals, x0, y0, w, h, lo, hi) {
  const n = vals.length, span = (hi - lo) || 1;
  return vals.map((v, i) => `${(x0 + (i / (n - 1)) * w).toFixed(1)},${(y0 + h - ((v - lo) / span) * h).toFixed(1)}`).join(" ");
}
function FCurve({ vals, x = 40, y = 30, w = 600, h = 90, lo, hi, c = "var(--primary)", dash, wdt = 1.8 }) {
  const mn = lo !== undefined ? lo : Math.min(...vals), mx = hi !== undefined ? hi : Math.max(...vals);
  return <polyline points={fpts(vals, x, y, w, h, mn, mx)} fill="none" stroke={c} strokeWidth={wdt} strokeDasharray={dash ? "4 3" : ""} strokeLinejoin="round" />;
}
function FBars({ items, x = 40, y = 30, w = 600, h = 90, max, gap = 6 }) {
  const mx = max || Math.max(...items.map((i) => i.v));
  const bw = (w - gap * (items.length - 1)) / items.length;
  return (
    <g>
      {items.map((it, i) => {
        const bh = Math.max(2, (it.v / mx) * h), bx = x + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={bx} y={y + h - bh} width={bw} height={bh} rx="3" fill={`color-mix(in srgb, ${FTONE[it.tone] || FTONE.p} 84%, transparent)`} />
            <text x={bx + bw / 2} y={y + h + 13} textAnchor="middle" className="tn">{it.k}</text>
            {it.lab ? <text x={bx + bw / 2} y={y + h - bh - 5} textAnchor="middle" className="tk">{it.lab}</text> : null}
          </g>
        );
      })}
    </g>
  );
}
function FAxis({ x = 40, y = 120, w = 600, label, right }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + w} y2={y} stroke="var(--hairline-strong)" strokeWidth="1" />
      {label ? <text x={x} y={y + 15} className="tn">{label}</text> : null}
      {right ? <text x={x + w} y={y + 15} textAnchor="end" className="tn">{right}</text> : null}
    </g>
  );
}
// a deterministic wobble, so figures look like data rather than like clip art
function fnoise(i, amp = 1) { return amp * (Math.sin(i * 12.9898) * 43758.5453 % 1 - 0.5); }

/* ---------------- t1 · the four layers ---------------- */
FIGN["t1-layers"] = function ({ idx }) {
  const L = useL();
  const N = 96;
  const base = Array.from({ length: N }, () => 0.14);
  const proc = Array.from({ length: N }, (_, i) => { const h = (i / N) * 24; return h >= 7.5 && h < 23 ? (h >= 11.5 && h < 12.5 ? 0.34 : 0.62) : 0.06; });
  const wx = Array.from({ length: N }, (_, i) => 0.13 * Math.max(0, Math.sin((Math.PI * (i / N) * 24 - 60) / 24)));
  const nz = Array.from({ length: N }, (_, i) => 0.03 * fnoise(i, 2));
  const tot = base.map((b, i) => b + proc[i] + wx[i] + nz[i]);
  return (
    <FigFrame idx={idx} h={244} cap={L("同一条曲线的四层:基线几乎不动却决定了「地板」,工况层是方波、贡献了绝大部分方差、也是你真正要预测的那一层,环境层慢而平滑因此可以从气象预报里提前拿到,噪声层无法预测——把模型容量花在它上面就是过拟合。先搞清楚你要预测的是哪一层,再选模型。", "The same curve in four layers. The baseline barely moves yet sets the floor; the process layer is a square wave carrying most of the variance and is what you actually predict; the environmental layer is slow and smooth, which is why it can be obtained in advance from a weather forecast; the noise layer cannot be predicted at all, and capacity spent on it is overfitting. Establish which layer you are predicting before choosing a model.")}>
      <FT x={40} y={18} anchor="start" cls="tk">{L("叠加后的实测曲线", "What the meter records")}</FT>
      <FCurve vals={tot} x={40} y={24} w={430} h={62} lo={0} hi={0.95} />
      <FAxis x={40} y={90} w={430} label="00:00" right="24:00" />

      {[
        { v: proc, y: 112, zh: "工况(班次/批次)", en: "process (shifts)", c: "var(--primary)", pct: "≈83%" },
        { v: wx, y: 150, zh: "环境(温度)", en: "environment", c: "var(--accent)", pct: "≈15%" },
        { v: nz.map((x) => x + 0.05), y: 188, zh: "噪声", en: "noise", c: "#d98a1f", pct: "≈2%" },
      ].map((r, i) => (
        <g key={i}>
          <FCurve vals={r.v} x={40} y={r.y} w={430} h={26} lo={0} hi={0.7} c={r.c} wdt={1.4} />
          <FT x={480} y={r.y + 16} anchor="start" cls="tm">{L(r.zh, r.en)}</FT>
          <FT x={648} y={r.y + 16} anchor="end" cls="tk">{r.pct}</FT>
        </g>
      ))}
      <line x1={40} y1={100} x2={648} y2={100} stroke="var(--hairline-strong)" strokeDasharray="3 3" />
      <FT x={40} y={228} anchor="start" cls="tn">{L("基线 ≈0.1%:不动,但决定 MAPE 会不会爆", "baseline ≈0.1%: still, but it decides whether MAPE explodes")}</FT>
    </FigFrame>
  );
};

/* ---------------- t2 · asymmetric cost ---------------- */
FIGN["t2-asym"] = function ({ idx }) {
  const L = useL();
  const cx = 340;
  return (
    <FigFrame idx={idx} h={214} cap={L("低估和高估的代价几乎从不对称。需量控制里顶破一次上限的代价是多削一点的六七倍,于是期望代价最低的那个预测并不是无偏的,而是整体上抬到误差分布的 τ = cu/(cu+co) 分位数。这也是为什么你该直接用 pinball loss 训一个分位数模型,而不是先用 MSE 训个无偏模型再手工加一个常数裕度——那个常数会在误差分布一变就失效。", "The cost of being low and the cost of being high are almost never symmetric. In demand control, breaking the cap costs six or seven times what shaving a little extra costs, so the forecast with the lowest expected cost is not the unbiased one but one lifted to the τ = cu/(cu+co) quantile of the error distribution. That is why you train a quantile model with pinball loss directly, rather than fitting MSE and adding a constant margin by hand — a constant stops working the moment the error distribution moves.")}>
      <FAxis x={60} y={150} w={560} />
      <line x1={cx} y1={30} x2={cx} y2={150} stroke="var(--hairline-strong)" strokeDasharray="3 3" />
      <FT x={cx} y={168} cls="tn">{L("预测 = 实际", "forecast = actual")}</FT>

      <polyline points={`${cx},150 120,42`} fill="none" stroke={FTONE.bad} strokeWidth="2.4" />
      <polyline points={`${cx},150 600,112`} fill="none" stroke={FTONE.ok} strokeWidth="2.4" />
      <FT x={150} y={34} anchor="start" cls="tk">{L("低估:顶破需量", "low: cap broken")}</FT>
      <FT x={150} y={48} anchor="start" cls="tn">{L("¥6.0 / kW", "¥6.0 / kW")}</FT>
      <FT x={520} y={100} anchor="start" cls="tk">{L("高估:多削一点", "high: over-shaved")}</FT>
      <FT x={520} y={114} anchor="start" cls="tn">{L("¥0.8 / kW", "¥0.8 / kW")}</FT>

      <line x1={cx + 88} y1={30} x2={cx + 88} y2={150} stroke={FTONE.p} strokeWidth="1.6" />
      <FT x={cx + 88} y={22} cls="tk">{L("最优预测", "optimal forecast")}</FT>
      <FArrow x1={cx + 6} y1={140} x2={cx + 84} y2={140} c={FTONE.p} />
      <FT x={cx + 46} y={134} cls="tn">τ = 0.88</FT>
      <FT x={60} y={196} anchor="start" cls="ts">{L("无偏预测在这里并不是最便宜的那个", "The unbiased forecast is not the cheapest one here")}</FT>
    </FigFrame>
  );
};

/* ---------------- t3 · the bar to clear ---------------- */
FIGN["t3-bar"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={210} cap={L("四条不需要训练的基线跑在同一份数据上。「近 4 周同刻中位数」这一条规则就做到 WAPE 7.9%,而这正是你后面所有模型必须先跨过的横杆。MASE 把这件事写成一个自带及格线的数字:你的误差除以朴素基线的误差,小于 1 才算有价值。基线的排名本身也是诊断——周规律强的产线上「上周同刻」赢,排产随机的产线上「昨日同刻」赢。", "Four training-free baselines on the same data. The four-week same-slot median alone reaches 7.9% WAPE, and that is the bar every later model must clear. MASE turns this into a number with a built-in pass mark: your error divided by the naive baseline's, where only below one is worth anything. The ranking is itself a diagnosis — last-week-same-time wins on a line with strong weekly regularity, yesterday-same-time wins where scheduling is random.")}>
      <FBars x={60} y={30} w={420} h={96} items={[
        { k: "d-1", v: 16.5, lab: "16.5%", tone: "m" },
        { k: "w-1", v: 13.4, lab: "13.4%", tone: "a" },
        { k: L("4周中位", "4wk med"), v: 7.9, lab: "7.9%", tone: "ok" },
        { k: L("4日均值", "4d mean"), v: 26.3, lab: "26.3%", tone: "bad" },
      ]} max={30} />
      <FAxis x={60} y={126} w={420} label="WAPE" />
      <line x1={60} y1={126 - (7.9 / 30) * 96} x2={648} y2={126 - (7.9 / 30) * 96} stroke={FTONE.ok} strokeDasharray="5 4" strokeWidth="1.4" />
      <FT x={648} y={126 - (7.9 / 30) * 96 - 6} anchor="end" cls="tk">{L("及格线", "the bar")}</FT>
      <FBox x={508} y={36} w={140} h={44} label={L("MASE < 1", "MASE < 1")} sub={L("才算有价值", "or it is worthless")} tone="ok" />
      <FT x={60} y={172} anchor="start" cls="ts">{L("打不过这条线的模型不该上线,而且这条线要在生产里一直跑下去", "A model that cannot clear this should not ship — and the baseline keeps running in production")}</FT>
      <FT x={60} y={192} anchor="start" cls="tn">{L("「4 日均值」把周末算进了工作日的预测里,所以它垫底", "The 4-day mean averages weekends into weekday forecasts, which is why it is last")}</FT>
    </FigFrame>
  );
};

/* ---------------- t4 · the acquisition chain ---------------- */
FIGN["t4-chain"] = function ({ idx }) {
  const L = useL();
  const hops = [
    { x: 24, zh: "传感器", en: "sensor", sub: "1 s" },
    { x: 140, zh: "PLC", en: "PLC", sub: "100 ms" },
    { x: 256, zh: L("历史库", "historian"), en: "historian", sub: L("死区+5min", "deadband") },
    { x: 372, zh: L("数据平台", "platform"), en: "platform", sub: "15 min" },
    { x: 488, zh: "CSV", en: "CSV", sub: L("你拿到的", "what you get") },
  ];
  return (
    <FigFrame idx={idx} h={218} cap={L("你拿到的 CSV 是第五手数据,每一跳都可能改变它。最贵的一刀在历史库:死区压缩加上存储周期,对总电量几乎无损(这正是它当年被批准上线的理由),却把两三分钟就回落的冲击整段抹掉——如果你预测的是需量,这一刀正好砍在你唯一要的地方,而且不会有任何告警。凡是出现「聚合」「压缩」「补写」的地方,都要回去问一句它用的是哪种口径。", "The CSV you received is fifth-hand, and every hop can change it. The most expensive cut is at the historian: deadband compression plus a storage period is near-lossless on total energy — which is exactly why it was approved — while deleting inrushes that rise and fall within two or three minutes. If you are forecasting demand, that cut lands on the one thing you needed, and no alarm will fire. Wherever you see aggregation, compression or backfill, go back and ask which rule it used.")}>
      {hops.map((h, i) => (
        <g key={i}>
          <FBox x={h.x} y={40} w={104} h={40} label={typeof h.zh === "string" ? L(h.zh, h.en) : h.zh} sub={h.sub} tone={i === 2 ? "warn" : "n"} />
          {i < hops.length - 1 && <FArrow x1={h.x + 106} y1={60} x2={hops[i + 1].x - 4} y2={60} />}
        </g>
      ))}
      <FT x={596} y={56} anchor="start" cls="tk">{L("你在这里", "you are here")}</FT>
      <FT x={596} y={70} anchor="start" cls="tn">{L("第五手", "5th hand")}</FT>

      <FT x={24} y={110} anchor="start" cls="tk">{L("每一跳的变形", "what each hop changes")}</FT>
      {[
        { x: 24, zh: "瞬时 or 区间均值?", en: "point or interval mean?" },
        { x: 140, zh: "扫描周期 ≠ 存储周期", en: "scan ≠ storage" },
        { x: 256, zh: "尖峰被整段抹掉", en: "spikes deleted" },
        { x: 372, zh: "聚合口径:均值/最大/末值", en: "mean / max / last" },
        { x: 488, zh: "时区?那个零是什么?", en: "zone? what is a zero?" },
      ].map((t, i) => (
        <FT key={i} x={t.x} y={132} anchor="start" cls="tn">{L(t.zh, t.en)}</FT>
      ))}

      <FBox x={24} y={154} w={290} h={40} label={L("总电量 误差 1.2%", "total energy: 1.2% off")} sub={L("所以压缩当年被批准了", "which is why it was approved")} tone="ok" />
      <FBox x={330} y={154} w={318} h={40} label={L("14 次冲击丢了 6 次 · 瞬时峰 −1.3%", "6 of 14 inrushes gone · peak −1.3%")} sub={L("而计费只看峰", "and billing only looks at the peak")} tone="bad" />
    </FigFrame>
  );
};

/* ---------------- t5 · four kinds of gap ---------------- */
FIGN["t5-gaps"] = function ({ idx }) {
  const L = useL();
  const rows = [
    { zh: "通信中断", en: "comms dropout", truth: L("过程在跑,记录丢了", "process ran, record lost"), act: L("插值补上", "interpolate"), tone: "ok" },
    { zh: "计划停机", en: "planned shutdown", truth: L("真值就是待机", "standby IS the truth"), act: L("保留并标记", "keep it, flag it"), tone: "ok" },
    { zh: "仪表故障", en: "instrument fault", truth: L("有数,但全是错的", "present, and wrong"), act: L("标记为坏,不要信", "flag as bad"), tone: "warn" },
    { zh: "真实为零", en: "genuine zero", truth: L("设备就是没开", "the machine was off"), act: L("什么都不做", "do nothing"), tone: "ok" },
  ];
  return (
    <FigFrame idx={idx} h={232} cap={L("四类缺失在同一列里长得一模一样,却要求相反的处理。把计划停机用线性插值抹成一条斜坡,等于告诉模型「这天没停过机」——而停机恰恰是你最需要它认出来的模式,并且你还顺手毁掉了自己仅有的停机样本,等下个月检修日排上日历时,你已经没有东西可以用来预测它了。所以顺序是:先诊断、再分类、最后才决定动作。", "All four look identical in the same column and demand opposite treatments. Smoothing a planned shutdown into a ramp with linear interpolation tells the model that no shutdown happened — precisely the pattern you needed it to recognise — and destroys your only examples of one, so that when next month's maintenance day appears on the calendar you have nothing left to predict it with. The order is therefore: diagnose, classify, and only then act.")}>
      <FT x={24} y={22} anchor="start" cls="tk">{L("长得一样", "they look the same")}</FT>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={24} y={32 + i * 46} width={150} height={34} rx="5" fill="var(--surface-2)" stroke="var(--hairline-strong)" />
          <FT x={99} y={53 + i * 46} cls="tk">{L(r.zh, r.en)}</FT>
          <FArrow x1={178} y1={49 + i * 46} x2={214} y2={49 + i * 46} />
          <FT x={222} y={46 + i * 46} anchor="start" cls="tm">{r.truth}</FT>
          <FArrow x1={430} y1={49 + i * 46} x2={466} y2={49 + i * 46} c={FTONE[r.tone]} />
          <FBox x={472} y={32 + i * 46} w={176} h={34} label={r.act} tone={r.tone} />
        </g>
      ))}
      <FT x={24} y={224} anchor="start" cls="ts">{L("诊断 → 分类 → 动作。跳过前两步,第三步一定错。", "Diagnose, classify, then act. Skip the first two and the third is wrong.")}</FT>
    </FigFrame>
  );
};

/* ---------------- t6 · alignment ---------------- */
FIGN["t6-align"] = function ({ idx }) {
  const L = useL();
  const N = 72;
  const temp = Array.from({ length: N }, (_, i) => 0.5 + 0.42 * Math.sin((2 * Math.PI * i) / N - 1.6));
  const load = Array.from({ length: N }, (_, i) => 0.5 + 0.42 * Math.sin((2 * Math.PI * (i - 6)) / N - 1.6));
  return (
    <FigFrame idx={idx} h={236} cap={L("上半张图是对齐正确的情形:厂房有两小时热惯性,所以温度特征要带 2 小时滞后,负荷与它几乎同相,回归拿得到全部增益。下半张是时标差了一小时的情形——同一份数据、同一个模型,相关性被削掉一截,温度特征的增益从五成掉到一成多,而模型不会报错,它只会「学会」温度没什么用。另外注意训练用实测、上线只有预报:这个差额不出现在任何离线报告里。", "The top pair is correctly aligned: the building has two hours of thermal inertia, so the temperature feature carries a two-hour lag, load sits almost in phase with it, and the regression collects the whole gain. The bottom pair is the same data and the same model with the timestamps an hour apart — the correlation is cut down, the temperature feature's gain falls from about half to barely a tenth, and nothing raises an error. The model simply learns that temperature does not matter. Note too that training on measurements while serving on forecasts costs a gap that appears in no offline report.")}>
      <FT x={24} y={20} anchor="start" cls="tk">{L("对齐正确:温度滞后 2 h", "aligned: temperature lagged 2 h")}</FT>
      <FCurve vals={temp} x={24} y={26} w={470} h={48} lo={0} hi={1} c={FTONE.a} />
      <FCurve vals={load} x={24} y={26} w={470} h={48} lo={0} hi={1} c={FTONE.p} />
      <FBox x={512} y={30} w={136} h={40} label={L("增益 50.5%", "gain 50.5%")} sub={L("r 高", "high correlation")} tone="ok" />

      <line x1={24} y1={96} x2={648} y2={96} stroke="var(--hairline)" />

      <FT x={24} y={122} anchor="start" cls="tk">{L("时标错 1 小时", "timestamps one hour apart")}</FT>
      <FCurve vals={temp.map((_, i) => temp[(i + 4) % N])} x={24} y={128} w={470} h={48} lo={0} hi={1} c={FTONE.a} dash />
      <FCurve vals={load} x={24} y={128} w={470} h={48} lo={0} hi={1} c={FTONE.p} />
      <FBox x={512} y={132} w={136} h={40} label={L("增益 13.3%", "gain 13.3%")} sub={L("模型不会报错", "nothing errors")} tone="bad" />

      <FT x={24} y={206} anchor="start" cls="tn">{L("── 负荷    ── 温度(虚线=错位)", "── load    ── temperature (dashed = misaligned)")}</FT>
      <FT x={24} y={224} anchor="start" cls="ts">{L("上线只有预报值,离线却用了实测值——这一项再虚高 0.7 个点", "Serving has only forecasts while offline used measurements — another 0.7 points of illusion")}</FT>
    </FigFrame>
  );
};

/* ---------------- t7 · leakage ---------------- */
FIGN["t7-leak"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={240} cap={L("上面那条是时序上唯一诚实的切分:训练在前,留出等于预测提前量的 gap,验证在后。下面那条是随机 K 折——验证样本的邻居就坐在训练集里,模型等于在抄答案。同一个模型、同一份数据,报告值 5.0% 对真实水平 6.6%,而这 1.6 个点会在上线第一周原形毕露。四类泄漏(随机切分、lag_1、含当前点的滚动窗、全量归一化)每一个都能单独把成绩做漂亮。", "The top strip is the only honest split on a time series: train first, leave a gap equal to the forecast lead time, validate after. The bottom is shuffled K-fold, where each validation row has its neighbours sitting in training and the model is copying the answer. Same model, same data: 5.0% reported against 6.6% real — and those 1.6 points surface in the first week after go-live. Each of the four leaks (shuffled splits, lag_1, a rolling window including the current point, whole-dataset scaling) is enough on its own to make the score look good.")}>
      <FT x={24} y={20} anchor="start" cls="tk">{L("正确:按时间切分 + gap", "correct: time-ordered, with a gap")}</FT>
      <rect x={24} y={28} width={380} height={26} rx="4" fill={`color-mix(in srgb, ${FTONE.p} 78%, transparent)`} />
      <FT x={214} y={45} cls="tk" >{L("训练", "train")}</FT>
      <rect x={408} y={28} width={54} height={26} rx="4" fill="var(--surface-2)" stroke={FTONE.warn} strokeDasharray="3 3" />
      <FT x={435} y={45} cls="tn">gap</FT>
      <rect x={466} y={28} width={182} height={26} rx="4" fill={`color-mix(in srgb, ${FTONE.ok} 78%, transparent)`} />
      <FT x={557} y={45} cls="tk">{L("验证", "validate")}</FT>
      <FT x={435} y={72} cls="tn">{L("= 预测提前量", "= forecast lead time")}</FT>

      <FT x={24} y={110} anchor="start" cls="tk">{L("错误:随机 K 折", "wrong: shuffled K-fold")}</FT>
      {Array.from({ length: 26 }, (_, i) => (
        <rect key={i} x={24 + i * 24} y={118} width={20} height={26} rx="3"
          fill={i % 4 === 1 ? `color-mix(in srgb, ${FTONE.ok} 78%, transparent)` : `color-mix(in srgb, ${FTONE.p} 78%, transparent)`} />
      ))}
      <FT x={24} y={162} anchor="start" cls="tn">{L("绿色是验证样本,它的左右邻居都在训练集里——等于抄答案", "green rows are validation, and their immediate neighbours are in training — copying the answer")}</FT>

      <FBars x={24} y={182} w={200} h={40} max={8} items={[{ k: L("报告", "reported"), v: 5.0, lab: "5.0%", tone: "bad" }, { k: L("真实", "real"), v: 6.6, lab: "6.6%", tone: "ok" }]} />
      <FT x={250} y={200} anchor="start" cls="tk">{L("你带去开会的数字 vs 上线拿到的数字", "the number you present vs the number you get")}</FT>
      <FT x={250} y={216} anchor="start" cls="tn">{L("四类泄漏:随机切分 · lag_1 · 滚动窗含当前点 · 全量归一化", "leaks: shuffled · lag_1 · rolling-incl-now · global scaling")}</FT>
    </FigFrame>
  );
};

/* ---------------- t8 · which lags you may use ---------------- */
FIGN["t8-lags"] = function ({ idx }) {
  const L = useL();
  const acf = Array.from({ length: 120 }, (_, i) => {
    const lag = i * 6;
    return 0.9 * Math.exp(-lag / 420) + 0.5 * Math.exp(-Math.pow((lag - 96) / 18, 2)) + 0.42 * Math.exp(-Math.pow((lag - 672) / 26, 2)) + 0.3 * Math.exp(-Math.pow((lag - 192) / 22, 2));
  });
  return (
    <FigFrame idx={idx} h={224} cap={L("自相关不需要任何领域知识就把周期讲清楚了:lag 96(一天)和 lag 672(一周)上的两根尖峰就是全部证据。但左边那块阴影才是这一章的重点——要提前 24 小时发布预测,lag 1 到 lag 95 在推理时根本不存在,拿它们训练就是上一章的泄漏。你能用的最小滞后等于你的预测提前量,这一条能当场解释掉一半的「线下 2% 线上 12%」。", "Autocorrelation explains the periodicity with no domain knowledge at all: the spikes at lag 96 (a day) and lag 672 (a week) are the whole evidence. But the shaded block on the left is the chapter's point — to publish 24 hours ahead, lag 1 through lag 95 do not exist at inference, and training on them is the previous chapter's leakage. The smallest lag you may use equals your forecast lead time, and that single rule explains half of all '2% offline, 12% online' stories on the spot.")}>
      <rect x={40} y={26} width={(96 / 720) * 600} height={100} fill={`color-mix(in srgb, ${FTONE.bad} 16%, transparent)`} />
      <FCurve vals={acf} x={40} y={26} w={600} h={100} lo={0} hi={1.1} />
      <FAxis x={40} y={126} w={600} label="lag 0" right="lag 720" />
      <FT x={40 + (96 / 720) * 600 / 2} y={20} cls="tk">{L("不可用", "unusable")}</FT>
      <FT x={40 + (96 / 720) * 600 / 2} y={144} cls="tn">{L("推理时不存在", "does not exist at inference")}</FT>

      {[{ l: 96, t: L("日周期", "daily") }, { l: 192, t: L("2 天", "2 days") }, { l: 672, t: L("周周期", "weekly") }].map((m, i) => (
        <g key={i}>
          <line x1={40 + (m.l / 720) * 600} y1={26} x2={40 + (m.l / 720) * 600} y2={126} stroke={FTONE.a} strokeDasharray="3 3" />
          <FT x={40 + (m.l / 720) * 600} y={20} cls="tk">{m.t}</FT>
        </g>
      ))}
      <FBox x={40} y={166} w={600} h={36} label={L("可用滞后下界 = 预测提前量", "lag floor = forecast lead time")} sub={L("提前 24 h ⇒ 最小可用 lag = 96", "24 h ahead ⇒ smallest usable lag = 96")} tone="p" />
    </FigFrame>
  );
};

/* ---------------- t9 · drivers: gain against availability ---------------- */
FIGN["t9-drivers"] = function ({ idx }) {
  const L = useL();
  const pts = [
    { x: 0.44, y: 0.45, zh: "排产计划", en: "production plan", tone: "warn" },
    { x: 0.15, y: 0.024, zh: "气温", en: "temperature", tone: "ok" },
    { x: 0.15, y: 0.02, zh: "气温滞后", en: "temp lagged", tone: "ok" },
    { x: 0.25, y: 0.073, zh: "检修计划", en: "maintenance", tone: "ok" },
    { x: 0.02, y: 0.001, zh: "班次日历", en: "shift calendar", tone: "m" },
    { x: 0.15, y: 0.001, zh: "湿度", en: "humidity", tone: "bad" },
  ];
  const X = (v) => 70 + v * 480, Y = (v) => 150 - (v / 0.5) * 112;
  return (
    <FigFrame idx={idx} h={224} cap={L("每一个候选外生变量都要同时回答两个问题:它能降多少误差(纵轴),以及上线那天你还有没有它(横轴)。排产计划信息量最大,因为它几乎直接决定功率、而且属于「未来可知」的那一类;但它也最不可靠——很多厂的 MES 前一晚才定稿,第二天还会改。湿度在右下角:永远拿得到,却几乎不携带信息,加进去只是多给模型一个过拟合的机会。", "Every candidate driver must answer two questions at once: how much error it removes (vertical) and whether you will still have it on go-live day (horizontal). The production plan carries the most information, because it almost directly determines power draw and belongs to the knowable-in-advance family — and it is the least dependable, since many plants finalise the MES schedule the night before and change it the next day. Humidity sits in the bottom right: always available, carrying almost nothing, and adding it only gives the model one more chance to overfit.")}>
      <FAxis x={70} y={150} w={490} label={L("可获得性风险 →", "availability risk →")} />
      <line x1={70} y1={30} x2={70} y2={150} stroke="var(--hairline-strong)" />
      <FT x={62} y={38} anchor="end" cls="tn">{L("增益", "gain")}</FT>
      <line x1={70} y1={90} x2={560} y2={90} stroke="var(--hairline)" strokeDasharray="3 3" />
      <line x1={310} y1={30} x2={310} y2={150} stroke="var(--hairline)" strokeDasharray="3 3" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.x)} cy={Y(p.y)} r="6" fill={FTONE[p.tone]} />
          <FT x={X(p.x) + 10} y={Y(p.y) + 4} anchor="start" cls="tm">{L(p.zh, p.en)}</FT>
        </g>
      ))}
      <FT x={92} y={46} anchor="start" cls="tk">{L("值得拿", "take it")}</FT>
      <FT x={332} y={46} anchor="start" cls="tk">{L("想清楚再拿", "think first")}</FT>
      <FT x={92} y={142} anchor="start" cls="tn">{L("拿得到但没用", "available, useless")}</FT>
      <FBox x={580} y={60} w={80} h={52} label={L("增益 × 可得", "gain × avail")} sub={L("两列一起看", "read both")} tone="p" />
      <FT x={70} y={196} anchor="start" cls="ts">{L("一个能降 3 个点但上线拿不到的变量,价值是零——这件事要在建模第一天问,不是上线前一周", "A driver worth three points that will not exist at inference is worth zero — ask on day one, not in the final week")}</FT>
    </FigFrame>
  );
};

/* ---------------- t10 · horizon strategies ---------------- */
FIGN["t10-horizon"] = function ({ idx }) {
  const L = useL();
  const N = 40;
  const pure = Array.from({ length: N }, (_, i) => 0.05 + 0.33 * Math.pow(i / N, 0.62));
  const seas = Array.from({ length: N }, (_, i) => 0.055 + 0.022 * (i / N));
  const dir = Array.from({ length: N }, (_, i) => 0.055 + 0.018 * (i / N));
  return (
    <FigFrame idx={idx} h={228} cap={L("误差累积正比于你必须合成的那部分输入,而不是「递归天生不行」。纯短滞后递归只有 lag1–lag4,滚到 24 小时时每一个输入都是上一轮的预测,误差从 5.5% 滚到 38%;带季节锚点的递归同样只有一个模型,但 lag96 和 lag672 是真值、不需要编,于是只从 5.5% 涨到 7.5%,几乎追平了训练 96 个模型的直接多步。实用折中是锚点插值:训 6 个步长,中间插出来。", "Compounding is proportional to the share of the input you must synthesise, not to recursion as such. The short-lag recursive model has only lag1–lag4, so by 24 hours every input is a previous prediction and error rolls from 5.5% to 38%. The version with seasonal anchors is also a single model, but lag96 and lag672 are true values it never invents, so it climbs only from 5.5% to 7.5% — nearly matching direct multi-step, which needed 96 models. The practical compromise is anchoring: fit six horizons and interpolate between them.")}>
      <FCurve vals={pure} x={54} y={26} w={470} h={104} lo={0} hi={0.42} c={FTONE.bad} />
      <FCurve vals={seas} x={54} y={26} w={470} h={104} lo={0} hi={0.42} c={FTONE.a} />
      <FCurve vals={dir} x={54} y={26} w={470} h={104} lo={0} hi={0.42} c={FTONE.ok} dash />
      <FAxis x={54} y={130} w={470} label={L("提前 15 分钟", "15 min ahead")} right={L("提前 24 小时", "24 h ahead")} />
      <FT x={46} y={34} anchor="end" cls="tn">40%</FT>
      <FT x={46} y={128} anchor="end" cls="tn">0</FT>

      <FT x={534} y={40} anchor="start" cls="tk">{L("纯短滞后递归", "short-lag recursive")}</FT>
      <FT x={534} y={54} anchor="start" cls="tn">1 → 38%</FT>
      <FT x={534} y={80} anchor="start" cls="tk">{L("带季节锚点递归", "recursive + seasonal")}</FT>
      <FT x={534} y={94} anchor="start" cls="tn">1 → 7.5%</FT>
      <FT x={534} y={120} anchor="start" cls="tk">{L("直接多步", "direct")}</FT>
      <FT x={534} y={134} anchor="start" cls="tn">96 → 7.2%</FT>

      <FBox x={54} y={166} w={230} h={38} label={L("要自己编的输入越多,滚得越快", "the more you invent, the faster it rolls")} tone="bad" />
      <FBox x={296} y={166} w={228} h={38} label={L("锚点插值:6 个模型 ≈ 96 个", "anchors: 6 models ≈ 96")} tone="ok" />
    </FigFrame>
  );
};
