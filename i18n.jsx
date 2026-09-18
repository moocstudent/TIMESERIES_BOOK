/* =========================================================
   i18n — Chinese / English switching (TIMESERIES_BOOK)
   ---------------------------------------------------------
   UI            : dictionary of interface strings { key: {zh, en} }
   LangContext   : current language ("zh" | "en")
   useLangState(): App-level state hook (persists to localStorage)
   useLang()     : read current language inside any component
   useT()        : returns t(key) -> localized UI string
   pick(lang,obj): localize a content object { zh, en } (or a plain string)
   ========================================================= */

const LANG_KEY = "ts_book_lang";

const LangContext = React.createContext("zh");

function useLangState() {
  const [lang, setLangRaw] = React.useState(() => {
    try { return localStorage.getItem(LANG_KEY) || "zh"; } catch (e) { return "zh"; }
  });
  React.useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang]);
  const setLang = (l) => {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    setLangRaw(l);
  };
  const toggle = () => setLang(lang === "zh" ? "en" : "zh");
  return [lang, setLang, toggle];
}

function useLang() { return React.useContext(LangContext); }

function useT() {
  const lang = React.useContext(LangContext);
  return (key) => {
    const e = UI[key];
    if (e === undefined) return key;
    if (typeof e === "object") return e[lang] !== undefined ? e[lang] : e.zh;
    return e;
  };
}

// Localize a { zh, en } object; a bare string is returned as-is.
function pick(lang, obj) {
  if (obj == null) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] !== undefined ? obj[lang] : (obj.zh !== undefined ? obj.zh : obj.en);
}
// The "other" language for a content object (used for the sub-title lines).
function other(lang, obj) { return pick(lang === "zh" ? "en" : "zh", obj); }

// "{n} 章" -> fmt("{n} 章", {n: 3})
function fmt(str, map) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (map[k] !== undefined ? map[k] : `{${k}}`));
}

const UI = {
  /* nav */
  nav_home:    { zh: "首页", en: "Home" },
  nav_about:   { zh: "关于", en: "About" },
  nav_modules: { zh: "模块", en: "Modules" },
  lang_title:  { zh: "切换语言", en: "Switch language" },
  theme_title: { zh: "切换主题", en: "Toggle theme" },

  /* hero */
  hero_badge:  { zh: "工业时序模型训练 · 中英双语 · 从一条传感器曲线到一个跑在厂里的预测模型", en: "Training industrial time-series models · bilingual · from a sensor curve to a model running in the plant" },
  hero_l1:     { zh: "先把一条真实的曲线跑一遍,", en: "First run one real curve," },
  hero_l2a:    { zh: "再讲清模型为什么", en: "then explain why the model" },
  hero_l2b:    { zh: "必须这样训。", en: "has to be trained this way." },
  hero_sub:    {
    zh: "工厂里每一台设备都在吐数:电表每 15 分钟一个点,温度每分钟一个点,振动每秒上千个点。你想用它们预测点什么——明天的负荷、下周的能耗、这台泵还能转多久、这炉钢的终点温度。但在你写第一行 model.fit 之前,有一串问题必须先有答案:这条曲线里哪些起伏是工况、哪些是环境、哪些是噪声;停机那两小时的空洞该怎么补才不会毒化训练集;为什么随机打乱的交叉验证会把 9.8% 的误差说成 2.1%;为什么季节朴素基线经常打败你精心调的 LSTM;96 步递归预测的误差是怎么滚起来的;以及最现实的一个——这个模型到底要不要 GPU,要的话在哪儿训:Kaggle 每周 30 小时的配额够不够、9 小时会话墙怎么断点续训,还是说按小时租一张卡更省事。全书以一座工厂的电力负荷作为贯穿始终的例子,但方法适用于任何工业时序。共 {M} 个模块、{C} 章,每章开头是一个可交互的时序台,结尾是 Python / 数据与配置 / 训练与部署 三个视角的真实代码——所有数字现算,所有代码照着能跑。",
    en: "Every machine in a plant emits numbers: a meter every fifteen minutes, a thermocouple every minute, an accelerometer a thousand times a second. You want to predict something from them — tomorrow's load, next week's energy, how long this pump has left, the end-point temperature of this heat. But before the first line of model.fit, a queue of questions needs answers. Which wiggles in that curve are the process, which are the environment, which are noise? How do you fill the two-hour hole left by a shutdown without poisoning the training set? Why does a shuffled cross-validation report 2.1% error on something that truly scores 9.8%? Why does the seasonal-naive baseline so often beat your carefully tuned LSTM? How exactly does error compound across a 96-step recursive forecast? And the most practical of all — does this model need a GPU, and if so, where do you train it: is Kaggle's thirty hours a week enough, how do you checkpoint across its nine-hour session wall, or is renting a card by the hour simply cheaper? One factory's electrical load runs through the whole book as the worked example, but the method applies to any industrial series. {M} modules, {C} chapters — each opening with an interactive bench and closing with real code from three angles: Python, data and configuration, training and deployment. Every number is computed live; every listing is meant to run.",
  },
  cta_start:   { zh: "从第一章开始 →", en: "Start chapter 1 →" },
  cta_howto:   { zh: "如何使用", en: "How it works" },
  cta_roadmap: { zh: "查看路线图", en: "See the roadmap" },

  meta_modules:  { zh: "模块", en: "Modules" },
  meta_chapters: { zh: "章", en: "Chapters" },
  meta_demos:    { zh: "时序台", en: "Benches" },
  meta_hours:    { zh: "小时", en: "Hours" },

  your_progress: { zh: "你的进度", en: "Your progress" },
  synced:        { zh: "本地保存 · 无需登录", en: "Saved locally · no login" },

  /* sections */
  sec01:       { zh: "学习路线图", en: "Learning roadmap" },
  sec01_aside: { zh: "从一条传感器曲线走到一个能上线的预测模型", en: "From one sensor's curve to a forecast you can ship" },
  sec02:       { zh: "课程模块", en: "Course modules" },
  sec02_aside: { zh: "点击进入任意模块", en: "Click any module to enter" },
  sec03:       { zh: "学习方法", en: "The method" },
  sec03_aside: { zh: "先跑一遍场景,再读解释,最后自己写一遍", en: "Run the scenario, read why, then write it yourself" },

  rm_notstarted: { zh: "未开始", en: "Not started" },
  rm_done:       { zh: "已完成", en: "Done" },

  hours_unit:    { zh: "小时", en: "h" },
  modules_count: { zh: "章", en: "chapters" },
  done_word:     { zh: "完成", en: "done" },
  enter_word:    { zh: "进入 →", en: "Enter →" },

  phil1_zh: { zh: "先跑一遍场景", en: "Run the scenario" },
  phil1_b:  {
    zh: "每一章开头是一个可交互时序台:把班次、温度和检修拖起来,看一条工业曲线怎么被拆成基线、工况、环境和噪声四层;把交叉验证从「随机打乱」切到「按时间切分」,看同一个模型的 MAPE 怎么从 2.1% 跳到 9.8%——那 7 个点全是泄漏骗你的;把预测步长从 1 步拉到 96 步,看递归预测的误差怎么滚雪球、直接多步又怎么在远端反超;把 Kaggle 的会话墙、配额和 checkpoint 开关拖起来,看一次 40 小时的训练要切成几段、跨几周;把训练行数、特征数和模型规模拖起来,看那条「CPU 够用 / 该上 GPU」的分界线到底在哪里。时序模型的直觉不是背公式背出来的,是被自己调出来的曲线打服的。",
    en: "Every chapter opens with an interactive bench: drag shift patterns, temperature and a maintenance window and watch an industrial curve decompose into baseline, process, environment and noise; switch cross-validation from shuffled to time-ordered and watch the same model's MAPE jump from 2.1% to 9.8% — those seven points were leakage lying to you; push the horizon from one step to ninety-six and watch recursive error snowball while direct multi-step overtakes it at the far end; drag Kaggle's session wall, weekly quota and checkpoint switch and watch a forty-hour run split into segments across weeks; drag row count, feature count and model size and find the line where CPU stops being enough. Intuition about time-series models is not memorised from formulas — it is beaten into you by curves you moved yourself.",
  },
  phil2_zh: { zh: "再读解释", en: "Read the explanation" },
  phil2_b:  {
    zh: "时序台背后是机制:采样周期为什么决定了你永远看不见某一类事件、盲目线性插值为什么比诚实地标记缺失更糟、时间戳错一个小时为什么会把环境特征的相关性直接抹平、随机打乱的 K 折为什么在时序里等于作弊、滚动统计量的窗口为什么必须右闭开区间、为什么 MAPE 在低值区间会爆炸而 WAPE 不会、梯度提升树凭什么在这类任务上长期压制 Transformer、DLinear 一个线性层为什么能打平一堆注意力模型、分位数回归的 pinball loss 怎么把「预测一个数」变成「预测一个区间」、显存占用为什么是参数量的四五倍、以及为什么再训练该由漂移触发而不是由日历触发。「解释」把每个选择的代价和边界讲清楚。",
    en: "Behind each bench sits a mechanism: why the sampling period decides which events you can never see; why blind linear interpolation is worse than an honest missing flag; why a one-hour timestamp offset flattens the correlation with an environmental driver; why shuffled K-fold is simply cheating on a time series; why a rolling window must be half-open on the right; why MAPE explodes near zero while WAPE does not; how gradient-boosted trees have held off transformers on this task for years; how one linear layer in DLinear matches a stack of attention blocks; how pinball loss turns a point forecast into an interval; why GPU memory runs four to five times the parameter count; and why retraining should be triggered by drift rather than by the calendar. The explanation gives every choice its price and its boundary.",
  },
  phil3_zh: { zh: "最后自己写一遍", en: "Then write it yourself" },
  phil3_b:  {
    zh: "每章结尾是同一件事的三个视角:Python 是能跑的实现(曲线合成器、缺失诊断、滚动回测、LightGBM 全局模型、pinball loss、递归与直接多步、能在会话被掐断后接着跑的训练循环);数据与配置是那几行真正决定结果的东西(特征清单 YAML、Kaggle 的 kernel-metadata.json、Optuna 搜索空间、模型卡、数据字典);训练与部署是把它接到真实世界的那一层(Kaggle API 推数据集与 commit 跑批、租用机器上的 tmux 与 rsync、FastAPI 推理服务、漂移监控与再训练触发、写回上位系统的接口)。代码都是可读长度的完整片段,不是伪代码。练习会把你赶到真数据里:导出自己产线三个月的历史数据、算一次季节朴素基线、把时间切分和随机切分各跑一遍看差多少、在 Kaggle 上完整跑一次带断点续训的训练。",
    en: "Every chapter closes with the same thing from three angles. Python is a runnable implementation (a curve synthesiser, missing-data diagnosis, rolling-origin backtesting, a global LightGBM model, pinball loss, recursive versus direct multi-step, a training loop that survives having its session killed). Data and configuration are the handful of lines that actually decide the outcome (the feature list in YAML, Kaggle's kernel-metadata.json, an Optuna search space, a model card, a data dictionary). Training and deployment is the layer that touches the real world (pushing a dataset and committing a run through the Kaggle API, tmux and rsync on a rented box, a FastAPI inference service, drift monitoring and retraining triggers, the interface that writes back to the plant system). The listings are complete, readable fragments rather than pseudocode. The exercises push you into real data: export three months of your own line's history, score a seasonal-naive baseline, run time-ordered and shuffled splits side by side, and complete one checkpointed training run on Kaggle.",
  },
  footer_tag:  { zh: "signals & forecasts · 工业时序模型训练 · 2026", en: "signals & forecasts · training industrial time-series models · 2026" },
  footer_sync: { zh: "进度本地保存", en: "progress saved locally" },

  /* module page */
  bc_home:    { zh: "首页", en: "Home" },
  bc_modules: { zh: "模块", en: "Modules" },
  module_word:{ zh: "模块", en: "Module" },
  of_word:    { zh: "共", en: "of" },
  m_meta_chapters: { zh: "章数", en: "Chapters" },
  m_meta_hours:    { zh: "预计小时", en: "Est. hours" },
  m_meta_level:    { zh: "难度", en: "Level" },
  m_meta_progress: { zh: "进度", en: "Progress" },
  chapter_list: { zh: "本模块章节", en: "Chapters in this module" },
  click_enter:  { zh: "点击任意章节进入", en: "Click a chapter to enter" },
  no_prereq:    { zh: "无先修", en: "No prereq" },
  prereq_n:     { zh: "{n} 项先修", en: "{n} prereq" },
  not_found_m:  { zh: "未找到该模块。", en: "Module not found." },

  diff_1: { zh: "入门", en: "Intro" },
  diff_2: { zh: "进阶", en: "Core" },
  diff_3: { zh: "挑战", en: "Advanced" },

  /* chapter page */
  ch_sec_intro:   { zh: "本章导读", en: "Overview" },
  ch_sec_obj:     { zh: "学习目标", en: "Objectives" },
  ch_sec_outline: { zh: "内容大纲", en: "Outline" },
  ch_sec_viz:     { zh: "时序台 · 可交互模拟", en: "The time-series bench · live model" },
  ch_sec_notes:   { zh: "解释 · 核心讲义", en: "The explanation · core notes" },
  ch_sec_code:    { zh: "代码 · Python / 数据与配置 / 训练与部署", en: "Code · Python / data & config / training & deployment" },
  viz_hint:     { zh: "改动参数,亲眼看误差、峰值偏差、训练时长、显存、平台配额和成本如何联动;这里的每一个数字都是现算的,大胆试。", en: "Change the parameters and watch error, peak deviation, training time, GPU memory, platform quota and cost move together; every number here is computed live — experiment freely." },
  code_hint:    { zh: "切换标签看同一件事的三个视角:Python 实现、数据与配置、训练与部署;点右上角复制。代码为可读而写,去掉了无关样板,但接口名、参数与关键常量都是真的。", en: "Switch tabs for three angles on the same thing: the Python implementation, the data and configuration, and training or deployment. Copy from the corner button. The listings are written to be read — unrelated boilerplate is trimmed — but every API name, parameter and constant that matters is real." },
  key_badge:    { zh: "重点", en: "Key" },
  code_badge:   { zh: "动手", en: "Hands-on" },
  copy_btn:     { zh: "复制", en: "Copy" },
  copied_btn:   { zh: "已复制", en: "Copied" },
  langs_word:   { zh: "代码", en: "Code" },
  loading_notes:{ zh: "正在加载讲义……", en: "Loading notes…" },
  notes_soon:   { zh: "本章深度讲义正在编写中。以上目标与大纲即为本章脉络,先把上面的时序台玩透。", en: "The deep-dive notes for this chapter are being written. Use the objectives and outline above as your map — and play with the bench first." },
  back_to:      { zh: "返回", en: "Back to" },
  est_word:     { zh: "预计", en: "Est." },
  level_word:   { zh: "难度", en: "Level" },
  props_word:   { zh: "关键概念", en: "Key concepts" },
  mark_done_btn:{ zh: "标记为已完成", en: "Mark as complete" },
  marked_done:  { zh: "已完成", en: "Completed" },
  not_found_c:  { zh: "未找到该章节。", en: "Chapter not found." },

  /* about */
  about_kicker: { zh: "关于本站", en: "About" },
  about_q:      { zh: "为什么写这门课?", en: "Why this course?" },
  about_sub:    { zh: "把工业时序建模讲成「时序台 + 解释 + 代码」,而不是一串照抄的 model.fit。", en: "Teach industrial time-series modelling as a bench, an explanation and code — not as a copied model.fit." },
  about_h1: { zh: "这是什么", en: "What this is" },
  about_p1: {
    zh: "一门「工业时序模型训练」的自学课程,共 {M} 个模块、{C} 章,面向要真的把模型训出来、并且让它在厂里活下去的人:可能是被要求「做个预测」的设备、工艺或能源管理工程师,也可能是接了这个项目的算法开发者。全书用一座工厂的电力负荷作为贯穿始终的例子——因为它数据好拿、后果好算、周期性明显——但每一章都标出方法怎么迁移到能耗、温度、振动、流量、产量和质量这些别的工业信号上。第一个模块讲曲线本身:采样周期、量纲与累积量的区别、把一条工业曲线拆成基线/工况/环境/噪声四层、预测服务的四类下游决策和它们各自不对称的误差代价,最后用季节朴素基线划一条及格线——打不过它的模型不值得上线。然后是数据:采集链路与时标、缺失与坏点的清洗顺序、重采样与外部变量对齐,以及时序里最贵的错误——数据泄漏。接着是特征与目标、统计与梯度提升模型、深度模型与时序基础模型。第六个模块回答那个最现实的问题:在哪儿训——先量一量你到底要不要 GPU,再把 Kaggle 的配额、会话墙和断点续训讲透,然后横向比十个平台的成本、合规与长跑能力。最后是实验方法(滚动回测、指标陷阱、超参搜索)和上线运维(推理调度、漂移与再训练、与上位系统集成),并以两个完整案例收口。",
    en: "A self-study course on training industrial time-series models — {M} modules, {C} chapters — for whoever actually has to train one and keep it alive inside a plant: the equipment, process or energy engineer told to produce a forecast, or the developer who took the project. One factory's electrical load runs through the whole book as the worked example — the data is obtainable, the consequences are countable, the periodicity is obvious — and every chapter marks how the method carries over to energy, temperature, vibration, flow, throughput and quality. The first module is the curve itself: sampling period, units and the difference between a rate and a cumulative count; decomposing an industrial curve into baseline, process, environment and noise; the four downstream decisions a forecast feeds and their asymmetric error costs; and a seasonal-naive baseline that draws your pass mark — a model that cannot beat it does not deserve to ship. Then the data: the acquisition chain and its timestamps, the order in which gaps and bad points must be cleaned, resampling and aligning external drivers, and the most expensive mistake in time series — leakage. Then features and targets, statistical and gradient-boosted models, deep models and time-series foundation models. The sixth module answers the practical question of where to train: first measure whether you need a GPU at all, then work through Kaggle's quota, session wall and checkpoint-resume in detail, then compare ten platforms on cost, compliance and long-run capability. The book closes with experimental method (rolling-origin backtesting, metric traps, hyperparameter search), operations (inference scheduling, drift and retraining, integration with plant systems), and two complete cases.",
  },
  about_p1b: { zh: "全部内容中英双语,代码为 Python / 数据与配置 / 训练与部署三个视角,支持浅色/深色主题,进度保存在你自己的浏览器里,无需注册。涉及平台配额、单价与数据出境的章节为工程与管理提示,具体以各平台官网和你所在企业的合规要求为准。", en: "Everything is bilingual (Chinese/English); code comes from three angles — Python, data and configuration, training and deployment. Light and dark themes, progress kept in your own browser, no signup. Chapters touching platform quotas, prices and cross-border data transfer are engineering and management guidance — the authority is each vendor's own pages and your organisation's compliance rules." },
  about_h2: { zh: "「时序台与解释」是什么意思", en: "What 'the bench & the explanation' means" },
  about_p2: {
    zh: "时序建模的材料通常走两个极端:要么是论文和库文档(准确,但在你需要一个直觉的时候毫无帮助),要么是「十行代码做时序预测」(跑通了,然后在第一次遇到停机空洞、第一次被泄漏骗、第一次上线后误差翻倍时全线崩溃)。本站每章拆成三块:「时序台」是可交互模拟器,曲线分解、缺失填补、泄漏对比、误差累积、分位数覆盖率、显存估算、平台配额、训练成本、漂移与再训练全部在你的浏览器里现算,改一个参数就看到后果;「解释」讲清机制、代价和边界;「代码」给出 Python、数据与配置、训练与部署三个视角,让你能立刻在自己的机器上跑一遍。",
    en: "Material on time-series modelling runs to two extremes: papers and library docs (accurate, and no help at all when what you need is an intuition), or 'forecasting in ten lines' (it runs, then falls apart at the first shutdown gap, the first leak, the first doubling of error after go-live). Every chapter here splits into three. The bench is a live model — curve decomposition, gap filling, leakage side by side, error accumulation, quantile coverage, GPU memory, platform quota, training cost, drift and retraining, all computed in your browser — where one changed parameter shows the consequence. The explanation covers the mechanism, its price and its boundary. The code gives three angles — Python, data and configuration, training and deployment — so you can run it today.",
  },
  about_h3: { zh: "模型是手段,那个决策才是目的", en: "The model is a means; the decision is the point" },
  about_p3: {
    zh: "很多教程把时序预测讲成一份模型清单:ARIMA 是什么、LSTM 怎么搭、Transformer 怎么调。但没有人为了用 LSTM 而用 LSTM——你用它,是因为这个月的需量又被一次十五分钟的尖峰顶上去了、因为那台泵在没有任何预兆的情况下停了三天产线。本书把顺序倒过来:先给你一个真实后果——一次踩线的峰值、一次错过的窗口、一个被泄漏骗出来的漂亮分数、一次上线三个月后误差翻倍——再让你看清是哪一步数据、哪一个特征、哪一条验证规则在决定成败。学完你记住的不是「PatchTST 有几个 patch」,而是「这条曲线该用什么基线、这次缺失该怎么标、这个模型该在哪儿训、以及什么时候该重训」。",
    en: "Many tutorials teach forecasting as a model list: what ARIMA is, how to build an LSTM, how to tune a transformer. But nobody uses an LSTM for its own sake — you use it because this month's demand charge was set by a single fifteen-minute spike, or because a pump stopped the line for three days with no warning at all. This book inverts the order: it hands you a real consequence first — a peak you failed to shave, a window you missed, a beautiful score produced by leakage, an error that doubled three months after go-live — and then shows exactly which data step, which feature and which validation rule decided it. What you leave with is not how many patches PatchTST uses, but which baseline this curve deserves, how this gap should be flagged, where this model should be trained, and when it should be retrained.",
  },
  about_h4: { zh: "如何使用", en: "How to use it" },
  about_p4: {
    zh: "按路线图学:曲线与决策 → 数据工程 → 特征与目标 → 统计与树模型 → 深度与基础模型 → 训练平台 → 实验方法 → 上线运维 → 两个案例。如果你只想解决「在哪儿训」这一个问题,可以直奔模块 VI(PF1–PF5),那四章是独立可读的;但请至少先读 DT4(数据泄漏)和 EV1(滚动回测),因为在一个被泄漏污染的实验里买多少 GPU 都是浪费。如果你在设备或能源管理岗位、不写代码,读模块 I、VI 和 IX 就够,那三块不需要动手。每章的练习都要求你离开本站动手:导出自己产线的历史数据、跑一次季节朴素基线、把随机切分和时间切分对比一遍、在 Kaggle 上完整跑一次带断点续训的任务。本书写于 2026 年,平台配额与价格变化很快,凡涉及具体平台与单价的部分请以官网为准;涉及计费与合规的部分为工程提示,不构成法律或商务意见。",
    en: "Follow the roadmap: the curve and the decision → data engineering → features and targets → statistical and tree models → deep and foundation models → training platforms → experimental method → operations → two cases. If your only question is where to train, jump straight to module VI (PF1–PF5); those four chapters stand alone — but read DT4 (leakage) and EV1 (rolling-origin backtesting) first, because no amount of GPU rescues an experiment that leaks. If you sit on the equipment or energy side and do not write code, modules I, VI and IX are enough and require no hands on a keyboard. Every chapter's exercises send you away from this site: export your own line's history, score a seasonal-naive baseline, run shuffled and time-ordered splits side by side, and complete one checkpoint-and-resume run on Kaggle. This book was written in 2026; platform quotas and prices move quickly, so treat any specific platform or unit price as indicative and check the vendor's own pages. Material on billing and compliance is engineering guidance, not legal or commercial advice."
  },
};

window.LangContext = LangContext;
window.useLangState = useLangState;
window.useLang = useLang;
window.useT = useT;
window.pick = pick;
window.other = other;
window.fmt = fmt;
window.UI = UI;
