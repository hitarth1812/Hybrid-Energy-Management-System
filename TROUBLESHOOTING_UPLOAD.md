# Smart Upload Troubleshooting Guide

## Issue: Upload Fails

### Step 1: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to the **Console** tab
3. Try uploading a file
4. Look for error messages (they should now show detailed information)

### Step 2: Check Backend Terminal
The backend now logs detailed upload information:
```
[UPLOAD] Request received from...
[UPLOAD] Files in request: ['file']
[UPLOAD] File received: filename.csv, size: XXX bytes
[UPLOAD] Processing complete. Success: True/False
```

Look for any errors in the terminal where Django is running.

### Step 3: Check Network Tab
1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Try uploading
4. Find the `intelligent_upload` request
5. Check:
   - Status code (should be 201 for success)
   - Response body
   - Request headers

### Common Issues & Solutions

#### Issue: "Failed to fetch" or Network Error
**Cause:** Backend not running or CORS issue
**Solution:**
```bash
# Make sure backend is running:
cd hems_backend
python manage.py runserver

# Should see:
# Starting development server at http://127.0.0.1:8000/
```

#### Issue: "No file provided"
**Cause:** File not being sent correctly
**Solution:**
- Check file size (must be < 10MB)
- Check file format (CSV, XLSX, or XLS only)
- Try with the test file: `hems_backend/sample_test_upload.csv`

#### Issue: "ModuleNotFoundError: langchain"
**Cause:** Missing Python dependencies
**Solution:**
```bash
cd hems_backend
pip install langchain>=0.1.0 langchain-groq>=0.0.1 langchain-core>=0.1.0
```

#### Issue: 403 Forbidden or CORS Error
**Cause:** CORS not configured properly
**Solution:** Check `hems_backend/hems_backend/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

#### Issue: 500 Internal Server Error
**Cause:** Backend processing error
**Solution:**
1. Check backend terminal for detailed error
2. Verify Groq API key in `.env` file (optional for basic mapping)
3. Try with minimal test file: `sample_minimal_upload.csv`

#### Issue: "Invalid file format"
**Cause:** File extension not supported
**Solution:**
- Supported formats: `.csv`, `.xlsx`, `.xls`
- Make sure file has correct extension
- Open file in Excel/Notepad to verify it's not corrupted

### Test Files Provided

1. **`sample_test_upload.csv`** - Complete CSV with all fields
2. **`sample_unorganized_upload.csv`** - Unorganized column names (tests AI mapping)
3. **`sample_minimal_upload.csv`** - Only room numbers (tests default values)

### Quick Test

1. Stop both servers:
   - Frontend: `Ctrl+C` in frontend terminal
   - Backend: `Ctrl+C` in backend terminal

2. Restart backend:
   ```bash
   cd hems_backend
   python manage.py runserver
   ```

3. Restart frontend:
   ```bash
   cd hems_frontend
   npm run dev
   ```

4. Open http://localhost:5173
5. Go to **Smart Upload** tab
6. Try uploading `sample_test_upload.csv`
7. Check console (F12) for detailed logs

### Getting Help

If upload still fails:
1. Copy error message from browser console
2. Copy error message from backend terminal
3. Note which test file was used
4. Check file size and format

### Advanced Debugging

If you need to see what's happening inside Python:

```bash
cd hems_backend
python manage.py shell
```

Then:
```python
from energy.intelligent_upload_service import IntelligentUploadService
from django.core.files.uploadedfile import SimpleUploadedFile

# Test with minimal data
csv_content = b"room\nRoom 101\nRoom 102\n"
file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")

service = IntelligentUploadService()
result = service.process_file(file)
print(result)
```

This will show exactly where the error occurs.
