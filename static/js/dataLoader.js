/** dataLoader.js - Fetch and parse CSV/JSON; expose loadData() */

const DATA_FILES = {
  vllmPipelineTps: "data/vllm_pipeline_tps_comparison.csv",
  standaloneTpuVsGpu: "data/standalone_tpu_vs_gpu_tps.csv",
  acceptanceAnalysis: "data/acceptance_analysis.csv",
  acceptanceGpuVsTpu: "data/acceptance_rate_gpu_vs_tpu_standalone.csv",
  replays: "data/inference_replays.json?v=5",
  v5pStandaloneAll: "data/v5p_standalone_all_benchmarks.csv",
  v5pVsGpuPaper: "data/v5p_standalone_vs_gpu_paper.csv",
  v5pVsV4: "data/v5p_standalone_vs_v4.csv",
  profilingGsm8k: "data/profiling_gsm8k.json",
  v4StandaloneAll: "data/v4_standalone_all_benchmarks.csv",
};

const FALLBACK_REPLAYS = {
  samples: [
    {
      dataset: "gsm8k",
      prompt: "Janet's ducks lay 16 eggs per day. She sells half and uses a quarter of the remainder for baking. How many eggs left?",
      methods: {
        baseline: { output_text: "16 eggs. Half sold: 8. Quarter of 8 for baking: 2. 8 - 2 = 6. \\boxed{6}", tokens_per_second: 88, output_token_count: 92 },
        dflash_gpu: { output_text: "16 eggs. Half sold: 8. 1/4 of 8 = 2. 8 - 2 = 6. \\boxed{6}", tokens_per_second: 318, output_token_count: 92, acceptance_lengths: [6, 5, 3, 16, 8, 4, 10, 2, 7, 5, 9, 3, 6, 4, 4] },
        dflash_tpu: { output_text: "16 eggs. 8 left after half. 2 for baking. 6 remain. \\boxed{6}", tokens_per_second: 305, output_token_count: 92, acceptance_lengths: [5, 6, 4, 15, 7, 5, 9, 3, 8, 4, 10, 2, 6, 5, 3] },
        eagle3: { output_text: "Half of 16 = 8. Quarter of 8 = 2. 8 - 2 = 6. \\boxed{6}", tokens_per_second: 118, output_token_count: 94, acceptance_lengths: [12, 18, 16, 20, 28] },
      },
    },
    {
      dataset: "math500",
      prompt: "Solve: Find x if 3x + 7 = 40.",
      methods: {
        baseline: { output_text: "3x = 33, x = 11. \\boxed{11}", tokens_per_second: 93, output_token_count: 32 },
        dflash_gpu: { output_text: "3x + 7 = 40 → 3x = 33 → x = 11. \\boxed{11}", tokens_per_second: 335, output_token_count: 32, acceptance_lengths: [4, 3, 5, 2, 4, 3, 3, 4, 4] },
        dflash_tpu: { output_text: "3x = 33, so x = 11. \\boxed{11}", tokens_per_second: 328, output_token_count: 32, acceptance_lengths: [5, 2, 4, 3, 4, 3, 4, 3, 4] },
        eagle3: { output_text: "3x = 33, so x = 11. \\boxed{11}", tokens_per_second: 125, output_token_count: 34, acceptance_lengths: [10, 12, 12] },
      },
    },
    {
      dataset: "aime24",
      prompt: "Let n be the smallest positive integer such that n! is divisible by 2024. Find n mod 10.",
      methods: {
        baseline: { output_text: "2024 = 8×11×23. n ≥ 23. For n=23, 23! has 2^19, 11, 23. So n=23, remainder 3. \\boxed{3}", tokens_per_second: 91, output_token_count: 128 },
        dflash_gpu: { output_text: "2024=8×11×23. n=23 works. 23 mod 10 = 3. \\boxed{3}", tokens_per_second: 342, output_token_count: 128, acceptance_lengths: [8, 10, 6, 16, 9, 7, 11, 5, 12, 8, 9, 6, 11, 4, 6] },
        dflash_tpu: { output_text: "2024=2^3×11×23. n=23. Remainder 3. \\boxed{3}", tokens_per_second: 335, output_token_count: 128, acceptance_lengths: [7, 9, 7, 15, 8, 6, 10, 5, 11, 7, 10, 6, 12, 5, 5] },
        eagle3: { output_text: "2024=8×11×23. n=23. n mod 10 = 3. \\boxed{3}", tokens_per_second: 122, output_token_count: 130, acceptance_lengths: [24, 28, 26, 25, 27] },
      },
    },
    {
      dataset: "aime25",
      prompt: "Find ordered pairs (a,b) of positive integers with a+b=100 and gcd(a,b)=5.",
      methods: {
        baseline: { output_text: "a=5x, b=5y, x+y=20, gcd(x,y)=1. Pairs (1,19),(3,17),(7,13),(9,11) and symmetric. Total 8. \\boxed{8}", tokens_per_second: 92, output_token_count: 156 },
        dflash_gpu: { output_text: "a=5x, b=5y. x+y=20, coprime. (1,19),(3,17),(7,13),(9,11) + reversals. 8. \\boxed{8}", tokens_per_second: 348, output_token_count: 156, acceptance_lengths: [10, 12, 8, 16, 11, 9, 13, 7, 12, 8, 14, 9, 10, 7, 10] },
        dflash_tpu: { output_text: "5x+5y=100 → x+y=20, gcd(x,y)=1. 8 pairs. \\boxed{8}", tokens_per_second: 340, output_token_count: 156, acceptance_lengths: [9, 11, 9, 15, 10, 8, 12, 7, 11, 9, 13, 8, 9, 7, 9] },
        eagle3: { output_text: "a=5x, b=5y, x+y=20. Coprime pairs: 8. \\boxed{8}", tokens_per_second: 119, output_token_count: 158, acceptance_lengths: [30, 32, 28, 34, 34] },
      },
    },
  ],
};

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(function (l) { return l.length > 0; });
  if (lines.length === 0) return [];
  const headers = lines.shift().split(",").map(function (h) { return h.trim(); });
  return lines.map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] != null ? String(values[idx]).trim() : "";
    });
    return row;
  });
}

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load " + path);
  const text = await res.text();
  return parseCSV(text);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load " + path);
  return res.json();
}

async function loadSafe(path, loader) {
  try {
    return await loader(path);
  } catch (e) {
    console.warn("Failed to load " + path, e);
    return null;
  }
}

async function loadData() {
  const [
    vllmPipelineTps, standaloneTpuVsGpu, acceptanceAnalysis, acceptanceGpuVsTpu, replays,
    v5pStandaloneAll, v5pVsGpuPaper, v5pVsV4, profilingGsm8k, v4StandaloneAll
  ] = await Promise.all([
    loadSafe(DATA_FILES.vllmPipelineTps, loadCSV),
    loadSafe(DATA_FILES.standaloneTpuVsGpu, loadCSV),
    loadSafe(DATA_FILES.acceptanceAnalysis, loadCSV),
    loadSafe(DATA_FILES.acceptanceGpuVsTpu, loadCSV),
    loadSafe(DATA_FILES.replays, loadJSON),
    loadSafe(DATA_FILES.v5pStandaloneAll, loadCSV),
    loadSafe(DATA_FILES.v5pVsGpuPaper, loadCSV),
    loadSafe(DATA_FILES.v5pVsV4, loadCSV),
    loadSafe(DATA_FILES.profilingGsm8k, loadJSON),
    loadSafe(DATA_FILES.v4StandaloneAll, loadCSV),
  ]);
  return {
    vllmPipelineTps: vllmPipelineTps || [],
    standaloneTpuVsGpu: standaloneTpuVsGpu || [],
    acceptanceAnalysis: acceptanceAnalysis || [],
    acceptanceGpuVsTpu: acceptanceGpuVsTpu || [],
    replays: replays,
    v5pStandaloneAll: v5pStandaloneAll || [],
    v5pVsGpuPaper: v5pVsGpuPaper || [],
    v5pVsV4: v5pVsV4 || [],
    profilingGsm8k: profilingGsm8k || null,
    v4StandaloneAll: v4StandaloneAll || [],
  };
}

window.dataLoader = {
  loadData,
  FALLBACK_REPLAYS,
  DATA_FILES,
};
