import requests

BASE_URL = "https://api.chess.com/pub"
# Chess.com's API requires a descriptive User-Agent or it may reject requests
HEADERS = {"User-Agent": "chess-analyzer-app (personal project)"}


def get_recent_games(username: str, limit: int = 20):
    username = username.lower().strip()

    archives_resp = requests.get(f"{BASE_URL}/player/{username}/games/archives", headers=HEADERS)
    archives_resp.raise_for_status()
    archives = archives_resp.json().get("archives", [])

    if not archives:
        return []

    games = []
    # walk backward from the most recent month until we have enough games
    for archive_url in reversed(archives):
        resp = requests.get(archive_url, headers=HEADERS)
        resp.raise_for_status()
        month_games = resp.json().get("games", [])

        for g in reversed(month_games):
            games.append({
                "url": g.get("url"),
                "pgn": g.get("pgn"),
                "white": g.get("white", {}).get("username"),
                "black": g.get("black", {}).get("username"),
                "white_result": g.get("white", {}).get("result"),
                "black_result": g.get("black", {}).get("result"),
                "time_class": g.get("time_class"),
                "end_time": g.get("end_time"),
            })
            if len(games) >= limit:
                break
        if len(games) >= limit:
            break

    return games