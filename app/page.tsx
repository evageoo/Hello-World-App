import { supabase } from '@/lib/supabaseClient';

export default async function Home() {
  // Fetching from the 'universities' table you found
  const { data: rows, error } = await supabase.from('universities').select('*');

  if (error) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Database Error</h1>
        <p style={{ color: 'red' }}>{error.message}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>University List</h1>
      <p>Data fetched from Supabase project: <code>qihsgnfjqmkjmoowyfbn</code></p>
      <hr />

      <div style={{ marginTop: '2rem' }}>
        {rows && rows.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {rows.map((university: any) => (
              <li
                key={university.id || Math.random()}
                style={{
                  padding: '1.5rem',
                  border: '1px solid #eaeaea',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                {/* Adjust 'name' if the column has a different name like 'university_name' */}
                <strong>{university.name || 'University Entry'}</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '10px', color: '#666' }}>
                  {JSON.stringify(university, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        ) : (
          <p>No universities found in the table.</p>
        )}
      </div>
    </main>
  );
}