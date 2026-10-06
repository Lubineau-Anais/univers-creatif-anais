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

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', since)
  if ((count ?? 0) >= maxRequests) return false
  await supabase.from('rate_limit_log').insert({ ip, endpoint })
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const ip = getClientIp(req)
    const allowed = await checkRateLimit(supabase, ip, 'payment-intent', 10, 60)
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Veuillez réessayer dans une heure.' }),
        { status: 429, headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Retry-After': '3600' } },
      )
    }

    const { amount, currency = 'eur', description, items } = await req.json()

    if (!amount || amount < 50) {
      return new Response(JSON.stringify({ error: 'Montant invalide (minimum 0.50 €)' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Validation du montant côté serveur pour les réservations d'ateliers
    if (items && Array.isArray(items) && items.length > 0) {
      const realItems = items.filter((i: { atelier_id: string }) => !i.atelier_id.startsWith('demo-'))
      if (realItems.length > 0) {
        const ids = realItems.map((i: { atelier_id: string }) => i.atelier_id)
        const { data: ateliers, error: atelierErr } = await supabase
          .from('ateliers').select('id, prix').in('id', ids)
        if (atelierErr || !ateliers) {
          return new Response(JSON.stringify({ error: 'Impossible de vérifier les prix' }), {
            status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          })
        }
        const expectedAmount = realItems.reduce((sum: number, item: { atelier_id: string; nb_personnes: number }) => {
          const atelier = ateliers.find((a: { id: string; prix: number }) => a.id === item.atelier_id)
          if (!atelier) return sum
          return sum + Math.round(atelier.prix * item.nb_personnes * 100)
        }, 0)
        if (Math.abs(amount - expectedAmount) > 1) {
          return new Response(JSON.stringify({ error: 'Montant invalide' }), {
            status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const { data } = await supabase
      .from('settings').select('value').eq('key', 'stripe_secret_key').single()
    const stripeSecretKey = data?.value

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'ClÃ© Stripe non configurÃ©e' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount)),
        currency,
        description: description || 'Atelier crÃ©atif',
        'payment_method_types[]': 'card',
      }),
    })

    const paymentIntent = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: paymentIntent.error?.message || 'Erreur Stripe' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ client_secret: paymentIntent.client_secret }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
