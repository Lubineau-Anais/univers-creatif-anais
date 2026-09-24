// Fonction planifiée : ping Supabase toutes les 3 jours pour éviter la mise en veille.
export const config = { schedule: '0 8 */3 * *' }

export default async () => {
  const url  = process.env.VITE_SUPABASE_URL
  const key  = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('keep-alive: variables Supabase manquantes')
    return
  }

  const res = await fetch(`${url}/rest/v1/settings?select=key&limit=1`, {
    headers: {
      apikey:        key,
      Authorization: `Bearer ${key}`,
    },
  })

  console.log(`keep-alive: Supabase ping → ${res.status} ${res.statusText}`)
}
