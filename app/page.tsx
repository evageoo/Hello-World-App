import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. GATED UI: Login required
  if (!user) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>Caption Rater</h1>
        <p>Please sign in to vote on captions.</p>
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
          <button style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}>
            Sign in with Google
          </button>
        </form>
      </main>
    )
  }

  // 2. FETCH DATA: Get the captions to display
  const { data: captions } = await supabase.from('captions').select('*')

  // 3. SERVER ACTION: Insert the vote (Fixed for UUIDs)
  async function handleVote(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log("LOG: No user found.");
      return;
    }

    const captionId = formData.get('captionId')
    const voteValue = formData.get('voteValue')
    const now = new Date().toISOString()

    console.log("--- ATTEMPTING MUTATION ---");
    console.log("Caption ID (UUID):", captionId);

    const { error } = await supabase
      .from('caption_votes')
      .insert({
        // Removed Number() because your caption_id is a UUID string
        caption_id: captionId,
        profile_id: user.id,
        vote_value: parseInt(voteValue as string),
        created_datetime_utc: now,
        modified_datetime_utc: now
      })

    if (error) {
      console.error('CRITICAL DATABASE ERROR:', error.message);
      console.error('Full Error Object:', error);
    } else {
      console.log("SUCCESS: Row added to caption_votes");
      revalidatePath('/')
    }
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>User: {user.email}</h2>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>Assignment #4: Mutating Data</p>
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

      <hr style={{ margin: '1.5rem 0' }} />

      <h3>Captions</h3>

      {captions && captions.length > 0 ? (
        captions.map((caption: any) => (
          <div key={caption.id} style={{
            padding: '1.5rem',
            border: '1px solid #ddd',
            borderRadius: '12px',
            marginBottom: '1rem',
            backgroundColor: '#f9f9f9'
          }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '500', marginTop: 0 }}>{caption.text}</p>

            <div style={{ display: 'flex', gap: '15px' }}>
              <form action={handleVote}>
                <input type="hidden" name="captionId" value={caption.id} />
                <input type="hidden" name="voteValue" value="1" />
                <button type="submit" style={{
                  padding: '8px 16px', cursor: 'pointer', borderRadius: '6px',
                  border: '1px solid #4CAF50', backgroundColor: '#e8f5e9', fontWeight: 'bold'
                }}>
                  👍 Upvote
                </button>
              </form>

              <form action={handleVote}>
                <input type="hidden" name="captionId" value={caption.id} />
                <input type="hidden" name="voteValue" value="-1" />
                <button type="submit" style={{
                  padding: '8px 16px', cursor: 'pointer', borderRadius: '6px',
                  border: '1px solid #f44336', backgroundColor: '#ffebee', fontWeight: 'bold'
                }}>
                  👎 Downvote
                </button>
              </form>
            </div>
          </div>
        ))
      ) : (
        <p>No captions found in the database.</p>
      )}
    </main>
  )
}