import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import UploadForm from '../components/UploadForm'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <h1 style={{ color: '#1e293b', marginBottom: '24px', fontSize: '1.8rem' }}>Caption Rater</h1>
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'
            const { data } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${baseUrl}/auth/callback` },
            })
            if (data.url) redirect(data.url)
          }}>
            <button style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Sign in with Google
            </button>
          </form>
        </div>
      </main>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()

  // UPDATE: Fetching the image URL by joining the 'images' table
  const { data: captions } = await supabase
    .from('captions')
    .select(`
      id,
      content,
      created_datetime_utc,
      image_id,
      images (url),
      caption_votes (vote_value)
    `)
    .order('created_datetime_utc', { ascending: false })

  async function handleVote(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const captionId = formData.get('captionId')
    const voteValue = parseInt(formData.get('voteValue') as string)
    const now = new Date().toISOString()

    await supabase.from('caption_votes').upsert({
      caption_id: captionId,
      profile_id: currentUser.id,
      vote_value: voteValue,
      created_datetime_utc: now,
      modified_datetime_utc: now
    }, { onConflict: 'caption_id, profile_id' })

    revalidatePath('/')
  }

  return (
    <main style={{ padding: '40px 20px', maxWidth: '650px', margin: '0 auto', fontFamily: '"Inter", sans-serif', color: '#1e293b', backgroundColor: '#fdfdfd' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Logged in as: <b style={{ color: '#334155' }}>{user.email}</b></div>
        <form action={async () => { 'use server'; const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }}>
          <button style={{ cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: '500' }}>Sign Out</button>
        </form>
      </header>

      <UploadForm sessionToken={session?.access_token || ''} />

      <h2 style={{ margin: '50px 0 10px', fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>Caption Feed</h2>
      <div style={{ height: '3px', width: '100%', backgroundColor: '#2563eb', marginBottom: '25px', borderRadius: '2px' }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {captions?.map((caption: any) => {
          const score = caption.caption_votes?.reduce((acc: number, v: any) => acc + v.vote_value, 0) || 0;
          const imageUrl = caption.images?.url;

          return (
            <div key={caption.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
              {/* FEATURE: Displaying the image from the pipeline */}
              {imageUrl && (
                <div style={{ width: '100%', height: '300px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                  <img
                    src={imageUrl}
                    alt="Uploaded content"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ padding: '24px' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: '500', marginBottom: '20px', lineHeight: '1.6' }}>{caption.content}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#475569' }}>
                    Score: <span style={{ color: score > 0 ? '#10b981' : score < 0 ? '#ef4444' : '#64748b' }}>{score}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="1" />
                      <button type="submit" style={{ cursor: 'pointer', padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>👍</button>
                    </form>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="-1" />
                      <button type="submit" style={{ cursor: 'pointer', padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>👎</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}