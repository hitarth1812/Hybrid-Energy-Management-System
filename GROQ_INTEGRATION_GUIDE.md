# HEMS LangChain + Groq Integration Guide

## Overview

The HEMS system now uses a **two-tier parsing strategy** for device data extraction:

1. **Primary Parser**: `DetailedDeviceExcelParser` - Fast, deterministic pandas-based parsing for structured Excel files
2. **Fallback Parser**: `GroqDeviceParser` - AI-powered Groq/LangChain extraction for unstructured or problematic data

This approach ensures maximum data extraction accuracy while maintaining performance.

---

## Architecture

```
User Uploads Excel/Data File
    ↓
[upload_detailed_excel Endpoint]
    ↓
Try: DetailedDeviceExcelParser (pandas)
    ↓
    If parsed devices < FALLBACK_THRESHOLD (5):
        ├─→ Convert file to text format
        ├─→ Try: GroqDeviceParser (LangChain + Groq)
        └─→ If successful, use Groq records
    ↓
Normalize both formats to Device model schema
    ↓
Create Device records in database
    ↓
Return results + errors log
```

---

## Setup Instructions

### 1. Get Groq API Key

- Visit [console.groq.com](https://console.groq.com)
- Sign up (free tier available)
- Generate API key from dashboard
- Keep key safe (don't commit to git)

### 2. Configure API Key

#### Option A: Environment Variable (Recommended)
```bash
# Linux/Mac
export GROQ_API_KEY='gsk_your_key_here'

# Windows PowerShell
$env:GROQ_API_KEY='gsk_your_key_here'

# Windows CMD
set GROQ_API_KEY=gsk_your_key_here
```

#### Option B: Django Settings
Add to `hems_backend/settings.py`:
```python
import os

GROQ_API_KEY = os.getenv('GROQ_API_KEY')

# Or hardcode (not recommended for production)
GROQ_API_KEY = 'gsk_your_key_here'
```

#### Option C: .env File
Create `.env` in `hems_backend/`:
```
GROQ_API_KEY=gsk_your_key_here
DEBUG=True
```

Load in `settings.py`:
```python
from dotenv import load_dotenv
load_dotenv()
```

### 3. Install Dependencies

Already included in `requirements.txt`:
- `langchain>=0.1.0`
- `langchain-groq>=0.0.1`
- `langchain-core>=0.1.0`

Install if not already done:
```bash
pip install -r requirements.txt
```

---

## Usage

### Automatic (Transparent to Users)

When users upload Excel files via `/api/devices/upload_detailed_excel/`:

1. System tries pandas parsing first (fast, deterministic)
2. If < 5 devices found, automatically tries Groq (AI-powered)
3. Returns whichever method found more devices
4. Logs which method was used

### Manual Testing

Run the test script:
```bash
cd hems_backend
python test_groq_parser.py
```

This will:
- Test basic extraction
- Test with incomplete/messy data
- Test batch processing
- Report results

### Direct API Usage

```python
from energy.groq_device_parser import GroqDeviceParser

# Initialize parser
parser = GroqDeviceParser()

# Extract from text
extracted_data = parser.extract_from_text("""
Room 101, Building A, 5 ACs, 1.5 Ton each, LG brand, 5000W
Room 102, Building B, 10 LED lights, 9W each, Philips
""")

# Normalize to database format
devices = parser.normalize_devices(extracted_data)

# Devices ready for database
for device in devices:
    print(device)
    # {
    #   'device_name': 'AC',
    #   'quantity': 5,
    #   'power_rating_watts': 5000,
    #   'building': 'Building A',
    #   'room': '101',
    #   ...
    # }
```

---

## Device Schema

The Groq parser extracts devices with this schema:

```json
{
  "device_name": "AC",
  "category": "Cooling",
  "sub_category": "Room AC",
  "brand": "LG",
  "model_number": "LS-Q19GZXY",
  "power_rating_watts": 5000,
  "voltage": 230,
  "current_ampere": 21.7,
  "quantity": 5,
  "location": "Building A - Room 101",
  "efficiency_rating": "5 Star",
  "annual_energy_consumption_kwh": 12000,
  "installation_year": 2022,
  "operating_hours_per_day": 8,
  "remarks": "Recently serviced"
}
```

**Fields with null values are skipped** during database insertion (optional fields).

---

## Fallback Threshold

The system uses a **threshold-based fallback**:

```python
FALLBACK_THRESHOLD = 5  # Devices

# If pandas finds < 5 devices:
if len(pandas_records) < FALLBACK_THRESHOLD:
    try_groq_fallback()
```

This prevents unnecessary API calls while ensuring recovery from parsing failures.

**To adjust threshold**, edit in `viewsets.py`:
```python
FALLBACK_THRESHOLD = 10  # Change to your preference
```

---

## Error Handling

### Groq API Errors

If Groq API fails (rate limit, API key invalid, network error):

1. System logs the error
2. Returns pandas results (or error if no pandas data)
3. User gets partial results + error message

Example response:
```json
{
  "success": false,
  "error": "No devices found in file (tried pandas and Groq)",
  "created": 0,
  "failed": 0,
  "errors": [
    "DetailedDeviceExcelParser: Invalid file format",
    "Groq fallback error: API rate limit exceeded"
  ]
}
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "API key not found" | Set `GROQ_API_KEY` environment variable |
| "Rate limit exceeded" | Groq free tier has limits; upgrade or wait |
| "Invalid JSON response" | Groq LLM returned non-JSON; retry request |
| "Timeout" | Groq API slow; increase timeout in `groq_device_parser.py` |

---

## Performance Notes

### Speed

- **Pandas Parsing**: ~100-500ms for typical Excel file
- **Groq Extraction**: ~2-5s per API call (includes network latency)
- **Fallback Overhead**: Only triggered if pandas finds < 5 devices

### Cost

- **Groq Free Tier**: Sufficient for most HEMS use cases
- **Groq Paid**: ~$0.0001-0.0002 per API call

### Optimization Tips

1. **Improve Excel formatting** → Reduces fallback triggers
2. **Batch uploads** → Fewer API calls needed
3. **Cache Groq results** → For identical uploads
4. **Monitor logs** → See which files need fallback

---

## Logs & Debugging

### Enable Detailed Logging

The parsers output logs with `[PARSER]`, `[GROQ]`, `[UPLOAD]`, `[NORMALIZE]` prefixes:

```
[PARSER] Total rows loaded: 100
[PARSER] Columns detected: ['Building', 'Room', 'AC', 'Fan', 'Light']
[PARSER] Device columns identified: {'AC': 'AC', 'Fan': 'FAN'}
[UPLOAD] Pandas found 3 devices (threshold: 5), trying Groq fallback...
[GROQ] Calling Groq API...
[GROQ] Successfully extracted data: <class 'list'>
[UPLOAD] Groq fallback successful: 25 devices extracted
[NORMALIZE] Mapped: Air Conditioner -> Building: Building-1, Room: 101
[UPLOAD] Created device: Air Conditioner (qty: 5)
```

---

## Integration with Existing Features

- ✅ Works with `DetailedDeviceExcelParser` for best accuracy
- ✅ Maintains backward compatibility with `upload_detailed_excel` endpoint
- ✅ Normalizes Groq output to existing Device model
- ✅ Stores additional metadata in Device.metadata JSONField
- ✅ Supports all device types (AC, Fan, Light, PC, Projector, etc.)

---

## Next Steps

1. **Set GROQ_API_KEY** environment variable
2. **Test with sample Excel file** via `/api/devices/upload_detailed_excel/`
3. **Check logs** to verify parsing worked
4. **Query database** to see created devices

---

## Troubleshooting

### Test Endpoint

```bash
curl -X POST http://localhost:8000/api/devices/upload_detailed_excel/ \
  -F "file=@sample_devices.xlsx"
```

### Verify API Key

```bash
echo $GROQ_API_KEY  # Should print your key
```

### Test Parser Directly

```bash
cd hems_backend
python test_groq_parser.py  # Requires API key set
```

---

## References

- [Groq Console](https://console.groq.com)
- [LangChain Documentation](https://python.langchain.com)
- [Groq API Docs](https://console.groq.com/docs)
- [HEMS README](../README.md)
