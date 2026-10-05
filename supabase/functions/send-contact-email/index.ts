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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const { nom, email, message } = await req.json()

    // Lire les settings avec le service role (accÃ¨s complet)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['email_provider', 'email_expediteur', 'email_nom', 'smtp_password'])

    const s: Record<string, string> = {}
    ;(rows ?? []).forEach((r: { key: string; value: string }) => { s[r.key] = r.value || '' })

    const provider     = s['email_provider']  || 'resend'
    const destinataire = s['email_expediteur']           // la boite mail configurÃ©e = destinataire
    const nomExpOrga   = s['email_nom']        || "L'univers crÃ©atif d'AnaÃ¯s"

    if (!destinataire) {
      return new Response(
        JSON.stringify({ error: 'Aucune adresse email configurÃ©e dans les Connecteurs.' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    // â”€â”€ Resend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (provider === 'resend') {
      const apiKey = s['smtp_password']
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'ClÃ© API Resend manquante dans les Connecteurs.' }),
          { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        )
      }

      const htmlBody = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1A1040;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">âœ‰ï¸ Nouveau message de contact</h1>
            <p style="color:#a78bfa;margin:6px 0 0;font-size:13px;">${nomExpOrga}</p>
          </div>
          <div style="background:#fff;padding:24px;border:2px solid #1A1040;border-top:none;border-radius:0 0 12px 12px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#555;width:90px;vertical-align:top;">PrÃ©nom</td>
                <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#1A1040;">${nom}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#555;vertical-align:top;">Email</td>
                <td style="padding:8px 0;font-size:14px;color:#1A1040;">
                  <a href="mailto:${email}" style="color:#7c3aed;">${email}</a>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#555;margin:16px 0 8px;">Message :</p>
            <div style="background:#fef9c3;padding:16px;border-radius:8px;border-left:4px solid #1A1040;font-size:14px;color:#1A1040;line-height:1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color:#aaa;font-size:11px;margin-top:24px;">
              RÃ©pondre directement Ã  cet email rÃ©pondra Ã  ${email}.
            </p>
          </div>
        </div>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Formulaire Contact <onboarding@resend.dev>',
          to:       [destinataire],
          reply_to: email,
          subject:  `âœ‰ï¸ Nouveau message de ${nom}`,
          html:     htmlBody,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Resend error:', errText)
        return new Response(JSON.stringify({ error: errText }), {
          status: 500,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // â”€â”€ SMTP / Gmail â€” non supportÃ© en Edge Function native â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return new Response(
      JSON.stringify({ error: 'Seul Resend est supportÃ© pour l\'envoi automatique. Utilisez Resend dans vos Connecteurs.' }),
      { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
