/* =========================================================
   code2.jsx — listings for t16–t30.
   Extends the CODE object defined in code.jsx.
   ========================================================= */

/* ============ DL2 · t16 — DLinear and patching ============ */
CODE.t16 = {
  note: {
    zh: "DLinear 的核心不到十行,这一栏把它完整写出来:趋势-季节分解 + 两个线性层 + 实例归一化。第二栏是 patch 化,把序列切片当 token,参数量降到三分之一;第三栏是同预算对比脚本——任何新架构上桌之前,先用它跟一个诚实调过的线性基线比一次,很多架构收益小到会被方差吃掉。",
    en: "DLinear's core is under ten lines, and this tab writes it out in full: trend-seasonal decomposition, two linear layers, instance normalisation. The second tab is patching, slicing the series into tokens and cutting parameters to a third. The third is an equal-budget comparison script — run any new architecture against an honestly tuned linear baseline before it gets a seat, because many architectural gains are small enough for variance to eat.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "dlinear.py",
      run: "# python dlinear.py  → DLinear vs 直接线性 vs Patch 线性",
      src: `"""DLinear in full. The whole model is two linear layers and a moving average."""
import torch
import torch.nn as nn


class MovingAvg(nn.Module):
    """The trend component: a centred moving average with edge replication."""
    def __init__(self, kernel=25):
        super().__init__()
        self.kernel = kernel
        self.avg = nn.AvgPool1d(kernel, stride=1, padding=0)

    def forward(self, x):                       # x: (B, L, C)
        pad = (self.kernel - 1) // 2
        front = x[:, :1, :].repeat(1, pad, 1)
        end = x[:, -1:, :].repeat(1, self.kernel - 1 - pad, 1)
        y = torch.cat([front, x, end], dim=1).permute(0, 2, 1)
        return self.avg(y).permute(0, 2, 1)


class DLinear(nn.Module):
    """Decompose, fit one linear map per component, add them back."""
    def __init__(self, lookback, horizon, kernel=25, individual=False, channels=1):
        super().__init__()
        self.decomp = MovingAvg(kernel)
        self.trend = nn.Linear(lookback, horizon)
        self.seasonal = nn.Linear(lookback, horizon)

    def forward(self, x):                       # (B, L, C) -> (B, H, C)
        # Instance normalisation. This is the underrated half of the paper:
        # subtract the window's own mean so the model learns SHAPE, not level.
        mu = x.mean(dim=1, keepdim=True)
        x = x - mu
        trend = self.decomp(x)
        seasonal = x - trend
        out = (self.trend(trend.permute(0, 2, 1))
               + self.seasonal(seasonal.permute(0, 2, 1))).permute(0, 2, 1)
        return out + mu


class PatchLinear(nn.Module):
    """PatchTST's cheap relative: average within patches, then one linear map.
    A patch of 8 cuts the input dimension eightfold for very little accuracy."""
    def __init__(self, lookback, horizon, patch=8):
        super().__init__()
        self.patch = patch
        self.proj = nn.Linear(lookback // patch, horizon)

    def forward(self, x):
        mu = x.mean(dim=1, keepdim=True)
        z = (x - mu).permute(0, 2, 1)
        b, c, l = z.shape
        z = z[:, :, : (l // self.patch) * self.patch]
        z = z.reshape(b, c, -1, self.patch).mean(-1)
        return self.proj(z).permute(0, 2, 1) + mu


if __name__ == "__main__":
    L, H = 96, 96
    x = torch.randn(32, L, 1)
    for name, m in (("DLinear", DLinear(L, H)), ("PatchLinear", PatchLinear(L, H))):
        n = sum(p.numel() for p in m.parameters())
        print(f"{name:<12} out={tuple(m(x).shape)}  params={n:,}")
    print()
    print("Before any of this beats a tuned LightGBM on your data, check the")
    print("equal-budget comparison in the last tab. On one plant it usually")
    print("does not — the architecture is not where the error lives.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "arch.yaml",
      src: `# Equal budget, or the comparison means nothing.
budget:
  wall_clock_minutes: 20        # per candidate, same machine
  seeds: 3                      # report the MEAN across seeds, not the best
  folds: 5                      # rolling origin, from EV1

candidates:
  - name: seasonal_naive
    params: 0
    note: 零参数的对照组,永远留在表里

  - name: lightgbm
    config: lgbm.yaml
    note: 这一类任务上的实际主力

  - name: dlinear
    lookback: 96
    horizon: 96
    kernel: 25
    instance_norm: true         # 关掉它,三个深度模型一起变差

  - name: patch_linear
    lookback: 96
    horizon: 96
    patch: 8
    note: 参数量约为直接线性的三分之一

  - name: patchtst
    lookback: 336
    patch: 16
    stride: 8
    d_model: 128
    n_heads: 8
    layers: 3
    channel_independent: true
    requires_gpu: true

report:
  # a candidate only wins if it beats the incumbent by more than this
  min_improvement_pt: 1.0
  also_report: [params, train_minutes, seed_spread_pt]`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "equal_budget.py",
      run: "# python equal_budget.py  → 同预算下的精度 / 时间 / 方差",
      src: `"""Hold the compute budget fixed and let the conclusion arrive on its own."""
import json
import time
import numpy as np
import pandas as pd


def run_candidate(name, fit_fn, X, y, folds, seeds, budget_s):
    """fit_fn(X_tr, y_tr, X_te, seed) -> predictions. Stops at the budget."""
    scores, t0 = [], time.time()
    for seed in range(seeds):
        for f in range(folds):
            if time.time() - t0 > budget_s:
                break
            cut = int(len(X) * (0.55 + 0.05 * f))
            gap = 96
            p = fit_fn(X[:cut], y[:cut], X[cut + gap:], seed)
            yt = y[cut + gap:]
            scores.append(float(np.abs(yt - p).sum() / np.abs(yt).sum()))
    return {
        "name": name,
        "wape_mean": float(np.mean(scores)),
        "wape_sd": float(np.std(scores)),
        "runs_completed": len(scores),
        "minutes": (time.time() - t0) / 60,
    }


def report(rows):
    df = pd.DataFrame(rows).sort_values("wape_mean")
    best = df.iloc[0]
    df["beats_next_by_pt"] = (df.wape_mean.shift(-1) - df.wape_mean) * 100
    print(df.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
    print()
    margin = (df.wape_mean.iloc[1] - best.wape_mean) * 100
    if margin < best.wape_sd * 100:
        print(f"The winner's margin ({margin:.2f} pt) is smaller than its own")
        print(f"between-fold spread ({best.wape_sd * 100:.2f} pt). On this data")
        print("the architectures are indistinguishable — spend the time on")
        print("features and alignment instead.")
    else:
        print(f"{best['name']} wins by {margin:.2f} pt, larger than the spread.")
    return df


if __name__ == "__main__":
    rows = json.load(open("reports/candidates.json"))
    report(rows).to_csv("reports/equal_budget.csv", index=False)`,
    },
  ],
};

/* ============ DL3 · t17 — foundation models ============ */
CODE.t17 = {
  note: {
    zh: "第一步永远是零样本跑一把:不要钱、不要 GPU、五分钟出结果。Python 用 Chronos 风格的接口做零样本预测并和你的基线比;配置是三条路线的判定表;最后一栏是微调脚本——注意它是全书第一个真正需要 GPU 的动作,而且数据太少时它会把先验拽坏,所以脚本里带了一道「数据够不够」的闸门。",
    en: "Step one is always zero-shot: no money, no GPU, five minutes to a number. The Python runs a zero-shot forecast through a Chronos-style interface and compares it with your baseline. The configuration is the decision table for the three routes. The last tab is the fine-tuning script — the first action in this book that genuinely needs a GPU, and one that drags the prior somewhere worse when data is scarce, so the script carries a gate on whether you have enough.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "zeroshot.py",
      run: "# python zeroshot.py  → 五分钟,一个可比的数字",
      src: `"""Before training anything, spend five minutes finding out if you need to."""
import numpy as np
import pandas as pd
import torch

SLOTS = 96


def load_pipeline(name="amazon/chronos-bolt-small", device=None):
    from chronos import BaseChronosPipeline
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    # the small variants run on CPU. That is the whole point of step one.
    return BaseChronosPipeline.from_pretrained(name, device_map=device,
                                               torch_dtype=torch.float32)


def zero_shot(pipe, y: pd.Series, context: int = 512, horizon: int = SLOTS,
              quantiles=(0.1, 0.5, 0.9)):
    """Context length matters a great deal to these models — 512 and 2048
    give noticeably different answers, so sweep it before concluding."""
    ctx = torch.tensor(y.values[-context:], dtype=torch.float32)
    q, mean = pipe.predict_quantiles(context=ctx, prediction_length=horizon,
                                     quantile_levels=list(quantiles))
    idx = pd.date_range(y.index[-1] + pd.Timedelta("15min"), periods=horizon,
                        freq="15min")
    return pd.DataFrame(q[0].numpy(), index=idx, columns=[f"p{int(t * 100)}" for t in quantiles])


def wape(y, p):
    return float(np.abs(y - p).sum() / np.abs(y).sum())


if __name__ == "__main__":
    y = (pd.read_csv("data/line1.csv", parse_dates=["ts"])
           .set_index("ts").sort_index()["kw"])
    cut = len(y) - SLOTS * 7
    hist, truth = y.iloc[:cut], y.iloc[cut:]

    pipe = load_pipeline()
    for context in (192, 512, 1024, 2048):
        preds = []
        for d in range(7):
            window = y.iloc[: cut + d * SLOTS]
            preds.append(zero_shot(pipe, window, context=context)["p50"])
        p = pd.concat(preds)[: len(truth)]
        print(f"context {context:>5}: zero-shot WAPE {wape(truth.values, p.values):.4f}")

    naive = y.shift(SLOTS).iloc[cut:]
    print(f"seasonal naive baseline : {wape(truth.values, naive.values):.4f}")
    print()
    print("If zero-shot already clears your requirement, the modelling part of")
    print("this project is over. Write it down and go do the operations work.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "routes.yaml",
      src: `# Three routes, in the order you should try them.
route_1_zero_shot:
  models: [chronos-bolt-small, timesfm-1.0-200m, moirai-1.1-small]
  cost: 0
  gpu: false
  minutes: 5
  sweep: {context_length: [192, 512, 1024, 2048]}
  decide: 达到精度要求就收工,不要继续

route_2_tune_the_inputs:
  # before fine-tuning, check these — they are free
  - context_length                # 这类模型对它极其敏感
  - covariate_support             # 有的支持外生变量,有的完全不支持
  - frequency_hint                # 15min 要不要先聚合到 1h
  - normalisation                 # 有的内部做,有的要你自己做

route_3_fine_tune:
  when: zero_shot_shortfall_pt > 1.5 AND history_days >= 90
  gpu_required: true
  vram_gb:
    full: 16
    lora: 6
  # data too thin drags a prior learned from millions of series toward your
  # three days of noise. This is a real failure mode, not a caution.
  min_history_days: 90
  method: lora
  lora_rank: 16
  epochs: 3
  note: 这是全书第一个真正需要 GPU 的动作,请带着显存和小时数去模块 VI`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "finetune.py",
      run: "# python finetune.py --lora  → 需要 GPU;先过数据量闸门",
      src: `"""Fine-tune a time-series foundation model — with a gate on whether to."""
import argparse
import numpy as np
import pandas as pd
import torch

SLOTS = 96
MIN_HISTORY_DAYS = 90
MIN_SHORTFALL_PT = 1.5


def gate(zero_shot_wape, target_wape, history_days):
    """Being able to fine-tune and being right to fine-tune are different."""
    shortfall = (zero_shot_wape - target_wape) * 100
    if shortfall < MIN_SHORTFALL_PT:
        raise SystemExit(f"zero-shot is within {shortfall:.2f} pt of target — "
                         "fine-tuning is not worth a GPU hour")
    if history_days < MIN_HISTORY_DAYS:
        raise SystemExit(f"only {history_days} days of history; fine-tuning on "
                         "this little data drags the prior toward your noise")
    return shortfall


def make_windows(y: pd.Series, context: int, horizon: int, stride: int = 8):
    X, Y = [], []
    v = y.values.astype("float32")
    for i in range(context, len(v) - horizon, stride):
        X.append(v[i - context: i])
        Y.append(v[i: i + horizon])
    return torch.tensor(np.array(X)), torch.tensor(np.array(Y))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lora", action="store_true", help="6 GB instead of 16")
    ap.add_argument("--context", type=int, default=512)
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--resume", default="")
    args = ap.parse_args()

    y = (pd.read_csv("data/line1.csv", parse_dates=["ts"])
           .set_index("ts").sort_index()["kw"])
    days = (y.index[-1] - y.index[0]).days
    gate(zero_shot_wape=0.081, target_wape=0.060, history_days=days)

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    if dev == "cpu":
        print("WARNING: no GPU visible. This will take tens of hours.")
        print("Read PF1 before continuing, then PF2 for how to get one.")

    X, Y = make_windows(y, args.context, SLOTS)
    print(f"{len(X)} training windows, {days} days of history, device={dev}")
    print("checkpoint every epoch to /kaggle/working — see PF2. A run that")
    print("cannot resume is a run that never finishes behind a session wall.")


if __name__ == "__main__":
    main()`,
    },
  ],
};

/* ============ DL4 · t18 — the training loop ============ */
CODE.t18 = {
  note: {
    zh: "把训练循环当成工程对象。Python 是显存估算器,四项分开算,并告诉你哪张卡装得下;配置是训练超参与检查点策略;最后一栏是那个会被本书后面反复用到的循环:每个 epoch 保存权重、优化器状态和 epoch 号,被掐断后从上次继续——在本地是可选项,在有会话墙的平台上是必需品。",
    en: "Treat the training loop as an engineering object. The Python is a memory estimator that separates the four terms and tells you which card fits. The configuration holds the hyperparameters and the checkpoint policy. The last tab is the loop the rest of this book leans on: save weights, optimiser state and the epoch number every epoch and resume after being killed — optional locally, mandatory on any platform with a session wall.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "vram.py",
      run: "# python vram.py --params 200 --batch 32 --seq 1024  → 9.6 GB",
      src: `"""Four terms. Activations are usually the largest, and the only one you
can move without changing the model."""
import argparse

CARDS = [("Kaggle T4", 15), ("Kaggle P100", 16), ("RTX 4090", 24), ("A100 40G", 40)]


def estimate(params_m, batch, seq, hidden, layers, bf16=True, lora=False,
             grad_ckpt=False, optimiser="adam"):
    p = params_m * 1e6
    b = 2 if bf16 else 4
    trainable = p * 0.012 if lora else p

    weights = p * b / 1e9
    grads = trainable * b / 1e9
    opt = trainable * (8 if optimiser == "adam" else 4) / 1e9   # two fp32 moments
    act = batch * seq * hidden * layers * 12 * b / 1e9
    if grad_ckpt:
        act = act * 0.22 + batch * seq * hidden * b / 1e9

    total = weights + grads + opt + act
    return {"weights": weights, "grads": grads, "optimiser": opt,
            "activations": act, "total": total,
            "inference": weights + batch * seq * hidden * b / 1e9}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--params", type=float, default=200, help="millions")
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--seq", type=int, default=1024)
    ap.add_argument("--hidden", type=int, default=768)
    ap.add_argument("--layers", type=int, default=12)
    ap.add_argument("--fp32", action="store_true")
    ap.add_argument("--lora", action="store_true")
    ap.add_argument("--grad-ckpt", action="store_true")
    a = ap.parse_args()

    e = estimate(a.params, a.batch, a.seq, a.hidden, a.layers,
                 bf16=not a.fp32, lora=a.lora, grad_ckpt=a.grad_ckpt)
    for k in ("weights", "grads", "optimiser", "activations"):
        print(f"  {k:<12}: {e[k]:6.2f} GB")
    print(f"  {'TOTAL':<12}: {e['total']:6.2f} GB "
          f"({e['total'] / e['weights']:.1f}x the weights alone)")
    print(f"  {'inference':<12}: {e['inference']:6.2f} GB")
    print()
    for name, gb in CARDS:
        fit = "fits" if e["total"] < gb * 0.92 else "does NOT fit"
        print(f"  {name:<12} {gb:>3} GB : {fit}")
    print()
    print("Activations scale with batch x seq x hidden x layers, which is why")
    print("those two knobs move memory and the model architecture does not.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "train.yaml",
      src: `model:
  params_m: 200
  hidden: 768
  layers: 12

optim:
  optimiser: adamw
  precision: bf16
  batch_size: 32
  sequence_length: 1024
  # doubling the batch calls for roughly sqrt(2)..2x the learning rate
  learning_rate: 3.0e-4
  warmup_steps: 500
  schedule: cosine
  weight_decay: 0.01
  grad_clip: 1.0
  gradient_checkpointing: false   # trades ~25% speed for a large memory cut

early_stopping:
  # the same discipline as ML2: the LATER window, never a random sample
  validation: later_in_time
  patience_epochs: 3
  min_delta_pt: 0.05

checkpoint:
  # optional locally, mandatory anywhere with a session wall (PF2)
  every_epoch: true
  dir: /kaggle/working/ckpt
  keep_last: 2
  save: [model_state, optimizer_state, scheduler_state, epoch, rng_state]

reproducibility:
  seed: 20260918
  deterministic_kernels: true     # slower, but two runs agree
  log_to: runs/experiments.jsonl`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "loop.py",
      run: "# python loop.py --resume /kaggle/input/ckpt-v3/ckpt.pt",
      src: `"""A training loop that survives being killed. This is the whole trick."""
import argparse
import json
import os
import random
import time
import numpy as np
import torch


def set_seed(seed: int, deterministic: bool = True):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    if deterministic:
        torch.use_deterministic_algorithms(True, warn_only=True)
        torch.backends.cudnn.benchmark = False


def save_ckpt(path, model, opt, sched, epoch, best):
    tmp = path + ".tmp"
    torch.save({
        "model": model.state_dict(),
        "opt": opt.state_dict(),
        "sched": sched.state_dict() if sched else None,
        "epoch": epoch,
        "best": best,
        "torch_rng": torch.get_rng_state(),
        "numpy_rng": np.random.get_state(),
    }, tmp)
    os.replace(tmp, path)          # atomic: a half-written checkpoint is worse
    return path                    #         than no checkpoint at all


def load_ckpt(path, model, opt, sched):
    if not path or not os.path.exists(path):
        return 0, float("inf")
    s = torch.load(path, map_location="cpu")
    model.load_state_dict(s["model"])
    opt.load_state_dict(s["opt"])
    if sched and s.get("sched"):
        sched.load_state_dict(s["sched"])
    torch.set_rng_state(s["torch_rng"])
    np.random.set_state(s["numpy_rng"])
    print(f"resumed from epoch {s['epoch']} (best {s['best']:.5f})")
    return s["epoch"], s["best"]


def train(model, opt, sched, loader, val_fn, epochs, ckpt_path, resume="",
          wall_seconds=8.5 * 3600):
    start, best = load_ckpt(resume, model, opt, sched)
    t0 = time.time()
    for epoch in range(start, epochs):
        model.train()
        for xb, yb in loader:
            opt.zero_grad(set_to_none=True)
            loss = torch.nn.functional.l1_loss(model(xb), yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
        if sched:
            sched.step()
        score = val_fn(model)
        best = min(best, score)
        save_ckpt(ckpt_path, model, opt, sched, epoch + 1, best)
        print(json.dumps({"epoch": epoch + 1, "val": score, "best": best}))

        # Stop BEFORE the platform kills you: a checkpoint written at 8h30 is
        # worth more than an epoch that dies at 9h00 with nothing saved.
        if time.time() - t0 > wall_seconds:
            print("approaching the session wall; stopping cleanly")
            print("publish the checkpoint as a dataset version and resume")
            break
    return best


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--resume", default="")
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--ckpt", default="/kaggle/working/ckpt/ckpt.pt")
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.ckpt), exist_ok=True)
    set_seed(20260918)
    print("loop ready; see PF2 for the dataset-version resume cycle")`,
    },
  ],
};

/* ============ PF1 · t19 — do you need a GPU ============ */
CODE.t19 = {
  note: {
    zh: "先量,再决定。Python 是一个工作量估算器:行数、特征数、模型族、超参组合数、折数进去,CPU 小时、GPU 小时和花费出来,并给出「要不要卡」的判断;配置是实验矩阵;最后一栏是真跑一次的基准脚本——不要信估算,在你自己的机器上跑一遍最小样例,把常数量出来。",
    en: "Measure, then decide. The Python is a workload estimator: rows, features, model family, hyperparameter count and folds go in; CPU hours, GPU hours and money come out, with a verdict on whether a card is needed. The configuration is the experiment matrix. The last tab actually benchmarks it — do not trust the estimate, run the smallest real case on your own machine and measure the constant.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "sizeit.py",
      run: "# python sizeit.py --tags 1 --years 3 --family gbm  → 不要 GPU",
      src: `"""Measure the workload before going looking for hardware."""
import argparse

SLOTS = 96
# Throughput constants: feature-values processed per second, measured on this
# machine by bench.py. Replace them with your own numbers, do not trust mine.
FAMILY = {
    "gbm":    dict(cpu=9.0e7, gpu_speedup=1.6, vram=0),
    "linear": dict(cpu=9.0e8, gpu_speedup=1.0, vram=0),
    "tcn":    dict(cpu=1.1e6, gpu_speedup=22.0, vram=3),
    "tsfm":   dict(cpu=1.4e4, gpu_speedup=60.0, vram=14),
}
RENT_CNY_PER_GPU_HOUR = 2.2


def estimate(tags, years, features, family, combos, folds, machine=1.0):
    f = FAMILY[family]
    rows = tags * years * 365 * SLOTS
    work = rows * features
    one_cpu_s = work / (f["cpu"] * machine)
    one_gpu_s = one_cpu_s / f["gpu_speedup"]
    runs = combos * folds
    cpu_h, gpu_h = one_cpu_s * runs / 3600, one_gpu_s * runs / 3600
    needs_gpu = f["vram"] > 0 and (cpu_h > 6 or cpu_h - gpu_h > 4)
    return dict(rows=rows, runs=runs, one_cpu_s=one_cpu_s, cpu_h=cpu_h,
                gpu_h=gpu_h, vram=f["vram"], needs_gpu=needs_gpu,
                cost=gpu_h * RENT_CNY_PER_GPU_HOUR)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tags", type=int, default=1)
    ap.add_argument("--years", type=int, default=3)
    ap.add_argument("--features", type=int, default=50)
    ap.add_argument("--family", default="gbm", choices=list(FAMILY))
    ap.add_argument("--combos", type=int, default=40)
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--machine", type=float, default=1.0)
    a = ap.parse_args()

    e = estimate(a.tags, a.years, a.features, a.family, a.combos, a.folds, a.machine)
    print(f"rows            : {e['rows']:,}")
    print(f"runs            : {e['runs']} ({a.combos} combos x {a.folds} folds)")
    print(f"one run on CPU  : {e['one_cpu_s']:.1f} s")
    print(f"whole plan, CPU : {e['cpu_h']:.2f} h")
    print(f"whole plan, GPU : {e['gpu_h']:.2f} h   (VRAM {e['vram']} GB)")
    print()
    if not e["vram"]:
        print("VERDICT: no GPU. Trees and linear models are bound by memory")
        print("bandwidth, not arithmetic; at this scale the GPU build is often")
        print("SLOWER once you count moving the data onto the card.")
    elif e["needs_gpu"]:
        print(f"VERDICT: yes. Take two numbers to PF2/PF3: {e['vram']} GB of")
        print(f"VRAM and {e['gpu_h']:.1f} GPU-hours, about {e['cost']:.0f} CNY to rent.")
    else:
        print("VERDICT: not worth it. CPU finishes this plan; the hours a card")
        print("would save are less than the time to set one up.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "experiment.yaml",
      src: `# The experiment matrix. You are buying the PRODUCT of these numbers, not
# one training run — the most common budgeting mistake in the whole field.
data:
  tags: 1
  years: 3
  features: 50
  rows: 105120

matrix:
  families: [lightgbm, dlinear, chronos_finetune]
  hyperparameter_sets_per_family: 40
  backtest_folds: 5
  seeds: 1
  total_runs: 600

machine:
  # measured by bench.py on THIS laptop, not copied from a blog post
  cpu_cores: 8
  relative_speed: 1.0
  gpu: none

verdict:
  lightgbm: cpu_is_enough          # 12 s for the whole plan
  dlinear: cpu_is_enough           # minutes
  chronos_finetune: needs_gpu      # 14 GB VRAM, hours

decision:
  # only one of the three families actually needs hardware, so rent by the
  # hour for that one rather than provisioning for the whole matrix
  rent_for: [chronos_finetune]
  estimated_gpu_hours: 26
  estimated_cost_cny: 57`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "bench.py",
      run: "# python bench.py  → 你这台机器的真实常数",
      src: `"""Do not trust an estimate you did not measure. Run the smallest real case."""
import time
import numpy as np
import pandas as pd


def make(rows, features, seed=0):
    rng = np.random.default_rng(seed)
    X = pd.DataFrame(rng.normal(size=(rows, features)),
                     columns=[f"f{i}" for i in range(features)])
    y = X.iloc[:, 0] * 2 + X.iloc[:, 1] + rng.normal(0, 0.3, rows)
    return X, y


def time_gbm(rows, features, n_estimators=400):
    import lightgbm as lgb
    X, y = make(rows, features)
    m = lgb.LGBMRegressor(n_estimators=n_estimators, num_leaves=63, verbose=-1)
    t = time.time()
    m.fit(X, y)
    return time.time() - t


def time_torch(rows, features, hidden=128, epochs=3):
    import torch
    import torch.nn as nn
    X, y = make(rows, features)
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    xb = torch.tensor(X.values, dtype=torch.float32, device=dev)
    yb = torch.tensor(y.values, dtype=torch.float32, device=dev).unsqueeze(1)
    net = nn.Sequential(nn.Linear(features, hidden), nn.ReLU(),
                        nn.Linear(hidden, 1)).to(dev)
    opt = torch.optim.Adam(net.parameters(), 1e-3)
    t = time.time()
    for _ in range(epochs):
        for i in range(0, len(xb), 512):
            opt.zero_grad()
            nn.functional.mse_loss(net(xb[i:i + 512]), yb[i:i + 512]).backward()
            opt.step()
    return time.time() - t, dev


if __name__ == "__main__":
    for rows in (25_000, 100_000, 400_000):
        s = time_gbm(rows, 50)
        print(f"LightGBM {rows:>7,} rows x 50 features, 400 trees : {s:6.2f} s "
              f"-> {rows * 50 / s:.2e} feature-values/s")
    s, dev = time_torch(100_000, 50)
    print(f"MLP      100,000 rows, 3 epochs on {dev:<4}            : {s:6.2f} s")
    print()
    print("Put YOUR numbers into FAMILY in sizeit.py. A blog post's constants")
    print("were measured on somebody else's machine with somebody else's data.")`,
    },
  ],
};

/* ============ PF2 · t20 — Kaggle in practice ============ */
CODE.t20 = {
  note: {
    zh: "本书最实用的一章。第一栏是断点续训的完整循环:检查点写进 /kaggle/working,跑完推成新的数据集版本,下一个会话挂回来接着训——没有它,一次超过 9 小时的训练永远跑不完。第二栏是 kernel-metadata.json(把 Notebook 变成可以用命令行推送和定时跑的东西);第三栏是整套 CLI 流程,包括那条把脱敏数据推上去的命令。",
    en: "The most practical chapter in the book. The first tab is the complete checkpoint-resume cycle: write checkpoints into /kaggle/working, publish them as a new dataset version, mount that version back next session and continue — without it, any run longer than nine hours never finishes. The second is kernel-metadata.json, which turns the notebook into something you can push and schedule from a command line. The third is the whole CLI workflow, including the command that uploads de-identified data.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "kaggle_train.py",
      run: "# 在 Notebook 里:!python kaggle_train.py --hours 8.5",
      src: `"""A training run built to be interrupted. Written for Kaggle, useful anywhere."""
import argparse
import json
import os
import time
import torch

WORK = "/kaggle/working"
CKPT = os.path.join(WORK, "ckpt", "state.pt")


def find_resume():
    """Kaggle mounts every input dataset read-only under /kaggle/input. The
    previous session published its checkpoint as a dataset version, so the
    newest matching file there is where we left off."""
    roots = []
    base = "/kaggle/input"
    if os.path.isdir(base):
        for d in sorted(os.listdir(base)):
            p = os.path.join(base, d, "ckpt", "state.pt")
            if os.path.exists(p):
                roots.append(p)
            p2 = os.path.join(base, d, "state.pt")
            if os.path.exists(p2):
                roots.append(p2)
    return roots[-1] if roots else ""


def save(model, opt, epoch, best):
    os.makedirs(os.path.dirname(CKPT), exist_ok=True)
    tmp = CKPT + ".tmp"
    torch.save({"model": model.state_dict(), "opt": opt.state_dict(),
                "epoch": epoch, "best": best}, tmp)
    os.replace(tmp, CKPT)
    # a tiny manifest so the next session can see what it is resuming from
    json.dump({"epoch": epoch, "best": best, "saved_at": time.time()},
              open(os.path.join(WORK, "ckpt", "manifest.json"), "w"), indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--hours", type=float, default=8.5,
                    help="stop cleanly before the 9-hour wall")
    a = ap.parse_args()

    model, opt = build_model(), None            # your model and optimiser
    opt = torch.optim.AdamW(model.parameters(), 3e-4)

    start, best = 0, float("inf")
    resume = find_resume()
    if resume:
        s = torch.load(resume, map_location="cpu")
        model.load_state_dict(s["model"])
        opt.load_state_dict(s["opt"])
        start, best = s["epoch"], s["best"]
        print(f"RESUMED from {resume} at epoch {start}, best {best:.5f}")
    else:
        print("no checkpoint found — starting from scratch")

    t0, budget = time.time(), a.hours * 3600
    for epoch in range(start, a.epochs):
        train_one_epoch(model, opt)
        score = validate(model)
        best = min(best, score)
        save(model, opt, epoch + 1, best)
        print(json.dumps({"epoch": epoch + 1, "val": score, "best": best}))
        left = budget - (time.time() - t0)
        if left < (time.time() - t0) / (epoch - start + 1):
            print(f"{left / 60:.0f} min left, not enough for another epoch")
            print("stopping cleanly — publish this checkpoint and resume")
            break
    print("DONE" if epoch + 1 >= a.epochs else "PARTIAL")


if __name__ == "__main__":
    main()`,
    },
    {
      lang: "数据与配置 / data", k: "json", file: "kernel-metadata.json",
      src: `{
  "_comment": "Put this beside the notebook and run: kaggle kernels push. That uploads it. Everything about how the run behaves is here rather than in the web UI, which means it is in version control with the code.",

  "id": "yourname/industrial-load-forecast",
  "title": "Industrial load forecast",
  "code_file": "train.ipynb",
  "language": "python",
  "kernel_type": "notebook",

  "is_private": true,
  "enable_gpu": true,
  "enable_tpu": false,
  "enable_internet": true,

  "dataset_sources": [
    "yourname/plant-load-15min",
    "yourname/load-forecast-ckpt"
  ],
  "competition_sources": [],
  "kernel_sources": [],

  "_limits": {
    "gpu_session_hours": 9,
    "cpu_session_hours": 12,
    "weekly_gpu_hours": 30,
    "working_dir_gb": 20,
    "_note": "Only /kaggle/working survives the session. Everything else is gone."
  },

  "_workflow": [
    "1. kaggle datasets version -p ckpt -m 'epoch 12' : publish the checkpoint",
    "2. add that dataset to dataset_sources above",
    "3. kaggle kernels push : the next session resumes from it",
    "4. Save & Run All (commit), then close the browser. Never sit and watch."
  ]
}`,
    },
    {
      lang: "训练与部署 / run", k: "sh", file: "kaggle_cycle.sh",
      run: "$ bash kaggle_cycle.sh 5   # 跑 5 段,每段一个会话",
      src: `#!/usr/bin/env bash
# The whole cycle from a shell. This is what turns a 26-hour job into four
# nine-hour segments instead of a run that never finishes.
set -euo pipefail

SEGMENTS=$1
if [ -z "$SEGMENTS" ]; then SEGMENTS=4; fi
SLUG=yourname/industrial-load-forecast
CKPT_DS=yourname/load-forecast-ckpt

# ---- once: upload the data (de-identified, see the compliance note below)
if [ ! -f data/.uploaded ]; then
  python tools/deidentify.py --in data/line1.csv --out upload/load.csv --scale-out
  cp dataset-metadata.json upload/
  kaggle datasets create -p upload --dir-mode zip
  touch data/.uploaded
fi

for i in $(seq 1 "$SEGMENTS"); do
  echo "=== segment $i of $SEGMENTS"

  # Save & Run All, in the background. An interactive session is reclaimed
  # when idle and holds your quota the whole time you are watching it.
  kaggle kernels push -p .

  # poll until the commit finishes; a GPU segment runs up to 9 hours
  while true; do
    st=$(kaggle kernels status "$SLUG" | tr -d ' ')
    echo "  status: $st"
    case "$st" in
      *complete*) break ;;
      *error*|*cancel*) echo "run failed"; exit 1 ;;
    esac
    sleep 300
  done

  # pull the checkpoint back out of the finished run and publish it as a new
  # dataset version, which the NEXT session will mount read-only as an input
  rm -rf out && kaggle kernels output "$SLUG" -p out
  mkdir -p ckpt && cp out/ckpt/state.pt out/ckpt/manifest.json ckpt/
  python -c "
import json
m = json.load(open('ckpt/manifest.json'))
print('resuming next segment from epoch', m['epoch'], 'best', round(m['best'], 5))"
  kaggle datasets version -p ckpt -m "segment $i"

  if grep -q DONE out/log.txt 2>/dev/null; then
    echo "training finished in $i segments"; break
  fi
done

echo
echo "Compliance note: plant history is usually the customer's asset. The"
echo "deidentify.py step above strips absolute magnitude and the real time"
echo "anchor. If even that is not permitted, PF3 lists the platforms that"
echo "keep the data in country."`,
    },
  ],
};

/* ============ PF3 · t21 — the alternatives ============ */
CODE.t21 = {
  note: {
    zh: "把约束写成代码,平台顺序就自己出来了。Python 是一个按约束过滤 + 打分的选择器,注意它先做「可行性过滤」再排序——一个有 9 小时会话墙的平台对一次 14 小时的训练不是「差一点」,是不可行;配置是平台清单(价格会变,以官网为准);最后一栏是租一台机器之后的标准动作:tmux + rsync + 定时回传,别把结果留在一台随时会被回收的机器上。",
    en: "Write the constraints down as code and the ordering follows. The Python filters by feasibility first and only then scores — a platform with a nine-hour wall is not slightly worse for a fourteen-hour run, it is infeasible. The configuration is the platform list, whose prices move, so check the vendor. The last tab is the standard routine after renting a box: tmux, rsync and a periodic pull, because results should never live only on a machine that can be reclaimed.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "choose_platform.py",
      run: "# python choose_platform.py --hours 26 --longest 14 --stay-in-country",
      src: `"""Constraints first, preferences second."""
import argparse
import yaml


def feasible(p, need):
    """Hard filters. A platform that fails any of these is not a worse option,
    it is not an option."""
    why = []
    if need["stay_in_country"] and not p["domestic"]:
        why.append("data would leave the country")
    if need["longest_run_h"] > p["session_wall_h"]:
        why.append(f"{need['longest_run_h']}h run vs a {p['session_wall_h']}h wall")
    paid = max(0, need["hours_per_month"] - p["free_hours_per_month"])
    cost = paid * p["cny_per_hour"]
    if cost > need["budget_cny"]:
        why.append(f"{cost - need['budget_cny']:.0f} CNY over budget")
    if need["vram_gb"] > p["vram_gb"]:
        why.append(f"needs {need['vram_gb']} GB, card has {p['vram_gb']}")
    return (not why), cost, why


def score(p, cost):
    return (100 - cost / 20 - p["setup_effort"] * 3
            + p["reachability"] * 14 + (8 if p["session_wall_h"] > 100 else 0))


def rank(platforms, need):
    ok, blocked = [], []
    for p in platforms:
        good, cost, why = feasible(p, need)
        row = dict(p, cost=cost, why=why, score=score(p, cost))
        (ok if good else blocked).append(row)
    return sorted(ok, key=lambda r: -r["score"]), blocked


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--hours", type=float, default=26)
    ap.add_argument("--longest", type=float, default=14)
    ap.add_argument("--budget", type=float, default=200)
    ap.add_argument("--vram", type=float, default=14)
    ap.add_argument("--stay-in-country", action="store_true")
    a = ap.parse_args()

    need = dict(hours_per_month=a.hours, longest_run_h=a.longest,
                budget_cny=a.budget, vram_gb=a.vram,
                stay_in_country=a.stay_in_country)
    platforms = yaml.safe_load(open("platforms.yaml"))["platforms"]
    ok, blocked = rank(platforms, need)

    print("feasible, best first:")
    for r in ok[:4]:
        print(f"  {r['name']:<22} {r['cost']:>7.0f} CNY/month  score {r['score']:.0f}")
    print()
    print("ruled out:")
    for r in blocked:
        print(f"  {r['name']:<22} {r['why'][0]}")
    print()
    if a.longest > 9:
        print("Your longest run exceeds every free tier's session wall. Either")
        print("accept checkpoint-and-resume (PF2) or rent a card — the fee is")
        print("simply the price of not being interrupted.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "platforms.yaml",
      src: `# Prices and quotas move quickly. Treat every number here as indicative and
# check the vendor's own page before committing anything.
platforms:
  - name: Kaggle free
    domestic: false
    free_hours_per_month: 120     # 30 h/week
    cny_per_hour: 0
    session_wall_h: 9
    vram_gb: 16
    reachability: 0.7
    setup_effort: 1

  - name: Colab free
    domestic: false
    free_hours_per_month: 50
    cny_per_hour: 0
    session_wall_h: 4             # and it can be reclaimed at any moment
    vram_gb: 16
    reachability: 0.3
    setup_effort: 1

  - name: Domestic hourly rental
    domestic: true
    free_hours_per_month: 0
    cny_per_hour: 1.8
    session_wall_h: 999           # no wall — this is what you are paying for
    vram_gb: 24
    reachability: 0.98
    setup_effort: 2

  - name: Domestic free tier
    domestic: true
    free_hours_per_month: 80
    cny_per_hour: 0
    session_wall_h: 8
    vram_gb: 32
    reachability: 0.95
    setup_effort: 2

  - name: Overseas per-second rental
    domestic: false
    free_hours_per_month: 0
    cny_per_hour: 2.4
    session_wall_h: 999
    vram_gb: 24
    reachability: 0.5
    setup_effort: 2

  - name: Your own GPU
    domestic: true
    free_hours_per_month: 0
    cny_per_hour: 0.55            # amortised card + power
    session_wall_h: 999
    vram_gb: 24
    reachability: 1.0
    setup_effort: 6

  - name: The laptop you have
    domestic: true
    free_hours_per_month: 9999
    cny_per_hour: 0
    session_wall_h: 999
    vram_gb: 0
    reachability: 1.0
    setup_effort: 0`,
    },
    {
      lang: "训练与部署 / run", k: "sh", file: "rented_box.sh",
      run: "$ bash rented_box.sh user@1.2.3.4",
      src: `#!/usr/bin/env bash
# The routine after renting a machine by the hour. The point of every line is
# the same: never leave the only copy of anything on a box that can vanish.
set -euo pipefail

HOST=$1
REMOTE=/root/work

# 1) push code and data. --exclude keeps the 3 GB of parquet off the wire
#    when only the code changed.
rsync -az --delete --exclude data --exclude models ./ "$HOST:$REMOTE/"
rsync -az data/features.parquet "$HOST:$REMOTE/data/"

# 2) run inside tmux. An ssh drop must not kill a fourteen-hour job — this is
#    the single most common way people lose a night of training.
ssh "$HOST" "cd $REMOTE && tmux new-session -d -s train 'python loop.py --epochs 40 2>&1 | tee logs/train.log'"
echo "started in tmux session 'train'"

# 3) pull results back every ten minutes, so an hourly-billed box holds
#    nothing you would mind losing
while ssh "$HOST" "tmux has-session -t train 2>/dev/null"; do
  rsync -az "$HOST:$REMOTE/models/" models/ || true
  rsync -az "$HOST:$REMOTE/logs/" logs/ || true
  tail -n 3 logs/train.log 2>/dev/null || true
  sleep 600
done

rsync -az "$HOST:$REMOTE/models/" models/
rsync -az "$HOST:$REMOTE/logs/" logs/
echo "training finished; artefacts are local"
echo
echo "Now release the box. An idle rented GPU bills exactly the same as a"
echo "busy one, and forgetting it overnight costs more than the run did."`,
    },
  ],
};

/* ============ PF4 · t22 — the experiment budget ============ */
CODE.t22 = {
  note: {
    zh: "把实验矩阵折算成钱和天数。Python 是预算计算器,带三个杠杆:低保真筛选、早停止损、以及并行度(注意钱和时间不是同一个维度);配置是一份可以贴进立项材料的预算表;最后一栏是低保真筛选的实现——先用 10% 数据刷一遍,只把幸存的两成拿去做全量评估,而它敢用的前提是两次排名的相关性,这个脚本会把它算出来。",
    en: "Turn the experiment matrix into money and days. The Python is a budget calculator with three levers: low-fidelity screening, early kill, and parallelism — and note that money and time are different axes. The configuration is a budget table you can paste into an approval document. The last tab implements the screening: a cheap pass over everything, full evaluation for the surviving fifth, and the rank correlation that justifies doing it, computed rather than assumed.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "budget.py",
      run: "# python budget.py  → 140 h / ¥308 / 8.8 天 → 23 h / ¥51 / 1.4 天",
      src: `"""What the plan costs, and what two levers take off it."""
import argparse

PRICE_CNY_PER_GPU_HOUR = 2.2
HOURS_PER_WORKING_DAY = 8


def plan(families, combos, folds, minutes_per_run, parallel,
         screening=False, early_kill=False, screen_fraction=0.10,
         survivor_fraction=0.20):
    runs = families * combos * folds
    base_h = runs * minutes_per_run / 60

    if screening:
        # a cheap pass over everything, then the full pass over the survivors
        hours = base_h * screen_fraction + base_h * survivor_fraction
    else:
        hours = base_h
    if early_kill:
        hours *= 0.55                      # Hyperband-style: kill the trailers

    return {
        "runs": runs,
        "hours": hours,
        "base_hours": base_h,
        "cny": hours * PRICE_CNY_PER_GPU_HOUR,
        "days": hours / parallel / HOURS_PER_WORKING_DAY,
        "base_days": base_h / parallel / HOURS_PER_WORKING_DAY,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--families", type=int, default=3)
    ap.add_argument("--combos", type=int, default=40)
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--minutes", type=float, default=14)
    ap.add_argument("--parallel", type=int, default=2)
    a = ap.parse_args()

    for label, kw in (("no levers", {}),
                      ("screening", dict(screening=True)),
                      ("screening + early kill", dict(screening=True, early_kill=True))):
        p = plan(a.families, a.combos, a.folds, a.minutes, a.parallel, **kw)
        print(f"{label:<24} {p['hours']:7.1f} h  {p['cny']:7.0f} CNY  "
              f"{p['days']:5.1f} days")
    print()
    print("Money scales with hours; days scale with hours DIVIDED by how many")
    print("you can run at once. Doubling the cards halves the calendar and")
    print("changes the bill not at all — those are separate decisions.")
    print()
    print("The third lever costs no compute: get the data and the validation")
    print("right first. In a leaking experiment every hour above is wasted.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "budget.yaml",
      src: `# The table that goes into the approval document. Every number here is
# derived, not guessed — sizeit.py and bench.py produced them.
matrix:
  families: 3
  hyperparameter_sets: 40
  folds: 5
  runs: 600
  minutes_per_run: 14          # measured, not assumed

raw:
  gpu_hours: 140
  cost_cny: 308
  parallel: 2
  wall_clock_days: 8.8

levers:
  low_fidelity_screening:
    fraction_of_data: 0.10
    survivors_kept: 0.20
    # this is what makes screening safe — measured, see screen.py
    rank_correlation_spearman: 0.81
    saves_hours: 98

  early_kill:
    check_at_fraction: 0.33
    kill_if_behind_incumbent_by_pt: 1.5
    saves_hours: 19

  data_first:
    cost: 0
    note: 在一个被泄漏污染的实验里,上面所有小时数都是浪费

after_levers:
  gpu_hours: 23
  cost_cny: 51
  wall_clock_days: 1.4`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "screen.py",
      run: "# python screen.py  → 便宜那一遍留住了多少排序信息",
      src: `"""Low-fidelity screening, and the correlation that justifies it."""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr


def evaluate(config, X, y, fraction=1.0, folds=5):
    """Score one configuration on the most recent slice of the data."""
    import lightgbm as lgb
    cut = int(len(X) * 0.75)
    take = max(200, int(cut * fraction))
    m = lgb.LGBMRegressor(verbose=-1, **config)
    m.fit(X[cut - take: cut], y[cut - take: cut])
    p = m.predict(X[cut:])
    return float(np.abs(y[cut:] - p).sum() / np.abs(y[cut:]).sum())


def screen(configs, X, y, fraction=0.10, keep=0.20):
    cheap = [evaluate(c, X, y, fraction=fraction) for c in configs]
    order = np.argsort(cheap)
    n_keep = max(2, int(len(configs) * keep))
    survivors = [configs[i] for i in order[:n_keep]]
    return cheap, survivors, order[:n_keep]


def justify(configs, X, y, cheap, fraction=0.10):
    """Screening is only safe if the cheap ranking agrees with the full one.
    Run this ONCE on a subset of configurations and record the number."""
    full = [evaluate(c, X, y, fraction=1.0) for c in configs]
    rho = spearmanr(cheap, full).statistic
    best_all = min(full)
    n_keep = max(2, int(len(configs) * 0.20))
    kept = np.argsort(cheap)[:n_keep]
    best_kept = min(full[i] for i in kept)
    return rho, (best_kept - best_all) * 100


if __name__ == "__main__":
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    grid = [dict(learning_rate=lr, num_leaves=nl, min_child_samples=mc,
                 n_estimators=400)
            for lr in (0.02, 0.05, 0.1) for nl in (31, 63, 127)
            for mc in (10, 40, 100)]
    cheap, survivors, idx = screen(grid, X, y)
    rho, regret = justify(grid, X, y, cheap)
    print(f"configurations   : {len(grid)}")
    print(f"survivors kept   : {len(survivors)}")
    print(f"rank correlation : {rho:.3f}  (10% of the data vs all of it)")
    print(f"regret of screening: {regret:.3f} pt behind the full search")
    print()
    print("Ten percent of the cost kept most of the ordering. If your rho comes")
    print("out below about 0.6, screening is not safe on your data — the cheap")
    print("pass is measuring something else.")`,
    },
  ],
};

/* ============ EV1 · t23 — rolling-origin backtesting ============ */
CODE.t23 = {
  note: {
    zh: "时序上唯一诚实的交叉验证。Python 是一个带 gap 的滚动原点回测器,返回的不是一个数而是一条分布;配置固定折数、步长与训练窗形态;最后一栏是模型比较的正确姿势——看差值在各折上的分布,如果 A 平均比 B 好但在三分之一的折上更差,那么「A 更好」还不是一个能拿去做决策的结论。",
    en: "The only honest cross-validation on a series. The Python is a rolling-origin backtester with a gap that returns a distribution rather than a number. The configuration pins the folds, the step and the window shape. The last tab is the right way to compare models — read the distribution of the difference across folds, because if A beats B on average while losing on a third of them, 'A is better' is not yet a conclusion you can act on.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "backtest.py",
      run: "# python backtest.py  → 8 折的均值、标准差与跨度",
      src: `"""Rolling origin: train, gap, evaluate, advance. Repeat, then read the spread."""
import numpy as np
import pandas as pd

SLOTS = 96


def folds(index, n_folds=8, gap=SLOTS, eval_days=3, first_origin=0.45,
          expanding=True, fixed_days=35):
    """Yield (train_slice, eval_slice) pairs. The gap must equal the lead time
    or the samples at the boundary still carry DT4's leakage."""
    n = len(index)
    eval_len = eval_days * SLOTS
    start = int(n * first_origin)
    step = max(1, (n - start - eval_len) // n_folds)
    for f in range(n_folds):
        origin = start + f * step
        train_from = 0 if expanding else max(0, origin - fixed_days * SLOTS)
        train_to = origin - gap
        if train_to - train_from < SLOTS * 14:
            continue
        yield slice(train_from, train_to), slice(origin, min(n, origin + eval_len))


def run(fit_predict, X, y, **kw):
    rows = []
    for i, (tr, ev) in enumerate(folds(X.index, **kw)):
        p = fit_predict(X[tr], y[tr], X[ev])
        yt = y[ev]
        rows.append({
            "fold": i + 1,
            "train_rows": tr.stop - tr.start,
            "from": X.index[ev.start],
            "wape": float(np.abs(yt - p).sum() / np.abs(yt).sum()),
        })
    return pd.DataFrame(rows)


def summarise(df, name="model"):
    return {
        "name": name,
        "mean": float(df.wape.mean()),
        "sd": float(df.wape.std()),
        "best": float(df.wape.min()),
        "worst": float(df.wape.max()),
        "spread_pt": float((df.wape.max() - df.wape.min()) * 100),
        "folds": len(df),
    }


if __name__ == "__main__":
    import lightgbm as lgb
    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")

    def fit_predict(Xtr, ytr, Xev):
        m = lgb.LGBMRegressor(objective="l1", n_estimators=600,
                              learning_rate=0.04, num_leaves=63, verbose=-1)
        m.fit(Xtr, ytr)
        return m.predict(Xev)

    df = run(fit_predict, X, y)
    print(df.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
    s = summarise(df)
    print()
    print(f"mean {s['mean']:.4f} +/- {s['sd']:.4f}, "
          f"best {s['best']:.4f}, worst {s['worst']:.4f}")
    print(f"spread across folds: {s['spread_pt']:.1f} points")
    print()
    print("A single split would have handed you one draw from that range —")
    print("and people reliably report the flattering one.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "backtest.yaml",
      src: `backtest:
  n_folds: 8
  first_origin_fraction: 0.45
  step: auto                  # derived so the folds tile the remainder
  eval_window_days: 3
  gap_slots: 96               # MUST equal horizon_slots — see DT4

  window: expanding           # or fixed
  fixed_days: 35
  # A line with a real process change prefers a FIXED window: old data from
  # before the change actively drags. With no change, expanding wins.
  choose_fixed_if: process_change_detected

reporting:
  # never a single number
  report: [mean, sd, best, worst, spread_pt, per_fold]
  # a model only wins if the margin exceeds the between-fold spread
  significance_rule: mean_diff > sd_of_diff
  min_folds_for_a_claim: 5

common_mistakes:
  - 一次切分就下结论(你拿到的是一个随机数)
  - gap 小于预测提前量(边界样本仍然泄漏)
  - 折数太少(均值本身方差很大)
  - 评估窗太短(一两个异常日就主导了指标)`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "compare.py",
      run: "# python compare.py A.parquet B.parquet  → A 真的比 B 好吗",
      src: `"""Comparing two models means comparing a DISTRIBUTION of differences."""
import sys
import numpy as np
import pandas as pd


def paired_compare(a: pd.DataFrame, b: pd.DataFrame, name_a="A", name_b="B"):
    """a and b must be per-fold results from the SAME folds."""
    m = a.merge(b, on="fold", suffixes=("_a", "_b"))
    d = m.wape_b - m.wape_a                      # positive = A is better
    wins = int((d > 0).sum())
    mean, sd = float(d.mean()), float(d.std())
    # paired t on the fold differences; with 8 folds this is indicative, not
    # a proof — which is exactly why the win count is printed beside it
    t = mean / (sd / np.sqrt(len(d))) if sd > 0 else float("inf")
    return {
        "folds": len(d),
        "wins_for_a": wins,
        "mean_diff_pt": mean * 100,
        "sd_diff_pt": sd * 100,
        "t": t,
        "solid": wins >= len(d) * 0.75 and abs(mean) > sd * 0.7,
    }


if __name__ == "__main__":
    a = pd.read_parquet(sys.argv[1])
    b = pd.read_parquet(sys.argv[2])
    r = paired_compare(a, b)
    print(f"folds              : {r['folds']}")
    print(f"A beat B on        : {r['wins_for_a']} folds")
    print(f"mean difference    : {r['mean_diff_pt']:+.2f} pt")
    print(f"between-fold sd    : {r['sd_diff_pt']:.2f} pt")
    print(f"paired t           : {r['t']:.2f}")
    print()
    if r["solid"]:
        print("The direction is stable across folds. This conclusion holds.")
    else:
        print("The difference flips between folds. 'A is better' is not yet a")
        print("conclusion — do not ship on it, and do not put it in a report.")
        print("Either gather more folds or accept that the two are equivalent.")`,
    },
  ],
};

/* ============ EV2 · t24 — metrics ============ */
CODE.t24 = {
  note: {
    zh: "指标不是口味问题,是由后果决定的。Python 实现七个指标,包括两个按后果计价的自定义指标——月最大需量偏差和峰值时刻命中率;配置把「哪个决策 → 哪个指标」绑定;最后一栏把同一组预测在所有指标下排名一遍,让排名矛盾摆在你面前:按 MAPE 选模型,你会选中最不该拿去做需量控制的那一个。",
    en: "The metric is not a matter of taste; the consequence decides it. The Python implements seven metrics including two priced by consequence — monthly peak deviation and peak-timing hit rate. The configuration binds each decision to its metric. The last tab ranks one set of predictions under every metric and puts the contradiction in front of you: choose by MAPE and you pick the model least suited to demand control.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "metrics.py",
      run: "# python metrics.py  → 七个指标,三个不同的冠军",
      src: `"""Seven metrics. Two of them are priced by what the forecast is FOR."""
import numpy as np
import pandas as pd

SLOTS = 96


def mae(y, p):
    return float(np.mean(np.abs(y - p)))


def rmse(y, p):
    return float(np.sqrt(np.mean((y - p) ** 2)))


def mape(y, p, floor=1e-9):
    m = np.abs(y) > floor
    return float(np.mean(np.abs((y[m] - p[m]) / y[m])))


def wape(y, p):
    """Total in the denominator, so a zero-load hour cannot blow it up."""
    return float(np.abs(y - p).sum() / np.abs(y).sum())


def mase(y, p, season=SLOTS):
    """Carries its own pass mark: below 1 or the model is not worth running."""
    naive = np.abs(y[season:] - y[:-season]).mean()
    return float(np.mean(np.abs(y - p)) / naive)


def pinball(y, p, tau):
    d = y - p
    return float(np.mean(np.where(d >= 0, tau * d, (tau - 1) * d)))


def monthly_peak_deviation(y, p, index):
    """The only thing demand billing looks at: the largest window of the month."""
    df = pd.DataFrame({"y": y, "p": p}, index=index)
    g = df.groupby(df.index.to_period("M"))
    return float((g.p.max() - g.y.max()).abs().div(g.y.max()).mean())


def peak_timing_hit_rate(y, p, index, tol_slots=2):
    """Did we put the daily peak in the right place? Within two quarter-hours."""
    df = pd.DataFrame({"y": y, "p": p}, index=index)
    hits = []
    for _, d in df.groupby(df.index.date):
        if len(d) < SLOTS // 2:
            continue
        hits.append(abs(int(np.argmax(d.y.values)) - int(np.argmax(d.p.values)))
                    <= tol_slots)
    return float(np.mean(hits)) if hits else float("nan")


def all_metrics(y, p, index, tau=0.9):
    return {
        "mae": mae(y, p), "rmse": rmse(y, p), "mape": mape(y, p),
        "wape": wape(y, p), "mase": mase(y, p),
        "pinball90": pinball(y, p, tau),
        "peak_dev": monthly_peak_deviation(y, p, index),
        "peak_hit": -peak_timing_hit_rate(y, p, index),   # negate: lower is better
    }


if __name__ == "__main__":
    bt = pd.read_parquet("reports/backtest.parquet")
    rows = {}
    for name in ("model_a", "model_b", "model_c"):
        rows[name] = all_metrics(bt.y_true.values, bt[name].values, bt.index)
    table = pd.DataFrame(rows).T
    print(table.to_string(float_format=lambda v: f"{v:.4f}"))
    print()
    for m in table.columns:
        print(f"  by {m:<10} the winner is {table[m].idxmin()}")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "metrics.yaml",
      src: `# Decision -> metric. Fill this in before training, not after.
bindings:
  demand_control:
    primary: peak_dev            # 月最大需量估计偏差
    secondary: peak_hit          # 峰值时刻命中率
    ignore: [mape]               # 计费根本不看平均误差
    note: 一个月 2880 个窗口只有一个在计费

  day_ahead_declaration:
    primary: wape
    secondary: pinball
    note: 整条曲线都要,但代价不对称,所以同时看 pinball

  storage_dispatch:
    primary: dispatch_revenue_gap  # 按真实电价折算的调度收益差
    secondary: wape
    note: 误差在时间轴上的分布比幅度更重要

  anomaly_alert:
    primary: miss_rate_at_fixed_false_alarm_rate
    note: 这根本不是回归问题,是检测问题

traps:
  mape:
    - 分母趋近于零时单点误差可以冲到几百,一个停机时段毁掉整月指标
    - 对低估的惩罚天然大于高估,选出来的模型会系统性偏高
    - 工业场景默认用 WAPE
  rmse:
    - 对大误差惩罚重,适合怕极端偏差的场景,但会被单个坏点主导
  mase:
    - 唯一自带及格线的指标:小于 1 才有价值`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "rank_table.py",
      run: "# python rank_table.py  → 排名矛盾一目了然",
      src: `"""Rank the same predictions under every metric and show the contradiction."""
import pandas as pd
from metrics import all_metrics


def rank_table(bt: pd.DataFrame, models):
    scores = {m: all_metrics(bt.y_true.values, bt[m].values, bt.index)
              for m in models}
    df = pd.DataFrame(scores).T
    ranks = df.rank(axis=0)                       # 1 = best, lower is better
    return df, ranks


if __name__ == "__main__":
    bt = pd.read_parquet("reports/backtest.parquet")
    models = ["model_a", "model_b", "model_c"]
    df, ranks = rank_table(bt, models)

    print("scores:")
    print(df.to_string(float_format=lambda v: f"{v:.4f}"))
    print()
    print("ranks (1 = best):")
    print(ranks.to_string(float_format=lambda v: f"{v:.0f}"))
    print()
    winners = {c: df[c].idxmin() for c in df.columns}
    distinct = len(set(winners.values()))
    print(f"{len(df.columns)} metrics crown {distinct} different winners:")
    for metric, who in winners.items():
        print(f"  {metric:<11} -> {who}")
    print()
    if distinct > 1:
        print("This is not a defect in the metrics. It is a reminder of the")
        print("ordering: fix the consequence first (SG2), let the consequence")
        print("choose the metric, and only then let the metric choose a model.")
        print("Reverse it and you spend three months optimising a number")
        print("nobody downstream ever looks at.")`,
    },
  ],
};

/* ============ EV3 · t25 — search and reproducibility ============ */
CODE.t25 = {
  note: {
    zh: "两件事:怎么搜,和怎么不被自己的验证集骗。Python 用 Optuna 做搜索,但目标函数是滚动多折的均值而不是单折——这是压住验证集过拟合最便宜的办法;配置是搜索空间与预算;最后一栏是五行代码的实验记录:代码版本、数据版本、种子、参数、结果各记一行 JSON,它是「能复现的实验」和「一堆再也复现不出来的好成绩」之间的分水岭。",
    en: "Two things: how to search, and how not to be fooled by your own validation set. The Python searches with Optuna, but its objective is the mean across rolling folds rather than a single one — the cheapest way to hold validation overfitting down. The configuration is the search space and the budget. The last tab is the five-line experiment log: code version, data version, seed, parameters and results as one JSON line, which is the difference between experiments you can reproduce and a pile of scores you will never see again.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "search.py",
      run: "# python search.py --trials 60  → 多折均值选出来的配置",
      src: `"""Random search beats grid; the objective matters more than either."""
import argparse
import numpy as np
import optuna
import pandas as pd
import lightgbm as lgb
from backtest import folds

optuna.logging.set_verbosity(optuna.logging.WARNING)


def objective_factory(X, y, n_folds=4):
    def objective(trial):
        params = dict(
            learning_rate=trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            num_leaves=trial.suggest_int("num_leaves", 15, 255, log=True),
            min_child_samples=trial.suggest_int("min_child_samples", 5, 200, log=True),
            feature_fraction=trial.suggest_float("feature_fraction", 0.5, 1.0),
            lambda_l2=trial.suggest_float("lambda_l2", 1e-3, 30.0, log=True),
            n_estimators=800, objective="l1", verbose=-1,
        )
        scores = []
        # The objective is the MEAN ACROSS FOLDS. A single fold is cheaper and
        # it is exactly what a long search learns to exploit.
        for tr, ev in folds(X.index, n_folds=n_folds):
            m = lgb.LGBMRegressor(**params)
            m.fit(X[tr], y[tr])
            p = m.predict(X[ev])
            scores.append(np.abs(y[ev] - p).sum() / np.abs(y[ev]).sum())
            trial.report(float(np.mean(scores)), len(scores))
            if trial.should_prune():           # early kill, from PF4
                raise optuna.TrialPruned()
        return float(np.mean(scores))
    return objective


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=60)
    ap.add_argument("--seed", type=int, default=20260918)
    a = ap.parse_args()

    X = pd.read_parquet("data/features.parquet")
    y = X.pop("kw")
    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=a.seed, n_startup_trials=12),
        pruner=optuna.pruners.MedianPruner(n_startup_trials=8, n_warmup_steps=2),
    )
    study.optimize(objective_factory(X, y), n_trials=a.trials)

    print(f"best value (4-fold mean): {study.best_value:.4f}")
    for k, v in study.best_params.items():
        print(f"  {k:<20}: {v}")
    print()
    # Take the average of the near-optimal region rather than the single point:
    # the single best trial owes part of its margin to luck.
    top = sorted(study.trials, key=lambda t: t.value or 9)[:5]
    print("top-5 mean of each parameter (use this, not the single best):")
    for k in study.best_params:
        vals = [t.params[k] for t in top if k in t.params]
        if all(isinstance(v, (int, float)) for v in vals):
            print(f"  {k:<20}: {np.mean(vals):.4g}")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "search_space.yaml",
      src: `space:
  learning_rate:     {type: float, low: 0.01, high: 0.2, log: true}
  num_leaves:        {type: int, low: 15, high: 255, log: true}
  min_child_samples: {type: int, low: 5, high: 200, log: true}
  feature_fraction:  {type: float, low: 0.5, high: 1.0}
  lambda_l2:         {type: float, low: 0.001, high: 30, log: true}

budget:
  trials: 60
  sampler: tpe                # random is fine below ~30 trials and simpler
  n_startup_trials: 12        # TPE needs samples before it can aim
  pruner: median              # the early-kill lever from PF4

objective:
  # the single most effective guard against validation overfitting
  folds: 4
  aggregate: mean
  # and a segment that takes part in NO selection, ever
  final_test_holdout_days: 21

selection:
  # do not take the single best point — average the near-optimal region
  use: top_k_mean
  k: 5

reproducibility:
  seed: 20260918
  log_file: runs/experiments.jsonl
  record: [git_sha, data_sha, seed, params, metrics, wall_seconds]`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "experiment_log.py",
      run: "# python experiment_log.py  → 一行 JSON,三个月后还能复现",
      src: `"""Five lines of logging, and the difference between science and folklore."""
import hashlib
import json
import platform
import subprocess
import time
from pathlib import Path

LOG = Path("runs/experiments.jsonl")


def git_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                       text=True).strip()
    except Exception:
        return "nogit"


def file_sha(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while blk := f.read(chunk):
            h.update(blk)
    return h.hexdigest()[:12]


def record(name, params, metrics, data_path, seed, wall_seconds):
    LOG.parent.mkdir(exist_ok=True)
    row = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "name": name,
        "git_sha": git_sha(),
        "data_sha": file_sha(data_path),
        "seed": seed,
        "params": params,
        "metrics": metrics,
        "wall_seconds": round(wall_seconds, 1),
        "python": platform.python_version(),
    }
    with LOG.open("a", encoding="utf-8") as f:
        print(json.dumps(row, ensure_ascii=False), file=f)
    return row


def load():
    import pandas as pd
    rows = [json.loads(l) for l in LOG.read_text(encoding="utf-8").splitlines()]
    return pd.json_normalize(rows)


if __name__ == "__main__":
    record("lgbm-tuned",
           params={"learning_rate": 0.043, "num_leaves": 78},
           metrics={"wape_mean": 0.0612, "wape_sd": 0.0071, "folds": 8},
           data_path="data/features.parquet", seed=20260918, wall_seconds=412.3)
    df = load()
    print(df.tail(5).to_string(index=False))
    print()
    print("No experiment platform required. What matters is that three months")
    print("from now you can answer: which code, which data, which seed — and")
    print("get the same number back.")`,
    },
  ],
};

/* ============ OP1 · t26 — the publication schedule ============ */
CODE.t26 = {
  note: {
    zh: "发布时刻不是你定的,是下游那个会定的。Python 是一个带降级路径的推理服务:上游数据不全时用最近可用值加标记,模型超时回落到季节朴素基线,整条链失败就发上一次的预测并打上过期标签——正确答案永远不是抛错;配置是时刻表与超时预算;最后一栏是调度与留档,每一次预测连同输入特征、模型版本、生成时刻一起存下来。",
    en: "The publication time is not yours; it belongs to the meeting downstream. The Python is an inference service with its degradation paths built in: incomplete upstream data falls back to the last available value plus a flag, a model timeout falls back to the seasonal-naive baseline, and total failure republishes the previous forecast marked stale — the right answer is never to raise an error. The configuration is the schedule and the timeout budget. The last tab is the scheduler and the archive, storing every forecast with its inputs, model version and generation time.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "serve.py",
      run: "# uvicorn serve:app --port 8080",
      src: `"""An inference service whose failure modes are designed, not discovered."""
import time
import numpy as np
import pandas as pd
from fastapi import FastAPI

SLOTS = 96
FEATURE_TIMEOUT_S, MODEL_TIMEOUT_S = 900, 240
app = FastAPI()


class Forecast:
    def __init__(self, values, source, model_version, degraded=False, reason=""):
        self.values, self.source = values, source
        self.model_version, self.degraded, self.reason = model_version, degraded, reason

    def to_dict(self):
        return {"values": [round(float(v), 1) for v in self.values],
                "source": self.source, "model_version": self.model_version,
                "degraded": self.degraded, "reason": self.reason}


def seasonal_naive(history: pd.Series, horizon: int = SLOTS):
    """The fallback. Worse than the model and far better than nothing."""
    same_slot = [history.shift(SLOTS * k) for k in (1, 2, 3, 4)]
    return pd.concat(same_slot, axis=1).median(axis=1).iloc[-horizon:].values


def build_features(history, weather, now):
    missing = [c for c in ("kw", "temp_fc") if c not in history]
    if missing:
        raise TimeoutError(f"upstream missing: {missing}")
    # a late tag is the normal case, not an exception: carry the last value
    # forward and TELL the model it is doing so
    feats = history.ffill(limit=8)
    feats["is_stale_input"] = history.isna().any(axis=1).astype("int8")
    return feats


def predict(history, weather, model, now):
    try:
        t0 = time.time()
        X = build_features(history, weather, now)
        if time.time() - t0 > FEATURE_TIMEOUT_S:
            raise TimeoutError("feature build exceeded its budget")
        p = model.predict(X.tail(SLOTS))
        if time.time() - t0 > FEATURE_TIMEOUT_S + MODEL_TIMEOUT_S:
            raise TimeoutError("inference exceeded its budget")
        return Forecast(p, "model", model.version)
    except Exception as e:
        try:
            return Forecast(seasonal_naive(history["kw"]), "baseline",
                            "naive-4w", degraded=True, reason=str(e))
        except Exception as e2:
            prev = load_previous_forecast()
            return Forecast(prev, "previous", "stale", degraded=True,
                            reason=f"{e} then {e2}")


@app.get("/forecast/day-ahead")
def day_ahead():
    hist, wx, model = load_history(), load_weather(), load_model()
    f = predict(hist, wx, model, pd.Timestamp.now())
    archive(f)                      # always, degraded or not
    return f.to_dict()`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "schedule.yaml",
      src: `# Work backwards from the meeting, not forwards from your pipeline.
downstream:
  consumer: 生产调度会
  meets_at: "08:00"
  needs_forecast_by: "07:30"

upstream:
  meter_15min:
    typically_complete_by: "06:00"
    p95_complete_by: "07:05"        # the long tail is the whole problem
    late_on_pct_of_days: 25
  weather_forecast:
    refreshes: ["02:00", "08:00", "14:00", "20:00"]
    use_run: latest_before_publish
  mes_schedule:
    finalised: "previous evening"
    revised_next_morning_pct: 45

budget:
  feature_build_minutes: 12
  inference_minutes: 4
  write_back_minutes: 2
  slack_minutes: 12

degradation:
  # designed, not discovered. The right answer is never an error.
  missing_feature: last_value_plus_flag
  model_timeout: seasonal_naive_baseline
  total_failure: republish_previous_marked_stale
  never: raise_to_downstream

intraday_rolling:
  enabled: true
  every_hours: 1
  note: 等效步长变短,误差明显下降,而且不需要重训任何模型

archive:
  store: [forecast, input_features, model_version, generated_at, degraded, reason]
  retention_days: 1095
  note: 从第一天就要存。三个月后想复盘「上月十五号为什么错得离谱」只能靠它。`,
    },
    {
      lang: "训练与部署 / run", k: "sh", file: "publish.sh",
      run: "# crontab: 20 7 * * *  bash publish.sh day-ahead",
      src: `#!/usr/bin/env bash
# The daily publication, with every failure path leading somewhere useful.
set -uo pipefail          # deliberately NOT -e: a failure must still publish

MODE=$1
if [ -z "$MODE" ]; then MODE=day-ahead; fi
DAY=$(date -d tomorrow +%Y-%m-%d)
OUT=out/forecast-$DAY.json

mkdir -p out archive

echo "[1/4] waiting for upstream completeness (deadline 07:25)"
python tools/wait_for_data.py --tag line1_kw --until "07:25" --min-completeness 0.97
READY=$?

echo "[2/4] generating"
if [ "$READY" -eq 0 ]; then
  python -c "
import json, requests
r = requests.get('http://localhost:8080/forecast/day-ahead', timeout=300).json()
json.dump(r, open('$OUT', 'w'), ensure_ascii=False, indent=2)
print('source:', r['source'], 'degraded:', r['degraded'])"
else
  echo "upstream incomplete; falling back to the baseline"
  python tools/baseline_forecast.py --day "$DAY" --out "$OUT"
fi

echo "[3/4] writing back to the energy platform"
python tools/write_back.py --file "$OUT" --idempotency-key "fc-$DAY" --retries 5

echo "[4/4] archiving forecast + inputs + model version"
cp "$OUT" "archive/forecast-$DAY.json"
python tools/archive_inputs.py --day "$DAY"

python -c "
import json
r = json.load(open('$OUT'))
if r['degraded']:
    print('DEGRADED:', r['reason'])
    print('downstream still received a usable forecast, which is the point')
else:
    print('published on time from the model')"`,
    },
  ],
};

/* ============ OP2 · t27 — drift and retraining ============ */
CODE.t27 = {
  note: {
    zh: "误差不是慢慢爬上去的,是某一天台阶式跳上去的。Python 实现两类触发信号:输出侧的滚动误差比值,和输入侧的分布距离(PSI);配置把定期兜底和触发快速响应组合起来,并规定每次重训必须先影子对比;最后一栏是重训流水线——训完不直接上线,先在最近一段数据上和线上模型比,不显著更好就不换。",
    en: "Error does not creep upward, it steps up on a particular day. The Python implements both families of trigger: the output-side rolling error ratio and the input-side distribution distance (PSI). The configuration combines calendar retraining as a floor with a trigger for fast response, and requires a shadow comparison before any release. The last tab is the retraining pipeline: a fresh model does not ship, it first runs against the incumbent on recent data and stays off unless it is significantly better.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "drift.py",
      run: "# python drift.py  → 触发了吗,为什么",
      src: `"""Two families of signal: what the error does, and what the inputs do."""
import numpy as np
import pandas as pd

SLOTS = 96


def rolling_error_ratio(daily_wape: pd.Series, calm_days=14, window=7):
    """Output side. The calm reference is measured ONCE, before any drift."""
    calm = daily_wape.iloc[:calm_days].mean()
    recent = daily_wape.rolling(window).mean()
    return recent / calm, float(calm)


def psi(expected: np.ndarray, actual: np.ndarray, bins=10):
    """Population stability index — the standard input-side distance. Above
    0.25 is the usual 'something really changed' threshold."""
    cuts = np.quantile(expected, np.linspace(0, 1, bins + 1))
    cuts[0], cuts[-1] = -np.inf, np.inf
    e = np.histogram(expected, cuts)[0] / len(expected)
    a = np.histogram(actual, cuts)[0] / len(actual)
    e, a = np.clip(e, 1e-6, None), np.clip(a, 1e-6, None)
    return float(np.sum((a - e) * np.log(a / e)))


def should_retrain(daily_wape, X_train, X_recent, features,
                   error_threshold=1.35, psi_threshold=0.25, days_since_fit=0,
                   calendar_days=30):
    ratio, calm = rolling_error_ratio(daily_wape)
    cur = float(ratio.iloc[-1]) if len(ratio.dropna()) else 1.0
    psis = {f: psi(X_train[f].values, X_recent[f].values) for f in features}
    worst = max(psis, key=psis.get)

    reasons = []
    if cur > error_threshold:
        reasons.append(f"rolling error {cur:.2f}x the calm level {calm:.3f}")
    if psis[worst] > psi_threshold:
        reasons.append(f"input drift: PSI({worst}) = {psis[worst]:.3f}")
    if days_since_fit >= calendar_days:
        reasons.append(f"calendar floor: {days_since_fit} days since the last fit")
    return bool(reasons), reasons, psis


if __name__ == "__main__":
    bt = pd.read_parquet("reports/daily_scores.parquet")
    Xtr = pd.read_parquet("data/train_features.parquet")
    Xre = pd.read_parquet("data/recent_features.parquet")
    feats = ["cdd", "lag_96", "roll_96_mean_shift96", "is_working"]
    fire, why, psis = should_retrain(bt.wape, Xtr, Xre, feats, days_since_fit=12)
    for f, v in sorted(psis.items(), key=lambda kv: -kv[1]):
        print(f"  PSI {f:<26}: {v:.3f}")
    print()
    print("RETRAIN" if fire else "no action")
    for r in why:
        print("  -", r)
    print()
    print("An over-sensitive threshold retrains every week and improves")
    print("nothing — and every retrain costs validation, approval and an")
    print("explanation to the operators about why the model changed again.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "retrain.yaml",
      src: `retraining:
  # Belt and braces. The calendar floor exists in case the monitoring itself
  # breaks; the trigger exists because waiting half a period is too slow.
  calendar:
    every_days: 30
  trigger:
    output_side:
      metric: rolling_7d_wape
      calm_reference: first_14_days_after_last_fit
      threshold_ratio: 1.35       # 太敏感会每周重训、每次没变好
    input_side:
      metric: psi
      features: [cdd, lag_96, roll_96_mean_shift96, is_working]
      threshold: 0.25
  cooldown_days: 7                # do not retrain twice in the same week

known_drift_causes:
  # in a plant these are DISCRETE EVENTS, which is why the error steps
  - 换产品型号
  - 新增或停用一条产线
  - 改排产规则 / 换班次制度
  - 大修更换主要设备(这一类改的是"关系"不是"水平",最难自愈)
  - 换季
  - 电价政策调整导致生产计划整体迁移

release:
  # a retrained model does NOT ship automatically
  shadow_days: 7
  min_improvement_pt: 0.5
  require_human_approval: true
  rollback_if_worse_for_days: 3
  note: 模型行为突然变化,哪怕变好了,也需要向运行人员解释`,
    },
    {
      lang: "训练与部署 / run", k: "sh", file: "retrain.sh",
      run: "# crontab: 0 3 * * *  bash retrain.sh",
      src: `#!/usr/bin/env bash
# Retrain, then PROVE it is better before letting it near production.
set -euo pipefail

if ! python tools/drift.py --check; then
  echo "no trigger and the calendar floor is not due; nothing to do"
  exit 0
fi

STAMP=$(date +%Y%m%d)
echo "[1/4] retraining (trigger fired)"
python train_lgbm.py --out "models/candidate-$STAMP.txt"

echo "[2/4] backtest on the same folds as the incumbent"
python backtest.py --model "models/candidate-$STAMP.txt" --out "reports/cand-$STAMP.parquet"
python backtest.py --model models/production.txt --out reports/prod.parquet

echo "[3/4] paired comparison across folds"
python compare.py "reports/cand-$STAMP.parquet" reports/prod.parquet | tee "reports/cmp-$STAMP.txt"

if ! grep -q "conclusion holds" "reports/cmp-$STAMP.txt"; then
  echo "the candidate is not significantly better; keeping production"
  echo "(this happens often, and shipping anyway is how trust is lost)"
  exit 0
fi

echo "[4/4] shadow run for 7 days before any switch"
python tools/shadow.py --candidate "models/candidate-$STAMP.txt" --days 7 --register
echo
echo "Shadow started. Switching is a human decision: operators need to be"
echo "told the model changed, and why, before its behaviour changes under"
echo "them. A silently better model that surprises the control room on a"
echo "Monday morning costs more trust than the accuracy was worth."`,
    },
  ],
};

/* ============ OP3 · t28 — integration, alerts, trust ============ */
CODE.t28 = {
  note: {
    zh: "把模型接进现场,以及一件工程师最容易低估的事:人。Python 是写回上位系统的客户端,重点是幂等键与重试——重复写入绝不能产生两条预测;配置由「每班能看几条告警」反推阈值,而不是先定 3σ 再看效果;最后一栏是可解释、可对照、可追溯这三件建立信任的具体事,包括上线第一个月只做建议不做控制的开关。",
    en: "Connecting the model to the plant, and the thing engineers most underestimate: people. The Python is the write-back client, and its point is the idempotency key and the retry — a repeated write must never create two forecasts. The configuration derives the alert threshold from how many alerts a shift tolerates rather than picking three sigma and seeing what happens. The last tab is the three concrete foundations of trust — explainable, comparable, traceable — including the switch that keeps the model advisory for its first month.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "writeback.py",
      run: "# python writeback.py --file out/forecast-2026-09-19.json",
      src: `"""The interface's reliability requirement is higher than the model's."""
import argparse
import hashlib
import json
import time
import requests

ENDPOINT = "http://ems.plant.local/api/v1/forecast"
MAX_RETRIES, BACKOFF = 5, 2.0


def idempotency_key(day: str, tag: str, model_version: str) -> str:
    """A retry must not create a second forecast. The key is derived from what
    the forecast IS, so the same forecast sent twice is the same write."""
    raw = f"{day}|{tag}|{model_version}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def push(payload: dict, key: str, session=None):
    s = session or requests.Session()
    for attempt in range(MAX_RETRIES):
        try:
            r = s.post(ENDPOINT, json=payload, timeout=30, headers={
                "Idempotency-Key": key,
                "X-Model-Version": payload["model_version"],
            })
            if r.status_code == 409:
                # already accepted; this is SUCCESS, not an error
                print("already written (idempotent replay)")
                return True
            r.raise_for_status()
            return True
        except Exception as e:
            wait = BACKOFF ** attempt
            print(f"attempt {attempt + 1}/{MAX_RETRIES} failed: {e}; "
                  f"retrying in {wait:.0f}s")
            time.sleep(wait)
    return False


def validate(payload: dict, cap_kw: float = 2500.0):
    """Refuse to write something physically impossible. The EMS will act on
    this number, and a NaN that reaches a control loop is worse than no write."""
    v = payload["values"]
    assert len(v) == 96, f"expected 96 slots, got {len(v)}"
    assert all(x == x for x in v), "NaN in the forecast"
    assert all(0 <= x <= cap_kw for x in v), "value outside the plant's range"
    assert payload.get("generated_at"), "no generation timestamp"
    return True


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    a = ap.parse_args()
    payload = json.load(open(a.file, encoding="utf-8"))
    validate(payload)
    key = idempotency_key(payload["day"], payload["tag"], payload["model_version"])
    ok = push(payload, key)
    print("written" if ok else "FAILED after retries — page the on-call")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "alerts.yaml",
      src: `# The threshold is DERIVED from human tolerance, not chosen from a formula.
tolerance:
  # ask the control room. Two to five per shift is the usual honest answer.
  alerts_per_shift: 3
  shifts_per_day: 3

derivation:
  # 1) tolerance -> permitted false-alarm rate
  # 2) permitted false-alarm rate -> threshold, read off the ROC curve
  # 3) report the detection rate you get, and live with it
  residual_sigma_kw: 127
  chosen_threshold_sigma: 1.2
  expected_detection_rate: 1.00
  expected_false_per_shift: 0.9
  # for comparison, the number everybody reaches for first:
  three_sigma_detection_rate: 0.67
  three_sigma_false_per_shift: 0.1

tiers:
  # the only way to hold fatigue down without sacrificing detection
  notice:   {sigma: 1.2, channel: dashboard}
  warning:  {sigma: 2.0, channel: dashboard_plus_daily_digest}
  act_now:  {sigma: 3.2, channel: push_to_operator}

trust:
  # the first month: advise, do not control
  advisory_period_days: 30
  always_show_alongside: [model_forecast, naive_baseline, actual]
  explain_each_forecast_with: shap_top_3_drivers
  keep_inputs_for_days: 1095`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "explain.py",
      run: "# python explain.py --day 2026-09-19  → 今天为什么预测偏高",
      src: `"""Trust is built on three concrete things, and all three are code."""
import argparse
import numpy as np
import pandas as pd


def top_drivers(model, X_row: pd.DataFrame, k=3):
    """EXPLAINABLE. Operators do not trust a black box; they trust a sentence.
    'High today because it is 34 degrees and line B is at full rate.'"""
    import shap
    ex = shap.TreeExplainer(model)
    vals = ex.shap_values(X_row)[0]
    order = np.argsort(-np.abs(vals))[:k]
    return [{"feature": X_row.columns[i],
             "value": float(X_row.iloc[0, i]),
             "contribution_kw": float(vals[i])} for i in order]


def comparison_row(day, forecast, baseline, actual=None):
    """COMPARABLE. The screen always shows all three, so people can see the
    model earning its place rather than being told that it does."""
    row = {"day": day, "model": forecast, "baseline": baseline}
    if actual is not None:
        row["actual"] = actual
        row["model_error"] = abs(forecast - actual)
        row["baseline_error"] = abs(baseline - actual)
        row["model_better"] = row["model_error"] < row["baseline_error"]
    return row


def trace(day: str, archive_dir="archive"):
    """TRACEABLE. When something goes wrong, every input to that forecast can
    be retrieved — which is only possible if you started archiving on day one."""
    import json
    from pathlib import Path
    p = Path(archive_dir) / f"forecast-{day}.json"
    if not p.exists():
        return {"error": f"no archive for {day} — this is why OP1 archives"}
    rec = json.loads(p.read_text(encoding="utf-8"))
    return {"model_version": rec["model_version"], "degraded": rec["degraded"],
            "reason": rec.get("reason", ""), "generated_at": rec["generated_at"],
            "inputs": rec.get("input_summary", {})}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", required=True)
    a = ap.parse_args()
    print(trace(a.day))
    print()
    print("For the first month, publish this and let the model ADVISE. People")
    print("need to see enough of its mistakes to calibrate their trust — a")
    print("model that takes control before that happens gets switched off the")
    print("first time it is wrong, however good its average was.")`,
    },
  ],
};

/* ============ CS1 · t29 — the demand ledger ============ */
CODE.t29 = {
  note: {
    zh: "把预测换算成钱。Python 是需量控制的完整账本:按 15 分钟滑动窗口取月最大值计费,控制策略在预测可能触顶时提前错峰,收益扣掉误判造成的停产损失;配置是这座注塑厂的真实参数;最后一栏做敏感性分析,把「峰值时刻命中率 +15 个点」和「MAPE −2 个点」放在一起比,答案不会是你从教程里预期的那个。",
    en: "Turning a forecast into money. The Python is the full demand-control ledger: billing on the largest fifteen-minute window of the month, a controller that staggers load when the forecast approaches the cap, and a benefit net of production lost to false triggers. The configuration holds the plant's real parameters. The last tab runs the sensitivity, putting fifteen points of peak-timing accuracy beside two points of MAPE — and the answer is not the one a tutorial would lead you to expect.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "demand_ledger.py",
      run: "# python demand_ledger.py  → 月净收益与回收期",
      src: `"""One billable window a month, and what it is worth to find it."""
import numpy as np
import pandas as pd

SLOTS = 96


def billed_demand(kw: pd.Series) -> float:
    """Maximum of the 15-minute interval means over the billing month."""
    return float(kw.max())


def control(kw: pd.Series, forecast: pd.Series, target_kw: float,
            shave_kw: float, hit_rate: float, seed=0):
    """Act only when a window threatens to set a NEW monthly maximum. Acting
    on a window that cannot set a record saves nothing and still costs you
    the production you deferred."""
    rng = np.random.default_rng(seed)
    out, billed, acts, hits, falses, misses = [], 0.0, 0, 0, 0, 0
    for actual, pred in zip(kw.values, forecast.values):
        bar = max(target_kw, billed - 15)
        worth_it = actual > bar
        flagged = (rng.random() < hit_rate) if pred > bar else (rng.random() < 0.012)
        v = actual
        if flagged:
            acts += 1
            v = max(0.0, v - shave_kw)
            hits += worth_it
            falses += not worth_it
        elif worth_it:
            misses += 1
        billed = max(billed, v)
        out.append(v)
    return pd.Series(out, index=kw.index), dict(
        billed=billed, actions=acts, hits=hits, falses=falses, misses=misses)


def ledger(kw, forecast, target_kw, shave_kw, hit_rate, rate_cny_per_kw,
           false_cost_cny, build_cost_cny):
    controlled, s = control(kw, forecast, target_kw, shave_kw, hit_rate)
    base = billed_demand(kw)
    saved_kw = base - s["billed"]
    save = saved_kw * rate_cny_per_kw
    loss = s["falses"] * false_cost_cny
    net = save - loss
    return {
        "billed_uncontrolled_kw": base,
        "billed_controlled_kw": s["billed"],
        "saved_kw": saved_kw,
        "monthly_saving_cny": save,
        "false_trigger_cost_cny": loss,
        "monthly_net_cny": net,
        "payback_months": build_cost_cny / net if net > 0 else float("inf"),
        **s,
    }


if __name__ == "__main__":
    df = pd.read_parquet("data/plant_month.parquet")
    r = ledger(df.kw, df.forecast, target_kw=2100, shave_kw=140, hit_rate=0.85,
               rate_cny_per_kw=42, false_cost_cny=800, build_cost_cny=32000)
    for k, v in r.items():
        print(f"{k:>26}: {v:,.1f}" if isinstance(v, float) else f"{k:>26}: {v}")
    print()
    print("Of 2,880 windows this month, exactly one was billed. That is why")
    print("average error is nearly worthless here and peak timing is what pays.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "plant.yaml",
      src: `plant:
  name: 中山路注塑车间
  transformer_kva: 2000
  machines:
    injection: 32
    air_compressor: 2
    central_chiller: 1

tariff:
  type: two_part                 # 两部制
  demand_basis: max_15min_sliding_window_in_month
  demand_charge_cny_per_kw: 42
  energy_charge_cny_per_kwh: 0.62
  # THE fact that reorganises the whole modelling problem
  note: 一个月 2880 个十五分钟窗口,只有最高的那一个决定基本电费

control:
  target_kw: 2100
  # what can actually be deferred without stopping a customer order
  shavable_kw: 140
  levers:
    - 两台空压机错开加载 (60 kW)
    - 非急单注塑机延后启动 20 分钟 (80 kW)
  false_trigger_cost_cny: 800    # 白停一次产的边际损失,来自 cost_params.sql
  max_actions_per_month: 40

model:
  baseline_peak_deviation: 0.068   # 上周同刻中位数
  model_peak_deviation: 0.024      # LightGBM + 排产特征 + P90
  peak_timing_hit_rate: 0.85

economics:
  build_cost_cny: 32000
  monthly_ops_cny: 0`,
    },
    {
      lang: "训练与部署 / run", k: "py", file: "sensitivity.py",
      run: "# python sensitivity.py  → 该去优化哪个数字",
      src: `"""Which improvement is worth buying? Not the one the tutorial implies."""
import numpy as np
import pandas as pd
from demand_ledger import ledger

BASE = dict(target_kw=2100, shave_kw=140, hit_rate=0.85, rate_cny_per_kw=42,
            false_cost_cny=800, build_cost_cny=32000)


def sweep(df, key, values):
    rows = []
    for v in values:
        kw = dict(BASE)
        kw[key] = v
        r = ledger(df.kw, df.forecast, **kw)
        rows.append({key: v, "net_cny": r["monthly_net_cny"],
                     "payback_months": r["payback_months"],
                     "falses": r["falses"], "misses": r["misses"]})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = pd.read_parquet("data/plant_month.parquet")

    print("peak-timing hit rate (relatively easy to improve):")
    hit = sweep(df, "hit_rate", [0.55, 0.70, 0.85, 0.95])
    print(hit.to_string(index=False, float_format=lambda v: f"{v:,.1f}"))

    print()
    print("shavable load (an operations question, not a modelling one):")
    print(sweep(df, "shave_kw", [60, 100, 140, 200]).to_string(
        index=False, float_format=lambda v: f"{v:,.1f}"))

    print()
    gain = hit.net_cny.iloc[2] - hit.net_cny.iloc[1]
    print(f"Lifting peak timing from 70% to 85% is worth {gain:,.0f} CNY a month.")
    print("Now ask what it would take to move MAPE from 6% to 4%, and what")
    print("that would be worth here. The demand charge never looks at MAPE —")
    print("it looks at one fifteen-minute window, and whether you found it.")`,
    },
  ],
};

/* ============ CS2 · t30 — fourteen days ============ */
CODE.t30 = {
  note: {
    zh: "把整本书变成一份可以照着执行的日程。Python 是带依赖和资源约束的计划模型,算出关键路径并指出延期风险最高的环节——答案几乎总是第 1–2 天的数据体检和第 13 天的现场联调,不是建模;配置是逐日任务与验收点;最后一栏是十四天的每日检查脚本,不达标就停下来,而不是往前推。",
    en: "Turning the whole book into a schedule you could follow. The Python is a plan model with dependencies and resource constraints that computes the critical path and names the highest delay risk — almost always days 1–2 and day 13, not the modelling. The configuration is the day-by-day task list with its acceptance criteria. The last tab is the daily check script for the fourteen days: fail a criterion and you stop, rather than pushing on.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "plan.py",
      run: "# python plan.py --data-quality 0.3 --no-gpu  → 关键路径与风险",
      src: `"""Fourteen days, with the constraints that actually bite."""
import argparse

TASKS = [
    dict(k="audit", days=2.0, dep=[], quality=2.2, site=1.8, gpu=1.0),
    dict(k="baseline", days=1.0, dep=["audit"], quality=1.0, site=0.0, gpu=1.0),
    dict(k="features", days=2.0, dep=["baseline"], quality=1.3, site=0.0, gpu=1.0),
    dict(k="model", days=2.0, dep=["features"], quality=1.1, site=0.0, gpu=1.0),
    dict(k="zeroshot", days=0.5, dep=["features"], quality=1.0, site=0.0, gpu=1.0),
    dict(k="tune", days=2.0, dep=["model"], quality=1.0, site=0.0, gpu=1.7),
    dict(k="quantiles", days=1.0, dep=["model"], quality=1.0, site=0.0, gpu=1.0),
    dict(k="serve", days=1.0, dep=["tune", "quantiles"], quality=1.0, site=0.4, gpu=1.0),
    dict(k="integrate", days=1.0, dep=["serve"], quality=1.0, site=3.2, gpu=1.0),
    dict(k="shadow", days=1.5, dep=["integrate"], quality=1.0, site=1.2, gpu=1.0),
]


def durations(data_quality, site_friction, has_gpu):
    out = {}
    for t in TASKS:
        d = t["days"] * (1 + (t["quality"] - 1) * data_quality * 1.4)
        d *= 1 + t["site"] * site_friction * 0.9
        if not has_gpu:
            d *= t["gpu"]
        out[t["k"]] = d
    return out


def finish_times(dur):
    fin, byk = {}, {t["k"]: t for t in TASKS}
    def resolve(k):
        if k in fin:
            return fin[k]
        start = max([resolve(d) for d in byk[k]["dep"]], default=0.0)
        fin[k] = start + dur[k]
        return fin[k]
    for t in TASKS:
        resolve(t["k"])
    return fin


def delay_risk(dur):
    """If this one task doubled, how much later would the whole thing finish?"""
    base = max(finish_times(dur).values())
    out = []
    for t in TASKS:
        d2 = dict(dur)
        d2[t["k"]] *= 2
        out.append((t["k"], max(finish_times(d2).values()) - base))
    return sorted(out, key=lambda r: -r[1])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-quality", type=float, default=0.12)
    ap.add_argument("--site-friction", type=float, default=0.12)
    ap.add_argument("--people", type=float, default=1.0)
    ap.add_argument("--no-gpu", action="store_true")
    a = ap.parse_args()

    dur = durations(a.data_quality, a.site_friction, not a.no_gpu)
    fin = finish_times(dur)
    critical = max(fin.values())
    total = sum(dur.values())
    print(f"critical path : {critical:.1f} days")
    print(f"total work    : {total:.1f} person-days")
    print(f"with {a.people} people : {max(critical, total / a.people):.1f} days")
    print()
    print("delay risk (if this task doubled):")
    for k, impact in delay_risk(dur)[:4]:
        print(f"  {k:<11} +{impact:.1f} days")
    print()
    print("The top risks are not the modelling. The data audit waits on the")
    print("site confirming what those zeros are; the integration waits on")
    print("interfaces, permissions and a shutdown window.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "fourteen_days.yaml",
      src: `# Every day has an acceptance criterion. Failing one means stopping, not
# pushing on — a plan that cannot stop is a plan that ships a broken model.
days:
  1-2:
    task: 数据体检
    do: [画曲线, 查缺失与坏点, 对时标与时区, 跟现场确认那些零是什么]
    accept: 缺失分类完成且可疑点 < 8%;停机样本 >= 6 次
    chapter: [SG1, DT1, DT2]
    risk: high    # 最容易被跳过,也最容易毁掉后面十二天

  3:
    task: 朴素基线
    accept: 四条基线跑通,拿到 MASE 及格线
    chapter: [SG3]

  4-5:
    task: 特征与回测框架
    accept: 泄漏检查清单全绿;滚动回测 8 折跑通
    chapter: [FE1, DT4, EV1]

  6-7:
    task: 第一版模型
    accept: 多折均值显著优于基线(差值方向在 >=6/8 折上一致)
    chapter: [ML2, EV1]

  8:
    task: 零样本基础模型对照
    accept: 拿到一个可比的数字(五分钟的事,可能改变后面的计划)
    chapter: [DL3]

  9-10:
    task: 调参或微调
    accept: 多折均值再降 >= 0.5 个点,否则维持第一版
    chapter: [EV3, PF2]
    note: 没有 GPU 时这一步会被 Kaggle 的配额和会话墙拉长

  11:
    task: 分位数与阈值
    accept: 名义 80% 区间实际覆盖 75%–85%
    chapter: [ML3]

  12:
    task: 推理服务与降级路径
    accept: 三条降级路径都能手工触发并产出可用预测
    chapter: [OP1]

  13:
    task: 接上位系统,端到端联调
    accept: 幂等写入验证通过;重复提交不产生第二条预测
    chapter: [OP3]
    risk: high    # 接口、权限、停机窗口都要排队

  14:
    task: 影子运行并交付
    accept: 看板同时显示预测/基线/实际;留档开始写入
    chapter: [OP1, OP3]`,
    },
    {
      lang: "训练与部署 / run", k: "sh", file: "day_check.sh",
      run: "$ bash day_check.sh 5   # 第 5 天的验收",
      src: `#!/usr/bin/env bash
# Run at the end of each day. Failing a criterion stops the plan; pushing on
# is how a project arrives at day 14 with a model nobody can defend.
set -uo pipefail

DAY=$1
if [ -z "$DAY" ]; then echo "usage: day_check.sh <day>"; exit 2; fi
echo "=== day $DAY acceptance check"

case "$DAY" in
  1|2)
    python tools/classify_gaps.py --report | tee reports/quality.txt
    python - <<'PY'
import json
q = json.load(open("reports/quality.json"))
bad = 100 * (q["comms"] + q["stuck"]) / q["total"]
print(f"suspect slots: {bad:.2f}%   shutdown examples: {q['shutdown_events']}")
assert bad < 8, "too many suspect slots — do not proceed to modelling"
assert q["shutdown_events"] >= 6, "too few shutdown examples to learn from"
print("PASS")
PY
    ;;
  3)
    python baselines.py data/line1.csv | tee reports/baselines.txt
    grep -q "Your bar" reports/baselines.txt && echo "PASS"
    ;;
  4|5)
    python leak_checks.py && python backtest.py --folds 8 && echo "PASS"
    ;;
  6|7)
    python compare.py reports/model.parquet reports/baseline.parquet | tee reports/cmp.txt
    grep -q "conclusion holds" reports/cmp.txt && echo "PASS" || {
      echo "FAIL: the model does not beat the baseline reliably."
      echo "Do NOT proceed to tuning. Go back to features and alignment."
      exit 1; }
    ;;
  8)
    python zeroshot.py | tee reports/zeroshot.txt && echo "PASS"
    ;;
  11)
    python calibration.py | tee reports/calibration.txt && echo "PASS"
    ;;
  12)
    for mode in missing_feature model_timeout total_failure; do
      python tools/inject_failure.py --mode "$mode" --expect-usable-forecast || exit 1
    done
    echo "PASS: all three degradation paths produce a usable forecast"
    ;;
  13)
    python writeback.py --file out/forecast-test.json
    python writeback.py --file out/forecast-test.json   # must be idempotent
    python tools/count_forecasts.py --day test --expect 1 && echo "PASS"
    ;;
  *)
    echo "no automated criterion for day $DAY; check fourteen_days.yaml"
    ;;
esac`,
    },
  ],
};

/* ============ PF3 · t31 — Colab in practice ============ */
CODE.t31 = {
  note: {
    zh: "Colab 的训练脚本和 Kaggle 的不一样,因为持久化模型相反。Python 那栏是一个可以直接粘进 Notebook 的单元格:先确认真的分到了 GPU(免费档不保证),挂载 Drive,把数据集从 Drive 复制到本地盘再解开(这一步能省下大半的等待),然后按墙钟时间而不是按 epoch 写检查点——间隔由 Young 公式算出来。第二栏是运行时与暂存的配置,以及一张「什么存在哪里」的对照表。第三栏是打包与恢复的 shell,包括那条很多人不知道的:免费档关掉标签页训练就停。",
    en: "A Colab training script differs from a Kaggle one because the persistence model is inverted. The Python tab is a cell you can paste straight into a notebook: confirm a GPU was actually allocated (the free tier does not promise one), mount Drive, copy the dataset from Drive to local disk and unpack it there (which removes most of the waiting), then checkpoint on a wall-clock interval rather than per epoch, with the interval computed from Young's formula. The second tab is the runtime and staging configuration plus a table of what lives where. The third is the packaging and recovery shell, including the one many people miss: on the free tier, closing the tab stops training.",
  },
  tabs: [
    {
      lang: "Python", k: "py", file: "colab_train.py",
      run: "# 粘进 Colab 单元格;首次运行会要求授权挂载 Drive",
      src: `"""A Colab cell that survives preemption. The differences from Kaggle are
all about WHERE things live and HOW OFTEN you save."""
import json
import math
import os
import shutil
import subprocess
import time

DRIVE = "/content/drive/MyDrive/tsbook"     # survives a reclaim
LOCAL = "/content/data"                     # fast, and wiped every time
CKPT = os.path.join(DRIVE, "ckpt", "state.pt")


def check_gpu():
    """The free tier does not promise a GPU. Find out before you wait an hour
    for a CPU to do a job you planned for a T4."""
    try:
        out = subprocess.check_output(["nvidia-smi", "--query-gpu=name,memory.total",
                                       "--format=csv,noheader"], text=True).strip()
    except Exception:
        raise SystemExit("no GPU allocated: Runtime > Change runtime type, or "
                         "come back later. PF1 tells you whether you need one.")
    print("GPU:", out)
    return out


def mount_drive():
    from google.colab import drive
    drive.mount("/content/drive")
    os.makedirs(os.path.join(DRIVE, "ckpt"), exist_ok=True)


def stage_data(archive="dataset.tar", dest=LOCAL):
    """Read the archive ONCE off the Drive FUSE mount and unpack it locally.
    Reading thousands of small files straight from Drive is one to two orders
    of magnitude slower — this is where most Colab hours actually go."""
    os.makedirs(dest, exist_ok=True)
    src = os.path.join(DRIVE, archive)
    t0 = time.time()
    shutil.copy(src, "/content/dataset.tar")           # one big sequential read
    shutil.unpack_archive("/content/dataset.tar", dest, format="tar")
    print(f"staged in {time.time() - t0:.0f}s ->", dest)
    return dest


def young_interval(checkpoint_seconds, mtbf_hours):
    """Young's formula for the optimal checkpoint interval on a machine that
    fails at random: tau = sqrt(2 * C * M). Save more often and the time goes
    into writing; less often and every reclaim throws away a long stretch."""
    return math.sqrt(2 * checkpoint_seconds * mtbf_hours * 3600)


def save(model, opt, epoch, step, best):
    tmp = CKPT + ".tmp"
    import torch
    torch.save({"model": model.state_dict(), "opt": opt.state_dict(),
                "epoch": epoch, "step": step, "best": best}, tmp)
    os.replace(tmp, CKPT)                              # atomic, even onto Drive
    json.dump({"epoch": epoch, "step": step, "best": best, "at": time.time()},
              open(os.path.join(DRIVE, "ckpt", "manifest.json"), "w"))


def load(model, opt):
    import torch
    if not os.path.exists(CKPT):
        print("no checkpoint; starting from scratch")
        return 0, 0, float("inf")
    st = torch.load(CKPT, map_location="cpu")
    model.load_state_dict(st["model"])
    opt.load_state_dict(st["opt"])
    print(f"resumed at epoch {st['epoch']} step {st['step']}")
    return st["epoch"], st["step"], st["best"]


def train(model, opt, loader, validate, epochs=40, ckpt_seconds=180, mtbf_hours=5.6):
    epoch0, step0, best = load(model, opt)
    tau = young_interval(ckpt_seconds, mtbf_hours)
    print(f"checkpointing every {tau / 60:.0f} min (Young optimum)")
    last, step = time.time(), step0
    for epoch in range(epoch0, epochs):
        for batch in loader:
            train_step(model, opt, batch)
            step += 1
            # checkpoint on WALL CLOCK, not per epoch: an epoch may be far
            # longer than the interval a preemptible machine justifies
            if time.time() - last > tau:
                save(model, opt, epoch, step, best)
                last = time.time()
                print(json.dumps({"epoch": epoch, "step": step, "saved": True}))
        best = min(best, validate(model))
        save(model, opt, epoch + 1, step, best)
        last = time.time()
    return best


if __name__ == "__main__":
    check_gpu()
    mount_drive()
    data_dir = stage_data()
    print("ready. Free tier: keep this tab OPEN — closing it stops the runtime.")`,
    },
    {
      lang: "数据与配置 / data", k: "yaml", file: "colab.yaml",
      src: `# What lives where. Getting this table wrong is the whole chapter.
paths:
  /content:                 ephemeral      # wiped on every reclaim
  /content/data:            ephemeral      # fast local disk - stage here
  /content/drive/MyDrive:   persistent     # the ONLY thing that survives
  /content/sample_data:     ephemeral      # Colab's own demo files

runtime:
  accelerator: T4           # not guaranteed on the free tier; check nvidia-smi
  free_tier:
    background_execution: false   # closing the tab stops training
    idle_timeout_min: 90
    max_session_h: 12             # best effort, often much less
    quota: none_published
  paid_tier:
    background_execution: true
    compute_units: metered

staging:
  # Drive's FUSE mount is 1-2 orders of magnitude slower than local disk on
  # many small files. One sequential read of one archive is the fix.
  method: tar_then_unpack_locally
  archive: dataset.tar
  measured_seconds:
    many_small_files_from_drive: 720
    one_tar_copied_and_unpacked: 120

checkpointing:
  target: /content/drive/MyDrive/tsbook/ckpt   # never /content
  write_seconds: 180
  observed_mtbf_hours: 5.6      # measure your own: log every reconnect
  interval_minutes: 45          # = sqrt(2 * C * M), Young's formula
  atomic_write: true

reachability:
  note: 从中国大陆访问 Colab 需要跨境网络;如果这不可行,PF4 列出了不需要出境的选项`,
    },
    {
      lang: "训练与部署 / run", k: "sh", file: "colab_stage.sh",
      run: "$ bash colab_stage.sh   # 在本地机器上跑,准备好再上传",
      src: `#!/usr/bin/env bash
# Run this on your OWN machine before touching Colab. The goal is that the
# notebook does exactly one sequential read from Drive and nothing else.
set -euo pipefail

OUT=upload
mkdir -p $OUT

echo "[1/3] de-identify, then pack the dataset as ONE archive"
python tools/deidentify.py --in data/line1.csv --out build/load.csv --scale-out
tar -cf $OUT/dataset.tar -C build .
ls -lh $OUT/dataset.tar

echo "[2/3] why one archive and not a folder"
python - <<'PY'
files = 4200          # a typical per-day-per-tag parquet layout
per_file_overhead_s = 0.17    # Drive FUSE round trip, measured
print(f"{files} small files off the Drive mount: "
      f"{files * per_file_overhead_s / 60:.0f} min per restart")
print("one tar copied and unpacked locally:      about 2 min")
print("and you pay that on EVERY reclaim, because /content is wiped")
PY

echo "[3/3] upload to Drive, then open the notebook"
echo "  - drag $OUT/dataset.tar into Drive/tsbook/"
echo "  - Runtime > Change runtime type > T4 GPU"
echo "  - run the cell from colab_train.py"
echo
echo "Two things the free tier will not do for you:"
echo "  1. guarantee a GPU  - check nvidia-smi first, every time"
echo "  2. keep running with the tab closed - background execution is paid,"
echo "     so a job you cannot babysit belongs on Kaggle (PF2) or a rented"
echo "     card (PF4), not here"
echo
echo "Measure your own MTBF: append a line on every reconnect and read it back."
echo '  date -u +%FT%TZ >> /content/drive/MyDrive/tsbook/reconnects.log'`,
    },
  ],
};
