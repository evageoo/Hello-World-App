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
        <div style={{ backgroundColor: '#fff', padding: '48px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e2e8f0', maxWidth: '400px' }}>
          <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '2.2rem', fontWeight: '900' }}>Caption Rater</h1>
          <p style={{ color: '#475569', marginBottom: '32px', fontSize: '1.1rem' }}>Sign in to rate and generate AI memes.</p>
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
            <button style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '1.1rem' }}>
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()

  // Requirement: Fetch image URL from related table
  const { data: captions } = await supabase
    .from('captions')
    .select(`id, content, created_datetime_utc, images (url), caption_votes (vote_value)`)
    .order('created_datetime_utc', { ascending: false })

  async function handleVote(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const captionId = formData.get('captionId')
    const voteValue = parseInt(formData.get('voteValue') as string)
    const now = new Date().toISOString()

    // Requirement: Correct voting mutation
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
    <main style={{ padding: '0 20px 80px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#0f172a', backgroundColor: '#fdfdfd' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', marginBottom: '40px', borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ fontSize: '0.9rem', color: '#475569' }}>User: <b style={{ color: '#0f172a' }}>{user.email}</b></div>
        <form action={async () => { 'use server'; const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }}>
          <button style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', color: '#0f172a' }}>Sign Out</button>
        </form>
      </header>

      {/* Requirement: Step 1-4 Pipeline Auth */}
      <UploadForm sessionToken={session?.access_token || ''} />

      <div style={{ margin: '60px 0 32px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a' }}>Meme Feed</h2>
        <div style={{ height: '5px', width: '50px', backgroundColor: '#2563eb', marginTop: '10px', borderRadius: '10px' }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {captions?.map((caption: any) => {
          const score = caption.caption_votes?.reduce((acc: number, v: any) => acc + v.vote_value, 0) || 0;
          const imageUrl = caption.images?.url;

          return (
            <div key={caption.id} style={{ border: '1px solid #e2e8f0', borderRadius: '28px', backgroundColor: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {/* UI FIX: Exact Same Size Images with subtle border */}
              {imageUrl && (
                <div style={{ width: '100%', height: '380px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <img
                    src={imageUrl}
                    alt="Meme"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ padding: '32px' }}>
                <p style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '28px', color: '#0f172a', lineHeight: '1.4' }}>
                  {caption.content}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '2px solid #f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '500' }}>Score: </span>
                    <b style={{ fontSize: '1.25rem', color: score > 0 ? '#10b981' : score < 0 ? '#ef4444' : '#0f172a' }}>{score}</b>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="1" />
                      <button type="submit" style={{ cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👍</button>
                    </form>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="-1" />
                      <button type="submit" style={{ cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👎</button>
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