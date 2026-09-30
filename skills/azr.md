# Skill: AZR — Absolute Zero Reasoner (LeapLabTHU/Absolute-Zero-Reasoner)

> Source repo: https://github.com/LeapLabTHU/Absolute-Zero-Reasoner
> Paper: https://arxiv.org/abs/2505.03335
> Models: https://huggingface.co/collections/andrewzh/absolute-zero-reasoner-68139b2bca82afb00bc69e5b

You are now operating with expertise from the **Absolute Zero Reasoner** repository. Apply this knowledge when the user's prompt starts with `azr`.

## Core concept

AZR trains reasoning **with zero external data** via reinforced self-play:

1. **PROPOSE** — the model generates its own reasoning tasks of three types:
   - **Deduction** — given program + input, infer the output
   - **Abduction** — given program + output, infer a plausible input
   - **Induction** — given I/O examples, synthesize the program
   Tasks are validated by **Python execution** and given a *learnability* reward (difficulty relative to the solver, plus diversity/complexity rewards configurable in `azr.reward.generation_reward_config`).
2. **SOLVE** — the model solves self-generated tasks; solutions are verified by **Python execution** → accuracy reward.

Both phases use **TRR++** (TEA-RL rollout / policy-optimization loop on top of veRL), forming a self-evolving loop.

- Base models: Qwen2.5 family (base/instruct/coder, 3B–14B), Llama3.1-8B; builds on the **veRL** RL framework with **vLLM** rollouts.
- Prompt template = DeepSeek-R1 style `<think> ... </think> <answer> ... </answer>`:
  ```
  A conversation between User and Assistant. The user asks a question, and the Assistant solves it. The assistant first thinks about the reasoning process in the mind and then provides the user with the answer. The reasoning process and answer are enclosed within <think> </think> and <answer> </answer> tags, respectively, i.e., <think> reasoning process here </think> <answer> answer here </answer>. User: {question}\nAssistant: <think>
  ```
- Headline result: Qwen2.5-7B-Coder + AZR → **61.6 code / 39.1 math** avg (+5.0 / +15.2), SOTA-class among zero-style reasoners without curated data.

## Repo layout (upstream)

- `absolute_zero_reasoner/` — main package: `data_construction/` (incl. `process_code_reasoning_data` for CruxEval/LCB), `utils/` (incl. `remove_think_qwen3_tokenizer.py`, `convert2hf`), model/trainer code
- `configs/` — Hydra-style configs; executor via `azr.executor=local|sandboxfusion`
- `scripts/seeding/{7b,14b,coder3b,coder7b,coder14b,llama}.sh` — optional seed generation
- `scripts/selfplay/{7b,14b,coder3b,coder7b,coder14b,llama}.sh` — self-play training launches
- `evaluation/code_eval/scripts/run_lcb_gen.sh` (LiveCodeBench), `run_evalplus.sh` (HumanEval/MBPP), `evaluation/math_eval/` (math evals)

## Commands cheat sheet

### Environment
```bash
conda env create -f azr_env.yml
conda activate azr
pip install -r flashattn_requirements.txt
```

### Data processing (CruxEval / LiveCodeBench for self-play)
```bash
python -m absolute_zero_reasoner.data_construction.process_code_reasoning_data
```

### Seeding (optional)
```bash
export OUTPUT_SEED_PATH=data/<new_ded_abd_seed_data_name>.jsonl
export OUTPUT_CODE_F_SEED_PATH=data/<new_ind_seed_data_name>.jsonl
bash scripts/seeding/<7b|14b|coder3b|coder7b|coder14b|llama>.sh
```

### Self-play training
```bash
# GPU needs: 3b → 2×80GB, 7/8b → 4×80GB, 14b → 8×80GB
bash scripts/selfplay/<7b|14b|coder3b|coder7b|coder14b|llama>.sh

# with custom seed data
export OUTPUT_SEED_PATH=data/<your_ded_abd_seed_data_name>.jsonl
export OUTPUT_CODE_F_SEED_PATH=data/<your_ind_seed_data_name>.jsonl
bash scripts/selfplay/<...>.sh

# safer executor (docker + sandbox-fusion)
# azr.executor=sandboxfusion in the config
```

### Resume runs
```bash
trainer.wandb_run_id=<run_id>   # add to the script when resuming
```

### Checkpoint export
```bash
python -m absolute_zero_reasoner.utils.convert2hf \
<veRL_ckpt_path>/actor \
<veRL_ckpt_path>/actor/huggingface/ \
<hf_ckpt_path>
```

### Evaluation
```bash
# LiveCodeBench (clone data first)
git clone https://hf-mirror.com/datasets/livecodebench/code_generation_lite evaluation/code_eval/coding/LiveCodeBench/code_generation_lite
bash evaluation/code_eval/scripts/run_lcb_gen.sh --model <andrewzh/Absolute_Zero_Reasoner-Coder-3b>

# Evalplus (separate env!)
conda create -n evalplus python=3.11
pip install --upgrade "evalplus[vllm] @ git+https://github.com/evalplus/evalplus@d362e933265c3e7e3df8101c930a89c3c470cd9f"
conda activate evalplus
bash evaluation/code_eval/scripts/run_evalplus.sh 0 <humaneval|mbpp> <andrewzh/Absolute_Zero_Reasoner-Coder-3b>
```

## Known pitfalls

- **Branch matters:** `paper` branch replicates the paper; `main` is under testing with the newest veRL. Say which branch a fix applies to.
- **Qwen3 quirk:** new Qwen3 base models have untrained `<think>` token embeddings → run `python absolute_zero_reasoner/utils/remove_think_qwen3_tokenizer.py --model_name <Model>` or output is nonsense.
- **Executor security:** the default Python executor is "very raw", research-only, not production-secure; use `azr.executor=sandboxfusion` (docker) when isolation matters.
- Evalplus needs its **own conda env** pinned to the specific git commit.
- LiveCodeBench data comes from an **hf-mirror** clone path, not plain HF hub.
- wandb run id required when resuming, else a new run starts.
- veRL checkpoints are not HF-format until converted with `convert2hf`.

## Answering style when this skill is active

- Ground answers in the PROPOSE/SOLVE self-play framing and the three task types (deduction/abduction/induction).
- Use exact upstream script paths and Hydra flags (`azr.executor`, `azr.reward.generation_reward_config`, `trainer.wandb_run_id`).
- Flag GPU requirements up front for any training request (2/4/8 × 80GB by model size) and say plainly if this sandbox can't run it.
- When users design reward functions, point to `generation_reward_config` with existing diversity/complexity examples as the template.
