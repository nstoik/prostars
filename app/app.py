import os
from flask import Flask, render_template, jsonify, make_response
from json import dumps

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
		{'player': 'Nelson', 'gp': 1, 'g':1, 'a': 1, 'p': 2, 'pm': '+1', 'pim': 5, 'ppg': 2},
		{'player': 'Nelson', 'gp': 1, 'g':1, 'a': 1, 'p': 2, 'pm': '+1', 'pim': 5, 'ppg': 2}
		]

	return jsonify(results = sample_data)
	#return dumps(sample_data)

if __name__ == "__main__":

	port = os.environ.get('PORT', 5000)
	app.run(host = '0.0.0.0', port = port)

