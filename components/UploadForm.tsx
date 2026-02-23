'use client'
import { useState } from 'react'

export default function UploadForm({ sessionToken }: { sessionToken: string }) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [fileName, setFileName] = useState('')

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('image') as File
    if (!file || file.size === 0) return setStatus('Select a file')

    setUploading(true)
    setStatus('Processing...')

    try {
      const res1 = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type })
      })
      const { presignedUrl, cdnUrl } = await res1.json()

      await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })

      const res3 = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      })
      const { imageId } = await res3.json()

      await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId })
      })

      setStatus('Success!')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setStatus('Error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '1.5rem', border: '2px dashed #3182ce', borderRadius: '12px', textAlign: 'center', backgroundColor: '#f7fafc' }}>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Upload New Image</h4>

        {/* Styled File Selection */}
        <label style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>
          {fileName ? `📎 ${fileName}` : '📁 Choose File'}
          <input type="file" name="image" accept="image/*" style={{ display: 'none' }} onChange={(e) => setFileName(e.target.files?.[0].name || '')} />
        </label>

        <button type="submit" disabled={uploading} style={{ width: '100%', maxWidth: '200px', padding: '10px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          {uploading ? 'Working...' : 'Generate Captions'}
        </button>
      </form>
      {status && <p style={{ fontSize: '0.8rem', color: '#3182ce' }}>{status}</p>}
    </div>
  )
}