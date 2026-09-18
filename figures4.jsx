/* =========================================================
   figures4.jsx — one architecture diagram per module, shown on
   the module overview page (MODULES[i].arch).
   ========================================================= */

function MArch({ idx, title, cap, boxes, arrows, notes, h = 200 }) {
  const L = useL();
  return (
    <FigFrame idx={idx} h={h} cap={cap}>
      <FT x={24} y={20} anchor="start" cls="tk">{title}</FT>
      {(arrows || []).map((a, i) => <FArrow key={`a${i}`} {...a} />)}
      {boxes.map((b, i) => <FBox key={`b${i}`} {...b} />)}
      {(notes || []).map((n, i) => <FT key={`n${i}`} x={n.x} y={n.y} anchor={n.anchor || "start"} cls={n.cls || "tn"}>{n.t}</FT>)}
    </FigFrame>
  );
}

FIGN["m1-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={196} title={L("模块 I:曲线 → 决策 → 指标 → 及格线", "Module I: curve → decision → metric → the bar")}
    cap={L("本模块建立整本书的因果方向:不是「先有模型再找用途」,而是先看清曲线由哪四层组成、这个预测服务的是哪个决策、那个决策的误差代价是不是对称的,由此推出该优化的指标,最后用季节朴素基线划一条谁都必须先跨过的横杆。后面每一个技术选择都会回到这条链上来。", "This module fixes the causal direction for the whole book. Not a model looking for a use, but: see which four layers the curve is made of, name the decision the forecast serves, establish whether that decision's error cost is symmetric, derive the metric to optimise, and finally draw a bar with the seasonal-naive baseline that everything must clear. Every technical choice later returns to this chain.")}
    boxes={[
      { x: 24, y: 48, w: 132, h: 54, label: L("SG1 四层结构", "SG1 four layers"), sub: L("基线/工况/环境/噪声", "base/process/wx/noise"), tone: "p" },
      { x: 196, y: 48, w: 132, h: 54, label: L("SG2 服务哪个决策", "SG2 which decision"), sub: L("申报/需量/调度/告警", "declare/demand/dispatch/alert"), tone: "a" },
      { x: 368, y: 48, w: 132, h: 54, label: L("不对称代价", "asymmetric cost"), sub: "τ = cu/(cu+co)", tone: "warn" },
      { x: 540, y: 48, w: 116, h: 54, label: L("SG3 及格线", "SG3 the bar"), sub: "MASE < 1", tone: "ok" },
    ]}
    arrows={[{ x1: 158, y1: 75, x2: 192, y2: 75 }, { x1: 330, y1: 75, x2: 364, y2: 75 }, { x1: 502, y1: 75, x2: 536, y2: 75 }]}
    notes={[
      { x: 24, y: 134, t: L("预测准一点本身没有价值,有价值的是某个决策变好了", "Being more accurate has no value in itself; a decision improving does"), cls: "ts" },
      { x: 24, y: 156, t: L("由代价表选损失函数,而不是由教程默认的 MSE", "The cost table chooses the loss function, not a tutorial's default MSE") },
      { x: 24, y: 174, t: L("打不过季节朴素的模型不该上线,而且这条基线要在生产里一直跑", "A model that cannot beat seasonal naive should not ship — and the baseline keeps running") },
    ]} />;
};

FIGN["m2-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={208} title={L("模块 II:数据从传感器到训练集的六跳", "Module II: six hops from sensor to training set")}
    cap={L("这个模块沿着数据的整条路走一遍,在每一跳上标出它会怎么变形:量的性质、采样与存储的不一致、历史库压缩、时标与时区、那个含义不明的零,以及最后也最贵的一课——数据泄漏。模型的上限由数据决定,而数据的下限由这条没人看过的链路决定。", "This module walks the whole path and marks how the data deforms at each hop: the nature of the quantity, the mismatch between sampling and storage, historian compression, timestamps and zones, that ambiguous zero — and the last and most expensive lesson, leakage. Data sets the model's ceiling, and an acquisition chain nobody has inspected sets the data's floor.")}
    boxes={[
      { x: 24, y: 46, w: 116, h: 48, label: "DT1", sub: L("采集链路", "the chain"), tone: "p" },
      { x: 180, y: 46, w: 116, h: 48, label: "DT2", sub: L("缺失分类", "classify gaps"), tone: "a" },
      { x: 336, y: 46, w: 116, h: 48, label: "DT3", sub: L("重采样与对齐", "resample, align"), tone: "a" },
      { x: 492, y: 46, w: 164, h: 48, label: "DT4", sub: L("数据泄漏(最贵的一课)", "leakage — the expensive one"), tone: "bad" },
    ]}
    arrows={[{ x1: 142, y1: 70, x2: 176, y2: 70 }, { x1: 298, y1: 70, x2: 332, y2: 70 }, { x1: 454, y1: 70, x2: 488, y2: 70 }]}
    notes={[
      { x: 24, y: 124, t: L("区间均值还是瞬时值?这决定你的标签是不是那个物理量", "An interval mean or an instantaneous value? This decides whether your label is the quantity you think") },
      { x: 24, y: 144, t: L("死区压缩对总电量无损,却把你要的尖峰整段抹掉", "Deadband compression is lossless on totals and deletes exactly the spikes you wanted") },
      { x: 24, y: 164, t: L("填补之前先分类:通信中断 / 计划停机 / 仪表故障 / 真实为零", "Classify before filling: comms dropout / planned shutdown / instrument fault / genuine zero") },
      { x: 24, y: 184, t: L("随机 K 折在时序上等于作弊——报告 5.0%,真实 6.6%", "Shuffled K-fold is cheating on a series — 5.0% reported against 6.6% real") },
    ]} />;
};

FIGN["m3-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={200} title={L("模块 III:让模型看见时间", "Module III: making the model see time")}
    cap={L("树模型对时间一无所知,把时间戳当成一个递增的数字,于是在测试集上外推失败。让它看见时间的唯一办法是把时间结构显式写进特征:滞后、滚动、日历,再加上驱动曲线却不在曲线里的外生变量。而目标怎么定(递归 / 直接多步 / seq2seq)决定了误差在长步长上怎么长。", "A tree model knows nothing about time and treats a timestamp as an increasing number, so it fails to extrapolate. The only way to make it see time is to write temporal structure into the features explicitly — lags, rollings, calendars — plus the exogenous drivers that move the curve without being in it. And how the target is defined (recursive, direct multi-step, seq2seq) decides how error grows at long horizons.")}
    boxes={[
      { x: 24, y: 44, w: 148, h: 52, label: L("FE1 滞后 / 滚动 / 日历", "FE1 lags, rollings, calendar"), sub: L("可用滞后 ≥ 提前量", "lag floor = lead time"), tone: "p" },
      { x: 212, y: 44, w: 148, h: 52, label: L("FE2 外生变量", "FE2 exogenous drivers"), sub: L("增益 × 可获得性", "gain × availability"), tone: "a" },
      { x: 400, y: 44, w: 148, h: 52, label: L("FE3 目标定义", "FE3 target definition"), sub: L("递归 / 直接 / seq2seq", "recursive / direct / seq2seq"), tone: "warn" },
      { x: 576, y: 44, w: 80, h: 52, label: L("模型", "the model"), tone: "ok" },
    ]}
    arrows={[{ x1: 174, y1: 70, x2: 208, y2: 70 }, { x1: 362, y1: 70, x2: 396, y2: 70 }, { x1: 550, y1: 70, x2: 572, y2: 70 }]}
    notes={[
      { x: 24, y: 128, t: L("在这类任务上,一个想清楚的滞后集合比换一个架构值钱得多", "On this task a well-reasoned lag set is worth far more than a new architecture"), cls: "ts" },
      { x: 24, y: 150, t: L("滚动窗口必须右闭开——把当前时刻算进均值就是用答案算特征", "A rolling window must be half-open on the right — including now computes the feature from the answer") },
      { x: 24, y: 170, t: L("误差累积正比于你必须合成的那部分输入,不是「递归天生不行」", "Compounding is proportional to the input you must synthesise, not to recursion as such") },
    ]} />;
};

FIGN["m4-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={204} title={L("模块 IV:先把最便宜的模型用到极限", "Module IV: push the cheapest model to its limit first")}
    cap={L("这个模块的立场很明确:先用最便宜的模型把问题解决到八成,再考虑贵的。统计模型今天很少作为主力上线,但它的残差诊断是检查任何模型的通用体检;梯度提升树在「表格化时序 + 强日历结构 + 中等数据量」上至今没输;分位数回归把点预测升级成决策能用的区间;全局模型让一千条序列共享一个模型,并让新设备借到力。", "This module's position is explicit: solve eighty percent with the cheapest model available before considering an expensive one. Statistical models rarely ship as the primary model today, yet their residual diagnostics are the general check-up for any model. Gradient-boosted trees have not lost on tabularised series with strong calendar structure and moderate data. Quantile regression upgrades a point forecast into an interval a decision can use. A global model lets a thousand series share one fit and lets new equipment borrow strength.")}
    boxes={[
      { x: 24, y: 44, w: 140, h: 52, label: L("ML1 统计基线", "ML1 statistical"), sub: L("残差诊断是通用工具", "residual diagnostics"), tone: "m" },
      { x: 192, y: 44, w: 140, h: 52, label: L("ML2 梯度提升", "ML2 boosting"), sub: L("这个领域的主力", "the workhorse here"), tone: "p" },
      { x: 360, y: 44, w: 140, h: 52, label: L("ML3 分位数", "ML3 quantiles"), sub: "pinball loss", tone: "a" },
      { x: 528, y: 44, w: 128, h: 52, label: L("ML4 全局模型", "ML4 global"), sub: L("冷启动借力", "cold start"), tone: "ok" },
    ]}
    arrows={[{ x1: 166, y1: 70, x2: 188, y2: 70 }, { x1: 334, y1: 70, x2: 356, y2: 70 }, { x1: 502, y1: 70, x2: 524, y2: 70 }]}
    notes={[
      { x: 24, y: 128, t: L("ASHRAE 建筑能耗竞赛前排清一色 LightGBM 集成,不是因为参赛者不会深度学习", "The front of the ASHRAE competition was uniformly LightGBM — not for lack of deep-learning skill"), cls: "ts" },
      { x: 24, y: 150, t: L("早停的验证集必须是时间上靠后的那一段,否则泄漏换了个地方犯", "The early-stopping validation set must be the later window, or the leakage has merely moved") },
      { x: 24, y: 170, t: L("P90 不是安全值,它是有 10% 概率被突破的值", "P90 is not a safe value; it is the value with a ten percent chance of being exceeded") },
    ]} />;
};

FIGN["m5-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={204} title={L("模块 V:深度模型什么时候才划算", "Module V: when a deep model pays off")}
    cap={L("深度模型不是更好的模型,是在特定条件下才划算的模型,而这个模块讲的就是那些条件:数据量撑不撑得起这个参数量、专用架构的收益会不会被方差吃掉、时序基础模型的零样本能不能直接把你的问题解决掉,以及显存这四项加起来到底要多大一张卡——最后这个数字直接决定下一个模块你去哪儿训。", "A deep model is not a better model but one that pays off under specific conditions, and this module is about those conditions: whether your data supports that parameter count, whether a purpose-built architecture's gain survives variance, whether a foundation model's zero-shot output already solves your problem, and how large a card the four memory terms add up to — that last number decides where you train in the next module.")}
    boxes={[
      { x: 24, y: 44, w: 140, h: 52, label: L("DL1 容量 × 数据", "DL1 capacity × data"), sub: L("过拟合是算术", "overfitting is arithmetic"), tone: "warn" },
      { x: 192, y: 44, w: 140, h: 52, label: L("DL2 专用架构", "DL2 architectures"), sub: "PatchTST / DLinear", tone: "a" },
      { x: 360, y: 44, w: 140, h: 52, label: L("DL3 基础模型", "DL3 foundation models"), sub: L("先零样本", "zero-shot first"), tone: "ok" },
      { x: 528, y: 44, w: 128, h: 52, label: L("DL4 训练工程", "DL4 the loop"), sub: L("显存 / 检查点", "VRAM / checkpoints"), tone: "p" },
    ]}
    arrows={[{ x1: 166, y1: 70, x2: 188, y2: 70 }, { x1: 334, y1: 70, x2: 356, y2: 70 }, { x1: 502, y1: 70, x2: 524, y2: 70 }]}
    notes={[
      { x: 24, y: 128, t: L("三万五千个点撑得起几万到几十万参数,不是几百万", "Thirty-five thousand points support tens to hundreds of thousands of parameters, not millions"), cls: "ts" },
      { x: 24, y: 150, t: L("一个诚实调过的线性基线经常已经在那儿等着了", "An honestly tuned linear baseline is frequently already sitting there") },
      { x: 24, y: 170, t: L("微调是全书第一个真正需要 GPU 的动作,请带着显存和小时数进入模块 VI", "Fine-tuning is the first action that truly needs a GPU — bring the VRAM and hours into Module VI") },
    ]} />;
};

FIGN["m6-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={212} title={L("模块 VI:在哪儿训 —— 先量,再选,再算账", "Module VI: where to train — measure, choose, then price it")}
    cap={L("这个模块回答那个最常被问也最常被答错的问题。它被答错的方式通常是:还没量过工作量就先去找 GPU,结果租了一张卡去跑一个笔记本上三分钟能跑完的 LightGBM。所以顺序是固定的:先量(PF1)、再选平台(PF2 Kaggle 实操、PF3 其他路)、最后把整套实验折算成钱和天数(PF4)。绝大多数工业时序任务在 PF1 这一步就结束了。", "This module answers the question asked most often and answered wrong most often. It is usually answered wrong the same way: hunting for a GPU before measuring the workload, then renting a card to run a LightGBM job a laptop finishes in three minutes. The order is fixed: measure (PF1), choose a platform (PF2 for Kaggle in practice, PF3 for the alternatives), then price the whole experiment in money and days (PF4). Most industrial jobs are finished at PF1.")}
    boxes={[
      { x: 24, y: 44, w: 146, h: 54, label: L("PF1 先量一量", "PF1 measure first"), sub: L("要不要 GPU", "do you need a GPU"), tone: "p" },
      { x: 202, y: 30, w: 146, h: 40, label: L("不要 → 用笔记本", "no → your laptop"), tone: "ok" },
      { x: 202, y: 78, w: 146, h: 40, label: L("要 → 显存 + 小时数", "yes → VRAM + hours"), tone: "warn" },
      { x: 380, y: 30, w: 132, h: 40, label: L("PF2 Kaggle", "PF2 Kaggle"), sub: L("配额 / 会话墙 / 续训", "quota, wall, resume"), tone: "a" },
      { x: 380, y: 78, w: 132, h: 40, label: L("PF3 其他路", "PF3 alternatives"), sub: L("租卡 / 国内 / 本地", "rent / domestic / local"), tone: "a" },
      { x: 540, y: 52, w: 116, h: 46, label: L("PF4 预算表", "PF4 the budget"), sub: L("钱 + 天数", "money + days"), tone: "ok" },
    ]}
    arrows={[
      { x1: 172, y1: 58, x2: 198, y2: 50 }, { x1: 172, y1: 84, x2: 198, y2: 98 },
      { x1: 350, y1: 50, x2: 376, y2: 50 }, { x1: 350, y1: 98, x2: 376, y2: 98 },
      { x1: 514, y1: 50, x2: 536, y2: 66 }, { x1: 514, y1: 98, x2: 536, y2: 84 },
    ]}
    notes={[
      { x: 24, y: 142, t: L("一座工厂三年的 15 分钟数据 = 10.5 万行,树模型整套实验 12 秒", "Three years of fifteen-minute data from one plant = 105k rows; the whole tree experiment takes 12 seconds"), cls: "ts" },
      { x: 24, y: 164, t: L("9 小时会话墙不是配额问题,是结构问题:要么加检查点,要么租一张没有墙的卡", "The nine-hour wall is structural, not a quota: add checkpoints, or rent a card without one") },
      { x: 24, y: 184, t: L("数据出境是项目第一天该问的问题,不是上线前一周", "Data residency is a day-one question, not a final-week one") },
    ]} />;
};

FIGN["m7-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={200} title={L("模块 VII:一个错的验证方案能让你白忙三个月", "Module VII: a wrong validation scheme wastes three months")}
    cap={L("模型训完了,你怎么知道它是真的好?这个模块讲实验方法——本书认为它比模型选择更能决定项目成败。滚动原点回测让结论有均值也有方差;指标要由后果来选,因为同一组预测在六个指标下会有三个不同的冠军;超参搜索要防着验证集过拟合,搜得越多,你挑出来那一组里运气的成分越大。", "The model has trained — how do you know it is good? This module is about experimental method, which this book holds to be more decisive than model selection. Rolling-origin backtesting gives a conclusion both a mean and a spread. The metric must be chosen by the consequence, because one set of predictions crowns three different winners under six metrics. And hyperparameter search must guard against validation overfitting: the more you search, the more of your winner's margin is luck.")}
    boxes={[
      { x: 24, y: 46, w: 172, h: 52, label: L("EV1 滚动原点回测", "EV1 rolling origin"), sub: L("均值 + 方差 + gap", "mean, spread, gap"), tone: "p" },
      { x: 236, y: 46, w: 172, h: 52, label: L("EV2 按后果选指标", "EV2 metric by consequence"), sub: L("MAPE 的陷阱", "the MAPE trap"), tone: "a" },
      { x: 448, y: 46, w: 172, h: 52, label: L("EV3 搜索与复现", "EV3 search and reproducibility"), sub: L("验证集过拟合", "validation overfitting"), tone: "warn" },
    ]}
    arrows={[{ x1: 198, y1: 72, x2: 232, y2: 72 }, { x1: 410, y1: 72, x2: 444, y2: 72 }]}
    notes={[
      { x: 24, y: 130, t: L("一次切分给你的是一个随机数;同一个模型在 8 折上能差出 9.7 个点", "A single split hands you a random draw: the same model spans 9.7 points across eight folds"), cls: "ts" },
      { x: 24, y: 152, t: L("比较两个模型时看差值分布,不是只看均值", "Compare two models by the distribution of the difference, not by the mean alone") },
      { x: 24, y: 172, t: L("每次运行记下代码版本、数据版本、种子、参数、结果——五行代码的事", "Log code version, data version, seed, parameters and results on every run — five lines of code") },
    ]} />;
};

FIGN["m8-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={208} title={L("模块 VIII:上线之后,误差每天都要重新赚", "Module VIII: after go-live, accuracy is re-earned daily")}
    cap={L("模型跑出好分数只是项目的一半,另一半是让它在厂里连续活三年。发布时刻由下游决定,而上游数据迟到是常态而不是异常,所以降级路径必须设计而不是发现;漂移多是离散事件引起的台阶,定期重训慢半拍、触发式重训要监控;而告警阈值是一个由人的容忍度反推的 ROC 问题,信任则建立在可解释、可对照、可追溯这三件具体的事上。", "A good score is half the project; the other half is surviving three years in a plant. The publication time is set downstream, and late upstream data is the normal case rather than an exception, so the degradation path must be designed rather than discovered. Drift is usually a step caused by a discrete event: calendar retraining is half a step behind and triggered retraining needs monitoring. The alert threshold is an ROC problem derived from human tolerance, and trust is built on three concrete things — explainability, comparison and traceability.")}
    boxes={[
      { x: 24, y: 46, w: 172, h: 52, label: L("OP1 发布时刻表", "OP1 the schedule"), sub: L("降级路径是设计出来的", "fallbacks are designed"), tone: "p" },
      { x: 236, y: 46, w: 172, h: 52, label: L("OP2 漂移与再训练", "OP2 drift and retraining"), sub: L("定期 + 触发", "calendar + triggered"), tone: "a" },
      { x: 448, y: 46, w: 172, h: 52, label: L("OP3 集成与信任", "OP3 integration and trust"), sub: L("告警是 ROC 问题", "alerting is ROC"), tone: "ok" },
    ]}
    arrows={[{ x1: 198, y1: 72, x2: 232, y2: 72 }, { x1: 410, y1: 72, x2: 444, y2: 72 }]}
    notes={[
      { x: 24, y: 130, t: L("正确答案永远不是抛错:回落到季节朴素基线,并把这次降级记录下来", "The right answer is never to raise an error: fall back to seasonal naive, and record the fallback"), cls: "ts" },
      { x: 24, y: 152, t: L("每次重训的新模型必须先影子对比,不显著更好就不上线", "Every retrained model runs in shadow first and does not ship unless significantly better") },
      { x: 24, y: 172, t: L("上线第一个月让模型只做建议不做控制,让人把它的错误看够", "For the first month let the model advise rather than control, and let people see its mistakes") },
      { x: 24, y: 192, t: L("告警疲劳是一个可以用数字管理的指标,不是一个态度问题", "Alert fatigue is a quantity you manage with numbers, not an attitude problem") },
    ]} />;
};

FIGN["m9-arch"] = function ({ idx }) {
  const L = useL();
  return <MArch idx={idx} h={196} title={L("模块 IX:两个完整案例", "Module IX: two complete cases")}
    cap={L("最后两章把前面二十八章的所有参数放回两个完整场景。第一个是一座注塑厂的需量控制——工业时序里少数几个「预测准一点就能直接换成钱」的场景,而它会逼出一个反直觉的结论:峰值时刻命中率比平均误差值钱得多。第二个是一份可执行的十四天日程,从一个 CSV 和一个 Kaggle 账号到每天早上七点自动出预测,并告诉你延期风险最高的从来不是建模。", "The last two chapters put every parameter from the preceding twenty-eight back into two complete scenarios. The first is demand control at an injection-moulding plant — one of the few industrial settings where a better forecast converts directly into money, and one that forces a counter-intuitive conclusion: peak-timing accuracy is worth far more than average error. The second is an executable fourteen-day schedule, from a CSV and a Kaggle account to an automatic forecast at seven every morning, and it shows that the highest delay risk is never the modelling.")}
    boxes={[
      { x: 24, y: 48, w: 290, h: 56, label: L("CS1 注塑厂需量控制账本", "CS1 an injection plant's demand ledger"), sub: L("一个月只有一个窗口在计费", "one billable window a month"), tone: "p" },
      { x: 346, y: 48, w: 310, h: 56, label: L("CS2 十四天从 Kaggle 到产线", "CS2 fourteen days, Kaggle to the line"), sub: L("每天一个验收点", "one acceptance criterion a day"), tone: "ok" },
    ]}
    notes={[
      { x: 24, y: 136, t: L("把 MAPE 从 6% 优化到 4% 很难,把峰值命中率从 70% 提到 85% 容易得多,后者值钱得多", "Moving MAPE from 6% to 4% is hard; lifting peak-timing from 70% to 85% is easier and worth far more"), cls: "ts" },
      { x: 24, y: 158, t: L("误判的停产损失要诚实计入,否则这本账是假的", "Count the production loss from false triggers honestly, or the ledger is fiction") },
      { x: 24, y: 178, t: L("延期风险最高的两天是数据体检和现场联调,不是建模", "The two riskiest days are the data health check and the plant integration, not the modelling") },
    ]} />;
};
