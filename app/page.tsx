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
        <div style={{ backgroundColor: '#fff', padding: '48px', borderRadius: '42px', textAlign: 'center', border: '1px solid #e2e8f0', shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', maxWidth: '400px' }}>
          <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.05em' }}>CAPTION_RATER</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '32px', fontWeight: '500' }}>Please authenticate to access the feed.</p>
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'
            const { data } = await supabase.auth.signInWithOAuth({
              provider: 'google', options: { redirectTo: `${baseUrl}/auth/callback` },
            })
            if (data.url) redirect(data.url)
          }}>
            <button style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Initialize Google Auth
            </button>
          </form>
        </div>
      </main>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()

  const { data: captions } = await supabase
    .from('captions')
    .select(`id, content, images (url), caption_votes (vote_value, profile_id)`)
    .order('created_datetime_utc', { ascending: false })
    .limit(25)

  // --- UPDATED HANDLE VOTE FOR ASSIGNMENT 12 AUDIT ---
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
      // MICHAEL FIELD AUDIT FIELDS (Assignment 12 requirement)
      created_by_user_id: currentUser.id,
      modified_by_user_id: currentUser.id,
      created_datetime_utc: now,
      modified_datetime_utc: now
    }, { onConflict: 'caption_id, profile_id' })

    revalidatePath('/')
  }

  return (
    <main style={{ padding: '0 20px 100px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>NODE_ACTIVE: <b style={{ color: '#2563eb' }}>{user.email}</b></div>
        <form action={async () => { 'use server'; const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }}>
          <button style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sign Out</button>
        </form>
      </header>

      <UploadForm sessionToken={session?.access_token || ''} />

      <div style={{ margin: '60px 0 32px' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.07em', fontStyle: 'italic' }}>MEME_FEED</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {captions?.map((caption: any) => {
          const votes = caption.caption_votes || [];
          const score = votes.reduce((acc: number, v: any) => acc + v.vote_value, 0) || 0;
          const userVote = votes.find((v: any) => v.profile_id === user.id)?.vote_value;
          const imageUrl = caption.images?.url;

          return (
            <div key={caption.id} style={{ border: '1px solid #e2e8f0', borderRadius: '42px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
              {imageUrl && (
                <div style={{ width: '100%', height: '400px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <img src={imageUrl} alt="Meme" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}

              <div style={{ padding: '40px' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '32px', lineHeight: '1.2' }}>{caption.content}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontWeight: '800', color: '#cbd5e1', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: score > 0 ? '#10b981' : (score < 0 ? '#ef4444' : '#0f172a') }}>{score}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="1" />
                      <button type="submit" style={{
                        cursor: 'pointer', width: '60px', height: '60px', borderRadius: '20px',
                        border: '2px solid',
                        borderColor: userVote === 1 ? '#10b981' : '#f1f5f9',
                        backgroundColor: userVote === 1 ? '#ecfdf5' : '#fff',
                        fontSize: '1.4rem', transition: 'all 0.2s',
                        boxShadow: userVote === 1 ? '0 10px 15px -3px rgba(16, 185, 129, 0.2)' : 'none'
                      }}>👍</button>
                    </form>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="-1" />
                      <button type="submit" style={{
                        cursor: 'pointer', width: '60px', height: '60px', borderRadius: '20px',
                        border: '2px solid',
                        borderColor: userVote === -1 ? '#ef4444' : '#f1f5f9',
                        backgroundColor: userVote === -1 ? '#fef2f2' : '#fff',
                        fontSize: '1.4rem', transition: 'all 0.2s',
                        boxShadow: userVote === -1 ? '0 10px 15px -3px rgba(239, 68, 68, 0.2)' : 'none'
                      }}>👎</button>
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