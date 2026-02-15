import { useState } from 'react'
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const API_BASE_URL = 'http://localhost:8000/api'

export default function SpreadsheetUpload({ onUploadSuccess }) {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0]
            if (validateFile(droppedFile)) {
                setFile(droppedFile)
                setError(null)
            }
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (validateFile(selectedFile)) {
                setFile(selectedFile)
                setError(null)
            }
        }
    }

    const validateFile = (file) => {
        const validExtensions = ['.csv', '.xlsx', '.xls', '.json']
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

        if (!validExtensions.includes(fileExtension)) {
            setError('Invalid file format. Please upload a CSV, Excel, or JSON file.')
            return false
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setError('File size exceeds 10MB limit.')
            return false
        }

        return true
    }

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first')
            return
        }

        setUploading(true)
        setError(null)
        setResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch(`${API_BASE_URL}/devices/upload_spreadsheet/`, {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setResult({
                    success: true,
                    devicesCreated: data.devices_created,
                    devicesSkipped: data.devices_skipped || 0,
                    totalProcessed: data.total_rows_processed,
                    duplicates: data.duplicates || [],
                    warnings: data.warnings || []
                })
                setFile(null)

                // Notify parent component to refresh device list
                if (onUploadSuccess) {
                    onUploadSuccess()
                }
            } else {
                setError(data.error || 'Failed to upload spreadsheet')
                if (data.validation_errors) {
                    setError(`${data.error}\n${data.validation_errors.join('\n')}`)
                }
            }
        } catch (err) {
            setError(`Error uploading file: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }

    const handleDownloadTemplate = () => {
        const link = document.createElement('a')
        link.href = '/sample_devices_template.csv'
        link.download = 'sample_devices_template.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Bulk Upload Devices
                </CardTitle>
                <CardDescription>
                    Upload a CSV, Excel, or JSON file to automatically detect and add multiple devices at once
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Download Template Button */}
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadTemplate}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Download Sample Template
                    </Button>
                </div>

                {/* Drag and Drop Zone */}
                <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-300 dark:border-gray-700'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        id="file-upload"
                        accept=".csv,.xlsx,.xls,.json"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

                    <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {file ? (
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                    {file.name}
                                </span>
                            ) : (
                                <>
                                    Drag and drop your file here, or{' '}
                                    <label
                                        htmlFor="file-upload"
                                        className="text-blue-600 hover:text-blue-700 cursor-pointer underline"
                                    >
                                        browse
                                    </label>
                                </>
                            )}
                        </p>
                        <p className="text-xs text-gray-500">
                            Supported formats: CSV, XLSX, XLS, JSON (Max 10MB)
                        </p>
                    </div>
                </div>

                {/* Upload Button */}
                <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full gap-2"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            Upload and Process
                        </>
                    )}
                </Button>

                {/* Success Message */}
                {result && result.success && (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                            <strong>Success!</strong> {result.devicesCreated} device(s) added from {result.totalProcessed} row(s).
                            {result.devicesSkipped > 0 && (
                                <div className="mt-2">
                                    <p className="text-yellow-700 dark:text-yellow-300">
                                        ⚠️ {result.devicesSkipped} duplicate device(s) were skipped.
                                    </p>
                                </div>
                            )}
                            {result.duplicates && result.duplicates.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-semibold">Duplicates skipped:</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {result.duplicates.map((dup, idx) => (
                                            <li key={idx}>{dup}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.warnings && result.warnings.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-semibold">Warnings:</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {result.warnings.map((warning, idx) => (
                                            <li key={idx}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Error Message */}
                {error && (
                    <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-200 whitespace-pre-line">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
}
