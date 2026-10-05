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

interface CatInfo {
  emoji: string; couleur: string; message: string; apporter: string; stationnement?: string
}

function getCatInfo(categorie: string): CatInfo {
  const n = categorie.toLowerCase().normalize('NFD').replace(/[Ì€-Í¯]/g, '')
  if (n.includes('couture')) return {
    emoji: 'ðŸ§µ', couleur: '#ec4899',
    message: "Je me permets de vous contacter pour vous rappeler votre participation Ã  l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `<ul style="margin:8px 0 4px;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
      <li>Votre machine Ã  coudre et vos canettes !</li>
      <li>Une tenue confortable adaptÃ©e aux activitÃ©s manuelles</li>
      <li>Votre bonne humeur !</li>
    </ul>
    <p style="margin:8px 0 0;color:#15803d;font-size:14px;">Le reste du matÃ©riel pour l'atelier est fourni.</p>`,
    stationnement: "Des places de stationnement sont prÃ©vues dans la cour Ã  l'arriÃ¨re de la maison, merci de vous stationner de maniÃ¨re Ã  laisser la place Ã  6 voitures maximum.",
  }
  if (n.includes('macrame') || n.includes('macramÃ©')) return {
    emoji: 'ðŸª¢', couleur: '#f97316',
    message: "Je me permets de vous contacter pour vous rappeler votre participation Ã  l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `<ul style="margin:8px 0 4px;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
      <li>Une tenue confortable adaptÃ©e aux activitÃ©s manuelles</li>
      <li>Votre bonne humeur !</li>
    </ul>
    <p style="margin:8px 0 0;color:#15803d;font-size:14px;">Le reste du matÃ©riel pour l'atelier est fourni.</p>`,
    stationnement: "Des places de stationnement sont prÃ©vues dans la cour Ã  l'arriÃ¨re de la maison, merci de vous stationner de maniÃ¨re Ã  laisser la place Ã  6 voitures maximum.",
  }
  if (n.includes('resine') || n.includes('rÃ©sine') || n.includes('bijou')) return {
    emoji: 'ðŸ’Ž', couleur: '#8b5cf6',
    message: "Je me permets de vous contacter pour vous rappeler votre participation Ã  l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `<ul style="margin:8px 0 4px;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
      <li>Une tenue confortable adaptÃ©e aux activitÃ©s manuelles</li>
      <li>Votre bonne humeur !</li>
    </ul>
    <p style="margin:8px 0 0;color:#15803d;font-size:14px;">Le reste du matÃ©riel pour l'atelier est fourni.</p>`,
    stationnement: "Des places de stationnement sont prÃ©vues dans la cour Ã  l'arriÃ¨re de la maison, merci de vous stationner de maniÃ¨re Ã  laisser la place Ã  6 voitures maximum.",
  }
  return {
    emoji: 'ðŸŽ¨', couleur: '#14b8a6',
    message: "Je me permets de vous contacter pour vous rappeler votre participation Ã  l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `<p style="margin:0;color:#15803d;font-size:14px;line-height:1.6;">Tout le matÃ©riel nÃ©cessaire est fourni. Ã€ trÃ¨s bientÃ´t !</p>`,
    stationnement: "Des places de stationnement sont prÃ©vues dans la cour Ã  l'arriÃ¨re de la maison, merci de vous stationner de maniÃ¨re Ã  laisser la place Ã  6 voitures maximum.",
  }
}

function modeLabel(mode: string) {
  return ({ cb: 'Carte bancaire', virement: 'Virement bancaire', cheque: 'ChÃ¨que', especes: 'EspÃ¨ces' })[mode] ?? mode
}

function calcTotal(prix: number, prixType: string, nb: number) {
  return prixType === 'duo' ? prix * Math.ceil(nb / 2) : prix * nb
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function buildEmailRappel(params: {
  prenom: string; nom: string; atelier_titre: string; dateFormatted: string
  heure: string; duree: string; lieu: string; mode_paiement: string; statut_paiement: string
  nb_personnes: number; personnes_sup: { prenom: string; nom: string; age: string }[]
  total: number; catInfo: CatInfo; reference: string; jours: 7 | 1
}) {
  const { prenom, nom, atelier_titre, dateFormatted, heure, duree, lieu,
    mode_paiement, statut_paiement, nb_personnes, personnes_sup, total, catInfo, reference, jours } = params

  const bannerBg    = jours === 7 ? '#f97316' : '#ec4899'
  const bannerText  = jours === 7 ? 'ðŸ“… Rappel â€” Dans 7 jours !' : 'â° Rappel â€” C\'est demain !'
  const bannerSub   = jours === 7 ? 'Votre atelier approche, voici toutes les informations.' : 'Votre atelier a lieu demain, prÃ©parez-vous !'

  const allParticipants = [
    `${prenom} ${nom}`,
    ...(personnes_sup ?? []).map((p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`),
  ]
  const participantsListHtml = allParticipants
    .map(name => `<span style="display:block;color:#374151;font-size:13px;font-weight:600;">â€¢ ${name}</span>`)
    .join('')

  const introHtml = catInfo.message.replace('{ATELIER}', atelier_titre)

  // Bloc paiement uniquement si non encore payÃ©
  const paiementBlock = (mode_paiement === 'virement' && statut_paiement !== 'paye') ? `
    <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="font-weight:900;color:#92400e;margin:0 0 8px;font-size:15px;">âš ï¸ Rappel rÃ¨glement</p>
      <p style="margin:0;color:#92400e;font-size:14px;">Votre rÃ¨glement de <strong>${total} â‚¬</strong> par virement bancaire est attendu avant le dÃ©but de l'atelier.</p>
    </div>` : ''

  const stationnementBlock = catInfo.stationnement
    ? `<div style="background:#fefce8;border:2px solid #fde047;border-radius:12px;padding:18px;margin:20px 0;">
        <p style="font-weight:900;color:#713f12;margin:0 0 8px;font-size:15px;">ðŸ…¿ï¸ Stationnement</p>
        <p style="margin:0;color:#854d0e;font-size:14px;line-height:1.6;">${catInfo.stationnement}</p>
      </div>` : ''

  const gdprBlock = `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="font-weight:700;color:#374151;margin:0 0 6px;font-size:13px;">ðŸ”’ Protection de vos donnÃ©es personnelles</p>
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;line-height:1.6;">
        Vous recevez cet e-mail dans le cadre de votre rÃ©servation Ã  un atelier. Vos donnÃ©es sont utilisÃ©es uniquement pour la gestion de votre inscription et des communications liÃ©es Ã  l'Ã©vÃ©nement.
      </p>
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
        Pour toute question relative Ã  vos donnÃ©es personnelles ou pour exercer vos droits, vous pouvez me contacter Ã 
        <a href="mailto:univers.creatif.anais@outlook.com" style="color:#ec4899;">univers.creatif.anais@outlook.com</a>.
      </p>
    </div>`

  const contactBlock = `
    <div style="border-top:2px dashed #fbcfe8;padding-top:16px;margin-top:4px;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Si vous avez une question ou si vous ne pouvez finalement pas participer, merci de me prÃ©venir dÃ¨s que possible :</p>
      <p style="margin:4px 0;font-size:13px;color:#374151;">ðŸ“§ <a href="mailto:univers.creatif.anais@outlook.com" style="color:#ec4899;text-decoration:none;">univers.creatif.anais@outlook.com</a></p>
      <p style="margin:4px 0;font-size:13px;color:#374151;">ðŸ“ž <a href="tel:+33626711479" style="color:#ec4899;text-decoration:none;">06 26 71 14 79</a></p>
    </div>`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">
      <tr><td style="background:#1A1040;padding:32px 36px;text-align:center;border-radius:20px 20px 0 0;border:3px solid #1A1040;">
        <p style="color:#ffe500;font-size:26px;font-weight:900;margin:0;">âœ¨ L'Univers CrÃ©atif d'AnaÃ¯s</p>
        <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:8px 0 0;">Rappel de rÃ©servation</p>
      </td></tr>
      <!-- BanniÃ¨re rappel -->
      <tr><td style="background:${bannerBg};padding:16px 36px;text-align:center;border-left:3px solid #1A1040;border-right:3px solid #1A1040;">
        <p style="color:white;font-size:20px;font-weight:900;margin:0;">${bannerText}</p>
        <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">${bannerSub}</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 36px;border-left:3px solid #1A1040;border-right:3px solid #1A1040;">
        <p style="font-size:22px;font-weight:900;color:#1A1040;margin:0 0 12px;">Bonjour ${prenom} ${catInfo.emoji}</p>
        <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.6;">${introHtml}</p>
        <div style="background:#fdf2f8;border:2px solid #fbcfe8;border-radius:16px;padding:22px;">
          <p style="font-weight:900;color:#1A1040;font-size:16px;margin:0 0 16px;">ðŸ“‹ RÃ©capitulatif de votre rÃ©servation</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;width:42%;vertical-align:top;">ðŸŽ¨ Atelier</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${atelier_titre}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">ðŸ“… Date</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;text-transform:capitalize;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">â° Horaire</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${heure} â€” durÃ©e ${duree}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">ðŸ“ Lieu</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${lieu}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">ðŸ‘¤ Participants</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${nb_personnes} personne${nb_personnes > 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="padding:2px 0 6px;color:#9ca3af;font-size:13px;vertical-align:top;">ðŸ‘¥ Inscrits</td>
              <td style="padding:2px 0 6px;">${participantsListHtml}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">ðŸ’³ RÃ¨glement</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${modeLabel(mode_paiement)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">ðŸ”– RÃ©fÃ©rence</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;font-family:monospace;">${reference}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;color:#9ca3af;font-size:13px;border-top:2px dashed #fbcfe8;vertical-align:top;">ðŸ’° Total</td>
              <td style="padding:10px 0 0;color:${catInfo.couleur};font-weight:900;font-size:22px;border-top:2px dashed #fbcfe8;">${total} â‚¬</td>
            </tr>
          </table>
        </div>
        ${paiementBlock}
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:18px;margin:20px 0;">
          <p style="font-weight:900;color:#166534;margin:0 0 8px;font-size:15px;">ðŸŽ’ Ã€ prÃ©voir</p>
          ${catInfo.apporter}
        </div>
        ${stationnementBlock}
        ${gdprBlock}
        ${contactBlock}
      </td></tr>
      <tr><td style="background:#fdf2f8;padding:24px 36px;text-align:center;border-radius:0 0 20px 20px;border:3px solid #1A1040;border-top:2px solid #fbcfe8;">
        <p style="color:#1A1040;font-size:15px;margin:0 0 6px;">J'ai hÃ¢te de vous accueillir et de partager ce moment crÃ©atif avec vous.</p>
        <p style="color:#ec4899;font-weight:900;font-size:16px;margin:0 0 12px;">Ã€ trÃ¨s bientÃ´t ! ðŸŒ¸</p>
        <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 2px;">AnaÃ¯s</p>
        <p style="color:#374151;font-size:13px;margin:0 0 2px;">L'Univers CrÃ©atif d'AnaÃ¯s</p>
        <p style="color:#6b7280;font-size:12px;margin:0 0 2px;">06 26 71 14 79</p>
        <p style="color:#d1d5db;font-size:12px;margin:0;"><a href="https://luniverscreatifdanais.fr" style="color:#ec4899;text-decoration:none;">luniverscreatifdanais.fr</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// â”€â”€â”€ Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Config email
    const { data: rows } = await supabase
      .from('settings').select('key, value')
      .in('key', ['smtp_password', 'email_expediteur', 'email_nom'])
    const s: Record<string, string> = {}
    ;(rows ?? []).forEach((r: { key: string; value: string }) => { s[r.key] = r.value || '' })

    const apiKey   = s['smtp_password']
    const nomOrga  = s['email_nom'] || "L'Univers CrÃ©atif d'AnaÃ¯s"

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Resend non configurÃ©' }), {
        status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Dates cibles
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const today = new Date()
    const todayStr = fmt(today)

    const d7 = new Date(today); d7.setDate(d7.getDate() + 7)
    const d1 = new Date(today); d1.setDate(d1.getDate() + 1)
    const date7jStr = fmt(d7)
    const date1jStr = fmt(d1)

    async function sendEmail(to: string, subject: string, html: string) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${nomOrga} <reservation@luniverscreatifdanais.fr>`, to: [to], subject, html }),
      })
      if (!res.ok) throw new Error(await res.text())
    }

    async function processRappels(dateStr: string, jours: 7 | 1) {
      // RÃ©cupÃ©rer les ateliers du jour cible
      const { data: ateliers } = await supabase
        .from('ateliers')
        .select('id, titre, date, heure, duree, lieu, prix, prix_type, category_id')
        .eq('date', dateStr)

      if (!ateliers?.length) return { sent: 0, errors: 0 }

      let sent = 0, errors = 0

      for (const atelier of ateliers) {
        // RÃ©cupÃ©rer la catÃ©gorie
        let categorie = 'Atelier crÃ©atif'
        if (atelier.category_id) {
          const { data: cat } = await supabase
            .from('atelier_categories').select('nom').eq('id', atelier.category_id).single()
          if (cat?.nom) categorie = cat.nom
        }

        // RÃ©cupÃ©rer les rÃ©servations
        let query = supabase
          .from('reservations')
          .select('id, prenom, nom, email, nb_personnes, personnes_sup, mode_paiement, statut_paiement')
          .eq('atelier_id', atelier.id)

        // Pour le rappel 7j : uniquement ceux inscrits avant aujourd'hui (> 7 jours avant l'atelier)
        if (jours === 7) {
          query = query.lt('created_at', `${todayStr}T00:00:00`)
        }

        const { data: reservations } = await query

        for (const r of (reservations ?? [])) {
          try {
            const total = calcTotal(atelier.prix, atelier.prix_type, r.nb_personnes)
            const catInfo = getCatInfo(categorie)
            const dateFormatted = formatDate(atelier.date)
            const reference = `RES-${r.id.substring(0, 8).toUpperCase()}`

            const html = buildEmailRappel({
              prenom: r.prenom, nom: r.nom, atelier_titre: atelier.titre,
              dateFormatted, heure: atelier.heure, duree: atelier.duree, lieu: atelier.lieu,
              mode_paiement: r.mode_paiement, statut_paiement: r.statut_paiement,
              nb_personnes: r.nb_personnes, personnes_sup: r.personnes_sup ?? [],
              total, catInfo, reference, jours,
            })

            const subjectEmoji = jours === 7 ? 'ðŸ“…' : 'â°'
            const subjectLabel = jours === 7 ? 'Dans 7 jours' : 'C\'est demain !'
            await sendEmail(
              r.email,
              `${subjectEmoji} Rappel â€” ${subjectLabel} â€” ${atelier.titre}`,
              html,
            )
            sent++
          } catch (e) {
            console.error(`Rappel ${jours}j Ã©chouÃ© pour ${r.email}:`, e)
            errors++
          }
        }
      }
      return { sent, errors }
    }

    const r7 = await processRappels(date7jStr, 7)
    const r1 = await processRappels(date1jStr, 1)

    const total = { sent: r7.sent + r1.sent, errors: r7.errors + r1.errors }
    console.log(`[send-reminder-emails] 7j: ${r7.sent} envoyÃ©s, 1j: ${r1.sent} envoyÃ©s, erreurs: ${total.errors}`)

    return new Response(JSON.stringify({ ok: true, rappels_7j: r7, rappels_1j: r1 }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[send-reminder-emails]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
