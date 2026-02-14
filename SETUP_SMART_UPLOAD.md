# Quick Setup Guide for Smart Upload Feature

## Installation Steps

### 1. Backend Setup

```bash
cd hems_backend

# Install Python dependencies
pip install -r requirements.txt

# If you encounter issues with langchain-groq, install individually:
pip install langchain>=0.1.0
pip install langchain-groq>=0.0.1
pip install langchain-community>=0.0.1

# Set up environment variable for Groq API
# Create a .env file in hems_backend directory with:
# GROQ_API_KEY=your_api_key_here
# Get it from: https://console.groq.com/

# Run migrations
python manage.py migrate

# Start the backend server
python manage.py runserver
```

### 2. Frontend Setup

```bash
cd hems_frontend

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

### 3. Test the Feature

1. Open http://localhost:5173 (or your frontend URL)
2. Click on the **✨ Smart Upload** tab
3. Upload the sample file: `hems_backend/sample_unorganized_upload.csv`
4. Review the mapping results
5. Check uploaded devices in the Devices tab

## Environment Variables

Create `hems_backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_django_secret_key
DEBUG=True
```

## Troubleshooting

### Package Installation Issues

If you have trouble installing langchain packages:

```bash
# Try installing with specific versions
pip install langchain==0.1.9
pip install langchain-groq==0.0.3
pip install langchain-core==0.1.23
```

### API Key Issues

If LLM mapping doesn't work:
1. Verify your Groq API key is valid
2. Check the `.env` file exists in `hems_backend/`
3. Restart the Django server after adding the API key

### File Upload Issues

- Ensure backend is running on port 8000
- Check CORS settings in Django settings
- Verify file size is under 10MB

## Testing Without LLM

The basic rule mapping will still work even without a Groq API key. The LLM is only used for columns that don't match common patterns.

## Sample Test Data

Use the provided `sample_unorganized_upload.csv` with columns:
- Type
- Location
- Area
- Qty
- Power
- Brand
- Rating

These will be automatically mapped to:
- device_type
- building
- room
- quantity
- watt_rating
- brand
- star_rating
