import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowRight, Sparkles, Info, Save, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const API_BASE_URL = 'http://localhost:8000/api'

export default function IntelligentUpload({ onUploadSuccess }) {
    const navigate = useNavigate()
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [previewData, setPreviewData] = useState(null)
    const [saveResult, setSaveResult] = useState(null)
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
                setPreviewData(null)
                setSaveResult(null)
            }
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (validateFile(selectedFile)) {
                setFile(selectedFile)
                setError(null)
                setPreviewData(null)
                setSaveResult(null)
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

    const handlePreview = async () => {
        if (!file) {
            setError('Please select a file first')
            return
        }

        setUploading(true)
        setError(null)
        setPreviewData(null)
        setSaveResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch(`${API_BASE_URL}/smart-upload/preview/`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`)
            }

            const data = await response.json()

            if (data.success || data.devices) {
                setPreviewData(data.devices || [])
            } else {
                setError(data.error || 'Failed to parse file')
            }

        } catch (err) {
            console.error('Preview error:', err)
            setError(`Failed to preview file: ${err.message || 'Please try again.'}`)
        } finally {
            setUploading(false)
        }
    }

    const handleDataChange = (index, field, value) => {
        const newData = [...previewData]
        newData[index][field] = value
        setPreviewData(newData)
    }

    const handleSave = async () => {
        if (!previewData || previewData.length === 0) return

        setSaving(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE_URL}/smart-upload/save/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ devices: previewData }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`)
            }

            const data = await response.json()
            setSaveResult(data)
            setPreviewData(null)
            setFile(null)

            if (onUploadSuccess) {
                onUploadSuccess()
            }

        } catch (err) {
            console.error('Save error:', err)
            setError(`Failed to save devices: ${err.message || 'Please try again.'}`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Upload</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    AI-powered parsing: Upload, Preview, then Save
                </p>
            </div>

            {/* Upload Card */}
            {!previewData && !saveResult && (
                <Card className="dark:bg-black/40 dark:border-white/10">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Upload Spreadsheet</CardTitle>
                        <CardDescription className="dark:text-gray-400">
                            Upload any CSV or Excel file. Our AI will analyze the data and let you preview the results before saving.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {file && (
                            <Button
                                onClick={handlePreview}
                                disabled={uploading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                size="lg"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Analyzing File...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Preview with AI
                                    </>
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Preview Section */}
            {previewData && (
                <div className="space-y-4">
                    <Card className="border-purple-200 dark:border-purple-900 dark:bg-black/40">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="dark:text-white flex items-center gap-2">
                                        <TableIcon className="h-5 w-5 text-purple-600" />
                                        Data Preview
                                    </CardTitle>
                                    <CardDescription className="dark:text-gray-400">
                                        Found {previewData.length} devices. Please review before saving.
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setPreviewData(null)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save {previewData.length} Devices
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border dark:border-gray-700 max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:border-gray-700">
                                            <TableHead className="dark:text-gray-300">Building</TableHead>
                                            <TableHead className="dark:text-gray-300">Room</TableHead>
                                            <TableHead className="dark:text-gray-300">Device Type</TableHead>
                                            <TableHead className="dark:text-gray-300">Brand</TableHead>
                                            <TableHead className="dark:text-gray-300">Rated Power (W)</TableHead>
                                            <TableHead className="dark:text-gray-300">Star Rating</TableHead>
                                            <TableHead className="dark:text-gray-300">Ton (AC)</TableHead>
                                            <TableHead className="dark:text-gray-300">Quantity</TableHead>
                                            <TableHead className="dark:text-gray-300">Daily Usage (Hr)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((device, index) => (
                                            <TableRow key={index} className="dark:border-gray-700">
                                                <TableCell className="dark:text-gray-300">
                                                    <input
                                                        type="text"
                                                        value={device.building}
                                                        onChange={(e) => handleDataChange(index, 'building', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1"
                                                    />
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <input
                                                        type="text"
                                                        value={device.room}
                                                        onChange={(e) => handleDataChange(index, 'room', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium dark:text-gray-200">
                                                    <select
                                                        value={device.device_type}
                                                        onChange={(e) => handleDataChange(index, 'device_type', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1 py-1 dark:bg-gray-800"
                                                    >
                                                        <option value="AC">AC</option>
                                                        <option value="FAN">FAN</option>
                                                        <option value="LIGHT">LIGHT</option>
                                                        <option value="PC">PC</option>
                                                        <option value="COOLER">COOLER</option>
                                                        <option value="OTHER">OTHER</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <input
                                                        type="text"
                                                        value={device.brand || ''}
                                                        onChange={(e) => handleDataChange(index, 'brand', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-purple-500 rounded px-1"
                                                        placeholder="Generic"
                                                    />
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={device.watt_rating}
                                                            onChange={(e) => handleDataChange(index, 'watt_rating', parseFloat(e.target.value) || 0)}
                                                            className="w-16 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500 px-1"
                                                            min="0"
                                                        />
                                                        <span className="text-xs text-gray-500">W</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <input
                                                        type="number"
                                                        value={device.star_rating || ''}
                                                        onChange={(e) => handleDataChange(index, 'star_rating', e.target.value ? parseInt(e.target.value) : null)}
                                                        className="w-12 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500 px-1"
                                                        min="1"
                                                        max="5"
                                                        placeholder="-"
                                                    />
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <input
                                                        type="number"
                                                        value={device.ton || ''}
                                                        onChange={(e) => handleDataChange(index, 'ton', e.target.value ? parseFloat(e.target.value) : null)}
                                                        className="w-12 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500 px-1"
                                                        min="0.5"
                                                        step="0.5"
                                                        placeholder="-"
                                                    />
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <input
                                                        type="number"
                                                        value={device.quantity}
                                                        onChange={(e) => handleDataChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                                        className="w-12 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-purple-500 px-1"
                                                        min="1"
                                                    />
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={device.hours_used_per_day}
                                                            onChange={(e) => handleDataChange(index, 'hours_used_per_day', parseFloat(e.target.value) || 0)}
                                                            className="w-16 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-300 dark:border-purple-700 focus:outline-none focus:border-purple-500 px-1 font-semibold text-purple-700 dark:text-purple-300"
                                                            min="0"
                                                            max="24"
                                                            step="0.5"
                                                        />
                                                        <span className="text-xs text-gray-500">hr</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Save Success Result */}
            {saveResult && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            <CardTitle className="text-green-900 dark:text-green-200">Import Successful!</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AlertDescription className="text-green-800 dark:text-green-300 text-lg mb-4">
                            Successfully saved {saveResult.saved_count} devices to the database.
                        </AlertDescription>

                        {saveResult.errors && saveResult.errors.length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                <h4 className="font-bold text-red-800 dark:text-red-300 mb-2">Warnings / Errors:</h4>
                                <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400">
                                    {saveResult.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-4 mt-6">
                            <Button
                                onClick={() => {
                                    setSaveResult(null)
                                    setFile(null)
                                }}
                                variant="outline"
                                className="dark:text-white dark:hover:bg-white/10"
                            >
                                Upload Another
                            </Button>
                            <Button
                                onClick={() => navigate('/devices')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                Go to Devices Page
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
