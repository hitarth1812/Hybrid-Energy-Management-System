# Smart Upload Feature

## Overview
The Smart Upload feature allows users to upload unorganized spreadsheets with device data. The system automatically maps column names to the expected schema using a combination of rule-based mapping and AI-powered intelligent mapping with LangChain.

**🎯 Key Feature:** Only **room number** is required! All other fields are optional and will be auto-filled with intelligent defaults if missing. This makes the upload process extremely flexible and forgiving.

## Architecture

```
Excel Upload
     ↓
Pandas Read (Parse CSV/Excel)
     ↓
Basic Rule Mapping (Pattern matching for common column names)
     ↓
Unknown Columns? → Send to LangChain LLM
     ↓
LLM Returns Mapped Schema
     ↓
Validation Layer (Check required fields, data types)
     ↓
Save to Database
```

## Features

### 1. **Flexible Column Names**
Upload spreadsheets with any column names:
- `Type`, `Device Type`, `Appliance` → automatically mapped to `device_type`
- `Location`, `Building`, `Facility` → mapped to `building`
- `Area`, `Room`, `Space` → mapped to `room`
- `Qty`, `Count`, `Number` → mapped to `quantity`
- `Power`, `Watts`, `Wattage` → mapped to `watt_rating`

### 2. **AI-Powered Mapping**
For columns that don't match common patterns, the system uses LangChain with Groq's LLM to intelligently map them to the correct schema fields.

### 3. **Automatic Data Creation**
The system automatically creates related entities:
- Buildings (if they don't exist)
- Rooms (linked to buildings)
- Brands
- Categories

### 4. **Validation & Error Reporting**
- Only room number is required
- Missing device types default to "OTHER"
- Missing buildings default to "Default Building"
- Missing brands/categories default to null
- Invalid numeric values auto-corrected to sensible defaults
- Reports errors only for truly problematic rows
- Provides mapping confidence scores

### 5. **Standardized Format Generation**
After processing, the system generates a standardized format template that users can download and use for future uploads to the regular Devices page.

### 6. **Direct Upload Suggestion**
The system suggests uploading the standardized format directly to the Devices page for faster processing in the future.

## Setup

### Backend Requirements

1. **Install Dependencies**
   ```bash
   cd hems_backend
   pip install -r requirements.txt
   ```

2. **Set Up Environment Variables**
   Create a `.env` file in the `hems_backend` directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
   
   Get your Groq API key from: https://console.groq.com/

3. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

### Frontend Setup

No additional setup required. The component is integrated into the main app.

## Usage

### For End Users

1. Navigate to the **Smart Upload** tab
2. Drag and drop your spreadsheet or click to browse
3. Click **Upload & Process**
4. Review the mapping report and results
5. Download the standardized format template for future use
6. Click **Go to Devices Page** to view your uploaded devices

### Sample Unorganized File

See `hems_backend/sample_unorganized_upload.csv` for an example of an unorganized file that the system can process.

### Expected Schema

The system expects these fields (but will map from various column names):

**Required (Only):**
- `room` - Room name/number (the ONLY required field)

**Recommended (Auto-filled if missing):**
- `device_type` - Type of device (default: 'OTHER' if missing)
- `building` - Building name (default: 'Default Building' if missing)
- `quantity` - Number of devices (default: 1)
- `watt_rating` - Power rating in watts (default: 0)

**Optional:**
- `name` - Device name
- `brand` - Brand name (default: None/null if missing)
- `category` - Device category
- `star_rating` - Star rating (1-5, for AC)
- `ton` - Tonnage (for AC)

**Note:** The system is very forgiving - you only need to provide room numbers. All other fields will be automatically filled with sensible defaults if missing.

## API Endpoints

### POST `/api/devices/intelligent_upload/`

Upload an unorganized spreadsheet for intelligent processing.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (CSV or Excel file)

**Response:**
```json
{
    "success": true,
    "stats": {
        "total_rows": 6,
        "successful": 5,
        "failed": 1,
        "skipped": 0
    },
    "mapping_report": {
        "total_columns": 7,
        "mapped_fields": 6,
        "unmapped_schema_fields": ["category"],
        "mapping_details": {
            "device_type": "Type",
            "building": "Location",
            "room": "Area",
            "quantity": "Qty",
            "watt_rating": "Power",
            "brand": "Brand"
        },
        "confidence": "high"
    },
    "devices_created": [...],
    "row_errors": [...],
    "standardized_format": {
        "columns": [...],
        "sample_row": {...},
        "required_columns": [...],
        "optional_columns": [...]
    }
}
```

## Technical Details

### Backend Components

1. **`intelligent_mapper.py`**
   - `IntelligentColumnMapper` class
   - Handles basic rule mapping and LLM-based mapping
   - Returns mapping report with confidence scores

2. **`intelligent_upload_service.py`**
   - `IntelligentUploadService` class
   - Orchestrates the entire upload process
   - Handles file reading, mapping, validation, and database operations

3. **`viewsets.py`**
   - `intelligent_upload` action in `DeviceViewSet`
   - REST API endpoint for the upload feature

### Frontend Components

1. **`IntelligentUpload.jsx`**
   - Main upload component
   - Drag-and-drop file upload
   - Real-time processing feedback
   - Results visualization
   - Download template functionality

2. **`SmartUpload.jsx`**
   - Page wrapper for the IntelligentUpload component

## Troubleshooting

### LLM Mapping Not Working
- Check if `GROQ_API_KEY` is set in environment variables
- Verify the API key is valid
- Check backend logs for LLM-related errors

### Validation Errors
- Only room number is required - all other fields are auto-filled
- If you see validation errors, ensure at least one column can be mapped to "room"
- Missing values are automatically handled with intelligent defaults
- Numeric fields are automatically corrected if invalid

### File Upload Fails
- Verify file format is CSV, XLSX, or XLS
- Check file size is under 10MB
- Ensure file has a header row with column names

## Future Enhancements

- [ ] Support for JSON file uploads
- [ ] Batch processing for multiple files
- [ ] Custom mapping rules configuration
- [ ] Mapping history and templates
- [ ] Excel file preview before upload
- [ ] Column data type inference
- [ ] Duplicate detection across uploads
- [ ] Integration with external device databases

## Contributing

For issues or feature requests, please contact the development team.
