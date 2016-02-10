import os
import sys

sys.path.append(os.path.dirname(__file__))

from flask import Flask, render_template, jsonify
from data import fetch_all

app = Flask(__name__)
app.secret_key = 'mysecretkey'

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/stats/')
def stats():
	return render_template('stats.html')

@app.route('/stats/load_default/', methods=['GET', 'POST'])
def load_default():

	sample_data = [
		{'Name': 'Nelson', 'GP': 1, 'G':1, 'A': 1, 'P': 2, 'Plus_Minus': '+1', 'PIM': 5, 'PPG': 2},
		{'Name': 'Nelson', 'GP': 1, 'G':1, 'A': 1, 'P': 2, 'Plus_Minus': '+1', 'PIM': 5, 'PPG': 2}
		]
	all_skaters = fetch_all('Hockey_Stats', 'Skaters')

	return jsonify(row_data = all_skaters)

if __name__ == "__main__":

	port = os.environ.get('PORT', 5000)
	app.run(host = '0.0.0.0', port = port)

