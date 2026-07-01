import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Config ───────────────────────────────────────────────────────────────────
const RESEND_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const IBAN        = Deno.env.get('VIREMENT_IBAN')  ?? 'À renseigner dans les secrets Supabase (VIREMENT_IBAN)'
const BIC         = Deno.env.get('VIREMENT_BIC')   ?? 'À renseigner dans les secrets Supabase (VIREMENT_BIC)'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')    ?? 'univers.creatif.anais@outlook.com'
const FROM        = "L'Univers Créatif d'Anaïs <reservations@luniverscreatifdanais.fr>"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error: ${text}`)
  }
}

function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    cb: 'Carte bancaire', virement: 'Virement bancaire', cheque: 'Chèque', especes: 'Espèces',
  }
  return labels[mode] ?? mode
}

// ─── Infos par type d'atelier ─────────────────────────────────────────────────
interface CatInfo { emoji: string; couleur: string; message: string; apporter: string }

function getCatInfo(categorie: string): CatInfo {
  const n = categorie.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  if (n.includes('couture')) return {
    emoji: '🧵',
    couleur: '#ec4899',
    message: "Tu vas passer un moment créatif et détente pour apprendre ou perfectionner tes techniques de couture. Que tu sois débutante ou expérimentée, l'atelier est adapté à ton niveau !",
    apporter: "Pense à apporter tes lunettes de lecture si tu en as besoin. Tout le matériel de couture est fourni. Un carnet et un crayon pour noter tes astuces sont les bienvenus !",
  }

  if (n.includes('macrame') || n.includes('macramé')) return {
    emoji: '🪢',
    couleur: '#f97316',
    message: "Prépare-toi à un atelier doux et zen où tu apprendras les nœuds de base du macramé pour créer ta propre pièce décorative. Un moment suspendu entre tes mains !",
    apporter: "Tout le matériel (cordes, support, crochets) est fourni. Viens simplement avec de la bonne humeur et tes mains 🙌 Tu peux amener une bouteille d'eau.",
  }

  if (n.includes('resine') || n.includes('résine') || n.includes('bijou')) return {
    emoji: '💎',
    couleur: '#8b5cf6',
    message: "Tu vas créer de magnifiques bijoux en résine, personnalisés avec les couleurs, paillettes et éléments de ton choix. Chaque création est unique, comme toi !",
    apporter: "La résine et tous les matériaux sont fournis. Des vêtements que tu ne crains pas de tacher sont vivement conseillés — la résine ça pardonne peu ! 😄",
  }

  return {
    emoji: '🎨',
    couleur: '#14b8a6',
    message: "Un atelier créatif qui te promet un moment de détente, de découverte et de partage. Tu repartiras avec une création dont tu seras fière !",
    apporter: "Tout le matériel nécessaire est fourni. À très bientôt !",
  }
}

// ─── Email client ─────────────────────────────────────────────────────────────
function buildEmailClient(params: {
  prenom: string; nom: string; atelier_titre: string; dateFormatted: string
  heure: string; duree: string; lieu: string; mode_paiement: string
  nb_personnes: number; personnes_sup: { prenom: string; nom: string; age: string }[]
  total: number; catInfo: CatInfo
}) {
  const { prenom, nom, atelier_titre, dateFormatted, heure, duree, lieu,
    mode_paiement, nb_personnes, personnes_sup, total, catInfo } = params

  const paiementBlock = (() => {
    if (mode_paiement === 'virement') return `
      <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#1e40af;margin:0 0 10px;font-size:15px;">🏦 Coordonnées pour le virement bancaire</p>
        <p style="margin:0;color:#1e3a8a;font-size:14px;"><strong>IBAN :</strong> ${IBAN}</p>
        <p style="margin:6px 0 0;color:#1e3a8a;font-size:14px;"><strong>BIC :</strong> ${BIC}</p>
        <p style="margin:10px 0 0;color:#3b82f6;font-size:13px;font-weight:700;">⚠️ Le règlement doit être effectué avant le début de l'atelier.</p>
        <p style="margin:4px 0 0;color:#3b82f6;font-size:13px;">Merci d'indiquer ton nom et la date de l'atelier en référence du virement.</p>
      </div>`
    if (mode_paiement === 'cheque') return `
      <div style="background:#f5f3ff;border:2px solid #8b5cf6;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#6d28d9;margin:0 0 8px;font-size:15px;">📝 Règlement par chèque</p>
        <p style="margin:0;color:#6d28d9;font-size:14px;">Chèque à l'ordre de <strong>L'Univers Créatif d'Anaïs</strong>, à remettre le jour de l'atelier.</p>
      </div>`
    if (mode_paiement === 'especes') return `
      <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#92400e;margin:0 0 8px;font-size:15px;">💵 Règlement en espèces</p>
        <p style="margin:0;color:#92400e;font-size:14px;"><strong>L'appoint est obligatoire.</strong> Règlement sur place le jour de l'atelier.</p>
      </div>`
    return `
      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#15803d;margin:0 0 8px;font-size:15px;">✅ Paiement confirmé</p>
        <p style="margin:0;color:#15803d;font-size:14px;">Ton paiement par carte bancaire a bien été enregistré. Merci !</p>
      </div>`
  })()

  const supBlock = personnes_sup?.length > 0
    ? `<div style="margin:16px 0 0;">
        <p style="font-weight:900;color:#1A1040;font-size:14px;margin:0 0 6px;">👥 Participants supplémentaires :</p>
        ${personnes_sup.map(p => `<p style="margin:3px 0;color:#6b7280;font-size:13px;">• ${p.prenom} ${p.nom} (${p.age} ans)</p>`).join('')}
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

      <!-- Header -->
      <tr><td style="background:#1A1040;padding:32px 36px;text-align:center;border-radius:20px 20px 0 0;border:3px solid #1A1040;">
        <p style="color:#ffe500;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;">✨ L'Univers Créatif d'Anaïs</p>
        <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:8px 0 0;">Confirmation de réservation</p>
      </td></tr>

      <!-- Corps -->
      <tr><td style="background:#ffffff;padding:32px 36px;border-left:3px solid #1A1040;border-right:3px solid #1A1040;">

        <!-- Salutation -->
        <p style="font-size:22px;font-weight:900;color:#1A1040;margin:0 0 8px;">Bonjour ${prenom} ${catInfo.emoji}</p>
        <p style="color:#6b7280;font-size:15px;margin:0 0 6px;">
          Ta réservation pour l'atelier <strong style="color:#1A1040;">${atelier_titre}</strong> est confirmée !
        </p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">${catInfo.message}</p>

        <!-- Récap -->
        <div style="background:#fdf2f8;border:2px solid #fbcfe8;border-radius:16px;padding:22px;">
          <p style="font-weight:900;color:#1A1040;font-size:16px;margin:0 0 16px;">📋 Récapitulatif de ta réservation</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;width:35%;vertical-align:top;">📅 Date</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;text-transform:capitalize;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">⏰ Heure</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${heure} — durée ${duree}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">📍 Lieu</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${lieu}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">👤 Participants</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${nb_personnes} personne${nb_personnes > 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">💳 Mode de règlement</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${modeLabel(mode_paiement)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;color:#9ca3af;font-size:13px;border-top:2px dashed #fbcfe8;vertical-align:top;">💰 Total</td>
              <td style="padding:10px 0 0;color:${catInfo.couleur};font-weight:900;font-size:22px;border-top:2px dashed #fbcfe8;">${total} €</td>
            </tr>
          </table>
          ${supBlock}
        </div>

        <!-- Mode de paiement spécifique -->
        ${paiementBlock}

        <!-- Ce qu'il faut savoir -->
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:18px;">
          <p style="font-weight:900;color:#166534;margin:0 0 8px;font-size:15px;">🎒 Ce qu'il faut savoir</p>
          <p style="margin:0;color:#15803d;font-size:14px;line-height:1.6;">${catInfo.apporter}</p>
        </div>

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#fdf2f8;padding:24px 36px;text-align:center;border-radius:0 0 20px 20px;border:3px solid #1A1040;border-top:2px solid #fbcfe8;">
        <p style="color:#ec4899;font-weight:900;font-size:16px;margin:0 0 8px;">À très bientôt ! 🌸</p>
        <p style="color:#9ca3af;font-size:13px;margin:0 0 4px;">Une question ? Réponds directement à cet email.</p>
        <p style="color:#d1d5db;font-size:12px;margin:0;">
          <a href="https://luniverscreatifdanais.fr" style="color:#ec4899;text-decoration:none;">luniverscreatifdanais.fr</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Email admin (notification interne) ───────────────────────────────────────
function buildEmailAdmin(params: {
  prenom: string; nom: string; email: string; telephone: string
  atelier_titre: string; dateFormatted: string; heure: string; categorie: string
  mode_paiement: string; nb_personnes: number
  personnes_sup: { prenom: string; nom: string; age: string }[]
  total: number
}) {
  const { prenom, nom, email, telephone, atelier_titre, dateFormatted, heure,
    categorie, mode_paiement, nb_personnes, personnes_sup, total } = params

  const modeEmoji: Record<string, string> = { cb: '💳', virement: '🏦', cheque: '📝', especes: '💵' }
  const alerteVirement = mode_paiement === 'virement'
    ? `<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:12px;margin:14px 0;">
        <p style="font-weight:900;color:#dc2626;margin:0;font-size:14px;">⚠️ Virement attendu avant l'atelier — pensez à vérifier la réception.</p>
       </div>`
    : ''

  const supBlock = personnes_sup?.length > 0
    ? `<div style="margin:14px 0;">
        <p style="font-weight:700;color:#1A1040;font-size:14px;margin:0 0 6px;">👥 Participants supplémentaires :</p>
        ${personnes_sup.map(p => `<p style="margin:3px 0;color:#6b7280;font-size:13px;">• ${p.prenom} ${p.nom} (${p.age} ans)</p>`).join('')}
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;border:3px solid #1A1040;overflow:hidden;">

  <!-- Header -->
  <div style="background:#ffe500;padding:22px 28px;border-bottom:3px solid #1A1040;">
    <p style="font-weight:900;color:#1A1040;font-size:20px;margin:0;">🎟️ Nouvelle réservation !</p>
    <p style="color:#1A1040;font-size:14px;margin:6px 0 0;opacity:0.7;">${categorie} — ${atelier_titre}</p>
  </div>

  <!-- Corps -->
  <div style="padding:24px 28px;">

    <!-- Client -->
    <p style="font-weight:900;color:#1A1040;font-size:16px;margin:0 0 10px;">👤 Client</p>
    <p style="margin:4px 0;color:#374151;font-size:15px;"><strong>${prenom} ${nom}</strong></p>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">📧 <a href="mailto:${email}" style="color:#ec4899;">${email}</a></p>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">📞 ${telephone || '—'}</p>

    ${supBlock}

    <!-- Détails réservation -->
    <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0;">
      <p style="margin:4px 0;font-size:14px;color:#374151;">📅 <strong>${dateFormatted}</strong> à <strong>${heure}</strong></p>
      <p style="margin:6px 0;font-size:14px;color:#374151;">👤 <strong>${nb_personnes} participant${nb_personnes > 1 ? 's' : ''}</strong></p>
      <p style="margin:6px 0;font-size:14px;color:#374151;">
        ${modeEmoji[mode_paiement] ?? '💳'} <strong>${modeLabel(mode_paiement)}</strong>
      </p>
      <p style="margin:10px 0 0;font-size:20px;font-weight:900;color:#ec4899;">Total : ${total} €</p>
    </div>

    ${alerteVirement}

  </div>
</div>
</body>
</html>`
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const data = await req.json()
    const {
      atelier_titre, atelier_date, atelier_heure, atelier_duree, atelier_lieu,
      category_id, client_prenom, client_nom, client_email, client_telephone,
      mode_paiement, nb_personnes, personnes_sup, total,
    } = data

    // Récupérer le nom de la catégorie
    let categorie = 'Créatif'
    if (category_id) {
      const { data: cat } = await supabase
        .from('atelier_categories')
        .select('nom')
        .eq('id', category_id)
        .single()
      if (cat?.nom) categorie = cat.nom
    }

    const catInfo = getCatInfo(categorie)

    const dateFormatted = new Date(atelier_date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const subjectClient = `✅ Ta réservation est confirmée — ${atelier_titre}`
    const htmlClient = buildEmailClient({
      prenom: client_prenom, nom: client_nom, atelier_titre, dateFormatted,
      heure: atelier_heure, duree: atelier_duree, lieu: atelier_lieu,
      mode_paiement, nb_personnes, personnes_sup: personnes_sup ?? [], total, catInfo,
    })

    const subjectAdmin = `🎟️ Nouvelle réservation — ${client_prenom} ${client_nom} — ${atelier_titre}`
    const htmlAdmin = buildEmailAdmin({
      prenom: client_prenom, nom: client_nom, email: client_email, telephone: client_telephone,
      atelier_titre, dateFormatted, heure: atelier_heure, categorie,
      mode_paiement, nb_personnes, personnes_sup: personnes_sup ?? [], total,
    })

    await Promise.all([
      sendEmail(client_email, subjectClient, htmlClient),
      sendEmail(ADMIN_EMAIL, subjectAdmin, htmlAdmin),
    ])

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })

  } catch (err) {
    console.error('[send-reservation-email]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
