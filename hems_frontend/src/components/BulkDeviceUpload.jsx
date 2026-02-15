import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { bulkUploadDevices } from '../services/api';

const BulkDeviceUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setErrorDetails(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setErrorDetails(null);
    setResult(null);

    try {
      const uploadResult = await bulkUploadDevices(file);
      setResult(uploadResult);
      if (onUploadComplete && uploadResult.success) {
        onUploadComplete(uploadResult);
      }
      setFile(null);
      document.getElementById('file-input').value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
      if (err.details) {
        setErrorDetails(err.details);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Bulk Device Upload
        </CardTitle>
        <CardDescription>
          Upload Excel (.xlsx) or CSV file to add or update multiple devices at once.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="file-input" className="block text-sm font-medium">
            Select File
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              Selected: {file.name}
            </p>
          )}
        </div>

        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? 'Processing...' : 'Upload and Process'}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200 text-sm space-y-2">
            <p className="font-semibold">{error}</p>
            {errorDetails && errorDetails.errors && Array.isArray(errorDetails.errors) && (
              <ul className="list-disc list-inside text-xs space-y-1">
                {errorDetails.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
             {errorDetails && errorDetails.validation_errors && Array.isArray(errorDetails.validation_errors) && (
              <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                {errorDetails.validation_errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-50 rounded border space-y-2">
            <h4 className="font-semibold text-green-700">
              {result.success ? 'Upload Successful' : 'Upload Completed with Issues'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>Total rows: <span className="font-medium">{result.total_rows}</span></p>
              <p>Skipped: <span className="font-medium text-amber-600">{result.skipped_rows}</span></p>
              <p>New devices: <span className="font-medium text-green-600">{result.new_devices}</span></p>
              <p>Updated: <span className="font-medium text-blue-600">{result.updated_devices}</span></p>
            </div>
            
            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold text-amber-700 mb-1">Warnings / Skipped Details:</p>
                <ul className="list-disc list-inside text-xs text-amber-800 max-h-32 overflow-y-auto space-y-1">
                  {result.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

             {result.errors && result.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                 <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                <ul className="list-disc list-inside text-xs text-red-800 max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                     <li key={i}>{typeof err === 'object' ? JSON.stringify(err) : err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkDeviceUpload;
