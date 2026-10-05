import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const allowed = origin === 'http://localhost:5173' ? origin : 'https://lunivers-creatif-danais.fr'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

async function getApiKey(): Promise<string | null> {
  // Priorité 1 : secret Deno (défini dans Supabase > Settings > Edge Functions > Secrets)
  const envKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (envKey) return envKey

  // Priorité 2 : settings table (lecture côté serveur via service role)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data } = await supabase
    .from('settings').select('value').eq('key', 'google_places_api_key').single()
  return data?.value ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const body = await req.json()
    const { cid, query, action, placeId: bodyPlaceId } = body

    const apiKey = await getApiKey()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Clé API Google Places non configurée' }), {
        status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── Mode reviews : récupère les avis d'un établissement ──────────────────
    if (action === 'reviews') {
      const placeId = bodyPlaceId
      if (!placeId) {
        return new Response(JSON.stringify({ error: 'placeId requis' }), {
          status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
        { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'reviews' } },
      )
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── Mode lookup : trouve le placeId depuis un CID ou une recherche texte ─
    let placeId: string | null = null
    let name: string | null = null

    if (cid) {
      const params = new URLSearchParams({ cid, fields: 'place_id,name', key: apiKey })
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
      const data = await res.json()
      if (data.status === 'OK' && data.result?.place_id) {
        placeId = data.result.place_id
        name = data.result.name
      } else {
        return new Response(JSON.stringify({ error: data.status, message: data.error_message }), {
          status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    } else if (query) {
      const params = new URLSearchParams({
        input: query,
        inputtype: 'textquery',
        fields: 'place_id,name',
        locationbias: 'point:47.3783788,-2.0239204',
        language: 'fr',
        key: apiKey,
      })
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`)
      const data = await res.json()
      if (data.status === 'OK' && data.candidates?.[0]) {
        placeId = data.candidates[0].place_id
        name = data.candidates[0].name
      } else {
        return new Response(JSON.stringify({ error: data.status, message: data.error_message, candidates: data.candidates }), {
          status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    } else {
      return new Response(JSON.stringify({ error: 'action, cid ou query requis' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ placeId, name }), {
      status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
