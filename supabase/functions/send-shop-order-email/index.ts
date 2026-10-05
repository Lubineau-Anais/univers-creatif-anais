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

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrice(n: number) {
  return n.toFixed(2).replace('.', ',') + ' â‚¬'
}

// â”€â”€â”€ Email client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildEmailClient(params: {
  prenom: string
  mode: 'mondial_relay' | 'click_and_collect'
  articles: { name: string; quantity: number; price: number }[]
  sous_total: number
  frais_livraison: number
  remise: number
  total: number
  code_promo: string | null
  relay_nom: string | null
  relay_adresse: string | null
  relay_cp: string | null
  relay_ville: string | null
}) {
  const { prenom, mode, articles, sous_total, frais_livraison, remise, total, code_promo,
    relay_nom, relay_adresse, relay_cp, relay_ville } = params

  const isMR = mode === 'mondial_relay'

  const messageHtml = isMR
    ? `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Merci mille fois pour votre commande sur <strong>L'Univers crÃ©atif d'AnaÃ¯s</strong> ! ðŸ¥°
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Votre petite pÃ©pite est en cours de prÃ©paration et va bientÃ´t prendre la route direction votre point relais Mondial Relay prÃ©fÃ©rÃ© !
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Un email de suivi vous prÃ©viendra dÃ¨s que le colis sera pris en charge, pour surveiller son voyage jusqu'Ã  vous.
      </p>
      <div style="background:#fef9c3;border:2px solid #fde047;border-radius:12px;padding:14px;margin:20px 0;">
        <p style="color:#713f12;font-size:14px;margin:0;line-height:1.6;">
          â±ï¸ <strong>Petite prÃ©cision pour les crÃ©ations sur demande :</strong> un dÃ©lai de rÃ©alisation de 3 semaines est Ã  prÃ©voir (comme indiquÃ© sur le site) le temps de crÃ©er votre piÃ¨ce avec tout le soin qu'elle mÃ©rite !
        </p>
      </div>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Merci de faire vivre la boutique, c'est toujours une joie de crÃ©er pour vous ! ðŸ’›
      </p>`
    : `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Merci pour votre commande sur <strong>L'Univers crÃ©atif d'AnaÃ¯s</strong> ! ðŸ¥°
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Votre crÃ©ation (prÃ©parÃ©e avec tout mon cÅ“ur) est en cours de prÃ©paration, et vous pourrez venir la rÃ©cupÃ©rer directement en click &amp; collect dÃ¨s qu'elle sera prÃªte !
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Je vous prÃ©viens par message dÃ¨s qu'elle vous attend bien sagement, prÃªte Ã  Ãªtre rÃ©cupÃ©rÃ©e sur <strong>PRINQUIAU (44260)</strong>.
      </p>
      <div style="background:#fef9c3;border:2px solid #fde047;border-radius:12px;padding:14px;margin:20px 0;">
        <p style="color:#713f12;font-size:14px;margin:0;line-height:1.6;">
          â±ï¸ <strong>Petite prÃ©cision pour les crÃ©ations sur demande :</strong> un dÃ©lai de rÃ©alisation de 3 semaines est Ã  prÃ©voir (comme indiquÃ© sur le site) le temps de crÃ©er votre piÃ¨ce avec tout le soin qu'elle mÃ©rite !
        </p>
      </div>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        HÃ¢te de vous voir bientÃ´t et merci pour votre confiance ! ðŸ’›
      </p>`

  const relayBlock = isMR && relay_nom
    ? `<div style="background:#eff6ff;border:2px solid #93c5fd;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#1e40af;margin:0 0 6px;font-size:14px;">ðŸ“¦ Livraison chez :</p>
        <p style="margin:2px 0;color:#1e40af;font-size:14px;font-weight:700;">${escapeHtml(relay_nom ?? '')}</p>
        <p style="margin:2px 0;color:#3b82f6;font-size:13px;">${escapeHtml(relay_adresse ?? '')} â€” ${escapeHtml(relay_cp ?? '')} ${escapeHtml(relay_ville ?? '')}</p>
      </div>`
    : ''

  const articlesRows = articles.map(a => `
    <tr>
      <td style="padding:6px 0;color:#374151;font-size:13px;">${escapeHtml(a.name)} Ã—${a.quantity}</td>
      <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:13px;text-align:right;">${formatPrice(a.price * a.quantity)}</td>
    </tr>`).join('')

  const remiseRow = remise > 0
    ? `<tr>
        <td style="padding:4px 0;color:#16a34a;font-size:13px;">RÃ©duction${code_promo ? ` (${escapeHtml(code_promo)})` : ''}</td>
        <td style="padding:4px 0;color:#16a34a;font-weight:700;font-size:13px;text-align:right;">-${formatPrice(remise)}</td>
      </tr>`
    : ''

  const livraisonLabel = isMR ? 'ðŸ“¦ Mondial Relay' : 'ðŸª Click &amp; Collect (gratuit)'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">
      <tr><td style="background:#1A1040;padding:32px 36px;text-align:center;border-radius:20px 20px 0 0;border:3px solid #1A1040;">
        <p style="color:#ffe500;font-size:26px;font-weight:900;margin:0;">âœ¨ L'Univers CrÃ©atif d'AnaÃ¯s</p>
        <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:8px 0 0;">${isMR ? 'ðŸ“¦ Commande en cours !' : 'ðŸŽ Commande en cours !'}</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 36px;border-left:3px solid #1A1040;border-right:3px solid #1A1040;">
        <p style="font-size:22px;font-weight:900;color:#1A1040;margin:0 0 20px;">Coucou ${escapeHtml(prenom)} ! ðŸ§¶</p>
        ${messageHtml}
        ${relayBlock}

        <!-- RÃ©capitulatif commande -->
        <div style="background:#fdf2f8;border:2px solid #fbcfe8;border-radius:16px;padding:22px;margin:24px 0 0;">
          <p style="font-weight:900;color:#1A1040;font-size:15px;margin:0 0 14px;">ðŸ›ï¸ RÃ©capitulatif de votre commande</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${articlesRows}
            <tr><td colspan="2" style="padding:8px 0 0;border-top:1px dashed #fbcfe8;"></td></tr>
            <tr>
              <td style="padding:4px 0;color:#9ca3af;font-size:13px;">Sous-total</td>
              <td style="padding:4px 0;color:#374151;font-weight:700;font-size:13px;text-align:right;">${formatPrice(sous_total)}</td>
            </tr>
            ${remiseRow}
            <tr>
              <td style="padding:4px 0;color:#9ca3af;font-size:13px;">${livraisonLabel}</td>
              <td style="padding:4px 0;color:${frais_livraison === 0 ? '#16a34a' : '#374151'};font-weight:700;font-size:13px;text-align:right;">${frais_livraison > 0 ? formatPrice(frais_livraison) : 'Gratuit'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;color:#1A1040;font-weight:900;font-size:17px;border-top:2px dashed #fbcfe8;">Total payÃ©</td>
              <td style="padding:10px 0 0;color:#ec4899;font-weight:900;font-size:20px;border-top:2px dashed #fbcfe8;text-align:right;">${formatPrice(total)}</td>
            </tr>
          </table>
        </div>

        <!-- Contact -->
        <div style="border-top:2px dashed #fbcfe8;padding-top:18px;margin-top:24px;">
          <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Une question sur votre commande ?</p>
          <p style="margin:4px 0;font-size:13px;color:#374151;">ðŸ“§ <a href="mailto:univers.creatif.anais@outlook.com" style="color:#ec4899;text-decoration:none;">univers.creatif.anais@outlook.com</a></p>
          <p style="margin:4px 0;font-size:13px;color:#374151;">ðŸ“ž <a href="tel:+33626711479" style="color:#ec4899;text-decoration:none;">06 26 71 14 79</a></p>
        </div>
      </td></tr>
      <tr><td style="background:#fdf2f8;padding:24px 36px;text-align:center;border-radius:0 0 20px 20px;border:3px solid #1A1040;border-top:2px solid #fbcfe8;">
        <p style="color:#ec4899;font-weight:900;font-size:16px;margin:0 0 8px;">Ã€ trÃ¨s vite ! ðŸŒ¸</p>
        <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 2px;">AnaÃ¯s</p>
        <p style="color:#374151;font-size:13px;margin:0 0 2px;">L'Univers CrÃ©atif d'AnaÃ¯s</p>
        <p style="color:#6b7280;font-size:12px;margin:0;"><a href="https://luniverscreatifdanais.fr" style="color:#ec4899;text-decoration:none;">luniverscreatifdanais.fr</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// â”€â”€â”€ Email admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildEmailAdmin(params: {
  prenom: string; nom: string; email: string; telephone: string
  mode: 'mondial_relay' | 'click_and_collect'
  articles: { name: string; quantity: number; price: number }[]
  sous_total: number; frais_livraison: number; remise: number; total: number
  code_promo: string | null
  relay_nom: string | null; relay_adresse: string | null; relay_cp: string | null; relay_ville: string | null
  nomOrga: string
}) {
  const { prenom, nom, email, telephone, mode, articles, sous_total, frais_livraison,
    remise, total, code_promo, relay_nom, relay_adresse, relay_cp, relay_ville, nomOrga } = params
  const isMR = mode === 'mondial_relay'

  const articlesHtml = articles.map(a =>
    `<p style="margin:3px 0;color:#374151;font-size:14px;">â€¢ ${escapeHtml(a.name)} Ã—${a.quantity} â€” <strong>${formatPrice(a.price * a.quantity)}</strong></p>`
  ).join('')

  const relayHtml = isMR && relay_nom
    ? `<div style="background:#eff6ff;border:2px solid #93c5fd;border-radius:10px;padding:10px;margin:10px 0;">
        <p style="font-weight:900;color:#1e40af;margin:0 0 4px;font-size:13px;">ðŸ“¦ Point relais</p>
        <p style="margin:2px 0;color:#3b82f6;font-size:13px;">${escapeHtml(relay_nom)} â€” ${escapeHtml(relay_adresse ?? '')} ${escapeHtml(relay_cp ?? '')} ${escapeHtml(relay_ville ?? '')}</p>
      </div>`
    : '<p style="margin:4px 0;color:#6b7280;font-size:13px;">ðŸª Click &amp; Collect</p>'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;border:3px solid #1A1040;overflow:hidden;">
  <div style="background:#ffe500;padding:22px 28px;border-bottom:3px solid #1A1040;">
    <p style="font-weight:900;color:#1A1040;font-size:20px;margin:0;">ðŸ›ï¸ Nouvelle commande boutique !</p>
    <p style="color:#1A1040;font-size:13px;margin:6px 0 0;opacity:0.7;">${nomOrga}</p>
  </div>
  <div style="padding:24px 28px;">
    <p style="font-weight:900;color:#1A1040;font-size:16px;margin:0 0 8px;">ðŸ‘¤ Client</p>
    <p style="margin:4px 0;color:#374151;font-size:15px;"><strong>${escapeHtml(prenom)} ${escapeHtml(nom)}</strong></p>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">ðŸ“§ <a href="mailto:${escapeHtml(email)}" style="color:#ec4899;">${escapeHtml(email)}</a></p>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">ðŸ“ž ${escapeHtml(telephone || 'â€”')}</p>
    <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0;">
      <p style="font-weight:900;color:#1A1040;font-size:14px;margin:0 0 10px;">ðŸ“¦ Articles</p>
      ${articlesHtml}
      <div style="border-top:1px dashed #e5e7eb;margin-top:10px;padding-top:10px;">
        ${remise > 0 ? `<p style="margin:3px 0;font-size:13px;color:#16a34a;">RÃ©duction${code_promo ? ` (${escapeHtml(code_promo)})` : ''} : -${formatPrice(remise)}</p>` : ''}
        <p style="margin:3px 0;font-size:13px;color:#6b7280;">Sous-total : ${formatPrice(sous_total)}</p>
        <p style="margin:3px 0;font-size:13px;color:#6b7280;">Livraison : ${frais_livraison > 0 ? formatPrice(frais_livraison) : 'Gratuit'}</p>
        <p style="margin:8px 0 0;font-size:20px;font-weight:900;color:#ec4899;">Total : ${formatPrice(total)}</p>
      </div>
    </div>
    ${relayHtml}
  </div>
</div>
</body></html>`
}

// â”€â”€â”€ Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(req) })

  try {
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

    const apiKey     = s['smtp_password']
    const adminEmail = s['email_expediteur']
    const nomOrga    = s['email_nom'] || "L'Univers CrÃ©atif d'AnaÃ¯s"

    if (!apiKey || !adminEmail) {
      return new Response(
        JSON.stringify({ error: 'Resend non configurÃ©. VÃ©rifiez les Connecteurs dans le tableau de bord.' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const data = await req.json()
    const {
      client_prenom, client_nom, client_email, client_telephone,
      mode_livraison, articles,
      sous_total, frais_livraison, remise, total, code_promo,
      relay_nom, relay_adresse, relay_cp, relay_ville,
    } = data

    const mode: 'mondial_relay' | 'click_and_collect' =
      mode_livraison === 'mondial_relay' ? 'mondial_relay' : 'click_and_collect'

    const htmlClient = buildEmailClient({
      prenom: client_prenom, mode, articles: articles ?? [],
      sous_total, frais_livraison, remise, total, code_promo: code_promo ?? null,
      relay_nom: relay_nom ?? null, relay_adresse: relay_adresse ?? null,
      relay_cp: relay_cp ?? null, relay_ville: relay_ville ?? null,
    })

    const htmlAdmin = buildEmailAdmin({
      prenom: client_prenom, nom: client_nom, email: client_email, telephone: client_telephone,
      mode, articles: articles ?? [],
      sous_total, frais_livraison, remise, total, code_promo: code_promo ?? null,
      relay_nom: relay_nom ?? null, relay_adresse: relay_adresse ?? null,
      relay_cp: relay_cp ?? null, relay_ville: relay_ville ?? null,
      nomOrga,
    })

    async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
      const body: Record<string, unknown> = {
        from: `${nomOrga} <reservation@luniverscreatifdanais.fr>`,
        to: [to], subject, html,
      }
      if (replyTo) body['reply_to'] = replyTo
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
    }

    const isMR = mode === 'mondial_relay'
    const clientSubject = isMR
      ? 'Votre commande est en cours ! ðŸ“¦âœ¨'
      : 'Votre commande est en cours ! ðŸŽ'

    await Promise.all([
      sendEmail(client_email, clientSubject, htmlClient),
      sendEmail(adminEmail, `ðŸ›ï¸ Nouvelle commande â€” ${client_prenom} ${client_nom}`, htmlAdmin, client_email),
    ])

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[send-shop-order-email]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
