/* =========================================================
   viz3.jsx — benches for Modules V–VII (t17–t24)
   ---------------------------------------------------------
   Reuses the prelude and domain helpers from viz.jsx.
   Exported as window.__TS_VIZ_3.
   ========================================================= */

/* =========================================================
   t17 · tsfmLab — zero-shot transfer, local training, fine-tuning
   ---------------------------------------------------------
   A foundation model cannot run in this page, but the thing the
   chapter actually argues about CAN be measured: a model that
   learned from OTHER plants and is applied to yours without
   touching your data, against one trained only on your data,
   against the first one nudged by your data. All three are
   fitted live below.
   ========================================================= */
function TsfmViz() {
  const L = useL();
  const [localDays, setLocalDays] = React.useState(3);
  const [corpus, setCorpus] = React.useState(24);
  const [oddity, setOddity] = React.useState(0.3);      // how unlike the corpus this plant is
  const [ftStrength, setFtStrength] = React.useState(0.5);

  const R = React.useMemo(() => {
    const TEST_DAYS = 5, SPAN = 46;
    const featOf = (y, temp, i, sc) => {
      const s = i % SLOTS;
      // one coefficient per hour of the day, which is what a model with real
      // capacity looks like — and what makes a short history genuinely short
      const hod = Array.from({ length: 24 }, (_, h) => (Math.floor(s / 4) === h ? 1 : 0));
      return [1, y[i - SLOTS] / sc, y[i - 7 * SLOTS] / sc, y[i - 2 * SLOTS] / sc, mean(y.slice(i - SLOTS - 4, i - SLOTS)) / sc,
              Math.pow(Math.max(0, temp[i] - 24), 1.25) / 10, ...hod,
              ...hod.map((v) => v * (y[i - SLOTS] / sc))];
    };
    // the "pretraining corpus": other plants, none of them yours
    const PX = [], PY = [];
    for (let k = 0; k < corpus; k++) {
      const r = rng(700 + k);
      const S = synth({ days: 30, seed: 700 + k, shift: 0.8 + 0.5 * r(), noise: 1, weekend: 0.2 + 0.5 * r() });
      const sc = mean(S.y);
      for (let i = 7 * SLOTS; i < S.y.length; i++) { PX.push(featOf(S.y, S.temp, i, sc)); PY.push(S.y[i] / sc); }
    }
    const bPre = ridge(PX, PY, 1e-2);

    // your plant — deliberately a little unlike the corpus
    const mine = synth({ days: SPAN, seed: 909, shift: 1 + oddity * 0.9, noise: 1, weekend: clamp(0.35 - oddity * 0.3, 0.05, 0.9) });
    const y = mine.y, n = y.length, testFrom = (SPAN - TEST_DAYS) * SLOTS;
    const sc = mean(y.slice(0, testFrom));
    const trainFrom = Math.max(7 * SLOTS, testFrom - localDays * SLOTS);
    const Xtr = [], ttr = [];
    for (let i = trainFrom; i < testFrom; i++) { Xtr.push(featOf(y, mine.temp, i, sc)); ttr.push(y[i] / sc); }
    const Xte = [], tte = [];
    for (let i = testFrom; i < n; i++) { Xte.push(featOf(y, mine.temp, i, sc)); tte.push(y[i] / sc); }
    const back = (v) => v * sc;

    // 1) zero-shot: the corpus model, never shown a row of your data
    const zero = wape(tte.map(back), Xte.map((x) => back(dot(bPre, x))));
    // 2) local: trained only on your (short) history
    const bLoc = ridge(Xtr, ttr, 1e-2);
    const local = Xtr.length > 60 ? wape(tte.map(back), Xte.map((x) => back(dot(bLoc, x)))) : NaN;
    // 3) fine-tuning: start FROM the corpus model and let your data move it.
    //    Ridge toward a prior: fit the residual the corpus model leaves behind.
    const resid = ttr.map((v, i) => v - dot(bPre, Xtr[i]));
    const lamFt = 0.02 / Math.max(0.02, ftStrength);
    const dB = Xtr.length > 4 ? ridge(Xtr, resid, lamFt) : bPre.map(() => 0);
    const bFt = bPre.map((v, i) => v + dB[i]);
    const fine = wape(tte.map(back), Xte.map((x) => back(dot(bFt, x))));
    // how much your data moved the corpus model
    const moved = Math.sqrt(dB.reduce((s, v) => s + v * v, 0)) / Math.max(1e-9, Math.sqrt(bPre.reduce((s, v) => s + v * v, 0)));
    return { zero, local, fine, rows: Xtr.length, moved, corpusRows: PX.length };
  }, [localDays, corpus, oddity, ftStrength]);

  const best = [["zero", R.zero], ["local", R.local], ["fine", R.fine]].filter((x) => isFinite(x[1])).reduce((a, b) => (b[1] < a[1] ? b : a));
  const mx = Math.max(R.zero, isFinite(R.local) ? R.local : 0, R.fine) * 1.15;

  return (
    <div>
      <VizHead idx="DL3" title={L("零样本 / 本地训练 / 微调:三条路线在同一份数据上", "Zero-shot, local training, fine-tuning — on the same data")} />
      <div className="viz-ctrl">
        <Slider label={L("你自己的历史长度", "Your own history")} min={1} max={30} value={localDays} onChange={setLocalDays} unit={L(" 天", " d")} />
        <Slider label={L("预训练语料里的工厂数", "Plants in the pretraining corpus")} min={2} max={48} step={2} value={corpus} onChange={setCorpus} />
        <Slider label={L("你这条产线有多特殊", "How unlike the corpus your line is")} min={0} max={1} step={0.05} value={oddity} onChange={setOddity} fmt={pct} />
        <Slider label={L("微调强度", "Fine-tuning strength")} min={0.05} max={1} step={0.05} value={ftStrength} onChange={setFtStrength} fmt={pct} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("零样本(不碰你的数据)", "Zero-shot (never sees your data)")} value={pct1(R.zero)} tone={best[0] === "zero" ? "ok" : "acc"} hint={L("0 分钟训练 · 0 元 · 无需 GPU", "0 min, 0 cost, no GPU")} />
        <Kpi label={L("只用你自己的历史", "Trained on your history alone")} value={isFinite(R.local) ? pct1(R.local) : L("数据不足", "not enough data")} tone={best[0] === "local" ? "ok" : "warn"} hint={L(`${R.rows} 行训练数据`, `${R.rows} training rows`)} />
        <Kpi label={L("在语料模型上微调", "Fine-tuned from the corpus model")} value={pct1(R.fine)} tone={best[0] === "fine" ? "ok" : "acc"} hint={L(`你的数据把它挪动了 ${pct1(R.moved)}`, `your data moved it ${pct1(R.moved)}`)} />
        <Kpi label={L("该走哪条", "Which route")} value={best[0] === "zero" ? L("零样本就够", "zero-shot is enough") : best[0] === "fine" ? L("值得微调", "fine-tune") : L("自己训", "train locally")} tone="ok" />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("零样本迁移", "Zero-shot transfer")} value={R.zero} max={mx} tone={best[0] === "zero" ? "ok" : "acc"} valText={pct1(R.zero)} />
        <Bar label={L("只用自己的历史", "Local history only")} value={isFinite(R.local) ? R.local : mx} max={mx} tone={best[0] === "local" ? "ok" : "warn"} valText={isFinite(R.local) ? pct1(R.local) : "—"} />
        <Bar label={L("微调", "Fine-tuned")} value={R.fine} max={mx} tone={best[0] === "fine" ? "ok" : "acc"} valText={pct1(R.fine)} />
      </div>

      <Note mark="→" tone="on">
        {L(`只有 ${localDays} 天历史(${R.rows} 行)时,自己训出来的模型是 ${isFinite(R.local) ? pct1(R.local) : "不可用"},而一个完全没见过你这条产线的语料模型是 ${pct1(R.zero)}——它把 ${nf(R.corpusRows, 0)} 行别的工厂的数据里学到的日周期、温度响应和班次形状直接借给了你。这就是零样本基础模型真正在卖的东西,也是为什么本章的第一步永远是「先零样本跑一把」:不要钱、不要 GPU、五分钟出结果。${R.fine < R.zero ? `在这个配置下微调把它进一步压到 ${pct1(R.fine)},你的数据只把模型挪动了 ${pct1(R.moved)} 就换来了这一点——而微调是全书第一个真正需要 GPU 的动作。` : `注意这里微调反而更差(${pct1(R.fine)}):数据太少的时候,你的 ${R.rows} 行把一个在五万行上学出来的先验硬拽了 ${pct1(R.moved)},拽向的是你这三天的噪声。把「微调强度」调小、或者等历史攒够再微调——"能微调"和"该微调"是两件事。`}把历史拖到 20 天以上再看:数据一多,本地模型就追上来了,零样本的优势随之消失。把「有多特殊」拖到 80%,零样本会明显掉队——语料里没有像你这样的工厂,借不到力。`,
            `With only ${localDays} days of history (${R.rows} rows) a locally trained model scores ${isFinite(R.local) ? pct1(R.local) : "nothing usable"}, while a corpus model that has never seen your line scores ${pct1(R.zero)} — lending you the daily cycle, temperature response and shift shape it learned from ${nf(R.corpusRows, 0)} rows belonging to other plants. That is what a zero-shot foundation model is actually selling, and why this chapter's first step is always to run zero-shot: no money, no GPU, five minutes to a number. ${R.fine < R.zero ? `In this configuration fine-tuning takes it further, to ${pct1(R.fine)}, with your data moving the model only ${pct1(R.moved)} to get there — and fine-tuning is the first action in this book that genuinely needs a GPU.` : `Note that fine-tuning here makes things worse (${pct1(R.fine)}): with too little data, your ${R.rows} rows drag a prior learned from fifty thousand rows by ${pct1(R.moved)} — toward the noise in your three days. Turn the fine-tuning strength down, or wait until you have more history. Being able to fine-tune and being right to fine-tune are different things.`} Now drag your history past 20 days: with enough data the local model catches up and the zero-shot advantage disappears. Drag "how unlike the corpus" to 80% and zero-shot falls away — there is no plant like yours in the corpus, so there is nothing to borrow.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t18 · trainLab — the VRAM arithmetic that decides your card
   ========================================================= */
const CARDS = [
  { k: "t4", name: "Kaggle T4", gb: 15, note: { zh: "免费,每周 30 小时", en: "free, 30 h a week" } },
  { k: "p100", name: "Kaggle P100", gb: 16, note: { zh: "免费,单卡更快", en: "free, faster single card" } },
  { k: "4090", name: "RTX 4090", gb: 24, note: { zh: "按小时租,无会话墙", en: "hourly rental, no session wall" } },
  { k: "a100", name: "A100 40G", gb: 40, note: { zh: "贵,但能塞下大模型", en: "expensive, fits the big ones" } },
];
function TrainViz() {
  const L = useL();
  const lang = useLang();
  const [paramsM, setParamsM] = React.useState(200);   // millions
  const [batch, setBatch] = React.useState(32);
  const [seqLen, setSeqLen] = React.useState(1024);
  const [hidden, setHidden] = React.useState(768);
  const [layers, setLayers] = React.useState(12);
  const [bf16, setBf16] = React.useState(true);
  const [lora, setLora] = React.useState(false);
  const [ckpt, setCkpt] = React.useState(false);

  const P = paramsM * 1e6;
  const bytes = bf16 ? 2 : 4;
  const trainable = lora ? P * 0.012 : P;              // LoRA touches about 1% of the weights
  const wG = (P * bytes) / 1e9;                        // weights
  const gG = (trainable * bytes) / 1e9;                // gradients
  const oG = (trainable * 8) / 1e9;                    // Adam keeps two fp32 moments
  // activations: roughly batch x seq x hidden x layers x a constant for the
  // intermediate tensors kept for the backward pass
  const actRaw = (batch * seqLen * hidden * layers * 12 * bytes) / 1e9;
  const aG = ckpt ? actRaw * 0.22 + (batch * seqLen * hidden * bytes) / 1e9 : actRaw;
  const total = wG + gG + oG + aG;
  const infer = wG + (batch * seqLen * hidden * bytes) / 1e9;
  const ratio = total / Math.max(1e-9, wG);

  const fits = CARDS.map((c) => ({ ...c, ok: total < c.gb * 0.92, inferOk: infer < c.gb * 0.92 }));
  const firstFit = fits.find((c) => c.ok);

  return (
    <div>
      <VizHead idx="DL4" title={L("显存四项:参数、梯度、优化器状态、激活", "Four memory terms: weights, gradients, optimiser state, activations")} />
      <div className="viz-ctrl">
        <Slider label={L("参数量", "Parameters")} min={5} max={1200} step={5} value={paramsM} onChange={setParamsM} unit=" M" />
        <Slider label={L("batch size", "Batch size")} min={1} max={128} value={batch} onChange={setBatch} />
        <Slider label={L("序列长度", "Sequence length")} min={96} max={4096} step={32} value={seqLen} onChange={setSeqLen} />
        <Slider label={L("隐层宽度", "Hidden width")} min={128} max={2048} step={64} value={hidden} onChange={setHidden} />
        <Slider label={L("层数", "Layers")} min={2} max={48} value={layers} onChange={setLayers} />
        <Toggle label={L("混合精度 bf16", "Mixed precision bf16")} value={bf16} onChange={setBf16} />
        <Toggle label={L("LoRA(只训 1% 参数)", "LoRA (about 1% trainable)")} value={lora} onChange={setLora} />
        <Toggle label={L("梯度检查点(省显存换时间)", "Gradient checkpointing")} value={ckpt} onChange={setCkpt} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("训练总显存", "Total training memory")} value={nf(total, 1)} unit=" GB" tone={total > 16 ? "warn" : "ok"} />
        <Kpi label={L("是参数本身的几倍", "Multiple of the weights alone")} value={`${nf(ratio, 1)}×`} tone="acc" hint={L(`参数只占 ${nf(wG, 1)} GB`, `weights are only ${nf(wG, 1)} GB`)} />
        <Kpi label={L("推理需要", "Inference needs")} value={nf(infer, 1)} unit=" GB" tone="ok" hint={L("没有梯度和优化器状态", "no gradients, no optimiser state")} />
        <Kpi label={L("最便宜能装下的卡", "Cheapest card that fits")} value={firstFit ? firstFit.name : L("都装不下", "none of them")} tone={firstFit ? "ok" : "warn"} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("参数", "Weights")} value={wG} max={total * 1.05} tone="acc" valText={`${nf(wG, 2)} GB`} />
        <Bar label={L("梯度", "Gradients")} value={gG} max={total * 1.05} tone="acc" valText={`${nf(gG, 2)} GB`} />
        <Bar label={L("优化器状态(Adam)", "Optimiser state (Adam)")} value={oG} max={total * 1.05} tone="warn" valText={`${nf(oG, 2)} GB`} />
        <Bar label={L("激活值", "Activations")} value={aG} max={total * 1.05} tone={aG > total * 0.5 ? "warn" : "ok"} valText={`${nf(aG, 2)} GB`} />
      </div>

      <div style={{ marginTop: 8 }}>
        <Boxes items={fits.map((c) => ({ label: `${c.name} ${c.gb}G`, state: c.ok ? "ok" : c.inferOk ? "warn" : "dead", title: pick(lang, c.note) }))} />
      </div>

      <Note mark="→" tone={firstFit ? "on" : "bad"}>
        {L(`${nf(paramsM, 0)}M 参数本身只占 ${nf(wG, 1)} GB,训练却要 ${nf(total, 1)} GB——${nf(ratio, 1)} 倍。多出来的是梯度(和参数同样大)、Adam 的两份 fp32 动量(参数的 4 倍)、以及激活值(${nf(aG, 1)} GB,正比于 batch × 序列长度 × 隐层宽度 × 层数)。这解释了为什么 batch 和序列长度是最有效的两个显存旋钮:它们只影响最后一项,但最后一项往往是最大的一项。${lora ? "" : "把 LoRA 打开:只训 1% 的参数,梯度和优化器状态几乎归零," + nf(total, 1) + " GB 会掉到一个免费的 T4 能装下的水平。"}这四个数字不是学术细节,它们直接决定下一章你去哪儿找卡:能塞进 15 GB,Kaggle 的免费 T4 就够;塞不进,你要么改配置,要么去租卡。`,
            `${nf(paramsM, 0)}M parameters occupy only ${nf(wG, 1)} GB on their own, yet training needs ${nf(total, 1)} GB — ${nf(ratio, 1)} times as much. The extra is gradients (the same size as the weights), Adam's two fp32 moments (four times the weights), and activations (${nf(aG, 1)} GB, proportional to batch × sequence length × hidden width × layers). That is why batch size and sequence length are the two effective memory knobs: they touch only the last term, and the last term is usually the largest. ${lora ? "" : "Switch LoRA on: with about one percent of the weights trainable, gradients and optimiser state nearly vanish and " + nf(total, 1) + " GB falls to something a free T4 can hold. "}These four numbers are not academic detail — they decide where you go looking for a card in the next chapter: under 15 GB and Kaggle's free T4 is enough; over it, you change the configuration or you rent.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t19 · sizeLab — do you need a GPU at all
   ========================================================= */
const FAMILIES = [
  { k: "gbm",   zh: "梯度提升树 (LightGBM)", en: "Gradient boosting (LightGBM)", cpu: 9e7,  gpuX: 1.6,  vram: 0 },
  { k: "linear",zh: "线性 / 岭回归",          en: "Linear / ridge",              cpu: 9e8,  gpuX: 1.0,  vram: 0 },
  { k: "tcn",   zh: "小型深度模型 (TCN/LSTM)", en: "Small deep model (TCN/LSTM)", cpu: 1.1e6, gpuX: 22,  vram: 3 },
  { k: "tsfm",  zh: "微调时序基础模型",        en: "Fine-tune a foundation model", cpu: 1.4e4, gpuX: 60, vram: 14 },
];
function SizeViz() {
  const L = useL();
  const lang = useLang();
  const [tags, setTags] = React.useState(1);
  const [years, setYears] = React.useState(3);
  const [feats, setFeats] = React.useState(50);
  const [family, setFamily] = React.useState("gbm");
  const [combos, setCombos] = React.useState(40);
  const [folds, setFolds] = React.useState(5);
  const [machine, setMachine] = React.useState(1);

  const F = FAMILIES.find((f) => f.k === family);
  const rows = tags * years * 365 * SLOTS;
  const work = rows * feats;                       // one pass over the data
  const oneCpuSec = work / (F.cpu * machine);
  const oneGpuSec = oneCpuSec / F.gpuX;
  const runs = combos * folds;
  const cpuH = (oneCpuSec * runs) / 3600, gpuH = (oneGpuSec * runs) / 3600;
  const RENT = 2.2;                                 // indicative yuan per GPU-hour
  const gpuCost = gpuH * RENT;
  const saved = cpuH - gpuH;
  // the honest verdict: a GPU is worth renting when it saves real wall-clock time
  const needsGpu = F.vram > 0 && (cpuH > 6 || saved > 4);
  const curve = [];
  for (let t = 1; t <= 400; t = Math.ceil(t * 1.35)) {
    const w = t * years * 365 * SLOTS * feats;
    curve.push({ x: t, y: (w / (F.cpu * machine)) * runs / 3600 });
  }

  return (
    <div>
      <VizHead idx="PF1" title={L("先量工作量,再决定要不要卡", "Measure the workload before you go looking for a card")} />
      <div className="viz-ctrl">
        <Slider label={L("点位 / 电表数", "Tags or meters")} min={1} max={400} value={tags} onChange={setTags} />
        <Slider label={L("历史长度", "History")} min={1} max={6} value={years} onChange={setYears} unit={L(" 年", " yr")} />
        <Slider label={L("特征数", "Features")} min={10} max={300} step={5} value={feats} onChange={setFeats} />
        <Choice label={L("模型族", "Model family")} value={family} onChange={setFamily} options={FAMILIES.map((f) => ({ v: f.k, l: pick(lang, f) }))} />
        <Slider label={L("超参组合数", "Hyperparameter combinations")} min={1} max={300} value={combos} onChange={setCombos} />
        <Slider label={L("回测折数", "Backtest folds")} min={1} max={12} value={folds} onChange={setFolds} />
        <Slider label={L("你机器的相对速度", "Your machine, relative speed")} min={0.3} max={3} step={0.1} value={machine} onChange={setMachine} fmt={(v) => `${nf(v, 1)}×`} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("数据规模", "Dataset size")} value={big(rows)} unit={L(" 行", " rows")} tone="acc" hint={L(`${big(rows * feats)} 个特征值`, `${big(rows * feats)} feature values`)} />
        <Kpi label={L("单次训练(CPU)", "One run on CPU")} value={oneCpuSec < 90 ? `${nf(oneCpuSec, 1)} s` : `${nf(oneCpuSec / 60, 1)} min`} tone={oneCpuSec > 900 ? "warn" : "ok"} />
        <Kpi label={L("整套实验(CPU)", "Whole experiment on CPU")} value={cpuH * 3600 < 90 ? `${nf(cpuH * 3600, 0)} s` : cpuH < 1 ? `${nf(cpuH * 60, 1)} min` : `${nf(cpuH, 1)} h`} tone={cpuH > 8 ? "warn" : "ok"} hint={L(`${runs} 次训练`, `${runs} runs`)} />
        <Kpi label={L("要不要 GPU", "Do you need a GPU")} value={needsGpu ? L("要", "yes") : L("不要", "no")} tone={needsGpu ? "warn" : "ok"} hint={needsGpu ? L(`省 ${nf(saved, 1)} 小时,约 ${yuan(gpuCost)}`, `saves ${nf(saved, 1)} h for about ${yuan(gpuCost)}`) : L("CPU 就够,别租卡", "CPU is enough — do not rent")} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("CPU 总耗时", "Total CPU hours")} value={cpuH} max={Math.max(cpuH, gpuH) * 1.15} tone={cpuH > 8 ? "warn" : "ok"} valText={`${nf(cpuH, 1)} h`} />
        <Bar label={L("GPU 总耗时", "Total GPU hours")} value={gpuH} max={Math.max(cpuH, gpuH) * 1.15} tone="acc" valText={F.vram ? `${nf(gpuH, 1)} h` : L("GPU 帮不上忙", "a GPU does not help here")} />
        <Bar label={L("显存需求", "VRAM required")} value={F.vram} max={24} tone={F.vram > 15 ? "warn" : "ok"} valText={F.vram ? `${F.vram} GB` : "—"} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("整套实验的 CPU 小时数随点位数增长(当前模型族)", "CPU hours for the whole experiment against the number of tags")}</div>
        <MiniPlot data={curve} h={104} yMin={0} markIndex={curve.findIndex((c) => c.x >= tags)} />
      </div>

      <Note mark="→" tone={needsGpu ? "bad" : "on"}>
        {!F.vram
          ? L(`${big(rows)} 行 × ${feats} 个特征,${runs} 次训练,CPU 上一共 ${cpuH * 3600 < 90 ? nf(cpuH * 3600, 0) + " 秒" : cpuH < 1 ? nf(cpuH * 60, 1) + " 分钟" : nf(cpuH, 1) + " 小时"}。这个模型族根本用不上 GPU——树模型和线性模型的瓶颈是内存带宽不是算力,GPU 版本在这个规模上经常因为数据搬运反而更慢。一座工厂三年的 15 分钟数据只有 ${big(3 * 365 * SLOTS)} 行,这是笔记本几分钟的事。绝大多数工业时序项目停在这一行就够了:不要去找卡,去把 DT 和 FE 两个模块的数据工作做扎实。`,
              `${big(rows)} rows × ${feats} features, ${runs} runs, ${cpuH * 3600 < 90 ? nf(cpuH * 3600, 0) + " seconds" : cpuH < 1 ? nf(cpuH * 60, 1) + " minutes" : nf(cpuH, 1) + " hours"} of CPU in total. This model family has no use for a GPU at all — trees and linear models are bound by memory bandwidth rather than arithmetic, and at this scale the GPU build is frequently slower once data movement is counted. Three years of fifteen-minute data from one plant is ${big(3 * 365 * SLOTS)} rows, which is a few minutes on a laptop. Most industrial projects can stop on this line: do not go looking for a card, go and do the data work in modules DT and FE properly.`)
          : needsGpu
          ? L(`这个配置确实需要卡:CPU 上 ${nf(cpuH, 1)} 小时,GPU 上 ${nf(gpuH, 1)} 小时,省下 ${nf(saved, 1)} 小时,按市面租价大约 ${yuan(gpuCost)}。显存需求 ${F.vram} GB——记住这两个数字(${F.vram} GB / ${nf(gpuH, 1)} 小时),它们就是下一章选平台的全部输入:能不能塞进免费的 T4,以及会不会撞上 9 小时的会话墙。`,
              `This configuration does need a card: ${nf(cpuH, 1)} hours on CPU against ${nf(gpuH, 1)} on GPU, saving ${nf(saved, 1)} hours for roughly ${yuan(gpuCost)} at market rental rates. It wants ${F.vram} GB of VRAM — remember those two numbers (${F.vram} GB and ${nf(gpuH, 1)} hours), because they are the entire input to the next chapter's platform choice: whether it fits a free T4, and whether it will hit a nine-hour session wall.`)
          : L(`虽然是深度模型,但在这个数据规模上 CPU 只要 ${nf(cpuH, 1)} 小时就跑完了整套实验,租卡省下的 ${nf(saved, 1)} 小时不值得为它折腾环境。把点位数或超参组合数拖大,看这条曲线什么时候翻上去——那才是该去找卡的时刻。`,
              `Although this is a deep model, at this data size the whole experiment takes only ${nf(cpuH, 1)} hours on CPU, and the ${nf(saved, 1)} hours a rented card would save are not worth the setup. Drag the tag count or the hyperparameter count up and watch where the curve turns — that is the moment to go looking for a card.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t20 · kaggleLab — quota, the session wall, and resuming
   ========================================================= */
function KaggleViz() {
  const L = useL();
  const [totalH, setTotalH] = React.useState(26);      // total GPU hours the job needs
  const [wall, setWall] = React.useState(9);           // max session length
  const [quota, setQuota] = React.useState(30);        // GPU hours per week
  const [ckpt, setCkpt] = React.useState(true);
  const [ckptCost, setCkptCost] = React.useState(6);   // % overhead of saving/reloading
  const [interactive, setInteractive] = React.useState(false);

  const R = React.useMemo(() => {
    const over = ckpt ? 1 + ckptCost / 100 : 1;
    const need = totalH * over;
    if (!ckpt && totalH > wall) return { impossible: true, need, sessions: Infinity, weeks: Infinity, wasted: 0, useful: 0 };
    const perSession = Math.min(wall, need);
    const sessions = Math.ceil(need / perSession);
    // an interactive session keeps burning quota while you are not watching it
    const idleWaste = interactive ? sessions * 0.8 : 0;
    const billed = need + idleWaste;
    const weeks = Math.ceil(billed / quota);
    return { impossible: false, need, sessions, weeks, wasted: need - totalH + idleWaste, billed, perSession };
  }, [totalH, wall, quota, ckpt, ckptCost, interactive]);

  const timeline = [];
  if (!R.impossible) {
    let left = R.billed;
    for (let w = 1; w <= Math.min(R.weeks, 8); w++) { const used = Math.min(quota, left); timeline.push({ w, used }); left -= used; }
  }

  return (
    <div>
      <VizHead idx="PF2" title={L("一次 26 小时的训练,怎么塞进 9 小时的会话和每周 30 小时的配额", "Fitting a 26-hour run into nine-hour sessions and thirty hours a week")} />
      <div className="viz-ctrl">
        <Slider label={L("这个任务需要的 GPU 小时", "GPU hours the job needs")} min={1} max={80} value={totalH} onChange={setTotalH} unit=" h" />
        <Slider label={L("单次会话上限", "Session wall")} min={1} max={12} value={wall} onChange={setWall} unit=" h" />
        <Slider label={L("每周配额", "Weekly quota")} min={5} max={40} value={quota} onChange={setQuota} unit=" h" />
        <Slider label={L("检查点开销", "Checkpoint overhead")} min={0} max={25} value={ckptCost} onChange={setCkptCost} unit=" %" />
        <Toggle label={L("写检查点并作为数据集版本挂回来", "Checkpoint, and mount it back as a dataset version")} value={ckpt} onChange={setCkpt} />
        <Toggle label={L("守在浏览器里跑(交互会话)", "Sit and watch it (interactive session)")} value={interactive} onChange={setInteractive} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("需要几个会话", "Sessions needed")} value={R.impossible ? "∞" : R.sessions} tone={R.impossible ? "warn" : "ok"} hint={R.impossible ? L("永远跑不完", "it never finishes") : L(`每段 ${nf(R.perSession, 1)} 小时`, `${nf(R.perSession, 1)} h each`)} />
        <Kpi label={L("跨几周", "Weeks to finish")} value={R.impossible ? "∞" : R.weeks} tone={R.weeks > 2 ? "warn" : "ok"} hint={L(`配额 ${quota} h/周`, `${quota} h per week`)} />
        <Kpi label={L("检查点+空转浪费", "Wasted on checkpoints and idling")} value={R.impossible ? "—" : `${nf(R.wasted, 1)} h`} tone={R.wasted > 3 ? "warn" : "ok"} />
        <Kpi label={L("能不能跑完", "Does it finish")} value={R.impossible ? L("不能", "no") : L("能", "yes")} tone={R.impossible ? "warn" : "ok"} />
      </div>

      {!R.impossible && (
        <div style={{ marginTop: 10 }}>
          {timeline.map((t) => (
            <Bar key={t.w} label={L(`第 ${t.w} 周`, `Week ${t.w}`)} value={t.used} max={quota} tone={t.used >= quota ? "warn" : "ok"} valText={`${nf(t.used, 1)} / ${quota} h`} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Boxes items={Array.from({ length: R.impossible ? 6 : Math.min(R.sessions, 14) }, (_, i) => ({
          label: R.impossible ? "✕" : `S${i + 1}`, state: R.impossible ? "dead" : "ok",
        }))} />
      </div>

      <Note mark="→" tone={R.impossible || R.weeks > 2 ? "bad" : "on"}>
        {R.impossible
          ? L(`没有检查点,一次需要 ${totalH} 小时的训练撞上 ${wall} 小时的会话墙,结果不是"慢一点",是永远跑不完——每次会话被回收,进度归零,你从头再来。这就是为什么 DL4 里那个"保存权重、优化器状态和 epoch 号"的循环在本地是可选项、在 Kaggle 上是必需品。把检查点打开。`,
              `Without checkpoints, a ${totalH}-hour job meeting a ${wall}-hour wall does not run slowly — it never finishes at all. Each session is reclaimed, progress returns to zero, and you start again. This is why the loop in DL4 that saves weights, optimiser state and the epoch number is optional locally and mandatory here. Switch checkpointing on.`)
          : L(`写检查点(开销 ${ckptCost}%),这次训练被切成 ${R.sessions} 段、每段不超过 ${nf(R.perSession, 1)} 小时,跨 ${R.weeks} 周跑完。做法是固定的:训练循环把权重写进 /kaggle/working,跑完用 kaggle datasets version 把它推成一个新的数据集版本,下一个会话把这个数据集挂成输入、读出检查点接着训。${interactive ? `另外你现在是守在浏览器里跑的,每个会话大约白烧 0.8 小时配额在空转上,总共 ${nf(R.wasted, 1)} 小时——关掉它,改用 Save & Run All 后台提交,关掉浏览器去干别的。` : "并且你用的是 Save & Run All 后台提交,这是正确用法——交互会话会因为空闲被回收,还一直占着配额。"}如果这个任务超过 ${wall} 小时又不允许跨周,答案不在 Kaggle,也不在下一章的 Colab(它的会话更短更不稳),而在 PF4:花几十块钱租一张没有会话墙的卡。`,
              `With checkpointing on (${ckptCost}% overhead) the run splits into ${R.sessions} segments of at most ${nf(R.perSession, 1)} hours and completes across ${R.weeks} weeks. The procedure is fixed: the training loop writes weights into /kaggle/working, you push that as a new dataset version with kaggle datasets version, and the next session mounts that dataset as an input, loads the checkpoint and continues. ${interactive ? `You are also sitting and watching it, burning roughly 0.8 hours of quota per session on idling — ${nf(R.wasted, 1)} hours in total. Turn that off, submit with Save & Run All instead, and close the browser.` : "You are submitting with Save & Run All, which is the correct usage — an interactive session is reclaimed when idle and holds your quota while you watch it."} If the job exceeds ${wall} hours and cannot spread across weeks, the answer is neither Kaggle nor the Colab of the next chapter, whose sessions are shorter and less predictable. It is PF4: rent a card with no session wall for the price of a lunch.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t21 · platLab — ten routes, four axes, your constraints
   ---------------------------------------------------------
   Prices and quotas are indicative and move quickly; the point
   of this bench is the ORDER your constraints impose, not the
   third decimal of anyone's price list.
   ========================================================= */
const PLATFORMS = [
  { k: "kaggle",  zh: "Kaggle 免费额度",     en: "Kaggle free tier",        cny: 0,    freeH: 30, wall: 9,   reach: 0.7, domestic: false, setup: 1 },
  { k: "colab",   zh: "Colab 免费档",        en: "Colab free",              cny: 0,    freeH: 12, wall: 4,   reach: 0.3, domestic: false, setup: 1 },
  { k: "colabpro",zh: "Colab 付费档",        en: "Colab paid",              cny: 1.6,  freeH: 0,  wall: 24,  reach: 0.35, domestic: false, setup: 1 },
  { k: "rentcn",  zh: "国内按小时租卡",      en: "Domestic hourly rental",  cny: 1.8,  freeH: 0,  wall: 999, reach: 0.98, domestic: true,  setup: 2 },
  { k: "rentx",   zh: "境外按秒计费租卡",    en: "Overseas per-second rental", cny: 2.4, freeH: 0, wall: 999, reach: 0.5, domestic: false, setup: 2 },
  { k: "freecn",  zh: "国内免费算力平台",    en: "Domestic free-compute platform", cny: 0, freeH: 20, wall: 8, reach: 0.95, domestic: true, setup: 2 },
  { k: "trial",   zh: "云厂商新用户试用",    en: "Cloud vendor trial credit", cny: 0,  freeH: 40, wall: 48,  reach: 0.9, domestic: true,  setup: 4 },
  { k: "cloud",   zh: "云厂商按需实例",      en: "Cloud on-demand instance", cny: 9.5, freeH: 0,  wall: 999, reach: 0.95, domestic: true, setup: 4 },
  { k: "local",   zh: "本地自购显卡",        en: "Your own GPU",            cny: 0.55, freeH: 0,  wall: 999, reach: 1.0,  domestic: true,  setup: 6 },
  { k: "cpu",     zh: "就用现在这台笔记本",  en: "The laptop you already have", cny: 0, freeH: 999, wall: 999, reach: 1.0, domestic: true, setup: 0 },
];
function PlatViz() {
  const L = useL();
  const lang = useLang();
  const [hoursNeeded, setHoursNeeded] = React.useState(26);
  const [longestRun, setLongestRun] = React.useState(14);
  const [budget, setBudget] = React.useState(200);
  const [mustStay, setMustStay] = React.useState(true);
  const [needGpu, setNeedGpu] = React.useState(true);

  const scored = PLATFORMS.map((p) => {
    const paidH = Math.max(0, hoursNeeded - p.freeH);
    const cost = paidH * p.cny;
    const reasons = [];
    let ok = true;
    if (mustStay && !p.domestic) { ok = false; reasons.push(L("数据需出境", "data would leave the country")); }
    if (cost > budget) { ok = false; reasons.push(L(`超预算 ${yuan(cost - budget)}`, `${yuan(cost - budget)} over budget`)); }
    if (longestRun > p.wall) { ok = false; reasons.push(L(`单次 ${longestRun}h > 会话墙 ${p.wall}h`, `${longestRun}h run vs a ${p.wall}h wall`)); }
    if (needGpu && p.k === "cpu") { ok = false; reasons.push(L("没有 GPU", "no GPU")); }
    if (!needGpu && p.k === "cpu") reasons.push(L("你根本不需要 GPU", "you do not need a GPU"));
    const score = (ok ? 100 : 0) - cost / 20 - p.setup * 3 + p.reach * 14 + (p.wall > 100 ? 8 : 0);
    return { ...p, cost, ok, reasons, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored.filter((p) => p.ok).slice(0, 3);
  const blocked = scored.filter((p) => !p.ok);

  return (
    <div>
      <VizHead idx="PF4" title={L("把约束说清楚,平台顺序就自己出来了", "State the constraints and the ordering follows by itself")} />
      <div className="viz-ctrl">
        <Slider label={L("每月需要的 GPU 小时", "GPU hours needed per month")} min={2} max={200} value={hoursNeeded} onChange={setHoursNeeded} unit=" h" />
        <Slider label={L("最长的一次连续训练", "Longest single run")} min={1} max={48} value={longestRun} onChange={setLongestRun} unit=" h" />
        <Slider label={L("每月预算", "Monthly budget")} min={0} max={2000} step={50} value={budget} onChange={setBudget} fmt={(v) => yuan(v)} />
        <Toggle label={L("数据不得出境", "Data must stay in country")} value={mustStay} onChange={setMustStay} />
        <Toggle label={L("确实需要 GPU(先做完 PF1)", "A GPU is genuinely needed (see PF1)")} value={needGpu} onChange={setNeedGpu} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("第一推荐", "First choice")} value={top[0] ? pick(lang, top[0]) : L("没有可行项", "nothing qualifies")} tone={top[0] ? "ok" : "warn"} hint={top[0] ? (top[0].cost ? yuan(top[0].cost) + L(" / 月", " a month") : L("免费", "free")) : ""} />
        <Kpi label={L("第二推荐", "Second")} value={top[1] ? pick(lang, top[1]) : "—"} tone="acc" hint={top[1] ? (top[1].cost ? yuan(top[1].cost) : L("免费", "free")) : ""} />
        <Kpi label={L("被约束排除的", "Ruled out by your constraints")} value={`${blocked.length} / ${PLATFORMS.length}`} tone={blocked.length > 5 ? "warn" : "acc"} />
        <Kpi label={L("最便宜的可行项", "Cheapest that qualifies")} value={top.length ? yuan(Math.min(...top.map((p) => p.cost))) : "—"} tone="ok" />
      </div>

      <div style={{ marginTop: 10 }}>
        {scored.slice(0, 7).map((p) => (
          <Bar key={p.k} label={`${pick(lang, p)}${p.ok ? "" : " · " + p.reasons[0]}`} value={p.ok ? Math.max(4, p.score) : 2} max={130}
            tone={p.ok ? (p === top[0] ? "ok" : "acc") : "mut"}
            valText={p.ok ? (p.cost ? yuan(p.cost) : L("免费", "free")) : L("不可行", "blocked")} />
        ))}
      </div>

      <Note mark="→" tone={top.length ? "on" : "bad"}>
        {!needGpu
          ? L(`你把「确实需要 GPU」关掉了,那么这一章对你来说只有一行结论:用你现在这台笔记本。PF1 已经算过,绝大多数工业时序任务在 CPU 上是分钟级的,租卡省下的时间还不够配环境。`,
              `With "a GPU is genuinely needed" switched off, this chapter reduces to one line for you: use the laptop you already have. PF1 did the arithmetic — most industrial time-series jobs finish in minutes on CPU, and a rented card would not save enough time to pay for setting it up.`)
          : top.length === 0
          ? L(`当前约束下没有可行项——这本身就是有用的信息,说明你得放松某一条:要么提预算,要么接受跨周跑(靠检查点绕开会话墙),要么把数据脱敏后允许出境。约束不能全都要。`,
              `Nothing qualifies under these constraints, which is itself useful information: one of them has to give. Raise the budget, accept spreading the run across weeks behind checkpoints, or de-identify the data so it may leave. You cannot hold all three.`)
          : L(`在「${mustStay ? "数据不出境" : "数据可出境"}、每月 ${hoursNeeded} 小时、单次最长 ${longestRun} 小时、预算 ${yuan(budget)}」这组约束下,排在第一的是${pick(lang, top[0])}。注意哪一条约束在真正起作用:${longestRun > 9 ? `你的单次训练是 ${longestRun} 小时,它一刀砍掉了所有有会话墙的免费平台——Kaggle 的 9 小时不是配额问题,是结构问题。愿意加检查点跨会话,Kaggle 就回到桌面上;不愿意,那几十块钱的租卡费就是买"不被打断"这件事。` : `你的单次训练只有 ${longestRun} 小时,没有撞上任何会话墙,所以免费额度是够用的——先把免费的用完再谈花钱。`}${mustStay ? "而「数据不出境」这一条排除了 " + blocked.filter((b) => !b.domestic).length + " 个选项:这不是技术偏好,工业现场数据常常是甲方资产,这件事应该在项目第一天问清楚,而不是在上线前一周。" : ""}`,
              `Under these constraints — ${mustStay ? "data stays in country" : "data may leave"}, ${hoursNeeded} hours a month, longest single run ${longestRun} hours, budget ${yuan(budget)} — the first choice is ${pick(lang, top[0])}. Notice which constraint is actually doing the work: ${longestRun > 9 ? `your longest run is ${longestRun} hours, which removes every free platform that has a session wall in one stroke. Kaggle's nine hours is not a quota problem, it is a structural one. Accept checkpoint-and-resume and Kaggle returns to the table; refuse, and the rental fee is simply the price of not being interrupted.` : `your longest run is only ${longestRun} hours and clears every session wall, so the free tiers suffice — exhaust the free hours before discussing money.`}${mustStay ? ` The "data stays in country" rule alone removes ${blocked.filter((b) => !b.domestic).length} options: that is not a technical preference. Plant data is frequently the customer's asset, and the question belongs on day one of the project rather than the week before go-live.` : ""}`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t22 · costLab — what the experiment plan costs, and three ways to halve it
   ========================================================= */
function CostViz() {
  const L = useL();
  const [families, setFamilies] = React.useState(3);
  const [combos, setCombos] = React.useState(40);
  const [folds, setFolds] = React.useState(5);
  const [runMin, setRunMin] = React.useState(14);
  const [par, setPar] = React.useState(2);
  const [screen, setScreen] = React.useState(false);
  const [kill, setKill] = React.useState(false);
  const price = 2.2;

  // The screening claim is measurable rather than assertable: rank a set of real
  // configurations on a fraction of the data, rank them again on all of it, and
  // report how much of the ordering survived (Spearman).
  const S = React.useMemo(() => {
    const days = 40, D = synth({ days, seed: 61, noise: 1.1 });
    const y = D.y, n = y.length, rowsAll = [], tgt = [];
    for (let i = 7 * SLOTS; i < n; i++) {
      const s = i % SLOTS;
      rowsAll.push([1, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, y[i - 2 * SLOTS] / 1000,
                    mean(y.slice(i - SLOTS - 4, i - SLOTS)) / 1000, Math.sin((2 * Math.PI * s) / SLOTS),
                    Math.cos((2 * Math.PI * s) / SLOTS), Math.pow(Math.max(0, D.temp[i] - 24), 1.25) / 10]);
      tgt.push(y[i] / 1000);
    }
    const cut = Math.floor(rowsAll.length * 0.75);
    const CONFIGS = [];
    for (const lam of [3e-4, 3e-3, 3e-2, 0.3, 3]) for (const sub of [[0, 1, 5, 6], [0, 1, 2, 5, 6], [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6, 7]]) CONFIGS.push({ lam, sub });
    const scoreOn = (frac) => CONFIGS.map((c) => {
      const take = Math.max(40, Math.floor(cut * frac));
      const Xtr = rowsAll.slice(cut - take, cut).map((r) => c.sub.map((j) => r[j]));
      const b = ridge(Xtr, tgt.slice(cut - take, cut), c.lam);
      return wape(tgt.slice(cut), rowsAll.slice(cut).map((r) => dot(b, c.sub.map((j) => r[j]))));
    });
    const lo = scoreOn(0.1), hi = scoreOn(1);
    const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, z) => x[0] - z[0]); const r = new Array(a.length); o.forEach((p, k) => { r[p[1]] = k; }); return r; };
    const rl = rank(lo), rh = rank(hi), m = lo.length;
    let d2 = 0; for (let i = 0; i < m; i++) d2 += (rl[i] - rh[i]) ** 2;
    const rho = 1 - (6 * d2) / (m * (m * m - 1));
    // if we keep the top 20% by the cheap ranking, how good is the best survivor?
    const keep = rl.map((r, i) => [r, i]).filter(([r]) => r < Math.ceil(m * 0.2)).map(([, i]) => i);
    const bestKept = Math.min(...keep.map((i) => hi[i])), bestAll = Math.min(...hi);
    return { rho, m, regret: bestKept - bestAll };
  }, []);

  const runs = families * combos * folds;
  const baseH = (runs * runMin) / 60;
  const withScreen = baseH * 0.1 + baseH * 0.2;        // cheap pass over all, full pass over the survivors
  const screenH = screen ? withScreen : baseH;
  const finalH = kill ? screenH * 0.55 : screenH;
  const bothH = withScreen * 0.55;                      // what both levers together would cost
  const money = finalH * price, days = finalH / par / 8;
  const baseDays = baseH / par / 8, bothDays = bothH / par / 8;

  return (
    <div>
      <VizHead idx="PF5" title={L("实验矩阵 → 算力小时 → 钱和天数", "The experiment matrix, into hours, into money and days")} />
      <div className="viz-ctrl">
        <Slider label={L("模型族数", "Model families")} min={1} max={8} value={families} onChange={setFamilies} />
        <Slider label={L("每族超参组合数", "Hyperparameter sets each")} min={4} max={200} value={combos} onChange={setCombos} />
        <Slider label={L("回测折数", "Backtest folds")} min={1} max={12} value={folds} onChange={setFolds} />
        <Slider label={L("单次训练耗时", "Minutes per run")} min={1} max={90} value={runMin} onChange={setRunMin} unit=" min" />
        <Slider label={L("并行度(几张卡/几个会话)", "Parallelism")} min={1} max={8} value={par} onChange={setPar} />
        <Toggle label={L("低保真筛选(10% 数据先刷一遍)", "Low-fidelity screening on 10% of the data")} value={screen} onChange={setScreen} />
        <Toggle label={L("早停止损(落后就杀掉)", "Early kill of trailing runs")} value={kill} onChange={setKill} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("总训练次数", "Total runs")} value={big(runs)} tone="acc" hint={L(`${families} × ${combos} × ${folds}`, `${families} × ${combos} × ${folds}`)} />
        <Kpi label={L("算力小时", "Compute hours")} value={`${nf(finalH, 1)} h`} tone={finalH > 40 ? "warn" : "ok"} hint={screen || kill ? L(`原本 ${nf(baseH, 1)} h`, `${nf(baseH, 1)} h without the levers`) : ""} />
        <Kpi label={L("花费", "Money")} value={yuan(money)} tone={money > 400 ? "warn" : "ok"} hint={L(`按 ¥${nf(price, 1)}/GPU·h`, `at ¥${nf(price, 1)} per GPU-hour`)} />
        <Kpi label={L("墙钟天数", "Wall-clock days")} value={nf(days, 1)} tone={days > 5 ? "warn" : "ok"} hint={screen || kill ? L(`原本 ${nf(baseDays, 1)} 天`, `${nf(baseDays, 1)} days without the levers`) : L(`并行 ${par}`, `parallelism ${par}`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Bar label={L("不做任何筛选", "No screening at all")} value={baseH} max={baseH * 1.1} tone="warn" valText={`${nf(baseH, 1)} h · ${yuan(baseH * price)}`} />
        <Bar label={L("加低保真筛选", "With low-fidelity screening")} value={screen ? screenH : baseH} max={baseH * 1.1} tone="acc" valText={`${nf(screen ? screenH : baseH, 1)} h`} />
        <Bar label={L("再加早停止损", "Plus early kill")} value={finalH} max={baseH * 1.1} tone="ok" valText={`${nf(finalH, 1)} h · ${yuan(money)}`} />
      </div>

      <Note mark="→" tone={screen && kill ? "on" : "bad"}>
        {L(`低保真筛选能用,前提是便宜那一遍的排名跟贵那一遍对得上。这一点是现算的,不是假设的:把 ${S.m} 组真实配置分别在 10% 和 100% 的数据上跑一遍,两次排名的 Spearman 相关系数是 ${nf(S.rho, 2)};按便宜那一遍留下前 20%,最终最好的那个配置只比全量搜索差 ${nf(S.regret * 100, 2)} 个点。也就是说,你用 10% 的代价保住了绝大部分排序信息。两个开关都打开,这份计划从 ${nf(baseH, 1)} 小时 / ${nf(baseDays, 1)} 天降到 ${nf(bothH, 1)} 小时 / ${nf(bothDays, 1)} 天,省下 ${yuan((baseH - bothH) * price)}。还有第三个杠杆没有出现在这张表上,因为它不花算力:先把数据和验证方案做对。在一个被泄漏污染的实验里,上面这些小时数全是浪费。`,
            `Low-fidelity screening works only if the cheap ranking agrees with the expensive one, and that is computed here rather than assumed: ${S.m} real configurations scored on 10% and on 100% of the data give a Spearman correlation of ${nf(S.rho, 2)}, and keeping the top 20% by the cheap ranking leaves a best survivor only ${nf(S.regret * 100, 2)} points behind the full search. You kept most of the ordering for a tenth of the cost. With both levers on, this plan falls from ${nf(baseH, 1)} hours and ${nf(baseDays, 1)} days to ${nf(bothH, 1)} hours and ${nf(bothDays, 1)} days, saving ${yuan((baseH - bothH) * price)}. A third lever is missing from this table because it costs no compute: get the data and the validation scheme right first. In an experiment contaminated by leakage, every hour above is wasted.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t23 · cvLab — rolling origin, and why one split is a coin toss
   ========================================================= */
function CvViz() {
  const L = useL();
  const [folds, setFolds] = React.useState(8);
  const [expanding, setExpanding] = React.useState(true);
  const [gap, setGap] = React.useState(96);
  const [evalDays, setEvalDays] = React.useState(3);
  const [drift, setDrift] = React.useState(0.25);

  const R = React.useMemo(() => {
    const days = 120, S = synth({ days, seed: 71, noise: 1 });
    // a process change part-way through: the reason fixed and expanding windows differ
    const y = S.y.map((v, i) => v * (i > (days * 0.55) * SLOTS ? 1 + drift : 1));
    const n = y.length;
    const feat = (i) => { const s = i % SLOTS; return [1, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, mean(y.slice(i - SLOTS - 4, i - SLOTS)) / 1000, Math.sin((2 * Math.PI * s) / SLOTS), Math.cos((2 * Math.PI * s) / SLOTS), Math.pow(Math.max(0, S.temp[i] - 24), 1.25) / 10]; };
    const evalLen = evalDays * SLOTS;
    const firstOrigin = Math.floor(n * 0.45);
    const step = Math.floor((n - firstOrigin - evalLen) / folds);
    const A = [], Bm = [];                       // model A: full features; model B: no weather
    for (let f = 0; f < folds; f++) {
      const origin = firstOrigin + f * step;
      const trainFrom = expanding ? 7 * SLOTS : Math.max(7 * SLOTS, origin - 21 * SLOTS);
      const X = [], t = [];
      for (let i = trainFrom; i < origin - gap; i++) { X.push(feat(i)); t.push(y[i] / 1000); }
      if (X.length < 40) continue;
      const bA = ridge(X, t, 1e-2);
      const bB = ridge(X.map((r) => r.slice(0, 6)), t, 1e-2);
      const yt = [], pA = [], pB = [];
      for (let i = origin; i < Math.min(n, origin + evalLen); i++) { yt.push(y[i]); pA.push(dot(bA, feat(i)) * 1000); pB.push(dot(bB, feat(i).slice(0, 6)) * 1000); }
      A.push(wape(yt, pA)); Bm.push(wape(yt, pB));
    }
    const diff = A.map((v, i) => Bm[i] - v);     // positive = A better
    return { A, B: Bm, diff, mA: mean(A), mB: mean(Bm), sA: sd(A), wins: diff.filter((d) => d > 0).length };
  }, [folds, expanding, gap, evalDays, drift]);

  const spread = R.A.length ? Math.max(...R.A) - Math.min(...R.A) : 0;
  const solid = R.A.length ? R.wins / R.A.length : 0;
  const meanDiff = mean(R.diff), sdDiff = sd(R.diff);

  return (
    <div>
      <VizHead idx="EV1" title={L("滚动原点回测:一次切分给你的是一个随机数", "Rolling-origin backtesting: a single split hands you a random number")} />
      <div className="viz-ctrl">
        <Slider label={L("折数", "Folds")} min={2} max={16} value={folds} onChange={setFolds} />
        <Slider label={L("折间 gap(等于预测提前量)", "Gap (= forecast lead time)")} min={0} max={288} step={16} value={gap} onChange={setGap} unit={L(" 点", " pts")} />
        <Slider label={L("每折评估窗口", "Evaluation window per fold")} min={1} max={7} value={evalDays} onChange={setEvalDays} unit={L(" 天", " d")} />
        <Slider label={L("中途工艺变更幅度", "Mid-series process change")} min={0} max={0.6} step={0.05} value={drift} onChange={setDrift} fmt={pct} />
        <Toggle label={L("扩展训练窗(否则固定 21 天)", "Expanding window (otherwise fixed 21 d)")} value={expanding} onChange={setExpanding} />
      </div>

      <div className="ts-kpi-grid">
        <Kpi label={L("多折均值(模型 A)", "Mean across folds (model A)")} value={pct1(R.mA)} tone="ok" hint={L(`标准差 ${nf(R.sA * 100, 2)} pt`, `sd ${nf(R.sA * 100, 2)} pt`)} />
        <Kpi label={L("最好的一折 / 最差的一折", "Best fold / worst fold")} value={R.A.length ? `${pct1(Math.min(...R.A))} / ${pct1(Math.max(...R.A))}` : "—"} tone={spread > 0.03 ? "warn" : "acc"} />
        <Kpi label={L("单折之间的跨度", "Spread between single folds")} value={`${nf(spread * 100, 1)} pt`} tone={spread > 0.03 ? "warn" : "ok"} hint={L("挑一折汇报,这就是你的自由度", "pick one fold and this is your wiggle room")} />
        <Kpi label={L("A 比 B 好的折数", "Folds where A beats B")} value={`${R.wins} / ${R.A.length}`} tone={solid > 0.8 ? "ok" : "warn"} hint={L(`均值差 ${nf(meanDiff * 100, 2)} ± ${nf(sdDiff * 100, 2)} pt`, `${nf(meanDiff * 100, 2)} ± ${nf(sdDiff * 100, 2)} pt`)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="ts-cap">{L("逐折误差:模型 A(带气温)对模型 B(不带气温)", "Per-fold error: model A (with weather) against model B (without)")}</div>
        {R.A.map((v, i) => (
          <Bar key={i} label={L(`第 ${i + 1} 折`, `Fold ${i + 1}`)} value={v} max={Math.max(...R.A, ...R.B) * 1.1}
            tone={R.diff[i] > 0 ? "ok" : "warn"} valText={`A ${pct1(v)} · B ${pct1(R.B[i])}`} />
        ))}
      </div>

      <Note mark="→" tone={solid > 0.8 ? "on" : "bad"}>
        {L(`同一个模型、同一份数据,${R.A.length} 折的误差从 ${pct1(Math.min(...R.A))} 到 ${pct1(Math.max(...R.A))},跨度 ${nf(spread * 100, 1)} 个点。如果你只做一次切分,你拿到的就是这条分布里随机的一个数——而人总是会不自觉地挑好看的那个汇报。真正能支撑结论的是均值加标准差:${pct1(R.mA)} ± ${nf(R.sA * 100, 2)}。更重要的是最后一行:A 比 B 好这件事,${R.wins}/${R.A.length} 折成立,均值差 ${nf(meanDiff * 100, 2)} 个点而折间标准差 ${nf(sdDiff * 100, 2)} 个点——${solid > 0.8 && Math.abs(meanDiff) > sdDiff * 0.7 ? "差值的方向稳定,这个结论立得住。" : "差值的方向在折与折之间会翻,这说明「A 更好」还不是一个可靠结论,别拿它去做决策。"}另外注意 gap:预测提前 ${nf(gap / 4, 1)} 小时,训练折和验证折之间就必须留出这么多,否则边界上的样本仍然带着 DT4 的泄漏。`,
            `The same model on the same data scores between ${pct1(Math.min(...R.A))} and ${pct1(Math.max(...R.A))} across ${R.A.length} folds — a spread of ${nf(spread * 100, 1)} points. Do a single split and what you get is one random draw from that distribution, and people reliably report the flattering one. What supports a conclusion is the mean with its spread: ${pct1(R.mA)} ± ${nf(R.sA * 100, 2)}. The last row matters more: A beats B on ${R.wins} of ${R.A.length} folds, with a mean difference of ${nf(meanDiff * 100, 2)} points against a between-fold standard deviation of ${nf(sdDiff * 100, 2)} — ${solid > 0.8 && Math.abs(meanDiff) > sdDiff * 0.7 ? "the direction is stable, so this conclusion holds." : "the direction flips between folds, so 'A is better' is not yet a reliable conclusion and should not drive a decision."} Note the gap as well: forecasting ${nf(gap / 4, 1)} hours ahead requires exactly that much space between training and validation, or boundary samples still carry DT4's leakage.`)}
      </Note>
    </div>
  );
}

/* =========================================================
   t24 · metricLab — six metrics, three models, contradictory rankings
   ========================================================= */
function MetricViz() {
  const L = useL();
  const lang = useLang();
  const [lowLoad, setLowLoad] = React.useState(1);     // how deep the night-time trough goes
  const [peakW, setPeakW] = React.useState(1);

  const R = React.useMemo(() => {
    const days = 30, S = synth({ days, seed: 83, noise: 1 });
    // deepen the night trough: this is where MAPE's denominator goes to work
    const y = S.y.map((v, i) => { const h = (i % SLOTS) / 4; return h < 6.5 ? v * (1 - 0.75 * lowLoad) : v; });
    const n = y.length, from = Math.floor(n * 0.7), r = rng(91);
    // A real fitted model, so that the three variants differ by what the chapter
    // says they differ by rather than by the error of a naive baseline.
    const feat = (i) => { const q = i % SLOTS; return [1, y[i - SLOTS] / 1000, y[i - 7 * SLOTS] / 1000, mean(y.slice(i - SLOTS - 4, i - SLOTS)) / 1000, Math.sin((2 * Math.PI * q) / SLOTS), Math.cos((2 * Math.PI * q) / SLOTS), Math.pow(Math.max(0, S.temp[i] - 24), 1.25) / 10]; };
    const FX = [], FT = [];
    for (let i = 7 * SLOTS; i < from; i++) { FX.push(feat(i)); FT.push(y[i] / 1000); }
    const bFit = ridge(FX, FT, 1e-2);
    const hi = quantileOf(y.slice(from), 0.88);
    const yt = [], P = { smooth: [], peaky: [], biased: [] };
    for (let i = from; i < n; i++) {
      const base = dot(bFit, feat(i)) * 1000;
      yt.push(y[i]);
      // A: accurate on average, but it clips what it cannot see coming
      P.smooth.push(base - (base > hi ? 0.11 * base : 0));
      // B: noisier everywhere, but it does not flinch at the peaks
      P.peaky.push(base * (1 + 0.042 * gauss(r)));
      // C: a flat safety margin on everything
      P.biased.push(base * 1.06);
    }
    // Demand billing looks at one window a month, so peak accuracy is measured on
    // the peak: how far the predicted daily maximum is from the real one, in
    // magnitude and in timing, averaged over the days in the test window.
    const peakErr = (p) => {
      const mags = [], slots = [];
      for (let d = 0; d + SLOTS <= yt.length; d += SLOTS) {
        const ty = yt.slice(d, d + SLOTS), tp = p.slice(d, d + SLOTS);
        const my = Math.max(...ty), mp = Math.max(...tp);
        mags.push(Math.abs(mp - my) / my);
        slots.push(Math.abs(ty.indexOf(my) - tp.indexOf(mp)));
      }
      return { mag: mean(mags), slots: mean(slots) };
    };
    const rows = [
      { k: "smooth", zh: "A 平滑型(削峰)", en: "A smooth (clips peaks)" },
      { k: "peaky", zh: "B 追峰型(噪声大)", en: "B peak-tracking (noisier)" },
      { k: "biased", zh: "C 常数裕度型", en: "C constant margin" },
    ].map((m) => {
      const p = P[m.k], pk = peakErr(p);
      return { ...m, mae: mae(yt, p), rmse: rmse(yt, p), mape: mape(yt, p), wape: wape(yt, p), mase: mase(yt, p, SLOTS), peak: pk.mag, slots: pk.slots };
    });
    return { rows, yt };
  }, [lowLoad, peakW]);

  const METRICS = [
    { k: "mae", zh: "MAE", en: "MAE", fmt: (v) => kw(v) },
    { k: "rmse", zh: "RMSE", en: "RMSE", fmt: (v) => kw(v) },
    { k: "mape", zh: "MAPE", en: "MAPE", fmt: pct1 },
    { k: "wape", zh: "WAPE", en: "WAPE", fmt: pct1 },
    { k: "mase", zh: "MASE", en: "MASE", fmt: (v) => nf(v, 2) },
    { k: "peak", zh: L("月峰值偏差", "Monthly peak deviation"), en: "Monthly peak deviation", fmt: pct1 },
  ];
  const winner = (mk) => R.rows.reduce((a, b) => (b[mk] < a[mk] ? b : a)).k;
  const winners = METRICS.map((m) => ({ m, w: winner(m.k) }));
  const distinct = new Set(winners.map((w) => w.w)).size;
  const nameOf = (k) => pick(lang, R.rows.find((r) => r.k === k));
  const wapeWin = winner("wape"), peakWin = winner("peak"), mapeWin = winner("mape");
  const A = R.rows.find((r) => r.k === "smooth");

  return (
    <div>
      <VizHead idx="EV2" title={L("同一组预测,六个指标,三个不同的冠军", "One set of predictions, six metrics, three different winners")} />
      <div className="viz-ctrl">
        <Slider label={L("夜间低谷深度(MAPE 的分母)", "Depth of the night trough")} min={0} max={1} step={0.05} value={lowLoad} onChange={setLowLoad} fmt={pct} />
      </div>

      <div className="ts-kpi-grid">
        {winners.slice(0, 4).map((w) => (
          <Kpi key={w.m.k} label={pick(lang, w.m)} value={pick(lang, R.rows.find((r) => r.k === w.w)).split(" ")[0]}
            tone="acc" hint={w.m.fmt(R.rows.find((r) => r.k === w.w)[w.m.k])} />
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {METRICS.map((m) => {
          const best = winner(m.k);
          return (
            <div key={m.k} className="ts-bar-row">
              <span>{pick(lang, m)}</span>
              <div className="b-track" style={{ display: "flex", gap: 4, background: "none" }}>
                {R.rows.map((r) => (
                  <span key={r.k} className={`ts-pill ${r.k === best ? "on" : ""}`} style={{ flex: 1, justifyContent: "center", fontSize: 10 }}>
                    {r.k.toUpperCase().slice(0, 1)} {m.fmt(r[m.k])}
                  </span>
                ))}
              </div>
              <span className="b-val">{pick(lang, R.rows.find((r) => r.k === best)).slice(0, 2)}</span>
            </div>
          );
        })}
      </div>

      <Note mark="→" tone={distinct > 1 ? "bad" : "on"}>
        {L(`六个指标选出了 ${distinct} 个不同的冠军:按 WAPE 该选「${nameOf(wapeWin)}」,按月峰值偏差该选「${nameOf(peakWin)}」,按 MAPE 该选「${nameOf(mapeWin)}」。看 A:它平均误差最小,却系统性地削峰——日峰值幅度平均偏 ${pct1(A.peak)},峰值时刻平均错开 ${nf(A.slots, 1)} 个十五分钟。如果这个预测是拿去做需量控制的,A 是三个里最差的那一个,尽管它的平均指标最好看。再把「夜间低谷深度」拖到 100%:MAPE 会因为分母趋近于零而整个翻盘,WAPE 几乎不动——这就是工业场景该默认用 WAPE 而不是 MAPE 的全部理由。所以结论不是"哪个指标最好",而是顺序:先确定这个预测服务的是哪个决策(SG2),由决策选指标,再由指标选模型。反过来做,你会花三个月优化一个没人要的数字。`,
            `Six metrics crown ${distinct} different winners: WAPE says pick "${nameOf(wapeWin)}", monthly peak deviation says "${nameOf(peakWin)}", MAPE says "${nameOf(mapeWin)}". Look at A: the smallest average error, and a systematic clipping of peaks — the daily maximum is off by ${pct1(A.peak)} on average and lands ${nf(A.slots, 1)} quarter-hours away from where it happened. If this forecast drives demand control, A is the worst of the three despite the best average scores. Now drag the night trough to 100%: MAPE inverts entirely as its denominator approaches zero while WAPE barely moves, which is the whole reason industrial work should default to WAPE. So the conclusion is not which metric is best but the ordering: establish which decision the forecast serves (SG2), let the decision choose the metric, and let the metric choose the model. Reverse it and you will spend three months optimising a number nobody wanted.`)}
      </Note>
    </div>
  );
}

window.__TS_VIZ_3 = { tsfmLab: TsfmViz, trainLab: TrainViz, sizeLab: SizeViz, kaggleLab: KaggleViz, platLab: PlatViz, costLab: CostViz, cvLab: CvViz, metricLab: MetricViz };
