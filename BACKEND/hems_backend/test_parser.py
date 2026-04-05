import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hems_backend.settings')
django.setup()

from energy.services.device_parser import DeviceSpreadsheetParser
import pandas as pd

parser = DeviceSpreadsheetParser()
row = {'Room': 'Conference A', 'Item': 'Sony 1.5T AC', 'Qty': 2, 'Usage': '2000W'}

print("Using LLM...")
try:
    flat_text = " | ".join(str(v) for v in row.values() if pd.notna(v))
    chain = parser.llm | parser.output_parser
    print("Calling LLM directly...")
    result = parser.llm.invoke("Hello, who are you?")
    print(result)
except Exception as e:
    print(f"ERROR: {e}")
