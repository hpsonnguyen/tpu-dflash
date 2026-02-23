# Benchmark Suggestions for Website Data

This document describes the data layout expected by the tpu-dflash website and what the benchmark repository should produce to populate it. The website consumes CSVs for charts and JSON for inference replays.

## 1. Purpose

- **Charts**: Four D3 visualizations (vLLM pipeline TPS, standalone TPU vs GPU, acceptance analysis, acceptance vs position).
- **Replays**: Side-by-side output comparison (baseline vs dflash_gpu vs dflash_tpu vs eagle3) with typewriter animation and draft traces.

The `data/` directory in this repo holds placeholder files. The benchmark repo should produce outputs that can be copied or transformed into these files.

---

## 2. Chart Data (CSVs)

### 2.1 vllm_pipeline_tps_comparison.csv (Chart 1)

**Purpose**: Compare tokens per second for baseline (no spec), DFlash, and Eagle3 on the vLLM TPU pipeline.

**Schema**:
```csv
dataset,method,tps,speedup,num_prompts
```

**How to derive**:
- Merge vLLM pipeline runs for baseline, dflash, and eagle3.
- Baseline/DFlash typically use Qwen3-4B; Eagle3 uses Llama-3.1-8B. Document model differences; the "baseline" row is the no-spec decoding for the DFlash run's model.
- Per-dataset rows (gsm8k, math500, aime24, aime25) plus OVERALL row per method.
- Source: vLLM `summaries/overall.json`, `comparator_dflash.json`, and Eagle3 pipeline `overall.json`.

---

### 2.2 standalone_tpu_vs_gpu_tps.csv (Chart 2)

**Purpose**: Compare TPU and GPU DFlash standalone throughput by dataset.

**Schema**:
```csv
dataset,tpu_baseline_tps,tpu_dflash_tps,gpu_dflash_tps,tpu_speedup,gpu_speedup
```

**How to derive**:
- **TPU**: From `standalone_*.json` (e.g. `standalone_gsm8k.json`) `summary.baseline_tps`, `summary.dflash_tps`.
- **GPU**: From DFlash paper Table 1 or a separate GPU benchmark.
- `tpu_speedup = tpu_dflash_tps / tpu_baseline_tps`; `gpu_speedup = gpu_dflash_tps / tpu_baseline_tps` (or GPU baseline if available).

---

### 2.3 acceptance_analysis.csv (Chart 3)

**Purpose**: Bar chart where height = tau, width = drafts_per_second, area = accepted TPS.

**Schema**:
```csv
method,tau,drafts_per_second,accepted_tps,dataset
```

**How to derive**:
- `accepted_tps` = TPS from speculative run.
- `tau` = average accepted tokens per draft (from summary).
- `drafts_per_second = accepted_tps / tau`.
- Methods: `gpu_dflash_standalone`, `tpu_dflash_standalone`, `tpu_dflash_vllm`, `tpu_eagle3_vllm`.
- Source: Standalone `summary`, vLLM `overall.json` methods `dflash` and `eagle3`.

---

### 2.4 acceptance_rate_gpu_vs_tpu_standalone.csv (Chart 4)

**Purpose**: Acceptance rate at positions 0–15 in the draft block, GPU vs TPU standalone.

**Schema**:
```csv
dataset,variant,pos_0,pos_1,pos_2,pos_3,pos_4,pos_5,pos_6,pos_7,pos_8,pos_9,pos_10,pos_11,pos_12,pos_13,pos_14,pos_15
```

**How to derive**:
- **TPU**: From `standalone_*.json` `summary.acceptance_rate_per_pos`.
- **GPU**: Requires GPU standalone runs with `acceptance_rate_per_pos`. If unavailable, Chart 4 can use placeholder data only.
- `variant` is `gpu` or `tpu`.

---

## 3. Replay Data (JSON)

**File**: `data/inference_replays.json` (or `replay_records.jsonl` converted to JSON)

**Schema** (see also `references/dev_docs/benchmarking_logs_for_website.md`):

```json
{
  "samples": [
    {
      "dataset": "gsm8k",
      "sample_idx": 0,
      "prompt": "...",
      "methods": {
        "baseline": {
          "output_text": "...",
          "tokens_per_second": 93,
          "output_token_count": 256
        },
        "dflash_gpu": { ... },
        "dflash_tpu": {
          "output_text": "...",
          "tokens_per_second": 320,
          "output_token_count": 256,
          "acceptance_lengths": [5, 2, 16, 3, ...]
        },
        "eagle3": {
          "output_text": "...",
          "tokens_per_second": 120,
          "output_token_count": 260,
          "acceptance_lengths": [2, 3, 2, 4, ...]
        }
      }
    }
  ]
}
```

**Required fields**:
- `prompt`: string
- Per method: `output_text`, `tokens_per_second`, `output_token_count`
- For speculative methods: `acceptance_lengths` (array of accepted tokens per draft)

**How to produce**:
- vLLM pipeline: Aggregate per-method JSONL into per-sample records; write `replay_records.jsonl`.
- Standalone: Decode baseline + DFlash outputs; add `output_text` to per-sample output. Merge with vLLM records if needed.
- Website expects method keys: `baseline`, `dflash_gpu`, `dflash_tpu`, `eagle3`.

---

## 4. Recommended Benchmark Outputs

| Output | Source | Used for |
|--------|--------|----------|
| `vllm_pipeline_tps_comparison.csv` | vLLM + Eagle3 pipeline runs | Chart 1 |
| `standalone_tpu_vs_gpu_tps.csv` | standalone_*.json + GPU reference | Chart 2 |
| `acceptance_analysis.csv` | standalone + vLLM summaries | Chart 3 |
| `acceptance_rate_gpu_vs_tpu_standalone.csv` | standalone (TPU) + GPU standalone | Chart 4 |
| `inference_replays.json` | replay_records.jsonl (aggregated) | Replay section |

---

## 5. Mapping: Source JSON → Target CSV

Suggested additions to `generate_csvs.py` (or equivalent script in the benchmark repo):

1. **vllm_pipeline_tps_comparison**: Merge baseline, dflash from DFlash vLLM run; add eagle3 from Eagle3 run. Write unified CSV.
2. **standalone_tpu_vs_gpu_tps**: Read standalone_*.json; merge with GPU_PAPER (or GPU benchmark output). Write per-dataset + AVERAGE.
3. **acceptance_analysis**: Compute `drafts_per_second = tps / tau` for each method; output method, tau, drafts_per_second, accepted_tps.
4. **acceptance_rate_gpu_vs_tpu_standalone**: Stack TPU `acceptance_rate_per_pos` with `variant=tpu`; add GPU rows if GPU standalone data exists.
5. **inference_replays**: Convert `replay_records.jsonl` to `inference_replays.json` (array of samples). Map method names to `baseline`, `dflash_gpu`, `dflash_tpu`, `eagle3`.

---

## 6. Notes

- **Model differences**: Baseline/DFlash use Qwen3-4B; Eagle3 uses Llama. Document this when presenting pipeline TPS.
- **GPU data**: Chart 2 and Chart 4 need GPU reference data (paper or separate benchmark). If unavailable, use placeholders.
- **Pipeline vs standalone**: Pipeline has scheduler/batching overhead; standalone shows raw spec-decode performance. Both are valuable for different audiences.
