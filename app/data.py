import json
import gspread
from oauth2client.client import SignedJwtAssertionCredentials

json_key = json.load(open('Prostars-8ac51a1eb252.json'))
scope = ['https://spreadsheets.google.com/feeds']

credentials = SignedJwtAssertionCredentials(json_key['client_email'], json_key['private_key'].encode(), scope)

gc = gspread.authorize(credentials)

wks = gc.open("Test")

# Get a list of all worksheets
worksheet_list = wks.worksheets()

worksheet = wks.sheet1

# Get all values from the first column
first_column = worksheet.col_values(1)

print (worksheet_list)
print (first_column)
