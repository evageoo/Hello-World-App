import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  // Check if a session exists
  const { data: { user } } = await supabase.auth.getUser()

  // Server Action for Sign In
  async function signIn() {
    'use server'
    const supabase = await createClient()

    // Determine the redirect URL based on environment
    // On Vercel, it uses the VERCEL_URL; locally, it defaults to localhost
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000'

    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
      },
    })

    if (data.url) {
      redirect(data.url)
    }
  }

  // Server Action for Sign Out
  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  // 1. GATED UI: If NOT logged in, show the login screen
  if (!user) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>Assignment #3: Protected Route</h1>
        <p>This content is gated. Please sign in with Google to continue.</p>
        <form action={signIn}>
          <button style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}>
            Sign in with Google
          </button>
        </form>
      </main>
    )
  }

  // 2. PROTECTED UI: If logged in, show the university data
  const { data: universities } = await supabase.from('universities').select('*')

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Welcome, {user.email}</h2>
        <form action={signOut}>
          <button style={{ cursor: 'pointer' }}>Sign Out</button>
        </form>
      </div>

      <p style={{ color: '#666' }}>You have successfully bypassed the gated UI.</p>
      <hr />

      <div style={{ marginTop: '2rem' }}>
        <h3>University List</h3>
        {universities?.map((uni: any) => (
          <div key={uni.id} style={{
            padding: '1rem',
            border: '1px solid #eee',
            marginBottom: '10px',
            borderRadius: '8px'
          }}>
            <strong>{uni.name}</strong>
          </div>
        ))}
      </div>
    </main>
  )
}