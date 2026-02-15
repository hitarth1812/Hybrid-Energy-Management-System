import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2, ArrowRight, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const API_BASE_URL = 'http://localhost:8000/api'

export default function IntelligentUpload({ onUploadSuccess }) {
    const navigate = useNavigate()
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
                setResult(null)
            }
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (validateFile(selectedFile)) {
                setFile(selectedFile)
                setError(null)
                setResult(null)
            }
        }
    }

    const validateFile = (file) => {
        const validExtensions = ['.csv', '.xlsx', '.xls']
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

        if (!validExtensions.includes(fileExtension)) {
            setError('Invalid file format. Please upload a CSV or Excel file.')
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
            console.log('Uploading to:', `${API_BASE_URL}/devices/intelligent_upload_plain/`)
            console.log('File:', file.name, file.size, 'bytes')

            const response = await fetch(`${API_BASE_URL}/devices/intelligent_upload_plain/`, {
                method: 'POST',
                body: formData,
            })

            console.log('Response status:', response.status)
            console.log('Response headers:', response.headers)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Error response:', errorText)
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`)
            }

            const data = await response.json()
            console.log('Response data:', data)

            if (data.success) {
                setResult(data)
                setFile(null)
                if (onUploadSuccess) {
                    onUploadSuccess()
                }
            } else {
                setError(data.error || 'Upload failed')
            }

        } catch (err) {
            console.error('Upload error:', err)
            setError(`Failed to upload file: ${err.message || 'Please try again.'}`)
        } finally {
            setUploading(false)
        }
    }

    const downloadStandardizedFormat = () => {
        if (!result?.standardized_format) return

        const { columns, sample_row } = result.standardized_format

        // Create CSV content
        const header = columns.join(',')
        const sampleValues = columns.map(col => `"${sample_row[col] || ''}"`).join(',')
        const csvContent = `${header}\n${sampleValues}`

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'standardized_format_template.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Upload</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Upload any spreadsheet - we'll automatically map columns using AI
                </p>
            </div>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-blue-900 dark:text-blue-200">How it works:</p>
                            <div className="flex flex-wrap gap-2 items-center text-blue-700 dark:text-blue-300">
                                <Badge variant="outline" className="bg-white dark:bg-black/40 dark:border-blue-700">Excel Upload</Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge variant="outline" className="bg-white dark:bg-black/40 dark:border-blue-700">Pandas Read</Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge variant="outline" className="bg-white dark:bg-black/40 dark:border-blue-700">Basic Rules</Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge variant="outline" className="bg-white dark:bg-black/40 dark:border-blue-700">AI Mapping</Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge variant="outline" className="bg-white dark:bg-black/40 dark:border-blue-700">Validation</Badge>
                                <ArrowRight className="h-4 w-4" />
                                <Badge variant="outline" className="bg-white dark:bg-black/40 dark:border-blue-700">Save to DB</Badge>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                <strong>Note:</strong> Only <strong>room number</strong> is required. Missing device types, buildings, brands, etc. will be auto-filled with defaults.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upload Card */}
            <Card className="dark:bg-black/40 dark:border-white/10">
                <CardHeader>
                    <CardTitle className="dark:text-white">Upload Spreadsheet</CardTitle>
                    <CardDescription className="dark:text-gray-400">
                        Upload any CSV or Excel file with device data. Columns will be mapped automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                            }`}
                    >
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".csv,.xlsx,.xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                    <FileSpreadsheet className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div>
                                <p className="text-lg font-medium text-gray-900 dark:text-white">
                                    {file ? file.name : 'Drop your spreadsheet here'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    or click to browse (CSV, XLSX, XLS - max 10MB)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Upload Button */}
                    {file && !result && (
                        <Button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            size="lg"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing with AI...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-5 w-5" />
                                    Upload & Process
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Success Summary */}
                    <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                <CardTitle className="text-green-900 dark:text-green-200">Upload Complete!</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-200">{result.stats.total_rows}</p>
                                    <p className="text-sm text-green-700 dark:text-green-300">Total Rows</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-200">{result.stats.successful}</p>
                                    <p className="text-sm text-green-700 dark:text-green-300">Successful</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.stats.failed}</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">Failed</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{result.mapping_report.mapped_fields}</p>
                                    <p className="text-sm text-purple-700 dark:text-purple-300">Columns Mapped</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mapping Report */}
                    {result.mapping_report && (
                        <Card className="dark:bg-black/40 dark:border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 dark:text-white">
                                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    AI Mapping Report
                                </CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    Column mapping confidence: <Badge>{result.mapping_report.confidence}</Badge>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2 dark:text-white">Mapped Columns:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(result.mapping_report.mapping_details).map(([schema, original]) => (
                                            <Badge key={schema} variant="outline" className="bg-green-50 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800">
                                                {original} → {schema}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                {result.mapping_report.unmapped_schema_fields.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2 text-orange-700 dark:text-orange-400">Unmapped Fields (using defaults):</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.mapping_report.unmapped_schema_fields.map(field => (
                                                <Badge key={field} variant="outline" className="bg-orange-50 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800">
                                                    {field}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Standardized Format */}
                    {result.standardized_format && (
                        <Card className="border-purple-200 dark:border-purple-900 dark:bg-black/40">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Standardized Format</CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    {result.standardized_format.message}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2 dark:text-white">Required Columns:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.standardized_format.required_columns.map(col => (
                                            <Badge key={col} variant="default" className="bg-red-600">
                                                {col} *
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                {result.standardized_format.recommended_columns && (
                                    <div>
                                        <h4 className="font-medium mb-2 dark:text-white">Recommended Columns:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.standardized_format.recommended_columns.map(col => (
                                                <Badge key={col} variant="default" className="bg-purple-600">
                                                    {col}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-medium mb-2 dark:text-white">Optional Columns:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.standardized_format.optional_columns.map(col => (
                                            <Badge key={col} variant="outline" className="dark:text-gray-300 dark:border-gray-600">
                                                {col}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={downloadStandardizedFormat}
                                        variant="outline"
                                        className="flex-1 dark:text-white dark:hover:bg-white/10"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Template
                                    </Button>
                                    <Button
                                        onClick={() => navigate('/devices')}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Go to Devices Page
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Row Errors */}
                    {result.row_errors && result.row_errors.length > 0 && (
                        <Card className="border-red-200 dark:border-red-900 dark:bg-black/40">
                            <CardHeader>
                                <CardTitle className="text-red-900 dark:text-red-400">Row Errors</CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    {result.row_errors.length} rows failed validation
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {result.row_errors.map((err, idx) => (
                                        <div key={idx} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded dark:text-gray-300">
                                            <span className="font-medium">Row {err.row}:</span>{' '}
                                            {err.errors.join(', ')}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Reset Button */}
                    <Button
                        onClick={() => setResult(null)}
                        variant="outline"
                        className="w-full dark:text-white dark:hover:bg-white/10"
                    >
                        Upload Another File
                    </Button>
                </div>
            )}
        </div>
    )
}
