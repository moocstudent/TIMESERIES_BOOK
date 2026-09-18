/* =========================================================
   figures3.jsx — lecture figures for t21–t30, plus <Figure>
   and the window export used by pages.jsx.
   ========================================================= */

/* ---------------- t21 · platforms against constraints ---------------- */
FIGN["t21-matrix"] = function ({ idx }) {
  const L = useL();
  const rows = [
    { zh: "Kaggle 免费", en: "Kaggle free", cost: "ok", wall: "bad", reach: "warn", data: "bad" },
    { zh: "国内按小时租卡", en: "Domestic rental", cost: "warn", wall: "ok", reach: "ok", data: "ok" },
    { zh: "国内免费算力", en: "Domestic free tier", cost: "ok", wall: "warn", reach: "ok", data: "ok" },
    { zh: "境外按秒租卡", en: "Overseas rental", cost: "warn", wall: "ok", reach: "warn", data: "bad" },
    { zh: "本地自购显卡", en: "Your own GPU", cost: "warn", wall: "ok", reach: "ok", data: "ok" },
    { zh: "现在这台笔记本", en: "The laptop you have", cost: "ok", wall: "ok", reach: "ok", data: "ok" },
  ];
  const cols = [
    { zh: "成本", en: "cost" }, { zh: "能长跑", en: "long runs" },
    { zh: "可达性", en: "reachable" }, { zh: "数据不出境", en: "data stays" },
  ];
  return (
    <FigFrame idx={idx} h={240} cap={L("把约束说清楚,平台顺序就自己出来了。注意哪一条约束在真正起作用:一次要连续跑 14 小时,就一刀砍掉所有有会话墙的免费平台——Kaggle 的 9 小时不是配额问题而是结构问题,愿意加检查点跨会话它就回到桌面上,不愿意,那几十块钱的租卡费就是买「不被打断」。而「数据不出境」这一条往往排除得最多:工业现场数据常常是甲方资产,这件事要在项目第一天问,不是上线前一周。", "State the constraints and the ordering follows by itself. Notice which one is doing the work: a single fourteen-hour run removes every free platform with a session wall in one stroke. Kaggle's nine hours is not a quota problem but a structural one — accept checkpoint-and-resume and it returns to the table; refuse, and the rental fee is simply the price of not being interrupted. The rule that usually removes the most options is data residency: plant data is frequently the customer's asset, and that question belongs on day one of the project, not in the final week.")}>
      {cols.map((c, i) => <FT key={i} x={300 + i * 92} y={26} cls="tk">{L(c.zh, c.en)}</FT>)}
      {rows.map((r, ri) => (
        <g key={ri}>
          <FT x={24} y={52 + ri * 28} anchor="start" cls="tm">{L(r.zh, r.en)}</FT>
          {["cost", "wall", "reach", "data"].map((k, ci) => (
            <circle key={ci} cx={300 + ci * 92} cy={48 + ri * 28} r="7"
              fill={FTONE[r[k] === "ok" ? "ok" : r[k] === "warn" ? "warn" : "bad"]}
              opacity={r[k] === "ok" ? 0.92 : r[k] === "warn" ? 0.7 : 0.55} />
          ))}
        </g>
      ))}
      <FBox x={24} y={204} w={300} h={30} label={L("单次 14 h ⇒ 砍掉所有有会话墙的", "a 14 h run ⇒ every session wall is out")} tone="warn" />
      <FBox x={336} y={204} w={312} h={30} label={L("数据不出境 ⇒ 砍掉境外全部", "data must stay ⇒ every overseas option is out")} tone="bad" />
    </FigFrame>
  );
};

/* ---------------- t22 · the experiment budget ---------------- */
FIGN["t22-budget"] = function ({ idx }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={224} cap={L("你买的是实验矩阵这个乘积,不是一次训练:3 个模型族 × 40 组超参 × 5 折 = 600 次。两个杠杆能砍掉七成——低保真筛选(先用 10% 数据刷一遍,只把幸存的两成拿去做全量评估,这一步能用是因为两次排名的相关性实测有 0.8 左右)和早停止损(跑到三分之一落后就杀掉)。第三个杠杆不花算力却最重要:在一个被泄漏污染的实验里,上面所有小时数都是浪费。", "What you buy is the experiment matrix as a product, not one run: three families × forty hyperparameter sets × five folds = 600 runs. Two levers remove about seventy percent — low-fidelity screening (a pass on ten percent of the data, with only the surviving fifth going to full evaluation, which works because the two rankings correlate around 0.8 in measurement) and early kill (terminate a run a third of the way in if it trails). The third lever costs no compute and matters most: in an experiment contaminated by leakage, every hour above is wasted.")}>
      <FT x={24} y={24} anchor="start" cls="tk">{L("3 模型族 × 40 组超参 × 5 折 = 600 次训练", "3 families × 40 hyperparameter sets × 5 folds = 600 runs")}</FT>
      <FBars x={24} y={36} w={420} h={92} max={150} items={[
        { k: L("不筛选", "no screening"), v: 140, lab: "140 h", tone: "bad" },
        { k: L("低保真筛选", "screening"), v: 42, lab: "42 h", tone: "warn" },
        { k: L("再加早停", "+ early kill"), v: 23, lab: "23 h", tone: "ok" },
      ]} />
      <FAxis x={24} y={128} w={420} label={L("GPU 小时", "GPU hours")} />

      <FBox x={464} y={36} w={184} h={40} label={L("¥308 · 8.8 天", "¥308 · 8.8 days")} tone="bad" />
      <FArrow x1={556} y1={80} x2={556} y2={98} c={FTONE.ok} />
      <FBox x={464} y={102} w={184} h={40} label={L("¥51 · 1.4 天", "¥51 · 1.4 days")} tone="ok" />

      <FBox x={24} y={164} w={300} h={44} label={L("10% 数据的排名 vs 全量排名", "ranking on 10% vs on all of it")} sub={L("Spearman ≈ 0.8,所以筛选才敢用", "Spearman ≈ 0.8, which is what makes screening safe")} tone="a" />
      <FBox x={336} y={164} w={312} h={44} label={L("第三个杠杆:先把数据和验证做对", "third lever: get the data and validation right first")} sub={L("它不花算力,却决定上面所有小时数值不值", "it costs no compute and decides whether the rest was worth anything")} tone="p" />
    </FigFrame>
  );
};

/* ---------------- t23 · rolling origin ---------------- */
FIGN["t23-rolling"] = function ({ idx }) {
  const L = useL();
  const errs = [6.8, 9.4, 7.2, 16.5, 8.1, 9.9, 7.6, 7.3];
  return (
    <FigFrame idx={idx} h={244} cap={L("同一个模型、同一份数据,8 折的误差从 6.8% 到 16.5%。只做一次切分,你拿到的是这条分布里随机的一个数——而人总会不自觉地挑好看的那个汇报。能支撑结论的是均值加标准差。更要紧的是比较两个模型时看差值分布:如果 A 平均比 B 好 0.3 个点,而折间标准差是 0.9 个点,那么「A 更好」还不是一个能拿去做决策的结论。", "The same model on the same data scores between 6.8% and 16.5% across eight folds. A single split hands you one random draw from that distribution, and people reliably report the flattering one. What supports a conclusion is the mean together with its spread. More important still, when comparing two models, read the distribution of the difference: if A beats B by 0.3 points on average while the between-fold standard deviation is 0.9, then 'A is better' is not yet a conclusion you can act on.")}>
      {[0, 1, 2, 3].map((f) => (
        <g key={f}>
          <rect x={24} y={30 + f * 26} width={180 + f * 70} height={16} rx="3" fill={`color-mix(in srgb, ${FTONE.p} 74%, transparent)`} />
          <rect x={208 + f * 70} y={30 + f * 26} width={26} height={16} rx="3" fill="var(--surface-2)" stroke={FTONE.warn} strokeDasharray="3 2" />
          <rect x={238 + f * 70} y={30 + f * 26} width={64} height={16} rx="3" fill={`color-mix(in srgb, ${FTONE.ok} 78%, transparent)`} />
          <FT x={314 + f * 70} y={43 + f * 26} anchor="start" cls="tn">{L(`第 ${f + 1} 折`, `fold ${f + 1}`)}</FT>
        </g>
      ))}
      <FT x={24} y={22} anchor="start" cls="tk">{L("训练 → gap(=提前量) → 评估,原点每次前移", "train → gap (= lead time) → evaluate, origin advances each time")}</FT>
      <FT x={520} y={43} anchor="start" cls="tn">{L("……共 8 折", "… eight in total")}</FT>

      <FBars x={24} y={150} w={400} h={52} max={18} items={errs.map((e, i) => ({ k: `${i + 1}`, v: e, lab: i === 3 ? "16.5" : "", tone: e > 12 ? "bad" : "p" }))} />
      <FAxis x={24} y={202} w={400} label={L("逐折 WAPE", "WAPE per fold")} />
      <FT x={444} y={168} anchor="start" cls="tk">{L("均值 9.1% ± 3.1", "mean 9.1% ± 3.1")}</FT>
      <FT x={444} y={186} anchor="start" cls="tn">{L("跨度 9.7 个点", "spread 9.7 points")}</FT>
      <FT x={444} y={204} anchor="start" cls="tn">{L("一次切分 = 一个随机数", "one split = one random draw")}</FT>
    </FigFrame>
  );
};

/* ---------------- t24 · metrics disagree ---------------- */
FIGN["t24-metrics"] = function ({ idx }) {
  const L = useL();
  const metrics = [
    { m: "MAE", w: "B" }, { m: "RMSE", w: "C" }, { m: "MAPE", w: "A" },
    { m: "WAPE", w: "B" }, { m: "MASE", w: "B" }, { m: L("月峰值偏差", "peak dev."), w: "B" },
  ];
  return (
    <FigFrame idx={idx} h={232} cap={L("同一组预测,六个指标选出三个不同的冠军。A 平滑、平均误差漂亮,却系统性地削峰——日峰值平均偏 4.7%、峰值时刻错开几个十五分钟;如果这个预测拿去做需量控制,A 是最差的那个,尽管 MAPE 上它第一。而把夜间低谷调深,MAPE 的排名会因为分母趋近于零整个翻过来,WAPE 几乎不动。所以顺序是:先定后果,由后果选指标,再由指标选模型。", "One set of predictions, six metrics, three different winners. A is smooth with attractive average error and clips peaks systematically — the daily maximum off by 4.7% and several quarter-hours away from where it happened. If this forecast drives demand control, A is the worst of the three despite leading on MAPE. Deepen the night trough and the MAPE ranking inverts entirely as its denominator approaches zero, while WAPE barely moves. The order is therefore: fix the consequence, let it choose the metric, and let the metric choose the model.")}>
      <FT x={24} y={24} anchor="start" cls="tk">{L("A 平滑型(削峰)", "A smooth (clips peaks)")}</FT>
      <FT x={236} y={24} anchor="start" cls="tk">{L("B 追峰型(噪声大)", "B peak-tracking (noisy)")}</FT>
      <FT x={456} y={24} anchor="start" cls="tk">{L("C 常数裕度型", "C constant margin")}</FT>

      {metrics.map((m, i) => (
        <g key={i}>
          <FT x={24} y={56 + i * 26} anchor="start" cls="tm">{m.m}</FT>
          {["A", "B", "C"].map((k, j) => (
            <g key={j}>
              <rect x={150 + j * 168} y={44 + i * 26} width={150} height={18} rx="4"
                fill={m.w === k ? `color-mix(in srgb, ${FTONE.ok} 80%, transparent)` : "var(--surface-2)"}
                stroke={m.w === k ? FTONE.ok : "var(--hairline-strong)"} />
              <text x={225 + j * 168} y={57 + i * 26} textAnchor="middle" style={{ font: "600 10px var(--f-mono)", fill: m.w === k ? "#fff" : "var(--muted)" }}>
                {m.w === k ? L("赢", "wins") : ""}
              </text>
            </g>
          ))}
        </g>
      ))}
      <FT x={24} y={216} anchor="start" cls="ts">{L("按 MAPE 选模型,你会选中最不该拿去做需量控制的那一个", "Choose by MAPE and you pick the model least suited to demand control")}</FT>
    </FigFrame>
  );
};

/* ---------------- t25 · search and the worn-out validation set ---------------- */
FIGN["t25-search"] = function ({ idx }) {
  const L = useL();
  const N = 50;
  const grid = Array.from({ length: N }, (_, i) => 0.17 - 0.066 * (1 - Math.exp(-i / 22)));
  const rand = Array.from({ length: N }, (_, i) => 0.17 - 0.078 * (1 - Math.exp(-i / 11)));
  const tpe = Array.from({ length: N }, (_, i) => 0.17 - 0.088 * (1 - Math.exp(-i / 8)));
  return (
    <FigFrame idx={idx} h={236} cap={L("网格吃亏是因为四维里只有三维影响结果,预算摊到四维上每轴只够两三个点;随机搜索在每一维的投影都是 60 个不同的值,有效维度的分辨率高得多。TPE 把采样集中到有希望的区域,验证分数最好看——但请把测试分数一起读:验证上赢最多的那个在测试上没有赢。这就是验证集过拟合,TPE 分数最低有一部分正是因为它比别人更努力地在同一个验证集上找运气。解药是多折选型和一段不参与选择的最终测试段。", "Grid loses because only three of these four axes affect the result, and a budget spread over four dimensions is two or three points per axis; random search projects sixty distinct values onto every axis, resolving the live ones far more finely. TPE concentrates its sampling where things look promising and posts the best validation score — but read the test scores alongside: the method that won by the most on validation did not win on test. That is validation overfitting, and part of why TPE's validation score is lowest is that it searched harder than the others for luck in the same window. The antidotes are multi-fold selection and a final test segment that takes part in nothing.")}>
      <FCurve vals={grid} x={54} y={26} w={380} h={96} lo={0.07} hi={0.18} c={FTONE.m} />
      <FCurve vals={rand} x={54} y={26} w={380} h={96} lo={0.07} hi={0.18} c={FTONE.a} />
      <FCurve vals={tpe} x={54} y={26} w={380} h={96} lo={0.07} hi={0.18} c={FTONE.ok} />
      <FAxis x={54} y={122} w={380} label={L("第 1 次", "trial 1")} right={L("第 60 次", "trial 60")} />
      <FT x={46} y={34} anchor="end" cls="tn">{L("验证误差", "val.")}</FT>

      {[
        { y: 44, zh: "网格", en: "grid", v: "10.4% → 10.3%", tone: "m" },
        { y: 76, zh: "随机", en: "random", v: "9.2% → 10.7%", tone: "a" },
        { y: 108, zh: "TPE", en: "TPE", v: "8.2% → 10.4%", tone: "ok" },
      ].map((r, i) => (
        <g key={i}>
          <rect x={450} y={r.y - 10} width={10} height={10} rx="2" fill={FTONE[r.tone]} />
          <FT x={468} y={r.y} anchor="start" cls="tk">{L(r.zh, r.en)}</FT>
          <FT x={468} y={r.y + 14} anchor="start" cls="tn">{r.v}</FT>
        </g>
      ))}
      <FT x={468} y={30} anchor="start" cls="tn">{L("验证 → 测试", "validation → test")}</FT>

      <FBox x={54} y={158} w={290} h={46} label={L("验证赢最多的,测试没赢", "the biggest validation win did not win on test")} sub={L("多搜 56 次,验证又乐观了 5.8 个点", "56 more trials, 5.8 points more optimistic")} tone="bad" />
      <FBox x={356} y={158} w={292} h={46} label={L("解药:多折选型 + 最终测试段", "antidote: folds + a held-out test")} sub={L("再加上取最优附近几组的平均", "and average near the optimum")} tone="ok" />
    </FigFrame>
  );
};

/* ---------------- t26 · the clock ---------------- */
FIGN["t26-clock"] = function ({ idx }) {
  const L = useL();
  const seg = [
    { x: 40, w: 150, zh: "电表数据到齐", en: "meter data complete", tone: "warn", t: "05:00–07:00" },
    { x: 196, w: 92, zh: "特征计算", en: "features", tone: "a", t: "12 min" },
    { x: 294, w: 70, zh: "推理", en: "inference", tone: "a", t: "4 min" },
    { x: 370, w: 110, zh: "写回上位系统", en: "write back", tone: "p", t: "" },
  ];
  return (
    <FigFrame idx={idx} h={232} cap={L("发布时刻不是你定的,是下游那个会定的:调度会八点开,预测就得七点半在系统里。倒推回去,最慢的一环决定你能不能交付——而工业现场最慢的那一环几乎总是上游数据到齐的时间,它还有一条很长的尾巴。所以「数据不全」是常态而不是异常,必须设计降级路径:特征缺失用最近可用值加标记,模型超时回落到季节朴素基线,整条链失败就发上一次的预测并打上过期标签。正确答案永远不是抛错。", "The publication time is not yours; it belongs to the meeting downstream. If dispatch meets at eight, the forecast must be in the system by half past seven. Working backwards, the slowest link decides whether you deliver — and in a plant that link is almost always the completeness of upstream data, which has a long tail. Incomplete data is therefore the normal case rather than an exception, and the degradation path must be designed: missing features fall back to the last available value plus a flag, a model timeout falls back to the seasonal-naive baseline, and total failure republishes the previous forecast marked stale. The right answer is never to raise an error.")}>
      {seg.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={40} width={s.w - 6} height={34} rx="5" fill={`color-mix(in srgb, ${FTONE[s.tone]} 82%, transparent)`} />
          <text x={s.x + (s.w - 6) / 2} y={61} textAnchor="middle" style={{ font: "600 10.5px var(--f-mono)", fill: "#fff" }}>{L(s.zh, s.en)}</text>
          <FT x={s.x + (s.w - 6) / 2} y={90} cls="tn">{s.t}</FT>
        </g>
      ))}
      <line x1={496} y1={28} x2={496} y2={100} stroke={FTONE.bad} strokeWidth="2" />
      <FT x={502} y={44} anchor="start" cls="tk">08:00</FT>
      <FT x={502} y={60} anchor="start" cls="tn">{L("调度会", "dispatch meets")}</FT>
      <line x1={478} y1={28} x2={478} y2={100} stroke={FTONE.warn} strokeWidth="1.6" strokeDasharray="4 3" />
      <FT x={478} y={22} cls="tn">07:30</FT>

      <FT x={40} y={126} anchor="start" cls="tk">{L("当上游迟到(25% 的日子)", "when upstream is late (25% of days)")}</FT>
      <FBox x={40} y={136} w={186} h={40} label={L("特征缺 → 最近可用值 + 标记", "missing feature → last value + flag")} tone="ok" />
      <FBox x={234} y={136} w={186} h={40} label={L("模型超时 → 季节朴素基线", "timeout → seasonal-naive")} tone="ok" />
      <FBox x={428} y={136} w={220} h={40} label={L("全链失败 → 上次预测 + 过期标签", "total failure → previous, stale")} tone="warn" />
      <FT x={40} y={198} anchor="start" cls="ts">{L("下游拿到「差一点的预测」远好过拿到空——空会让调度员退回手工估算", "A slightly worse forecast beats nothing — nothing sends the dispatcher back to pen and paper")}</FT>
    </FigFrame>
  );
};

/* ---------------- t27 · drift is a step ---------------- */
FIGN["t27-drift"] = function ({ idx }) {
  const L = useL();
  const N = 90;
  const none = Array.from({ length: N }, (_, i) => (i < 42 ? 0.082 : 0.125) + 0.012 * fnoise(i, 2));
  const trig = Array.from({ length: N }, (_, i) => (i < 42 ? 0.082 : i < 48 ? 0.125 : 0.086) + 0.012 * fnoise(i + 9, 2));
  return (
    <FigFrame idx={idx} h={236} cap={L("上线三个月后误差翻倍,不是模型坏了,是世界变了。注意变的是什么:新制冷机组投运改的不是负荷的「水平」而是「关系」——厂房对温度的响应变了。水平变化其实不可怕,滞后特征一天之内就跟上了;关系变化会一直错下去,因为那个温度系数是训练时拟合死的。这也是为什么工业时序的漂移多数是台阶而不是斜坡:它的来源是离散事件。触发式重训靠误差和输入分布两类信号,阈值定得太敏感就会每周重训、每次没用。", "Error doubling three months after go-live does not mean the model broke; the world changed. Note what changed: commissioning a new chiller altered not the level of the load but a relationship — the building's response to temperature. A level shift does no lasting harm, because lag features catch up within a day. A changed relationship stays wrong, because that temperature coefficient was fitted once at training time. This is also why drift in industrial series is a step rather than a ramp: its causes are discrete events. Triggered retraining watches two families of signal, error and input distribution — and too sensitive a threshold retrains weekly and improves nothing.")}>
      <FCurve vals={none} x={54} y={26} w={430} h={92} lo={0.05} hi={0.16} c={FTONE.bad} />
      <FCurve vals={trig} x={54} y={26} w={430} h={92} lo={0.05} hi={0.16} c={FTONE.ok} />
      <line x1={54 + (42 / N) * 430} y1={20} x2={54 + (42 / N) * 430} y2={118} stroke={FTONE.warn} strokeWidth="1.6" />
      <FT x={54 + (42 / N) * 430} y={16} cls="tk">{L("新制冷机组投运", "new chiller online")}</FT>
      <FAxis x={54} y={118} w={430} label={L("第 40 天", "day 40")} right={L("第 130 天", "day 130")} />

      <FT x={500} y={48} anchor="start" cls="tk">{L("不重训", "never retrain")}</FT>
      <FT x={500} y={62} anchor="start" cls="tn">{L("一直停在 12.5%", "stays at 12.5%")}</FT>
      <FT x={500} y={88} anchor="start" cls="tk">{L("触发式重训", "triggered")}</FT>
      <FT x={500} y={102} anchor="start" cls="tn">{L("6 天内拉回来", "back within 6 days")}</FT>

      <FBox x={54} y={148} w={200} h={44} label={L("变的是「关系」不是「水平」", "a relationship changed, not a level")} sub={L("水平变化滞后特征一天就跟上", "lag features absorb a level shift in a day")} tone="a" />
      <FBox x={266} y={148} w={186} h={44} label={L("两类触发信号", "two trigger families")} sub={L("滚动误差 + 输入分布距离", "rolling error + distribution distance")} tone="p" />
      <FBox x={464} y={148} w={184} h={44} label={L("阈值太敏感", "too sensitive")} sub={L("每周重训,每次没变好", "retrains weekly, improves nothing")} tone="bad" />
    </FigFrame>
  );
};

/* ---------------- t28 · alert threshold ---------------- */
FIGN["t28-roc"] = function ({ idx }) {
  const L = useL();
  const N = 50;
  const tpr = Array.from({ length: N }, (_, i) => Math.max(0, 1 - Math.pow(i / N, 1.7)));
  const fp = Array.from({ length: N }, (_, i) => 9 * Math.exp(-i / 7));
  return (
    <FigFrame idx={idx} h={236} cap={L("告警不是「定个 3σ 看看效果」的问题,它是一个 ROC 问题,而约束来自人不是统计:运行人员每班能认真看几条?先定这个数(经验值 2–5 条),回推出允许的误报率,再从曲线上读阈值。照搬 3σ 在这份数据上只抓到 67%,而由容忍度推出来的 1.2σ 抓到 100%、每班只推 0.9 条。分级告警是唯一能在不牺牲抓到率的前提下压住告警疲劳的办法:只有最高级推到人,其余进看板。", "Alerting is not a matter of trying three sigma and seeing what happens; it is an ROC problem whose binding constraint is human rather than statistical. How many alerts will an operator read properly in a shift? Fix that number first (two to five, empirically), derive the permitted false-alarm rate, and read the threshold off the curve. Copying three sigma catches only 67% on this data, while the 1.2σ implied by the tolerance catches 100% and pushes 0.9 alerts per shift. Tiering is the only way to hold fatigue down without sacrificing detection: only the top tier reaches a person, the rest stay on a dashboard.")}>
      <FCurve vals={tpr} x={54} y={26} w={380} h={96} lo={0} hi={1.05} c={FTONE.ok} />
      <FCurve vals={fp.map((v) => v / 10)} x={54} y={26} w={380} h={96} lo={0} hi={1.05} c={FTONE.bad} />
      <FAxis x={54} y={122} w={380} label="0.6σ" right="6σ" />
      <line x1={54 + (0.6 / 5.4) * 380} y1={26} x2={54 + (0.6 / 5.4) * 380} y2={122} stroke={FTONE.p} strokeWidth="1.6" strokeDasharray="4 3" />
      <FT x={54 + (0.6 / 5.4) * 380} y={20} cls="tk">1.2σ</FT>
      <line x1={54 + (2.4 / 5.4) * 380} y1={26} x2={54 + (2.4 / 5.4) * 380} y2={122} stroke={FTONE.m} strokeDasharray="3 3" />
      <FT x={54 + (2.4 / 5.4) * 380} y={20} cls="tn">3σ</FT>

      <FT x={450} y={44} anchor="start" cls="tk">{L("抓到率", "detection")}</FT>
      <FT x={450} y={58} anchor="start" cls="tn">{L("1.2σ → 100% / 3σ → 67%", "1.2σ → 100% / 3σ → 67%")}</FT>
      <FT x={450} y={86} anchor="start" cls="tk">{L("每班误报", "false per shift")}</FT>
      <FT x={450} y={100} anchor="start" cls="tn">{L("容忍上限 3 条", "tolerance: 3")}</FT>

      <FBox x={54} y={152} w={190} h={44} label={L("① 每班能看几条", "① alerts per shift")} sub={L("人定的,不是统计定的", "set by people, not statistics")} tone="p" />
      <FArrow x1={248} y1={174} x2={268} y2={174} />
      <FBox x={272} y={152} w={170} h={44} label={L("② 允许的误报率", "② permitted false rate")} tone="a" />
      <FArrow x1={446} y1={174} x2={466} y2={174} />
      <FBox x={470} y={152} w={178} h={44} label={L("③ 从曲线读阈值", "③ read the threshold")} tone="ok" />
    </FigFrame>
  );
};

/* ---------------- t29 · the demand ledger ---------------- */
FIGN["t29-ledger"] = function ({ idx }) {
  const L = useL();
  const N = 96;
  const load = Array.from({ length: N }, (_, i) => { const h = (i / N) * 24; const b = h >= 7.5 && h < 23 ? 0.72 : 0.22; return b + 0.09 * fnoise(i, 2) + (i === 54 ? 0.24 : 0) + (i === 55 ? 0.19 : 0); });
  return (
    <FigFrame idx={idx} h={238} cap={L("一个月 2880 个十五分钟窗口,只有最高的那一个在计费。所以「平均误差」几乎不值钱,值钱的是峰值时刻命中率:把它从 70% 提到 85%,收益远大于把 MAPE 从 6% 优化到 4%——而后者要难得多。这就是 SG2 和 EV2 反复讲的同一件事:先确定后果,由后果选指标,别让教程默认的 MSE 替你做决定。误判也要诚实计入:白停一次产的代价是实打实的。", "Of 2,880 fifteen-minute windows in a month, exactly one is billed. Average error is therefore nearly worthless and peak-timing accuracy is what pays: lifting it from 70% to 85% is worth far more than moving MAPE from 6% to 4%, and it is far easier. This is the same point SG2 and EV2 kept making — fix the consequence first, let it choose the metric, and do not let a tutorial's default MSE decide for you. And count the false triggers honestly: production deferred for nothing costs real money.")}>
      <FCurve vals={load} x={40} y={26} w={430} h={92} lo={0} hi={1.05} />
      <line x1={40} y1={26 + 92 - (0.92 / 1.05) * 92} x2={470} y2={26 + 92 - (0.92 / 1.05) * 92} stroke={FTONE.bad} strokeWidth="1.4" strokeDasharray="5 4" />
      <FT x={470} y={26 + 92 - (0.92 / 1.05) * 92 - 5} anchor="end" cls="tk">{L("需量目标 2100 kW", "target 2100 kW")}</FT>
      <circle cx={40 + (54 / N) * 430} cy={26 + 92 - (load[54] / 1.05) * 92} r="6" fill={FTONE.bad} />
      <FT x={40 + (54 / N) * 430} y={18} cls="tk">{L("整月只有这一个在计费", "the only billed window")}</FT>
      <FAxis x={40} y={118} w={430} label="00:00" right="24:00" />

      <FT x={492} y={40} anchor="start" cls="tk">{L("月账", "the month")}</FT>
      {[
        { y: 58, zh: "省下需量电费", en: "demand charge saved", v: "+¥3,876", tone: "ok" },
        { y: 78, zh: "误判的停产损失", en: "false-trigger loss", v: "−¥1,600", tone: "bad" },
        { y: 98, zh: "月净收益", en: "net benefit", v: "¥2,276", tone: "p" },
      ].map((r, i) => (
        <g key={i}>
          <FT x={492} y={r.y} anchor="start" cls="tn">{L(r.zh, r.en)}</FT>
          <text x={648} y={r.y} textAnchor="end" style={{ font: "600 11px var(--f-mono)", fill: FTONE[r.tone] }}>{r.v}</text>
        </g>
      ))}

      <FBox x={40} y={152} w={296} h={46} label={L("峰值时刻命中率 70% → 85%", "peak-timing 70% → 85%")} sub={L("相对容易,收益很大", "comparatively easy, worth a great deal")} tone="ok" />
      <FBox x={348} y={152} w={300} h={46} label={L("MAPE 6% → 4%", "MAPE 6% → 4%")} sub={L("很难,而计费根本不看它", "hard, and billing never looks at it")} tone="warn" />
    </FigFrame>
  );
};

/* ---------------- t30 · the fourteen days ---------------- */
FIGN["t30-plan"] = function ({ idx }) {
  const L = useL();
  const tasks = [
    { zh: "数据体检", en: "data health check", s: 0, d: 2, tone: "bad" },
    { zh: "朴素基线", en: "baselines", s: 2, d: 1, tone: "p" },
    { zh: "特征 + 回测框架", en: "features + backtest", s: 3, d: 2, tone: "p" },
    { zh: "第一版模型", en: "first model", s: 5, d: 2, tone: "p" },
    { zh: "零样本对照", en: "zero-shot check", s: 5, d: 0.5, tone: "a" },
    { zh: "调参 / 微调", en: "tuning", s: 7, d: 2, tone: "warn" },
    { zh: "分位数与阈值", en: "quantiles", s: 7, d: 1, tone: "a" },
    { zh: "推理服务 + 降级", en: "service + fallbacks", s: 9, d: 1, tone: "p" },
    { zh: "接上位系统", en: "plant integration", s: 10, d: 1, tone: "bad" },
    { zh: "影子运行交付", en: "shadow run", s: 11, d: 1.5, tone: "ok" },
  ];
  const X = (d) => 150 + (d / 14) * 470;
  return (
    <FigFrame idx={idx} h={244} cap={L("十四天从一个 CSV 和一个 Kaggle 账号,到每天早上七点自动出预测并写回能管平台。每天都有明确的验收点,不达标就停下来而不是往前推。注意标红的两项——数据体检和现场联调——延期风险最高的从来不是建模:前者卡在等现场确认那些零到底是什么,后者卡在接口、权限和停机窗口。真正做模型的那几天反而最可控,因为它们只取决于你自己。", "Fourteen days from a CSV and a Kaggle account to a forecast produced automatically at seven every morning and written back to the energy platform. Every day carries an explicit acceptance criterion, and failing it means stopping rather than pushing on. Note the two marked in red — the data health check and the plant integration. The highest delay risk is never the modelling: the first waits on the site confirming what those zeros actually are, the second on interfaces, permissions and a shutdown window. The modelling days are the most predictable of all, because they depend only on you.")}>
      {[0, 2, 4, 6, 8, 10, 12, 14].map((d) => (
        <g key={d}>
          <line x1={X(d)} y1={24} x2={X(d)} y2={212} stroke="var(--hairline)" />
          <FT x={X(d)} y={18} cls="tn">{L(`D${d}`, `D${d}`)}</FT>
        </g>
      ))}
      {tasks.map((t, i) => (
        <g key={i}>
          <FT x={140} y={41 + i * 18} anchor="end" cls="tm">{L(t.zh, t.en)}</FT>
          <rect x={X(t.s)} y={31 + i * 18} width={Math.max(6, (t.d / 14) * 470)} height={13} rx="3"
            fill={`color-mix(in srgb, ${FTONE[t.tone]} 84%, transparent)`} />
        </g>
      ))}
      <FT x={150} y={230} anchor="start" cls="ts">{L("红色 = 延期风险最高的两项,都不是建模", "Red = the two highest delay risks, neither of them modelling")}</FT>
    </FigFrame>
  );
};

/* ---------------- t31 · two persistence models ---------------- */
FIGN["t31-colab"] = function ({ idx }) {
  const L = useL();
  const N = 44;
  // expected wall time against checkpoint interval: the U from the bench
  const u = Array.from({ length: N }, (_, i) => {
    const tau = 4 + i * 6, C = 3, M = 333, lam = 1 / M;
    return 12 * (1 + C / tau + lam * tau / 2) + 0.35;
  });
  const optI = u.indexOf(Math.min(...u));
  return (
    <FigFrame idx={idx} h={250} cap={L("两种持久化模型正好相反,而这个差别决定了训练脚本怎么写。Kaggle 的墙是确定的:9 小时到点回收,/kaggle/working 被保存,推成数据集版本就能接着跑,你可以排出一张时间表。Colab 没有承诺:运行时随时可能被抢占,/content 连同全部中间产物一起消失,只有挂载的 Drive 活下来——于是「切成几段」变成了「多久存一次盘」,而它有闭式最优解 √(2·C·M)。右下那条 U 形曲线的两端同样糟:存得太勤,时间全花在写盘上;存得太稀,每次回收都白跑一大段。", "The two persistence models are inverted, and that difference decides how the training script is written. Kaggle's wall is deterministic: reclaimed at nine hours with /kaggle/working preserved, so publishing a dataset version resumes the run and you can draw a schedule. Colab promises nothing: the runtime may be preempted at any moment and /content vanishes with every intermediate artefact, leaving only a mounted Drive — so how many segments becomes how often to save, a question with the closed form √(2·C·M). Both ends of the U are equally bad: save too often and the time goes into writing, save too rarely and every reclaim throws away a long stretch.")}>
      <FT x={24} y={20} anchor="start" cls="tk">{L("Kaggle:确定的墙", "Kaggle: a deterministic wall")}</FT>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={24 + i * 100} y={30} width={84} height={26} rx="4" fill={`color-mix(in srgb, ${FTONE.ok} 78%, transparent)`} />
          <text x={66 + i * 100} y={47} textAnchor="middle" style={{ font: "600 10px var(--f-mono)", fill: "#fff" }}>9 h</text>
          {i < 2 && <FT x={112 + i * 100} y={47} cls="tn">ckpt</FT>}
        </g>
      ))}
      <FT x={24} y={74} anchor="start" cls="tn">{L("/kaggle/working 被保存 → 推成数据集版本 → 下次挂回来", "/kaggle/working is kept → dataset version → mounted back")}</FT>

      <line x1={330} y1={14} x2={330} y2={96} stroke="var(--hairline-strong)" strokeDasharray="4 3" />

      <FT x={348} y={20} anchor="start" cls="tk">{L("Colab:随机的抢占", "Colab: random preemption")}</FT>
      {[0, 1, 2, 3].map((i) => {
        const w = [70, 44, 96, 52][i];
        let x = 348; for (let k = 0; k < i; k++) x += [70, 44, 96, 52][k] + 10;
        return (
          <g key={i}>
            <rect x={x} y={30} width={w} height={26} rx="4" fill={`color-mix(in srgb, ${FTONE.warn} 76%, transparent)`} />
            <text x={x + w / 2} y={47} textAnchor="middle" style={{ font: "600 9px var(--f-mono)", fill: "#fff" }}>✕</text>
          </g>
        );
      })}
      <FT x={348} y={74} anchor="start" cls="tn">{L("/content 全没了,只有挂载的 Drive 活下来", "/content is gone; only the mounted Drive survives")}</FT>

      <line x1={24} y1={104} x2={648} y2={104} stroke="var(--hairline)" />

      <FCurve vals={u} x={54} y={118} w={330} h={84} lo={13} hi={Math.max(...u) * 1.02} c={FTONE.p} />
      <line x1={54 + (optI / (N - 1)) * 330} y1={114} x2={54 + (optI / (N - 1)) * 330} y2={202} stroke={FTONE.ok} strokeDasharray="4 3" />
      <FT x={54 + (optI / (N - 1)) * 330} y={112} cls="tk">τ* = 45 min</FT>
      <FAxis x={54} y={202} w={330} label={L("存得太勤", "too often")} right={L("存得太稀", "too rarely")} />
      <FT x={46} y={126} anchor="end" cls="tn">{L("墙钟", "wall")}</FT>

      <FBox x={404} y={118} w={244} h={40} label="τ* = √(2 · C · M)" sub={L("检查点耗时 × 平均无故障时间", "checkpoint cost x mean time to failure")} tone="ok" />
      <FBox x={404} y={166} w={244} h={40} label={L("写 /content:一次抢占清零", "to /content: one reclaim, back to zero")} sub={L("12 h 的活变成 46 h", "12 h of work becomes 46 h")} tone="bad" />
      <FT x={24} y={232} anchor="start" cls="ts">{L("免费档还有一条:关掉标签页训练就停,后台执行是付费功能", "One more on the free tier: close the tab and training stops — background execution is a paid feature")}</FT>
    </FigFrame>
  );
};

function Figure({ name, idx }) {
  const F = FIGN[name];
  if (!F) return null;
  return <F idx={idx} />;
}

window.FIGN = FIGN;
window.Figure = Figure;
