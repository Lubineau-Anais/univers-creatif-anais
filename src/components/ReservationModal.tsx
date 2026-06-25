import { useState } from 'react'
import { X, ShoppingCart, Calendar, Clock, MapPin, Euro, CreditCard, BookCheck, Banknote, Landmark, Plus, Minus, UserPlus, ShoppingBag } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAtelierCart } from '../context/AtelierCartContext'
import { useCart } from '../context/CartContext'
import type { Atelier } from '../types'

// supabase import removed — saving happens in CartDrawer at checkout

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
)

const STRIPE_NOT_CONFIGURED =
  !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'pk_test_placeholder'

// ─── Types ────────────────────────────────────────────────────────────────────
type ModePaiement = 'cb' | 'virement' | 'cheque' | 'especes' | ''

interface PersonneSup { prenom: string; nom: string; age: string }

interface FormData {
  prenom: string; nom: string; age: string; email: string
  telephone: string; paiement: ModePaiement
}

interface Props {
  atelier: Atelier
  onClose: () => void
  onReserved: () => void
}

const MODES_INFO: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  cb:       { label: 'CB',       icon: <CreditCard className="w-5 h-5" />, desc: 'Carte bancaire' },
  virement: { label: 'Virement', icon: <Landmark   className="w-5 h-5" />, desc: 'Bancaire' },
  cheque:   { label: 'Chèque',   icon: <BookCheck  className="w-5 h-5" />, desc: 'Sur place' },
  especes:  { label: 'Espèces',  icon: <Banknote   className="w-5 h-5" />, desc: 'Sur place' },
}

// ─── Stripe Card Form ─────────────────────────────────────────────────────────
function StripeCardForm({
  atelier, form, nbPersonnes, onSuccess, onError,
}: {
  atelier: Atelier; form: FormData; nbPersonnes: number
  onSuccess: () => void; onError: (msg: string) => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const total = calcTotal(atelier, nbPersonnes)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (STRIPE_NOT_CONFIGURED) { onSuccess(); return }
    if (!stripe || !elements) return
    setProcessing(true)
    const card = elements.getElement(CardElement)
    if (!card) { setProcessing(false); return }
    const { error } = await stripe.createPaymentMethod({
      type: 'card', card,
      billing_details: { name: `${form.prenom} ${form.nom}`, email: form.email, phone: form.telephone },
    })
    if (error) { onError(error.message || 'Erreur lors du paiement.'); setProcessing(false) }
    else onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-[#1A1040] rounded-2xl p-5 border-2 border-[#1A1040]">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-citron-400" />
          <span className="text-white font-black text-sm">Terminal de paiement sécurisé</span>
          <div className="ml-auto flex gap-1">
            {['VISA', 'MC', 'CB'].map(c => (
              <span key={c} className="bg-white/10 text-white/70 text-[9px] font-black px-1.5 py-0.5 rounded border border-white/20">{c}</span>
            ))}
          </div>
        </div>
        {STRIPE_NOT_CONFIGURED ? (
          <div className="bg-citron-400/20 border border-citron-400/40 rounded-xl p-4 text-center">
            <p className="text-citron-300 text-xs font-bold mb-1">⚙️ Mode démo</p>
            <p className="text-white/70 text-xs">Ajoutez votre clé Stripe dans le fichier <code className="bg-white/10 px-1 rounded">.env</code> pour activer le paiement réel.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl px-4 py-3 border-2 border-white/20">
            <CardElement options={{ style: { base: { fontSize: '15px', color: '#1A1040', fontFamily: 'Inter, system-ui, sans-serif', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } }, hidePostalCode: true }} />
          </div>
        )}
        <div className="flex items-center justify-between mt-4 bg-white/10 rounded-xl px-4 py-2">
          <span className="text-white/70 text-sm">Total à régler</span>
          <span className="text-citron-400 font-black text-xl">{total} €</span>
        </div>
      </div>
      <button type="submit" disabled={processing || (!STRIPE_NOT_CONFIGURED && !stripe)}
        className="w-full flex items-center justify-center gap-2 bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60"
        style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
        <CreditCard className="w-4 h-4" />
        {processing ? '⏳ Traitement...' : STRIPE_NOT_CONFIGURED ? `🎉 Confirmer (démo) — ${total} €` : `🔒 Payer ${total} €`}
      </button>
    </form>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTotal(atelier: Atelier, nb: number) {
  if (atelier.prix_type === 'duo') return atelier.prix * Math.ceil(nb / 2)
  return atelier.prix * nb
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Modal principal ───────────────────────────────────────────────────────────
export default function ReservationModal({ atelier, onClose, onReserved }: Props) {
  const { addItem: addAtelierItem } = useAtelierCart()
  const { setIsOpen: openCart }     = useCart()

  const isDuo = atelier.prix_type === 'duo'
  const minPersonnes = isDuo ? 2 : 1

  const [step, setStep]               = useState<'form' | 'paiement'>('form')
  const [form, setForm]               = useState<FormData>({ prenom: '', nom: '', age: '', email: '', telephone: '', paiement: '' })
  const [nbPersonnes, setNbPersonnes] = useState(minPersonnes)
  const [personnesSup, setPersonnesSup] = useState<PersonneSup[]>(
    Array(minPersonnes - 1).fill(null).map(() => ({ prenom: '', nom: '', age: '' }))
  )
  const [loading]                     = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [error, setError]             = useState('')

  const dateFormatted = formatDate(atelier.date)
  const modesDispos   = atelier.modes_paiement?.length ? atelier.modes_paiement : ['cheque', 'especes']
  const total         = calcTotal(atelier, nbPersonnes)
  const maxPlaces     = atelier.places_restantes

  // ── Gestion participants supplémentaires ──────────────────────────────────
  function changeNbPersonnes(delta: number) {
    const next = Math.max(minPersonnes, Math.min(maxPlaces, nbPersonnes + delta))
    setNbPersonnes(next)
    setPersonnesSup(prev => {
      const needed = next - 1
      if (needed > prev.length) return [...prev, ...Array(needed - prev.length).fill({ prenom: '', nom: '', age: '' })]
      return prev.slice(0, needed)
    })
  }

  function updatePersonneSup(idx: number, field: keyof PersonneSup, value: string) {
    setPersonnesSup(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  // ── Ajouter au panier ────────────────────────────────────────────────────
  function addToCart() {
    addAtelierItem({
      atelier,
      form: {
        prenom: form.prenom, nom: form.nom, age: form.age,
        email: form.email, telephone: form.telephone,
        paiement: form.paiement || 'especes',
      },
      nbPersonnes,
      personnesSup,
      total,
    })
    setAddedToCart(true)
    onReserved()
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.paiement) { setError('Veuillez choisir un mode de règlement.'); return }
    for (const p of personnesSup) {
      if (!p.prenom.trim() || !p.nom.trim() || !p.age.trim()) {
        setError('Merci de remplir les infos de chaque participant.')
        return
      }
    }
    setError('')
    if (form.paiement === 'cb') setStep('paiement')
    else addToCart()
  }

  // ── Écran "Ajouté au panier" ──────────────────────────────────────────────
  if (addedToCart) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-md p-8 text-center"
          style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>
          <div className="w-20 h-20 bg-citron-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#1A1040]"
            style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <ShoppingCart className="w-10 h-10 text-[#1A1040]" />
          </div>
          <div className="inline-block bg-lime-300 text-[#1A1040] px-4 py-1 rounded-full text-sm font-black border-2 border-[#1A1040] mb-4">
            ✅ Ajouté au panier !
          </div>
          <h2 className="font-serif text-2xl font-black text-[#1A1040] mb-2">
            Super {form.prenom} ! 🎊
          </h2>
          <p className="text-gray-500 font-medium mb-1">
            {nbPersonnes > 1 ? `${nbPersonnes} places` : '1 place'} pour{' '}
            <span className="text-rose-400 font-black">« {atelier.titre} »</span>
          </p>
          <p className="text-[#1A1040] font-black text-lg mb-6">{total} €</p>

          <div className="space-y-3">
            <button
              onClick={() => { openCart(true); onClose() }}
              className="w-full bg-[#1A1040] text-citron-400 py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0px 0px #ffb5c8' }}>
              <ShoppingCart className="w-4 h-4" /> Voir mon panier & confirmer
            </button>
            <button
              onClick={onClose}
              className="w-full border-2 border-[#1A1040] text-[#1A1040] py-3 rounded-2xl font-black text-sm hover:bg-candy transition-colors flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Récap atelier ─────────────────────────────────────────────────────────
  const RecapAtelier = () => (
    <div className="px-6 py-4 bg-rose-50 border-b-2 border-dashed border-rose-200">
      <h3 className="font-black text-[#1A1040] mb-2 text-sm">📸 {atelier.titre}</h3>
      <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600 font-medium">
        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-rose-400" /><span className="capitalize">{dateFormatted}</span></div>
        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-turquoise-500" />{atelier.heure} · {atelier.duree}</div>
        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-citron-500" />{atelier.lieu}</div>
        <div className="flex items-center gap-1.5">
          <Euro className="w-3.5 h-3.5 text-lime-600" />
          <strong>{atelier.prix} €</strong>/{atelier.prix_type === 'duo' ? 'duo' : 'pers.'}
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-lg max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b-4 border-[#1A1040] rounded-t-3xl ${step === 'paiement' ? 'bg-[#1A1040]' : 'bg-turquoise-400'}`}>
          <div>
            <h2 className={`font-serif text-xl font-black ${step === 'paiement' ? 'text-white' : 'text-[#1A1040]'}`}>
              {step === 'form' ? '🎟️ Réserver ma place' : '💳 Paiement sécurisé'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black border-2 ${step === 'form' ? 'bg-[#1A1040] text-white border-[#1A1040]' : 'bg-lime-300 text-[#1A1040] border-lime-400'}`}>1</div>
              <div className="w-6 h-0.5 bg-white/40" />
              <div className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black border-2 ${step === 'paiement' ? 'bg-citron-400 text-[#1A1040] border-citron-400' : 'bg-white/20 text-white/60 border-white/30'}`}>2</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-black/10 rounded-xl flex items-center justify-center hover:bg-black/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <RecapAtelier />

        {/* ── ÉTAPE 1 : Formulaire ── */}
        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm border-2 border-red-200 font-medium">
                😬 {error}
              </div>
            )}

            {/* Nom & Prénom */}
            <div className="grid grid-cols-2 gap-3">
              {([['Prénom *', 'prenom', 'Camille'], ['Nom *', 'nom', 'Dupont']] as const).map(([label, key, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-black text-[#1A1040] mb-1">{label}</label>
                  <input required value={form[key]} placeholder={ph}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
                  />
                </div>
              ))}
            </div>

            {/* Âge */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1">Âge *</label>
              <input required type="number" min="5" max="120"
                value={form.age} placeholder="Ex : 32"
                onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1">Adresse e-mail *</label>
              <input required type="email"
                value={form.email} placeholder="votre@email.fr"
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1">N° de téléphone *</label>
              <input required type="tel"
                value={form.telephone} placeholder="06 00 00 00 00"
                onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
              />
            </div>

            {/* ── Participants supplémentaires ── */}
            <div className="border-2 border-dashed border-[#1A1040]/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-[#1A1040]">
                    <UserPlus className="w-3.5 h-3.5 inline mr-1" />Nombre de participants
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isDuo
                      ? `Atelier en duo — 2 personnes minimum · ${maxPlaces} place${maxPlaces > 1 ? 's' : ''} restante${maxPlaces > 1 ? 's' : ''}`
                      : `${maxPlaces} place${maxPlaces > 1 ? 's' : ''} restante${maxPlaces > 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => changeNbPersonnes(-1)} disabled={nbPersonnes <= minPersonnes}
                    className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-candy flex items-center justify-center font-black hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-black text-[#1A1040] text-lg">{nbPersonnes}</span>
                  <button type="button" onClick={() => changeNbPersonnes(1)} disabled={nbPersonnes >= maxPlaces}
                    className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-candy flex items-center justify-center font-black hover:bg-lime-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Prix total */}
              <div className="bg-citron-400/20 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1040]">
                  {nbPersonnes} × {atelier.prix} €/{atelier.prix_type === 'duo' ? 'duo' : 'pers.'}
                  {atelier.prix_type === 'duo' && nbPersonnes > 1 && ` (${Math.ceil(nbPersonnes / 2)} duo${Math.ceil(nbPersonnes / 2) > 1 ? 's' : ''})`}
                </span>
                <span className="font-black text-[#1A1040] text-base">Total : {total} €</span>
              </div>

              {/* Infos participants supplémentaires */}
              {personnesSup.map((p, idx) => (
                <div key={idx} className="bg-rose-50 border-2 border-rose-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-black text-rose-500">👤 Participant {idx + 2}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-[#1A1040] mb-1">Prénom *</label>
                      <input required value={p.prenom} placeholder="Marie"
                        onChange={e => updatePersonneSup(idx, 'prenom', e.target.value)}
                        className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#1A1040] mb-1">Nom *</label>
                      <input required value={p.nom} placeholder="Martin"
                        onChange={e => updatePersonneSup(idx, 'nom', e.target.value)}
                        className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#1A1040] mb-1">Âge *</label>
                    <input required type="number" min="5" max="120" value={p.age} placeholder="28"
                      onChange={e => updatePersonneSup(idx, 'age', e.target.value)}
                      className="w-32 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Mode de règlement ── */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-2">Mode de règlement *</label>
              <div className={`grid gap-2 ${modesDispos.length <= 2 ? 'grid-cols-2' : modesDispos.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {modesDispos.map(mode => {
                  const info = MODES_INFO[mode]
                  if (!info) return null
                  return (
                    <button key={mode} type="button"
                      onClick={() => setForm(p => ({ ...p, paiement: mode as ModePaiement }))}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 font-bold text-xs transition-all ${
                        form.paiement === mode
                          ? 'bg-[#1A1040] text-white border-[#1A1040]'
                          : 'bg-candy text-[#1A1040] border-gray-200 hover:border-[#1A1040]'
                      }`}>
                      {info.icon}
                      <span className="font-black">{info.label}</span>
                      <span className={`text-[10px] font-medium ${form.paiement === mode ? 'text-white/60' : 'text-gray-400'}`}>{info.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Messages spécifiques aux modes */}
            {form.paiement === 'especes' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium space-y-1">
                <p className="font-black">💵 Règlement en espèces sur place</p>
                <p>⚠️ <strong>L'appoint est obligatoire.</strong></p>
                <p>🎲 Les billets de Monopoli ne sont pas autorisés 😄</p>
              </div>
            )}

            {form.paiement === 'virement' && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl px-4 py-3 text-xs text-blue-800 font-medium space-y-1">
                <p className="font-black">🏦 Règlement par virement bancaire</p>
                <p>⏰ <strong>Le règlement doit être arrivé avant le commencement de l'atelier.</strong></p>
                <p>📧 Les coordonnées bancaires seront présentes sur le mail de confirmation de réservation.</p>
              </div>
            )}

            {form.paiement === 'cheque' && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-xl px-4 py-3 text-xs text-purple-800 font-medium">
                <p className="font-black">📝 Règlement par chèque sur place</p>
                <p className="mt-1">Chèque à l'ordre de <strong>L'univers créatif d'Anaïs</strong>, remis le jour de l'atelier.</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-3 rounded-2xl font-black text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-turquoise-400 text-[#1A1040] py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                {loading ? '⏳ Envoi...' : form.paiement === 'cb' ? '➡️ Passer au paiement' : `🎉 Confirmer — ${total} €`}
              </button>
            </div>
          </form>
        )}

        {/* ── ÉTAPE 2 : Paiement Stripe ── */}
        {step === 'paiement' && (
          <div className="px-6 py-5">
            <div className="bg-candy rounded-2xl border-2 border-[#1A1040] px-4 py-3 mb-4 text-sm">
              <p className="font-black text-[#1A1040] mb-0.5">👤 {form.prenom} {form.nom}</p>
              <p className="text-gray-500 text-xs">{form.email} · {form.telephone}</p>
              {nbPersonnes > 1 && <p className="text-xs text-rose-500 font-bold mt-0.5">+{nbPersonnes - 1} participant(s)</p>}
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm border-2 border-red-200 font-medium mb-4">
                😬 {error}
              </div>
            )}

            <Elements stripe={stripePromise}>
              <StripeCardForm
                atelier={atelier} form={form} nbPersonnes={nbPersonnes}
                onSuccess={addToCart} onError={msg => setError(msg)}
              />
            </Elements>

            <button onClick={() => { setStep('form'); setError('') }}
              className="w-full mt-3 border-2 border-gray-200 text-gray-500 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-50">
              ← Retour au formulaire
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
