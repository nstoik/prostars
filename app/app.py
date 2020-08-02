import os
import sys
from flask import Flask, render_template, jsonify, session, request

from data import fetch_all

sys.path.append(os.path.dirname(__file__))

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/stats/<sport>/')
def sport_stats(sport:str):
    return render_template(f'{sport}_stats.html', sport=sport)


@app.route('/stats/<sport>/load_default/', methods=['GET', 'POST'])
def load_default_sport(sport:str):

    if request.method == 'POST':
        table_id = request.form.get('table_id')
        if sport == 'hockey':
            if (table_id == '#hockey-players-table'):
                all_players = fetch_all('Hockey_Stats', 'Players')
            elif (table_id == '#hockey-goalies-table'):
                all_players = fetch_all('Hockey_Stats', 'Goalies')
        elif sport == 'baseball':
            if (table_id == '#baseball-players-table'):
                all_players = fetch_all('baseball_stats', 'Master_Batting')
            elif (table_id == '#baseball-pitchers-table'):
                all_players = fetch_all('baseball_stats', 'Master_Pitching')

        return jsonify(row_data=all_players, table_id=table_id)


if __name__ == "__main__":

    port = os.environ.get('PORT', 5000)
    app.secret_key = 'mysecretkey'
    app.run(host='0.0.0.0', port=port, debug=True)
