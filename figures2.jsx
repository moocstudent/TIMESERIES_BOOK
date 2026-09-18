/* =========================================================
   figures2.jsx — lecture figures for t11–t20.
   Uses the primitives defined in figures.jsx.
   ========================================================= */

/* ---------------- t11 · differencing and residuals ---------------- */
FIGN["t11-diff"] = function ({ idx }) {
  const L = useL();
  const N = 90;
  const raw = Array.from({ length: N }, (_, i) => 0.55 + 0.35 * Math.sin((2 * Math.PI * i) / 24) + 0.05 * fnoise(i, 2));
  const dif = Array.from({ length: N }, (_, i) => 0.5 + 0.06 * fnoise(i * 3, 2));
  const res = Array.from({ length: N }, (_, i) => 0.5 + 0.045 * fnoise(i * 7, 2));
  return (
    <FigFrame idx={idx} h={236} cap={L("残差诊断不是 ARIMA 的私产,它是检查任何模型的通用体检。原序列在 lag 96 上的自相关 0.81——它每天重复一次,不平稳;季节差分把这条周期减掉,自相关塌到 −0.09;AR 项再吃掉短期相关,残差的 Ljung-Box 统计量落到临界值以下,统计上成了白噪声,说明没有结构可学了。把你后面训的 LightGBM、PatchTST 的残差画成这张图,还看得见尖峰就说明还有周期没被吃掉。", "Residual diagnostics are not ARIMA's private property but the general check-up for any model. The raw series has 0.81 autocorrelation at lag 96 — it repeats daily and is not stationary. A seasonal difference removes that cycle and the autocorrelation collapses to −0.09. AR terms then absorb the short-range correlation until the residual Ljung-Box statistic falls below its critical value and the residuals are statistically white, meaning no structure is left to learn. Plot the residuals of the LightGBM or PatchTST you train later the same way: a visible spike is a cycle you have not absorbed.")}>
      {[
        { v: raw, y: 24, zh: "原序列", en: "raw series", acf: "ACF(96) = 0.81", tone: "bad", note: L("每天重复 → 不平稳", "not stationary") },
        { v: dif, y: 96, zh: "季节差分后", en: "after seasonal differencing", acf: "ACF(96) = −0.09", tone: "ok", note: L("周期被减掉了", "the cycle is gone") },
        { v: res, y: 168, zh: "AR 残差", en: "AR residuals", acf: "Q = 149 → 28 < 34", tone: "ok", note: L("统计上是白噪声", "white noise") },
      ].map((r, i) => (
        <g key={i}>
          <FT x={24} y={r.y - 4} anchor="start" cls="tk">{L(r.zh, r.en)}</FT>
          <FCurve vals={r.v} x={24} y={r.y + 2} w={400} h={46} lo={0} hi={1} c={i === 0 ? FTONE.p : i === 1 ? FTONE.a : "#2e9e6b"} wdt={1.5} />
          <FBox x={438} y={r.y + 4} w={122} h={40} label={r.acf} tone={r.tone} />
          <FT x={566} y={r.y + 28} anchor="start" cls="tn">{r.note}</FT>
        </g>
      ))}
    </FigFrame>
  );
};

/* ---------------- t12 · boosting and where to stop ---------------- */
FIGN["t12-boost"] = function ({ idx }) {
  const L = useL();
  const N = 60;
  const tr = Array.from({ length: N }, (_, i) => 0.13 * Math.exp(-i / 14) + 0.012);
  const vaR = Array.from({ length: N }, (_, i) => 0.13 * Math.exp(-i / 13) + 0.035);
  const vaT = Array.from({ length: N }, (_, i) => 0.13 * Math.exp(-i / 9) + 0.062 + 0.00035 * Math.max(0, i - 26));
  return (
    <FigFrame idx={idx} h={232} cap={L("随机划出来的验证集会一路跟着训练误差往下走,因为每个验证样本的邻居就坐在训练集里。它作为「停在哪里」的信号其实不算差,真正被它骗掉的是误差的绝对水平:报告 5.3%,真实 6.5%——而这就是你写进汇报和合同的那个数。时间靠后的验证集诚实得多,但它只覆盖一小段、样本少,作为停止信号很抖。两种错法性质不同,正解是 EV1 的滚动回测:多折均值既不偏,又比单折稳。", "A randomly carved validation set tracks the training error all the way down, because each held-out row has its neighbours in training. As a signal for where to stop it is not bad; what it lies about is the absolute level — reporting 5.3% against a true 6.5%, and that is the number that goes into your report and your contract. A later-in-time validation window is far more honest but covers one short stretch with few samples, making it a jumpy stopping signal. The two failures differ in kind, and the answer is EV1's rolling backtest: a multi-fold mean is both unbiased and steadier than any single fold.")}>
      <FCurve vals={tr} x={50} y={26} w={400} h={104} lo={0} hi={0.16} c={FTONE.m} />
      <FCurve vals={vaR} x={50} y={26} w={400} h={104} lo={0} hi={0.16} c={FTONE.bad} />
      <FCurve vals={vaT} x={50} y={26} w={400} h={104} lo={0} hi={0.16} c={FTONE.ok} />
      <FAxis x={50} y={130} w={400} label={L("第 1 棵", "tree 1")} right={L("第 200 棵", "tree 200")} />
      <line x1={50 + (26 / N) * 400} y1={26} x2={50 + (26 / N) * 400} y2={130} stroke={FTONE.ok} strokeDasharray="4 3" />
      <FT x={50 + (26 / N) * 400} y={20} cls="tk">{L("真正的早停点", "the real stop")}</FT>

      <FT x={464} y={44} anchor="start" cls="tk">{L("训练误差", "training")}</FT>
      <FT x={464} y={72} anchor="start" cls="tk">{L("随机验证集", "random validation")}</FT>
      <FT x={464} y={86} anchor="start" cls="tn">{L("报告 5.3%(乐观)", "reports 5.3% (optimistic)")}</FT>
      <FT x={464} y={114} anchor="start" cls="tk">{L("真实测试集", "true test")}</FT>
      <FT x={464} y={128} anchor="start" cls="tn">6.5%</FT>

      <FBox x={50} y={168} w={280} h={40} label={L("随机切分:骗的是误差水平", "random split: lies about the level")} tone="bad" />
      <FBox x={342} y={168} w={306} h={40} label={L("时间切分:丢的是停止精度 → 用滚动多折", "time split: loses stopping precision → roll the folds")} tone="ok" />
    </FigFrame>
  );
};

/* ---------------- t13 · pinball loss ---------------- */
FIGN["t13-pinball"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={226} cap={L("pinball loss 的全部机制就是这个折角:预测低于真值时按 τ 加权,高于真值时按 (1−τ) 加权。τ=0.9 时低估的惩罚是高估的九倍,模型于是自然往上偏,学出来的就是 90% 分位数。要记住 P90 不是「安全值」,它是有 10% 概率被突破的值——一个月 30 天你应该预期被突破 3 天,一次都没破说明区间太宽,同样是校准失败。", "The whole mechanism of pinball loss is this kink: underprediction is weighted by τ and overprediction by (1−τ). At τ=0.9 being low is penalised nine times as heavily as being high, the model leans upward, and what it learns is the 90th percentile. Remember that P90 is not a safe value — it is the value with a ten percent chance of being exceeded, so across a thirty-day month you should expect three exceedances. None at all means the interval is too wide, which is equally a calibration failure.")}>
      <FAxis x={60} y={140} w={280} />
      <line x1={200} y1={26} x2={200} y2={140} stroke="var(--hairline-strong)" strokeDasharray="3 3" />
      <polyline points="200,140 70,36" fill="none" stroke={FTONE.bad} strokeWidth="2.4" />
      <polyline points="200,140 336,128" fill="none" stroke={FTONE.ok} strokeWidth="2.4" />
      <FT x={92} y={30} anchor="start" cls="tk">{L("低估 × τ=0.9", "low × τ=0.9")}</FT>
      <FT x={250} y={118} anchor="start" cls="tk">{L("高估 × 0.1", "high × 0.1")}</FT>
      <FT x={200} y={158} cls="tn">{L("预测 = 实际", "forecast = actual")}</FT>

      <FT x={380} y={24} anchor="start" cls="tk">{L("同一套特征,训三次", "same features, fitted three times")}</FT>
      {[
        { y: 40, k: "P90", v: L("被突破 10%", "exceeded 10%"), tone: "warn" },
        { y: 76, k: "P50", v: L("一半在上一半在下", "half above, half below"), tone: "p" },
        { y: 112, k: "P10", v: L("被跌破 10%", "undershot 10%"), tone: "a" },
      ].map((r, i) => (
        <g key={i}>
          <FBox x={380} y={r.y} w={70} h={28} label={r.k} tone={r.tone} />
          <FT x={462} y={r.y + 18} anchor="start" cls="tm">{r.v}</FT>
        </g>
      ))}
      <FBox x={380} y={148} w={268} h={38} label={L("P90 不是安全值", "P90 is not a safe value")} sub={L("30 天里应该被突破 3 天", "three exceedances in thirty days")} tone="bad" />
      <FT x={60} y={196} anchor="start" cls="ts">{L("该用哪个分位数,由 SG2 的代价不对称比决定:τ = cu/(cu+co)", "Which quantile to run is set by SG2's cost asymmetry: τ = cu/(cu+co)")}</FT>
    </FigFrame>
  );
};

/* ---------------- t14 · global model ---------------- */
FIGN["t14-global"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={226} cap={L("一千个电表不训一千个模型。归一化把量级差两个数量级的表放进同一个损失函数,静态属性(设备类型、额定功率、车间、投运年份)让模型能对没见过的新表做出合理推断——这就是冷启动能力的来源。历史充足的表上局部与全局打平;只有 6 天历史的新表上,全局白拿 1.7 个点,借的是别的表的日周期与温度响应。但异质性太大时强行共享会互相干扰,那时该先聚类、每组一个全局模型。", "A thousand meters do not get a thousand models. Normalisation puts meters spanning two orders of magnitude into the same loss function, and static attributes — equipment type, rated power, workshop, commissioning year — let the model reason about a meter it has never seen, which is where cold-start capability comes from. On meters with full history, local and global tie; on a new meter with six days, global gains 1.7 points for free by borrowing the daily cycle and temperature response of the others. But when heterogeneity is high, forced sharing makes series interfere, and the right move becomes clustering first and one global model per cluster.")}>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <FBox x={24} y={26 + i * 34} w={96} h={26} label={`${L("电表", "meter")} ${i + 1}`} sub={i === 4 ? L("新装 6 天", "new, 6 d") : ""} tone={i === 4 ? "warn" : "n"} />
          <FArrow x1={124} y1={39 + i * 34} x2={168} y2={39 + i * 34} />
        </g>
      ))}
      <FBox x={172} y={40} w={116} h={110} label={L("按序列归一化", "normalise per series")} sub={L("+ 规模作为特征", "+ scale as a feature")} tone="a" />
      <FArrow x1={292} y1={95} x2={330} y2={95} />
      <FBox x={334} y={62} w={130} h={66} label={L("一个全局模型", "one global model")} sub={L("+ 静态属性", "+ static attributes")} tone="p" />
      <FArrow x1={468} y1={95} x2={506} y2={95} />
      <FBox x={510} y={40} w={138} h={40} label={L("老表:打平", "old meters: a tie")} tone="n" />
      <FBox x={510} y={92} w={138} h={40} label={L("新表:−1.7 pt", "new meter: −1.7 pt")} tone="ok" />
      <FT x={24} y={182} anchor="start" cls="ts">{L("关掉归一化,大表主导损失函数、小表被当噪声——全局模型最常见的一次性失败", "Without normalisation the big meters dominate the loss and the small ones look like noise")}</FT>
      <FT x={24} y={202} anchor="start" cls="tn">{L("异质性过大时:先按行为聚类,每组一个全局模型", "When heterogeneity is high: cluster by behaviour, one global model per cluster")}</FT>
    </FigFrame>
  );
};

/* ---------------- t15 · capacity against data ---------------- */
FIGN["t15-capacity"] = function ({ idx }) {
  const L = useL();
  const mk = (opt, floor) => Array.from({ length: 40 }, (_, i) => { const k = 4 + i * 4; return floor + 0.9 * Math.pow((k - opt) / 120, 2) + 0.5 / Math.pow(k, 0.7); });
  return (
    <FigFrame idx={idx} h={230} cap={L("三条线是同一个模型在三种数据量下的验证误差随容量的变化。最优容量随数据量右移:200 个样本时是 22 个参数,800 个样本时是 88 个,3000 个样本时才到 160。一座工厂三年的 15 分钟数据是三万五千个点,它能撑起的模型规模是几万到几十万参数,而不是几百万——在这个数据量上训两百万参数,过拟合不是风险,是算术。上深度模型之前先确认:你的数据把树模型撑满了吗?", "Three curves: the same model's validation error against capacity at three data sizes. The optimum moves right with data — 22 parameters at 200 samples, 88 at 800, and only 160 at 3,000. Three years of fifteen-minute data from one plant is thirty-five thousand points, which supports tens to hundreds of thousands of parameters rather than millions. Training two million on that data is not a risk of overfitting but arithmetic. Before reaching for a deep model, confirm that your data has saturated the tree model.")}>
      {[
        { v: mk(22, 0.10), c: FTONE.bad, n: "n = 200", opt: 22, y: 46 },
        { v: mk(88, 0.075), c: FTONE.a, n: "n = 800", opt: 88, y: 74 },
        { v: mk(160, 0.055), c: FTONE.ok, n: "n = 3000", opt: 160, y: 102 },
      ].map((r, i) => (
        <g key={i}>
          <FCurve vals={r.v} x={54} y={26} w={420} h={106} lo={0.04} hi={0.34} c={r.c} />
          <circle cx={54 + ((r.opt - 4) / 156) * 420} cy={26 + 106 - ((r.v[Math.round((r.opt - 4) / 4)] - 0.04) / 0.3) * 106} r="4.5" fill={r.c} />
          <FT x={494} y={r.y} anchor="start" cls="tk">{r.n}</FT>
          <FT x={494} y={r.y + 13} anchor="start" cls="tn">{L(`最优 ${r.opt} 个参数`, `best at ${r.opt} params`)}</FT>
        </g>
      ))}
      <FAxis x={54} y={132} w={420} label={L("4 个参数", "4 params")} right={L("160 个参数", "160 params")} />
      <FT x={46} y={34} anchor="end" cls="tn">{L("验证误差", "error")}</FT>
      <FArrow x1={120} y1={150} x2={400} y2={150} c={FTONE.p} />
      <FT x={260} y={166} cls="tk">{L("数据越多,最优容量越往右", "more data moves the optimum right")}</FT>
      <FT x={54} y={196} anchor="start" cls="ts">{L("35,000 个点 ≈ 几万到几十万参数,不是几百万", "35,000 points supports tens to hundreds of thousands of parameters, not millions")}</FT>
    </FigFrame>
  );
};

/* ---------------- t16 · architecture at equal budget ---------------- */
FIGN["t16-arch"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={224} cap={L("诚实地报告实测:在这份数据上参数最多的直接线性最好,DLinear 和 Patch 线性并没有反超。值得注意的是差距的尺度——三者相差不到两个点,而它们全体距离零参数的季节朴素只有一个多点。也就是说在这条产线上,架构不是误差所在的地方,数据、特征和对齐才是。这正是 DLinear 那篇论文真正的警告:不是注意力没用,而是在一个诚实调过的简单基线面前,很多架构收益小到会被方差吃掉。", "Reporting the measurement honestly: on this data the model with the most parameters, direct linear, wins, and neither DLinear nor patch linear overtakes it. What deserves attention is the scale of the differences — under two points separate the three, and all of them sit barely over a point from a seasonal naive with no parameters at all. On this line the architecture is not where the error lives; the data, the features and the alignment are. That is DLinear's real warning: not that attention is useless, but that against an honestly tuned simple baseline many architectural gains are small enough for variance to eat.")}>
      <FBars x={54} y={30} w={420} h={94} max={20} items={[
        { k: L("季节朴素", "naive"), v: 16.9, lab: "16.9%", tone: "m" },
        { k: L("直接线性", "linear"), v: 15.8, lab: "15.8%", tone: "ok" },
        { k: "DLinear", v: 16.6, lab: "16.6%", tone: "a" },
        { k: "Patch", v: 17.5, lab: "17.5%", tone: "a" },
      ]} />
      <FAxis x={54} y={124} w={420} label="WAPE" />
      <FT x={494} y={44} anchor="start" cls="tk">{L("参数量", "parameters")}</FT>
      {[{ n: "0", t: L("零参数", "none"), y: 62 }, { n: "424", t: L("直接线性", "linear"), y: 80 }, { n: "232", t: "DLinear", y: 98 }, { n: "136", t: "Patch", y: 116 }].map((r, i) => (
        <g key={i}>
          <FT x={494} y={r.y} anchor="start" cls="tn">{r.t}</FT>
          <FT x={648} y={r.y} anchor="end" cls="tk">{r.n}</FT>
        </g>
      ))}
      <FBox x={54} y={158} w={280} h={40} label={L("三者相差 < 2 个点", "under 2 points between them")} sub={L("离零参数基线只有 1.1 点", "and 1.1 points from no parameters at all")} tone="warn" />
      <FBox x={346} y={158} w={302} h={40} label={L("Patch:32% 的参数,差 1.7 点", "patch: 32% of the parameters, 1.7 points behind")} sub={L("同样精度更便宜,这才是它的卖点", "the same accuracy, cheaper — its real selling point")} tone="ok" />
    </FigFrame>
  );
};

/* ---------------- t17 · three routes ---------------- */
FIGN["t17-routes"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={232} cap={L("决策顺序比模型选择更重要。第一步永远是零样本跑一把:不要钱、不要 GPU、五分钟出结果,而在只有三天历史的新设备上,一个完全没见过你这条产线的语料模型(6.6%)会直接打败你自己训的(9.8%)——它借的是别的工厂的日周期、温度响应和班次形状。第二步先检查上下文长度和协变量支持。第三步才是微调,而微调是全书第一个真正需要 GPU 的动作;数据太少时它甚至会把先验拽坏。", "The order of the decisions matters more than the choice of model. Step one is always zero-shot: no money, no GPU, five minutes to a number — and on new equipment with three days of history, a corpus model that has never seen your line (6.6%) beats the one you trained yourself (9.8%), borrowing the daily cycle, temperature response and shift shape of other plants. Step two checks context length and covariate support. Only step three is fine-tuning, the first action in this book that genuinely needs a GPU — and with too little data it can drag the prior somewhere worse.")}>
      <FBox x={24} y={30} w={140} h={46} label={L("① 零样本", "① zero-shot")} sub={L("0 元 · 无 GPU · 5 分钟", "free, no GPU, 5 min")} tone="ok" />
      <FArrow x1={168} y1={53} x2={206} y2={53} />
      <FBox x={210} y={30} w={160} h={46} label={L("够好吗?", "good enough?")} sub={L("对照 SG3 的基线", "against SG3's baseline")} tone="n" />
      <FArrow x1={374} y1={44} x2={412} y2={44} c={FTONE.ok} />
      <FBox x={416} y={26} w={110} h={32} label={L("收工", "ship it")} tone="ok" />
      <FArrow x1={374} y1={66} x2={412} y2={66} c={FTONE.warn} />
      <FBox x={416} y={54} w={232} h={32} label={L("② 上下文长度 / 协变量", "② context length / covariates")} tone="warn" />

      <FArrow x1={532} y1={90} x2={532} y2={116} c={FTONE.warn} />
      <FBox x={416} y={120} w={232} h={46} label={L("③ 微调", "③ fine-tune")} sub={L("这才第一次需要 GPU(6–16 GB)", "the first step needing a GPU (6–16 GB)")} tone="a" />

      <FBars x={24} y={110} w={340} h={58} max={12} items={[
        { k: L("零样本", "zero-shot"), v: 6.6, lab: "6.6%", tone: "ok" },
        { k: L("只用自己 3 天", "local, 3 d"), v: 9.8, lab: "9.8%", tone: "bad" },
        { k: L("微调", "fine-tuned"), v: 8.7, lab: "8.7%", tone: "a" },
      ]} />
      <FT x={24} y={190} anchor="start" cls="ts">{L("历史一多,本地模型就追上来了——零样本的优势在冷启动和「序列多而短」的场合", "With more history the local model catches up — zero-shot's edge is cold start and many-but-short series")}</FT>
      <FT x={24} y={210} anchor="start" cls="tn">{L("「能微调」和「该微调」是两件事:数据太少时微调会把先验拽向噪声", "Able to fine-tune and right to fine-tune differ: too little data drags the prior into noise")}</FT>
    </FigFrame>
  );
};

/* ---------------- t18 · where the VRAM goes ---------------- */
FIGN["t18-vram"] = function ({ idx }) {
  const L = useL();
  const parts = [
    { zh: "参数 bf16", en: "weights bf16", gb: 0.4, tone: "p" },
    { zh: "梯度", en: "gradients", gb: 0.4, tone: "a" },
    { zh: "Adam 两份 fp32", en: "Adam moments", gb: 1.6, tone: "warn" },
    { zh: "激活值", en: "activations", gb: 7.2, tone: "bad" },
  ];
  const tot = parts.reduce((s, p) => s + p.gb, 0);
  let acc = 0;
  return (
    <FigFrame idx={idx} h={228} cap={L("200M 参数本身只占 0.4 GB,训练却要 9.6 GB——24 倍。多出来的是梯度(和参数同样大)、Adam 的两份 fp32 动量(参数的四倍)、以及激活值,而激活值正比于 batch × 序列长度 × 隐层宽度 × 层数,通常是最大的一项。这就是为什么 batch 和序列长度是最有效的两个显存旋钮:它们只影响最后一项。LoRA 让梯度和优化器状态几乎归零,能把这个模型塞进一张免费的 T4。", "200M parameters occupy 0.4 GB on their own, yet training needs 9.6 GB — twenty-four times as much. The extra is gradients (the same size as the weights), Adam's two fp32 moments (four times the weights), and activations, which are proportional to batch × sequence length × hidden width × layers and are usually the largest term of all. That is why batch size and sequence length are the two effective memory knobs: they touch only the last term. LoRA nearly eliminates gradients and optimiser state, which is what fits this model onto a free T4.")}>
      {parts.map((p, i) => {
        const w = (p.gb / tot) * 600, x = 40 + acc; acc += w;
        return (
          <g key={i}>
            <rect x={x} y={34} width={w - 3} height={46} rx="4" fill={`color-mix(in srgb, ${FTONE[p.tone]} 84%, transparent)`} />
            <text x={x + w / 2} y={62} textAnchor="middle" style={{ font: "600 10.5px var(--f-mono)", fill: "#fff" }}>{p.gb} GB</text>
            <FT x={x + w / 2} y={96} cls="tn">{L(p.zh, p.en)}</FT>
          </g>
        );
      })}
      <FT x={40} y={26} anchor="start" cls="tk">{L("训练一个 200M 参数模型需要的显存", "VRAM to train a 200M-parameter model")}</FT>
      <FT x={640} y={26} anchor="end" cls="tk">9.6 GB</FT>

      <FBox x={40} y={122} w={180} h={44} label={L("推理只要 0.5 GB", "inference: 0.5 GB")} sub={L("没有梯度和优化器状态", "no gradients or optimiser")} tone="ok" />
      <FBox x={232} y={122} w={196} h={44} label={L("batch × 序列长度", "batch × sequence length")} sub={L("最有效的两个旋钮", "the two effective knobs")} tone="a" />
      <FBox x={440} y={122} w={200} h={44} label={L("LoRA → 塞进免费 T4", "LoRA → fits a free T4")} sub={L("只训约 1% 的参数", "about 1% trainable")} tone="ok" />
      <FT x={40} y={196} anchor="start" cls="ts">{L("记住两个数字:需要多少显存,要跑多少小时——下一章选平台全靠它们", "Remember two numbers: how much VRAM, how many hours. They decide the next chapter")}</FT>
    </FigFrame>
  );
};

/* ---------------- t19 · the GPU line ---------------- */
FIGN["t19-line"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={224} cap={L("先量工作量,再决定要不要卡。一座工厂三年的 15 分钟数据是十万行量级,树模型跑完整套 200 次实验只要十几秒——GPU 在这个规模上甚至会因为数据搬运而更慢。真正需要卡的只有三种情况:微调时序基础模型、上千条序列的全局深度模型、以及大规模超参搜索。把这条线画清楚,能省掉绝大多数不必要的采购与等待。", "Measure the workload before deciding on a card. Three years of fifteen-minute data from one plant is on the order of a hundred thousand rows, and a tree model finishes a 200-run experiment in about a dozen seconds — at this scale a GPU can even be slower once data movement is counted. Only three situations genuinely need one: fine-tuning a foundation model, a global deep model over thousands of series, and a large hyperparameter search. Drawing this line clearly avoids most unnecessary purchasing and waiting.")}>
      <FAxis x={54} y={128} w={560} label={L("10⁴ 行", "10⁴ rows")} right={L("10⁸ 行", "10⁸ rows")} />
      <rect x={54} y={36} width={330} height={92} fill={`color-mix(in srgb, ${FTONE.ok} 14%, transparent)`} rx="5" />
      <rect x={384} y={36} width={230} height={92} fill={`color-mix(in srgb, ${FTONE.warn} 16%, transparent)`} rx="5" />
      <line x1={384} y1={28} x2={384} y2={136} stroke={FTONE.warn} strokeWidth="1.6" strokeDasharray="5 4" />
      <FT x={384} y={22} cls="tk">{L("分界线", "the line")}</FT>
      <FT x={219} y={54} cls="tk">{L("CPU 就够", "CPU is enough")}</FT>
      <FT x={499} y={54} cls="tk">{L("该找卡了", "go find a card")}</FT>

      {[
        { x: 110, zh: "1 个点位 3 年", en: "1 tag, 3 yr", v: "10.5 万行 · 12 秒", ve: "105k rows, 12 s" },
        { x: 250, zh: "20 个点位", en: "20 tags", v: "210 万行 · 4 分钟", ve: "2.1M rows, 4 min" },
        { x: 452, zh: "微调基础模型", en: "fine-tune a TSFM", v: "GPU 数小时", ve: "hours of GPU" },
        { x: 570, zh: "1000 条全局深度", en: "1000-series deep", v: "GPU 必需", ve: "GPU required" },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={92} r="5" fill={p.x < 384 ? FTONE.ok : FTONE.warn} />
          <FT x={p.x} y={82} cls="tm">{L(p.zh, p.en)}</FT>
          <FT x={p.x} y={110} cls="tn">{L(p.v, p.ve)}</FT>
        </g>
      ))}
      <FT x={54} y={172} anchor="start" cls="ts">{L("你买的是「模型族 × 超参组合 × 折数 × 单次耗时」这个乘积,不是一次训练", "What you buy is the product of families × hyperparameters × folds × time per run — not one run")}</FT>
      <FT x={54} y={192} anchor="start" cls="tn">{L("绝大多数工业时序项目停在左半边:别去找卡,去把数据做扎实", "Most industrial projects stop on the left: do not go looking for a card, go and do the data work")}</FT>
    </FigFrame>
  );
};

/* ---------------- t20 · the session wall ---------------- */
FIGN["t20-wall"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={236} cap={L("Kaggle 的三条硬约束决定了你的工作方式:单次会话 9 小时、每周 30 小时配额、只有 /kaggle/working 会被保存。没有检查点,一次 26 小时的训练撞上 9 小时的墙,结果不是慢一点,是永远跑不完——每次会话回收,进度归零。正确做法是固定的:权重写进 /kaggle/working,跑完 kaggle datasets version 推成新的数据集版本,下一个会话把它挂成输入读回来接着训。", "Kaggle's three hard limits decide how you work: a nine-hour session, thirty GPU hours a week, and only /kaggle/working is preserved. Without checkpoints a 26-hour run meeting the nine-hour wall does not run slowly, it never finishes at all — each session is reclaimed and progress returns to zero. The procedure is fixed: write weights into /kaggle/working, push it as a new dataset version with kaggle datasets version, and mount that dataset as an input next session to load the checkpoint and continue.")}>
      <FT x={24} y={22} anchor="start" cls="tk">{L("没有检查点", "without checkpoints")}</FT>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={24 + i * 148} y={30} width={130} height={30} rx="4" fill={`color-mix(in srgb, ${FTONE.bad} 74%, transparent)`} />
          <text x={89 + i * 148} y={50} textAnchor="middle" style={{ font: "600 10.5px var(--f-mono)", fill: "#fff" }}>{L("9 h 后被回收", "reclaimed at 9 h")}</text>
          <FArrow x1={154 + i * 148} y1={45} x2={168 + i * 148} y2={45} c={FTONE.bad} />
        </g>
      ))}
      <FT x={492} y={50} anchor="start" cls="tk">{L("进度永远归零", "progress always zero")}</FT>

      <line x1={24} y1={80} x2={648} y2={80} stroke="var(--hairline)" />

      <FT x={24} y={104} anchor="start" cls="tk">{L("写检查点 + 推成数据集版本", "checkpoint, then publish as a dataset version")}</FT>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={24 + i * 150} y={112} width={104} height={30} rx="4" fill={`color-mix(in srgb, ${FTONE.ok} 78%, transparent)`} />
          <text x={76 + i * 150} y={132} textAnchor="middle" style={{ font: "600 10.5px var(--f-mono)", fill: "#fff" }}>{L(`第 ${i + 1} 段 · 9 h`, `seg ${i + 1} · 9 h`)}</text>
          {i < 3 && <FArrow x1={130 + i * 150} y1={127} x2={170 + i * 150} y2={127} c={FTONE.ok} />}
          {i < 3 && <FT x={150 + i * 150} y={120} cls="tn">ckpt</FT>}
        </g>
      ))}
      <FT x={24} y={160} anchor="start" cls="tn">{L("/kaggle/working → kaggle datasets version → 下一个会话挂成 /kaggle/input", "/kaggle/working → kaggle datasets version → mounted at /kaggle/input next session")}</FT>

      <FBox x={24} y={178} w={196} h={40} label={L("9 小时会话墙", "9-hour session")} tone="warn" />
      <FBox x={232} y={178} w={196} h={40} label={L("30 小时 / 周配额", "30 h per week")} tone="warn" />
      <FBox x={440} y={178} w={208} h={40} label={L("Save & Run All 后台提交", "Save & Run All, in background")} sub={L("别守在浏览器前", "do not sit and watch it")} tone="ok" />
    </FigFrame>
  );
};
