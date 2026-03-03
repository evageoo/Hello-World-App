import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import UploadForm from '../components/UploadForm'

export default async function Home() {
  const supabase = await createClient()

  // Requirement: Use getUser for secure server-side auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
        <div style={{ backgroundColor: '#fff', padding: '48px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e2e8f0', maxWidth: '400px' }}>
          <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '2.2rem', fontWeight: '900' }}>Caption Rater</h1>
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'
            const { data } = await supabase.auth.signInWithOAuth({
              provider: 'google', options: { redirectTo: `${baseUrl}/auth/callback` },
            })
            if (data.url) redirect(data.url)
          }}>
            <button style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800' }}>
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()

  // PERFORMANCE: Added .limit(25) to speed up loading
  // REQUIREMENT: Join images table to show resulting captions
  const { data: captions } = await supabase
    .from('captions')
    .select(`id, content, images (url), caption_votes (vote_value)`)
    .order('created_datetime_utc', { ascending: false })
    .limit(25)

  async function handleVote(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const captionId = formData.get('captionId')
    const voteValue = parseInt(formData.get('voteValue') as string)
    const now = new Date().toISOString()

    // REQUIREMENT: Correct voting mutation with datetime fields
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
    <main style={{ padding: '0 20px 100px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', color: '#0f172a', backgroundColor: '#fff' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', marginBottom: '40px', borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ fontSize: '0.95rem', color: '#0f172a' }}>User: <b style={{ fontWeight: '800' }}>{user.email}</b></div>
        <form action={async () => { 'use server'; const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }}>
          <button style={{ cursor: 'pointer', padding: '10px 20px', borderRadius: '12px', border: '2px solid #0f172a', background: 'transparent', fontWeight: '800' }}>Sign Out</button>
        </form>
      </header>

      {/* REQUIREMENT: Pass JWT token for 4-step pipeline */}
      <UploadForm sessionToken={session?.access_token || ''} />

      <div style={{ margin: '60px 0 32px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900' }}>Meme Feed</h2>
        <div style={{ height: '6px', width: '60px', backgroundColor: '#2563eb', marginTop: '12px', borderRadius: '10px' }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {captions?.map((caption: any) => {
          const score = caption.caption_votes?.reduce((acc: number, v: any) => acc + v.vote_value, 0) || 0;
          const imageUrl = caption.images?.url;

          return (
            <div key={caption.id} style={{ border: '2px solid #f1f5f9', borderRadius: '32px', backgroundColor: '#fff', boxShadow: '0 15px 30px -10px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              {imageUrl && (
                <div style={{ width: '100%', height: '400px', backgroundColor: '#f8fafc' }}>
                  <img
                    src={imageUrl}
                    alt="Meme"
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ padding: '32px' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '32px', color: '#0f172a', lineHeight: '1.3' }}>
                  {caption.content}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '2px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: '1.1rem', color: '#475569', fontWeight: '600' }}>Score: </span>
                    <b style={{ fontSize: '1.4rem', color: score > 0 ? '#10b981' : (score < 0 ? '#ef4444' : '#0f172a') }}>{score}</b>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="1" />
                      <button type="submit" style={{ cursor: 'pointer', width: '56px', height: '56px', borderRadius: '18px', border: '2px solid #e2e8f0', backgroundColor: '#fff', fontSize: '1.5rem' }}>👍</button>
                    </form>
                    <form action={handleVote}>
                      <input type="hidden" name="captionId" value={caption.id} /><input type="hidden" name="voteValue" value="-1" />
                      <button type="submit" style={{ cursor: 'pointer', width: '56px', height: '56px', borderRadius: '18px', border: '2px solid #e2e8f0', backgroundColor: '#fff', fontSize: '1.5rem' }}>👎</button>
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