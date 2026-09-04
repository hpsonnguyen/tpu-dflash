import json, re, os

DATASETS = ['aime24', 'aime25', 'math500', 'gsm8k', 'humaneval', 'mbpp', 'mt-bench', 'alpaca', 'swe-bench']
REPLAY_DIR = os.path.join('..', 'tpu-spec-decode', 'visualizations', 'output', 'replay')
OUT_PATH = os.path.join('data', 'inference_replays.json')

DATASET_LABELS = {
    'aime24': 'AIME 2024', 'aime25': 'AIME 2025', 'math500': 'MATH-500',
    'gsm8k': 'GSM8K', 'humaneval': 'HumanEval', 'mbpp': 'MBPP',
    'mt-bench': 'MT-Bench', 'alpaca': 'Alpaca', 'swe-bench': 'SWE-Bench',
}

def strip_markdown(text):
    text = re.sub(r'\$\$.*?\$\$', '', text, flags=re.DOTALL)
    text = re.sub(r'\$.*?\$', '', text)
    text = re.sub(r'\\\[.*?\\\]', '', text, flags=re.DOTALL)
    text = re.sub(r'\\\(.*?\\\)', '', text)
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'^[-*]\s+', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'---+', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def clean_prompt(prompt_text):
    prompt = prompt_text.strip()
    for prefix in ['user\n', 'assistant\n<think>\n\n</think>\n\n']:
        prompt = prompt.replace(prefix, '')
    prompt = re.sub(r'Please reason step by step.*$', '', prompt, flags=re.DOTALL).strip()
    return prompt

samples = []
for ds in DATASETS:
    replay_path = os.path.join(REPLAY_DIR, f'replay_{ds}.json')
    if not os.path.exists(replay_path):
        print(f'  SKIP {ds}: replay file not found')
        continue

    with open(replay_path, encoding='utf-8') as f:
        replay = json.load(f)

    sample = replay['samples'][0]
    bl = sample['baseline']
    df = sample['dflash']

    bl_text = strip_markdown(bl['text'])
    df_text = strip_markdown(df['text'])

    prompt = clean_prompt(sample.get('prompt_text', ''))

    entry = {
        'dataset': ds,
        'prompt': prompt,
        'methods': {
            'baseline': {
                'output_text': bl_text,
                'tokens_per_second': round(bl['tps'], 1),
                'output_token_count': bl['num_output_tokens'],
                'total_time_ms': round(bl['total_time_ms'], 1),
            },
            'dflash_tpu': {
                'output_text': df_text,
                'tokens_per_second': round(df['tps'], 1),
                'output_token_count': df['num_output_tokens'],
                'acceptance_lengths': df.get('acceptance_lengths', []),
                'step_timestamps': df.get('step_timestamps', []),
                'total_time_ms': round(df['total_time_ms'], 1),
            }
        }
    }
    samples.append(entry)
    print(f'  added {ds}: bl={bl["num_output_tokens"]} tokens ({bl["tps"]:.1f} TPS), '
          f'df={df["num_output_tokens"]} tokens ({df["tps"]:.1f} TPS)')

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump({'samples': samples}, f, indent=2, ensure_ascii=False)

print(f'\nWrote {len(samples)} samples to {OUT_PATH}')
