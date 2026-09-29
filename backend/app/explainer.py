import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Swap this if your chosen free model gets delisted — check openrouter.ai/models
MODEL_NAME = "nvidia/nemotron-3.5-lightning:free"


def build_prompt(move_data: dict) -> str:
    return f"""You are a chess coach explaining a move to an intermediate player.

Position context:
- Move number: {move_data['move_number']}
- Player: {move_data['player']}
- Move played: {move_data['played_move']}
- Engine's best move: {move_data['best_move']}
- Evaluation before move: {move_data['eval_before']}
- Evaluation after move: {move_data['eval_after']}
- Evaluation loss: {move_data['loss']}
- Classification: {move_data['classification']}

Explain in 2-4 short sentences why this move was classified as "{move_data['classification']}".
If the played move differs from the best move, explain what the best move accomplishes that the played move doesn't.
Keep it clear and educational, avoid unnecessary chess jargon, and don't just restate the numbers above.
"""


def explain_move(move_data: dict) -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not set. Check your .env file.")

    prompt = build_prompt(move_data)

    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    response.raise_for_status()
    result = response.json()
    return result["choices"][0]["message"]["content"].strip()