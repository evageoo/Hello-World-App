import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  // Function to handle login
  async function signIn() {
    'use server'
    const supabase = await createClient()
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // This MUST match the /auth/callback route we create next
        redirectTo: `http://localhost:3000/auth/callback`,
      },
    })

    if (data.url) {
      redirect(data.url)
    }
  }

  // 1. If NOT logged in, show this:
  if (!user) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Assignment #3: Gated UI</h1>
        <p>Please sign in to view the university list.</p>
        <form action={signIn}>
          <button style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Sign in with Google
          </button>
        </form>
      </main>
    )
  }

  // 2. If logged in, show the data from Assignment #2:
  const { data: universities } = await supabase.from('universities').select('*')

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome, {user.email}</h1>
      <p>You have accessed the protected university list.</p>
      <hr />
      <ul>
        {universities?.map((uni: any) => (
          <li key={uni.id}>{uni.name}</li>
        ))}
      </ul>
    </main>
  )
}