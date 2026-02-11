# Quick Start Guide - Bulk Device Upload

## 🚀 Quick Test (5 minutes)

### Step 1: Ensure Dependencies
```bash
cd hems_backend
pip install pandas openpyxl
```

### Step 2: Start Backend
```bash
cd hems_backend
python manage.py runserver
```

### Step 3: Test with Postman

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:8000/api/devices/bulk_upload/`
4. Body → form-data
5. Key: `file` (select "File" type)
6. Value: Upload `sample_bulk_upload.csv`
7. Click Send

**Expected Response:**
```json
{
  "success": true,
  "total_rows": 10,
  "new_devices": 10,
  "updated_devices": 0,
  "skipped_rows": 0,
  "errors": [],
  "warnings": []
}
```

### Step 4: Verify in Database
```bash
cd hems_backend
python manage.py shell
```

```python
from energy.models import Device
print(f"Total devices: {Device.objects.count()}")
Device.objects.all().values()
```

---

## 🎨 Test with Frontend

### Step 1: Start Frontend
```bash
cd hems_frontend
npm install
npm run dev
```

### Step 2: Access UI
1. Open browser: `http://localhost:5173`
2. Navigate to "Devices" page
3. See "Bulk Device Upload" card at top

### Step 3: Upload File
1. Click "Download Template"
2. Edit the template (optional)
3. Click "Select File" → Choose your file
4. Click "Upload and Process"
5. View results instantly

---

## 📋 File Format Example

Create `test_devices.csv`:
```csv
building,room,device_type,quantity,watt_rating,hours_used_per_day
Main Building,101,LIGHT,10,15,8
Main Building,102,FAN,5,75,6
Lab Building,201,PC,20,150,10
Lab Building,202,AC,2,1500,8
```

---

## 🔥 Features Checklist

✅ Validates all data before processing
✅ Bulk create (1000 rows at once)
✅ Bulk update (existing devices)
✅ Atomic transactions (all-or-nothing)
✅ Handles Excel (.xlsx) and CSV
✅ Detailed error reporting per row
✅ Production-ready performance
✅ Frontend integration
✅ Template download
✅ Real-time results display

---

## 🎯 API Endpoint

**URL:** `POST /api/devices/bulk_upload/`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required) - CSV or Excel file

**Response Fields:**
- `success` - Boolean indicating overall success
- `total_rows` - Number of rows in file
- `new_devices` - Count of created devices
- `updated_devices` - Count of updated devices
- `skipped_rows` - Count of invalid rows
- `errors` - Array of error messages
- `warnings` - Array of warning messages

---

## 📞 Need Help?

- Full Documentation: `BULK_UPLOAD_DOCUMENTATION.md`
- Sample File: `hems_backend/sample_bulk_upload.csv`
- Backend Service: `hems_backend/energy/services.py`
- Frontend Component: `hems_frontend/src/components/BulkDeviceUpload.jsx`
