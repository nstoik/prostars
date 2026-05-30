import os

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, render_template, request
from flask_caching import Cache

from prostars.data import fetch_all

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production")

cache = Cache(app, config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 900})

_TABLE_MAP: dict[str, dict[str, tuple[str, str, list[int] | None]]] = {
    "hockey": {
        "#hockey-players-table": ("Hockey_Stats", "Players", None),
        "#hockey-goalies-table": ("Hockey_Stats", "Goalies", None),
    },
    "baseball": {
        "#baseball-players-table": ("baseball_stats", "Master_Batting", [19, 20, 21, 22]),
        "#baseball-pitchers-table": ("baseball_stats", "Master_Pitching", [10, 15, 16, 17]),
    },
}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/stats/<sport>/")
def sport_stats(sport: str):
    if sport not in _TABLE_MAP:
        abort(404)
    return render_template(f"{sport}_stats.html", sport=sport)


@app.route("/stats/<sport>/load_default/", methods=["POST"])
def load_default_sport(sport: str):
    table_id = request.form.get("table_id", "")
    config = _TABLE_MAP.get(sport, {}).get(table_id)
    if config is None:
        return jsonify(error="Unknown sport or table"), 400

    spreadsheet, worksheet, numericise_ignore = config
    cache_key = f"data__{sport}__{table_id.lstrip('#')}"
    data = cache.get(cache_key)
    if data is None:
        try:
            data = fetch_all(spreadsheet, worksheet, numericise_ignore)
            cache.set(cache_key, data)
        except Exception as exc:
            return jsonify(error=str(exc)), 502

    return jsonify(row_data=data, table_id=table_id)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
