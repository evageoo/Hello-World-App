import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import UploadForm from '../components/UploadForm'

export default async function Home() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user || !session) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', color: '#000', backgroundColor: '#fff', minHeight: '100vh' }}>
        <h1>Caption Rater</h1>
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
          <button style={{ padding: '12px 24px', cursor: 'pointer' }}>Sign in with Google</button>
        </form>
      </main>
    )
  }

  // Use the original simple order to prevent jumping
  const { data: captions } = await supabase
    .from('captions')
    .select(`*, caption_votes(vote_value)`)
    .order('id', { ascending: true }) // <--- Original stable sorting

  async function handleVote(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const captionId = formData.get('captionId')
    const voteValue = formData.get('voteValue')
    const now = new Date().toISOString()

    await supabase.from('caption_votes').insert({
      caption_id: captionId,
      profile_id: user.id,
      vote_value: parseInt(voteValue as string),
      created_datetime_utc: now,
      modified_datetime_utc: now
    })
    revalidatePath('/')
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', color: '#000', backgroundColor: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>{user.email}</h3>
          <p style={{ margin: 0, color: '#3182ce', fontSize: '0.85rem' }}>Week 5 Finalized</p>
        </div>
        <form action={async () => {
          'use server';
          const supabase = await createClient();
          await supabase.auth.signOut();
          redirect('/');
        }}>
          <button style={{ cursor: 'pointer' }}>Sign Out</button>
        </form>
      </header>

      <UploadForm sessionToken={session.access_token} />

      <hr style={{ margin: '2rem 0', borderColor: '#eee' }} />
      <h2>Caption Feed</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {captions?.map((caption: any) => {
          const score = caption.caption_votes?.reduce((acc: number, v: any) => acc + v.vote_value, 0) || 0;
          return (
            <div key={caption.id} style={{ padding: '1.2rem', border: '1px solid #ddd', borderRadius: '10px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>{caption.content}</p>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>Score: {score}</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <form action={handleVote}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="1" />
                  <button type="submit" style={{ cursor: 'pointer' }}>👍 Upvote</button>
                </form>
                <form action={handleVote}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="-1" />
                  <button type="submit" style={{ cursor: 'pointer' }}>👎 Downvote</button>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}