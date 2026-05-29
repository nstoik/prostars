import json
import os

import gspread


def connect() -> gspread.Client:
    raw = os.environ.get("GOOGLE_CREDENTIALS")
    if not raw:
        raise EnvironmentError(
            "GOOGLE_CREDENTIALS environment variable is not set. "
            "See .env.example for setup instructions."
        )
    return gspread.service_account_from_dict(json.loads(raw))


def fetch_all(
    spreadsheet_name: str,
    worksheet_name: str,
    numericise_ignore: list[int] | None = None,
) -> list[dict]:
    gc = connect()
    worksheet = gc.open(spreadsheet_name).worksheet(worksheet_name)
    return worksheet.get_all_records(
        empty2zero=True, numericise_ignore=numericise_ignore
    )
