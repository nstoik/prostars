import json
import gspread
from oauth2client.client import SignedJwtAssertionCredentials


def connect():

	json_key = json.load(open('app/Prostars-c02b661b2a77.json'))
	scope = ['https://spreadsheets.google.com/feeds']
	credentials = SignedJwtAssertionCredentials(json_key['client_email'], json_key['private_key'].encode(), scope)
	return gspread.authorize(credentials)

def fetch_all(spreadsheet_name, worksheet_name):
	
	gc = connect()
	spreadsheet = gc.open(spreadsheet_name)
	worksheet = spreadsheet.worksheet(worksheet_name)

	all_data = worksheet.get_all_records(empty2zero = True)
	filter_criteria = fetch_filter_criteria_hockey(worksheet)

	return all_data, filter_criteria 

def fetch_filter_criteria_hockey(worksheet, pre_selected="true"):

	#used for sorting days of week
	days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

	filter_criteria = []
	for x in range(1,8):
		#get all column data
		column = worksheet.col_values(x)
		#remove column name
		column_name = column.pop(0)

		#get only unique values. Sort days of week special
		if column_name == "Night":
			unique_column = sorted(set(column), key=days.index)
		else:
			unique_column = sorted(set(column))

		filter_data = [column_name]
		for item in unique_column:
			select_data = {}
			select_data['label'] = item
			select_data['title'] = item
			select_data['value'] = item
			select_data['selected'] = pre_selected
			filter_data.append(select_data)

		filter_criteria.append(filter_data)

	return filter_criteria
