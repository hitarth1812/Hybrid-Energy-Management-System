import IntelligentUpload from '../components/IntelligentUpload'

export default function SmartUpload() {
    return (
        <div className="p-6">
            <IntelligentUpload onUploadSuccess={() => console.log('Upload successful!')} />
        </div>
    )
}
