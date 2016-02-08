import os
from flask import Flask, render_template

app = Flask(__name__)
app.secret_key = 'mysecretkey'

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/stats/')
def stats():
	return render_template('stats.html')

if __name__ == "__main__":

	port = os.environ.get('PORT', 5000)
	app.run(host = '0.0.0.0', port = port)
