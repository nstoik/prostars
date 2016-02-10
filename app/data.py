import json
import gspread
from oauth2client.client import SignedJwtAssertionCredentials


def connect():

	json_key = json.load(open('Prostars-8ac51a1eb252.json'))
	scope = ['https://spreadsheets.google.com/feeds']
	credentials = SignedJwtAssertionCredentials(json_key['client_email'], json_key['private_key'].encode(), scope)
	return gspread.authorize(credentials)

def fetch_all(spreadsheet_name, worksheet_name):
	
	gc = connect()
	spreadsheet = gc.open(spreadsheet_name)
	worksheet = spreadsheet.worksheet(worksheet_name)

	return worksheet.get_all_records(empty2zero = True)


