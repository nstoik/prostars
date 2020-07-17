import os
import sys
from flask import Flask, render_template, jsonify, session, request

from data import fetch_all

sys.path.append(os.path.dirname(__file__))

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/stats/hockey/')
def hockey_stats():
    return render_template('hockey_stats.html')


@app.route('/stats/hockey/load_default/', methods=['GET', 'POST'])
def load_default_hockey():

    if request.method == 'POST':
        table_id = request.form.get('table_id')
        if (table_id == '#hockey-players-table'):
            all_players = fetch_all('Hockey_Stats', 'Players')
        elif (table_id == '#hockey-goalies-table'):
            all_players = fetch_all('Hockey_Stats', 'Goalies')

        print(all_players)
        print(table_id)

        return jsonify(row_data=all_players, table_id=table_id)

    	
@app.route('/stats/baseball/')
def baseball_stats():
    return render_template('baseball_stats.html')


@app.route('/stats/baseball/load_default/', methods=['GET', 'POST'])
def load_default_baseball():

    if request.method == 'POST':
        table_id = request.form.get('table_id')
        if (table_id == '#baseball-players-table'):
            all_players = fetch_all('Baseball_Stats', 'Players')
        elif (table_id == '#baseball-pitchers-table'):
            all_players = fetch_all('Baseball_Stats', 'Pitchers')

        print(all_players)
        print(table_id)

        return jsonify(row_data=all_players, table_id=table_id)

    return

if __name__ == "__main__":

    port = os.environ.get('PORT', 5000)
    app.secret_key = 'mysecretkey'
    app.run(host='0.0.0.0', port=port, debug=True)
