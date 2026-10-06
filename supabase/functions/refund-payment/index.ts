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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  // VÃ©rifie que l'appelant est un utilisateur authentifiÃ© (admin)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non autorisÃ©' }), {
      status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user || user.app_metadata?.is_admin !== true) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 403, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  try {
    const { payment_intent_id } = await req.json()

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'payment_intent_id manquant' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data } = await supabase
      .from('settings').select('value').eq('key', 'stripe_secret_key').single()
    const stripeSecretKey = data?.value

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'ClÃ© Stripe non configurÃ©e' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const res = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ payment_intent: payment_intent_id }),
    })

    const refund = await res.json()

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: refund.error?.message || 'Erreur Stripe lors du remboursement' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, refund_id: refund.id, status: refund.status }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
