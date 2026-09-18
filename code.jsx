/* =========================================================
   code.jsx — <CodeLab> + the listings for t1–t15
   ---------------------------------------------------------
   Every chapter ships the same job from three angles: a
   runnable Python implementation, the data or configuration
   that actually decides behaviour, and the layer that touches
   the real world (shell, SQL, YAML, a scheduler).
   Sources are ordinary template literals — never write a bare
   dollar-brace or a stray backslash inside one. code2.jsx
   extends CODE for t16–t30.
   ========================================================= */

const KW = {
  py: "def class return if elif else for while in is not and or None True False import from as with try except finally raise lambda yield async await global nonlocal pass break continue assert del self print len range int float str dict list set bool open",
  yaml: "true false null yes no on off",
  json: "true false null",
  sql: "CREATE TABLE PRIMARY KEY NOT NULL UNIQUE INDEX INSERT INTO VALUES SELECT FROM WHERE UPDATE SET DELETE ALTER ADD COLUMN DEFAULT BIGINT VARCHAR INT DATETIME TIMESTAMP DECIMAL GROUP BY ORDER HAVING JOIN LEFT ON AS COUNT SUM AVG MAX MIN CASE WHEN THEN END DESC LIMIT WITH INTERVAL create table primary key not null unique index insert into values select from where group by order having join left on as count sum avg max min case when then end desc limit with interval",
  sh: "if then else fi for do done while case esac function echo export local return sudo curl python pip git set source nohup tmux rsync ssh cron kaggle",
  txt: "",
};
const CODE_RE = {
  py: /(#[^\n]*)|("""[\s\S]*?"""|"(?:[^"\n])*"|'(?:[^'\n])*')|(\b\d[\w.]*)|(@?[A-Za-z_][A-Za-z0-9_]*)/g,
  yaml: /(#[^\n]*)|("(?:[^"\n])*"|'(?:[^'\n])*')|(\b\d[\w.]*)|([A-Za-z_][A-Za-z0-9_.-]*)/g,
  json: /(\/\/[^\n]*)|("(?:[^"\n])*")|(\b\d[\w.]*)|([A-Za-z_][A-Za-z0-9_]*)/g,
  sql: /(--[^\n]*)|('(?:[^'\n])*'|"(?:[^"\n])*")|(\b\d[\w.]*)|([A-Za-z_][A-Za-z0-9_]*)/g,
  sh: /(#[^\n]*)|("(?:[^"\n])*"|'(?:[^'\n])*')|(\b\d[\w.]*)|([A-Za-z_][A-Za-z0-9_]*)/g,
  txt: /(#[^\n]*)|("(?:[^"\n])*")|(\b\d[\w.]*)|([A-Za-z_][A-Za-z0-9_]*)/g,
};
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Small, dependency-free highlighter: comments, strings, numbers, keywords.
function highlight(src, k) {
  const re = CODE_RE[k] || CODE_RE.py;
  const kws = new Set((KW[k] || "").split(/\s+/).filter(Boolean));
  re.lastIndex = 0;
  let out = "", last = 0, m;
  while ((m = re.exec(src)) !== null) {
    out += escHtml(src.slice(last, m.index));
    if (m[1]) out += `<span class="cm">${escHtml(m[1])}</span>`;
    else if (m[2]) out += `<span class="st">${escHtml(m[2])}</span>`;
    else if (m[3]) out += `<span class="nu">${escHtml(m[3])}</span>`;
    else if (m[4]) {
      const w = m[4];
      const isKw = kws.has(w) || (k === "py" && w[0] === "@");
      out += isKw ? `<span class="kw">${escHtml(w)}</span>` : escHtml(w);
    }
    last = m.index + m[0].length;
  }
  out += escHtml(src.slice(last));
  return out;
}

const CodeLab = ({ id }) => {
  const t = useT();
  const lang = useLang();
  const entry = CODE[id];
  const [tab, setTab] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => { setTab(0); }, [id]);
  if (!entry) return null;
  const cur = entry.tabs[Math.min(tab, entry.tabs.length - 1)];
  const copy = () => {
    try {
      navigator.clipboard.writeText(cur.src);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { /* clipboard unavailable */ }
  };
  return (
    <div className="ts-code-lab">
      <div className="cl-head">
        {entry.tabs.map((x, i) => (
          <button key={i} className={`ts-tab ${i === tab ? "on" : ""}`} onClick={() => setTab(i)}>{x.lang}</button>
        ))}
        <span className="cl-file">{cur.file}</span>
        <button className={`cl-copy ${copied ? "done" : ""}`} onClick={copy}>{copied ? t("copied_btn") : t("copy_btn")}</button>
      </div>
      <pre><code dangerouslySetInnerHTML={{ __html: highlight(cur.src, cur.k) }} /></pre>
      {cur.run ? <div className="cl-run">{cur.run}</div> : null}
      {entry.note ? <div className="cl-note">{pick(lang, entry.note)}</div> : null}
    </div>
  );
};

const CODE = {};
const PY = "Python", CFG = "数据与配置 / data", OPS = "训练与部署 / run";

/* ============ SG1 · t1 — the four layers ============ */
CODE.t1 = {
  note: {
    zh: "先把你自己的曲线画出来并拆开。Python 用 STL 把一条真实的 15 分钟负荷分解成趋势、季节与残差,并算出每一层的方差占比;配置是一份点位清单(注意 kind 字段:瞬时量和累积量后面的处理完全不同);部署那一栏是从历史库导出的标准姿势——按点位、按时间分批拉,并把原始口径记录下来。",
    en: "Start by plotting your own curve and taking it apart. The Python decomposes a real fifteen-minute load with STL into trend, seasonal and residual and reports each layer's share of variance. The configuration is a tag list — note the kind field, because instantaneous and cumulative quantities are handled completely differently later. The last tab is the standard way to pull history out of a historian: tag by tag, window by window, recording the original units as you go.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "decompose.py",
      run: "# python decompose.py data/line1.csv  → 四层方差占比",
      src: `"""Take one industrial load curve apart into the four layers of SG1."""
import sys
import numpy as np
import pandas as pd
from statsmodels.tsa.seasonal import STL

SLOTS = 96                      # 15-minute samples in a day


def load(path):
    df = pd.read_csv(path, parse_dates=["ts"]).set_index("ts").sort_index()
    # A missing slot must stay missing. Reindexing on a regular grid makes the
    # gaps visible instead of letting pandas hide them behind uneven spacing.
    full = pd.date_range(df.index[0], df.index[-1], freq="15min")
    return df.reindex(full)["kw"]


def layers(y):
    """trend / daily / weekly / residual, plus each one's share of variance."""
    y = y.interpolate(limit=2)                   # only micro-gaps, see DT2
    day = STL(y.dropna(), period=SLOTS, robust=True).fit()
    week = STL(day.trend, period=SLOTS * 7, robust=True).fit()
    parts = {
        "baseline": week.trend,
        "weekly": week.seasonal,
        "daily": day.seasonal,
        "residual": day.resid,
    }
    var = {k: float(np.var(v.dropna())) for k, v in parts.items()}
    total = sum(var.values()) or 1.0
    return parts, {k: v / total for k, v in var.items()}


def visible_amplitude(event_seconds, event_kw, period_minutes):
    """What survives of a short excursion once averaged over one interval."""
    return event_kw * min(1.0, event_seconds / (period_minutes * 60))


if __name__ == "__main__":
    y = load(sys.argv[1] if len(sys.argv) > 1 else "data/line1.csv")
    parts, share = layers(y)
    for k, v in sorted(share.items(), key=lambda kv: -kv[1]):
        print(f"{k:>9}: {v:6.1%}")
    print(f"peak/mean = {y.max() / y.mean():.2f}")
    for p in (1, 5, 15, 60):
        print(f"a 40 s, +300 kW inrush at {p:>2} min sampling -> "
              f"{visible_amplitude(40, 300, p):6.1f} kW")`,
    },
    {
      lang: CFG, k: "yaml", file: "tags.yaml",
      src: `# One row per tag. Everything downstream reads this file, and the two
# fields that matter most are 'kind' and 'agg' — get them wrong and your
# label was never the physical quantity you thought it was.
site: 中山路注塑车间
timezone: Asia/Shanghai           # store the zone, always. See DT3.
sampling: 15min

tags:
  - id: line1_kw
    desc: 1号线总有功功率
    kind: instantaneous           # kW — a rate
    unit: kW
    agg: mean                     # demand is billed on the interval MEAN
    source: historian
    deadband_pct: 2.0             # what the archive compresses away (DT1)

  - id: line1_kwh
    desc: 1号线累计电量
    kind: cumulative              # kWh — a counter that only goes up
    unit: kWh
    agg: last                     # take the last value, then difference it
    reset_on_overflow: true       # counters wrap; a negative diff is a wrap

  - id: amb_temp
    desc: 厂区环境温度
    kind: instantaneous
    unit: degC
    agg: mean
    exogenous: true
    available_at_inference: forecast   # only the FORECAST exists tomorrow`,
    },
    {
      lang: OPS, k: "sh", file: "export_history.sh",
      run: "$ bash export_history.sh 2024-01-01 2026-12-31",
      src: `#!/usr/bin/env bash
# Pull three years of history out of the plant historian, one tag and one
# month at a time. Large single queries time out and, worse, silently return
# partial results on some systems — which is how a hole gets into your
# training set without anyone noticing.
set -euo pipefail

FROM=$1
TO=$2
OUT=data/raw
mkdir -p $OUT

for tag in $(python -c "
import yaml
print(' '.join(t['id'] for t in yaml.safe_load(open('tags.yaml'))['tags']))
"); do
  cur=$FROM
  while [[ "$cur" < "$TO" ]]; do
    nxt=$(date -d "$cur +1 month" +%Y-%m-%d)
    f=$OUT/$tag-$cur.csv
    if [ -s "$f" ]; then echo "skip $f"; cur=$nxt; continue; fi
    echo "pull $tag $cur -> $nxt"
    python tools/historian_pull.py --tag "$tag" --from "$cur" --to "$nxt" --out "$f"
    # Record what came back. A month that returns far fewer rows than the
    # grid implies is the first thing DT2 will want to look at.
    python - <<'PY' "$f"
import csv, sys
rows = sum(1 for _ in open(sys.argv[1])) - 1
print(f"  {sys.argv[1]}: {rows} rows (expect about 2976 for a 31-day month)")
PY
    cur=$nxt
  done
done`,
    },
  ],
};

/* ============ SG2 · t2 — asymmetric cost ============ */
CODE.t2 = {
  note: {
    zh: "把「这个预测服务哪个决策」写成代码。Python 用代价不对称比求出最优安全裕度,并证明它恰好等于误差分布的 τ = cu/(cu+co) 分位数——这就是后面 ML3 直接训分位数模型的理由;配置是一张决策代价表,它决定你该优化哪个指标;最后一栏用 SQL 从电费账单和工单里把真实的代价参数捞出来,而不是拍脑袋。",
    en: "Write down which decision the forecast serves. The Python derives the optimal safety margin from the cost asymmetry and shows it equals the τ = cu/(cu+co) quantile of the error distribution — which is why ML3 trains a quantile model directly. The configuration is a decision cost table that decides which metric you optimise. The last tab pulls the real cost parameters out of the electricity bill and the work-order log with SQL, rather than guessing them.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "asym_cost.py",
      run: "# python asym_cost.py  → 最优裕度 = 误差分布的 τ 分位数",
      src: `"""The loss function should come from the cost table, not from the tutorial."""
import numpy as np
from scipy.stats import norm


def expected_cost(margin, sigma, cu, co):
    """cu = cost per kW of UNDER-forecasting, co = per kW of OVER-forecasting."""
    z = margin / sigma
    over = margin * norm.cdf(z) + sigma * norm.pdf(z)      # E[(e+m)+]
    under = -margin * norm.cdf(-z) + sigma * norm.pdf(z)   # E[(-(e+m))+]
    return cu * under + co * over


def optimal_margin(sigma, cu, co):
    """Closed form: the cost-minimising forecast is a QUANTILE, not the mean."""
    tau = cu / (cu + co)
    return sigma * norm.ppf(tau), tau


DECISIONS = {
    "declare":  dict(cu=3.0, co=1.0),    # under-declare is penalised
    "demand":   dict(cu=6.0, co=0.8),    # breaking the cap is expensive
    "storage":  dict(cu=1.4, co=1.0),
    "alarm":    dict(cu=12.0, co=0.6),   # a miss is downtime
}

if __name__ == "__main__":
    sigma = 90.0                          # kW, from your own backtest residuals
    for name, c in DECISIONS.items():
        m, tau = optimal_margin(sigma, **c)
        base, best = expected_cost(0, sigma, **c), expected_cost(m, sigma, **c)
        print(f"{name:>8}  tau={tau:.3f}  margin={m:7.1f} kW  "
              f"cost {base:7.1f} -> {best:7.1f}  ({1 - best / base:.1%} cheaper)")
    print()
    print("So: train a quantile model at tau with pinball loss (ML3).")
    print("Do NOT fit MSE and add a constant margin — the constant dies")
    print("the moment sigma moves, and sigma moves every season.")`,
    },
    {
      lang: CFG, k: "yaml", file: "decisions.yaml",
      src: `# Which decision does this forecast serve? Everything else follows.
# The metric column is what EV2 will hold you to; the loss column is what
# ML3 will actually train.
decisions:
  - id: demand_control
    owner: 能源管理岗
    horizon: 24h
    granularity: 15min
    # only ONE window a month is billed, so average error is nearly irrelevant
    metric: monthly_peak_deviation
    secondary_metric: peak_timing_hit_rate
    cost_under_cny_per_kw: 6.0
    cost_over_cny_per_kw: 0.8
    loss: pinball
    tau: 0.882                      # = cu / (cu + co)

  - id: day_ahead_declaration
    owner: 生产调度
    horizon: 24h
    granularity: 1h
    metric: wape
    cost_under_cny_per_kw: 3.0
    cost_over_cny_per_kw: 1.0
    loss: pinball
    tau: 0.75

  - id: anomaly_alert
    owner: 设备部
    horizon: 0
    granularity: 15min
    # not a regression problem at all — see OP3
    metric: miss_rate_at_fixed_false_alarm_rate
    alerts_tolerated_per_shift: 3`,
    },
    {
      lang: OPS, k: "sql", file: "cost_params.sql",
      src: `-- Do not guess the cost parameters. They are written down in two places:
-- the electricity bill, and the work-order log.

-- 1) What a kilowatt of billed demand actually costs, by month.
SELECT
    bill_month,
    demand_charge_cny / NULLIF(billed_demand_kw, 0) AS cny_per_kw,
    billed_demand_kw,
    energy_charge_cny,
    demand_charge_cny / NULLIF(energy_charge_cny + demand_charge_cny, 0)
        AS demand_share
FROM electricity_bill
WHERE site_id = 'ZSL-01'
ORDER BY bill_month DESC
LIMIT 24;

-- 2) What one unnecessary shave costs: the production deferred by a
--    load-shedding action that turned out not to be needed.
SELECT
    w.reason,
    COUNT(*)                                   AS events,
    AVG(w.minutes_deferred)                    AS avg_minutes,
    AVG(w.minutes_deferred) * l.margin_cny_per_min
                                               AS avg_cost_cny
FROM work_order w
JOIN line_economics l ON l.line_id = w.line_id
WHERE w.reason IN ('demand_shed', 'peak_avoidance')
  AND w.created_at >= NOW() - INTERVAL 12 MONTH
GROUP BY w.reason, l.margin_cny_per_min;

-- 3) The window that actually set each month's bill. Look at these dates:
--    they are the only fifteen minutes your model is paid to get right.
SELECT bill_month, peak_ts, peak_kw
FROM (
    SELECT DATE_FORMAT(ts, '%Y-%m')                                  AS bill_month,
           ts                                                        AS peak_ts,
           kw                                                        AS peak_kw,
           ROW_NUMBER() OVER (PARTITION BY DATE_FORMAT(ts, '%Y-%m')
                              ORDER BY kw DESC)                      AS rn
    FROM meter_15min
    WHERE tag_id = 'line1_kw'
) t
WHERE rn = 1
ORDER BY bill_month DESC;`,
    },
  ],
};

/* ============ SG3 · t3 — baselines ============ */
CODE.t3 = {
  note: {
    zh: "五十行代码,整本书性价比最高的一段。Python 实现四条不需要训练的基线和 MASE,并在同一份数据上给出排名——这就是你后面所有模型的参照系;配置把及格线和评估窗口固定下来,让每次实验都对着同一条线;最后一栏把基线做成一个每天自动跑的对照组,因为基线本身会随数据分布变化,你三个月前领先的两个点可能早就没了。",
    en: "Fifty lines, and the highest-return code in the book. The Python implements four training-free baselines and MASE and ranks them on the same data — your reference frame for every later model. The configuration pins the pass mark and the evaluation window so every experiment is measured against the same line. The last tab turns the baseline into a control group that runs daily, because the baseline itself moves with the data, and the two points of margin you had three months ago may be long gone.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "baselines.py",
      run: "# python baselines.py data/line1.csv  → 你的及格线",
      src: `"""Four baselines that need no training, and the bar they set."""
import numpy as np
import pandas as pd

SLOTS = 96


def baselines(y: pd.Series, horizon_slots: int = SLOTS):
    """Every one of these respects the lead time: nothing here uses a value
    that would not exist when the forecast is published."""
    return {
        "yesterday_same_slot": y.shift(SLOTS),
        "last_week_same_slot": y.shift(SLOTS * 7),
        "median_4w_same_slot": pd.concat(
            [y.shift(SLOTS * 7 * k) for k in (1, 2, 3, 4)], axis=1
        ).median(axis=1),
        "mean_4d_same_slot": pd.concat(
            [y.shift(SLOTS * k) for k in (1, 2, 3, 4)], axis=1
        ).mean(axis=1),
    }


def wape(y, p):
    m = y.notna() & p.notna()
    return float(np.abs(y[m] - p[m]).sum() / np.abs(y[m]).sum())


def mape(y, p):
    m = y.notna() & p.notna() & (y.abs() > 1e-9)
    return float((np.abs((y[m] - p[m]) / y[m])).mean())


def mase(y, p, season=SLOTS):
    """Error divided by the seasonal-naive error. Below 1 or it is worthless."""
    m = y.notna() & p.notna()
    num = np.abs(y[m] - p[m]).mean()
    den = np.abs(y - y.shift(season)).dropna().mean()
    return float(num / den)


def score(y, test_days=14):
    cut = y.index[-1] - pd.Timedelta(days=test_days)
    rows = []
    for name, p in baselines(y).items():
        yt, pt = y[y.index > cut], p[p.index > cut]
        rows.append((name, wape(yt, pt), mape(yt, pt), mase(yt, pt)))
    rows.sort(key=lambda r: r[1])
    return pd.DataFrame(rows, columns=["baseline", "wape", "mape", "mase"])


if __name__ == "__main__":
    import sys
    y = (pd.read_csv(sys.argv[1], parse_dates=["ts"])
           .set_index("ts").sort_index()["kw"])
    table = score(y)
    print(table.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
    best = table.iloc[0]
    print()
    print(f"Your bar: WAPE {best.wape:.1%} from '{best.baseline}' — no training,")
    print("no features, no GPU. Any model that cannot clear this does not ship.")`,
    },
    {
      lang: CFG, k: "yaml", file: "evaluation.yaml",
      src: `# Pin the evaluation once, so every experiment is measured on the same line.
# Changing any of this invalidates every score recorded before the change,
# which is why it lives in version control and not in a notebook cell.
evaluation:
  target: line1_kw
  horizon_slots: 96             # publish 24 h ahead
  gap_slots: 96                 # = horizon. See DT4: anything less leaks.
  test_days: 14
  train_window: expanding       # or: fixed_days: 35  (see EV1 under drift)

  folds: 8                      # rolling origin — never a single split
  fold_step_days: 3
  eval_window_days: 3

  primary_metric: wape          # immune to the zero-load hours MAPE explodes on
  report_also: [mape, mase, monthly_peak_deviation, peak_timing_hit_rate]

baseline:
  # the control group, recomputed every day alongside the model
  method: median_4w_same_slot
  # a model ships only if it beats this by more than the between-fold spread
  min_improvement_pt: 1.0
  alert_if_model_worse_for_days: 3`,
    },
    {
      lang: OPS, k: "sh", file: "daily_baseline.sh",
      run: "# crontab: 10 7 * * *  bash daily_baseline.sh",
      src: `#!/usr/bin/env bash
# The baseline is not a one-off number you compute in week one. It is a
# control group that runs every day for as long as the model does, because
# the baseline moves as the data moves — and the day your model stops
# beating it is the day you need to know about, not three months later.
set -euo pipefail

DAY=$(date -d yesterday +%Y-%m-%d)
python tools/score_day.py --day "$DAY" --source baseline --out runs/baseline.jsonl
python tools/score_day.py --day "$DAY" --source model    --out runs/model.jsonl

python - <<'PY'
import json, pathlib, statistics

def tail(p, n=14):
    rows = [json.loads(l) for l in pathlib.Path(p).read_text().splitlines()[-n:]]
    return [r["wape"] for r in rows]

base, model = tail("runs/baseline.jsonl"), tail("runs/model.jsonl")
lead = [b - m for b, m in zip(base, model)]
won = sum(1 for d in lead if d > 0)

print(f"last {len(lead)} days: model beat the baseline on {won}")
print(f"  baseline  {statistics.mean(base):.2%}")
print(f"  model     {statistics.mean(model):.2%}")
print(f"  lead      {statistics.mean(lead):+.2%} pt")

# Three consecutive losses is a drift signal, not a bad week. OP2 picks it up.
if all(d <= 0 for d in lead[-3:]):
    raise SystemExit("ALERT: the model has trailed the baseline for 3 days")
PY`,
    },
  ],
};

/* ============ DT1 · t4 — the acquisition chain ============ */
CODE.t4 = {
  note: {
    zh: "在信任一列数之前,先证明它是你以为的那个量。Python 把 1 分钟原始数据按四种口径聚合到 15 分钟并比较峰值与电量,让「均值 / 末值 / 最大」的差别变成具体数字;配置记录每个点位在链路上的真实口径;最后一栏用 SQL 做三项体检:采样间隔分布、重复时标、以及那些值得怀疑的零。",
    en: "Before trusting a column, prove it is the quantity you think. The Python aggregates raw one-minute data to fifteen minutes under four rules and compares peaks and energy, turning mean-versus-last-versus-max into concrete numbers. The configuration records each tag's real handling along the chain. The last tab runs three health checks in SQL: the distribution of sampling intervals, duplicate timestamps, and the zeros that deserve suspicion.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "aggregation_audit.py",
      run: "# python aggregation_audit.py raw_1min.csv  → 四种口径的差别",
      src: `"""Which aggregation you used decides what your label means."""
import pandas as pd
import numpy as np


def resample_all(raw: pd.Series, rule: str = "15min") -> pd.DataFrame:
    g = raw.resample(rule)
    return pd.DataFrame({
        "mean": g.mean(),     # what demand is billed on
        "last": g.last(),     # what a point-sampling gateway sends
        "max": g.max(),       # what equipment protection cares about
        "count": g.count(),   # how many raw samples backed each value
    })


def deadband(raw: pd.Series, pct: float, scan_min: int) -> pd.Series:
    """Reproduce what the historian kept: a sample is written only at the scan
    tick, and only if it moved more than the deadband. Everything between two
    writes is reconstructed by interpolation — so a short excursion vanishes."""
    band = pct / 100 * float(raw.max())
    kept, last = {}, raw.iloc[0]
    kept[raw.index[0]] = last
    for ts, v in raw.items():
        if ts.minute % scan_min:
            continue
        if abs(v - last) >= band:
            kept[ts] = v
            last = v
    s = pd.Series(kept).reindex(raw.index).interpolate()
    return s


if __name__ == "__main__":
    import sys
    raw = (pd.read_csv(sys.argv[1], parse_dates=["ts"])
             .set_index("ts").sort_index()["kw"])
    agg = resample_all(raw)
    print(agg.describe().loc[["mean", "max"]].to_string())
    print()
    print(f"peak on interval mean : {agg['mean'].max():8.1f} kW  <- billed")
    print(f"peak on last value    : {agg['last'].max():8.1f} kW")
    print(f"peak on interval max  : {agg['max'].max():8.1f} kW")

    stored = deadband(raw, pct=2.0, scan_min=5)
    print()
    print(f"instantaneous peak, raw      : {raw.max():8.1f} kW")
    print(f"instantaneous peak, archived : {stored.max():8.1f} kW")
    print(f"total energy error           : "
          f"{(stored.mean() - raw.mean()) / raw.mean():8.3%}")
    print("Near-lossless on energy, and it ate the peak. That is the trade the")
    print("historian made years ago, and nobody told the forecasting team.")`,
    },
    {
      lang: CFG, k: "yaml", file: "chain.yaml",
      src: `# What actually happens to each tag between the sensor and your CSV.
# Fill this in by ASKING, not by assuming. Every line here has been wrong
# at least once in a real project.
line1_kw:
  sensor:
    device: 多功能电表 PMC-53
    native_period: 1s
    reports: instantaneous_power
  plc:
    scan_period: 100ms
    # the PLC downsamples before the historian ever sees it
    to_historian: 5s average
  historian:
    product: PI / openTSDB / InfluxDB
    compression: swinging_door
    deadband_pct: 2.0
    scan_period: 5min
    # THIS is where short inrushes disappear. See DT1.
    known_effect: "excursions shorter than the scan gap are interpolated away"
  platform:
    resample_to: 15min
    agg: mean                  # must match the billing basis
    timezone_stored: local_naive    # <- no zone marker. See DT3.
  export:
    format: csv
    columns: [ts, kw, quality]
    quality_codes:
      0: good
      1: substituted            # someone back-filled it. Treat as bad.
      2: bad
      8: manual_entry           # treat as bad`,
    },
    {
      lang: OPS, k: "sql", file: "chain_health.sql",
      src: `-- Three checks to run on every new tag before it enters a training set.

-- 1) Is the grid actually regular? A tag that claims 15-minute sampling and
--    shows a fat tail of other intervals has been resampled somewhere.
SELECT gap_minutes, COUNT(*) AS n
FROM (
    SELECT TIMESTAMPDIFF(MINUTE, LAG(ts) OVER (ORDER BY ts), ts) AS gap_minutes
    FROM meter_15min
    WHERE tag_id = 'line1_kw'
) g
WHERE gap_minutes IS NOT NULL
GROUP BY gap_minutes
ORDER BY n DESC
LIMIT 10;

-- 2) Duplicate timestamps. One extra row per year is the daylight-saving
--    fall-back; a steady stream of them means two sources are being merged.
SELECT ts, COUNT(*) AS n
FROM meter_15min
WHERE tag_id = 'line1_kw'
GROUP BY ts
HAVING n > 1
ORDER BY ts DESC
LIMIT 20;

-- 3) The zeros. Split them by whether a shutdown was scheduled and whether
--    the neighbouring tags went quiet at the same moment. A zero with live
--    neighbours is a comms fault; a zero with quiet neighbours is a real
--    shutdown; a zero flagged 'substituted' is somebody's back-fill.
SELECT
    DATE(m.ts)                                          AS day,
    SUM(m.kw = 0)                                       AS zero_slots,
    SUM(m.kw = 0 AND s.shutdown_id IS NOT NULL)         AS zeros_with_shutdown,
    SUM(m.kw = 0 AND n.kw > 0)                          AS zeros_with_live_neighbour,
    SUM(m.quality <> 0)                                 AS flagged_slots
FROM meter_15min m
LEFT JOIN shutdown_log s
       ON m.ts BETWEEN s.start_ts AND s.end_ts AND s.line_id = 'line1'
LEFT JOIN meter_15min n
       ON n.ts = m.ts AND n.tag_id = 'line2_kw'
WHERE m.tag_id = 'line1_kw'
  AND m.ts >= NOW() - INTERVAL 90 DAY
GROUP BY DATE(m.ts)
HAVING zero_slots > 0
ORDER BY day DESC;`,
    },
  ],
};

/* ============ DT2 · t5 — classify before you fill ============ */
CODE.t5 = {
  note: {
    zh: "这一章的主张是顺序:先诊断、再分类、最后才决定动作。Python 实现的正是那张分类表——通信中断插值、计划停机保留并标记、仪表卡死标记为坏、真实为零不动,并把 is_bad / is_shutdown 作为布尔特征交给模型;配置是四类缺陷的判定规则;最后一栏把这套体检做成每日数据质量报告,因为缺陷是持续产生的,不是一次性清理掉的。",
    en: "This chapter's claim is about order: diagnose, classify, and only then act. The Python implements exactly that table — interpolate a comms dropout, keep and flag a planned shutdown, mark a stuck sensor bad, leave a genuine zero alone — and hands is_bad and is_shutdown to the model as boolean features. The configuration holds the rules that decide which class a gap belongs to. The last tab turns the whole thing into a daily data-quality report, because defects keep arriving rather than being cleaned once.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "classify_gaps.py",
      run: "# python classify_gaps.py  → 四类缺陷,四种相反的动作",
      src: `"""Classify first. The filling method is the LAST decision, not the first."""
import numpy as np
import pandas as pd

SLOTS = 96


def classify(y: pd.Series, shutdowns: pd.DataFrame, neighbour: pd.Series,
             stuck_slots: int = 8) -> pd.Series:
    """Return a label per timestamp: good / comms / shutdown / stuck / zero."""
    kind = pd.Series("good", index=y.index)

    # 1) planned shutdown — the maintenance calendar says so. The recorded
    #    standby level IS the truth; smoothing it away destroys your only
    #    examples of what a shutdown looks like.
    for _, s in shutdowns.iterrows():
        kind.loc[s.start_ts:s.end_ts] = "shutdown"

    # 2) stuck sensor — the same value repeated far longer than the process
    #    ever holds still. Present, and entirely wrong.
    same = y.groupby((y != y.shift()).cumsum()).transform("size")
    kind[(same >= stuck_slots) & (kind == "good") & y.notna()] = "stuck"

    # 3) comms dropout — nothing recorded here while the neighbour kept
    #    reporting, so the process was running and the record was lost.
    kind[y.isna() & neighbour.notna() & (kind == "good")] = "comms"

    # 4) genuine zero — the machine was simply off, and that is a valid sample
    kind[(y == 0) & (kind == "good")] = "zero"
    return kind


def treat(y: pd.Series, kind: pd.Series):
    """Each class gets the treatment it deserves — and the model is TOLD."""
    out = y.copy()
    # short gaps while the process ran: the curve is smooth there, interpolate
    out[kind == "comms"] = np.nan
    out = out.interpolate(limit=4)
    # a stuck reading is worse than a missing one: remove it, do not smooth it
    out[kind == "stuck"] = np.nan
    # shutdowns and genuine zeros are kept exactly as recorded
    feats = pd.DataFrame({
        "kw": out,
        "is_bad": kind.isin(["stuck", "comms"]).astype("int8"),
        "is_shutdown": (kind == "shutdown").astype("int8"),
    })
    return feats


if __name__ == "__main__":
    idx = pd.date_range("2026-03-01", periods=SLOTS * 21, freq="15min")
    rng = np.random.default_rng(5)
    y = pd.Series(900 + 420 * (idx.hour.isin(range(8, 23))) + rng.normal(0, 40, len(idx)),
                  index=idx, dtype="float64")
    y.iloc[SLOTS * 11 + 28: SLOTS * 11 + 60] = 430.0        # a planned shutdown
    y.iloc[SLOTS * 7 + 40: SLOTS * 7 + 64] = y.iloc[SLOTS * 7 + 39]   # stuck
    y.iloc[SLOTS * 3 + 12: SLOTS * 3 + 14] = np.nan         # comms
    shut = pd.DataFrame({"start_ts": [idx[SLOTS * 11 + 28]],
                         "end_ts": [idx[SLOTS * 11 + 59]]})
    kind = classify(y, shut, neighbour=pd.Series(1.0, index=idx))
    print(kind.value_counts().to_string())
    feats = treat(y, kind)
    print()
    print("Trees handle missing values natively. The is_bad and is_shutdown")
    print("columns are what let the model learn what a shutdown looks like —")
    print("which interpolating it away would have destroyed.")`,
    },
    {
      lang: CFG, k: "yaml", file: "quality_rules.yaml",
      src: `# The rules that decide which class a suspect point belongs to. They are
# deliberately explicit: an automatic cleaner that cannot name the class it
# is treating will eventually treat a shutdown as a dropout.
classes:
  comms:
    detect: value_is_null AND neighbour_tag_reporting
    max_run_slots: 4              # longer than an hour is not a dropout
    action: interpolate
    flag: is_bad

  shutdown:
    detect: shutdown_log_match OR (below_standby_pct AND planned_calendar)
    below_standby_pct: 25
    action: keep                  # the recorded value IS the truth
    flag: is_shutdown
    # keep at least this many historical shutdowns or the model has no
    # examples to learn the level from
    min_examples_required: 6

  stuck:
    detect: identical_value_for_slots
    identical_value_for_slots: 8
    action: drop                  # present and wrong is worse than absent
    flag: is_bad

  zero:
    detect: value_is_zero AND NOT shutdown_log_match AND neighbour_quiet
    action: keep
    flag: none

report:
  fail_build_if_bad_pct_over: 8.0
  warn_if_shutdown_examples_under: 6`,
    },
    {
      lang: OPS, k: "sh", file: "quality_report.sh",
      run: "# crontab: 30 6 * * *  bash quality_report.sh",
      src: `#!/usr/bin/env bash
# Data quality is not a one-off clean-up. Defects keep arriving: a gateway
# reboots, a transmitter drifts, someone back-fills a week by hand. Run this
# every morning and let it refuse to build a training set it does not trust.
set -euo pipefail

python tools/classify_gaps.py --days 90 --out reports/quality.json

python - <<'PY'
import json, sys, yaml

q = json.load(open("reports/quality.json"))
rules = yaml.safe_load(open("quality_rules.yaml"))["report"]

bad_pct = 100 * (q["comms"] + q["stuck"]) / q["total"]
print(f"total slots      : {q['total']}")
for k in ("good", "comms", "shutdown", "stuck", "zero"):
    print(f"  {k:<9}: {q[k]:>7}  ({100 * q[k] / q['total']:5.2f}%)")
print(f"suspect          : {bad_pct:.2f}%")
print(f"shutdown examples: {q['shutdown_events']}")

if bad_pct > rules["fail_build_if_bad_pct_over"]:
    sys.exit(f"REFUSING to build: {bad_pct:.1f}% suspect slots")
if q["shutdown_events"] < rules["warn_if_shutdown_examples_under"]:
    print("WARNING: too few shutdown examples — the model cannot learn the")
    print("standby level, so a scheduled maintenance day will be mispredicted")
PY

echo "quality gate passed; building features"
python tools/build_features.py --out data/features.parquet`,
    },
  ],
};

/* ============ DT3 · t6 — resampling and alignment ============ */
CODE.t6 = {
  note: {
    zh: "三件看起来琐碎、实际能单独毁掉项目的事:聚合口径、时区与夏令时、以及外部变量按「预测时可获得」对齐。Python 里那个 as_of 连接是本章的核心——它保证你训练时用的气温,正是上线那天你会有的那个版本(预报,不是实测);配置写死时区与预报版本策略;最后一栏是夏令时那两天的专项检查。",
    en: "Three apparently trivial things, each able to sink a project alone: the aggregation rule, time zones and daylight saving, and aligning external drivers on what was available at prediction time. The as-of join in the Python is the heart of the chapter: it guarantees the temperature used in training is the version you will actually have on go-live day — a forecast, not a measurement. The configuration pins the zone and the forecast-version policy, and the last tab is a dedicated check on the two days daylight saving breaks.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "align.py",
      run: "# python align.py  → 离线成绩 vs 上线成绩的差额",
      src: `"""Align exogenous drivers on what EXISTED when the forecast was published."""
import pandas as pd

SLOTS, PUBLISH_HOUR = 96, 7


def as_of_forecast(weather: pd.DataFrame, target_index: pd.DatetimeIndex,
                   publish_hour: int = PUBLISH_HOUR) -> pd.Series:
    """weather has columns [issued_at, valid_at, temp_c] — many forecast runs,
    each issued at a different time. For a target slot, use the newest run
    that was already issued when we published, never a later correction."""
    rows = []
    for ts in target_index:
        publish = (ts.normalize() - pd.Timedelta(days=1)).replace(hour=publish_hour)
        avail = weather[(weather.valid_at == ts) & (weather.issued_at <= publish)]
        rows.append(avail.sort_values("issued_at").temp_c.iloc[-1]
                    if len(avail) else float("nan"))
    return pd.Series(rows, index=target_index, name="temp_fc")


def thermal_lag(temp: pd.Series, hours: float = 2.0) -> pd.DataFrame:
    """A building responds to temperature with inertia, so the feature is not
    the current reading but a lagged and smoothed one."""
    k = int(hours * 4)
    return pd.DataFrame({
        "cdd": (temp - 24).clip(lower=0) ** 1.25,
        "cdd_lag": ((temp.shift(k) - 24).clip(lower=0)) ** 1.25,
        "cdd_roll6h": (temp - 24).clip(lower=0).rolling(24).mean(),
    })


def to_utc(df: pd.DataFrame, col: str, zone: str = "Asia/Shanghai"):
    """Store UTC internally. Local naive timestamps are how two systems end up
    an hour apart without anyone noticing."""
    s = pd.to_datetime(df[col])
    if s.dt.tz is None:
        # ambiguous=True picks the FIRST occurrence on a fall-back day; on a
        # spring-forward day the missing hour must be dropped, not shifted
        s = s.dt.tz_localize(zone, ambiguous=True, nonexistent="NaT")
    return s.dt.tz_convert("UTC")


if __name__ == "__main__":
    print("Rule: whatever you join, join the version that existed at publish")
    print("time. Training on measured temperature while serving on forecast")
    print("temperature understates your error by about a point — and that gap")
    print("appears in no offline report, only on go-live day.")`,
    },
    {
      lang: CFG, k: "yaml", file: "alignment.yaml",
      src: `time:
  storage_timezone: UTC
  display_timezone: Asia/Shanghai
  # the two days a year that break naive code
  dst_policy:
    ambiguous: first          # fall-back: keep the first occurrence
    nonexistent: drop         # spring-forward: the hour does not exist

resample:
  target_rule: 15min
  # the aggregation must match what the TARGET means, not what is convenient
  line1_kw: mean             # billed on the interval mean
  line1_kwh: last_then_diff  # a counter: take last, then difference
  peak_protect_kw: max       # protection cares about the excursion
  amb_temp: mean

exogenous:
  amb_temp:
    source: weather_api
    # THE rule of this chapter
    use_version: forecast_as_of_publish
    publish_hour: 7
    fallback_if_missing: climatology_same_slot
    transform: [cdd, cdd_lag_2h, cdd_roll_6h]
  production_plan:
    source: mes
    use_version: as_of_publish
    known_issue: "often finalised the night before and revised next morning"`,
    },
    {
      lang: OPS, k: "sh", file: "dst_check.sh",
      run: "$ bash dst_check.sh 2024 2026",
      src: `#!/usr/bin/env bash
# Two days a year, most time-series code is quietly wrong: one day is an hour
# short and one is an hour long. Nothing errors — you just get a duplicate
# index or a hole, and a model that mispredicts two days every year forever.
set -euo pipefail

python - <<'PY' "$1" "$2"
import sys
import pandas as pd

start, end = f"{sys.argv[1]}-01-01", f"{sys.argv[2]}-12-31"
for zone in ("Asia/Shanghai", "Europe/Berlin", "America/New_York"):
    idx = pd.date_range(start, end, freq="15min", tz="UTC").tz_convert(zone)
    local = idx.tz_localize(None)
    dups = local[local.duplicated()]
    by_day = pd.Series(1, index=idx).resample("1D").sum()
    odd = by_day[by_day != 96]
    print(f"{zone}: {len(dups)} duplicated local stamps, "
          f"{len(odd)} days that are not 96 slots")
    for day, n in odd.items():
        print(f"    {day.date()}  {int(n)} slots")
PY

echo
echo "If your plant is in a zone with daylight saving and your loader does not"
echo "print zero unexpected days here, fix the loader before training anything."`,
    },
  ],
};

/* ============ DT4 · t7 — leakage ============ */
CODE.t7 = {
  note: {
    zh: "全书最贵的一课,也是最容易自动化检查的一课。Python 是一份可直接接进 CI 的泄漏检查清单:滞后下界、滚动窗口右开、按折内计算的归一化与目标编码、折间 gap;配置把提前量和 gap 绑在一起,让它们不可能被改得不一致;最后一栏把清单跑成一个会让构建失败的门禁——泄漏必须在上线前被拦下,而不是上线后被发现。",
    en: "The book's most expensive lesson, and the easiest to check automatically. The Python is a leakage checklist you can wire straight into CI: the lag floor, half-open rolling windows, scaling and target encoding computed inside the fold, and the inter-fold gap. The configuration ties the lead time and the gap together so they cannot drift apart. The last tab runs the checklist as a gate that fails the build — leakage has to be stopped before go-live, not discovered after.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "leak_checks.py",
      run: "# python -m pytest leak_checks.py  → 4 passed",
      src: `"""A leakage checklist. Wire it into CI; it costs seconds and saves months."""
import numpy as np
import pandas as pd

SLOTS = 96


def check_lag_floor(feature_names, horizon_slots):
    """The smallest usable lag equals the forecast lead time."""
    bad = []
    for name in feature_names:
        if name.startswith("lag_"):
            if int(name.split("_")[1]) < horizon_slots:
                bad.append(name)
        if name.startswith("roll_") and "_shift" not in name:
            bad.append(name + " (rolling window must be explicitly shifted)")
    assert not bad, f"features unavailable at inference: {bad}"


def check_rolling_is_half_open(y: pd.Series, window: int, horizon: int):
    """A rolling feature that includes the current point computes the feature
    from the answer. It must be shifted by at least the horizon."""
    good = y.rolling(window).mean().shift(horizon)
    bad = y.rolling(window).mean()
    assert good.corr(y) < bad.corr(y), "the shifted window must correlate less"
    assert good.iloc[:horizon + window].isna().all(), "leading rows must be NaN"


def check_scaling_is_fold_local(fit_stats, fold_stats):
    """Scaling statistics computed over the whole dataset leak the test set."""
    assert not np.allclose(fit_stats["mean"], fold_stats["mean"]), (
        "training mean equals whole-dataset mean — you scaled before splitting")


def check_gap(train_idx, valid_idx, horizon_slots):
    """Validation must start at least one lead time after training ends."""
    gap = (valid_idx.min() - train_idx.max()) / np.timedelta64(15, "m")
    assert gap >= horizon_slots, (
        f"only {gap:.0f} slots between train and valid, need {horizon_slots}")


def test_all():
    idx = pd.date_range("2026-01-01", periods=SLOTS * 40, freq="15min")
    rng = np.random.default_rng(1)
    y = pd.Series(np.sin(np.arange(len(idx)) * 2 * np.pi / SLOTS) * 300 + 1200
                  + rng.normal(0, 40, len(idx)), index=idx)
    check_lag_floor(["lag_96", "lag_672", "roll_8_shift96"], horizon_slots=96)
    check_rolling_is_half_open(y, window=8, horizon=96)
    cut = int(len(y) * 0.75)
    check_scaling_is_fold_local({"mean": y.iloc[:cut].mean()}, {"mean": y.mean()})
    check_gap(idx[:cut - 96], idx[cut:], horizon_slots=96)
    print("4 checks passed")


if __name__ == "__main__":
    test_all()`,
    },
    {
      lang: CFG, k: "json", file: "split.json",
      src: `{
  "_comment": "Lead time and gap live in ONE file so they cannot drift apart. Changing horizon_slots without changing gap_slots is the single most common way a project starts leaking again after a refactor.",

  "horizon_slots": 96,
  "gap_slots": 96,

  "split": {
    "mode": "rolling_origin",
    "folds": 8,
    "step_days": 3,
    "eval_window_days": 3,
    "shuffle": false,
    "_shuffle_note": "never true on a time series; see DT4"
  },

  "features": {
    "allowed_lags": [96, 100, 104, 192, 288, 672],
    "forbidden_lags": [1, 2, 4, 8, 16, 32, 48],
    "rolling": [
      {"window": 8, "shift": 96, "stats": ["mean", "std", "max"]},
      {"window": 96, "shift": 96, "stats": ["mean"]}
    ],
    "scaling": "fit_on_train_fold_only",
    "target_encoding": "fit_on_train_fold_only"
  },

  "ci_gate": {
    "run": "python leak_checks.py",
    "fail_build_on_error": true
  }
}`,
    },
    {
      lang: OPS, k: "sh", file: "ci_gate.sh",
      run: "# .github/workflows/ci.yml → bash ci_gate.sh",
      src: `#!/usr/bin/env bash
# The gate. It runs in seconds and it is the cheapest insurance in the project:
# every one of these checks corresponds to a way somebody has already shipped a
# model that scored 5% offline and 12% online.
set -euo pipefail

echo "[1/4] leakage checklist"
python leak_checks.py

echo "[2/4] the same model, both splits — the gap must be explainable"
python tools/compare_splits.py --config split.json --out reports/splits.json
python - <<'PY'
import json, sys
r = json.load(open("reports/splits.json"))
gap = r["shuffled_wape"] - r["time_ordered_wape"]
print(f"  shuffled     {r['shuffled_wape']:.4f}")
print(f"  time-ordered {r['time_ordered_wape']:.4f}")
print(f"  difference   {gap:+.4f}")
if abs(gap) > 0.02:
    sys.exit("the two splits disagree by more than 2 points — find the leak "
             "before trusting either number")
PY

echo "[3/4] feature availability at inference"
python tools/check_availability.py --config split.json

echo "[4/4] the model must still beat the current baseline"
python tools/score_day.py --compare-baseline --min-improvement-pt 1.0

echo "gate passed"`,
    },
  ],
};

/* ============ FE1 · t8 — lags, rollings, calendar ============ */
CODE.t8 = {
  note: {
    zh: "让树模型看见时间的唯一办法,是把时间结构显式写进特征。Python 是一个完整的特征构造器,注意每一个滚动统计都带 shift(horizon):这不是风格问题,而是 DT4 的硬约束;配置把滞后集合与日历(含中国调休)写死;最后一栏用 ACF/PACF 给滞后选择一个依据,而不是拍脑袋。",
    en: "The only way to make a tree see time is to write the temporal structure into the features. The Python is a complete feature builder, and note that every rolling statistic carries shift(horizon) — not a style preference but DT4's hard constraint. The configuration pins the lag set and the calendar, including China's shifted-holiday working days. The last tab gives lag selection an evidential basis through ACF and PACF instead of a guess.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "features.py",
      run: "# python features.py  → (rows, 41) 特征矩阵",
      src: `"""Lags, rollings and calendar — everything shifted by the lead time."""
import numpy as np
import pandas as pd

SLOTS = 96


def build(df: pd.DataFrame, horizon: int = SLOTS, holidays=frozenset(),
          workdays=frozenset()) -> pd.DataFrame:
    """df needs a 15-minute DatetimeIndex and columns kw, temp_fc, is_shutdown."""
    y, out = df["kw"], pd.DataFrame(index=df.index)

    # 1) lags — nothing below the horizon may appear here
    for lag in (horizon, horizon + 4, horizon + 8, 2 * SLOTS, 7 * SLOTS, 14 * SLOTS):
        out[f"lag_{lag}"] = y.shift(lag)

    # 2) rolling statistics, half-open on the right by construction: compute
    #    the window, then push the whole thing back by the lead time
    for win in (8, 32, SLOTS):
        r = y.rolling(win, min_periods=max(2, win // 2))
        out[f"roll_{win}_mean_shift{horizon}"] = r.mean().shift(horizon)
        out[f"roll_{win}_std_shift{horizon}"] = r.std().shift(horizon)
    out[f"roll_{SLOTS}_max_shift{horizon}"] = y.rolling(SLOTS).max().shift(horizon)

    # 3) calendar — cyclical quantities as sine and cosine, so 23:45 and 00:00
    #    are neighbours rather than opposite ends of a number line
    slot = out.index.hour * 4 + out.index.minute // 15
    for k in (1, 2, 3):
        out[f"slot_sin{k}"] = np.sin(2 * np.pi * k * slot / SLOTS)
        out[f"slot_cos{k}"] = np.cos(2 * np.pi * k * slot / SLOTS)
    dow = out.index.dayofweek
    out["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    out["dow_cos"] = np.cos(2 * np.pi * dow / 7)

    # 4) the real calendar. Weekday alone is wrong in China: a statutory
    #    holiday can fall on a Wednesday and a Sunday can be a working day.
    d = out.index.normalize()
    out["is_holiday"] = d.isin(holidays).astype("int8")
    out["is_makeup_workday"] = d.isin(workdays).astype("int8")
    out["is_working"] = ((dow < 5) & ~d.isin(holidays) | d.isin(workdays)).astype("int8")

    # 5) exogenous, already aligned on the publish-time version by DT3
    out["cdd"] = (df["temp_fc"] - 24).clip(lower=0) ** 1.25
    out["cdd_lag2h"] = out["cdd"].shift(8)
    out["is_shutdown"] = df["is_shutdown"].astype("int8")
    return out


if __name__ == "__main__":
    idx = pd.date_range("2026-01-01", periods=SLOTS * 60, freq="15min")
    rng = np.random.default_rng(3)
    df = pd.DataFrame({
        "kw": 900 + 420 * idx.hour.isin(range(8, 23)) + rng.normal(0, 40, len(idx)),
        "temp_fc": 26 + 6 * np.sin(np.arange(len(idx)) * 2 * np.pi / SLOTS),
        "is_shutdown": 0,
    }, index=idx)
    X = build(df)
    print(X.shape)
    print([c for c in X.columns if c.startswith("lag_")])
    assert X.filter(like="lag_1 ").empty, "lag_1 must never appear at horizon 96"`,
    },
    {
      lang: CFG, k: "yaml", file: "feature_spec.yaml",
      src: `horizon_slots: 96             # everything below derives from this

lags:
  # each one justified by the correlogram, not by habit — see the last tab
  - 96      # yesterday, same slot          r = 0.86
  - 100     # yesterday, 15 min later       smooths slot-boundary noise
  - 192     # two days back                 r = 0.70
  - 672     # last week, same slot          r = 0.75
  - 1344    # two weeks back                stabilises the weekly pattern

rolling:
  windows: [8, 32, 96]
  stats: [mean, std]
  extra: {window: 96, stat: max}
  shift: 96                   # MUST equal horizon_slots

calendar:
  cyclical_harmonics: 3       # sin/cos at 1x, 2x, 3x the daily frequency
  # weekday is not enough in China: load a real calendar table
  holiday_file: calendar/cn_holidays_2024_2027.csv
  makeup_workday_file: calendar/cn_makeup_workdays.csv
  shift_calendar_file: calendar/plant_shifts.csv

exogenous:
  - {name: cdd, from: temp_fc, transform: "max(0, t-24)^1.25"}
  - {name: cdd_lag2h, from: cdd, lag_slots: 8}
  - {name: is_shutdown, from: quality_rules, kind: boolean}`,
    },
    {
      lang: OPS, k: "py", file: "choose_lags.py",
      run: "# python choose_lags.py data/line1.csv  → 建议的滞后集合",
      src: `"""Pick the lag set from the correlogram, then cut it by the lead time."""
import sys
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import acf, pacf

SLOTS = 96


def suggest(y: pd.Series, horizon: int = SLOTS, max_lag: int = SLOTS * 8,
            thresh: float = 0.2):
    a = acf(y.dropna(), nlags=max_lag, fft=True)
    p = pacf(y.dropna()[-SLOTS * 30:], nlags=min(200, max_lag))

    # local maxima of the correlogram are where the real periodicity lives
    peaks = [k for k in range(2, len(a) - 1)
             if a[k] > a[k - 1] and a[k] >= a[k + 1] and abs(a[k]) > thresh]
    usable = [k for k in peaks if k >= horizon]
    blocked = [k for k in peaks if k < horizon]
    return a, p, usable, blocked


if __name__ == "__main__":
    y = (pd.read_csv(sys.argv[1], parse_dates=["ts"])
           .set_index("ts").sort_index()["kw"])
    a, p, usable, blocked = suggest(y)
    print("significant lags:")
    for k in usable[:12]:
        print(f"  lag {k:>5}  ({k / 4:6.1f} h)  r = {a[k]:.3f}   USABLE")
    for k in blocked[:12]:
        print(f"  lag {k:>5}  ({k / 4:6.1f} h)  r = {a[k]:.3f}   blocked by lead time")
    print()
    print(f"  daily  lag 96 : r = {a[96]:.3f}")
    print(f"  weekly lag 672: r = {a[672]:.3f}")
    print()
    print("PACF cuts off where the direct dependence ends; ACF decays slowly")
    print("because the daily cycle keeps re-entering. Use PACF to bound how")
    print("many SHORT lags matter, and ACF to find the seasonal ones.")`,
    },
  ],
};

/* ============ FE2 · t9 — exogenous drivers ============ */
CODE.t9 = {
  note: {
    zh: "每个候选外生变量都要同时回答两个问题:能降多少误差,以及上线那天你还有没有它。Python 用留一法逐个算出边际增益,并把它乘上可获得性折扣;配置是一张驱动因素登记表,availability 那一列必须在建模第一天填,不是上线前一周;最后一栏从 MES 拉排产计划,并诚实地记录它被修改过几次。",
    en: "Every candidate driver answers two questions at once: how much error it removes, and whether you will still have it on go-live day. The Python computes each one's marginal gain by leave-one-out and multiplies it by an availability discount. The configuration is a driver register whose availability column must be filled on day one of modelling, not in the final week. The last tab pulls the production plan out of MES and honestly records how often it was revised.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "driver_value.py",
      run: "# python driver_value.py  → 增益 × 可获得性",
      src: `"""Marginal gain of each driver, discounted by whether it will exist."""
import numpy as np
import pandas as pd
import lightgbm as lgb

RISK = {                 # probability the driver is missing or wrong at inference
    "cdd": 0.15, "cdd_lag2h": 0.15,
    "plan_kw": 0.45,     # MES schedules are revised the next morning
    "is_working": 0.02, "is_maintenance": 0.25, "humidity": 0.15,
}


def wape(y, p):
    return float(np.abs(y - p).sum() / np.abs(y).sum())


def fit_score(X, y, cut):
    m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.05, num_leaves=31,
                          min_child_samples=40, verbose=-1)
    m.fit(X[:cut], y[:cut], eval_set=[(X[cut:], y[cut:])],
          callbacks=[lgb.early_stopping(40, verbose=False)])
    return wape(y[cut:], m.predict(X[cut:]))


def marginal_gains(X: pd.DataFrame, y: pd.Series, drivers, cut):
    base_cols = [c for c in X.columns if c not in drivers]
    base = fit_score(X[base_cols], y, cut)
    rows = []
    for d in drivers:
        if d not in X.columns:
            continue
        with_d = fit_score(X[base_cols + [d]], y, cut)
        gain = (base - with_d) / base
        rows.append({
            "driver": d,
            "gain": gain,
            "risk": RISK.get(d, 0.2),
            "expected_gain": gain * (1 - RISK.get(d, 0.2)),
        })
    return base, pd.DataFrame(rows).sort_values("expected_gain", ascending=False)


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    cut = int(len(X) * 0.75)
    base, table = marginal_gains(X, y, list(RISK), cut)
    print(f"lags and calendar only: WAPE {base:.4f}")
    print(table.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
    print()
    print("Read both columns. A driver worth three points that will not exist")
    print("at inference is worth zero, and that is a day-one question.")`,
    },
    {
      lang: CFG, k: "yaml", file: "drivers.yaml",
      src: `# The driver register. The availability column is the one people skip and
# then discover in the final week of the project.
drivers:
  - name: cdd
    family: environment
    source: weather_api
    available_at_inference: forecast     # never the measurement
    risk: 0.15
    transform: "max(0, t-24)^1.25"
    note: 负荷对温度是 U 形响应,直接喂摄氏度几乎没有增益

  - name: plan_kw
    family: plan
    source: mes.production_schedule
    available_at_inference: yes_but_revised
    risk: 0.45
    note: 信息量最大,可靠性最低。前一晚定稿,第二天还会改。
    mitigation: 同时记录计划版本号与修订次数,并用最近三个月的修订幅度做折扣

  - name: is_maintenance
    family: plan
    source: cmms.work_order
    available_at_inference: planned_only
    risk: 0.25
    note: 计划内检修可得;临时抢修不可得,这部分永远是残差

  - name: humidity
    family: environment
    source: weather_api
    available_at_inference: forecast
    risk: 0.15
    keep: false
    note: 这条产线上增益 0.1%,加进去只是多给模型一个过拟合的机会`,
    },
    {
      lang: OPS, k: "sql", file: "pull_plan.sql",
      src: `-- The production plan, as it existed at publish time — plus how much it
-- was subsequently revised, which is the number that sets its risk weight.

-- 1) The version available when the forecast was published.
SELECT
    s.slot_ts,
    s.planned_output_units,
    s.line_id,
    s.version_no,
    s.issued_at
FROM mes_schedule s
JOIN (
    SELECT slot_ts, MAX(version_no) AS v
    FROM mes_schedule
    WHERE issued_at <= DATE_SUB(DATE(slot_ts), INTERVAL 17 HOUR)  -- 07:00 前一天
    GROUP BY slot_ts
) latest ON latest.slot_ts = s.slot_ts AND latest.v = s.version_no
WHERE s.slot_ts >= '2024-01-01';

-- 2) How badly the plan moves after publication. This is the empirical basis
--    for the 0.45 risk weight in drivers.yaml — do not guess it.
SELECT
    DATE_FORMAT(slot_ts, '%Y-%m')                        AS month,
    COUNT(DISTINCT slot_ts)                              AS slots,
    AVG(revisions)                                       AS avg_revisions,
    AVG(ABS(final_units - first_units)
        / NULLIF(first_units, 0))                        AS avg_rel_change
FROM (
    SELECT slot_ts,
           COUNT(*)                                          AS revisions,
           MIN(planned_output_units)                         AS first_units,
           MAX(planned_output_units)                         AS final_units
    FROM mes_schedule
    GROUP BY slot_ts
) r
GROUP BY month
ORDER BY month DESC
LIMIT 12;`,
    },
  ],
};

/* ============ FE3 · t10 — recursive, direct, anchored ============ */
CODE.t10 = {
  note: {
    zh: "「预测未来 24 小时」至少有三种实现,误差行为完全不同。Python 把三种都实现出来并画出误差随步长的曲线;配置选择策略与锚点步长;最后一栏是锚点插值的落地脚本——训 6 个模型代替 96 个,精度损失通常小于 0.3 个点。",
    en: "Forecasting the next 24 hours has at least three implementations whose error behaviour differs completely. The Python implements all three and plots error against horizon. The configuration picks the strategy and the anchor horizons. The last tab is the anchoring script in production form: six models instead of ninety-six, usually for less than 0.3 points.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "horizons.py",
      run: "# python horizons.py  → 三种方案的误差-步长曲线",
      src: `"""Recursive, direct and anchored multi-step, measured on one dataset."""
import numpy as np
import pandas as pd
import lightgbm as lgb

SLOTS = 96


def fit(X, y, cut):
    m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.06, num_leaves=31,
                          min_child_samples=30, verbose=-1)
    m.fit(X[:cut], y[:cut])
    return m


def direct(X, y, cut, horizons):
    """One model per lead time. Nothing compounds; you pay in model count."""
    return {h: fit(X, y.shift(-h).ffill(), cut) for h in horizons}


def recursive_forecast(model, history, steps, feat_fn):
    """Feed predictions back in. Whether this explodes depends entirely on how
    much of the input has to be SYNTHESISED — a model leaning on lag_96 and
    lag_672 barely degrades, because those are true values it never invents."""
    buf = list(history)
    for _ in range(steps):
        buf.append(float(model.predict(feat_fn(buf).reshape(1, -1))[0]))
    return buf[-steps:]


def anchored(X, y, cut, anchors, horizons):
    """Fit only a few horizons and interpolate the PREDICTIONS between them."""
    models = direct(X, y, cut, anchors)
    preds = {h: models[h].predict(X[cut:]) for h in anchors}
    out = {}
    for h in horizons:
        lo = max([a for a in anchors if a <= h], default=anchors[0])
        hi = min([a for a in anchors if a >= h], default=anchors[-1])
        if lo == hi:
            out[h] = preds[lo]
        else:
            w = (h - lo) / (hi - lo)
            out[h] = preds[lo] * (1 - w) + preds[hi] * w
    return out


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    cut, HS = int(len(X) * 0.75), [1, 4, 8, 16, 32, 48, 64, 80, 96]
    anchors = [1, 8, 24, 48, 72, 96]
    dm = direct(X, y, cut, HS)
    am = anchored(X, y, cut, anchors, HS)
    print(f"{'h':>4} {'direct':>9} {'anchored':>9}")
    for h in HS:
        yt = y.shift(-h).ffill()[cut:]
        d = np.abs(yt - dm[h].predict(X[cut:])).sum() / np.abs(yt).sum()
        a = np.abs(yt - am[h]).sum() / np.abs(yt).sum()
        print(f"{h:>4} {d:>9.4f} {a:>9.4f}")
    print()
    print(f"{len(anchors)} models instead of {max(HS)} — usually under 0.3 pt")`,
    },
    {
      lang: CFG, k: "yaml", file: "strategy.yaml",
      src: `target:
  name: line1_kw
  horizon_slots: 96
  # recursive | direct | anchored | seq2seq
  strategy: anchored

recursive:
  # only choose this if the model leans on TRUE seasonal lags. With lag1–lag4
  # alone, error rolls from 5.5% to 38% by the 96th step.
  requires_seasonal_lags: true
  scheduled_sampling: 0.15      # train on your own predictions sometimes

direct:
  horizons: all                 # 96 models
  note: no compounding, but the predicted curve can come out with a sawtooth

anchored:
  anchors: [1, 8, 24, 48, 72, 96]
  interpolate: predictions      # interpolate the outputs, not the coefficients
  measured_loss_vs_direct_pt: 0.2
  note: 6 个模型顶 96 个,这是本章给的实用折中

seq2seq:
  enabled: false
  note: 一次出整条曲线,结构上保证连贯,但更吃数据也更容易过拟合`,
    },
    {
      lang: OPS, k: "sh", file: "train_anchors.sh",
      run: "$ bash train_anchors.sh",
      src: `#!/usr/bin/env bash
# Train the anchor horizons in parallel, then assemble the interpolator.
# Six jobs instead of ninety-six is the difference between an overnight run
# and a weekend one — and on Kaggle, between fitting the quota and not.
set -euo pipefail

ANCHORS="1 8 24 48 72 96"
mkdir -p models logs

for h in $ANCHORS; do
  echo "training h=$h"
  python tools/train_one.py --horizon "$h" --features data/features.parquet --out "models/direct_h$h.txt" > "logs/h$h.log" 2>&1 &
done
wait

python - <<'PY'
import json, pathlib
anchors = [1, 8, 24, 48, 72, 96]
missing = [h for h in anchors if not pathlib.Path(f"models/direct_h{h}.txt").exists()]
assert not missing, f"missing models for horizons {missing}"
json.dump({"anchors": anchors, "interpolate": "predictions"},
          open("models/anchor_index.json", "w"), indent=2)
print(f"assembled {len(anchors)} anchor models covering 1..96")
PY

python tools/backtest.py --strategy anchored --folds 8 --out reports/anchored.json
python - <<'PY'
import json
r = json.load(open("reports/anchored.json"))
print("anchored WAPE %.4f +/- %.4f over %d folds" % (r["mean"], r["sd"], r["folds"]))
PY`,
    },
  ],
};

/* ============ ML1 · t11 — statistical baseline ============ */
CODE.t11 = {
  note: {
    zh: "SARIMAX 今天很少作为主力上线,但它的残差诊断是检查任何模型的通用体检。Python 走完整条链:平稳性检验、季节差分、定阶、拟合、残差 ACF 与 Ljung-Box;配置记下阶数与检验阈值;最后一栏把残差诊断做成一个可以套在任何模型上的函数——把你后面训的 LightGBM 的残差喂进去,还看得见尖峰就说明还有周期没被吃掉。",
    en: "SARIMAX rarely ships as the primary model today, yet its residual diagnostics are the general check-up for any model. The Python walks the whole chain: stationarity testing, seasonal differencing, order selection, fitting, residual ACF and Ljung-Box. The configuration records the orders and the test thresholds. The last tab turns residual diagnosis into a function you can wrap around any model — feed it the residuals of the LightGBM you train later, and a visible spike is a cycle you have not absorbed.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "sarimax_baseline.py",
      run: "# python sarimax_baseline.py  → 残差是不是白噪声",
      src: `"""Stationarity, differencing, order, fit, diagnose."""
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller, acf
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.stats.diagnostic import acorr_ljungbox

SLOTS = 96


def stationarity(y: pd.Series):
    stat, p, *_ = adfuller(y.dropna(), autolag="AIC")
    return {"adf": float(stat), "p": float(p), "stationary": p < 0.05}


def difference(y: pd.Series, d: int = 0, D: int = 0, s: int = SLOTS):
    out = y.copy()
    for _ in range(D):
        out = out.diff(s)
    for _ in range(d):
        out = out.diff()
    return out.dropna()


def fit_sarimax(y, order=(2, 0, 1), seasonal=(1, 1, 1, SLOTS), exog=None):
    # On 15-minute data a seasonal period of 96 is heavy. Fitting on an hourly
    # aggregate first and refining is normal practice, not a shortcut.
    m = SARIMAX(y, exog=exog, order=order, seasonal_order=seasonal,
                enforce_stationarity=False, enforce_invertibility=False)
    return m.fit(disp=False)


def diagnose(resid: pd.Series, lags: int = 24, dof: int = 3):
    lb = acorr_ljungbox(resid.dropna(), lags=[lags], model_df=dof)
    q = float(lb["lb_stat"].iloc[0])
    p = float(lb["lb_pvalue"].iloc[0])
    a = acf(resid.dropna(), nlags=SLOTS * 2, fft=True)
    worst = int(np.argmax(np.abs(a[1:])) + 1)
    return {"ljung_box_q": q, "p_value": p, "white": p > 0.05,
            "largest_residual_acf_lag": worst, "value": float(a[worst])}


if __name__ == "__main__":
    y = (pd.read_csv("data/line1.csv", parse_dates=["ts"])
           .set_index("ts").sort_index()["kw"].resample("1h").mean())
    print("raw      :", stationarity(y))
    print("seasonal :", stationarity(difference(y, D=1, s=24)))
    res = fit_sarimax(y, order=(2, 0, 1), seasonal=(1, 1, 1, 24))
    d = diagnose(res.resid, lags=24, dof=4)
    print(d)
    if not d["white"]:
        print(f"structure remains at lag {d['largest_residual_acf_lag']} "
              f"(r={d['value']:.3f}) — raise the AR order, or accept that this")
        print("is not linear autocorrelation and move to ML2")`,
    },
    {
      lang: CFG, k: "yaml", file: "sarimax.yaml",
      src: `sarimax:
  # fit on the hourly aggregate: a seasonal period of 96 on 15-minute data
  # makes the state space enormous for very little gain
  resample: 1h
  order: [2, 0, 1]            # p, d, q
  seasonal_order: [1, 1, 1, 24]   # P, D, Q, s  (s = 24 hours)
  exog: [cdd, is_working]

diagnostics:
  adf_alpha: 0.05
  ljung_box_lags: 24
  ljung_box_alpha: 0.05
  # these thresholds apply to EVERY model in this book, not just SARIMAX
  max_residual_acf: 0.20

when_to_stop_using_this:
  - 多个外生变量时参数爆炸且难调
  - 成百上千条序列要拟合成百上千个模型
  - 工况切换这种由外部事件驱动的非线性跳变,线性结构表达不了
  - 96 步长的置信区间宽到失去实用价值
  # 以上任意一条成立 → 去 ML2`,
    },
    {
      lang: OPS, k: "py", file: "residual_gate.py",
      run: "# python residual_gate.py models/lgbm.txt  → 还有结构没学到吗",
      src: `"""Residual diagnostics for ANY model. This is what ML1 is really for."""
import sys
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import acf
from statsmodels.stats.diagnostic import acorr_ljungbox

SLOTS = 96


def residual_report(y_true: pd.Series, y_pred: pd.Series, dof: int = 10):
    resid = (y_true - y_pred).dropna()
    a = acf(resid, nlags=SLOTS * 8, fft=True)
    lb = acorr_ljungbox(resid, lags=[SLOTS], model_df=dof)

    peaks = {}
    for name, lag in (("hourly", 4), ("daily", SLOTS), ("weekly", SLOTS * 7)):
        if lag < len(a):
            peaks[name] = float(a[lag])

    return {
        "sd": float(resid.std()),
        "ljung_box_p": float(lb["lb_pvalue"].iloc[0]),
        "white": bool(lb["lb_pvalue"].iloc[0] > 0.05),
        "structure_left_at": peaks,
        # a residual that still correlates with the hour of day means the
        # calendar features are not doing their job
        "by_hour": resid.groupby(resid.index.hour).mean().abs().max(),
    }


if __name__ == "__main__":
    bt = pd.read_parquet(sys.argv[1] if len(sys.argv) > 1 else "reports/backtest.parquet")
    r = residual_report(bt["y_true"], bt["y_pred"])
    for k, v in r.items():
        print(f"{k:>18}: {v}")
    if not r["white"]:
        print()
        print("The model has left structure on the table. Look at which lag:")
        print("  daily  -> your calendar features are too coarse")
        print("  weekly -> add a weekly lag or a day-of-week interaction")
        print("  hourly -> the shift boundaries are not in the features")`,
    },
  ],
};

/* ============ ML2 · t12 — gradient boosting ============ */
CODE.t12 = {
  note: {
    zh: "这个领域的主力。Python 是一份可直接用的 LightGBM 训练脚本,重点在两行:早停的验证集必须是时间上靠后的那一段,以及类别特征的目标编码必须在折内计算;配置列出这类任务上真正重要的那几个参数;最后一栏用置换重要性代替 split 次数,因为高基数特征天然 split 多,那张默认的重要性图会骗你。",
    en: "The workhorse of this field. The Python is a LightGBM training script you can use as is, and two lines carry the weight: the early-stopping validation set must be the later window in time, and target encoding for categoricals must be computed inside the fold. The configuration lists the handful of parameters that actually matter here. The last tab replaces split counts with permutation importance, because high-cardinality features split often by construction and the default importance plot will mislead you.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "train_lgbm.py",
      run: "# python train_lgbm.py  → best_iteration 与测试成绩",
      src: `"""LightGBM for industrial load. The discipline matters more than the knobs."""
import numpy as np
import pandas as pd
import lightgbm as lgb

SLOTS, HORIZON = 96, 96


def wape(y, p):
    return float(np.abs(y - p).sum() / np.abs(y).sum())


def time_split(n, train=0.70, valid=0.15, gap=HORIZON):
    """Train, a gap of one lead time, validation, then an untouched test tail."""
    a = int(n * train)
    b = a + gap
    c = b + int(n * valid)
    return slice(0, a), slice(b, c), slice(c + gap, n)


def target_encode(train_df, apply_df, col, target, smoothing=20.0):
    """Computed INSIDE the fold. Doing it on the full frame is DT4 again."""
    prior = train_df[target].mean()
    g = train_df.groupby(col)[target].agg(["mean", "count"])
    w = g["count"] / (g["count"] + smoothing)
    enc = w * g["mean"] + (1 - w) * prior
    return apply_df[col].map(enc).fillna(prior)


def train(X: pd.DataFrame, y: pd.Series):
    tr, va, te = time_split(len(X))
    params = dict(objective="l1", n_estimators=3000, learning_rate=0.03,
                  num_leaves=63, min_child_samples=40, feature_fraction=0.8,
                  bagging_fraction=0.8, bagging_freq=1, lambda_l2=1.0, verbose=-1)
    m = lgb.LGBMRegressor(**params)
    # The validation set is the LATER window. A randomly carved one reports a
    # score about a point too good and you will quote it in a meeting.
    m.fit(X[tr], y[tr], eval_set=[(X[va], y[va])], eval_metric="l1",
          callbacks=[lgb.early_stopping(100, verbose=False),
                     lgb.log_evaluation(200)])
    return m, {"best_iteration": m.best_iteration_,
               "valid": wape(y[va], m.predict(X[va])),
               "test": wape(y[te], m.predict(X[te]))}


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    model, s = train(X, y)
    print(s)
    model.booster_.save_model("models/lgbm.txt", num_iteration=model.best_iteration_)
    print("A small learning rate with many trees and early stopping is the")
    print("default recipe because it trades compute for variance — and variance")
    print("is what kills you on 100k rows.")`,
    },
    {
      lang: CFG, k: "yaml", file: "lgbm.yaml",
      src: `# The parameters that actually matter on tabularised industrial series.
# Everything not listed here has almost never changed the answer for us.
objective: l1                 # robust to the spikes DT2 could not remove
metric: l1

n_estimators: 3000            # a ceiling; early stopping decides the real count
learning_rate: 0.03           # halve it and the optimal count roughly doubles

num_leaves: 63                # LightGBM grows LEAF-wise: this overfits faster
max_depth: -1                 #   than a depth limit would suggest
min_child_samples: 40         # the main guard on 100k-row datasets

feature_fraction: 0.8
bagging_fraction: 0.8
bagging_freq: 1
lambda_l2: 1.0

early_stopping:
  rounds: 100
  # NOT NEGOTIABLE: the later window in time, never a random sample
  validation: later_in_time
  gap_slots: 96

categorical:
  # high-cardinality ids: native categorical support or fold-local target
  # encoding. One-hot explodes and adds nothing.
  native: [line_id, product_code]
  target_encoded: [shift_pattern]
  encoding_scope: train_fold_only`,
    },
    {
      lang: OPS, k: "py", file: "importance.py",
      run: "# python importance.py  → 置换重要性(而不是 split 次数)",
      src: `"""Split counts lie. Permutation importance on a held-out window does not."""
import numpy as np
import pandas as pd
import lightgbm as lgb


def wape(y, p):
    return float(np.abs(y - p).sum() / np.abs(y).sum())


def permutation_importance(model, X: pd.DataFrame, y: pd.Series, repeats=5, seed=0):
    """Shuffle one column at a time and measure how much worse it gets. On a
    time series, shuffle WITHIN the evaluation window only — shuffling across
    the whole frame mixes regimes and overstates every feature."""
    rng = np.random.default_rng(seed)
    base = wape(y, model.predict(X))
    rows = []
    for col in X.columns:
        deltas = []
        for _ in range(repeats):
            Xp = X.copy()
            Xp[col] = rng.permutation(Xp[col].values)
            deltas.append(wape(y, model.predict(Xp)) - base)
        rows.append({"feature": col, "delta_wape": float(np.mean(deltas)),
                     "sd": float(np.std(deltas))})
    return base, pd.DataFrame(rows).sort_values("delta_wape", ascending=False)


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    cut = int(len(X) * 0.85)
    booster = lgb.Booster(model_file="models/lgbm.txt")

    class Wrap:
        def predict(self, d):
            return booster.predict(d)

    base, table = permutation_importance(Wrap(), X[cut:], y[cut:])
    print(f"baseline WAPE {base:.4f}")
    print(table.head(15).to_string(index=False, float_format=lambda v: f"{v:.5f}"))
    print()
    split = pd.Series(booster.feature_importance("split"), index=booster.feature_name())
    gain = pd.Series(booster.feature_importance("gain"), index=booster.feature_name())
    print("top by split count (misleading):", list(split.nlargest(5).index))
    print("top by gain                     :", list(gain.nlargest(5).index))
    print("top by permutation (trust this) :", list(table.feature.head(5)))`,
    },
  ],
};

/* ============ ML3 · t13 — quantiles ============ */
CODE.t13 = {
  note: {
    zh: "把点预测升级成决策能用的区间,代价只是换一个损失函数、多训几次。Python 训一组分位数模型并做排序修正;配置由 SG2 的代价表推出该运行的分位数;最后一栏是覆盖率校准检查——理想的 80% 区间应该覆盖 80%,一次都没被突破说明区间太宽,同样是校准失败。",
    en: "Upgrading a point forecast into an interval a decision can use costs only a change of loss function and a few more fits. The Python trains a set of quantile models and applies a sorting correction. The configuration derives the operating quantile from SG2's cost table. The last tab is the coverage check: an ideal 80% interval should cover 80%, and never being exceeded means the interval is too wide, which is equally a calibration failure.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "quantiles.py",
      run: "# python quantiles.py  → P10 / P50 / P90 与覆盖率",
      src: `"""Same features, same model, a different loss — and now you have an interval."""
import numpy as np
import pandas as pd
import lightgbm as lgb

QUANTILES = (0.1, 0.5, 0.9)


def pinball(y, p, tau):
    d = y - p
    return float(np.mean(np.where(d >= 0, tau * d, (tau - 1) * d)))


def fit_quantiles(X, y, cut, quantiles=QUANTILES, **kw):
    models = {}
    for tau in quantiles:
        m = lgb.LGBMRegressor(objective="quantile", alpha=tau, n_estimators=1200,
                              learning_rate=0.04, num_leaves=63,
                              min_child_samples=40, verbose=-1, **kw)
        m.fit(X[:cut], y[:cut])
        models[tau] = m
    return models


def predict_band(models, X):
    P = pd.DataFrame({tau: m.predict(X) for tau, m in models.items()}, index=X.index)
    # Independently fitted quantiles can cross: P90 below P50 is not a forecast,
    # it is an arithmetic accident. Sorting each row fixes it.
    crossings = int((P.values[:, :-1] > P.values[:, 1:]).sum())
    P.loc[:, :] = np.sort(P.values, axis=1)
    return P, crossings


def coverage(y, P, lo=0.1, hi=0.9):
    inside = ((y >= P[lo]) & (y <= P[hi])).mean()
    above = (y > P[hi]).mean()
    below = (y < P[lo]).mean()
    return {"nominal": hi - lo, "actual": float(inside),
            "above_upper": float(above), "below_lower": float(below)}


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    cut = int(len(X) * 0.75)
    models = fit_quantiles(X, y, cut)
    P, crossings = predict_band(models, X[cut:])
    print(f"quantile crossings fixed: {crossings}")
    for tau in QUANTILES:
        print(f"  pinball tau={tau}: {pinball(y[cut:].values, P[tau].values, tau):8.2f} kW")
    print(coverage(y[cut:], P))
    print()
    print("P90 is not a safe value. Across a 30-day month you should expect")
    print("about three exceedances — none at all means the band is too wide.")`,
    },
    {
      lang: CFG, k: "yaml", file: "quantiles.yaml",
      src: `# Which quantile you RUN is not a modelling preference: it comes from the
# cost table in decisions.yaml.  tau = cu / (cu + co)
operating_quantile:
  decision: demand_control
  cost_under_cny_per_kw: 6.0
  cost_over_cny_per_kw: 0.8
  tau: 0.882

train_quantiles: [0.1, 0.5, 0.882, 0.9]

post_processing:
  sort_rows: true              # forbid P90 < P50
  calibration_window_days: 30
  # if actual coverage drifts outside this band, the intervals are lying
  coverage_tolerance: 0.05

reporting:
  # the interval is what downstream consumes; the point forecast is a by-product
  publish: [p50, p882]
  also_log: [p10, p90, pinball_by_quantile, coverage_30d]`,
    },
    {
      lang: OPS, k: "py", file: "calibration.py",
      run: "# python calibration.py  → 覆盖率是不是名义值",
      src: `"""Is the interval telling the truth? Count, do not assume."""
import numpy as np
import pandas as pd


def rolling_coverage(bt: pd.DataFrame, lo="p10", hi="p90", window_days=30):
    """bt: y_true plus one column per quantile, indexed by timestamp."""
    inside = ((bt.y_true >= bt[lo]) & (bt.y_true <= bt[hi])).astype(float)
    return inside.rolling(96 * window_days, min_periods=96 * 7).mean()


def by_load_level(bt: pd.DataFrame, hi="p90", bins=4):
    """Where the interval fails matters more than whether it fails on average.
    A constant safety margin over-covers at night and under-covers at the peak
    — which is the one part of the day you actually care about."""
    q = pd.qcut(bt.y_true, bins, labels=[f"Q{i + 1}" for i in range(bins)])
    return (bt.y_true > bt[hi]).groupby(q).mean()


if __name__ == "__main__":
    bt = pd.read_parquet("reports/backtest_quantiles.parquet")
    cov = rolling_coverage(bt)
    print(f"30-day rolling coverage: last {cov.iloc[-1]:.1%}, "
          f"min {cov.min():.1%}, max {cov.max():.1%}   (nominal 80%)")

    print()
    print("exceedance of the upper bound, by load quartile (nominal 10%):")
    print(by_load_level(bt).to_string(float_format=lambda v: f"{v:.1%}"))
    print()
    print("If the top quartile exceeds far more than the nominal rate, the")
    print("error is heteroskedastic and a constant margin cannot express it.")
    print("That is exactly what quantile regression is for.")`,
    },
  ],
};

/* ============ ML4 · t14 — global models ============ */
CODE.t14 = {
  note: {
    zh: "一千个电表不训一千个模型。Python 把多条序列拼成一个训练集,按序列归一化、把规模和静态属性喂进去,并演示新表的冷启动;配置是序列注册表与分组策略;最后一栏是什么时候该分组建模的判定脚本——按行为聚类,每组一个全局模型。",
    en: "A thousand meters do not get a thousand models. The Python pools many series into one training set, normalises per series, feeds scale and static attributes in, and demonstrates cold start on a new meter. The configuration is the series registry and the grouping policy. The last tab decides when grouped modelling is required — cluster by behaviour, one global model per cluster.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "global_model.py",
      run: "# python global_model.py  → 新表借到了多少力",
      src: `"""One model, many series. Normalisation is what makes it possible."""
import numpy as np
import pandas as pd
import lightgbm as lgb


def pool(frames: dict, static: pd.DataFrame) -> pd.DataFrame:
    """frames: {series_id: feature DataFrame with a kw column}."""
    parts = []
    for sid, df in frames.items():
        d = df.copy()
        scale = d["kw"].iloc[: int(len(d) * 0.75)].mean()   # TRAIN-only scale
        # normalise the target and every level-like feature by the same scale,
        # then tell the model how big this meter is
        for c in [c for c in d.columns if c.startswith(("lag_", "roll_")) or c == "kw"]:
            d[c] = d[c] / scale
        d["log_scale"] = np.log(scale)
        d["series_id"] = sid
        for col in static.columns:
            d[col] = static.loc[sid, col]
        d["_scale"] = scale
        parts.append(d)
    return pd.concat(parts).sort_index()


def train_global(df: pd.DataFrame, cut_ts):
    y = df.pop("kw")
    scale = df.pop("_scale")
    tr = df.index < cut_ts
    cats = ["series_id", "equipment_type", "workshop"]
    for c in cats:
        df[c] = df[c].astype("category")
    m = lgb.LGBMRegressor(objective="l1", n_estimators=2000, learning_rate=0.04,
                          num_leaves=127, min_child_samples=60, verbose=-1)
    m.fit(df[tr], y[tr], categorical_feature=cats)
    return m, df, y, scale, ~tr


if __name__ == "__main__":
    frames = {f"m{i}": pd.read_parquet(f"data/feat_m{i}.parquet") for i in range(1, 25)}
    static = pd.read_csv("data/series_static.csv", index_col="series_id")
    df = pool(frames, static)
    m, X, y, scale, te = train_global(df, cut_ts="2026-08-01")
    pred = m.predict(X[te]) * scale[te]
    truth = y[te] * scale[te]
    err = pd.DataFrame({"sid": X.loc[te, "series_id"].astype(str),
                        "e": (truth - pred).abs(), "y": truth.abs()})
    per = err.groupby("sid").apply(lambda g: g.e.sum() / g.y.sum())
    print(per.sort_values().to_string(float_format=lambda v: f"{v:.4f}"))
    print()
    print("New meters with a few days of history score close to the old ones:")
    print("that difference is what they borrowed from the rest of the fleet.")`,
    },
    {
      lang: CFG, k: "yaml", file: "series.yaml",
      src: `# The series registry. Static attributes are what let the model reason
# about a meter it has never seen — this is where cold start comes from.
normalisation:
  method: train_mean_per_series
  also_feed_scale_as_feature: true     # log(scale)
  note: 关掉它,量级最大的几台设备会主导损失函数,小表被当成噪声

static_attributes:
  - equipment_type      # injection / compressor / chiller / lighting
  - rated_power_kw
  - workshop
  - commissioned_year
  - product_line

grouping:
  # global over everything, or one global model per behavioural cluster
  mode: auto
  cluster_on: [daily_profile_shape, weekend_ratio, cv]
  max_clusters: 4
  # switch to grouping when a single global model is clearly interfering
  trigger_if_within_cluster_gain_pt: 1.5

cold_start:
  min_history_days: 2
  # below this, fall back to the cluster mean profile scaled by rated power
  fallback: cluster_profile_times_rated_power`,
    },
    {
      lang: OPS, k: "py", file: "cluster_series.py",
      run: "# python cluster_series.py  → 该不该分组",
      src: `"""Global or grouped? Cluster by BEHAVIOUR, then measure the difference."""
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

SLOTS = 96


def signature(y: pd.Series) -> np.ndarray:
    """A compact description of how this meter behaves, scale-free."""
    d = y / y.mean()
    profile = d.groupby(d.index.hour).mean().reindex(range(24)).fillna(1).values
    weekend = d[d.index.dayofweek >= 5].mean() / max(d[d.index.dayofweek < 5].mean(), 1e-6)
    return np.concatenate([profile, [weekend, d.std(), d.max()]])


def cluster(frames: dict, k: int = 3):
    sids = list(frames)
    S = np.vstack([signature(frames[s]["kw"]) for s in sids])
    S = (S - S.mean(0)) / (S.std(0) + 1e-9)
    labels = KMeans(n_clusters=k, n_init=10, random_state=0).fit_predict(S)
    return dict(zip(sids, labels.tolist()))


if __name__ == "__main__":
    frames = {f"m{i}": pd.read_parquet(f"data/feat_m{i}.parquet") for i in range(1, 25)}
    for k in (1, 2, 3, 4):
        groups = cluster(frames, k) if k > 1 else {s: 0 for s in frames}
        sizes = pd.Series(groups).value_counts().sort_index().tolist()
        print(f"k={k}: cluster sizes {sizes}")
    print()
    print("Rule of thumb: keep one global model until a grouped fit beats it by")
    print("more than the between-fold spread from EV1. Splitting a fleet into")
    print("four groups quarters the data each model sees, and that costs more")
    print("than the interference it removes unless the behaviours truly differ.")`,
    },
  ],
};

/* ============ DL1 · t15 — capacity against data ============ */
CODE.t15 = {
  note: {
    zh: "深度模型在时序上的第一课不是怎么搭网络,而是什么时候不该搭。Python 给出参数量估算和一条「数据量 → 合理容量」的经验线,并把 MLP / LSTM / TCN 的感受野与参数量算清楚;配置写下模型规模上限;最后一栏画学习曲线——如果曲线还在往下走,你缺的是数据不是容量。",
    en: "The first lesson about deep models on time series is not how to build a network but when not to. The Python estimates parameter counts, gives an empirical line from data size to a sensible capacity, and works out receptive fields for MLP, LSTM and TCN. The configuration writes down the ceiling on model size. The last tab plots the learning curve: if it is still falling, what you lack is data rather than capacity.",
  },
  tabs: [
    {
      lang: PY, k: "py", file: "sizing.py",
      run: "# python sizing.py  → 这个数据量撑得起多大的模型",
      src: `"""How large a model does 35,000 points support? Not the one you wanted."""
import math


def mlp_params(lookback, hidden, layers, horizon):
    p = lookback * hidden + hidden
    p += (layers - 1) * (hidden * hidden + hidden)
    return p + hidden * horizon + horizon


def lstm_params(inputs, hidden, layers):
    p = 4 * (inputs * hidden + hidden * hidden + hidden)
    for _ in range(layers - 1):
        p += 4 * (hidden * hidden + hidden * hidden + hidden)
    return p


def tcn_receptive_field(kernel, layers, dilation_base=2):
    """How far back a dilated causal stack can actually see."""
    return 1 + (kernel - 1) * sum(dilation_base ** i for i in range(layers))


def tcn_layers_for(span, kernel=3, dilation_base=2):
    n = 1
    while tcn_receptive_field(kernel, n, dilation_base) < span:
        n += 1
    return n


def sensible_capacity(n_rows, rule_of_thumb=20):
    """One parameter per rule_of_thumb samples is a workable starting point
    on noisy industrial data; it is not a theorem, it is a place to begin."""
    return int(n_rows / rule_of_thumb)


if __name__ == "__main__":
    rows = 3 * 365 * 96
    print(f"one plant, one tag, three years of 15-minute data: {rows:,} rows")
    print(f"sensible capacity: about {sensible_capacity(rows):,} parameters")
    print()
    print(f"MLP  96->128x2->96 : {mlp_params(96, 128, 2, 96):,} params")
    print(f"LSTM 8->128x2      : {lstm_params(8, 128, 2):,} params")
    for span, name in ((96, 'one day'), (672, 'one week')):
        n = tcn_layers_for(span)
        print(f"TCN to see {name:<9}: {n} dilated layers "
              f"(receptive field {tcn_receptive_field(3, n)})")
    print()
    print("A 2,000,000-parameter model on 105,000 rows is not a risk of")
    print("overfitting. It is arithmetic. Before reaching for one, confirm the")
    print("tree model has stopped improving with more data (see the last tab).")`,
    },
    {
      lang: CFG, k: "yaml", file: "model_budget.yaml",
      src: `data:
  rows: 105120                # 3 years, 15-minute, one tag
  effective_independent_days: 1095   # the real sample size is DAYS, not rows

capacity:
  # one parameter per ~20 samples, halved again because consecutive 15-minute
  # rows are anything but independent
  suggested_max_params: 50000
  hard_max_params: 200000
  note: 超过这个量级,先回去要数据,而不是加层

architectures:
  mlp:
    lookback: 96
    hidden: 128
    layers: 2
    params: 41056
  tcn:
    kernel: 3
    layers: 6                 # receptive field 127 > one day
    channels: 48
    note: 训练完全并行,实现比 LSTM 简单,基准上常常打平
  lstm:
    hidden: 128
    layers: 2
    note: 参数效率高,但时间步不能并行,长序列上梯度仍然吃力

before_you_train_a_deep_model:
  - 树模型的学习曲线是否已经走平(见 learning_curve.py)
  - 数据、特征、对齐是否都做完了
  - 零样本基础模型试过了没有(DL3,五分钟)`,
    },
    {
      lang: OPS, k: "py", file: "learning_curve.py",
      run: "# python learning_curve.py  → 你缺的是数据还是容量",
      src: `"""If the curve is still falling, you need data — not a bigger model."""
import numpy as np
import pandas as pd
import lightgbm as lgb


def wape(y, p):
    return float(np.abs(y - p).sum() / np.abs(y).sum())


def learning_curve(X: pd.DataFrame, y: pd.Series, fractions=(0.1, 0.2, 0.4, 0.7, 1.0)):
    cut = int(len(X) * 0.8)
    rows = []
    for f in fractions:
        take = int(cut * f)
        m = lgb.LGBMRegressor(objective="l1", n_estimators=800, learning_rate=0.04,
                              num_leaves=63, min_child_samples=40, verbose=-1)
        # always the MOST RECENT slice, never a random sample: older data is
        # less relevant and sampling it randomly would leak across time
        m.fit(X[cut - take: cut], y[cut - take: cut])
        rows.append({"fraction": f, "rows": take,
                     "wape": wape(y[cut:], m.predict(X[cut:]))})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    lc = learning_curve(X, y)
    print(lc.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
    last_gain = lc.wape.iloc[-2] - lc.wape.iloc[-1]
    print()
    if last_gain > 0.003:
        print(f"Still improving ({last_gain:.4f} from the last 30% of data).")
        print("More history is worth more than more capacity. Go and get it.")
    else:
        print(f"Flat ({last_gain:.4f}). The tree model has absorbed what this")
        print("data has to give — now a deep model or a foundation model is")
        print("a reasonable next step rather than an expensive way to overfit.")`,
    },
  ],
};
