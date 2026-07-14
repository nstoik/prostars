from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import gspread

_client: gspread.Client | None = None


def connect() -> gspread.Client:
    global _client
    if _client is not None:
        return _client
    import gspread

    raw = os.environ.get("GOOGLE_CREDENTIALS")
    if not raw:
        raise EnvironmentError(
            "GOOGLE_CREDENTIALS environment variable is not set. "
            "See .env.example for setup instructions."
        )
    _client = gspread.service_account_from_dict(json.loads(raw))
    return _client


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
