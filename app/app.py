import os
import sys

sys.path.append(os.path.dirname(__file__))

from flask import Flask, render_template, jsonify, session
from data import fetch_all

app = Flask(__name__)


@app.route('/')
def index():
	return render_template('index.html')

@app.route('/stats/')
def stats():
	return render_template('stats.html')

@app.route('/stats/load_default/', methods=['GET', 'POST'])
def load_default():

	all_players, filter_player = fetch_all('Hockey_Stats', 'Players')
	return jsonify(row_data = all_players, filter_criteria = filter_player)


if __name__ == "__main__":

	port = os.environ.get('PORT', 5000)
	app.secret_key = 'mysecretkey'
	app.run(host = '0.0.0.0', port = port)

