# scripts/

## import_data.py

Fetches benchmark results from the [tpu-spec-decode](https://github.com/aaronzhfeng/tpu-spec-decode) GitHub repo and transforms them into the CSV/JSON files the website expects in `data/`.

### Quick start

```bash
# Preview what would be written (no files changed)
python scripts/import_data.py --dry-run

# Write data files for real
python scripts/import_data.py
```

No dependencies beyond the Python standard library (uses `urllib`, `csv`, `json`).

### What it produces

| Output file | Website usage | Source in tpu-spec-decode |
|---|---|---|
| `data/vllm_pipeline_tps_comparison.csv` | Chart 1 (vLLM Pipeline TPS) | `results/v4/vllm_pipeline_results.csv` + `eagle3_llama_results.csv` |
| `data/standalone_tpu_vs_gpu_tps.csv` | Chart 2 (Standalone TPU vs GPU) | `results/v5p/standalone_all_benchmarks.csv` (all 9 datasets) |
| `data/acceptance_analysis.csv` | Chart 3 (Acceptance Volume) | `results/v5p/standalone_all_benchmarks.csv` + `results/v4/vllm_pipeline_*.csv` |
| `data/acceptance_rate_gpu_vs_tpu_standalone.csv` | Chart 4 (Acceptance per Position) | `results/v5p/standalone_*.json` (all 9 datasets) |
| `data/inference_replays.json` | Inference Demo replay | `results/v5p/standalone_*.json` (all 9 datasets) |
| `data/v5p_standalone_all_benchmarks.csv` | Raw reference | `results/v5p/standalone_all_benchmarks.csv` (copied as-is) |
| `data/v5p_standalone_vs_v4.csv` | Raw reference | `results/v5p/standalone_vs_v4.csv` (copied as-is) |
| `data/v5p_standalone_vs_gpu_paper.csv` | Raw reference | `results/v5p/standalone_vs_gpu_paper.csv` (copied as-is) |

### Data source versions

- **Standalone results** (Charts 2, 4, replay) use **v5p** data across all 9 datasets: gsm8k, math500, aime24, aime25, humaneval, mbpp, mt-bench, alpaca, swe-bench.
- **vLLM pipeline and Eagle3** (Chart 1, parts of Chart 3) use **v4** data because pipeline benchmarks were only run on v4.
- **GPU DFlash TPS** in Charts 2 and 3 is estimated from the DFlash paper (Table 1, Qwen3-4B, temp=0) and is only available for the 4 math datasets. Replace with real GPU benchmarks if available.
- Three raw v5p CSVs are also copied to `data/` as reference files (prefixed with `v5p_`).

### What still needs manual input

- **GPU acceptance curves** (Chart 4): The repo only has TPU standalone acceptance data. Add GPU rows to `acceptance_rate_gpu_vs_tpu_standalone.csv` manually if you have GPU standalone runs.
- **Replay output text**: The standalone JSONs contain TPS and `acceptance_lengths` per sample but not the decoded text. The script writes placeholder text. To get real output, record it during benchmark runs (see `benchmark_suggestions.md` section 3).
- **Hero metrics**: After running the script, verify the headline numbers in `index.html` match the updated data.

### Re-running

Run the script again any time the upstream benchmark data changes. It overwrites all files in `data/` with fresh results fetched from GitHub.
