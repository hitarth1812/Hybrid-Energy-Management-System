import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';

export function DetailedDeviceUpload({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        validateAndSetFile(droppedFile);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (file) => {
        if (!file) return;

        // Check file extension
        const validExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            setError('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
            return;
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File size exceeds 10MB limit');
            return;
        }

        setFile(file);
        setError(null);
        setResult(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(
                'http://localhost:8000/api/detailed-devices/upload_detailed_excel/',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            const data = response.data;

            if (response.status === 201 && data.success) {
                setResult({
                    success: true,
                    recordsCreated: data.records_created,
                    recordsSkipped: data.records_skipped || 0,
                    totalProcessed: data.total_rows_processed,
                    duplicates: data.duplicates || [],
                    warnings: data.warnings || [],
                    validationErrors: data.validation_errors || {}
                });

                // Notify parent to refresh device list
                if (onUploadSuccess) {
                    onUploadSuccess();
                }

                // Clear file
                setFile(null);
            } else {
                setError(data.error || 'Upload failed');
                setResult({
                    success: false,
                    validationErrors: data.validation_errors || {},
                    parsingErrors: data.parsing_errors || []
                });
            }
        } catch (err) {
            console.error('Upload error:', err);

            if (err.response && err.response.data) {
                const errorData = err.response.data;
                setError(errorData.error || 'Upload failed');
                setResult({
                    success: false,
                    validationErrors: errorData.validation_errors || {},
                    parsingErrors: errorData.parsing_errors || []
                });
            } else {
                setError('Network error. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        // Download CSV template
        const link = document.createElement('a');
        link.href = '/sample_detailed_devices_template.csv';
        link.download = 'device_template.csv';
        link.click();
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Upload Detailed Device Excel
                </CardTitle>
                <CardDescription>
                    Upload an Excel file with building, room, and device information.
                    Supports comprehensive validation for all device types.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Download Template Button */}
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadTemplate}
                        className="gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download Sample Template
                    </Button>
                </div>

                {/* File Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
            ${file ? 'bg-green-50 border-green-300' : ''}
          `}
                    onClick={() => document.getElementById('file-input').click()}
                >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    {file ? (
                        <div>
                            <p className="font-medium text-green-700">{file.name}</p>
                            <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="font-medium">Drop Excel file here or click to browse</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Supported formats: .xlsx, .xls (Max 10MB)
                            </p>
                        </div>
                    )}
                    <input
                        id="file-input"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Upload Button */}
                <Button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="w-full"
                >
                    {loading ? 'Uploading...' : 'Upload and Validate'}
                </Button>

                {/* Error Display */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Success Display */}
                {result && result.success && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Upload Successful!</AlertTitle>
                        <AlertDescription className="text-green-700">
                            <p>
                                Successfully created <strong>{result.recordsCreated}</strong> record(s)
                                {result.totalProcessed && ` out of ${result.totalProcessed} row(s) processed`}.
                            </p>

                            {/* Skipped duplicates */}
                            {result.recordsSkipped > 0 && (
                                <div className="mt-2">
                                    <p className="text-yellow-700 font-semibold">
                                        ⚠️ {result.recordsSkipped} duplicate record(s) were skipped.
                                    </p>
                                    {result.duplicates && result.duplicates.length > 0 && (
                                        <div className="mt-1">
                                            <p className="font-semibold">Duplicates:</p>
                                            <ul className="list-disc list-inside ml-4">
                                                {result.duplicates.map((dup, idx) => (
                                                    <li key={idx} className="text-sm">{dup}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Warnings */}
                            {result.warnings && result.warnings.length > 0 && (
                                <div className="mt-2">
                                    {result.warnings.map((warning, idx) => (
                                        <p key={idx} className="text-yellow-700">⚠️ {warning}</p>
                                    ))}
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Validation Errors Display */}
                {result && result.validationErrors && Object.keys(result.validationErrors).length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Validation Errors</AlertTitle>
                        <AlertDescription>
                            <div className="max-h-60 overflow-y-auto">
                                {Object.entries(result.validationErrors).map(([row, errors]) => (
                                    <div key={row} className="mt-2 border-l-2 border-red-400 pl-3">
                                        <p className="font-semibold">{row}:</p>
                                        <ul className="list-disc list-inside ml-2">
                                            {Object.entries(errors).map(([field, errorMsgs]) => {
                                                const messages = Array.isArray(errorMsgs) ? errorMsgs : [errorMsgs];
                                                return messages.map((msg, idx) => (
                                                    <li key={`${field}-${idx}`} className="text-sm">
                                                        <strong>{field}:</strong> {msg}
                                                    </li>
                                                ));
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Parsing Errors */}
                {result && result.parsingErrors && result.parsingErrors.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Parsing Errors</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc list-inside">
                                {result.parsingErrors.map((err, idx) => (
                                    <li key={idx} className="text-sm">{err}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
