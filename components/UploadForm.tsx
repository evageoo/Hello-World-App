'use client'
import { useState } from 'react'

export default function UploadForm({ sessionToken }: { sessionToken: string }) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [hasFile, setHasFile] = useState(false)

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('image') as File
    if (!file || file.size === 0) return

    setUploading(true)
    try {
      setStatus('Step 1/4: Presigned URL...')
      const res1 = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type })
      })
      const { presignedUrl, cdnUrl } = await res1.json()

      setStatus('Step 2/4: Uploading Bytes...')
      await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })

      setStatus('Step 3/4: Registering...')
      const res3 = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      })
      const { imageId } = await res3.json()

      setStatus('Step 4/4: AI Magic...')
      await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId })
      })

      setStatus('✅ Success!')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setStatus('❌ Failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '35px', backgroundColor: '#fff', border: '2px dashed #2563eb', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)' }}>
      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: '25px' }}>
          <label style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>{hasFile ? '📷 Image Selected' : '📁 Select Image'}</span>
            <input type="file" name="image" accept="image/*" style={{ display: 'none' }} onChange={(e) => setHasFile(!!e.target.files?.[0])} />
          </label>
        </div>
        <button
          type="submit"
          disabled={uploading || !hasFile}
          style={{ width: '100%', padding: '15px', backgroundColor: uploading || !hasFile ? '#cbd5e1' : '#1e293b', color: 'white', border: 'none', borderRadius: '12px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '1rem', transition: 'all 0.2s' }}
        >
          {uploading ? status : 'Generate AI Captions'}
        </button>
      </form>
    </div>
  )
}