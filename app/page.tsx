import { createClient } from '@/utils/supabaseServer'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // --- 1. THE AUTH WALL (Fixed for Vercel & High Contrast) ---
  if (!user || authError) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#fff', padding: '60px', borderRadius: '48px', textAlign: 'center', border: '3px solid #000', boxShadow: '20px 20px 0px #000', maxWidth: '420px' }}>
          <h1 style={{ color: '#000', marginBottom: '8px', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.07em', fontStyle: 'italic', textTransform: 'uppercase' }}>Auth Required</h1>
          <p style={{ color: '#000', fontSize: '0.75rem', marginBottom: '40px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5 }}>Terminal Connection: Restricted</p>

          <form action={async () => {
            'use server'
            const supabase = await createClient()
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
              ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
              : 'http://localhost:3000'

            const { data } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${baseUrl}/auth/callback`
              },
            })
            if (data.url) redirect(data.url)
          }}>
            <button style={{ width: '100%', padding: '20px', backgroundColor: '#2563eb', color: 'white', border: '3px solid #000', borderRadius: '20px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 8px 0 #0044cc' }}>
              Initialize Admin Session
            </button>
          </form>
        </div>
      </main>
    )
  }

  // --- 2. THE SUPERADMIN CHECK (Security Requirement) ---
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_superadmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', border: '3px solid #ef4444', padding: '50px', borderRadius: '40px', boxShadow: '15px 15px 0 #ef4444' }}>
          <h1 style={{ color: '#ef4444', fontWeight: '900', fontSize: '2rem', textTransform: 'uppercase', italic: 'true' }}>Access Denied</h1>
          <p style={{ fontWeight: '700', marginTop: '10px' }}>User: {user.email}</p>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '20px' }}>You do not have the required SUPERADMIN permissions.</p>
        </div>
      </div>
    )
  }

  // --- 3. THE ADMIN DATA (Audit & Stats) ---
  const { data: scoreData } = await supabase.from('caption_scores').select('total_votes')
  const { data: topPerformers } = await supabase
    .from('caption_scores')
    .select('display_text, total_votes')
    .order('total_votes', { ascending: false })
    .limit(3)

  const totalRows = scoreData?.length || 0
  const avgVotes = totalRows > 0 ? (scoreData!.reduce((acc, curr) => acc + (curr.total_votes || 0), 0) / totalRows).toFixed(2) : 0

  const fetchAudit = async (table: string) => {
    const { data, count } = await supabase.from(table).select('created_by_user_id', { count: 'exact' }).limit(5)
    return { rows: data || [], total: count || 0 }
  }

  const audits = {
    Profiles: await fetchAudit('profiles'),
    Flavors: await fetchAudit('humor_flavors'),
    Steps: await fetchAudit('humor_flavor_steps'),
    Captions: await fetchAudit('captions')
  }

  return (
    <main style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', color: '#000' }}>
      <header style={{ maxWidth: '1100px', margin: '0 auto 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '4.5rem', fontWeight: '900', margin: 0, letterSpacing: '-0.08em', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: '0.9' }}>Admin Domain</h1>
          <p style={{ color: '#2563eb', fontWeight: '900', fontSize: '11px', letterSpacing: '0.4em', textTransform: 'uppercase', marginTop: '15px' }}>Michael_Audit_System_v12 // ONLINE</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, color: '#000', fontSize: '10px', fontWeight: '900', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Authenticated_Node</p>
          <p style={{ margin: 0, fontWeight: '900', fontSize: '16px', color: '#2563eb' }}>{user.email}</p>
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '50px', borderRadius: '40px', border: '4px solid #000', boxShadow: '15px 15px 0 #000' }}>
          <p style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.2em', opacity: 0.8 }}>AVG ENGAGEMENT</p>
          <h2 style={{ fontSize: '5rem', margin: '15px 0', fontWeight: '900', letterSpacing: '-0.05em' }}>{avgVotes}</h2>
          <p style={{ fontSize: '11px', fontWeight: '700' }}>VOTES / CAPTION_ID</p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '40px', border: '4px solid #000', boxShadow: '15px 15px 0 #000' }}>
          <p style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.2em', color: '#64748b', marginBottom: '25px' }}>TOP PERFORMERS</p>
          {topPerformers?.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '2px solid #f1f5f9' }}>
              <span style={{ fontWeight: '900', fontSize: '16px', fontStyle: 'italic' }}>"{p.display_text}"</span>
              <span style={{ color: '#2563eb', fontWeight: '900', fontSize: '18px' }}>{p.total_votes}pts</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '40px auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px' }}>
        {Object.entries(audits).map(([name, data]) => (
          <div key={name} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '30px', border: '3px solid #000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>{name.toUpperCase()}</h4>
              <span style={{ fontSize: '10px', fontWeight: '900', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '5px' }}>{data.total}</span>
            </div>
            {data.rows.map((r: any, i) => (
              <div key={i} style={{ fontSize: '9px', fontWeight: '700', fontFamily: 'monospace', backgroundColor: '#f8fafc', padding: '8px', marginBottom: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                AUDIT: {r.created_by_user_id?.substring(0, 12)}...
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ height: '60px' }} />
    </main>
  )
}