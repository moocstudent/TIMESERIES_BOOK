/* =========================================================
   Curriculum data — 9 modules / 30 chapters
   ---------------------------------------------------------
   Metadata only (bilingual). The teaching content ("解释")
   for each chapter lives in content/<id>.<lang>.md and is
   fetched on demand by the chapter page. `viz` names an
   interactive bench ("时序台") from viz.jsx … viz4.jsx; the
   code listings live in code.jsx / code2.jsx (looked up by
   chapter id). `props` lists the key concepts the chapter
   leans on.

   Domain: training models on industrial time series — load,
   energy, temperature, vibration, flow, throughput, quality.
   One factory's electrical load is the worked example that
   runs through the whole book; every chapter marks how the
   method carries to the other signals.
   ========================================================= */

const MODULES = [
  {
    id: "m1", arch: "m1-arch", code: "SG", accent: "primary", level: 1,
    zh: "一条曲线,和它服务的那个决策", en: "One Curve, and the Decision It Serves",
    tagline: { zh: "没有人为了预测而预测。先说清这条曲线服务哪个决策,再说该把误差压在哪一端。", en: "Nobody forecasts for its own sake. Name the decision the curve serves, then you know which end of the error to squeeze." },
    description: {
      zh: "在导入第一个库之前,先把曲线和决策看清楚。工业现场的时序有一个共同的形状:一层几乎不动的基线(设备待机、厂房照明、保温功率),一层被工况切出来的方波(开机停机、换班、批次、产量),一层被环境慢慢推着走的趋势(温度、湿度、季节),再加一层谁也解释不了的噪声。你要预测的从来不是这四层的总和,而是其中某一层——而搞错了是哪一层,后面所有的模型工作都会白费。第一章把一条真实形状的工业曲线合成出来,让你把四层分别开关掉,看它们各自贡献了多少方差,并讲清两个最常被混淆的东西:采样周期决定了你永远看不见哪一类事件,以及瞬时量(kW、℃、m³/h)和累积量(kWh、总产量、运行小时)在建模上完全不是一回事。第二章问一个更硬的问题:这个预测给谁用。日前申报、需量控制、错峰与储能调度、异常告警——这四类下游决策对误差的容忍完全不同,而且几乎都是不对称的:低估 100 千瓦和高估 100 千瓦的代价差着好几倍。这一章用一个代价模型把不对称画出来,并给出一个结论——你优化的损失函数应该由这张代价表决定,而不是由教程默认的 MSE 决定。第三章给你一条及格线:季节朴素基线。把「昨天同一时刻」「上周同一时刻」「最近四周同刻位中位数」三条基线跑在同一份数据上,你会得到一个往往低于 8% 的 MAPE——这就是你后面所有模型必须先跨过的横杆。跨不过去的模型不该上线,这条规矩比任何架构选择都重要。",
      en: "Before importing a single library, look at the curve and the decision. Industrial series share a shape: a baseline that barely moves (standby draw, lighting, holding power), a square wave cut by the process (start-ups, shift changes, batches, throughput), a slow push from the environment (temperature, humidity, season), and a layer of noise nobody can explain. What you need to predict is never the sum of the four but one of them — and getting that wrong wastes every modelling hour that follows. Chapter one synthesises a realistically shaped industrial curve and lets you switch the four layers off one at a time to see how much variance each contributes, then settles two things that are constantly confused: the sampling period decides which class of event you can never see, and instantaneous quantities (kW, °C, m³/h) behave nothing like cumulative ones (kWh, units produced, running hours) once you start modelling. Chapter two asks a harder question: who consumes this forecast. Day-ahead declaration, demand-charge control, load shifting and storage dispatch, anomaly alerting — these four downstream decisions tolerate error very differently, and nearly all of them are asymmetric: being a hundred kilowatts low costs several times what being a hundred high costs. A cost model draws that asymmetry, and the conclusion follows: your loss function should be chosen by that cost table, not by the tutorial's default MSE. Chapter three hands you a pass mark — the seasonal-naive baseline. Run yesterday-same-time, last-week-same-time and a four-week same-slot median against the same data and you will usually land under 8% MAPE. That is the bar every later model must clear. A model that cannot clear it should not ship, and that rule matters more than any architecture choice.",
    },
  },
  {
    id: "m2", arch: "m2-arch", code: "DT", accent: "accent", level: 1,
    zh: "数据:从传感器到训练集", en: "Data: From the Sensor to the Training Set",
    tagline: { zh: "模型的上限由数据决定,而数据的下限由那条没人看过的采集链路决定。", en: "Data sets the model's ceiling — and an acquisition chain nobody has inspected sets the data's floor." },
    description: {
      zh: "工业时序的数据问题和互联网数据完全不同:量不大,但每一个坑都能让模型学到假东西。这个模块沿着数据从传感器到训练集的整条路走一遍,在每一跳上标出它会怎么变形。第一章讲采集链路:仪表出的是瞬时值还是区间平均、PLC 的扫描周期和历史库的存储周期是不是一回事、SCADA 的压缩算法(死区、旋转门)会怎么悄悄抹掉你要找的尖峰、时标到底是设备打的还是网关打的、以及为什么同一个点位在两个系统里能差出一个小时。这些不是「数据工程的琐事」,它们直接决定你的标签是不是真的。第二章讲缺失和坏点,重点不在填补方法,而在顺序:必须先把缺失分类(通信中断、设备停机、仪表故障、真实为零),再决定填什么——把一次停机的零值用线性插值抹平,等于教模型「停机不存在」,而这恰恰是你最需要它认出来的模式。这一章用一个可调的注入实验,把五类缺陷×五种处理方式对下游误差的影响全算出来,结论很反直觉:诚实地标记缺失,几乎总是比聪明地填补它更好。第三章讲重采样与对齐:降采样用什么聚合(均值、最大、最后值)取决于你预测的是什么、时区与夏令时怎么把一年里的两天悄悄搞坏、外部变量(气温、气象预报、排产计划)怎么按「预测时刻可获得」的原则对齐——注意是预报值而不是实测值,因为上线那天你拿不到实测。第四章是整个模块的重点,也是整本书最贵的一课:数据泄漏。",
      en: "Data problems in industry look nothing like web data: the volume is small, but every pothole teaches the model something false. This module walks the whole path from sensor to training set and marks how the data deforms at each hop. Chapter one is the acquisition chain: whether the instrument reports an instantaneous value or an interval average, whether the PLC scan period is the same thing as the historian's storage period, how a historian's compression (deadband, swinging door) quietly erases the very spikes you are hunting, whether the timestamp was stamped by the device or by the gateway, and why one tag can differ by an hour between two systems. None of this is data-engineering trivia; it decides whether your labels are true. Chapter two covers gaps and bad points, and the emphasis is not on imputation methods but on order: classify the gap first (comms outage, planned shutdown, instrument fault, genuine zero), then decide what to fill — smoothing a shutdown's zeros with linear interpolation teaches the model that shutdowns do not exist, which is precisely the pattern you needed it to recognise. An injection experiment computes the effect of five defect classes against five treatments on downstream error, and the result is counter-intuitive: flagging a gap honestly almost always beats filling it cleverly. Chapter three is resampling and alignment: which aggregation to use when downsampling (mean, max, last) depends on what you are predicting; how time zones and daylight saving quietly ruin two days a year; and how external drivers (temperature, forecasts, the production schedule) must be aligned on what was actually available at prediction time — forecast values, not measurements, because on go-live day the measurement does not exist yet. Chapter four is the module's core and the book's most expensive lesson: leakage.",
    },
  },
  {
    id: "m3", arch: "m3-arch", code: "FE", accent: "primary", level: 2,
    zh: "特征与目标", en: "Features and Targets",
    tagline: { zh: "在这类任务上,一个想清楚的滞后集合比换一个架构值钱得多。", en: "On this kind of task, a well-reasoned lag set is worth far more than a new architecture." },
    description: {
      zh: "树模型看不见时间。你把一张带时间戳的表丢给 LightGBM,它只会把时间戳当成一个递增的数字,然后在测试集上外推失败。让它看见时间的唯一办法,是你把时间结构显式地写进特征里——这就是这个模块做的事。第一章讲三类最基础也最有效的特征:滞后(lag)、滚动统计(rolling)和日历(calendar)。滞后集合不是拍脑袋选的,自相关和偏自相关会告诉你哪些滞后真的携带信息;但更重要的是一条工程约束——在预测未来 96 步的场景里,lag_1 到 lag_95 在推理时根本不存在,你能用的最小滞后等于你的预测步长。这一条能让一半的「线下很好线上崩掉」当场归因。滚动统计还有一个经典陷阱:窗口必须是右闭开的,把当前时刻算进均值里就是泄漏。第二章讲外生变量:环境(温度、湿度、气压)、工况(设备状态、批次、产品型号)、计划(排产、检修、订单)。这一章的重点是「边际收益」——每加一类外生变量,误差降多少、代价是什么(上线时这个变量拿得到吗?它本身准吗?),以及温度这类变量为什么必须做非线性变换(HDD/CDD、分段、二次项),因为负荷对温度的响应是一条 U 形曲线而不是直线。第三章讲目标的定义方式,这是初学者最容易做错的一步:递归预测(用预测值当输入继续预测)误差会累积,直接多步(每一步训一个模型)不累积但要训 96 个模型,seq2seq 一次出整条曲线但更吃数据。三种方案在不同步长上的优劣会自己交叉,这一章让你把交叉点找出来。",
      en: "Tree models cannot see time. Hand LightGBM a table with a timestamp and it treats that timestamp as an increasing number, then fails to extrapolate on the test set. The only way to make it see time is to write the temporal structure into the features explicitly, which is what this module does. Chapter one covers the three most basic and most effective families: lags, rolling statistics and calendar features. The lag set is not guessed — autocorrelation and partial autocorrelation tell you which lags actually carry information — but the more important point is an engineering constraint: when forecasting 96 steps ahead, lag_1 through lag_95 do not exist at inference time, so the smallest lag you may use equals your horizon. That single rule explains half of all 'great offline, broken online' failures on the spot. Rolling statistics carry a classic trap of their own: the window must be half-open on the right, because including the current instant in the mean is leakage. Chapter two covers exogenous drivers: environment (temperature, humidity, pressure), process state (equipment status, batch, product type) and plans (schedule, maintenance, orders). The focus is marginal return — how much error each family removes, what it costs (will this variable exist at inference? is it itself accurate?), and why a variable like temperature needs a non-linear transform (degree days, binning, a quadratic term), because load responds to temperature along a U rather than a line. Chapter three defines the target, which is where beginners most often go wrong: recursive forecasting (feeding predictions back in) compounds error; direct multi-step (one model per step) does not compound but needs 96 models; seq2seq emits the whole curve at once but is hungrier for data. The three cross over at different horizons, and this chapter makes you find the crossing point.",
    },
  },
  {
    id: "m4", arch: "m4-arch", code: "ML", accent: "accent", level: 2,
    zh: "统计基线与梯度提升", en: "Statistical Baselines and Gradient Boosting",
    tagline: { zh: "在工业时序这个赛道上,树模型至今没输。先把它打到极限,再谈深度学习。", en: "On industrial series, trees have not lost yet. Push them to their limit before you talk about deep learning." },
    description: {
      zh: "这个模块的立场很明确:先用最便宜的模型把问题解决到八成,再去考虑贵的。第一章讲统计模型。ARIMA 系列今天已经很少作为主力上线,但它仍然值得学,原因有三:它逼你直面平稳性、差分和季节性这些时序的基本概念;它在单条序列、短历史、需要解释的场合仍然好用;而且它给出的残差诊断(自相关图、Ljung-Box)是你检查任何模型是否还有结构没学到的通用工具。这一章会真的跑一个 AR 过程、做季节差分、看残差从有结构变成白噪声,同时诚实地说清它的极限:多变量、多序列、非线性工况切换,SARIMAX 都吃力。第二章是整个模块的中心:梯度提升树。ASHRAE 那场著名的建筑能耗竞赛,前排解法清一色是 LightGBM 集成,不是因为参赛者不会深度学习,而是因为在这类「表格化时序 + 强日历结构 + 中等数据量」的任务上,树模型确实更强、更快、更省事。这一章把梯度提升的机制讲到你能在纸上算一棵树,然后讲这类任务上真正重要的几个参数和一个必须遵守的纪律:early stopping 的验证集必须是时间上靠后的那一段。第三章从点预测走到概率预测:调度和告警需要的从来不是一个数,而是一个区间。分位数回归、pinball loss、覆盖率校准,以及一个常见误解——P90 不是「安全值」,它是有 10% 概率被突破的值,你的决策要按这个概率来算钱。第四章讲全局模型:一千个电表不训一千个模型,而是训一个,靠序列 ID、静态属性和归一化让它同时服务所有序列,并且让数据少的新表从别的表那里借到力。",
      en: "This module takes a clear position: solve eighty percent of the problem with the cheapest model available before considering an expensive one. Chapter one covers statistical models. The ARIMA family rarely ships as the primary model today, but it earns its place for three reasons: it forces you to confront stationarity, differencing and seasonality; it is still good on a single series with short history where an explanation is required; and its residual diagnostics (correlograms, Ljung-Box) are the general tool for checking whether any model has left structure on the table. The chapter runs a real AR process, applies seasonal differencing and watches residuals turn from structured into white noise, while being honest about the limits: multivariate inputs, many series and non-linear regime switching all strain SARIMAX. Chapter two is the module's centre: gradient-boosted trees. The front of the famous ASHRAE building-energy competition was uniformly LightGBM ensembles — not because those teams could not do deep learning, but because on this class of task (tabularised series, strong calendar structure, moderate data) trees really are stronger, faster and less trouble. The chapter explains boosting until you could grow a tree on paper, then covers the handful of parameters that matter here and one discipline you may not break: the early-stopping validation set must be the later segment in time. Chapter three moves from point to probabilistic forecasting, because dispatch and alerting never wanted a number, they wanted an interval: quantile regression, pinball loss, coverage calibration, and one common misconception — P90 is not a safe value, it is the value with a ten percent chance of being exceeded, and your decision must price that probability. Chapter four covers global models: a thousand meters do not get a thousand models, they get one, using series identifiers, static attributes and normalisation to serve them all at once, letting a new meter with little history borrow strength from the rest.",
    },
  },
  {
    id: "m5", arch: "m5-arch", code: "DL", accent: "primary", level: 3,
    zh: "深度模型与时序基础模型", en: "Deep Models and Time-Series Foundation Models",
    tagline: { zh: "深度模型不是更好的模型,是在特定条件下才划算的模型。先搞清那些条件。", en: "A deep model is not a better model — it is a model that pays off under specific conditions. Learn the conditions first." },
    description: {
      zh: "到这里你已经有了一个很难打败的树模型基线。这个模块讲什么时候、为什么、怎么用深度模型超过它,以及一个同样重要的答案:很多时候超不过。第一章从最小的神经网络开始:一个把滞后窗口拍平送进 MLP 的模型,和树模型比,它赢在哪(连续的非线性、共享表示、天然支持多输出)、输在哪(小数据过拟合、需要归一化、训练不稳定)。然后是 LSTM 和 TCN——循环与膨胀卷积两条路线的机制、感受野、并行度和梯度问题。这一章会用一条「参数量 × 数据量」的等高线告诉你:在三万五千个点上训一个两百万参数的模型,过拟合不是风险,是必然。第二章讲近几年的时序专用架构:N-BEATS 的可解释分解、PatchTST 把序列切片当 token 的思路、以及那篇让整个领域尴尬的 DLinear——一个线性层在多个公开基准上打平甚至打败了一堆 Transformer。这一章的态度是实证的:在同一个算力预算下比精度、比训练时间、比调参难度,让结论自己出来。第三章讲时序基础模型:Chronos、TimesFM、Moirai、Time-MoE 这类在海量时序上预训练、可以 zero-shot 预测的模型。重点是一个非常实用的决策顺序——先 zero-shot 试一把(不要钱、不要训练、五分钟出结果),它可能已经接近你调了两周的模型;不够好再考虑微调,而微调才是这本书里第一个真正需要 GPU 的动作。第四章把训练循环本身当作工程对象来讲:显存怎么估(参数 + 梯度 + 优化器状态 + 激活,大约是参数量的四到五倍)、batch 和序列长度怎么换显存、学习率和早停怎么定、种子和确定性怎么保证实验可复现——这一章直接为下一个模块「在哪儿训」准备好所有数字。",
      en: "By now you have a tree baseline that is hard to beat. This module covers when, why and how a deep model gets past it — and an equally important answer: often it does not. Chapter one starts with the smallest neural network, an MLP fed a flattened lag window, and asks where it beats trees (smooth non-linearity, shared representations, native multi-output) and where it loses (overfitting on small data, sensitivity to scaling, unstable training). Then LSTM and TCN: recurrence versus dilated convolution, receptive field, parallelism and gradient behaviour. A contour of parameters against data size makes the point bluntly: training two million parameters on thirty-five thousand points is not a risk of overfitting, it is a certainty. Chapter two covers the recent purpose-built architectures: N-BEATS and its interpretable decomposition, PatchTST's idea of slicing the series into tokens, and the DLinear paper that embarrassed the whole field by matching or beating a pile of transformers with a single linear layer. The stance here is empirical: hold the compute budget fixed and compare accuracy, training time and tuning difficulty, then let the conclusion arrive on its own. Chapter three covers time-series foundation models — Chronos, TimesFM, Moirai, Time-MoE — pretrained on enormous corpora and able to forecast zero-shot. The practical point is an ordering: try zero-shot first (free, no training, five minutes to a result), because it may already be close to the model you tuned for a fortnight; fine-tune only if it is not, and fine-tuning is the first action in this book that genuinely needs a GPU. Chapter four treats the training loop itself as an engineering object: estimating GPU memory (parameters plus gradients plus optimiser state plus activations, roughly four to five times the parameter count), trading batch size against sequence length, setting learning rate and early stopping, and pinning seeds and determinism so an experiment can be reproduced — producing exactly the numbers the next module needs.",
    },
  },
  {
    id: "m6", arch: "m6-arch", code: "PF", accent: "accent", level: 2,
    zh: "在哪儿训:Kaggle 与其他路", en: "Where to Train: Kaggle and the Alternatives",
    tagline: { zh: "先回答「要不要 GPU」,再回答「在哪儿租」。这两个问题的顺序反了,钱就白花了。", en: "Answer 'do I need a GPU' before 'where do I rent one'. Reverse the order and the money is wasted." },
    description: {
      zh: "这个模块回答那个最常被问、也最常被答错的问题:模型在哪儿训。它被答错的方式通常是这样——还没量过工作量就先去找 GPU,结果租了一张卡去跑一个在笔记本上三分钟就能跑完的 LightGBM。所以第一章不讲平台,讲测量:把行数、特征数、模型族、超参组合数和交叉验证折数输进去,估算出 CPU 分钟数和 GPU 分钟数,并画出那条分界线。结论对大多数工业时序任务是明确的:一座工厂三年的 15 分钟数据是十万行量级,树模型在一台普通笔记本上是分钟级的,你不需要 GPU。真正需要 GPU 的只有三种情况——微调时序基础模型、上千条序列的全局深度模型、以及大规模超参搜索。第二章把 Kaggle 讲透,因为它是免费额度里最实用的一个:私有数据集怎么传、Notebook 怎么挂载、每周 30 小时 GPU 配额和 9 小时会话墙意味着什么、为什么「Save & Run All」的后台提交才是正确用法而不是坐在浏览器前看它跑、以及最关键的——怎么用「把 checkpoint 存成新的数据集版本、下次挂载回来」这个技巧把一次 40 小时的训练切成能跨越会话墙的若干段。这一章的时序台会让你亲眼看到:关掉 checkpoint,一次超过 9 小时的训练永远也跑不完。第三章把 Colab 单独拿出来讲:它和 Kaggle 看起来同类,持久化模型却正好相反——运行时随时可能被抢占,/content 连同中间产物一起消失,只有挂载的 Drive 活下来,于是「多久存一次盘」变成一个有闭式最优解的问题(Young 公式)。第四章横向比其他路:按小时租卡、国内的免费算力平台、本地机器,在成本、可达性、长跑能力、数据合规四个维度上打分——特别是最后一个维度,工业现场的数据往往是客户资产,传到境外平台是一个需要先问清楚的问题,而不是一个技术细节。第五章把整件事变成一张预算表:一次完整的实验计划(几个模型 × 几组超参 × 几折回测)要多少 GPU 小时、多少钱、多少天,以及三个把这个数字砍掉一半的实用手法。",
      en: "This module answers the question that gets asked most often and answered wrong most often: where should the model be trained. It is usually answered wrong the same way — hunting for a GPU before measuring the workload, then renting a card to run a LightGBM job that a laptop finishes in three minutes. So chapter one is not about platforms, it is about measurement: feed in row count, feature count, model family, the number of hyperparameter combinations and the number of folds, and it estimates CPU minutes against GPU minutes and draws the dividing line. For most industrial series the conclusion is unambiguous: three years of fifteen-minute data from one plant is on the order of a hundred thousand rows, a tree model finishes in minutes on an ordinary laptop, and you do not need a GPU. Only three situations genuinely do — fine-tuning a foundation model, a global deep model over thousands of series, and a large hyperparameter search. Chapter two covers Kaggle thoroughly, because it is the most useful of the free tiers: how to upload a private dataset, how a notebook mounts it, what a weekly thirty GPU-hour quota and a nine-hour session wall actually mean, why 'Save & Run All' as a background commit is the correct usage rather than watching it run in a browser tab, and above all the technique that makes long training possible — writing checkpoints, publishing them as a new dataset version and mounting them back next session, slicing a forty-hour run into segments that survive the wall. The bench makes the consequence visible: with checkpointing off, any run longer than nine hours never finishes. Chapter three gives Colab a chapter of its own: it looks like the same class of thing as Kaggle while inverting its persistence model — the runtime can be preempted at any moment and /content vanishes with every intermediate artefact, leaving only a mounted Drive, so how often to save becomes a question with a closed-form optimum (Young's formula). Chapter four compares the remaining alternatives — hourly card rental, domestic free-compute platforms, local hardware — across cost, reachability, long-run capability and data compliance. That last dimension deserves its weight: plant data is frequently the customer's asset, and sending it to an overseas platform is a question to settle before the project, not a technical detail. Chapter five turns all of it into a budget: how many GPU hours, how much money and how many days a full experiment plan (models × hyperparameters × folds) will take, and three practical moves that halve the number.",
    },
  },
  {
    id: "m7", arch: "m7-arch", code: "EV", accent: "primary", level: 2,
    zh: "实验方法:回测、指标与调参", en: "Method: Backtesting, Metrics and Tuning",
    tagline: { zh: "一个错的验证方案,会让你在错的方向上高高兴兴地努力三个月。", en: "A wrong validation scheme lets you work happily in the wrong direction for three months." },
    description: {
      zh: "模型训完了,你怎么知道它是真的好?这个模块讲的是实验方法——本书认为它比模型选择更能决定项目成败。第一章讲时序的交叉验证:滚动原点回测(rolling origin)。固定训练窗还是扩展训练窗、每次前进多少、留多少间隔(gap)防止泄漏、折数太少为什么会让结论完全不可信。这一章会让你看到一个真实现象:同一个模型在不同的单次切分上,MAPE 能差出两倍;只有多折滚动回测的均值和方差放在一起,你才有资格说 A 比 B 好。第二章讲指标,重点是它们各自的陷阱。MAPE 是工业界最常用的,也是最容易骗人的——分母接近零的时候(夜间低负荷、设备停机)单点百分比误差可以冲到几百,一个停机时段就能毁掉整月的指标。WAPE、MASE、RMSE、pinball、峰值时刻误差各有各的适用场合,而最重要的一类指标是按后果计价的:如果预测是给需量控制用的,那唯一重要的指标是「月最大需量估计偏差」,平均误差再漂亮也没用。这一章让你把同一组预测在六个指标下排名一遍,看排名怎么互相矛盾。第三章讲超参搜索与可复现:随机搜索为什么在多数情况下优于网格、TPE 这类贝叶斯方法什么时候才值得、固定预算下三种策略的收敛曲线长什么样、以及验证集过拟合——搜了三百次之后你选出来的那一组,有相当一部分优势是运气。配套讲实验管理的最低配置:每次运行记录代码版本、数据版本、种子、参数和结果,五行代码就能做到,却是区分「能复现的实验」和「一堆再也复现不出来的好成绩」的分水岭。",
      en: "The model has trained — how do you know it is actually good? This module is about experimental method, which this book holds to be more decisive than model selection. Chapter one covers cross-validation for time series: rolling-origin backtesting. Fixed versus expanding training windows, how far to advance each fold, how large a gap to leave to prevent leakage, and why too few folds makes a conclusion worthless. A real phenomenon becomes visible: the same model can score twice the MAPE on different single splits, and only the mean and variance across many rolling folds entitle you to say A beats B. Chapter two covers metrics and their traps. MAPE is industry's favourite and its most deceptive — as the denominator approaches zero (night-time load, a stopped machine) a single point's percentage error reaches the hundreds, and one shutdown window can ruin a month's number. WAPE, MASE, RMSE, pinball and peak-timing error each have their place, and the most important class is priced by consequence: if the forecast feeds demand-charge control, the only metric that matters is the deviation of the estimated monthly peak, however pretty the average error looks. You rank one set of predictions under six metrics and watch the rankings contradict each other. Chapter three covers hyperparameter search and reproducibility: why random search usually beats grid, when Bayesian methods like TPE start paying off, what the three convergence curves look like under a fixed budget, and validation-set overfitting — after three hundred trials, a good part of the winner's margin is luck. Alongside it, the minimum viable experiment log: record code version, data version, seed, parameters and result on every run — five lines of code, and the difference between experiments you can reproduce and a pile of good scores you will never see again.",
    },
  },
  {
    id: "m8", arch: "m8-arch", code: "OP", accent: "accent", level: 3,
    zh: "上线与运维", en: "Shipping and Operations",
    tagline: { zh: "线下的分数是一次性的,线上的误差是每天都要重新赚的。", en: "An offline score is earned once; online accuracy has to be re-earned every day." },
    description: {
      zh: "模型跑出好分数只是项目的一半,另一半是让它在厂里连续活三年。这个模块讲上线之后的事。第一章讲推理服务与发布时刻表:日前预测在几点发布、上游数据几点到齐、气象预报几点更新、日内滚动预测多久刷一次,这些时刻共同决定了你的服务必须在多长的窗口内完成;还有一个必须设计的东西——降级路径:当上游数据没到、模型服务挂了、特征里有 NaN 的时候,系统输出什么?正确答案永远不是报错,而是自动回落到季节朴素基线,并把这次降级记录下来。第二章讲漂移与再训练。工业时序的漂移有非常具体的来源:换了产品型号、加了一条产线、改了排产规则、换季、设备大修。这些事件发生时,你的模型不是慢慢变差,而是某一天突然变差。这一章把两种再训练策略放在一起比:按日历定期重训(简单,但总是慢半拍,而且在没必要的时候烧钱),和按漂移触发重训(用误差的滑动窗口和输入分布的距离作为触发器,更快但需要监控)。时序台会让你看到触发阈值定得太敏感是什么后果——每周都在重训,每次都没变好。第三章讲集成、告警和一件工程师最容易低估的事:人的信任。预测要写回上位系统(EMS、SCADA、MES、能管平台)才有用,而接口怎么设计、失败怎么重试、历史预测怎么留档是可靠性的基础;告警阈值则是一个 ROC 问题,定得太松没人看,定得太紧运行人员两周之后就开始无视它——这本书把「告警疲劳」当作一个必须用数字管理的指标,而不是一个态度问题。",
      en: "A good score is half the project; the other half is surviving three years inside a plant. This module covers life after go-live. Chapter one is the inference service and its publication schedule: what time the day-ahead forecast is published, when upstream data is complete, when the weather forecast refreshes, how often the intraday rolling forecast updates — together these fix the window your service must finish inside. And one thing that must be designed rather than discovered: the degradation path. When upstream data is late, the model service is down, or a feature is NaN, what does the system emit? The right answer is never an error; it is an automatic fall back to the seasonal-naive baseline, with the fallback recorded. Chapter two covers drift and retraining. Drift in industrial series has concrete causes: a new product type, an added line, a changed schedule, a change of season, a major overhaul. When those happen the model does not decay slowly, it gets worse on a particular day. Two strategies sit side by side: calendar retraining (simple, always half a step behind, and burning compute when nothing changed) and drift-triggered retraining (a sliding error window and a distance on the input distribution as triggers — faster, but it needs monitoring). The bench shows what an over-sensitive threshold costs: retraining every week and improving nothing. Chapter three covers integration, alerting and the thing engineers most underestimate — human trust. A forecast is only useful once it is written back to the plant system (EMS, SCADA, MES, an energy platform), so interface design, retry on failure and archiving past forecasts are the foundation of reliability. The alert threshold is an ROC problem: too loose and nobody looks, too tight and the operators start ignoring it within a fortnight. This book treats alert fatigue as a number to be managed, not an attitude problem.",
    },
  },
  {
    id: "m9", arch: "m9-arch", code: "CS", accent: "primary", level: 3, role: "case",
    zh: "案例研究", en: "Case Studies",
    tagline: { zh: "两个完整的案例:一本算得清的账,和一张排得出来的日程。", en: "Two complete cases: a ledger that adds up, and a schedule you could actually run." },
    description: {
      zh: "最后两章把前面二十八章的所有参数放回两个完整的场景里。第一个案例是一座注塑厂的日前负荷预测与需量控制——这是工业时序里少数几个「预测准一点就能直接换成钱」的场景:变压器容量 2000 kVA、月最大需量按 15 分钟滑动窗口计费、每千瓦需量电费 42 元,一次没压住的尖峰就是好几万。案例把整条链路走完:数据从哪来、基线是多少、模型把误差从多少降到多少、需量控制策略怎么根据预测提前削峰、以及最关键的一步——把预测误差换算成真实的电费节省,并诚实地扣掉误判造成的停机损失和系统本身的成本。你会在时序台上看到一个反直觉的结论:把 MAPE 从 6% 优化到 4% 带来的收益,远小于把「峰值时刻判断准确率」从 70% 提到 85%——因为需量计费只看那一个十五分钟。第二个案例是一份可执行的十四天计划:从「我有一堆电表数据和一个 Kaggle 账号」到「模型每天早上七点自动出预测并写回能管平台」,每天做什么、每天的验收标准是什么、哪几天可以并行、哪几个点是风险最高的关卡。这一章的时序台是一个带资源约束的计划模型:改变可用人天、是否有 GPU、数据质量好坏,看这十四天怎么变成二十一天,以及哪一个环节最容易让整个项目延期。",
      en: "The last two chapters put every parameter from the preceding twenty-eight back into two complete scenarios. The first is day-ahead load forecasting and demand-charge control at an injection-moulding plant — one of the few industrial settings where a more accurate forecast converts directly into money: a 2000 kVA transformer, monthly peak demand billed on a fifteen-minute sliding window, forty-two yuan per kilowatt of demand, and a single unshaved spike costing tens of thousands. The case walks the full chain: where the data comes from, what the baseline scores, how far the model moves the error, how the control strategy shaves ahead of a predicted peak, and the decisive step — converting forecast error into real money saved, honestly net of the production loss caused by false alarms and the cost of the system itself. The bench produces a counter-intuitive result: improving MAPE from 6% to 4% is worth far less than lifting peak-timing accuracy from 70% to 85%, because demand billing only ever looks at one fifteen-minute window. The second case is an executable fourteen-day plan: from 'I have a pile of meter data and a Kaggle account' to 'a forecast is produced automatically at seven every morning and written back to the energy platform' — what happens each day, what each day's acceptance criterion is, which days can run in parallel, and which gates carry the most risk. Its bench is a resource-constrained plan model: change the available person-days, whether a GPU exists and how good the data is, and watch fourteen days become twenty-one — and which single step is most likely to delay the whole project.",
    },
  },
];

const CHAPTERS = [
  /* ============ M1 · SG 一条曲线,和它服务的那个决策 ============ */
  {
    id: "t1", code: "SG1", moduleId: "m1", difficulty: 1, hours: 4, prereq: [], viz: "curveLab",
    props: ["采样周期", "瞬时量 vs 累积量", "四层分解", "方差贡献", "可见事件尺度"],
    title: { zh: "一条工业曲线的解剖:基线、工况、环境、噪声", en: "Anatomy of an Industrial Curve: Baseline, Process, Environment, Noise" },
    summary: {
      zh: "打开任何一座工厂的历史数据,你看到的曲线都是四样东西叠在一起的结果。最底下是基线:待机功率、照明、保温、常开的辅机——它几乎不动,但它决定了你曲线的「地板」在哪里,也决定了 MAPE 这类相对指标在低负荷时段会不会爆炸。往上是工况层:开机、停机、换班、批次切换、产量爬坡,这是一层方波,幅度最大、信息最多,也是你真正想预测的东西。再往上是环境层:温度推着空调和冷却系统走,湿度影响干燥工序,季节把整条曲线整体抬高或压低——它慢、平滑、可以从外部预报拿到,因此是外生特征的主力。最上面是噪声:测量误差、无法解释的短时波动、真正的随机。这一章用一个可调的合成器把四层分别开关,让你看到每一层贡献了多少方差——典型的工业负荷里,工况层往往占七成以上,而很多人花最多时间调的模型容量,其实是在拟合那 5% 的噪声。这一章还要把两个基础概念钉死:第一,采样周期决定了你能看见什么——15 分钟的数据里,一次持续 40 秒的启动冲击不是「不明显」,而是根本不存在,你再换什么模型也找不回来;第二,瞬时量(kW、℃、m³/h)和累积量(kWh、总产量)在建模上是两种东西,把累积量直接当序列训练,模型学到的第一件事永远是「一直在涨」。",
      en: "Open any plant's historian and the curve you see is four things stacked. At the bottom is the baseline: standby draw, lighting, holding power, auxiliaries that never switch off. It barely moves, but it sets the floor of your curve and decides whether relative metrics like MAPE will explode during low-load hours. Above it is the process layer: start-ups, shutdowns, shift changes, batch transitions, ramp-ups. This is a square wave — the largest amplitude, the most information, and the thing you actually want to predict. Above that is the environment: temperature pushing chillers and cooling, humidity driving the dryers, a season lifting or lowering the entire curve. It is slow, smooth and available as an external forecast, which is why it carries most exogenous features. On top is noise: measurement error, unexplainable short fluctuations, genuine randomness. An adjustable synthesiser lets you switch the four layers independently and see how much variance each contributes — in a typical industrial load the process layer is often over seventy percent, while the model capacity people spend most of their time tuning is in fact fitting the five percent that is noise. Two foundations get nailed down here. First, the sampling period decides what is visible: in fifteen-minute data a forty-second inrush is not 'subtle', it does not exist, and no change of model will recover it. Second, instantaneous quantities (kW, °C, m³/h) and cumulative ones (kWh, units produced) are different objects — train on a cumulative series directly and the first thing your model learns is that the number always goes up.",
    },
    objectives: [
      { zh: "把一条工业曲线分解成基线、工况、环境、噪声四层", en: "Decompose an industrial curve into baseline, process, environment and noise" },
      { zh: "用方差贡献判断该把模型容量花在哪一层", en: "Use variance share to decide where model capacity belongs" },
      { zh: "根据采样周期判断哪些事件在数据里根本不存在", en: "Judge from the sampling period which events cannot exist in the data" },
      { zh: "区分瞬时量与累积量,并选对建模形式", en: "Separate instantaneous from cumulative quantities and model each correctly" },
    ],
    outline: [
      { zh: "四层结构:每一层从哪来、动多快", en: "Four layers: where each comes from, how fast it moves" },
      { zh: "方差贡献:你到底在预测什么", en: "Variance share: what you are really predicting" },
      { zh: "采样周期与可见事件的尺度", en: "Sampling period and the scale of visible events" },
      { zh: "瞬时量、累积量与差分", en: "Instantaneous, cumulative, and differencing" },
    ],
  },
  {
    id: "t2", code: "SG2", moduleId: "m1", difficulty: 1, hours: 5, prereq: ["t1"], viz: "valueLab",
    props: ["下游决策", "不对称代价", "损失函数选择", "峰值 vs 均值", "预测的价值上限"],
    title: { zh: "预测给谁用:四类决策与不对称的误差代价", en: "Who Uses the Forecast: Four Decisions and Their Asymmetric Costs" },
    summary: {
      zh: "「预测准一点」本身没有价值,有价值的是它让某个决策变好。工业时序的预测通常服务四类决策,而它们对误差的要求完全不同,甚至互相矛盾。第一类是申报与采购:提前把用量报给供应方,报多了付冗余费,报少了付偏差考核,代价函数是一个有明确折点的 V 形。第二类是需量或容量控制:只有月度(或计费周期内)那一个最大的十五分钟窗口重要,其余时刻预测得再准也不加分——这类决策要的是「峰值时刻与幅度」,平均误差是个几乎无关的指标。第三类是调度与储能:充放电计划依赖的是未来若干小时的形状而不是单点值,误差在时间轴上的分布比幅度更重要,预测早半小时和晚半小时的代价不一样。第四类是异常告警:这里根本不是回归问题而是检测问题,漏报的代价是停机,误报的代价是信任流失,两者差着数量级。这一章用一个代价模型把四类决策的不对称性画出来,并推出一个本书反复使用的结论:损失函数应该由代价表决定。低估比高估贵三倍,你就该用加权的分位数损失去训,而不是继续用 MSE 然后在事后手动加一个安全裕度——后者是把统计问题用拍脑袋的常数解决,而且那个常数会随着季节失效。这一章也给出预测价值的上限:即使预测完全准确,能省下的钱是多少?这个数字决定了这个项目值得投入多少。",
      en: "Being 'more accurate' has no value in itself; the value is in a decision that improves. Industrial forecasts typically serve four decisions, and their error requirements differ so much they sometimes conflict. The first is declaration and procurement: commit a volume in advance, pay for redundancy if you over-declare and a deviation penalty if you under-declare — a V-shaped cost with a sharp kink. The second is demand or capacity control: only the single largest fifteen-minute window in the billing period matters, and accuracy at every other instant earns nothing. That decision wants peak timing and magnitude; average error is almost irrelevant to it. The third is dispatch and storage: a charge/discharge plan depends on the shape of the next several hours rather than any single point, so how error is distributed along the time axis matters more than its size, and being half an hour early costs differently from being half an hour late. The fourth is anomaly alerting, which is not a regression problem at all but a detection problem, where a miss costs downtime and a false alarm costs trust — quantities that differ by orders of magnitude. A cost model draws all four asymmetries, and one conclusion that recurs throughout the book follows: the loss function should be chosen from the cost table. If underestimating costs three times what overestimating costs, train a weighted quantile loss rather than keeping MSE and bolting on a manual safety margin afterwards — the latter solves a statistical problem with a guessed constant, and that constant stops working when the season turns. The chapter also puts a ceiling on the forecast's value: if prediction were perfect, how much money would be saved? That number decides how much the project is worth.",
    },
    objectives: [
      { zh: "说清一个预测服务的是哪个决策、决策的时间粒度", en: "Name the decision a forecast serves and its time granularity" },
      { zh: "画出该决策的误差代价曲线并识别不对称性", en: "Draw the decision's error-cost curve and identify its asymmetry" },
      { zh: "由代价表反推该用的损失函数", en: "Derive the loss function from the cost table" },
      { zh: "估算完美预测的价值上限作为项目预算依据", en: "Estimate the value ceiling of a perfect forecast as a budget basis" },
    ],
    outline: [
      { zh: "四类下游决策与它们的时间粒度", en: "Four downstream decisions and their granularity" },
      { zh: "不对称代价:低估与高估不是一回事", en: "Asymmetric cost: low and high are not the same" },
      { zh: "从代价表到损失函数", en: "From the cost table to the loss function" },
      { zh: "完美预测值多少钱:项目的预算天花板", en: "What perfection is worth: the project's ceiling" },
    ],
  },
  {
    id: "t3", code: "SG3", moduleId: "m1", difficulty: 1, hours: 5, prereq: ["t2"], viz: "baselineLab",
    props: ["季节朴素", "同刻位中位数", "MAPE/WAPE", "MASE", "及格线"],
    title: { zh: "先打败朴素基线:一条你必须先跨过的横杆", en: "Beat the Naive Baseline First: the Bar You Must Clear" },
    summary: {
      zh: "这一章可能是全书性价比最高的五十行代码。工业时序有极强的周期性,这意味着几条不需要训练的规则本身就是很强的预测器:昨天同一时刻、上周同一时刻、最近四周同一星期同一时刻的中位数、最近若干点的移动平均。把它们跑在你自己的数据上,大多数工业负荷会落在 5%–12% 的 MAPE 区间——这个数字往往让第一次做这件事的人愣住,因为它已经接近很多论文里报告的深度模型成绩。这一章要做三件事。第一,把四条基线实现并在同一份数据上对比,让你知道自己的数据「天然有多好预测」;这是后面所有模型的参照系,没有它你根本不知道 6% 的 MAPE 是好是坏。第二,讲清 MASE 这个被低估的指标:它直接定义为「你的误差除以朴素基线的误差」,小于 1 才有价值,等于 0.8 意味着你比什么都不做好了两成——这是唯一一个自带及格线的指标。第三,建立一条本书反复强调的工程纪律:任何模型上线前必须和当期基线对比,且这个对比要在生产环境里持续做下去,因为基线会随着数据分布变化而变化,你三个月前领先的那两个点可能早就没了。这一章的时序台让你改变数据的周期强度、噪声水平和异常天数,看四条基线的排名怎么互换——当工况变化剧烈时,「上周同刻」会输给「昨天同刻」,而在稳定三班倒的工厂里正好相反。",
      en: "This may be the highest-return fifty lines of code in the book. Industrial series are strongly periodic, which means several untrained rules are already strong predictors: yesterday same time, last week same time, the median of the same weekday-and-slot over the last four weeks, and a short moving average. Run them on your own data and most industrial loads land between 5% and 12% MAPE — a number that tends to stop people short the first time, because it is already close to what many papers report for deep models. Three things happen here. First, four baselines are implemented and compared on the same data so you learn how predictable your data naturally is; without that reference you cannot tell whether 6% MAPE is good. Second, the underrated MASE is explained: it is defined as your error divided by the naive baseline's error, so below one is the only place worth being, and 0.8 means you are twenty percent better than doing nothing — the only metric that carries its own pass mark. Third, a discipline this book repeats: no model ships without a comparison against the current baseline, and that comparison must continue in production, because the baseline moves as the data distribution moves, and the two points of margin you had three months ago may be long gone. The bench lets you change periodic strength, noise level and the number of abnormal days and watch the four baselines swap ranks — when the process shifts sharply, last-week-same-time loses to yesterday-same-time, while in a steady three-shift plant the opposite holds.",
    },
    objectives: [
      { zh: "实现并比较四条不需要训练的基线", en: "Implement and compare four training-free baselines" },
      { zh: "用 MASE 判断一个模型是否真的有价值", en: "Use MASE to judge whether a model has any value" },
      { zh: "知道自己这份数据「天然有多好预测」", en: "Learn how predictable your own data naturally is" },
      { zh: "建立「上线前必须打败当期基线」的纪律", en: "Adopt the rule that shipping requires beating the current baseline" },
    ],
    outline: [
      { zh: "四条基线:昨日、上周、同刻位中位数、移动平均", en: "Four baselines: yesterday, last week, slot median, moving average" },
      { zh: "MASE:自带及格线的指标", en: "MASE: the metric with a built-in pass mark" },
      { zh: "什么样的数据让基线变强或变弱", en: "What makes a baseline strong or weak" },
      { zh: "把基线做成持续运行的对照组", en: "Keeping the baseline running as a control" },
    ],
  },

  /* ============ M2 · DT 数据:从传感器到训练集 ============ */
  {
    id: "t4", code: "DT1", moduleId: "m2", difficulty: 1, hours: 5, prereq: ["t1"], viz: "chainLab",
    props: ["采集链路", "历史库压缩", "死区与旋转门", "时标来源", "区间平均 vs 瞬时"],
    title: { zh: "采集链路:数据在哪一跳变形了", en: "The Acquisition Chain: Where the Data Deforms" },
    summary: {
      zh: "你拿到的 CSV 已经是第五手数据了。它的来路通常是:传感器 → 变送器 → PLC/RTU → SCADA 或历史库 → 数据平台 → 你的导出文件,每一跳都可能改变它。这一章沿着这条链走一遍,标出五个最常见的变形点。第一个是量的性质:电表给的是这 15 分钟的平均功率还是结束时刻的瞬时功率?这两者在有尖峰的时段能差 20%,而需量计费恰恰只看区间平均。第二个是采样与存储的不一致:PLC 扫描周期 100 毫秒,历史库每 5 秒存一次,导出时又按 15 分钟聚合——你以为的原始数据已经被聚合了三次,每次都可能用了不同的聚合方式。第三个是历史库压缩:工业历史库为了省空间会用死区(变化小于阈值就不存)或旋转门算法,它对平稳信号几乎无损,但会把短时尖峰的顶端削掉——如果你在做峰值预测,这一刀正好砍在你要的地方。第四个是时标:设备时钟、网关时钟和服务器时钟经常不同步,有的系统存本地时间且不带时区,有的存 UTC,跨系统对齐时错一个小时是常态。第五个是「零」的含义:一个零到底是真的停机、通信中断、还是仪表故障?这三种在同一列里长得一模一样,而它们对训练集的意义完全相反。这一章的时序台让你把这些变形逐个打开,看一条干净曲线怎么被折磨成你手上那份数据,以及每一种变形让下游误差涨多少。",
      en: "The CSV you received is fifth-hand. Its route is usually sensor → transmitter → PLC/RTU → SCADA or historian → data platform → your export, and every hop can change it. This chapter walks the chain and marks the five most common deformations. First, the nature of the quantity: does the meter report the average power over these fifteen minutes or the instantaneous value at the end of them? During a spiky window those differ by twenty percent — and demand billing looks only at the interval average. Second, the mismatch between sampling and storage: the PLC scans at 100 ms, the historian stores every 5 s, the export aggregates to 15 min — what you call raw has already been aggregated three times, possibly by three different rules. Third, historian compression: to save space, industrial historians apply a deadband (store nothing if the change is below a threshold) or a swinging-door algorithm. On a steady signal this is nearly lossless, but it shaves the tops off short spikes — and if you are forecasting peaks, that cut lands exactly where you needed the data. Fourth, timestamps: device, gateway and server clocks drift apart, some systems store local time without a zone and others store UTC, and being an hour out when joining two systems is normal rather than exceptional. Fifth, the meaning of zero: is this zero a real shutdown, a comms dropout, or a failed instrument? All three look identical in the same column and mean opposite things to a training set. The bench lets you switch each deformation on and watch a clean curve being tortured into the file you actually have, with the downstream error cost of each.",
    },
    objectives: [
      { zh: "画出自己这份数据从传感器到文件的完整链路", en: "Map your own data's full path from sensor to file" },
      { zh: "分辨区间平均值与瞬时值,并知道哪个才是标签", en: "Tell interval averages from instantaneous values and pick the right label" },
      { zh: "识别历史库压缩对尖峰的削顶效应", en: "Recognise how historian compression shaves peaks" },
      { zh: "定位时标来源与时区口径的不一致", en: "Locate inconsistencies in timestamp source and time zone" },
    ],
    outline: [
      { zh: "六跳链路与每一跳的变形", en: "Six hops and the deformation at each" },
      { zh: "聚合口径:均值、最大、最后值", en: "Aggregation: mean, max, last" },
      { zh: "死区与旋转门:被削掉的尖峰", en: "Deadband and swinging door: the shaved peaks" },
      { zh: "时标、时区与那个模糊的零", en: "Timestamps, zones, and the ambiguous zero" },
    ],
  },
  {
    id: "t5", code: "DT2", moduleId: "m2", difficulty: 2, hours: 6, prereq: ["t4"], viz: "cleanLab",
    props: ["缺失分类", "停机空洞", "填补 vs 标记", "异常点检测", "清洗顺序"],
    title: { zh: "缺失、坏点与停机空洞:清洗的顺序比方法重要", en: "Gaps, Bad Points and Shutdown Holes: Order Matters More Than Method" },
    summary: {
      zh: "大多数教程讲缺失值处理时给你一张方法表:前向填充、线性插值、均值填充、KNN、模型填充。这张表几乎没用,因为它跳过了唯一重要的一步——先搞清楚这段缺失是什么。工业数据里至少有四类缺失,它们要求完全相反的处理:通信中断(数据丢了,物理过程还在跑,应该按邻近值填补)、计划停机(数据没丢,真值就是零或待机,填补它等于造假)、仪表故障(数值还在但全是错的,比缺失更危险,因为它不会触发任何缺失告警)、真实为零(设备就是没开,这是有效样本)。把这四类混在一起用同一种方法处理,是工业时序项目里最常见的系统性错误。这一章建立一套清洗顺序:先诊断(缺失模式、持续时长、是否与停机记录对齐、是否伴随其他点位同时异常),再分类,再决定动作,最后——这是本章的核心主张——优先选择「标记」而不是「填补」。给模型一个 is_missing 或 is_shutdown 的布尔特征,让它自己学会这段时间该怎么办,几乎总是比你用插值编一段假数据更好,因为树模型天然能处理缺失,而你编的那段假数据会被它当成真实模式学进去。时序台把五类缺陷 × 五种处理方式的下游 MAPE 全部算出来,你会看到在停机空洞上,线性插值比什么都不做还差,而「标记 + 让模型处理缺失」赢得毫无悬念。这一章还讲异常点:三西格玛为什么在有工况切换的数据上会误杀真实尖峰,以及为什么删除异常点之前必须先问「它是错误还是事件」。",
      en: "Most tutorials answer missing data with a table of methods: forward fill, linear interpolation, mean, KNN, model-based. The table is nearly useless because it skips the only step that matters — establishing what the gap is. Industrial data has at least four kinds, demanding opposite treatments: a comms dropout (data lost, the process still running — fill from neighbours), a planned shutdown (nothing lost, the true value is zero or standby — filling it is fabrication), an instrument fault (values present and all wrong, more dangerous than absence because no missing-data alarm fires), and a genuine zero (the machine was simply off — a valid sample). Treating all four with one method is the most common systematic error in industrial time-series projects. This chapter establishes an order: diagnose first (gap pattern, duration, whether it aligns with the shutdown log, whether other tags went strange at the same moment), then classify, then act — and finally, the chapter's central claim, prefer flagging to filling. Giving the model an is_missing or is_shutdown boolean and letting it learn what to do almost always beats inventing data by interpolation, because tree models handle missingness natively while your invented segment gets learned as a real pattern. The bench computes downstream MAPE for five defect classes against five treatments, and on shutdown holes linear interpolation performs worse than doing nothing, while flag-and-let-the-model-handle-it wins without contest. The chapter also covers outliers: why three-sigma kills genuine spikes in data with regime changes, and why you must ask whether a point is an error or an event before deleting it.",
    },
    objectives: [
      { zh: "把缺失分成通信、停机、故障、真零四类", en: "Classify gaps as comms, shutdown, fault or genuine zero" },
      { zh: "用停机记录与多点位联动来诊断缺失原因", en: "Diagnose gaps using shutdown logs and cross-tag correlation" },
      { zh: "在「标记」与「填补」之间做出有依据的选择", en: "Choose between flagging and filling on evidence" },
      { zh: "区分异常点里的错误与事件", en: "Separate errors from events among outliers" },
    ],
    outline: [
      { zh: "四类缺失,四种相反的正确做法", en: "Four kinds of gap, four opposite right answers" },
      { zh: "诊断优先:模式、时长、联动", en: "Diagnose first: pattern, duration, correlation" },
      { zh: "标记胜过填补:为什么,以及例外", en: "Flag over fill: why, and the exceptions" },
      { zh: "异常点:是错误还是事件", en: "Outliers: error, or event" },
    ],
  },
  {
    id: "t6", code: "DT3", moduleId: "m2", difficulty: 2, hours: 5, prereq: ["t5"], viz: "alignLab",
    props: ["重采样聚合", "时区与夏令时", "外部变量对齐", "预报 vs 实测", "滞后响应"],
    title: { zh: "重采样、时区与外部变量对齐", en: "Resampling, Time Zones and Aligning External Drivers" },
    summary: {
      zh: "这一章处理三件看起来琐碎、实际能单独毁掉一个项目的事。第一件是重采样的聚合口径。从 1 分钟降到 15 分钟,你可以取均值、最大值、最后值或求和,选哪个完全取决于你的目标:预测能耗用均值(或求和),预测需量必须用区间均值(因为计费就是这么算的),预测设备保护用最大值(你关心的是峰值有没有越限),而对累积型计数器只能用最后值再差分。选错了,你的标签从第一天起就不是你以为的那个物理量。第二件是时区与夏令时。工业数据经常存本地时间且不带时区标记,而气象数据几乎总是 UTC;把两者直接拼在一起,你的温度特征就整体错位了若干小时,相关性被抹平,模型于是「学会」了温度没什么用。夏令时更阴险:一年里有一天少一小时、有一天多一小时,大多数代码在这两天会静默地错位或产生重复索引。第三件是外部变量的对齐原则,这是本章最重要的一条:所有外生特征必须按「在预测时刻真正可获得的版本」对齐。做日前负荷预测时,明天的气温你只能用预报值,不能用事后回填的实测值——后者会让你的离线成绩漂亮得不真实,上线当天原形毕露。这一章的时序台让你把时标偏移、用预报还是实测、温度的滞后响应窗口三个旋钮拖起来,直接看误差怎么变:一个小时的时标偏移能让温度特征的增益从 18% 掉到 2%,而用实测代替预报能让离线 MAPE 虚低 1.5 个点。",
      en: "Three apparently trivial things, each able to sink a project on its own. First, the aggregation rule when resampling. Going from one minute to fifteen you may take the mean, the max, the last value or the sum, and the choice is dictated entirely by the target: energy wants the mean or sum, demand must use the interval mean because that is how it is billed, equipment protection wants the max because you care whether the peak crossed a limit, and a cumulative counter can only take the last value and then be differenced. Choose wrong and your label was never the physical quantity you thought it was. Second, time zones and daylight saving. Industrial data is often stored as local time with no zone marker while weather data is almost always UTC; joining them directly shifts your temperature feature by hours, flattens the correlation, and the model duly 'learns' that temperature does not matter. Daylight saving is nastier: one day a year is an hour short and another an hour long, and most code silently misaligns or produces duplicate indices on exactly those two days. Third — the most important rule in the chapter — every exogenous feature must be aligned to the version that genuinely existed at prediction time. For a day-ahead forecast you may only use tomorrow's forecast temperature, never the measurement backfilled afterwards; the latter makes your offline score beautifully unreal and exposes itself on go-live day. The bench gives you three knobs — timestamp offset, forecast versus measured, and the lag window of the temperature response — and shows the error directly: a one-hour offset drops the temperature feature's gain from 18% to 2%, and substituting measurements for forecasts understates offline MAPE by about 1.5 points.",
    },
    objectives: [
      { zh: "按预测目标选择正确的重采样聚合方式", en: "Pick the resampling aggregation that matches the target" },
      { zh: "统一时区口径并正确处理夏令时的两天", en: "Unify time zones and handle the two daylight-saving days" },
      { zh: "按「预测时可获得」的原则对齐外部变量", en: "Align external drivers on what was available at prediction time" },
      { zh: "识别并量化用实测代替预报造成的虚高成绩", en: "Quantify the inflated score caused by using measurements for forecasts" },
    ],
    outline: [
      { zh: "四种聚合口径分别服务什么目标", en: "Four aggregations and the targets they serve" },
      { zh: "时区、夏令时与那两天的静默错位", en: "Zones, DST and the two days that silently break" },
      { zh: "预报值对齐:上线那天你有什么", en: "Forecast alignment: what you will actually have" },
      { zh: "滞后响应:热惯性怎么进特征", en: "Lagged response: putting thermal inertia into features" },
    ],
  },
  {
    id: "t7", code: "DT4", moduleId: "m2", difficulty: 2, hours: 6, prereq: ["t6"], viz: "leakLab",
    props: ["随机切分 vs 时间切分", "未来信息泄漏", "全局归一化泄漏", "滚动窗口右闭", "间隔 gap"],
    title: { zh: "数据泄漏:时序里最贵的错误", en: "Leakage: the Most Expensive Mistake in Time Series" },
    summary: {
      zh: "如果这本书只能留下一章,就是这一章。数据泄漏是指训练时用到了推理时不可能拿到的信息,它的后果不是模型变差,而是模型看起来好得不真实,于是你带着一个虚假的 2.1% MAPE 去开会、去立项、去承诺 KPI,然后在上线后收获 9.8%。时序里的泄漏有四种主要形态,这一章逐个拆开并在时序台上现场复现。第一种也是最致命的:随机打乱的 K 折交叉验证。在时序上,随机切分意味着模型用「明天」的样本去预测「今天」,而相邻时刻的值高度相关,等于直接抄答案——本章的对照实验里,同一个 LightGBM 在随机切分下 2.1%、在时间切分下 9.8%,那 7.7 个点全是幻觉。第二种是特征里的未来信息:用整个数据集算出来的均值和标准差做归一化、用未来数据算的目标编码、把当前时刻算进滚动窗口(窗口必须右闭开)、用后来才修正的数据版本。第三种是跨序列泄漏:在多表建模时,同一时刻其他表的值可能是可获得的,也可能不是,取决于你的推理架构——这件事必须明确定义而不是默认。第四种是间隔缺失:如果你的预测要提前 24 小时做出,那么训练集的验证折和训练折之间必须留出 24 小时的 gap,否则边界处的样本仍然带着泄漏。这一章最后给一份检查清单:上线前把它跑一遍,能拦下绝大多数「线下很好线上崩掉」。",
      en: "If only one chapter survived, it would be this one. Leakage means training used information that could not exist at inference time. The consequence is not a worse model but one that looks unreally good — so you walk into a meeting with a false 2.1% MAPE, fund the project, commit to a KPI, and collect 9.8% after go-live. Time-series leakage takes four main forms, each dissected and reproduced live on the bench. The first and most lethal is shuffled K-fold cross-validation: on a series, a random split lets the model use tomorrow's sample to predict today, and because adjacent values are highly correlated that is simply copying the answer. In the chapter's controlled experiment the same LightGBM scores 2.1% shuffled and 9.8% time-ordered, and all 7.7 points are hallucination. The second is future information inside features: normalising with the mean and standard deviation of the whole dataset, target encoding computed over future rows, including the current instant in a rolling window (the window must be half-open on the right), or using a data version that was later revised. The third is cross-series leakage: when modelling many meters, the same timestamp on other meters may or may not be available, depending on your inference architecture — that must be defined explicitly rather than by default. The fourth is the missing gap: if the forecast must be issued 24 hours ahead, the validation fold must sit 24 hours clear of the training fold, or samples near the boundary still leak. The chapter closes with a checklist to run before go-live, which intercepts the great majority of 'great offline, broken online'.",
    },
    objectives: [
      { zh: "复现随机切分与时间切分的成绩差距", en: "Reproduce the gap between shuffled and time-ordered splits" },
      { zh: "找出特征工程里四种常见的未来信息泄漏", en: "Find the four common future-information leaks in feature engineering" },
      { zh: "按预测提前量正确设置折间 gap", en: "Set the inter-fold gap to match the forecast lead time" },
      { zh: "用一份检查清单在上线前拦截泄漏", en: "Intercept leakage before go-live with a checklist" },
    ],
    outline: [
      { zh: "随机 K 折:时序上的作弊", en: "Shuffled K-fold: cheating on a series" },
      { zh: "特征里的未来:归一化、编码、滚动窗", en: "Future inside features: scaling, encoding, rolling windows" },
      { zh: "提前量与折间 gap", en: "Lead time and the inter-fold gap" },
      { zh: "上线前的泄漏检查清单", en: "The pre-ship leakage checklist" },
    ],
  },

  /* ============ M3 · FE 特征与目标 ============ */
  {
    id: "t8", code: "FE1", moduleId: "m3", difficulty: 2, hours: 6, prereq: ["t7"], viz: "lagLab",
    props: ["ACF/PACF", "可用滞后下界", "滚动统计", "日历特征", "周期编码"],
    title: { zh: "滞后、滚动与日历:让树模型看见时间", en: "Lags, Rollings and Calendars: Making Trees See Time" },
    summary: {
      zh: "树模型对时间一无所知。你把 timestamp 当特征喂进 LightGBM,它会在训练集范围内把时间切成若干段来拟合,然后在测试集上遇到没见过的时间戳,直接落到最后一个分裂区间——外推能力为零。要让它看见时间,你得把时间结构翻译成它能理解的东西,这就是滞后、滚动和日历三类特征。滞后特征是骨架:昨天同一时刻、上周同一时刻、前一个点。选哪些滞后不该拍脑袋,自相关(ACF)和偏自相关(PACF)会告诉你哪些滞后携带独立信息——这一章会真的算出这两条曲线,你会看到一条典型的工业负荷在 lag=96(一天)和 lag=672(一周)上有两根显著的尖峰,这正是日周期和周周期的证据。但比选择更重要的是一条硬约束:**你能用的最小滞后等于你的预测提前量**。要预测未来 24 小时,lag_1 到 lag_95 在推理时全都不存在,拿它们训练就是泄漏;很多「线下 2% 线上 12%」的案例根因就在这一行。滚动统计(均值、标准差、最大、最小、分位数)把近期的水平和波动带进来,它的陷阱是窗口边界:必须是右闭开区间,把当前时刻算进去就是用答案算特征。日历特征看似简单,但有两个要点:小时和星期这类循环量用 sin/cos 编码比直接用整数好(因为 23 点和 0 点应该是相邻的),以及中国工业场景里必须处理调休——法定节假日和调休上班日不能只靠 weekday 判断,得挂一张真实的日历表。",
      en: "A tree model knows nothing about time. Feed a timestamp to LightGBM and it will chop the training range into segments to fit, then meet an unseen timestamp in the test set and fall into the last split interval — zero extrapolation. To make it see time you must translate temporal structure into something it understands: lags, rollings and calendars. Lags are the skeleton: yesterday same time, last week same time, the previous point. Which lags to keep is not a guess — autocorrelation and partial autocorrelation tell you which carry independent information, and the chapter computes both curves, where a typical industrial load shows sharp spikes at lag 96 (a day) and lag 672 (a week), the evidence for daily and weekly cycles. But more important than selection is a hard constraint: **the smallest usable lag equals your forecast lead time**. To predict 24 hours ahead, lag_1 through lag_95 do not exist at inference, and training on them is leakage — that single line is the root cause of many '2% offline, 12% online' stories. Rolling statistics (mean, standard deviation, max, min, quantiles) carry recent level and volatility, and their trap is the window boundary: it must be half-open on the right, because including the current instant computes the feature from the answer. Calendar features look simple but hold two points: cyclical quantities like hour and weekday encode better as sine and cosine than as integers (23:00 and 00:00 should be neighbours), and Chinese industrial settings must handle the shifted-holiday calendar — statutory holidays and make-up working days cannot be derived from weekday alone and need a real calendar table.",
    },
    objectives: [
      { zh: "用 ACF/PACF 有依据地选出滞后集合", en: "Choose a lag set from ACF and PACF rather than by guess" },
      { zh: "按预测提前量确定可用滞后的下界", en: "Derive the minimum usable lag from the forecast lead time" },
      { zh: "构造不泄漏的滚动统计特征", en: "Build rolling statistics that do not leak" },
      { zh: "用循环编码与真实日历表处理时间与节假日", en: "Encode cyclical time and handle real holiday calendars" },
    ],
    outline: [
      { zh: "为什么树模型无法外推时间戳", en: "Why trees cannot extrapolate a timestamp" },
      { zh: "ACF/PACF 与滞后选择", en: "ACF, PACF and lag selection" },
      { zh: "可用滞后的下界:提前量决定一切", en: "The lag floor: lead time decides everything" },
      { zh: "滚动窗口的右开边界与日历编码", en: "Half-open rolling windows and calendar encoding" },
    ],
  },
  {
    id: "t9", code: "FE2", moduleId: "m3", difficulty: 2, hours: 5, prereq: ["t8"], viz: "exoLab",
    props: ["外生变量", "非线性变换", "边际增益", "可获得性", "交互特征"],
    title: { zh: "外生变量:环境、工况与计划", en: "Exogenous Drivers: Environment, Process State and Plans" },
    summary: {
      zh: "只用历史值预测未来,天花板很快就到了。突破它要靠外生变量——那些驱动着曲线却不在曲线里的东西。工业场景有三类。环境类:温度、湿度、气压、太阳辐照,它们驱动空调、冷却、干燥、采暖,是负荷曲线里季节性的直接来源。工况类:设备运行状态、当前批次、产品型号、产线速度、订单结构,这类变量信息量最大,因为它们几乎直接决定了功率,但也最难拿到——很多工厂的 MES 和电表数据从来没有被放在一起过。计划类:排产计划、检修计划、班次日历、订单交付期,它们的特殊价值在于**未来可知**,这让它们成为长周期预测里最有力的特征。这一章讲三件事。第一是非线性变换:负荷对温度的响应是一条 U 形曲线(冷了要采暖、热了要制冷、中间省电),直接把摄氏度丢进线性模型几乎没有增益,而度日数(HDD/CDD)、分段哑变量或样条能把这条 U 拆开;树模型虽然能自己学分段,但给它一个 CDD 特征仍然能明显加速收敛。第二是滞后响应:厂房有热惯性,现在的温度影响的是两小时后的空调负荷,所以温度特征要带滞后和滚动均值,而不是只有当前值。第三是边际增益与可获得性的权衡:这一章的时序台让你逐个勾选外生变量,看 MAPE 降多少、同时标出每个变量在推理时的可获得性风险——一个能降 3 个点但上线时拿不到的变量,价值是零,而这件事应该在建模第一天就问清楚,不是在上线前一周才发现。",
      en: "Predicting the future from history alone hits a ceiling quickly. Breaking it takes exogenous drivers — the things that move the curve without being in it. Industry has three families. Environmental: temperature, humidity, pressure, irradiance, which drive cooling, chilling, drying and heating and are the direct source of seasonality in a load curve. Process state: equipment status, current batch, product type, line speed, order mix — the most informative family, because these almost directly determine power draw, and the hardest to obtain, since many plants have never joined MES data to meter data. Plans: the production schedule, maintenance windows, the shift calendar, delivery dates — their special value is that they are **knowable in advance**, which makes them the strongest features for longer horizons. Three things happen here. First, non-linear transforms: load responds to temperature along a U (heat when cold, chill when hot, save in between), so feeding raw degrees to a linear model gains almost nothing while degree days, binned dummies or splines split the U apart; trees can learn the binning themselves, but a CDD feature still speeds convergence noticeably. Second, lagged response: a building has thermal inertia, so today's temperature drives the cooling load two hours later, and the temperature feature needs lags and rolling means rather than only the current value. Third, the trade between marginal gain and availability: the bench lets you tick drivers one at a time, shows how much MAPE each removes, and marks each one's availability risk at inference — a driver worth three points that will not exist on go-live day is worth nothing, and that question belongs on day one of modelling, not the week before launch.",
    },
    objectives: [
      { zh: "按环境、工况、计划三类梳理可用外生变量", en: "Inventory exogenous drivers as environment, process and plan" },
      { zh: "为温度这类变量设计合适的非线性变换", en: "Design the right non-linear transform for drivers like temperature" },
      { zh: "用滞后与滚动捕捉热惯性等延迟响应", en: "Capture delayed responses such as thermal inertia" },
      { zh: "同时评估边际增益与推理时可获得性", en: "Evaluate marginal gain and inference-time availability together" },
    ],
    outline: [
      { zh: "三类外生变量与它们的信息量", en: "Three families of driver and their information content" },
      { zh: "U 形响应:度日数、分段与样条", en: "The U-shaped response: degree days, bins and splines" },
      { zh: "热惯性与滞后特征", en: "Thermal inertia and lagged features" },
      { zh: "边际增益 × 可获得性的取舍表", en: "The gain-by-availability trade table" },
    ],
  },
  {
    id: "t10", code: "FE3", moduleId: "m3", difficulty: 2, hours: 6, prereq: ["t9"], viz: "horizonLab",
    props: ["递归多步", "直接多步", "seq2seq", "误差累积", "步长交叉点"],
    title: { zh: "目标怎么定:递归、直接多步与 seq2seq", en: "Defining the Target: Recursive, Direct Multi-Step and seq2seq" },
    summary: {
      zh: "「预测未来 24 小时」这句话至少有三种实现方式,它们的误差行为完全不同,而选错会让你在错误的方向上优化几周。第一种是递归:训一个单步模型,把它的输出接回输入,滚 96 次。优点是只训一个模型、实现简单;致命缺点是误差累积——第 1 步的误差会作为输入喂给第 2 步,方差逐步放大,而且训练时模型见到的输入永远是真值、推理时见到的却是自己的预测,这个训练-推理不一致(exposure bias)会让远端步长急剧恶化。第二种是直接多步:为每一个提前量单独训一个模型,h=1 一个、h=96 一个。优点是没有累积、每个模型可以用不同的特征集(远端步长本来就用不了近端滞后);缺点是要训 96 个模型、各步之间的预测可能不连贯(出现锯齿),而且计算量线性上升。第三种是 seq2seq / 多输出:一个模型一次吐出整条未来曲线,结构上保证连贯,能共享表示,但需要更多数据,也更容易过拟合。这一章的时序台把三种方案在同一条数据上跑出误差随步长的曲线,你会清楚看到交叉点:短步长(1–8 步)递归往往最好,中段三者接近,远端(>48 步)直接多步和 seq2seq 明显胜出。还有两个实用技巧:递归里用「加噪训练」或 scheduled sampling 能缓解 exposure bias;直接多步可以只训几个关键步长再插值,把 96 个模型压到 6 个,精度损失通常小于 0.3 个点。",
      en: "'Forecast the next 24 hours' has at least three implementations whose error behaviour differs completely, and choosing wrong sends you optimising in the wrong direction for weeks. The first is recursive: train a one-step model and feed its output back in, ninety-six times. It needs only one model and is simple; its fatal flaw is compounding — step one's error becomes step two's input, variance grows, and because the model only ever saw true values in training while seeing its own predictions at inference, that exposure bias degrades the far horizon sharply. The second is direct multi-step: train a separate model per lead time, one for h=1 and one for h=96. Nothing compounds, and each model can use a different feature set (the far horizon cannot use near lags anyway); the cost is ninety-six models, possible incoherence between adjacent steps (a sawtooth), and linear growth in compute. The third is seq2seq or multi-output: one model emits the whole future curve, coherent by construction and sharing representations, but hungrier for data and easier to overfit. The bench runs all three on the same data and plots error against horizon, and the crossings are unmistakable: at short horizons (1–8 steps) recursive usually wins, the middle is a wash, and beyond about 48 steps direct and seq2seq pull clearly ahead. Two practical tricks close the chapter: training the recursive model with injected noise or scheduled sampling eases exposure bias, and direct multi-step can train only a few anchor horizons and interpolate between them, compressing ninety-six models to six for a loss usually under 0.3 points.",
    },
    objectives: [
      { zh: "说清递归、直接多步与 seq2seq 的误差机制差异", en: "Explain the different error mechanisms of the three schemes" },
      { zh: "画出三种方案的误差-步长曲线并找出交叉点", en: "Plot error against horizon for all three and find the crossings" },
      { zh: "识别递归预测中的训练-推理不一致", en: "Recognise exposure bias in recursive forecasting" },
      { zh: "用锚点步长 + 插值压缩直接多步的模型数量", en: "Compress direct multi-step with anchor horizons and interpolation" },
    ],
    outline: [
      { zh: "递归:一个模型,误差滚雪球", en: "Recursive: one model, snowballing error" },
      { zh: "直接多步:96 个模型与锯齿问题", en: "Direct: ninety-six models and the sawtooth" },
      { zh: "seq2seq:一次出整条曲线的代价", en: "seq2seq: the price of emitting the whole curve" },
      { zh: "交叉点在哪:按步长选方案", en: "Where they cross: choosing by horizon" },
    ],
  },

  /* ============ M4 · ML 统计基线与梯度提升 ============ */
  {
    id: "t11", code: "ML1", moduleId: "m4", difficulty: 2, hours: 6, prereq: ["t3"], viz: "arimaLab",
    props: ["平稳性", "差分与季节差分", "AR/MA 阶数", "残差诊断", "SARIMAX 的极限"],
    title: { zh: "统计模型:ARIMA 的用处与它的天花板", en: "Statistical Models: What ARIMA Is Good For, and Its Ceiling" },
    summary: {
      zh: "今天已经很少有人把 SARIMAX 作为主力模型推上生产,但这一章仍然值得完整地学,理由有三个。第一,它逼你直面时序最基本的三个概念:平稳性(均值和方差不随时间变)、差分(把趋势和周期减掉的操作)、以及自相关结构(AR 项看的是过去的值,MA 项看的是过去的误差)。这些概念不是 ARIMA 专有的,它们是你判断任何模型「还有没有结构没学到」的语言。第二,在特定场景里它至今很好用:单条序列、历史不长、需要给非技术人员一个能解释的模型、或者需要一个可靠的统计参照系。第三——也是最实用的——它的残差诊断是通用工具。把任何模型的残差画成自相关图,如果还能看到显著的尖峰,说明模型漏掉了周期结构;Ljung-Box 检验则给你一个数值化的判断。这一章会在时序台上真的跑一遍:先看原始序列的非平稳(ADF 检验不通过),做一阶差分和季节差分,看 ACF/PACF 从结构化变成白噪声,再定阶、拟合、检查残差。然后是诚实的部分——它的天花板在哪:多个外生变量时参数爆炸且难以调;成百上千条序列时你要拟合成百上千个模型;工况切换这种非线性的、由外部事件驱动的跳变,线性模型结构上就表达不了;长周期(96 步)预测时置信区间会宽到失去实用价值。理解了这几条,你就知道为什么下一章的梯度提升在这个领域接管了主流。",
      en: "Few people ship SARIMAX as the primary production model today, yet this chapter earns a full read for three reasons. First, it forces you to face the three basic concepts of time series: stationarity (mean and variance not drifting), differencing (the operation that removes trend and cycle), and autocorrelation structure (AR terms look at past values, MA terms at past errors). None of these belong to ARIMA alone — they are the language in which you judge whether any model has left structure unlearned. Second, it remains genuinely useful in specific settings: a single series, short history, a need to explain the model to non-technical people, or a need for a trustworthy statistical reference. Third, and most practical, its residual diagnostics are a universal tool. Plot any model's residuals as a correlogram, and a remaining significant spike says the model missed a cycle; the Ljung-Box test turns that judgement into a number. The bench runs the whole loop: observe non-stationarity in the raw series (ADF fails), apply first and seasonal differencing, watch ACF and PACF go from structured to white noise, then order, fit and check the residuals. Then the honest part — the ceiling: several exogenous variables make the parameterisation explode and the tuning painful; hundreds of series means fitting hundreds of models; regime switching, a non-linear jump driven by an external event, is structurally inexpressible in a linear model; and at a 96-step horizon the confidence interval widens past usefulness. Understanding those limits is exactly why gradient boosting took over the field in the next chapter.",
    },
    objectives: [
      { zh: "用 ADF 与差分把一条序列变成平稳序列", en: "Make a series stationary with ADF testing and differencing" },
      { zh: "从 ACF/PACF 读出 AR 与 MA 的阶数", en: "Read AR and MA orders from ACF and PACF" },
      { zh: "用残差自相关与 Ljung-Box 诊断任何模型", en: "Diagnose any model with residual autocorrelation and Ljung-Box" },
      { zh: "说清 SARIMAX 在工业场景下的四条天花板", en: "State SARIMAX's four ceilings in industrial settings" },
    ],
    outline: [
      { zh: "平稳性、差分与季节差分", en: "Stationarity, differencing, seasonal differencing" },
      { zh: "定阶:ACF/PACF 与信息准则", en: "Order selection: ACF/PACF and information criteria" },
      { zh: "残差诊断:通用的模型体检", en: "Residual diagnostics: a check-up for any model" },
      { zh: "天花板:多变量、多序列、非线性、长周期", en: "The ceiling: multivariate, many series, non-linear, long horizon" },
    ],
  },
  {
    id: "t12", code: "ML2", moduleId: "m4", difficulty: 2, hours: 7, prereq: ["t8", "t11"], viz: "gbmLab",
    props: ["梯度提升机制", "叶子生长策略", "早停与验证集", "特征重要性陷阱", "类别特征"],
    title: { zh: "梯度提升:为什么树模型在这个领域还没输", en: "Gradient Boosting: Why Trees Have Not Lost This Field" },
    summary: {
      zh: "在工业时序这类「表格化 + 强日历结构 + 中等数据量」的任务上,梯度提升树至今是最稳的选择。ASHRAE 那场建筑能耗预测竞赛前排清一色是 LightGBM 集成,不是因为参赛者不会深度学习,而是因为在这个数据规模和结构下,树模型确实更准、更快、更不挑参数。这一章分四步讲透。第一步是机制:提升不是一次拟合一个强模型,而是让每一棵新树去拟合前面所有树的残差,学习率控制每棵树的贡献,深度和叶子数控制单棵树的表达力——这一章会让你在时序台上一棵一棵地加树,看训练误差和验证误差怎么分叉,那个分叉点就是早停该停的地方。第二步是这类任务上真正重要的几个参数:num_leaves 与 max_depth 的关系(LightGBM 是按叶子生长,比按层生长更容易过拟合)、min_data_in_leaf 在小数据上的保护作用、learning_rate 与 n_estimators 的换算关系、以及 feature_fraction 和 bagging 的作用。第三步是一条不可违反的纪律:早停的验证集必须是时间上靠后的那一段,用随机划出来的验证集做早停,本质上是把上一章讲的泄漏换了个地方犯。第四步是两个常见陷阱:一是特征重要性——split 次数高不代表重要,高基数特征天然 split 多,要看 gain 或者直接用置换重要性;二是类别特征的处理,把设备编号、产品型号做成 one-hot 在高基数时会炸开,LightGBM 的原生类别支持和目标编码各有适用场合,而目标编码必须在折内计算,否则又是泄漏。",
      en: "On tabularised series with strong calendar structure and moderate data, gradient-boosted trees remain the steadiest choice. The front of the ASHRAE building-energy competition was uniformly LightGBM ensembles — not for lack of deep-learning skill, but because at this data size and structure trees really are more accurate, faster and less fussy. Four steps here. First, the mechanism: boosting does not fit one strong model, it fits each new tree to the residual of all previous trees, with the learning rate controlling each tree's contribution and depth or leaf count controlling a single tree's expressiveness. The bench lets you add trees one at a time and watch training and validation error diverge — that divergence is where early stopping belongs. Second, the parameters that actually matter here: the relationship between num_leaves and max_depth (LightGBM grows leaf-wise, which overfits more readily than level-wise), the protective role of min_data_in_leaf on small data, the exchange rate between learning_rate and n_estimators, and what feature_fraction and bagging do. Third, a discipline that may not be broken: the early-stopping validation set must be the later segment in time — using a randomly carved validation set for early stopping is last chapter's leakage committed in a new place. Fourth, two traps: feature importance, where a high split count does not mean importance because high-cardinality features split often by construction, so read gain or use permutation importance; and categorical handling, where one-hot encoding an equipment id or product code explodes at high cardinality, LightGBM's native categorical support and target encoding each have their place, and target encoding must be computed inside the fold or it is leakage again.",
    },
    objectives: [
      { zh: "解释提升如何逐棵拟合残差并用学习率控制步长", en: "Explain how boosting fits residuals tree by tree under a learning rate" },
      { zh: "在时序数据上正确设置早停与验证集", en: "Set early stopping and the validation set correctly on a series" },
      { zh: "调对这类任务上真正重要的四五个参数", en: "Tune the four or five parameters that matter on this task" },
      { zh: "避开特征重要性与类别编码的两个陷阱", en: "Avoid the importance and categorical-encoding traps" },
    ],
    outline: [
      { zh: "残差拟合:一棵一棵加上去", en: "Fitting residuals: one tree at a time" },
      { zh: "叶子生长、深度与小数据保护", en: "Leaf-wise growth, depth and small-data protection" },
      { zh: "早停必须用靠后的时间段", en: "Early stopping must use the later window" },
      { zh: "重要性与类别特征的两个陷阱", en: "Two traps: importance and categorical features" },
    ],
  },
  {
    id: "t13", code: "ML3", moduleId: "m4", difficulty: 3, hours: 6, prereq: ["t12"], viz: "quantLab",
    props: ["分位数回归", "pinball loss", "覆盖率校准", "预测区间", "决策用分位数"],
    title: { zh: "从一个数到一个区间:分位数回归与概率预测", en: "From a Number to an Interval: Quantile Regression and Probabilistic Forecasts" },
    summary: {
      zh: "调度要的从来不是一个数。「明天下午三点负荷 1840 千瓦」这句话没法直接用来做决策,因为它没告诉你它可能偏多少;而「有 90% 的把握不超过 2050 千瓦」可以直接接到需量控制策略上。这一章把点预测升级成概率预测,做法比大多数人想的简单:把损失函数从 MSE 换成 pinball loss,同一套特征、同一个 LightGBM,训 3 到 9 次,每次对应一个分位数,你就得到了一条预测带。pinball loss 的机制很直观:预测低于真值时按 τ 加权,高于真值时按 (1−τ) 加权,τ=0.9 时低估的惩罚是高估的 9 倍,于是模型自然往上偏,学出的就是 90% 分位数。这一章讲三件必须搞清楚的事。第一是分位数的正确含义:P90 不是「安全值」,它是有 10% 概率被突破的值——一个月 30 天,你应该预期有 3 天被突破,如果一次都没破,说明你的区间太宽了,同样是校准失败。第二是覆盖率校准:把预测区间放到回测集上数一数实际落在里面的比例,理想的 80% 区间应该覆盖 80%,系统性偏离说明模型有偏或方差估计错了;这一章的时序台会让你看到未校准的区间长什么样。第三是分位数交叉:独立训练的多个分位数模型可能出现 P90 低于 P50 的荒谬结果,处理办法是训练后排序(isotonic)或者用支持多分位数联合训练的实现。最后落到决策:你该用哪个分位数,由上一章的代价不对称比决定——低估代价是高估的 4 倍,最优分位数就是 0.8。",
      en: "Dispatch never wanted a number. 'Load at three tomorrow afternoon is 1840 kW' cannot drive a decision because it says nothing about how far off it might be, whereas 'ninety percent confident it stays below 2050 kW' plugs straight into a demand-control strategy. This chapter upgrades point forecasts to probabilistic ones, and the method is simpler than most expect: swap MSE for pinball loss and train the same features and the same LightGBM three to nine times, once per quantile, to obtain a band. The mechanism is intuitive: underprediction is weighted by τ and overprediction by (1−τ), so at τ=0.9 being low is penalised nine times as heavily as being high, the model leans upward, and what it learns is the 90th percentile. Three things must be understood. First, what a quantile means: P90 is not a safe value, it is the value with a ten percent chance of being exceeded — across a thirty-day month you should expect three exceedances, and if there are none your interval is too wide, which is equally a calibration failure. Second, coverage calibration: count how often the backtest actually falls inside the band, an ideal 80% interval should cover 80%, and systematic deviation means bias or a wrong variance estimate; the bench shows what an uncalibrated band looks like. Third, quantile crossing: independently trained quantiles can produce the absurdity of P90 below P50, fixed by post-hoc sorting (isotonic) or by an implementation that trains quantiles jointly. It ends at the decision: which quantile you should use is set by the previous chapter's cost asymmetry — if being low costs four times being high, the optimal quantile is 0.8.",
    },
    objectives: [
      { zh: "用 pinball loss 训练一组分位数模型", en: "Train a set of quantile models with pinball loss" },
      { zh: "正确解读 P50/P90 的概率含义", en: "Read P50 and P90 with their correct probabilistic meaning" },
      { zh: "在回测集上检查并修正覆盖率", en: "Check and correct coverage on a backtest" },
      { zh: "由代价不对称比推出该用哪个分位数", en: "Derive the operating quantile from the cost asymmetry" },
    ],
    outline: [
      { zh: "pinball loss:不对称加权怎么产生分位数", en: "Pinball loss: how asymmetric weighting yields a quantile" },
      { zh: "P90 不是安全值", en: "P90 is not a safe value" },
      { zh: "覆盖率校准与分位数交叉", en: "Coverage calibration and quantile crossing" },
      { zh: "从代价表选出运行分位数", en: "Choosing the operating quantile from the cost table" },
    ],
  },
  {
    id: "t14", code: "ML4", moduleId: "m4", difficulty: 3, hours: 6, prereq: ["t12"], viz: "globalLab",
    props: ["全局 vs 局部", "序列归一化", "静态属性", "冷启动", "借力效应"],
    title: { zh: "全局模型:一个模型管一千条序列", en: "Global Models: One Model for a Thousand Series" },
    summary: {
      zh: "当你从一个电表变成一千个电表、从一台设备变成一个车间,直觉是训一千个模型。这个直觉在小数据上是错的。全局模型——用一个模型同时学习所有序列——在多数工业场景下更准,原因有三:短历史的序列能从长历史的序列那里借到模式;共享的日历和环境响应只需要学一次;模型见到的样本量是所有序列之和,过拟合风险大幅下降。这一章讲清楚怎么做对。第一件事是归一化:不同电表的量级能差两个数量级,直接混在一起训练会让大表主导损失函数,小表被忽略。常用做法是按序列做标准化(减均值除标准差)或者除以序列均值,预测后再还原;更稳的做法是同时把「序列的规模」作为一个静态特征喂进去,让模型自己知道这是一台大设备还是小设备。第二件事是身份与属性:序列 ID 本身可以作为类别特征(高基数,用原生类别支持或嵌入),但更有价值的是静态属性——设备类型、额定功率、所在车间、投运年份、产品线,它们让模型能对没见过的新序列做出合理推断,这就是冷启动能力的来源。第三件事是什么时候不该用全局模型:当序列之间的行为差异极大(一台注塑机和一套中央空调),强行共享会互相干扰,这时候的正确做法是分组建模——按行为聚类分成几组,每组一个全局模型。时序台会让你调节序列数量、历史长度和异质性,看全局模型和局部模型的优劣怎么随这三个参数翻转:序列多、历史短、同质性高时全局完胜,反过来时局部更好。",
      en: "Going from one meter to a thousand, or one machine to a workshop, the instinct is to train a thousand models. On small data that instinct is wrong. A global model — one model learning all series at once — is usually more accurate in industrial settings, for three reasons: short-history series borrow patterns from long-history ones; shared calendar and environmental responses are learned once; and the model sees the sum of all series' samples, so overfitting risk falls sharply. This chapter covers doing it right. First, normalisation: meters differ by two orders of magnitude, and mixing them raw lets the large ones dominate the loss while the small ones are ignored. The common fix is per-series standardisation (subtract mean, divide by standard deviation) or dividing by the series mean, inverting after prediction; the sturdier fix also feeds scale in as a static feature so the model knows whether this is a large or small machine. Second, identity and attributes: the series id can serve as a high-cardinality categorical (native support or an embedding), but static attributes are worth more — equipment type, rated power, workshop, commissioning year, product line — because they let the model reason sensibly about a series it has never seen, which is exactly where cold-start capability comes from. Third, when not to go global: when behaviour differs wildly between series (an injection moulder and a central chiller), forced sharing lets them interfere, and the right move is grouped modelling — cluster by behaviour and fit one global model per cluster. The bench lets you vary series count, history length and heterogeneity and watch global and local swap places: many series, short history and homogeneity favour global decisively, and the reverse favours local.",
    },
    objectives: [
      { zh: "用归一化与规模特征把量级不同的序列放进一个模型", en: "Combine series of different magnitudes with scaling and a size feature" },
      { zh: "用静态属性支撑新序列的冷启动预测", en: "Support cold-start forecasts for new series with static attributes" },
      { zh: "判断什么时候该分组建模而不是全局共享", en: "Judge when to group rather than share globally" },
      { zh: "量化短历史序列从全局模型借到多少力", en: "Quantify how much a short-history series borrows from the global model" },
    ],
    outline: [
      { zh: "为什么一千个模型不如一个", en: "Why one model beats a thousand" },
      { zh: "归一化与规模特征", en: "Normalisation and the scale feature" },
      { zh: "序列身份、静态属性与冷启动", en: "Identity, static attributes and cold start" },
      { zh: "异质性:什么时候该分组", en: "Heterogeneity: when to split into groups" },
    ],
  },

  /* ============ M5 · DL 深度模型与时序基础模型 ============ */
  {
    id: "t15", code: "DL1", moduleId: "m5", difficulty: 3, hours: 6, prereq: ["t10", "t12"], viz: "dlLab",
    props: ["参数量 vs 数据量", "MLP 窗口拍平", "LSTM 与 TCN", "感受野", "过拟合诊断"],
    title: { zh: "从 MLP 到 LSTM/TCN:序列模型什么时候才值得", en: "From MLP to LSTM and TCN: When a Sequence Model Is Worth It" },
    summary: {
      zh: "深度模型在时序上的第一课不是怎么搭网络,而是什么时候不该搭。这一章从最小的神经网络开始:把过去 96 个点拍平成一个 96 维向量,送进两层 MLP。这个模型已经能和树模型掰手腕,而且它展示了神经网络在这类任务上的三个真实优势:连续的非线性(树模型是分段常数,对平滑的温度响应需要很多次分裂才能逼近)、共享表示(多输出时所有步长共用一套隐层)、以及端到端地学习特征交互。它的三个劣势同样真实:对特征缩放敏感、小数据上过拟合、训练过程有随机性因此需要多次种子平均。然后是两条经典路线。LSTM 用门控和记忆单元处理长依赖,优点是参数效率高、能处理变长输入,缺点是训练慢(时间步无法并行)、长序列上梯度仍然吃力。TCN 用膨胀因果卷积,感受野随层数指数增长,训练可以完全并行,在很多基准上和 LSTM 打平甚至更好,而且实现更简单——这一章会把感受野公式摆出来,让你算清楚要覆盖一周(672 步)需要几层膨胀卷积。本章的核心是一张「参数量 × 数据量」的图:三万五千个点(一座工厂三年的 15 分钟数据)对应的合理模型规模是几万到几十万参数,你在这个数据量上训两百万参数的模型,过拟合不是风险而是必然。时序台让你拖动数据量、模型规模和正则强度,看训练/验证曲线怎么从收敛变成发散,并给出一个实用结论:在上深度模型之前,先确认你的数据量已经把树模型撑满了。",
      en: "The first lesson about deep models on time series is not how to build a network but when not to. This chapter starts with the smallest one: flatten the past 96 points into a 96-dimensional vector and feed a two-layer MLP. That model already competes with trees, and it demonstrates three genuine advantages of neural networks here — smooth non-linearity (trees are piecewise constant and need many splits to approximate a smooth temperature response), shared representations (all horizons share hidden layers in the multi-output case), and end-to-end learning of feature interactions. Its three disadvantages are equally genuine: sensitivity to scaling, overfitting on small data, and stochastic training that requires averaging over seeds. Then the two classic routes. LSTM handles long dependencies with gates and a memory cell: parameter-efficient, tolerant of variable length, but slow to train (time steps cannot be parallelised) and still strained by very long sequences. TCN uses dilated causal convolutions whose receptive field grows exponentially with depth, trains fully in parallel, matches or beats LSTM on many benchmarks, and is simpler to implement — the receptive-field formula appears here so you can compute how many dilated layers it takes to cover a week (672 steps). The chapter's centre is a parameters-against-data chart: thirty-five thousand points (three years of fifteen-minute data from one plant) supports a model of tens to hundreds of thousands of parameters, and training two million on that data is not a risk of overfitting but a certainty. The bench lets you drag data size, model size and regularisation and watch the training and validation curves go from convergence to divergence, with one practical conclusion: before reaching for a deep model, confirm your data has already saturated the tree model.",
    },
    objectives: [
      { zh: "判断当前数据量支撑得起多大的模型", en: "Judge how large a model the current data supports" },
      { zh: "说清 MLP、LSTM、TCN 各自的机制与代价", en: "State the mechanism and cost of MLP, LSTM and TCN" },
      { zh: "用感受野公式设计覆盖周周期的 TCN", en: "Design a TCN whose receptive field covers a weekly cycle" },
      { zh: "从训练/验证曲线诊断过拟合并选对正则", en: "Diagnose overfitting from the curves and pick regularisation" },
    ],
    outline: [
      { zh: "最小的神经网络:窗口拍平 + MLP", en: "The smallest network: flattened window plus MLP" },
      { zh: "LSTM:门控、记忆与训练代价", en: "LSTM: gates, memory and training cost" },
      { zh: "TCN:膨胀因果卷积与感受野", en: "TCN: dilated causal convolution and receptive field" },
      { zh: "参数量 × 数据量:那条过拟合分界线", en: "Parameters by data: the overfitting line" },
    ],
  },
  {
    id: "t16", code: "DL2", moduleId: "m5", difficulty: 3, hours: 7, prereq: ["t15"], viz: "archLab",
    props: ["N-BEATS", "PatchTST", "DLinear", "通道独立", "同预算对比"],
    title: { zh: "PatchTST、N-BEATS,和那条让人尴尬的线性基线", en: "PatchTST, N-BEATS, and the Embarrassing Linear Baseline" },
    summary: {
      zh: "过去几年时序预测领域出现了一批专用架构,也出现了一篇让整个领域尴尬的论文。这一章按时间顺序讲三个代表。N-BEATS 的思路是纯前馈的堆叠残差块,每个块预测一部分并把残差传给下一块,还可以约束基函数使其输出可解释的趋势项和季节项——它证明了不需要循环结构也能做好时序,并且在 M4 竞赛上拿到了当时最好的成绩之一。PatchTST 把 Transformer 引进来的方式很聪明:不把每个时间点当 token(那样序列太长且单点信息太少),而是把序列切成长度为 16 或 32 的 patch,每个 patch 作为一个 token,同时采用「通道独立」——每条变量单独过模型、共享权重。这两个设计一下子把计算量降下来、把有效上下文拉长,是目前 Transformer 路线上最实用的一个。然后是 DLinear 那篇论文:作者把序列做趋势-季节分解,每部分过一个线性层,加起来就是预测,总共不到十行核心代码——结果在多个长序列基准上打平甚至超过了当时一堆 Transformer。这个结果的意义不是「Transformer 没用」,而是「很多基准上的收益来自分解和归一化,而不是注意力」,以及一条更普适的教训:任何新架构都必须和一个诚实调过的简单基线比。这一章的态度是实证的——时序台在同一个算力预算下比较四种模型的精度、训练时间和调参敏感度,让你看到在工业时序这种数据量下,复杂度带来的增益经常被方差吃掉。",
      en: "The last few years produced a wave of purpose-built architectures for forecasting — and one paper that embarrassed the whole field. Three representatives, in order. N-BEATS stacks purely feed-forward residual blocks, each predicting a part and passing the residual on, optionally constrained to basis functions that make the trend and seasonal terms interpretable; it proved that no recurrence is needed and took one of the best results of its time on M4. PatchTST brings in the transformer cleverly: rather than treating each timestamp as a token (too long a sequence carrying too little per point), it cuts the series into patches of sixteen or thirty-two and treats each patch as a token, combined with channel independence — each variable passes through the model separately with shared weights. Those two choices cut compute and lengthen effective context, making it the most practical point on the transformer route today. Then the DLinear paper: decompose into trend and seasonal, put a linear layer on each, add them — under ten lines of core code — and match or beat a pile of transformers on several long-horizon benchmarks. The meaning is not that transformers are useless but that much of the reported gain came from decomposition and normalisation rather than attention, plus a more general lesson: any new architecture must be compared against an honestly tuned simple baseline. The stance here is empirical — the bench compares four models at a fixed compute budget on accuracy, training time and tuning sensitivity, and at industrial data sizes the gain from complexity is frequently eaten by variance.",
    },
    objectives: [
      { zh: "说清 N-BEATS 的残差堆叠与可解释基函数", en: "Explain N-BEATS's residual stacking and interpretable basis" },
      { zh: "解释 patch 化与通道独立为什么有效", en: "Explain why patching and channel independence work" },
      { zh: "复述 DLinear 的结论及其正确解读", en: "State DLinear's result and read it correctly" },
      { zh: "在固定算力预算下横向比较四种架构", en: "Compare four architectures at a fixed compute budget" },
    ],
    outline: [
      { zh: "N-BEATS:堆叠残差与可解释分解", en: "N-BEATS: stacked residuals, interpretable decomposition" },
      { zh: "PatchTST:把序列切片当 token", en: "PatchTST: slices as tokens" },
      { zh: "DLinear:一个线性层的警告", en: "DLinear: a warning in one linear layer" },
      { zh: "同预算对比:精度、时间、调参敏感度", en: "Equal budget: accuracy, time, tuning sensitivity" },
    ],
  },
  {
    id: "t17", code: "DL3", moduleId: "m5", difficulty: 3, hours: 6, prereq: ["t16"], viz: "tsfmLab",
    props: ["零样本预测", "Chronos/TimesFM/Moirai", "上下文长度", "微调时机", "第一次真的需要 GPU"],
    title: { zh: "时序基础模型:先零样本,再谈微调", en: "Time-Series Foundation Models: Zero-Shot First, Fine-Tuning Later" },
    summary: {
      zh: "过去两三年出现了一类新东西:在海量时序语料上预训练、拿来就能对没见过的序列直接预测的基础模型。Chronos 把数值量化成 token 用语言模型的方式训练;TimesFM 是解码器结构、专为长上下文预测设计;Moirai 面向多变量和多频率;Time-MoE 用稀疏专家把参数量做大而推理成本做小。对工业时序从业者来说,它们改变的不是「最终精度」,而是**做事的顺序**。这一章给出一个非常实用的决策链:第一步,零样本跑一遍。不需要训练、不需要 GPU(小模型 CPU 就能推理)、五分钟出结果,而它在周期性强的工业负荷上经常能接近你调了两周的模型——如果它已经达到你的精度要求,这个项目的建模部分就结束了。第二步,如果零样本不够,先检查是不是上下文长度不够(这类模型对上下文长度很敏感,给 512 个点和给 2048 个点结果差别很大)、是不是需要把外生变量以支持的方式喂进去。第三步,才是微调——而这是整本书里第一个真正需要 GPU 的动作:全参数微调一个 200M 模型需要约 8–16 GB 显存,LoRA 之类的参数高效微调能压到 6 GB 以内,这直接决定了下一个模块你要去哪儿找卡。本章的时序台把三条路线(树模型、零样本基础模型、微调基础模型)放在一起比精度、比总耗时、比花费,并诚实地给出结论:在单厂、强周期、有外生变量的典型场景下,调好的 LightGBM 经常仍然最划算;基础模型真正发光的是冷启动(新设备没有历史)和序列极多而每条都很短的场合。",
      en: "The last two or three years produced something new: models pretrained on enormous time-series corpora that forecast unseen series straight out of the box. Chronos quantises values into tokens and trains them like a language model; TimesFM is a decoder built for long-context forecasting; Moirai targets multivariate and multi-frequency data; Time-MoE uses sparse experts to grow parameters while keeping inference cheap. For an industrial practitioner what they change is not final accuracy but the **order of operations**. The chapter gives a practical decision chain. Step one: run zero-shot. No training, no GPU (small variants infer on CPU), five minutes to a result — and on strongly periodic industrial loads it often lands close to the model you tuned for a fortnight. If it already meets your accuracy requirement, the modelling part of the project is over. Step two: if zero-shot falls short, check context length first (these models are very sensitive to it — 512 points and 2048 points give quite different results) and whether exogenous variables can be supplied in a supported form. Step three, and only then, fine-tune — the first action in this book that genuinely needs a GPU: full fine-tuning of a 200M model wants roughly 8–16 GB of VRAM, while parameter-efficient methods like LoRA fit under 6 GB, which directly decides where you go looking for a card in the next module. The bench compares three routes (trees, zero-shot foundation model, fine-tuned foundation model) on accuracy, total elapsed time and money, and reports honestly: for a single plant with strong periodicity and good exogenous data, a well-tuned LightGBM is frequently still the best value; foundation models shine at cold start (new equipment with no history) and where series are numerous and individually short.",
    },
    objectives: [
      { zh: "在自己的数据上跑通一次零样本预测", en: "Run one zero-shot forecast on your own data" },
      { zh: "用上下文长度与协变量支持解释零样本的好坏", en: "Explain zero-shot quality via context length and covariate support" },
      { zh: "判断什么时候微调才值得,以及需要多少显存", en: "Judge when fine-tuning pays and how much VRAM it needs" },
      { zh: "在树模型/零样本/微调三条路线之间做出选择", en: "Choose among trees, zero-shot and fine-tuning" },
    ],
    outline: [
      { zh: "四个代表模型与它们的设计差异", en: "Four representative models and their design differences" },
      { zh: "零样本:五分钟先拿一个数", en: "Zero-shot: a number in five minutes" },
      { zh: "上下文长度与协变量的支持边界", en: "Context length and the covariate boundary" },
      { zh: "微调的门槛:显存、数据量与收益", en: "The fine-tuning threshold: VRAM, data and return" },
    ],
  },
  {
    id: "t18", code: "DL4", moduleId: "m5", difficulty: 3, hours: 6, prereq: ["t17"], viz: "trainLab",
    props: ["显存估算", "batch 与序列长度", "学习率与预热", "早停与检查点", "种子与确定性"],
    title: { zh: "训练循环的工程:显存、batch、学习率、检查点", en: "Engineering the Training Loop: Memory, Batch, LR, Checkpoints" },
    summary: {
      zh: "这一章把训练循环当成一个工程对象而不是一段样板代码,它直接为下一个模块「在哪儿训」准备好所有输入数字。第一件事是显存估算,这是决定你需要什么卡的唯一依据。一个粗略但好用的公式:参数本身按精度算(fp32 每参数 4 字节,bf16 2 字节),再加梯度(同参数量)、优化器状态(Adam 是两倍参数量)、以及激活值(与 batch size × 序列长度 × 隐层宽度成正比)。合起来,fp32 + Adam 的训练显存大约是参数量的 16 倍再加激活;混合精度能降到 8–10 倍。一个 50M 参数的时序模型因此需要 1–2 GB 存权重相关的东西,剩下的全给激活——这解释了为什么调 batch size 和序列长度是最有效的显存旋钮。第二件事是 batch size 与学习率的联动:batch 加倍,学习率通常要乘以 √2 到 2,否则收敛变慢;加上预热(warmup)和余弦衰减几乎是现在的标配。第三件事是早停:时序上早停的验证集必须是靠后的时间段(第 t12 章的纪律在这里同样适用),patience 定多少取决于你的验证曲线有多抖,而抖动本身往往说明验证集太小。第四件事是本书后面反复要用的技能——检查点:每个 epoch 保存模型权重、优化器状态和当前 epoch 号,这样训练被掐断后能接着跑。这在本地是可选项,在 Kaggle 这种有 9 小时会话墙的平台上是必需品。最后是可复现性:固定 Python/NumPy/框架的随机种子,必要时开确定性算法(会慢一些),并且把种子写进实验记录——没有这一步,你没法判断两次实验的差异是改动带来的还是运气带来的。",
      en: "This chapter treats the training loop as an engineering object rather than boilerplate, and it produces exactly the numbers the next module needs. First, memory estimation, the only basis for deciding what card you need. A rough but workable formula: parameters at their precision (4 bytes each in fp32, 2 in bf16), plus gradients (same count), plus optimiser state (Adam holds two more copies), plus activations (proportional to batch size × sequence length × hidden width). Together, fp32 with Adam costs roughly sixteen times the parameter count before activations; mixed precision brings it to eight or ten. A 50M-parameter series model therefore needs one to two gigabytes for weight-related state and gives everything else to activations — which is why batch size and sequence length are the most effective memory knobs. Second, batch size and learning rate move together: doubling the batch usually calls for multiplying the learning rate by between √2 and 2, and warmup plus cosine decay is effectively standard now. Third, early stopping: on a series the validation window must be the later segment (chapter t12's discipline applies here too), and how much patience to allow depends on how jumpy the validation curve is — jumpiness itself usually means the validation set is too small. Fourth, the skill the rest of the book leans on — checkpointing: save weights, optimiser state and the epoch number every epoch so a killed run can resume. That is optional locally and mandatory on a platform with a nine-hour session wall. Finally reproducibility: pin the seeds for Python, NumPy and the framework, enable deterministic kernels where it matters (at some cost in speed), and write the seed into the experiment log — without it you cannot tell whether the difference between two runs came from your change or from luck.",
    },
    objectives: [
      { zh: "用参数量估算训练所需显存并选定 batch", en: "Estimate training VRAM from parameter count and fix the batch size" },
      { zh: "按 batch 调整学习率并配置预热与衰减", en: "Scale the learning rate with batch size and set warmup and decay" },
      { zh: "在时序上正确配置早停的验证段与 patience", en: "Configure early-stopping window and patience correctly on a series" },
      { zh: "写出一个能被掐断后继续训练的检查点循环", en: "Write a checkpoint loop that survives being killed" },
    ],
    outline: [
      { zh: "显存四项:参数、梯度、优化器、激活", en: "Four memory terms: parameters, gradients, optimiser, activations" },
      { zh: "batch × 序列长度:最有效的两个旋钮", en: "Batch by sequence length: the two effective knobs" },
      { zh: "学习率、预热、衰减与早停", en: "Learning rate, warmup, decay and early stopping" },
      { zh: "检查点与种子:可中断、可复现", en: "Checkpoints and seeds: resumable and reproducible" },
    ],
  },

  /* ============ M6 · PF 在哪儿训:Kaggle 与其他路 ============ */
  {
    id: "t19", code: "PF1", moduleId: "m6", difficulty: 2, hours: 5, prereq: ["t18"], viz: "sizeLab",
    props: ["工作量估算", "CPU 分钟 vs GPU 分钟", "实验矩阵", "GPU 分界线", "先测量再采购"],
    title: { zh: "先量一量:你这个模型到底要不要 GPU", en: "Measure First: Does This Model Actually Need a GPU" },
    summary: {
      zh: "这个模块要回答「在哪儿训」,但第一章必须先回答一个更靠前的问题:要不要训在 GPU 上。这个问题被跳过的代价很具体——租一张卡去跑一个笔记本上三分钟能跑完的 LightGBM,或者反过来,拿笔记本硬扛一个需要跑三天的微调。这一章给你一把尺子。先估算数据规模:一座工厂、一个点位、15 分钟采样、三年历史 = 约 10.5 万行;二十个点位 = 210 万行;一千个点位的全局模型 = 1 亿行,这才开始接近需要认真考虑硬件的量级。再估算实验规模:模型族数 × 超参组合数 × 回测折数 × 每次训练的时长,这个乘积才是你真正要买的东西——很多人只算了「一次训练多久」,忘了自己要训三百次。然后是本章的核心对照表:LightGBM 在 10 万行 × 50 特征上,单次训练是秒级到分钟级,CPU 完全够用,GPU 加速甚至可能因为数据搬运而变慢;一个 5 万参数的 TCN 在同样数据上,CPU 单次几分钟,GPU 几十秒,差距存在但还不构成刚需;而微调一个 200M 的时序基础模型,CPU 上是几十小时起步、GPU 上是小时级,这才是真正的分水岭。时序台把行数、特征数、模型族、超参数量和折数全部开放,直接算出 CPU 与 GPU 的总耗时、以及按当前租用价格折算的花费,并画出那条分界线。本章的结论对大多数工业时序项目是明确的:你不需要 GPU;而对少数确实需要的场景,你也知道了自己需要多大显存、跑多久——这两个数字就是下一章去选平台的输入。",
      en: "This module answers where to train, but the first chapter must answer something upstream: does it need a GPU at all. Skipping that has concrete costs — renting a card for a LightGBM job a laptop finishes in three minutes, or conversely grinding a three-day fine-tune on a laptop. Here is the ruler. First estimate the data: one plant, one tag, fifteen-minute sampling, three years ≈ 105,000 rows; twenty tags ≈ 2.1 million; a global model over a thousand tags ≈ 100 million, which is where hardware starts deserving serious thought. Then estimate the experiment: model families × hyperparameter combinations × backtest folds × time per run — that product is what you are actually buying, and many people price only a single run while planning three hundred. Then the chapter's central comparison: LightGBM on 100k rows by 50 features trains in seconds to minutes, CPU is entirely sufficient, and a GPU can even be slower once data movement is counted; a 50k-parameter TCN on the same data takes a few minutes on CPU and tens of seconds on GPU — a real gap, but not yet a requirement; fine-tuning a 200M foundation model takes tens of hours on CPU and hours on GPU, and that is the genuine watershed. The bench exposes rows, features, model family, hyperparameter count and folds, computes total CPU and GPU time and the money at current rental prices, and draws the dividing line. For most industrial projects the conclusion is unambiguous: you do not need a GPU — and for the minority that do, you now know how much VRAM and how many hours, which are precisely the inputs the next chapter needs.",
    },
    objectives: [
      { zh: "按行数、特征数与模型族估算单次训练时长", en: "Estimate single-run time from rows, features and model family" },
      { zh: "把实验矩阵乘出来,算出项目的总算力需求", en: "Multiply out the experiment matrix into total compute demand" },
      { zh: "定位自己的任务落在 GPU 分界线的哪一侧", en: "Place your own task on one side of the GPU line" },
      { zh: "在采购或申请算力前先给出显存与时长两个数字", en: "Produce VRAM and duration numbers before requesting compute" },
    ],
    outline: [
      { zh: "数据规模:工业时序到底有多少行", en: "Data size: how many rows an industrial series really has" },
      { zh: "实验矩阵:你买的是乘积不是单次", en: "The experiment matrix: you buy the product, not one run" },
      { zh: "三类模型的 CPU/GPU 耗时对照", en: "CPU against GPU for three classes of model" },
      { zh: "分界线:什么时候 GPU 才是刚需", en: "The line: when a GPU becomes a requirement" },
    ],
  },
  {
    id: "t20", code: "PF2", moduleId: "m6", difficulty: 2, hours: 6, prereq: ["t19"], viz: "kaggleLab",
    props: ["私有数据集", "每周 GPU 配额", "会话墙", "Save & Run All", "检查点续训"],
    title: { zh: "Kaggle 实操:数据集、配额、会话墙与断点续训", en: "Kaggle in Practice: Datasets, Quota, the Session Wall and Resuming" },
    summary: {
      zh: "在所有免费算力里,Kaggle 是最实用的一个:它给每个通过手机验证的账号每周 30 小时的 GPU(T4×2 或 P100)和一套完整的数据集、Notebook、版本管理体系,而且不需要任何付费信息。这一章把它当成一个生产环境来讲。第一步是数据:把你的历史数据打包成**私有数据集**上传(网页或 `kaggle datasets create` / `version` 命令行),它会以只读方式挂载到 `/kaggle/input/<slug>/`,你的 Notebook 直接读。第二步是理解三条硬约束,它们共同决定了你的工作方式:GPU 会话最长 9 小时(CPU 12 小时)、每周 GPU 配额 30 小时(周期性重置)、`/kaggle/working` 只有 20 GB 且只有它会被保存下来。第三步是正确的运行方式:不要坐在浏览器前看它跑——交互会话会因为空闲被回收,而且占着配额。正确做法是写好之后用 **Save Version → Save & Run All (Commit)** 提交后台跑批,关掉浏览器,跑完回来取结果;Kaggle 还支持定时运行 Notebook,这足以撑起一个每日自动重训的雏形。第四步是本章的核心技巧——跨会话续训:把检查点写进 `/kaggle/working`,跑完后把它作为**新的数据集版本**推上去,下一个会话把这个数据集挂载为输入,读取检查点继续训练。这个循环让一次 40 小时的训练能被切成 5 段跨越 9 小时的墙。时序台把这一切变成可算的:输入总训练时长、检查点开销和每周配额,它告诉你需要几个会话、跨几周、以及如果关掉检查点会发生什么(答案是永远跑不完)。最后一节是诚实的提醒:工业现场数据往往是客户资产,上传到境外平台之前必须先确认合规,脱敏与缩放是常见的折中办法。",
      en: "Of all the free compute tiers Kaggle is the most useful: every phone-verified account gets thirty GPU hours a week (T4×2 or P100) plus a complete dataset, notebook and versioning system, with no payment details required. This chapter treats it as a production environment. Step one, the data: package your history as a **private dataset** (through the web UI or `kaggle datasets create` / `version`), and it mounts read-only at `/kaggle/input/<slug>/` for your notebook to read. Step two, the three hard constraints that shape how you work: a GPU session lasts at most nine hours (CPU twelve), the weekly GPU quota is thirty hours, and `/kaggle/working` holds only 20 GB and is the only thing preserved. Step three, running it correctly: do not sit watching it in a browser — an interactive session is reclaimed when idle and burns quota meanwhile. Write the notebook, submit it with **Save Version → Save & Run All (Commit)** as a background batch, close the browser, come back for the results. Kaggle also schedules notebooks, which is enough to stand up a first version of a daily automatic retrain. Step four is the chapter's core technique — resuming across sessions: write checkpoints into `/kaggle/working`, push that directory as a **new dataset version** when the run ends, then mount that dataset as an input next session, load the checkpoint and continue. The loop slices a forty-hour training run into five segments that cross the nine-hour wall. The bench makes it computable: give it total training time, checkpoint overhead and weekly quota, and it reports how many sessions, how many weeks, and what happens with checkpointing off (the answer is that it never finishes). A closing section is honest about compliance: plant data is often the customer's asset, and uploading it to an overseas platform needs clearance first — de-identification and rescaling being the usual compromises.",
    },
    objectives: [
      { zh: "把自己的数据作为私有数据集上传并在 Notebook 中挂载", en: "Upload your own data as a private dataset and mount it" },
      { zh: "用后台 Commit 而不是交互会话来跑训练", en: "Run training as a background commit rather than interactively" },
      { zh: "设计跨会话的检查点-数据集版本续训循环", en: "Design the checkpoint-to-dataset-version resume loop" },
      { zh: "按配额与会话墙排出一次长训练的时间表", en: "Schedule a long run against the quota and the session wall" },
    ],
    outline: [
      { zh: "数据集、Notebook 与目录结构", en: "Datasets, notebooks and the directory layout" },
      { zh: "三条硬约束:9 小时、30 小时、20 GB", en: "Three hard limits: nine hours, thirty hours, twenty gigabytes" },
      { zh: "Save & Run All:把它当批处理用", en: "Save & Run All: treat it as batch" },
      { zh: "检查点 → 数据集版本 → 续训", en: "Checkpoint, dataset version, resume" },
    ],
  },
  {
    id: "t31", code: "PF3", moduleId: "m6", difficulty: 2, hours: 5, prereq: ["t20"], viz: "colabLab",
    props: ["抢占式回收", "Drive 持久化", "最优检查点间隔", "数据暂存", "后台执行"],
    title: { zh: "Colab 实操:抢占、Drive,和最优检查点间隔", en: "Colab in Practice: Preemption, Drive, and the Optimal Checkpoint Interval" },
    summary: {
      zh: "Colab 和 Kaggle 看起来是同一类东西——免费的云端 Notebook 加一张 GPU——但它们的持久化模型正好相反,而这个差别决定了你的训练脚本要怎么写。Kaggle 的会话墙是确定的:9 小时,到点回收,而 /kaggle/working 会被保存下来,你把检查点推成数据集版本就能接着跑。Colab 没有公布的配额,也没有承诺:免费档是尽力而为,运行时可能在任何时刻被回收,而且 /content 目录连同你所有的中间产物会一起消失——只有挂载的 Google Drive 活下来。于是问题从「要切成几段」变成了「在一个随机会挂的机器上,多久存一次盘最划算」,而这个问题有一个漂亮的闭式答案:Young 公式,最优检查点间隔等于「两倍的检查点耗时乘以平均无故障时间」的平方根。本章的时序台把这件事完整模拟出来:给定任务时长、每小时被回收的概率、写一次检查点的耗时和重启开销,它跑一个真实的抢占过程,算出预计墙钟时间、被回收次数、白跑掉的工作量和效率,并把效率随检查点间隔变化的那条 U 形曲线画出来,标上 Young 公式给的最优点。你会看到两个结论:存得太频繁和存得太稀疏一样糟;以及如果你把检查点写在 /content 而不是 Drive 上,一次回收就把全部进度清零——这时候任务能不能完成变成一个概率问题,而那个概率低得让人不敢相信。本章还处理两个会吃掉大半时间却很少被写进教程的现实问题:Drive 的 FUSE 挂载在处理大量小文件时比本地盘慢一到两个数量级,所以正确做法是把数据集打成一个压缩包、复制到本地盘再解开;以及免费档关掉浏览器标签页训练就停,后台执行是付费档的功能——这一条直接决定了你能不能像用 Kaggle 那样「提交完就走」。",
      en: "Colab and Kaggle look like the same kind of thing — a free cloud notebook with a GPU attached — but their persistence models are inverted, and that difference decides how your training script must be written. Kaggle's session wall is deterministic: nine hours, then reclaimed, with /kaggle/working preserved so that publishing the checkpoint as a dataset version lets you continue. Colab publishes no quota and promises nothing: the free tier is best-effort, the runtime can be reclaimed at any moment, and /content disappears along with every intermediate artefact you created — only a mounted Google Drive survives. So the question changes from how many segments to slice into, into how often to save on a machine that may die at any time — and that question has an elegant closed-form answer: Young's formula, where the optimal checkpoint interval is the square root of twice the checkpoint cost times the mean time between failures. The bench simulates the whole process: give it the job length, the hourly preemption probability, the cost of writing one checkpoint and the restart overhead, and it runs a real preemption process, reporting expected wall-clock time, the number of reclaims, the work thrown away and the efficiency, then draws the U-shaped curve of efficiency against checkpoint interval with Young's optimum marked. Two conclusions arrive: saving too often is as bad as saving too rarely, and writing checkpoints to /content rather than Drive means one reclaim returns progress to zero — at which point whether the job finishes at all becomes a probability, and an uncomfortably low one. The chapter also handles two realities that consume most of people's time and rarely reach a tutorial: Drive's FUSE mount is one to two orders of magnitude slower than local disk on many small files, so the correct move is to tar the dataset, copy it to local disk and unpack it there; and on the free tier, closing the browser tab stops training, because background execution is a paid feature — which directly decides whether you can submit and walk away the way Kaggle lets you.",
    },
    objectives: [
      { zh: "说清 Colab 与 Kaggle 相反的持久化模型", en: "State how Colab's persistence model inverts Kaggle's" },
      { zh: "用 Young 公式算出这台机器上的最优检查点间隔", en: "Compute the optimal checkpoint interval with Young's formula" },
      { zh: "把数据集暂存到本地盘,绕开 Drive 的小文件瓶颈", en: "Stage the dataset onto local disk, around Drive's small-file bottleneck" },
      { zh: "判断什么时候该用 Colab、什么时候该回 Kaggle", en: "Judge when Colab is the right choice and when to go back to Kaggle" },
    ],
    outline: [
      { zh: "确定的会话墙 vs 随机的抢占", en: "A deterministic wall against random preemption" },
      { zh: "只有 Drive 活下来:检查点写在哪里", en: "Only Drive survives: where the checkpoint goes" },
      { zh: "Young 公式与那条 U 形曲线", en: "Young's formula and the U-shaped curve" },
      { zh: "数据暂存、后台执行与可达性", en: "Staging data, background execution, reachability" },
    ],
  },
  {
    id: "t21", code: "PF4", moduleId: "m6", difficulty: 2, hours: 5, prereq: ["t20"], viz: "platLab",
    props: ["平台横向对比", "按小时租卡", "国内免费算力", "数据出境", "可达性"],
    title: { zh: "其他路:Colab、租卡、国内平台与本地机器", en: "The Alternatives: Colab, Hourly Rental, Domestic Platforms, Local Iron" },
    summary: {
      zh: "Kaggle 不是唯一的路,而且对很多工业项目来说它甚至不是最合适的那条。这一章把十个常见选择放在同一张表上,用四个维度打分:成本(按小时或按月的真实花费)、可达性(在你所在的网络环境下能不能稳定用)、长跑能力(能不能连续跑 20 小时不被掐)、数据合规(数据存在哪个法域)。免费一档:Kaggle(30 GPU·h/周,9 小时墙)、Colab(免费档 T4、随时可能被回收,Pro 档按月付费更稳)、各类云厂商的新用户试用额度、以及国内几个提供免费算力的平台(通常按每日额度发放,不需要跨境网络)。按小时租卡一档:国内的 GPU 租赁平台单卡每小时几块钱,境外的按秒计费平台价格相近,共同优点是**没有会话墙**——这对需要连续跑十几个小时的微调任务是决定性的,也是本章给出的主要建议:如果你的任务超过 9 小时且预算允许,花几十块钱租一次卡,比跟配额和检查点搏斗划算得多。本地一档:一台带消费级显卡的台式机在长期高频使用下反而最便宜,而且数据完全不出厂。最后一个维度值得单独强调:工业现场的历史数据通常是甲方资产,有些还落在能源、制造等敏感行业的数据管理要求里,把它上传到境外平台在很多项目里是一个需要书面确认的动作,而不是一个技术细节。可行的折中有三种:只上传经过缩放和脱敏的曲线(去掉绝对量级和可识别的时间锚点)、用合成数据做架构选型再把最终训练放回内网、或者直接选择数据不出境的平台。时序台把这十个选项按你输入的约束(预算、是否需要长跑、是否允许出境、每月小时数)排序,给出前三推荐。",
      en: "Kaggle is not the only route, and for many industrial projects it is not even the best one. This chapter lays ten common options on one table and scores them on four axes: cost (the real hourly or monthly spend), reachability (whether it works reliably from your network), long-run capability (whether twenty consecutive hours are possible), and data compliance (which jurisdiction holds the data). The free tier: Kaggle (30 GPU-hours a week, a nine-hour wall), Colab (a T4 that can be reclaimed at any moment on the free plan, steadier on a paid plan), the new-user trial credits every cloud vendor offers, and several domestic platforms that hand out daily compute allowances and need no cross-border network. The hourly-rental tier: GPU rental platforms charge a few yuan per card-hour domestically and comparable prices per second abroad, and their shared advantage is that there is **no session wall** — decisive for a fine-tune that needs fifteen consecutive hours, and the chapter's main recommendation: if your job exceeds nine hours and the budget allows, renting a card for the price of a lunch beats wrestling with quotas and checkpoints. The local tier: a desktop with a consumer card is the cheapest option under sustained heavy use, and the data never leaves the building. The last axis deserves emphasis. Plant history is usually the customer's asset, some of it falling under sector-specific data rules, and uploading it to an overseas platform is an action that needs written clearance in many projects rather than a technical footnote. Three workable compromises: upload only rescaled and de-identified curves (strip absolute magnitude and identifiable time anchors), use synthetic data for architecture selection and move the final training back inside the network, or simply choose a platform that keeps the data in country. The bench ranks the ten options against your constraints (budget, long-run need, export permission, monthly hours) and names a top three.",
    },
    objectives: [
      { zh: "用四个维度给候选平台打分并排序", en: "Score and rank candidate platforms on four axes" },
      { zh: "判断什么时候「花钱租卡」比「免费配额」更划算", en: "Judge when renting beats a free quota" },
      { zh: "在项目启动阶段就厘清数据出境的合规要求", en: "Settle data-export compliance at project start" },
      { zh: "设计脱敏或合成数据的折中方案", en: "Design a de-identified or synthetic-data compromise" },
    ],
    outline: [
      { zh: "免费档:配额、回收与不确定性", en: "Free tiers: quotas, reclamation, uncertainty" },
      { zh: "租卡档:没有会话墙值多少钱", en: "Rental: what no session wall is worth" },
      { zh: "本地档:长期高频使用的最优解", en: "Local: the optimum under sustained use" },
      { zh: "数据出境:项目第一天就该问的问题", en: "Data export: a day-one question" },
    ],
  },
  {
    id: "t22", code: "PF5", moduleId: "m6", difficulty: 2, hours: 5, prereq: ["t21"], viz: "costLab",
    props: ["实验预算", "低保真筛选", "早停止损", "并行度", "时间 vs 金钱"],
    title: { zh: "一次实验计划要花多少钱、多少天", en: "What an Experiment Plan Costs in Money and in Days" },
    summary: {
      zh: "把前三章的数字合起来,就能在项目立项时回答两个具体问题:这套实验要花多少钱,要跑多少天。这一章把它做成一张可算的预算表。输入是实验矩阵:几个模型族、每个几组超参、几折滚动回测、每折多少数据、每次训练多久。输出是三个数:总算力小时、总花费、总墙钟时间——注意最后一个和前两个不成正比,因为并行度取决于你能同时开几个会话或几张卡。然后是本章真正的价值:三个把这个数字砍掉一半以上的实用手法。第一是**低保真筛选**:先用 10% 的数据、更少的折数、更短的训练轮次把候选配置跑一遍,淘汰掉明显差的八成,只把幸存者拿去做完整评估。这个做法的前提是低保真排名和高保真排名相关性足够高,这一章会让你在时序台上看到这个相关性随采样比例怎么变化——通常 10% 的数据就能保留七八成的排序信息。第二是**早停止损**:一次训练跑到三分之一时,如果验证指标明显落后于当前最优,直接杀掉(这就是 Hyperband / ASHA 这类方法的核心思想),它能把搜索成本再降一半。第三是**先做数据再做模型**:上一个模块的所有经验都指向同一件事——在数据质量、特征设计和验证方案没做好之前增加算力,是把钱花在放大噪声上。这一章的时序台把三个手法做成开关,让你看到一份原本要 180 GPU 小时、跨三周的计划,怎么变成 40 小时、四天。",
      en: "Combine the numbers from the previous three chapters and you can answer two concrete questions at project approval: what will this experiment cost, and how many days will it take. The chapter turns that into a computable budget. Inputs are the experiment matrix: how many model families, how many hyperparameter sets each, how many rolling folds, how much data per fold, how long a run takes. Outputs are three numbers: total compute hours, total money, and total wall-clock time — and the last is not proportional to the first two, because parallelism depends on how many sessions or cards you can hold at once. Then the chapter's real value: three practical moves that cut the figure by more than half. First, **low-fidelity screening**: run every candidate on 10% of the data with fewer folds and shorter training, eliminate the obviously bad eighty percent, and give full evaluation only to the survivors. This works when the low-fidelity ranking correlates well with the full one, and the bench shows how that correlation moves with sampling ratio — typically ten percent of the data preserves seventy to eighty percent of the ordering. Second, **early kill**: a third of the way into a run, if the validation metric is clearly behind the incumbent, terminate it — the core idea behind Hyperband and ASHA — which halves search cost again. Third, **data before model**: every lesson in the previous modules points the same way, and adding compute before data quality, feature design and the validation scheme are right is money spent amplifying noise. The bench makes all three switchable, so you watch a plan of 180 GPU hours across three weeks become forty hours across four days.",
    },
    objectives: [
      { zh: "把实验矩阵折算成算力小时、花费与墙钟时间", en: "Convert an experiment matrix into hours, money and wall-clock time" },
      { zh: "设计一轮低保真筛选并验证其排序可靠性", en: "Design a low-fidelity screening round and check its ranking fidelity" },
      { zh: "用早停止损把搜索成本再降一半", en: "Halve search cost again with early termination" },
      { zh: "在立项时给出可辩护的算力预算", en: "Present a defensible compute budget at approval" },
    ],
    outline: [
      { zh: "实验矩阵 → 三个数字", en: "The matrix into three numbers" },
      { zh: "低保真筛选:10% 数据留住多少排序", en: "Low-fidelity screening: how much ordering ten percent keeps" },
      { zh: "早停止损:Hyperband 的核心直觉", en: "Early kill: the intuition behind Hyperband" },
      { zh: "并行度:钱与时间不是同一个维度", en: "Parallelism: money and time are different axes" },
    ],
  },

  /* ============ M7 · EV 实验方法 ============ */
  {
    id: "t23", code: "EV1", moduleId: "m7", difficulty: 2, hours: 6, prereq: ["t7"], viz: "cvLab",
    props: ["滚动原点回测", "固定窗 vs 扩展窗", "折数与方差", "gap 设置", "结论可信度"],
    title: { zh: "滚动回测:时序该怎么做交叉验证", en: "Rolling-Origin Backtesting: Cross-Validation for Time Series" },
    summary: {
      zh: "第七章讲过随机 K 折在时序上是作弊,这一章讲正确的做法长什么样。滚动原点回测的思路很简单:选一个时间点,用它之前的数据训练、之后一段时间评估,然后把这个点往前推,重复若干次,最后看这若干折的均值和方差。这里有四个必须自己决定的参数。第一是**训练窗口形态**:固定窗(每次都用最近 N 天)还是扩展窗(每次都用全部历史)。扩展窗数据更多,但如果工艺发生过永久性变化,老数据会拖后腿;固定窗对漂移更敏感但可能欠拟合。这一章让你在有漂移和无漂移两种数据上对比,结论是有明显工况变更的产线更适合固定窗。第二是**步长**:每次往前推多久,决定了折数;折数太少是这一章最想警告的事——只做一次切分,你得到的是一个随机数,同一个模型在不同切分上 MAPE 相差两倍是完全正常的现象。第三是 **gap**:训练集末尾和验证集开头之间要留出等于预测提前量的空隙,否则边界样本仍然携带泄漏。第四是**评估窗口长度**:一折评估一天还是一个月,取决于你的决策周期,但评估窗太短会让指标被个别异常日主导。这一章的时序台让你把这四个参数全部拖动,同时显示每折的误差、均值、标准差和一个更有用的东西:两个模型的差值在各折上的分布——如果 A 比 B 好但在三分之一的折上反而更差,那么「A 更好」这个结论是不牢的,这正是很多线下结论上线后翻车的统计学原因。",
      en: "Chapter seven established that shuffled K-fold is cheating on a series; this one shows what correct looks like. Rolling-origin backtesting is simple in principle: pick a time point, train on everything before it, evaluate on a window after it, advance the point, repeat, and read the mean and variance across folds. Four parameters are yours to decide. First, the **training window shape**: fixed (always the last N days) or expanding (always all history). Expanding sees more data, but if the process changed permanently the old data drags; fixed reacts to drift but may underfit. A comparison on drifting and non-drifting data gives the conclusion that lines with real process changes prefer fixed windows. Second, the **step**: how far the origin advances, which sets the number of folds — and too few folds is what this chapter most wants to warn about. A single split returns a random number, and the same model differing by a factor of two in MAPE across splits is entirely normal. Third, the **gap**: leave a space equal to the forecast lead time between the end of training and the start of validation, or boundary samples still leak. Fourth, the **evaluation window**: a day or a month per fold, depending on your decision cycle — but too short lets one abnormal day dominate the metric. The bench exposes all four and shows per-fold error, mean, standard deviation and something more useful: the distribution of the difference between two models across folds. If A beats B on average but loses on a third of the folds, then 'A is better' is not a solid conclusion — and that is the statistical reason many offline conclusions collapse after go-live.",
    },
    objectives: [
      { zh: "搭起一个带 gap 的滚动原点回测框架", en: "Build a rolling-origin backtest with a proper gap" },
      { zh: "在固定窗与扩展窗之间根据漂移做选择", en: "Choose fixed or expanding windows based on drift" },
      { zh: "用折间方差判断一个结论是否可信", en: "Use across-fold variance to judge whether a conclusion holds" },
      { zh: "比较两个模型时看差值分布而不是只看均值", en: "Compare two models by the distribution of differences, not the mean" },
    ],
    outline: [
      { zh: "滚动原点:训练、间隔、评估三段", en: "Rolling origin: train, gap, evaluate" },
      { zh: "固定窗与扩展窗,以及漂移", en: "Fixed against expanding windows under drift" },
      { zh: "折数与方差:一次切分等于一个随机数", en: "Folds and variance: one split is one random number" },
      { zh: "差值分布:A 真的比 B 好吗", en: "The difference distribution: is A really better than B" },
    ],
  },
  {
    id: "t24", code: "EV2", moduleId: "m7", difficulty: 2, hours: 5, prereq: ["t23"], viz: "metricLab",
    props: ["MAPE 陷阱", "WAPE/MASE", "峰值时刻误差", "按后果计价", "指标排名矛盾"],
    title: { zh: "指标:MAPE 的陷阱与按后果计价的指标", en: "Metrics: The MAPE Trap and Consequence-Priced Scores" },
    summary: {
      zh: "你用什么指标衡量模型,就决定了模型会往哪个方向优化,而工业界最常用的 MAPE 恰好是最容易骗人的那个。它的问题出在分母:当真实值接近零(夜间停机、设备待机、检修日),一个绝对值很小的误差会被除成几百个百分点,一个停机时段就能把整月的 MAPE 拉到荒谬的数字,而你的模型在真正重要的白班时段可能表现极好。更隐蔽的是它的不对称:MAPE 对低估的惩罚天然大于高估,所以用 MAPE 选出来的模型会系统性地偏高。这一章把六个常用指标摆在一起:MAE(单位直观,但不同量级序列之间不可比)、RMSE(对大误差惩罚重,适合怕极端偏差的场景)、MAPE(可比但怕零)、WAPE(用总量做分母,解决了零的问题,是工业场景里最实用的默认选择)、MASE(除以朴素基线,自带及格线)、pinball(概率预测唯一正确的指标)。然后是本章的主张:最重要的指标是按后果计价的那一个。如果预测服务需量控制,唯一该看的是「月最大需量估计偏差」和「峰值时刻命中率」;如果服务储能调度,该看的是「按实际电价折算的调度收益差」;如果服务告警,该看的是在给定误报率下的漏报率。这一章的时序台让你把同一组预测在六个指标下排名,你会看到排名互相矛盾——在 RMSE 上第一的模型可能在 WAPE 上第四,在峰值命中率上倒数。这不是指标的缺陷,而是提醒你:先确定后果,再选指标,最后才选模型。",
      en: "The metric you measure by decides the direction the model optimises in, and industry's favourite, MAPE, is the most deceptive. Its problem is the denominator: as the true value approaches zero (night shutdown, standby, a maintenance day) a small absolute error divides into hundreds of percent, one stopped window drags the whole month's MAPE to an absurd figure, and your model may be excellent during the day shift that actually matters. More insidiously it is asymmetric — MAPE penalises underprediction more than overprediction by construction, so a model chosen by MAPE leans high systematically. Six common metrics sit side by side here: MAE (intuitive units, incomparable across scales), RMSE (heavy on large errors, right when extreme deviation is the fear), MAPE (comparable but afraid of zero), WAPE (total as the denominator, immune to zeros, the most practical default in industry), MASE (divided by the naive baseline, carrying its own pass mark), and pinball (the only correct score for probabilistic forecasts). Then the chapter's claim: the most important metric is the one priced by consequence. If the forecast drives demand control, look only at the deviation of the estimated monthly peak and at peak-timing hit rate; if it drives storage dispatch, look at the difference in dispatch revenue under real tariffs; if it drives alerting, look at the miss rate at a fixed false-alarm rate. The bench ranks one set of predictions under six metrics and the rankings contradict one another — the model that is first on RMSE may be fourth on WAPE and last on peak hits. That is not a defect in the metrics; it is a reminder to fix the consequence first, then the metric, and only then the model.",
    },
    objectives: [
      { zh: "解释 MAPE 在低值区间失效的数学原因", en: "Explain mathematically why MAPE fails near zero" },
      { zh: "为不同场景选择 WAPE、MASE、RMSE 或 pinball", en: "Choose WAPE, MASE, RMSE or pinball per scenario" },
      { zh: "定义一个按业务后果计价的自定义指标", en: "Define a custom metric priced by business consequence" },
      { zh: "识别并解释不同指标之间的排名矛盾", en: "Identify and explain contradictions between metric rankings" },
    ],
    outline: [
      { zh: "MAPE 的两个缺陷:零与不对称", en: "MAPE's two defects: zeros and asymmetry" },
      { zh: "六个指标各自适合什么场景", en: "Six metrics and where each belongs" },
      { zh: "按后果计价:峰值、收益、漏报", en: "Priced by consequence: peaks, revenue, misses" },
      { zh: "排名矛盾:先定后果,再选指标", en: "Contradictory rankings: consequence first" },
    ],
  },
  {
    id: "t25", code: "EV3", moduleId: "m7", difficulty: 2, hours: 6, prereq: ["t24"], viz: "tuneLab",
    props: ["随机 vs 网格 vs TPE", "固定预算收敛", "验证集过拟合", "实验记录", "种子与复现"],
    title: { zh: "超参搜索与可复现:别把运气当成进步", en: "Tuning and Reproducibility: Do Not Mistake Luck for Progress" },
    summary: {
      zh: "超参搜索有一个很反直觉的事实:网格搜索几乎总是最差的选择。原因是维度诅咒加上「多数超参不重要」——在 5 个超参里通常只有 1 到 2 个真正影响结果,网格搜索会在不重要的维度上浪费大量预算,而随机搜索在同样的次数下对重要维度的覆盖更细。贝叶斯方法(TPE、GP)在预算较大(50 次以上)且单次训练较贵时开始显出优势,因为它会把新的采样点集中到有希望的区域。这一章的时序台把三种策略在固定预算下的收敛曲线画出来,你会看到随机搜索在前 20 次就追平网格,TPE 在 50 次之后拉开差距。然后是一个更重要、也更容易被忽略的问题:**验证集过拟合**。当你在同一个验证集上搜了三百组超参并挑出最好的那一组,这组配置的优势里有相当一部分只是运气——它在这个验证集上恰好好。搜得越多,这个虚假优势越大。解决办法有三个:用滚动回测的多折均值而不是单折来选(方差小得多)、留一个从头到尾没参与过选择的最终测试段、以及对最优附近的几组配置取平均而不是只取最优点。最后是可复现的最低配置,五行代码的事却决定了你三个月后能不能回到当时的结果:每次运行记录代码版本(git hash)、数据版本(文件哈希或数据集版本号)、随机种子、完整参数字典和全部指标,存成一行 JSON 追加到一个文件里。这不需要任何实验管理平台,但它是「能复现的实验」和「一堆再也复现不出来的好成绩」之间的分水岭。",
      en: "Hyperparameter search carries a counter-intuitive fact: grid search is almost always the worst choice. The reason is the curse of dimensionality plus the observation that most hyperparameters do not matter — of five, typically one or two drive the result, and grid search spends a large share of its budget resolving the unimportant dimensions while random search resolves the important ones more finely for the same number of trials. Bayesian methods (TPE, GP) start to win once the budget is larger (beyond about fifty trials) and each run is expensive, because they concentrate new samples in promising regions. The bench plots all three convergence curves at a fixed budget: random catches grid within twenty trials, and TPE pulls ahead after fifty. Then a more important and more often ignored problem: **validation-set overfitting**. When you have searched three hundred configurations on one validation set and taken the best, a good share of that winner's margin is luck — it happened to suit this particular set, and the more you search the larger that phantom margin grows. Three remedies: select on the mean across rolling folds rather than a single fold (far lower variance), hold out a final test segment that never participated in any selection, and average several configurations near the optimum instead of taking the single best point. Finally, the minimum viable reproducibility setup — five lines of code that decide whether you can return to today's result three months from now: log the code version (git hash), the data version (file hash or dataset version), the random seed, the full parameter dictionary and every metric, appended as one JSON line to a file. No experiment platform is required, and it is the difference between experiments you can reproduce and a pile of good scores you will never see again.",
    },
    objectives: [
      { zh: "说清随机搜索为什么通常优于网格搜索", en: "Explain why random search usually beats grid search" },
      { zh: "在固定预算下选择合适的搜索策略", en: "Pick the right search strategy for a fixed budget" },
      { zh: "识别并抑制验证集过拟合", en: "Recognise and suppress validation-set overfitting" },
      { zh: "用五行代码建立可复现的实验记录", en: "Establish a reproducible experiment log in five lines" },
    ],
    outline: [
      { zh: "维度诅咒与「多数超参不重要」", en: "The curse of dimensionality and unimportant knobs" },
      { zh: "固定预算下三种策略的收敛", en: "Three strategies converging at a fixed budget" },
      { zh: "验证集过拟合:搜得越多越危险", en: "Validation overfitting: more search, more danger" },
      { zh: "记录五件事:版本、数据、种子、参数、结果", en: "Log five things: code, data, seed, params, results" },
    ],
  },

  /* ============ M8 · OP 上线与运维 ============ */
  {
    id: "t26", code: "OP1", moduleId: "m8", difficulty: 3, hours: 5, prereq: ["t25"], viz: "serveLab",
    props: ["发布时刻表", "数据就绪时间", "日内滚动", "降级路径", "预测留档"],
    title: { zh: "推理服务与发布时刻表:几点出、慢了怎么办", en: "Inference and the Publication Schedule: When It Ships, and What If It Is Late" },
    summary: {
      zh: "离线跑分和线上服务之间有一道沟,这道沟是由时间构成的。日前预测要在几点发布?这不是你决定的,是下游决定的:如果调度会议在早上八点开,预测必须七点半就在系统里。倒推回去:模型推理要多久、特征要多久算完、上游数据几点才到齐、气象预报几点更新——这条链上最慢的一环决定了你能不能按时交付。这一章教你把这条时间链画出来,并标出每一环的P95 耗时和失败概率。这里有一个工业现场特有的麻烦:上游数据经常迟到或不完整。电表数据可能延迟两小时上传,MES 的排产计划可能在前一晚才定稿,气象预报每六小时更新一次。所以推理服务必须处理「数据不全」这个常态,而不是把它当异常。解决方案是明确设计**降级路径**:特征缺失时用最近可用值+标记、模型服务超时时回落到季节朴素基线、整条链路失败时输出上一次的预测并打上过期标签——正确答案永远不是抛错让下游空着。第二件必须设计的事是日内滚动:日前预测发布后,随着当天实际数据进来,每小时(或每 15 分钟)用最新数据重新预测剩余时段,误差通常能比日前降低三到五成。第三件是预测留档:每一次预测连同它的输入特征、模型版本、生成时刻一起存下来,这是后面做漂移分析和事故复盘的唯一依据,而且必须在第一天就开始存,否则三个月后你想回答「上个月十五号为什么错得那么离谱」就只能靠猜。",
      en: "Between an offline score and a live service lies a gap made of time. What hour does the day-ahead forecast publish? You do not decide that — downstream does: if the dispatch meeting is at eight, the forecast must be in the system by seven thirty. Work backwards: how long inference takes, how long features take, when upstream data is complete, when the weather forecast refreshes. The slowest link decides whether you deliver on time. This chapter has you draw that chain and mark each link's P95 duration and failure probability. One trouble is specific to plants: upstream data is routinely late or incomplete. Meter data may upload two hours behind, the MES schedule may only be finalised the previous evening, the weather forecast refreshes every six hours. So the inference service must treat incomplete data as the normal case rather than an exception, which means explicitly designing the **degradation path**: missing features fall back to the last available value plus a flag, a model-service timeout falls back to the seasonal-naive baseline, and total failure republishes the previous forecast marked stale. The right answer is never to raise an error and leave downstream empty. The second thing to design is intraday rolling: after the day-ahead publishes, re-forecast the remaining hours every hour (or every fifteen minutes) as the day's actuals arrive, typically cutting error by thirty to fifty percent against day-ahead. The third is archiving: store every forecast together with its input features, model version and generation timestamp. That archive is the only basis for later drift analysis and incident review, and it must start on day one — otherwise, three months from now, 'why was the fifteenth so badly wrong' can only be answered by guessing.",
    },
    objectives: [
      { zh: "从下游决策时刻倒推出整条推理时间链", en: "Derive the inference timing chain from the downstream decision" },
      { zh: "为数据迟到、服务超时设计明确的降级路径", en: "Design explicit degradation paths for late data and timeouts" },
      { zh: "设计日内滚动预测的刷新频率与收益", en: "Design intraday rolling refresh frequency and its gain" },
      { zh: "从第一天起把预测与输入一起留档", en: "Archive forecasts with their inputs from day one" },
    ],
    outline: [
      { zh: "倒推时刻表:从八点的会议往回算", en: "Backwards from the eight o'clock meeting" },
      { zh: "数据迟到是常态而不是异常", en: "Late data is the norm, not the exception" },
      { zh: "降级路径:永远不要抛错给下游", en: "Degradation: never hand downstream an error" },
      { zh: "日内滚动与预测留档", en: "Intraday rolling and the forecast archive" },
    ],
  },
  {
    id: "t27", code: "OP2", moduleId: "m8", difficulty: 3, hours: 6, prereq: ["t26"], viz: "driftLab",
    props: ["概念漂移", "输入分布漂移", "触发式重训", "定期重训", "重训成本"],
    title: { zh: "漂移与再训练:什么时候该重训", en: "Drift and Retraining: When to Retrain" },
    summary: {
      zh: "模型上线三个月后误差翻倍,这不是模型坏了,是世界变了。工业时序的漂移有非常具体的来源,而且大多是离散事件而不是连续过程:换了产品型号、加了一条产线、改了排产规则、大修更换了设备、换季了、电价政策调整导致生产计划整体迁移。这些事件发生的那一天,模型的误差会台阶式跳变,而不是缓慢爬升——这个特性决定了应对方式。这一章把两种再训练策略放在一起比。**定期重训**:每周或每月重训一次,好处是简单、无需监控、可预测;坏处是漂移发生后你平均要等半个周期才响应,而在没有漂移的时候你在白烧算力。**触发式重训**:用两类信号做触发器——输出侧(近 7 天滚动误差超过基线的 X%)和输入侧(特征分布与训练集的距离,比如 PSI 或 KS 统计量超过阈值),一旦触发立即重训。它响应快,但需要监控体系,而且阈值定得太敏感会导致频繁重训。这一章的时序台会让你看到这个失败模式:把触发阈值调到很敏感,系统每周都在重训,每次都没变好,算力全浪费在噪声上。实践中最稳的是两者结合:定期重训做兜底(比如每月),触发式重训做快速响应,再加一条纪律——**每次重训后必须和当前线上模型做影子对比**,新模型在最近一段数据上不显著更好就不上线。最后讲一个容易被忽略的成本:重训不只是算力,还包括验证、审批和上线的人力,以及每次换模型带来的运行人员信任成本——模型行为突然变化,哪怕变好了,也需要解释。",
      en: "Error doubles three months after go-live — the model did not break, the world changed. Drift in industrial series has concrete causes, and most are discrete events rather than continuous processes: a new product type, an added line, a changed schedule, equipment replaced in an overhaul, a change of season, a tariff revision that moves the whole production plan. On the day such an event happens the error steps up rather than creeping, and that property dictates the response. Two strategies sit side by side. **Calendar retraining**: retrain weekly or monthly — simple, needs no monitoring, predictable; but after a drift you wait half a period on average to respond, and in quiet months you burn compute for nothing. **Triggered retraining**: two families of signal act as triggers — output side (rolling seven-day error exceeding the baseline by X%) and input side (distance between the feature distribution and the training set, such as PSI or a KS statistic crossing a threshold) — retraining the moment one fires. It responds fast but requires monitoring, and an over-sensitive threshold causes constant retraining. The bench demonstrates that failure mode: tune the trigger tight and the system retrains every week, improves nothing, and spends its compute on noise. In practice the steadiest arrangement combines both: calendar retraining as a floor (monthly, say), triggered retraining for fast response, plus one discipline — **every retrained model must run in shadow against the incumbent**, and does not ship unless it is significantly better on recent data. A closing note on a cost that gets overlooked: retraining is not only compute but also the human time for validation, approval and release, plus the trust cost of changing model behaviour — operators need an explanation when behaviour shifts, even when it shifts for the better.",
    },
    objectives: [
      { zh: "列出自己场景里会导致漂移的具体事件", en: "List the concrete events that cause drift in your setting" },
      { zh: "用输出侧与输入侧两类信号搭建漂移监控", en: "Build drift monitoring from output-side and input-side signals" },
      { zh: "在定期重训与触发式重训之间做出组合设计", en: "Design a combination of calendar and triggered retraining" },
      { zh: "用影子对比决定新模型是否上线", en: "Decide releases with a shadow comparison" },
    ],
    outline: [
      { zh: "漂移的具体来源:大多是离散事件", en: "Where drift comes from: mostly discrete events" },
      { zh: "两类触发信号:误差与分布距离", en: "Two trigger families: error and distribution distance" },
      { zh: "阈值太敏感:每周重训,每次没用", en: "Too sensitive: retrain weekly, improve nothing" },
      { zh: "影子对比与重训的真实成本", en: "Shadow comparison and the real cost of retraining" },
    ],
  },
  {
    id: "t28", code: "OP3", moduleId: "m8", difficulty: 3, hours: 5, prereq: ["t27"], viz: "opsLab",
    props: ["上位系统集成", "告警阈值 ROC", "告警疲劳", "可解释性", "运行人员信任"],
    title: { zh: "集成、告警与信任:让人愿意用这个模型", en: "Integration, Alerting and Trust: Getting People to Use It" },
    summary: {
      zh: "最后一章讲的是把模型接进现场,以及一件工程师最容易低估的事:人。第一部分是集成。预测只有写回上位系统(EMS、SCADA、MES、能管平台)才产生价值,而这条接口的可靠性要求往往高于模型本身:接口协议(OPC UA、Modbus、REST、数据库表、文件投递各有各的现场)、失败重试与幂等(重复写入不能产生两条预测)、时钟同步(你的时间戳和现场系统必须一致)、以及版本兼容(模型升级时接口契约不能变)。第二部分是告警,它本质上是一个 ROC 问题:阈值松,误报多,运行人员两周后开始无视;阈值紧,漏报多,出事时模型等于不存在。这一章把告警疲劳当作一个可以量化管理的指标而不是态度问题:定义每班次可接受的告警条数(经验值是 2 到 5 条),反推出允许的误报率,再从 ROC 曲线上定阈值——这个顺序比「先定一个 3σ 再看效果」靠谱得多。还有一个实用手法:分级告警,把「提示」「预警」「立即处理」分开,只有最高级才推送到人,其余进看板。第三部分是信任。运行人员不信任一个黑箱,而信任建立在三件具体的事上:一是**可解释**——每次预测附带主要驱动因素(今天预测偏高是因为气温 34 度和 B 线满产),SHAP 值或树模型的特征贡献足够用;二是**可对照**——界面上永远同时显示模型预测、朴素基线和实际值,让人自己看到模型的价值;三是**可追溯**——出错时能调出那次预测的全部输入。最后一条建议:上线第一个月让模型只做建议不做控制,让人把它的错误看够,信任才建立得起来。",
      en: "The last chapter connects the model to the plant, and covers the thing engineers most underestimate: people. Part one is integration. A forecast creates value only once written back to the plant system (EMS, SCADA, MES, an energy platform), and that interface's reliability requirement often exceeds the model's: the protocol (OPC UA, Modbus, REST, a database table or file drop — each is somebody's site), retry and idempotency (a repeated write must not create two forecasts), clock synchronisation (your timestamps must match the site's), and version compatibility (the contract must survive a model upgrade). Part two is alerting, which is fundamentally an ROC problem: loose thresholds produce false alarms and operators start ignoring them within a fortnight; tight thresholds produce misses and the model is effectively absent when it matters. This book treats alert fatigue as a quantity to manage rather than an attitude: define how many alerts per shift are acceptable (two to five, empirically), derive the permitted false-alarm rate, then read the threshold off the ROC curve — a far sounder order than picking three sigma and seeing what happens. One practical device: tiered alerts, separating notice, warning and act-now, pushing only the top tier to a person and leaving the rest on a dashboard. Part three is trust. Operators do not trust a black box, and trust is built on three concrete things. It must be **explainable** — every forecast carries its main drivers (high today because it is 34 degrees and line B is at full rate), for which SHAP values or tree feature contributions are enough. It must be **comparable** — the screen always shows the model, the naive baseline and the actual together, letting people see the value for themselves. And it must be **traceable** — when something goes wrong, every input to that forecast can be retrieved. One last recommendation: for the first month let the model advise rather than control, and let people see enough of its mistakes for trust to form.",
    },
    objectives: [
      { zh: "设计一个幂等、可重试、版本兼容的写回接口", en: "Design an idempotent, retryable, version-stable write-back interface" },
      { zh: "从每班可接受告警数反推阈值", en: "Derive alert thresholds from acceptable alerts per shift" },
      { zh: "用分级告警把推送量控制在人能承受的范围", en: "Keep pushed volume within human tolerance using tiered alerts" },
      { zh: "用可解释、可对照、可追溯三件事建立信任", en: "Build trust through explainability, comparison and traceability" },
    ],
    outline: [
      { zh: "写回接口:协议、幂等、时钟、契约", en: "Write-back: protocol, idempotency, clocks, contract" },
      { zh: "告警是一个 ROC 问题", en: "Alerting is an ROC problem" },
      { zh: "告警疲劳:每班几条才算合理", en: "Alert fatigue: how many per shift is reasonable" },
      { zh: "信任三件事与第一个月的建议模式", en: "Three foundations of trust and the advisory first month" },
    ],
  },

  /* ============ M9 · CS 案例研究 ============ */
  {
    id: "t29", code: "CS1", moduleId: "m9", difficulty: 3, hours: 7, prereq: ["t2", "t24"], viz: "caseLab",
    props: ["需量计费", "峰值时刻命中率", "削峰策略", "电费节省", "误判损失"],
    title: { zh: "案例一:一座注塑厂的日前负荷预测与需量控制", en: "Case One: Day-Ahead Load Forecasting and Demand Control at an Injection-Moulding Plant" },
    summary: {
      zh: "把前面二十八章的所有参数放回一个能算出钱的场景。案例工厂:32 台注塑机、两台空压机、一套中央冷却,变压器容量 2000 kVA,执行两部制电价,基本电费按最大需量计,需量按 15 分钟滑动窗口取月内最大值,每千瓦 42 元。这意味着一个月里只有一个十五分钟窗口在计费——其余 2879 个窗口预测得再准,也不产生一分钱的基本电费节省。这个事实彻底改变了建模目标:MAPE 不是你的指标,「月最大需量估计偏差」和「峰值时刻命中率」才是。案例把整条链走完:数据取自厂内电表 15 分钟表码(注意是区间均值,正好符合计费口径)、加上排产计划和气温预报;基线是「上周同刻中位数」,月需量估计偏差 6.8%;模型是带排产特征的 LightGBM 加上一个 P90 分位数模型,偏差降到 2.4%。然后是控制策略:当日前预测显示某个窗口可能触及需量目标时,提前把两台空压机的加载时间错开、把一批非急单的注塑机启动推迟 20 分钟——削掉 90 千瓦,一个月省 3780 元;但如果预测错了(实际没有峰而你削了),代价是那批订单延后,案例按每次误判 800 元计。时序台把这些全部开放:你可以调预测精度、削峰阈值、误判成本,看年度净收益怎么变。最重要的那个结论会自己出现:把 MAPE 从 6% 优化到 4%(很难)带来的收益,远小于把峰值时刻命中率从 70% 提到 85%(相对容易),因为计费只看那一个窗口。",
      en: "Every parameter from the preceding twenty-eight chapters, put back into a scenario that produces money. The plant: thirty-two injection-moulding machines, two air compressors, a central chiller, a 2000 kVA transformer, on a two-part tariff whose capacity charge is billed on maximum demand — the largest fifteen-minute sliding window in the month, at forty-two yuan per kilowatt. That means exactly one fifteen-minute window in the month is billable, and accuracy across the other 2,879 windows saves nothing at all on the capacity charge. That fact rewrites the modelling objective: MAPE is not your metric; the deviation of the estimated monthly peak and the peak-timing hit rate are. The case walks the whole chain: data from the plant's fifteen-minute meter registers (interval averages, exactly matching the billing basis), plus the production schedule and a temperature forecast; the baseline is last-week same-slot median, with a 6.8% deviation on estimated monthly demand; the model is a LightGBM with schedule features plus a P90 quantile model, cutting deviation to 2.4%. Then the control strategy: when the day-ahead forecast shows a window approaching the demand target, stagger the two compressors' loading and delay a batch of non-urgent machines by twenty minutes — shaving ninety kilowatts and saving 3,780 yuan a month. But a wrong call (you shaved and no peak came) delays that batch, priced here at 800 yuan per false trigger. The bench exposes all of it: move forecast accuracy, the shaving threshold and the false-trigger cost, and watch annual net benefit respond. The key conclusion surfaces on its own: improving MAPE from 6% to 4% (hard) is worth far less than lifting peak-timing hit rate from 70% to 85% (comparatively easy), because billing only ever looks at that one window.",
    },
    objectives: [
      { zh: "按需量计费规则定义正确的建模目标与指标", en: "Define the right objective and metric from the demand-billing rule" },
      { zh: "把预测精度换算成真实的电费节省", en: "Convert forecast accuracy into real money saved" },
      { zh: "把误判造成的生产损失诚实计入净收益", en: "Count false-trigger production loss honestly in net benefit" },
      { zh: "解释为什么峰值时刻命中率比平均误差更值钱", en: "Explain why peak-timing accuracy outvalues average error" },
    ],
    outline: [
      { zh: "案例工厂与它的电费结构", en: "The plant and its tariff structure" },
      { zh: "一个月只有一个窗口在计费", en: "One billable window a month" },
      { zh: "基线、模型与削峰策略", en: "Baseline, model and the shaving strategy" },
      { zh: "净收益、误判成本与敏感性", en: "Net benefit, false-trigger cost, sensitivity" },
    ],
  },
  {
    id: "t30", code: "CS2", moduleId: "m9", difficulty: 3, hours: 6, prereq: ["t20", "t26"], viz: "planLab",
    props: ["14 天计划", "每日验收点", "并行与关键路径", "资源约束", "延期风险"],
    title: { zh: "案例二:从 Kaggle 跑通到产线上线的十四天", en: "Case Two: Fourteen Days from a Kaggle Notebook to a Line in Production" },
    summary: {
      zh: "最后一章把整本书变成一份可以照着执行的日程。起点是最常见的状态:你手上有一个导出的 CSV、一个 Kaggle 账号、一台没有显卡的笔记本,以及一句「下个月要看到效果」。终点是:模型每天早上七点自动产出次日预测并写回能管平台,运行人员在看板上能同时看到预测、基线和实际。中间十四天这样排:第 1–2 天做数据体检——画曲线、查缺失、对时标、和现场确认那些零到底是什么(这两天最容易被跳过,也最容易毁掉后面十二天);第 3 天建立基线并拿到及格线;第 4–5 天做特征与时间切分的回测框架,把泄漏检查清单跑一遍;第 6–7 天训练第一版 LightGBM 并完成第一次滚动回测,这时候你应该已经有一个能打败基线的模型了;第 8 天做零样本基础模型对照(五分钟,可能直接改变后面的计划);第 9–10 天视情况上 Kaggle 做超参搜索或微调,用的正是第二十章的检查点续训;第 11 天做概率预测与阈值;第 12 天搭推理服务与降级路径;第 13 天接上位系统并做端到端联调;第 14 天影子运行并交付。每天都有一个明确的验收点,不达标就停下来而不是往前推。这一章的时序台是一个带资源约束的计划模型:改变可用人天、是否有 GPU、数据质量评级、以及现场配合度,看这十四天怎么变成二十一天,以及哪一个环节的延期风险最高——答案几乎总是第 1–2 天的数据体检和第 13 天的现场联调,而不是建模本身。",
      en: "The last chapter turns the whole book into a schedule you could follow. The starting state is the common one: an exported CSV, a Kaggle account, a laptop with no GPU, and an instruction to show results next month. The end state: a forecast produced automatically at seven every morning for the following day and written back to the energy platform, with operators seeing forecast, baseline and actual side by side on a dashboard. The fourteen days run like this. Days 1–2, a data health check — plot the curve, find the gaps, align the timestamps, and confirm with the site what those zeros actually are (the two days most often skipped, and the two most capable of ruining the other twelve). Day 3, establish the baseline and obtain your pass mark. Days 4–5, build features and the time-ordered backtest frame, and run the leakage checklist. Days 6–7, train the first LightGBM and complete a first rolling backtest — by now you should have a model that beats the baseline. Day 8, a zero-shot foundation-model comparison (five minutes, and it may change the rest of the plan). Days 9–10, if warranted, take hyperparameter search or fine-tuning to Kaggle using chapter twenty's checkpoint-resume loop. Day 11, quantiles and thresholds. Day 12, the inference service and its degradation paths. Day 13, connect to the plant system and run end-to-end. Day 14, shadow-run and hand over. Every day carries an explicit acceptance criterion, and failing it means stopping rather than pushing on. The bench is a resource-constrained plan model: change available person-days, whether a GPU exists, the data-quality grade and how responsive the site is, and watch fourteen days become twenty-one — and which step carries the highest delay risk. The answer is almost always days 1–2 and day 13, not the modelling.",
    },
    objectives: [
      { zh: "把一个时序项目拆成带验收点的十四天日程", en: "Break a project into fourteen days with acceptance criteria" },
      { zh: "识别关键路径与可并行的环节", en: "Identify the critical path and what can run in parallel" },
      { zh: "评估人力、算力与现场配合三类资源约束", en: "Assess the three constraints: people, compute, site cooperation" },
      { zh: "定位延期风险最高的两个环节并提前处置", en: "Locate the two highest delay risks and handle them early" },
    ],
    outline: [
      { zh: "起点与终点:十四天要跨过什么", en: "Start and end: what the fourteen days must cross" },
      { zh: "逐日安排与每天的验收点", en: "Day by day, with acceptance criteria" },
      { zh: "资源约束:人天、算力、现场", en: "Constraints: person-days, compute, the site" },
      { zh: "风险最高的两天不是建模那两天", en: "The riskiest two days are not the modelling ones" },
    ],
  },
];

// Derived totals used by the home page hero.
const DEMO_COUNT = CHAPTERS.filter((c) => c.viz).length;      // interactive benches
const TOTAL_HOURS = CHAPTERS.reduce((s, c) => s + (c.hours || 0), 0);

window.MODULES = MODULES;
window.CHAPTERS = CHAPTERS;
window.DEMO_COUNT = DEMO_COUNT;
window.TOTAL_HOURS = TOTAL_HOURS;
