import os
import sys

sys.path.append(os.path.dirname(__file__))

from flask import Flask, render_template, jsonify, session, request
from data import fetch_all

app = Flask(__name__)


@app.route('/')
def index():
	return render_template('index.html')

@app.route('/stats/')
def stats():
	return render_template('hockey_stats.html')

@app.route('/stats/load_default/', methods=['GET', 'POST'])
def load_default():

	if request.method == 'POST':
		table_id = request.form.get('table_id')
		if (table_id == '#players-table'):
			all_players = fetch_all('Hockey_Stats', 'Players')
		elif (table_id == '#goalies-table'):
			all_players = fetch_all('Hockey_Stats', 'Goalies')
		
		return jsonify(row_data = all_players, table_id = table_id)

	return


if __name__ == "__main__":

	port = os.environ.get('PORT', 5000)
	app.secret_key = 'mysecretkey'
	app.run(host = '0.0.0.0', port = port)

