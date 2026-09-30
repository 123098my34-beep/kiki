# Skill: HRM — Hierarchical Reasoning Model (sapientinc/HRM)

> Source repo: https://github.com/sapientinc/HRM
> Paper: https://arxiv.org/abs/2506.21734

You are now operating with expertise from the **Hierarchical Reasoning Model** repository. Apply this knowledge when the user's prompt starts with `hrm`.

## Core concept

HRM is a recurrent architecture inspired by hierarchical, multi-timescale cortical processing. Two interdependent recurrent modules:

- **High-level module (f-module / H-module):** slow, abstract planning; updates once per cycle.
- **Low-level module (L-module):** rapid, detailed computations; runs many times per H step and consumes the H state as an embedding.

Key properties:
- ~27M parameters; trained **from scratch, no pretraining, no CoT data**; works with as few as ~1000 training samples.
- Latent reasoning: it iterates in a **latent space** rather than generating tokens, executing sequential reasoning in a single forward pass with no explicit supervision of intermediate steps.
- Adaptive computation: hierarchical convergence + **Q-head based adaptive halting (ACT-style)**. Inference can run more or fewer cycles; `eval` uses `exit_sims`/halt dynamics.
- Novel **deep supervision via 1-step gradient approximation** — backprop only the last step of each segment, keeping a tiny memory footprint vs BPTT. No normalization layers (except a final layernorm in the head) — a deliberate design choice.
- **Puzzle embeddings** (puzzle_id → learned embedding, Adam-MLP) plus **puzzle-specific per-task learning rates (EXACT)** and per-task gradient masks.
- Two-phase training: **pretraining** (stable with per-task LRs) + **evaluation/reasoning phase** optimizing the Q-head for adaptive halting.
- Externalized **Numpy (NLM) mode** for long hidden states; FlashAttention (FA2 Ampere, FA3 Hopper) required.

## Benchmark references

| Task | Dataset build | Result |
|---|---|---|
| Sudoku-Extreme 1k | `--subsample-size 1000 --num-aug 1000` | near-perfect |
| Maze 30x30-hard 1k | `build_maze_dataset.py` | near-perfect optimal paths |
| ARC-AGI-1 / ARC-AGI-2 | `build_arc_dataset.py` (+ConceptARC) | beats much larger CoT LLMs |

## Repo layout (upstream)

- `models/poet.ts` — model definition (H/L modules, Q-head, puzzle emb)
- `pretrain.py` — main training entry (Hydra config)
- `evaluate.py` — evaluation entry
- `dataset/build_{arc,sudoku,maze}_dataset.py` — dataset builders (raw data via git submodules)
- `puzzle_visualizer.html` — dataset browser
- `arc_eval.ipynb` — ARC-AGI results finalization

## Commands cheat sheet

### Quick demo: Sudoku on a laptop GPU (~10 h on RTX 4070)
```bash
python dataset/build_sudoku_dataset.py --output-dir data/sudoku-extreme-1k-aug-1000 --subsample-size 1000 --num-aug 1000
OMP_NUM_THREADS=8 python pretrain.py data_path=data/sudoku-extreme-1k-aug-1000 epochs=20000 eval_interval=2000 global_batch_size=384 lr=7e-5 puzzle_emb_lr=7e-5 weight_decay=1.0 puzzle_emb_weight_decay=1.0
```

### Full-scale (8 GPUs)
```bash
git submodule update --init --recursive          # raw datasets
python dataset/build_arc_dataset.py               # ARC-1: 960 examples
python dataset/build_arc_dataset.py --dataset-dirs dataset/raw-data/ARC-AGI-2/data --output-dir data/arc-2-aug-1000  # ARC-2: 1120
python dataset/build_sudoku_dataset.py            # full
python dataset/build_maze_dataset.py              # 1000 examples

OMP_NUM_THREADS=8 torchrun --nproc-per-node 8 pretrain.py                       # ARC-1 (~24 h)
OMP_NUM_THREADS=8 torchrun --nproc-per-node 8 pretrain.py data_path=data/arc-2-aug-1000
OMP_NUM_THREADS=8 torchrun --nproc-per-node 8 pretrain.py data_path=data/sudoku-extreme-1k-aug-1000 epochs=20000 eval_interval=2000 lr=1e-4 puzzle_emb_lr=1e-4 weight_decay=1.0 puzzle_emb_weight_decay=1.0
OMP_NUM_THREADS=8 torchrun --nproc-per-node 8 pretrain.py data_path=data/maze-30x30-hard-1k epochs=20000 eval_interval=2000 lr=1e-4 puzzle_emb_lr=1e-4 weight_decay=1.0 puzzle_emb_weight_decay=1.0
```

### Full Sudoku-Hard
```bash
OMP_NUM_THREADS=8 torchrun --nproc-per-node 8 pretrain.py data_path=data/sudoku-hard-full epochs=100 eval_interval=10 lr_min_ratio=0.1 global_batch_size=2304 lr=3e-4 puzzle_emb_lr=3e-4 weight_decay=0.1 puzzle_emb_weight_decay=0.1 arch.loss.loss_type=softmax_cross_entropy arch.L_cycles=8 arch.halt_max_steps=8 arch.pos_encodings=learned
```

### Evaluation
```bash
OMP_NUM_THREADS=8 torchrun --nproc-per-node 8 evaluate.py checkpoint=<CHECKPOINT_PATH>
# then finalize with arc_eval.ipynb; watch eval/exact_accuracy in W&B
```

### Environment
```bash
# CUDA 12.6 + PyTorch cu126 wheels
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
pip3 install packaging ninja wheel setuptools setuptools-scm
# FlashAttention: FA3 (Hopper) via hopper/ setup.py, or FA2: pip3 install flash-attn
pip install -r requirements.txt
wandb login
```

## Pretrained checkpoints (HuggingFace: sapientinc)

- `HRM-checkpoint-ARC-2`
- `HRM-checkpoint-sudoku-extreme`
- `HRM-checkpoint-maze-30x30-hard`

## Known pitfalls

- Needs **CUDA extensions built** — no CPU-only path; a CUDA toolkit (12.6 documented) and matching PyTorch build are required.
- Small-sample runs have ~±2 pt accuracy variance.
- Sudoku-Extreme 1k: **late-stage overfitting → numerical instability in training/Q-learning**; use early stopping once training accuracy nears 100%.
- `global_batch_size` must be divisible by the number of GPUs (achieved via batch_size × grad_accum).
- ARC-2 checkpoint after ~8 h is often sufficient.
- Paper-branch caveat: single-device `pretrain.py` with `--run-dir` can overwrite run outputs; prefer dedicated run dirs.
- Do not add normalization layers when modifying the model — it breaks the no-norm stability recipe.

## Answering style when this skill is active

- Ground answers in the concepts above (H/L modules, latent reasoning, Q-halting, puzzle embeddings, 1-step gradient).
- Prefer exact upstream commands; when the user wants to port or reimplement, keep the two-module + deep-supervision structure intact.
- If asked to train/eval here, first check for GPU/CUDA availability and say plainly if this sandbox can't run it.
