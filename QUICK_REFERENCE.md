# LangChain + Groq Integration - Quick Reference

## 🚀 5-Minute Setup

### 1. Get API Key (2 minutes)
- Go to https://console.groq.com
- Sign up (free tier)
- Copy API key from dashboard

### 2. Set Environment Variable (1 minute)

**Linux/Mac:**
```bash
export GROQ_API_KEY='gsk_your_key_here'
```

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY='gsk_your_key_here'
```

**Windows (CMD):**
```cmd
set GROQ_API_KEY=gsk_your_key_here
```

**Or create `.env` file:**
```
GROQ_API_KEY=gsk_your_key_here
```

### 3. Install (1 minute)
```bash
pip install -r requirements.txt
```

### 4. Test (1 minute)
```bash
python test_groq_parser.py
```

---

## 📝 File Overview

| File | Purpose |
|------|---------|
| `energy/groq_device_parser.py` | AI parser using LangChain + Groq |
| `energy/viewsets.py` | Enhanced upload endpoint with fallback |
| `test_groq_parser.py` | Test suite for parser validation |
| `GROQ_INTEGRATION_GUIDE.md` | Complete documentation |
| `requirements.txt` | Python dependencies |

---

## 🔄 How It Works (30-second version)

```
Upload Excel
    ↓
Try Pandas (fast)
    ↓
If only 1-4 devices found:
    Try Groq (accurate, uses AI)
    ↓
Create devices in database
```

---

## 💻 API Endpoint

### Upload Detailed Excel

**Endpoint:** `POST /api/devices/upload_detailed_excel/`

**Request:**
```bash
curl -X POST http://localhost:8000/api/devices/upload_detailed_excel/ \
  -F "file=@sample_devices.xlsx"
```

**Response (Success):**
```json
{
  "success": true,
  "created": 25,
  "failed": 0,
  "total": 25,
  "message": "Successfully created 25 devices",
  "errors": []
}
```

**Response (Fallback Used):**
```json
{
  "success": true,
  "created": 25,
  "failed": 0,
  "total": 25,
  "message": "Successfully created 25 devices",
  "errors": [
    "Fallback to Groq: Extracted 25 devices"
  ]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "No devices found in file (tried pandas and Groq)",
  "created": 0,
  "failed": 25,
  "errors": [
    "DetailedDeviceExcelParser: Invalid column format",
    "Groq fallback: API rate limit exceeded"
  ]
}
```

---

## 🎛️ Configuration

### Fallback Threshold

**Default:** 5 devices

Change in `viewsets.py` line ~160:
```python
FALLBACK_THRESHOLD = 10  # Trigger fallback if pandas finds < 10
```

### Groq Model

**Default:** `mixtral-8x7b-32768` (best for accuracy)

Change in `groq_device_parser.py` line ~68:
```python
model: str = "mixtral-8x7b-32768"  # Options:
# - mixtral-8x7b-32768 (default, most accurate)
# - llama2-70b-4096 (faster)
# - gemma-7b-it (lightweight)
```

### API Timeout

**Default:** 30 seconds

Change in `groq_device_parser.py` line ~72:
```python
request_timeout=30  # Increase if timeouts occur
```

---

## 🧪 Quick Tests

### Test Parser Directly

```bash
cd hems_backend
python test_groq_parser.py
```

Expected output:
```
========================================================
TEST: Basic Groq Device Extraction
========================================================
[TEST] Sending data to Groq for extraction...
[TEST] Successfully extracted 4 devices:
  1. AC - Qty: 5, Power: 4200W, Location: Building A - Room 101
  2. Refrigerator - Qty: 3, Power: 150W, Location: Building A - Room 102
  3. LED Light - Qty: 10, Power: 9W, Location: Building B - Room 201
  4. Fan - Qty: 2, Power: 60W, Location: Building C - Room 301

✅ Basic extraction test PASSED
```

### Test API Endpoint

```bash
# Upload sample file
curl -X POST http://localhost:8000/api/devices/upload_detailed_excel/ \
  -F "file=@sample_devices.xlsx"

# Check response for "success": true
```

---

## 🐛 Troubleshooting

### "API key not found"
```bash
# Check if key is set
echo $GROQ_API_KEY

# If empty:
export GROQ_API_KEY='your-key-here'
```

### "Rate limit exceeded"
Groq free tier has limits per minute. 
- Upgrade to Groq paid tier
- Or reduce upload frequency

### "JSON decode error"
Groq returned non-JSON response. Usually temporary.
- Retry the upload
- Check Groq status page

### "Timeout"
Groq API slow or network issue.
- Increase timeout: `request_timeout=60` in groq_device_parser.py
- Retry in a few seconds

### Parser not using fallback
Check:
1. Pandas already found >= 5 devices (working, no fallback needed)
2. `GROQ_API_KEY` environment variable is set
3. Check logs for `[GROQ]` prefix entries

---

## 📊 Log Prefixes

When debugging, look for these in logs:

```
[PARSER] - DetailedDeviceExcelParser activity
[GROQ]   - Groq API calls and responses
[UPLOAD] - Upload endpoint decisions
[NORM]   - Field normalization
```

Example full trace:
```
[PARSER] Total rows loaded: 50
[PARSER] Device columns identified: {'AC': 'AC', 'Fan': 'FAN'}
[UPLOAD] Pandas found 3 devices (threshold: 5), trying Groq fallback...
[GROQ] Calling Groq API...
[GROQ] Raw response (first 200 chars): [{"device_name": "AC", "quantity": 5...
[GROQ] Successfully extracted data: <class 'list'>
[UPLOAD] Groq fallback successful: 25 devices extracted
[NORMALIZE] Mapped: Air Conditioner -> Building: Building-1, Room: 101
[UPLOAD] Created device: Air Conditioner (qty: 5)
```

---

## 📈 Performance

| Operation | Time | Cost |
|-----------|------|------|
| Pandas parse | 100-500ms | Free |
| Groq API | 2-5sec | ~$0.0001 |
| DB insert | 100-200ms | Free |
| **Total (with fallback)** | **~3-6 sec** | **~$0.0001** |

---

## 🔐 Security Checklist

- ✅ Never commit `GROQ_API_KEY` to git
- ✅ Use environment variables or .env file
- ✅ Both parsers validate numeric inputs
- ✅ Groq errors don't crash; graceful fallback to error response
- ✅ Input files scanned for malicious content (pandas handles)

---

## 📚 Schema Reference

Groq extracts these fields (all optional):

```json
{
  "device_name": "AC",                          // String
  "category": "Cooling",                        // String
  "sub_category": "Room AC",                    // String
  "brand": "LG",                                // String
  "model_number": "LS-Q19GZXY",                // String
  "power_rating_watts": 5000,                   // Number
  "voltage": 230,                               // Number
  "current_ampere": 21.7,                       // Number
  "quantity": 5,                                // Number (must be > 0)
  "location": "Building A - Room 101",          // String
  "efficiency_rating": "5 Star",                // String
  "annual_energy_consumption_kwh": 12000,       // Number
  "installation_year": 2022,                    // Number
  "operating_hours_per_day": 8,                 // Number
  "remarks": "String describing device"        // String
}
```

If a field is not in the data, Groq returns `null` (which is then skipped).

---

## 🎯 Common Scenarios

### Scenario 1: Perfect Excel File
```
Pandas extracts 50 devices → Success
(Groq not called, saves API cost)
```

### Scenario 2: Messy Excel File
```
Pandas finds 2 devices (below threshold)
    ↓
Groq fallback triggered
    ↓
Groq extracts 45 devices → Success
(Logs: "Fallback to Groq: Extracted 45 devices")
```

### Scenario 3: API Key Not Set
```
Pandas finds 2 devices
    ↓
Groq fallback attempted
    ↓
Error: "GROQ_API_KEY not found"
    ↓
Returns: 2 devices from pandas + error in logs
```

### Scenario 4: Groq Timeout
```
Pandas finds 3 devices
    ↓
Groq fallback attempted
    ↓
Groq times out after 30 seconds
    ↓
Returns: 3 devices from pandas + timeout error logged
```

---

## 📞 Support

| Issue | Reference |
|-------|-----------|
| Setup Help | See GROQ_INTEGRATION_GUIDE.md |
| Code Examples | See test_groq_parser.py |
| API Details | See groq_device_parser.py docstrings |
| Architecture | See IMPLEMENTATION_SUMMARY.md |

---

## ✅ Checklist

- [ ] API key obtained from https://console.groq.com
- [ ] `GROQ_API_KEY` environment variable set
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Test script runs: `python test_groq_parser.py`
- [ ] Sample Excel upload succeeds via API
- [ ] Devices created in database with correct quantities
- [ ] Logs show which parser was used (pandas or Groq)

**You're ready to use LangChain + Groq fallback extraction!** 🚀
