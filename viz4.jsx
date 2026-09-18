/* =========================================================
   viz4.jsx — benches for Modules VII–IX (t25–t30),
   plus the VIZ registry and <Viz> used by pages.jsx.
   ========================================================= */

/* =========================================================
   t25 · tuneLab — grid, random, TPE, and the validation set you wore out
   ========================================================= */
function TuneViz() {
  const L = useL();
  const [budget, setBudget] = React.useState(60);
  const [seed, setSeed] = React.useState(3);
  const [folds, setFolds] = React.useState(1);

  const R = React.useMemo(() => {
    const days = 40, S = synth({ days, seed: 67, noise: 1.1 });
    const y = S.y, n = y.length, base = [], tgt = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const q = i % SLOTS;
      base.push([y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, y[i - 2 * SLOTS] / 1000,
                 mean(y.slice(i - SLOTS - 4, i - SLOTS)) / 1000, Math.sin((2 * Math.PI * q) / SLOTS),
                 Math.cos((2 * Math.PI * q) / SLOTS), Math.pow(Math.max(0, S.temp[i] - 24), 1.25) / 10]);
      tgt.push(y[i] / 1000);
    }
    const N = base.length, D = base[0].length, MAXK = 120;
    // A model whose three hyperparameters genuinely interact: capacity, the
    // bandwidth of its features, and how hard they are regularised. Wrong on any
    // one of them and the other two cannot rescue it — which is what makes this a
    // search problem rather than a lookup.
    const rr = rng(5);
    const W = Array.from({ length: MAXK }, () => Array.from({ length: D }, () => gauss(rr)));
    const ph = Array.from({ length: MAXK }, () => 2 * Math.PI * rr());
    const cfgOf = (u) => ({ lam: Math.pow(10, -6 + 6 * u[0]), k: 4 + Math.round(u[1] * (MAXK - 4)), bw: 0.3 + 2.9 * u[2] });
    const featOf = (row, c) => { const f = [1]; for (let j = 0; j < c.k; j++) f.push(Math.cos(c.bw * dot(W[j], row) + ph[j])); return f; };
    const TRAIN = 420;                          // a plant with limited history
    const c1 = TRAIN, winLen = 260;
    const testFrom = Math.min(N - 400, c1 + 6 * winLen);
    const fitEval = (c, trEnd, vaFrom, vaTo) => {
      const X = [], t = [];
      for (let i = Math.max(0, trEnd - TRAIN); i < trEnd; i++) { X.push(featOf(base[i], c)); t.push(tgt[i]); }
      const b = ridge(X, t, c.lam);
      const yt = [], p = [];
      for (let i = vaFrom; i < vaTo; i++) { yt.push(tgt[i]); p.push(dot(b, featOf(base[i], c))); }
      return wape(yt, p);
    };
    const evalCfg = (u) => {
      const c = cfgOf(u);
      let acc = 0;
      for (let f = 0; f < folds; f++) {
        const trEnd = c1 + f * winLen;
        acc += fitEval(c, trEnd, trEnd, Math.min(N, trEnd + winLen));
      }
      return acc / folds;
    };
    const testOf = (u) => fitEval(cfgOf(u), c1, testFrom, N);

    const DIM = 4;
    const run = (kind) => {
      const r = rng(seed * 17 + 1), tried = [], best = [];
      let bu = [0.5, 0.5, 0.5, 0.5], bs = Infinity;
      const g = Math.max(2, Math.round(Math.pow(budget, 1 / DIM)));
      for (let t = 0; t < budget; t++) {
        let u;
        if (kind === "grid") {
          u = []; let q = t;
          for (let d = 0; d < DIM; d++) { u.push(((q % g) + 0.5) / g); q = Math.floor(q / g); }
        } else if (kind === "rand" || t < 10) {
          u = Array.from({ length: DIM }, () => r());
        } else {
          const top = tried.slice().sort((a, b) => a.s - b.s).slice(0, Math.max(3, Math.floor(tried.length / 4)));
          const pick = top[Math.floor(r() * top.length)];
          u = pick.u.map((v) => clamp(v + 0.16 * gauss(r), 0, 1));
        }
        const sc = evalCfg(u);
        tried.push({ u, s: sc });
        if (sc < bs) { bs = sc; bu = u; }
        best.push({ x: t + 1, y: bs });
      }
      return { best, bs, test: testOf(bu), tried };
    };
    const grid = run("grid"), rand = run("rand"), tpe = run("tpe");
    // validation overfitting: as the search goes on, how far does the best
    // validation score drift below the test score of that same configuration?
    const drift = [];
    let bv2 = Infinity, bcfg = null;
    for (let i = 0; i < rand.tried.length; i++) {
      if (rand.tried[i].s < bv2) { bv2 = rand.tried[i].s; bcfg = rand.tried[i]; }
      if ((i + 1) % 4 === 0) drift.push({ x: i + 1, y: testOf(bcfg.u) - bv2 });
    }
    return { grid, rand, tpe, drift };
  }, [budget, seed, folds]);

  const winner = [["grid", R.grid], ["rand", R.rand], ["tpe", R.tpe]].reduce((a, b) => (b[1].bs < a[1].bs ? b : a));
  const lastDrift = R.drift.length ? R.drift[R.drift.length - 1].y : 0;
  const firstDrift = R.drift.length ? R.drift[0].y : 0;
  const grew = lastDrift - firstDrift;   // the gap's GROWTH is the overfitting; its level is segment luck

  return (
    <div>
      <VizHead idx="EV3" title={L("固定预算下的三种搜索,以及被搜坏的验证集", "Three searches at a fixed budget, and the validation set you wore out")} />
      <div className="viz-ctrl">
        <Slider label={L("搜索预算(试多少组)", "Search budget (trials)")} min={9} max={144} value={budget} onChange={setBudget} />
        <Slider label={L("随机种子", "Random seed")} min={1} max={12} value={seed} onChange={setSeed} />
        <Slider label={L("选型用几折", "Folds used for selection")} min={1} max={5} value={folds} onChange={setFolds} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("网格搜索", "Grid search")} value={pct1(R.grid.bs)} tone={winner[0] === "grid" ? "ok" : "mut"} hint={L(`测试集 ${pct1(R.grid.test)}`, `test ${pct1(R.grid.test)}`)} />
        <Kpi label={L("随机搜索", "Random search")} value={pct1(R.rand.bs)} tone={winner[0] === "rand" ? "ok" : "acc"} hint={L(`测试集 ${pct1(R.rand.test)}`, `test ${pct1(R.rand.test)}`)} />
        <Kpi label={L("TPE(贝叶斯)", "TPE (Bayesian)")} value={pct1(R.tpe.bs)} tone={winner[0] === "tpe" ? "ok" : "acc"} hint={L(`测试集 ${pct1(R.tpe.test)}`, `test ${pct1(R.tpe.test)}`)} />
        <Kpi label={L("验证集变得更乐观了", "Validation grew more optimistic by")} value={`${grew >= 0 ? "+" : ""}${nf(grew * 100, 2)} pt`} tone={grew > 0.005 ? "warn" : "ok"} hint={L("搜到最后 vs 刚开始", "end of the search vs the start")} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("最好成绩随试验次数(上=网格,中=随机,下=TPE)", "Best-so-far against trials (top grid, middle random, bottom TPE)")}</div>
        <MiniPlot data={R.grid.best} h={82} yMin={Math.min(R.grid.bs, R.rand.bs, R.tpe.bs) * 0.96} />
        <MiniPlot data={R.rand.best} h={82} yMin={Math.min(R.grid.bs, R.rand.bs, R.tpe.bs) * 0.96} stroke="var(--accent)" />
        <MiniPlot data={R.tpe.best} h={82} yMin={Math.min(R.grid.bs, R.rand.bs, R.tpe.bs) * 0.96} stroke="#2e9e6b" />
      </div>

      <Note mark="→" tone={folds > 2 ? "on" : "bad"}>
        {L(`同样 ${budget} 次试验,验证集上:网格 ${pct1(R.grid.bs)}、随机 ${pct1(R.rand.bs)}、TPE ${pct1(R.tpe.bs)}。网格吃亏的原因是这个空间有四维而只有三维真正影响结果,预算 ${budget} 摊到四维上每轴只够 ${Math.max(2, Math.round(Math.pow(budget, 0.25)))} 个点;随机搜索在每一维上的投影都是 ${budget} 个不同的值,有效维度的分辨率高得多。TPE 把采样集中到有希望的区域,验证成绩最好看。
            但请把括号里的测试成绩一起读:网格 ${pct1(R.grid.test)}、随机 ${pct1(R.rand.test)}、TPE ${pct1(R.tpe.test)}——验证集上赢最多的那个,在从未参与过选择的测试段上并没有赢。这就是验证集过拟合:TPE 之所以验证分数最低,一部分是因为它比别人更努力地在同一个验证集上找运气。随着试验从 4 次涨到 ${budget} 次,验证集相对测试集又乐观了 ${nf(grew * 100, 2)} 个点。
            ${folds > 2 ? `你现在用 ${folds} 折选型,这正是压住它的办法:多折均值的方差小得多,运气很难同时在几折上出现。` : "解药有三个,都在这个台子上:把「选型用几折」拖到 3 以上(多折均值方差小得多)、留一段从头到尾不参与选择的最终测试段、以及不要只取最优点而取最优附近几组的平均。"}`,
            `Same ${budget} trials, on the validation set: grid ${pct1(R.grid.bs)}, random ${pct1(R.rand.bs)}, TPE ${pct1(R.tpe.bs)}. Grid loses because this space has four axes of which only three affect the result, and a budget of ${budget} spread over four dimensions is ${Math.max(2, Math.round(Math.pow(budget, 0.25)))} points per axis; random search projects ${budget} distinct values onto every axis, resolving the live ones far more finely. TPE concentrates its sampling where things look promising and posts the best validation score of the three.
            Now read the test scores in brackets alongside: grid ${pct1(R.grid.test)}, random ${pct1(R.rand.test)}, TPE ${pct1(R.tpe.test)}. The method that won by the most on validation did not win on the segment that never took part in any choice. That is validation overfitting: part of why TPE's validation score is lowest is that it searched harder than the others for luck in the same validation window. As the trial count climbs from 4 to ${budget}, validation grows another ${nf(grew * 100, 2)} points more optimistic than test.
            ${folds > 2 ? `You are selecting on ${folds} folds, which is how that is held down — a multi-fold mean has far lower variance, and luck rarely strikes several folds at once.` : "Three antidotes, all on this bench: drag folds used for selection past 3 (a multi-fold mean has far lower variance), keep a final test segment that never takes part in any choice, and average the configurations near the optimum instead of taking the single best point."}`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t26 · serveLab — the publication schedule and its fallbacks
   ========================================================= */
function ServeViz() {
  const L = useL();
  const [deadline, setDeadline] = React.useState(8);    // hour the forecast must be published
  const [dataLate, setDataLate] = React.useState(1.8);    // mean hours the meter data lags
  const [featMin, setFeatMin] = React.useState(12);
  const [inferMin, setInferMin] = React.useState(4);
  const [refresh, setRefresh] = React.useState(0);        // intraday refresh interval, hours
  const [degrade, setDegrade] = React.useState(true);

  const R = React.useMemo(() => {
    const r = rng(13), DAYS = 200;
    let onTime = 0, fell = 0, missing = 0;
    for (let d = 0; d < DAYS; d++) {
      // upstream arrival: lognormal-ish, with a long tail of genuinely late days
      const late = dataLate * Math.exp(0.55 * gauss(r));
      const ready = 5 + late;                              // meters usually post after 05:00
      const finish = ready + (featMin + inferMin) / 60 * (1 + 0.25 * Math.abs(gauss(r)));
      if (finish <= deadline) onTime++;
      else if (degrade) fell++;
      else missing++;
    }
    // intraday rolling: a shorter effective horizon is simply a smaller error
    const days = 40, S = synth({ days, seed: 89, noise: 1 });
    const y = S.y, n = y.length;
    const feat = (i, h) => { const s = i % SLOTS; return [1, y[i - h] / 1000, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS), Math.pow(Math.max(0, S.temp[i] - 24), 1.25) / 10]; };
    const errAt = (h) => {
      const X = [], t = [];
      for (let i = 7 * SLOTS; i < Math.floor(n * 0.75); i++) { X.push(feat(i, h)); t.push(y[i] / 1000); }
      const b = ridge(X, t, 1e-2);
      const yt = [], p = [];
      for (let i = Math.floor(n * 0.75); i < n; i++) { yt.push(y[i]); p.push(dot(b, feat(i, h)) * 1000); }
      return wape(yt, p);
    };
    const dayAhead = errAt(96);
    const effH = refresh === 0 ? 96 : Math.max(4, Math.round((refresh * 4) / 2) + 4);
    const rolling = errAt(effH);
    const naiveErr = errAt(96 * 7);
    return { onTime: onTime / DAYS, fell: fell / DAYS, missing: missing / DAYS, dayAhead, rolling, naiveErr };
  }, [deadline, dataLate, featMin, inferMin, refresh, degrade]);

  const gain = (R.dayAhead - R.rolling) / R.dayAhead;

  return (
    <div>
      <VizHead idx="OP1" title={L("几点发布、数据几点到、迟到那天输出什么", "When it publishes, when the data arrives, and what goes out on a late day")} />
      <div className="viz-ctrl">
        <Slider label={L("必须发布的时刻", "Publication deadline")} min={5.5} max={11} step={0.25} value={deadline} onChange={setDeadline} fmt={(v) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`} />
        <Slider label={L("电表数据平均迟到", "Mean lateness of meter data")} min={0.2} max={5} step={0.1} value={dataLate} onChange={setDataLate} unit=" h" />
        <Slider label={L("特征计算耗时", "Feature build")} min={1} max={60} value={featMin} onChange={setFeatMin} unit=" min" />
        <Slider label={L("模型推理耗时", "Model inference")} min={1} max={40} value={inferMin} onChange={setInferMin} unit=" min" />
        <Slider label={L("日内滚动刷新间隔(0=不滚动)", "Intraday refresh (0 = none)")} min={0} max={8} value={refresh} onChange={setRefresh} unit=" h" />
        <Toggle label={L("失败时回落到季节朴素基线", "Fall back to the naive baseline on failure")} value={degrade} onChange={setDegrade} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("按时发布", "Published on time")} value={pct1(R.onTime)} tone={R.onTime > 0.95 ? "ok" : "warn"} />
        <Kpi label={L("降级发布", "Published degraded")} value={pct1(R.fell)} tone={R.fell > 0 ? "acc" : "ok"} hint={L(`基线误差 ${pct1(R.naiveErr)}`, `baseline error ${pct1(R.naiveErr)}`)} />
        <Kpi label={L("下游拿不到东西", "Downstream gets nothing")} value={pct1(R.missing)} tone={R.missing > 0 ? "warn" : "ok"} hint={degrade ? L("有降级路径", "a fallback exists") : L("没有降级路径", "no fallback path")} />
        <Kpi label={L("日内滚动的收益", "Gain from intraday rolling")} value={refresh ? pct1(Math.max(0, gain)) : L("未开启", "off")} tone={refresh ? "ok" : "mut"} hint={`${pct1(R.dayAhead)} → ${pct1(R.rolling)}`} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("按时,用模型", "On time, model")} value={R.onTime} max={1} tone="ok" valText={pct1(R.onTime)} />
        <Bar label={L("迟到,用基线", "Late, baseline")} value={R.fell} max={1} tone="acc" valText={pct1(R.fell)} />
        <Bar label={L("迟到,什么都没有", "Late, nothing at all")} value={R.missing} max={1} tone="warn" valText={pct1(R.missing)} />
      </div>

      <Note mark="→" tone={R.missing > 0 ? "bad" : "on"}>
        {L(`发布时刻 ${Math.floor(deadline)}:${String(Math.round((deadline % 1) * 60)).padStart(2, "0")} 不是你定的,是下游那个会定的;能不能赶上,取决于电表数据几点到齐(平均迟到 ${nf(dataLate, 1)} 小时,但尾巴很长)加上 ${featMin + inferMin} 分钟的特征与推理。${R.missing > 0 ? `你现在没有降级路径:有 ${pct1(R.missing)} 的日子下游什么都拿不到,而"什么都没有"对调度员来说比"差一点的预测"糟糕得多——他会退回手工估算,并且从此不再信任这个系统。把降级开关打开。` : `有 ${pct1(R.fell)} 的日子模型来不及,系统自动回落到季节朴素基线(误差 ${pct1(R.naiveErr)},比模型差,但远好过没有),并把这次降级记录下来。正确答案永远不是抛错。`}${refresh ? `另外你开了每 ${refresh} 小时一次的日内滚动:等效预测步长缩短,误差从 ${pct1(R.dayAhead)} 降到 ${pct1(R.rolling)},白拿 ${pct1(Math.max(0, gain))}——这是上线之后最便宜的一次精度提升,不用重训任何模型。` : `把「日内滚动刷新间隔」拖起来试试:日前预测发布之后,随着当天实际数据进来重新预测剩余时段,等效步长变短,误差会明显下降——不需要重训任何模型。`}`,
            `The ${Math.floor(deadline)}:${String(Math.round((deadline % 1) * 60)).padStart(2, "0")} deadline is not yours, it belongs to the meeting downstream, and whether you make it depends on when the meter data is complete (${nf(dataLate, 1)} hours late on average, with a long tail) plus ${featMin + inferMin} minutes of features and inference. ${R.missing > 0 ? `You have no degradation path: on ${pct1(R.missing)} of days downstream receives nothing at all — and nothing is far worse for a dispatcher than a slightly worse forecast. They fall back to estimating by hand, and they stop trusting the system from then on. Switch the fallback on.` : `On ${pct1(R.fell)} of days the model does not make it and the system falls back to the seasonal-naive baseline (${pct1(R.naiveErr)}, worse than the model and far better than nothing), recording the fallback. The right answer is never to raise an error.`}${refresh ? ` You also have intraday rolling every ${refresh} hours: the effective horizon shortens and error falls from ${pct1(R.dayAhead)} to ${pct1(R.rolling)}, ${pct1(Math.max(0, gain))} for free — the cheapest accuracy improvement available after go-live, requiring no retraining at all.` : ` Try dragging the intraday refresh up: after the day-ahead forecast publishes, re-forecasting the remaining hours as the day's actuals arrive shortens the effective horizon and drops the error noticeably — with no retraining at all.`}`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t27 · driftLab — calendar retraining against triggered retraining
   ========================================================= */
function DriftViz() {
  const L = useL();
  const [shift, setShift] = React.useState(0.28);      // size of the process change
  const [atDay, setAtDay] = React.useState(80);
  const [policy, setPolicy] = React.useState("trigger");
  const [period, setPeriod] = React.useState(30);      // calendar retraining period
  const [thresh, setThresh] = React.useState(1.35);    // trigger: error vs its own baseline

  const R = React.useMemo(() => {
    const days = 160, S = synth({ days, seed: 97, noise: 1 });
    // A new chiller is commissioned on `atDay`: the plant's RESPONSE to temperature
    // changes, not merely its level. A level shift would be absorbed by the lag
    // features within a day; a changed relationship stays wrong until someone
    // refits the coefficient — which is what drift actually looks like in a plant.
    const y = S.y.map((v, i) => (Math.floor(i / SLOTS) >= atDay ? v + shift * 5.2 * S.wx[i] : v));
    const n = y.length;
    const feat = (i) => { const s = i % SLOTS; return [1, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, mean(y.slice(i - SLOTS - 4, i - SLOTS)) / 1000, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS), Math.pow(Math.max(0, S.temp[i] - 24), 1.25) / 10]; };
    const fitAt = (endDay) => {
      const from = Math.max(7 * SLOTS, (endDay - 35) * SLOTS), to = endDay * SLOTS;
      const X = [], t = [];
      for (let i = from; i < to; i++) { X.push(feat(i)); t.push(y[i] / 1000); }
      return X.length > 40 ? ridge(X, t, 1e-2) : null;
    };
    const START = 40;
    // The calm reference is measured once, on the days before the change, with no
    // retraining at all — so every policy is judged against the same number.
    let bRef = fitAt(START);
    const calmDays = [];
    for (let d = START + 7; d < START + 21; d++) {
      const yt = [], p = [];
      for (let i = d * SLOTS; i < (d + 1) * SLOTS; i++) { yt.push(y[i]); p.push(dot(bRef, feat(i)) * 1000); }
      calmDays.push(wape(yt, p));
    }
    const CALM = mean(calmDays);
    let b = fitAt(START), retrains = 0, lastFit = START;
    const daily = [], recent = [];
    let calm = null;                                     // the trigger's own moving reference
    for (let d = START; d < days; d++) {
      const yt = [], p = [];
      for (let i = d * SLOTS; i < (d + 1) * SLOTS; i++) { yt.push(y[i]); p.push(dot(b, feat(i)) * 1000); }
      const e = wape(yt, p);
      daily.push({ x: d, y: e });
      recent.push(e); if (recent.length > 7) recent.shift();
      if (calm === null && d === START + 14) calm = mean(recent);
      let fire = false;
      if (policy === "calendar") fire = d - lastFit >= period;
      else if (policy === "trigger") fire = calm !== null && recent.length === 7 && mean(recent) > calm * thresh;
      else if (policy === "both") fire = (d - lastFit >= period) || (calm !== null && recent.length === 7 && mean(recent) > calm * thresh);
      if (fire) { const nb = fitAt(d); if (nb) { b = nb; lastFit = d; retrains++; recent.length = 0; if (d > atDay + 10) calm = null; } }
      if (calm === null && recent.length === 7 && d > lastFit + 10) calm = mean(recent);
    }
    const after = daily.filter((d) => d.x >= atDay);
    const worstDay = after.reduce((a, c) => (c.y > a.y ? c : a), after[0] || { x: 0, y: 0 });
    const recover = after.find((d) => d.x > atDay + 1 && d.y < CALM * 1.15);
    return {
      daily, retrains, mAll: mean(daily.map((d) => d.y)), mAfter: mean(after.map((d) => d.y)),
      worst: worstDay, lag: recover ? recover.x - atDay : after.length, calm: calm || 0,
    };
  }, [shift, atDay, policy, period, thresh]);

  return (
    <div>
      <VizHead idx="OP2" title={L("产线一变,误差是台阶式跳上去的,不是慢慢爬上去的", "When the line changes, error steps up — it does not creep")} />
      <div className="viz-ctrl">
        <Slider label={L("变更幅度(新增制冷机组)", "Size of the change (a new chiller)")} min={0} max={0.6} step={0.02} value={shift} onChange={setShift} fmt={pct} />
        <Slider label={L("发生在第几天", "Day it happens")} min={55} max={130} value={atDay} onChange={setAtDay} unit={L(" 天", "")} />
        <Slider label={L("定期重训周期", "Calendar retraining period")} min={7} max={90} value={period} onChange={setPeriod} unit={L(" 天", " d")} />
        <Slider label={L("触发阈值(误差是平稳期的几倍)", "Trigger threshold, × the calm level")} min={1.05} max={2.5} step={0.05} value={thresh} onChange={setThresh} fmt={(v) => `${nf(v, 2)}×`} />
        <Seg value={policy} onChange={setPolicy} options={[{ v: "none", l: L("不重训", "never") }, { v: "calendar", l: L("定期", "calendar") }, { v: "trigger", l: L("触发", "triggered") }, { v: "both", l: L("两者结合", "both") }]} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("变更后的平均误差", "Mean error after the change")} value={pct1(R.mAfter)} tone={R.mAfter > R.calm * 1.3 ? "warn" : "ok"} hint={L(`平稳期 ${pct1(R.calm)}`, `calm level ${pct1(R.calm)}`)} />
        <Kpi label={L("最坏的一天", "Worst day")} value={pct1(R.worst.y)} tone={R.worst.y > 0.2 ? "warn" : "acc"} hint={L(`第 ${R.worst.x} 天`, `day ${R.worst.x}`)} />
        <Kpi label={L("恢复用了多少天", "Days to recover")} value={R.lag} tone={R.lag > 20 ? "warn" : "ok"} />
        <Kpi label={L("重训次数", "Retrains")} value={R.retrains} tone={R.retrains > 6 ? "warn" : "ok"} hint={L("每次都要人力验证与审批", "each one costs validation and approval")} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("逐日误差(第 " + atDay + " 天产线变更)", "Daily error (the line changes on day " + atDay + ")")}</div>
        <MiniPlot data={R.daily} h={120} yMin={0} markIndex={R.daily.findIndex((d) => d.x >= atDay)} />
      </div>

      <Note mark="→" tone={policy === "none" || (policy === "trigger" && R.retrains > 6) ? "bad" : "on"}>
        {policy === "none"
          ? L(`不重训:第 ${atDay} 天新制冷机组投运,误差从 ${pct1(R.calm)} 台阶式跳到 ${pct1(R.worst.y)},然后一直停在那里——它不会自己好起来。注意这里变的不是负荷的"水平"而是"关系":厂房对温度的响应变了。水平变化其实不可怕,滞后特征一天之内就跟上了;真正会持续伤人的是关系变化,因为模型里那个温度系数是训练时拟合死的,不重训它永远是错的。这也是为什么工业时序的漂移多数是台阶而不是斜坡——它的来源是离散事件(上新设备、换型号、改排产、大修)。`,
              `Never retraining: on day ${atDay} a new chiller comes online, error steps from ${pct1(R.calm)} to ${pct1(R.worst.y)} and stays there — it does not recover on its own. Note what changed: not the level of the load but a relationship, the building's response to temperature. A level shift would not hurt for long, because the lag features catch up within a day. A changed relationship persists, because the temperature coefficient was fitted once at training time and stays wrong until somebody refits it. That is also why drift in industrial series is usually a step rather than a ramp — its causes are discrete events: new equipment, a new product type, a changed schedule, an overhaul.`)
          : policy === "calendar"
          ? L(`每 ${period} 天定期重训:简单、可预测、不需要监控,但它平均要等半个周期才响应,这次用了 ${R.lag} 天才把误差拉回来,期间最坏一天 ${pct1(R.worst.y)}。而在没有漂移的那些月份,这 ${R.retrains} 次重训里有相当一部分是白烧算力和人力。`,
              `Calendar retraining every ${period} days: simple, predictable, no monitoring required — but it waits half a period on average, took ${R.lag} days to pull the error back this time, and peaked at ${pct1(R.worst.y)} meanwhile. In the months with no drift at all, a good share of those ${R.retrains} retrains burned compute and staff time for nothing.`)
          : policy === "trigger"
          ? R.retrains > 6
            ? L(`触发阈值 ${nf(thresh, 2)}× 定得太敏感了:系统重训了 ${R.retrains} 次,平均误差 ${pct1(R.mAfter)},其中大部分触发只是日常波动而不是真漂移。每次重训都要验证、审批、上线,还要向运行人员解释模型为什么又变了——频繁重训的成本远不止算力。把阈值往上拖到 1.3–1.5 再看。`,
                `A ${nf(thresh, 2)}× trigger is too sensitive: the system retrained ${R.retrains} times for a mean error of ${pct1(R.mAfter)}, and most of those firings were ordinary fluctuation rather than real drift. Every retrain costs validation, approval, a release, and an explanation to the operators about why the model changed again — the cost of frequent retraining is far more than compute. Push the threshold up to 1.3–1.5 and look again.`)
            : L(`触发式重训:用最近 7 天的滚动误差对比平稳期水平,超过 ${nf(thresh, 2)} 倍就重训。这次它在 ${R.lag} 天内把误差拉了回来,一共只重训了 ${R.retrains} 次。代价是你得有监控——没有这套误差留档(OP1 里那件事),你连触发器都没法写。`,
                `Triggered retraining: compare the rolling seven-day error against the calm level and retrain when it exceeds ${nf(thresh, 2)}×. It recovered within ${R.lag} days here, on ${R.retrains} retrains in total. The price is that you need monitoring — without the error archive from OP1 you cannot even write the trigger.`)
          : L(`两者结合是实践中最稳的:定期重训做兜底(每 ${period} 天,防止监控本身失效),触发式做快速响应(${nf(thresh, 2)}×)。这次恢复用了 ${R.lag} 天、共 ${R.retrains} 次重训。再加一条纪律就完整了:每次重训出来的新模型必须先和线上模型做影子对比,在最近一段数据上没有显著更好就不上线。`,
              `The combination is the steadiest arrangement in practice: calendar retraining as a floor (every ${period} days, in case the monitoring itself fails) and a trigger for fast response (${nf(thresh, 2)}×). Recovery took ${R.lag} days across ${R.retrains} retrains. One discipline completes it: every retrained model runs in shadow against the incumbent first, and does not ship unless it is significantly better on recent data.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t28 · opsLab — the alert threshold is an ROC problem
   ========================================================= */
function OpsViz() {
  const L = useL();
  const [perShift, setPerShift] = React.useState(3);      // alerts an operator will tolerate
  const [severity, setSeverity] = React.useState(0.22);   // how large a real fault looks
  const [rate, setRate] = React.useState(1.2);            // real faults per week
  const [tiered, setTiered] = React.useState(true);

  const R = React.useMemo(() => {
    const days = 120, S = synth({ days, seed: 101, noise: 1 });
    const y = S.y.slice(), n = y.length, r = rng(19);
    const faults = [];
    for (let d = 10; d < days; d++) if (r() < (rate / 7)) {
      const st = d * SLOTS + 30 + Math.floor(r() * 40), len = 4 + Math.floor(r() * 10);
      for (let i = st; i < Math.min(n, st + len); i++) y[i] *= 1 + severity;
      faults.push({ st, len });
    }
    const feat = (i) => { const s = i % SLOTS; return [1, S.y[i - SLOTS] / 1000, S.y[i - 7 * SLOTS] / 1000, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS)]; };
    const X = [], t = [];
    for (let i = 7 * SLOTS; i < Math.floor(n * 0.5); i++) { X.push(feat(i)); t.push(S.y[i] / 1000); }
    const b = ridge(X, t, 1e-2);
    const from = Math.floor(n * 0.5);
    const res = [];
    for (let i = from; i < n; i++) res.push({ i, z: (y[i] - dot(b, feat(i)) * 1000) });
    const sg = sd(res.map((x) => x.z));
    const isFault = (i) => faults.some((f) => i >= f.st && i < f.st + f.len);
    const inWindow = faults.filter((f) => f.st >= from && f.st < n);   // the rest happened before we were watching
    const roc = [];
    for (let k = 0.6; k <= 6; k += 0.1) {
      let tp = 0, fp = 0, fnn = 0;
      const hit = new Set();
      for (const x of res) {
        const fired = x.z > k * sg;
        if (fired) { if (isFault(x.i)) hit.add(faults.findIndex((f) => x.i >= f.st && x.i < f.st + f.len)); else fp++; }
      }
      tp = hit.size; fnn = inWindow.length - tp;
      const shifts = ((n - from) / SLOTS) * 3;
      roc.push({ k, tpr: inWindow.length ? tp / inWindow.length : 0, fpShift: fp / shifts, fp, tp, fn: fnn });
    }
    // pick the threshold that respects the operator's tolerance
    const usable = roc.filter((p) => p.fpShift <= perShift);
    const chosen = usable.length ? usable.reduce((a, c) => (c.tpr > a.tpr ? c : a)) : roc[roc.length - 1];
    const threeSigma = roc.reduce((a, c) => (Math.abs(c.k - 3) < Math.abs(a.k - 3) ? c : a));
    return { roc, chosen, threeSigma, faults: inWindow.length, sg };
  }, [perShift, severity, rate, tiered]);

  const pushed = tiered ? R.chosen.fpShift * 0.35 : R.chosen.fpShift;

  return (
    <div>
      <VizHead idx="OP3" title={L("先定每班能忍几条,再回推阈值——不是反过来", "Decide how many alerts a shift tolerates, then derive the threshold — not the other way round")} />
      <div className="viz-ctrl">
        <Slider label={L("每班可接受的告警条数", "Alerts a shift will tolerate")} min={0.5} max={12} step={0.5} value={perShift} onChange={setPerShift} />
        <Slider label={L("真实故障的幅度", "How large a real fault is")} min={0.06} max={0.6} step={0.02} value={severity} onChange={setSeverity} fmt={pct} />
        <Slider label={L("真实故障频率", "Real faults per week")} min={0.2} max={5} step={0.2} value={rate} onChange={setRate} />
        <Toggle label={L("分级告警(只推最高级)", "Tiered alerts (push only the top tier)")} value={tiered} onChange={setTiered} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("由容忍度反推的阈值", "Threshold your tolerance implies")} value={`${nf(R.chosen.k, 1)}σ`} tone="ok" hint={L(`残差 σ = ${kw(R.sg)}`, `residual σ = ${kw(R.sg)}`)} />
        <Kpi label={L("能抓到的故障", "Faults caught")} value={pct1(R.chosen.tpr)} tone={R.chosen.tpr > 0.7 ? "ok" : "warn"} hint={L(`共 ${R.faults} 次`, `${R.faults} in total`)} />
        <Kpi label={L("每班推送条数", "Alerts pushed per shift")} value={nf(pushed, 1)} tone={pushed > perShift ? "warn" : "ok"} hint={tiered ? L("分级后只推最高级", "only the top tier is pushed") : L("全部推给人", "everything goes to a person")} />
        <Kpi label={L("若照搬 3σ", "If you just used 3σ")} value={`${pct1(R.threeSigma.tpr)} / ${nf(R.threeSigma.fpShift, 1)}`} tone={R.threeSigma.fpShift > perShift ? "warn" : "acc"} hint={L("抓到率 / 每班误报", "caught / false per shift")} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("抓到率随阈值(虚线=你的容忍度所对应的那一点)", "Detection rate against threshold (dashed = the point your tolerance implies)")}</div>
        <MiniPlot data={R.roc.map((p) => ({ x: p.k, y: p.tpr }))} h={100} yMin={0} yMax={1} markIndex={R.roc.findIndex((p) => p.k >= R.chosen.k)} />
        <div className="ts-cap">{L("每班误报条数随阈值", "False alerts per shift against threshold")}</div>
        <MiniPlot data={R.roc.map((p) => ({ x: p.k, y: p.fpShift }))} h={100} yMin={0} stroke="var(--accent)" markIndex={R.roc.findIndex((p) => p.k >= R.chosen.k)} />
      </div>

      <Note mark="→" tone={pushed > perShift ? "bad" : "on"}>
        {L(`告警不是一个"定个 3σ 看看效果"的问题,它是一个 ROC 问题,而且约束来自人而不是统计:运行人员每班能认真看几条?这里设的是 ${nf(perShift, 1)} 条,回推出来的阈值是 ${nf(R.chosen.k, 1)}σ,对应抓到 ${pct1(R.chosen.tpr)} 的真实异常。照搬 3σ 的话是 ${pct1(R.threeSigma.tpr)} 的抓到率、每班 ${nf(R.threeSigma.fpShift, 1)} 条误报——${R.threeSigma.fpShift > perShift ? "超出容忍度,两周之后没人会再点开它,这个系统就等于不存在了。" : "在容忍度之内,但它是碰巧对,不是算出来对。"}${tiered ? `分级告警把推送量压到每班 ${nf(pushed, 1)} 条:只有最高级推到人,其余留在看板上——这是在不牺牲抓到率的前提下唯一能压住告警疲劳的办法。` : "把分级告警打开:提示/预警/立即处理分开,只有最高级推到人,其余进看板。"}告警疲劳是一个可以用数字管理的指标,不是一个态度问题。`,
            `Alerting is not a matter of trying three sigma and seeing what happens; it is an ROC problem whose binding constraint is human rather than statistical: how many alerts will an operator read properly in a shift? Set to ${nf(perShift, 1)} here, the implied threshold is ${nf(R.chosen.k, 1)}σ and catches ${pct1(R.chosen.tpr)} of real anomalies. Three sigma would give ${pct1(R.threeSigma.tpr)} detection at ${nf(R.threeSigma.fpShift, 1)} false alerts per shift — ${R.threeSigma.fpShift > perShift ? "past the tolerance, so within a fortnight nobody opens them and the system effectively ceases to exist." : "inside the tolerance, but by luck rather than by calculation."}${tiered ? ` Tiering holds the pushed volume to ${nf(pushed, 1)} per shift: only the top tier reaches a person and the rest stay on a dashboard — the only way to hold alert fatigue down without sacrificing detection.` : " Switch tiered alerts on: separate notice, warning and act-now, push only the top tier and leave the rest on a dashboard."} Alert fatigue is a quantity you manage with numbers, not an attitude problem.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t29 · caseLab — an injection-moulding plant's demand-charge ledger
   ========================================================= */
function CaseViz() {
  const L = useL();
  const [target, setTarget] = React.useState(2100);      // the demand cap you are defending, kW
  const [skill, setSkill] = React.useState(0.85);         // how good the forecast is at peak timing
  const [shave, setShave] = React.useState(140);          // kW removable by staggering
  const [falseCost, setFalseCost] = React.useState(800); // cost of a shave that was not needed
  const [rate, setRate] = React.useState(42);            // yuan per kW of billed demand
  const [sysCost, setSysCost] = React.useState(52000);   // one-off build cost

  const R = React.useMemo(() => {
    const days = 30, S = synth({ days, seed: 107, noise: 1.05, shift: 1.15 });
    const y = S.y, n = y.length, r = rng(23);
    // demand is billed on the largest 15-minute interval mean in the month
    const billedNo = Math.max(...y);
    // The controller acts on a forecast. `skill` is the chance it correctly flags
    // a window that will actually approach the cap; the rest of the time it either
    // misses the real one or fires on a window that was never going to breach.
    // Real demand control does not defend a line, it defends the month's running
    // maximum: acting on a window that cannot set a new record saves nothing and
    // still costs you the production you deferred.
    let billed = 0, acts = 0, falses = 0, hits = 0, misses = 0;
    const series = [];
    for (let i = 0; i < n; i++) {
      const bar = Math.max(target, billed - 15);       // only a new record is worth acting on
      const worthIt = y[i] > bar;
      const flagged = worthIt ? r() < skill : r() < (1 - skill) * 0.012;
      let v = y[i];
      if (flagged) { acts++; v = Math.max(0, v - shave); if (worthIt) hits++; else falses++; }
      else if (worthIt) misses++;
      billed = Math.max(billed, v);
      series.push({ x: i, y: v });
    }
    const savedKw = billedNo - billed;
    const monthSave = savedKw * rate;
    const monthFalse = falses * falseCost;
    const net = monthSave - monthFalse;
    const payback = net > 0 ? sysCost / net : Infinity;
    return { billedNo, billed, savedKw, monthSave, monthFalse, net, payback, acts, falses, hits, misses, series, breaches: y.filter((v) => v > target).length };
  }, [target, skill, shave, falseCost, rate, sysCost]);

  return (
    <div>
      <VizHead idx="CS1" title={L("一个月只有一个十五分钟在计费,而你要提前 24 小时找到它", "One fifteen-minute window a month is billable, and you must find it a day ahead")} />
      <div className="viz-ctrl">
        <Slider label={L("需量目标", "Demand target you defend")} min={1700} max={2400} step={10} value={target} onChange={setTarget} unit=" kW" />
        <Slider label={L("峰值时刻命中率", "Peak-timing hit rate")} min={0.2} max={1} step={0.02} value={skill} onChange={setSkill} fmt={pct} />
        <Slider label={L("一次错峰能削掉", "Load removable per action")} min={20} max={260} step={5} value={shave} onChange={setShave} unit=" kW" />
        <Slider label={L("一次误判的生产损失", "Cost of one false trigger")} min={0} max={4000} step={100} value={falseCost} onChange={setFalseCost} fmt={(v) => yuan(v)} />
        <Slider label={L("需量电价", "Demand charge")} min={20} max={60} value={rate} onChange={setRate} fmt={(v) => `¥${v}/kW`} />
        <Slider label={L("系统一次性投入", "One-off build cost")} min={10000} max={200000} step={5000} value={sysCost} onChange={setSysCost} fmt={(v) => yuan(v)} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("不控时的月最大需量", "Monthly peak demand, uncontrolled")} value={kw(R.billedNo)} tone="warn" hint={L(`${R.breaches} 个窗口超过目标 · 共 ${R.acts} 次动作`, `${R.breaches} windows above target, ${R.acts} actions`)} />
        <Kpi label={L("控制后的计费需量", "Billed demand after control")} value={kw(R.billed)} tone={R.savedKw > 0 ? "ok" : "warn"} hint={L(`削掉 ${kw(R.savedKw)}`, `${kw(R.savedKw)} removed`)} />
        <Kpi label={L("月净收益", "Monthly net benefit")} value={yuan(R.net)} tone={R.net > 0 ? "ok" : "warn"} hint={L(`省 ${yuan(R.monthSave)} − 误判 ${yuan(R.monthFalse)}`, `${yuan(R.monthSave)} saved − ${yuan(R.monthFalse)} in false triggers`)} />
        <Kpi label={L("回收期", "Payback")} value={isFinite(R.payback) ? `${nf(R.payback, 1)} ${L("个月", "months")}` : L("收不回", "never")} tone={R.payback < 12 ? "ok" : "warn"} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("命中的削峰(真的要越限)", "Shaves that were needed")} value={R.hits} max={Math.max(R.acts, R.misses, 1)} tone="ok" valText={`${R.hits}`} />
        <Bar label={L("误判的削峰(白停了产)", "False shaves (production stopped for nothing)")} value={R.falses} max={Math.max(R.acts, R.misses, 1)} tone="warn" valText={`${R.falses} · ${yuan(R.monthFalse)}`} />
        <Bar label={L("漏掉的越限(没拦住)", "Breaches missed")} value={R.misses} max={Math.max(R.acts, R.misses, 1)} tone="warn" valText={`${R.misses}`} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("控制后的月负荷曲线(计费只看最高的那一个点)", "The controlled month (billing looks only at the single highest point)")}</div>
        <MiniPlot data={R.series.filter((_, i) => i % 4 === 0)} h={110} yMin={0} />
      </div>

      <Note mark="→" tone={R.net > 0 ? "on" : "bad"}>
        {L(`这一章的全部张力在这里:一个月 2880 个十五分钟窗口,只有最高的那一个在计费。所以"平均误差"几乎不值钱,值钱的是峰值时刻命中率——现在是 ${pct(skill)},计费需量从 ${kw(R.billedNo)} 压到 ${kw(R.billed)},按 ¥${rate}/kW 每月省 ${yuan(R.monthSave)};扣掉 ${R.falses} 次误判造成的 ${yuan(R.monthFalse)} 生产损失,净收益 ${yuan(R.net)},${isFinite(R.payback) ? `${nf(R.payback, 1)} 个月回本` : "收不回投入"}。现在做一个对比实验:把命中率从 ${pct(skill)} 拖到 ${pct(Math.min(1, skill + 0.15))},再想想把 MAPE 从 6% 优化到 4% 要花多少工作量——前者通常容易得多,收益却大得多。这就是 SG2 和 EV2 那两章反复讲的同一件事:先确定后果,由后果选指标,别让教程默认的 MSE 替你做决定。`,
            `The whole tension of this chapter sits here: of 2,880 fifteen-minute windows in a month, exactly one is billed. So average error is nearly worthless and peak-timing accuracy is what pays — at ${pct(skill)} here, billed demand falls from ${kw(R.billedNo)} to ${kw(R.billed)}, worth ${yuan(R.monthSave)} a month at ¥${rate}/kW. Net of ${yuan(R.monthFalse)} in production loss from ${R.falses} false triggers, the benefit is ${yuan(R.net)} a month${isFinite(R.payback) ? `, paying back in ${nf(R.payback, 1)} months` : ", which never pays back"}. Now run the comparison: drag peak-timing accuracy from ${pct(skill)} to ${pct(Math.min(1, skill + 0.15))}, then think about what it would take to move MAPE from 6% to 4%. The first is usually far easier and worth considerably more. That is the same point SG2 and EV2 kept making: fix the consequence first, let it choose the metric, and do not let a tutorial's default MSE decide for you.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t30 · planLab — fourteen days, with the constraints that actually bite
   ========================================================= */
const PLAN = [
  { k: "audit", d: 2, zh: "数据体检:画曲线、查缺失、对时标", en: "Data health check: plot, gaps, timestamps", dep: [], qual: 2.2, site: 1.8, gpu: 0 },
  { k: "base", d: 1, zh: "建立朴素基线,拿到及格线", en: "Baselines, and your pass mark", dep: ["audit"], qual: 1, site: 0, gpu: 0 },
  { k: "feat", d: 2, zh: "特征 + 时间切分回测框架 + 泄漏检查", en: "Features, time-split backtest, leakage checklist", dep: ["base"], qual: 1.3, site: 0, gpu: 0 },
  { k: "model", d: 2, zh: "第一版 LightGBM + 滚动回测", en: "First LightGBM, rolling backtest", dep: ["feat"], qual: 1.1, site: 0, gpu: 0 },
  { k: "zero", d: 0.5, zh: "零样本基础模型对照", en: "Zero-shot foundation-model comparison", dep: ["feat"], qual: 1, site: 0, gpu: 0 },
  { k: "tune", d: 2, zh: "超参搜索 / 必要时微调(Kaggle)", en: "Tuning, or fine-tuning on Kaggle", dep: ["model"], qual: 1, site: 0, gpu: 2.4 },
  { k: "quant", d: 1, zh: "分位数预测与阈值", en: "Quantiles and thresholds", dep: ["model"], qual: 1, site: 0, gpu: 0 },
  { k: "serve", d: 1, zh: "推理服务 + 降级路径", en: "Inference service and fallbacks", dep: ["tune", "quant"], qual: 1, site: 0.4, gpu: 0 },
  { k: "integ", d: 1, zh: "接上位系统,端到端联调", en: "Integrate with the plant system, end to end", dep: ["serve"], qual: 1, site: 3.2, gpu: 0 },
  { k: "shadow", d: 1.5, zh: "影子运行并交付", en: "Shadow run and hand over", dep: ["integ"], qual: 1, site: 1.2, gpu: 0 },
];
function PlanViz() {
  const L = useL();
  const lang = useLang();
  const [people, setPeople] = React.useState(1);
  const [dataQ, setDataQ] = React.useState(0.12);        // 0 = pristine, 1 = a mess
  const [siteResp, setSiteResp] = React.useState(0.12);  // 0 = instant, 1 = unreachable
  const [hasGpu, setHasGpu] = React.useState(false);

  const R = React.useMemo(() => {
    const dur = {}, tasks = PLAN.map((t) => {
      let d = t.d * (1 + (t.qual - 1) * dataQ * 1.4) * (1 + t.site * siteResp * 0.9);
      if (t.gpu) d *= hasGpu ? 1 : t.gpu;
      dur[t.k] = d;
      return { ...t, dur: d };
    });
    // earliest finish under dependencies, then squeezed by how many people there are
    const fin = {};
    const resolve = (k) => {
      if (fin[k] != null) return fin[k];
      const t = tasks.find((x) => x.k === k);
      const start = t.dep.length ? Math.max(...t.dep.map(resolve)) : 0;
      fin[k] = start + t.dur;
      return fin[k];
    };
    tasks.forEach((t) => resolve(t.k));
    const critical = Math.max(...Object.values(fin));
    const totalWork = tasks.reduce((s, t) => s + t.dur, 0);
    const days = Math.max(critical, totalWork / people);
    // which single task, if it doubled, would push the finish out the most
    const risk = tasks.map((t) => {
      const f2 = {}, res2 = (k) => {
        if (f2[k] != null) return f2[k];
        const x = tasks.find((z) => z.k === k);
        const st = x.dep.length ? Math.max(...x.dep.map(res2)) : 0;
        f2[k] = st + (k === t.k ? x.dur * 2 : x.dur);
        return f2[k];
      };
      tasks.forEach((x) => res2(x.k));
      return { ...t, impact: Math.max(...Object.values(f2)) - critical };
    }).sort((a, b) => b.impact - a.impact);
    return { tasks, fin, critical, days, risk, totalWork };
  }, [people, dataQ, siteResp, hasGpu]);

  const maxD = Math.max(...R.tasks.map((t) => R.fin[t.k]));

  return (
    <div>
      <VizHead idx="CS2" title={L("从一个 CSV 和一个 Kaggle 账号,到每天早上七点自动出预测", "From a CSV and a Kaggle account to a forecast at seven every morning")} />
      <div className="viz-ctrl">
        <Slider label={L("投入人力", "People on it")} min={1} max={4} step={0.5} value={people} onChange={setPeople} unit={L(" 人", "")} />
        <Slider label={L("数据有多乱", "How messy the data is")} min={0} max={1} step={0.05} value={dataQ} onChange={setDataQ} fmt={pct} />
        <Slider label={L("现场配合度(越大越难约)", "How hard the site is to reach")} min={0} max={1} step={0.05} value={siteResp} onChange={setSiteResp} fmt={pct} />
        <Toggle label={L("有可用的 GPU", "A GPU is available")} value={hasGpu} onChange={setHasGpu} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("完成需要", "Time to finish")} value={`${nf(R.days, 1)} ${L("天", "days")}`} tone={R.days > 16 ? "warn" : "ok"} hint={L(`关键路径 ${nf(R.critical, 1)} 天`, `critical path ${nf(R.critical, 1)} d`)} />
        <Kpi label={L("总工作量", "Total work")} value={`${nf(R.totalWork, 1)} ${L("人天", "person-days")}`} tone="acc" />
        <Kpi label={L("延期风险最高的环节", "Highest delay risk")} value={pick(lang, R.risk[0]).split(":")[0].slice(0, 12)} tone="warn" hint={L(`翻倍就晚 ${nf(R.risk[0].impact, 1)} 天`, `doubling it costs ${nf(R.risk[0].impact, 1)} d`)} />
        <Kpi label={L("第二风险", "Second highest")} value={pick(lang, R.risk[1]).split(":")[0].slice(0, 12)} tone="acc" hint={L(`${nf(R.risk[1].impact, 1)} 天`, `${nf(R.risk[1].impact, 1)} d`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        {R.tasks.map((t) => (
          <Bar key={t.k} label={pick(lang, t)} value={R.fin[t.k]} max={maxD * 1.05}
            tone={R.risk[0].k === t.k ? "warn" : t.gpu && !hasGpu ? "acc" : "ok"}
            valText={L(`第 ${nf(R.fin[t.k] - t.dur, 1)}–${nf(R.fin[t.k], 1)} 天`, `d ${nf(R.fin[t.k] - t.dur, 1)}–${nf(R.fin[t.k], 1)}`)} />
        ))}
      </div>

      <Note mark="→" tone={R.days > 16 ? "bad" : "on"}>
        {L(`这份计划在当前约束下要 ${nf(R.days, 1)} 天。注意排在最前面的两个风险:「${pick(lang, R.risk[0]).split(":")[0]}」和「${pick(lang, R.risk[1]).split(":")[0]}」——它们都不是建模。数据体检被拖长是因为你在等现场确认那些零到底是停机还是通信中断(DT2),现场联调被拖长是因为接口、权限和停机窗口都要排队。真正做模型的那几天反而最可控,因为它们只取决于你自己。${hasGpu ? "" : "你现在没有 GPU,微调那一步按 Kaggle 的配额和会话墙折算,被拉长了 2.4 倍——如果这一步在关键路径上,花几十块钱租一张卡是整份计划里性价比最高的一笔支出。"}把「数据有多乱」拖到 100% 再看:十四天会变成二十天以上,而多出来的全部在前两天那一栏里。这就是为什么本书把 DT 模块放在所有模型之前。`,
            `Under these constraints the plan takes ${nf(R.days, 1)} days. Look at the top two risks: "${pick(lang, R.risk[0]).split(":")[0]}" and "${pick(lang, R.risk[1]).split(":")[0]}" — neither is modelling. The data health check stretches because you are waiting for the site to confirm whether those zeros are shutdowns or dropouts (DT2), and the end-to-end integration stretches because interfaces, permissions and a shutdown window all have to be queued for. The modelling days are the most predictable of all, because they depend only on you. ${hasGpu ? "" : "You have no GPU, so the fine-tuning step is stretched 2.4× by Kaggle's quota and session wall — and if that step sits on the critical path, renting a card for the price of a lunch is the highest-return money in this entire plan. "}Now drag "how messy the data is" to 100%: fourteen days becomes more than twenty, and every extra day lands in the first row. That is why this book puts the DT module ahead of every model.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   registry — pages.jsx renders <Viz name={chapter.viz} />
   ========================================================= */
const VIZ = Object.assign({},
  window.__TS_VIZ_1 || {},
  window.__TS_VIZ_2 || {},
  window.__TS_VIZ_3 || {},
  {
    tuneLab: TuneViz, serveLab: ServeViz, driftLab: DriftViz,
    opsLab: OpsViz, caseLab: CaseViz, planLab: PlanViz,
  });

function Viz({ name }) {
  const C = VIZ[name];
  if (!C) return null;
  return <div className="ts-viz"><C /></div>;
}

window.__TS_VIZ_4 = { tuneLab: TuneViz, serveLab: ServeViz, driftLab: DriftViz, opsLab: OpsViz, caseLab: CaseViz, planLab: PlanViz };
window.VIZ = VIZ;
window.Viz = Viz;
