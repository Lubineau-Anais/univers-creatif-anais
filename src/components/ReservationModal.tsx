import { useState } from 'react'
import { X, Check, Calendar, Clock, MapPin, Euro, CreditCard, BookCheck, Banknote } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import type { Atelier } from '../types'

// Clé publique Stripe (à remplacer par votre clé dans .env)
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
)

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  prenom: string
  nom: string
  age: string
  email: string
  telephone: string
  paiement: 'carte' | 'cheque' | 'especes' | ''
}

interface Props {
  atelier: Atelier
  onClose: () => void
  onReserved: () => void
}

// ─── Composant interne du paiement Stripe ─────────────────────────────────────
function StripeCardForm({
  atelier,
  form,
  onSuccess,
  onError,
}: {
  atelier: Atelier
  form: FormData
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const STRIPE_NOT_CONFIGURED =
    !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'pk_test_placeholder'

  async function handleStripeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    if (STRIPE_NOT_CONFIGURED) {
      // Mode démo sans Stripe configuré
      onSuccess()
      return
    }

    setProcessing(true)
    const card = elements.getElement(CardElement)
    if (!card) { setProcessing(false); return }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card,
      billing_details: {
        name: `${form.prenom} ${form.nom}`,
        email: form.email,
        phone: form.telephone,
      },
    })

    if (error) {
      onError(error.message || 'Erreur lors du paiement.')
      setProcessing(false)
    } else {
      console.log('PaymentMethod créé :', paymentMethod.id)
      // Ici : appeler votre backend (Supabase Edge Function) pour confirmer
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleStripeSubmit} className="space-y-4">
      {/* Terminal de paiement */}
      <div className="bg-[#1A1040] rounded-2xl p-5 border-2 border-[#1A1040]">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-citron-400" />
          <span className="text-white font-black text-sm">Terminal de paiement sécurisé</span>
          <div className="ml-auto flex gap-1">
            {/* Logos cartes */}
            {['VISA', 'MC', 'CB'].map(c => (
              <span key={c} className="bg-white/10 text-white/70 text-[9px] font-black px-1.5 py-0.5 rounded border border-white/20">
                {c}
              </span>
            ))}
          </div>
        </div>

        {STRIPE_NOT_CONFIGURED ? (
          <div className="bg-citron-400/20 border border-citron-400/40 rounded-xl p-4 text-center">
            <p className="text-citron-300 text-xs font-bold mb-1">⚙️ Mode démo</p>
            <p className="text-white/70 text-xs">
              Ajoutez votre clé Stripe dans le fichier <code className="bg-white/10 px-1 rounded">.env</code> pour activer le paiement réel.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl px-4 py-3 border-2 border-white/20">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '15px',
                    color: '#1A1040',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    '::placeholder': { color: '#9ca3af' },
                  },
                  invalid: { color: '#ef4444' },
                },
                hidePostalCode: true,
              }}
            />
          </div>
        )}

        {/* Montant */}
        <div className="flex items-center justify-between mt-4 bg-white/10 rounded-xl px-4 py-2">
          <span className="text-white/70 text-sm">Total à régler</span>
          <span className="text-citron-400 font-black text-xl">{atelier.prix} €</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={processing || (!STRIPE_NOT_CONFIGURED && !stripe)}
        className="w-full flex items-center justify-center gap-2 bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60"
        style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}
      >
        <CreditCard className="w-4 h-4" />
        {processing
          ? '⏳ Traitement...'
          : STRIPE_NOT_CONFIGURED
          ? `🎉 Confirmer (démo) — ${atelier.prix} €`
          : `🔒 Payer ${atelier.prix} €`}
      </button>
    </form>
  )
}

// ─── Modal principal ───────────────────────────────────────────────────────────
export default function ReservationModal({ atelier, onClose, onReserved }: Props) {
  const [step, setStep] = useState<'form' | 'paiement'>('form')
  const [form, setForm] = useState<FormData>({
    prenom: '', nom: '', age: '', email: '', telephone: '', paiement: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const dateFormatted = new Date(atelier.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // ── Enregistrer en base ──────────────────────────────────────────────────────
  async function saveReservation() {
    setLoading(true)
    setError('')
    try {
      if (atelier.places_restantes <= 0)
        throw new Error('Plus de places disponibles.')

      const { error: insertError } = await supabase.from('reservations').insert([{
        atelier_id: atelier.id,
        nom: form.nom,
        prenom: form.prenom,
        age: form.age,
        email: form.email,
        telephone: form.telephone,
        mode_paiement: form.paiement || 'especes',
        statut_paiement: form.paiement === 'carte' ? 'paye' : 'en_attente',
      }])
      if (insertError) throw insertError

      if (!atelier.id.startsWith('demo-')) {
        await supabase.from('ateliers')
          .update({ places_restantes: atelier.places_restantes - 1 })
          .eq('id', atelier.id)
      }

      setSuccess(true)
      onReserved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  // ── Étape 1 : Formulaire ─────────────────────────────────────────────────────
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.paiement) { setError('Veuillez choisir un mode de règlement.'); return }
    setError('')

    if (form.paiement === 'carte') {
      setStep('paiement')
    } else {
      await saveReservation()
    }
  }

  // ── Succès ───────────────────────────────────────────────────────────────────
  if (success) {
    const ICONE_PAIEMENT = { carte: '💳', cheque: '📝', especes: '💵' }
    const LABEL_PAIEMENT = { carte: 'par carte', cheque: 'par chèque', especes: 'en espèces' }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-md p-8 text-center"
          style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>
          <div className="w-20 h-20 bg-lime-300 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#1A1040]"
            style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <Check className="w-10 h-10 text-[#1A1040]" />
          </div>
          <div className="inline-block bg-citron-400 text-[#1A1040] px-4 py-1 rounded-full text-sm font-black border-2 border-[#1A1040] mb-4">
            🎉 C'est confirmé !
          </div>
          <h2 className="font-serif text-2xl font-black text-[#1A1040] mb-2">
            Super {form.prenom} ! 🎊
          </h2>
          <p className="text-gray-600 mb-1 font-medium">Ta place est réservée pour</p>
          <p className="text-rose-400 font-black text-lg mb-1">« {atelier.titre} »</p>
          <p className="text-gray-500 text-sm capitalize mb-3">{dateFormatted} à {atelier.heure}</p>
          {form.paiement && (
            <div className="inline-flex items-center gap-2 bg-primary-50 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 mb-4">
              {ICONE_PAIEMENT[form.paiement]} Règlement {LABEL_PAIEMENT[form.paiement]}
              {form.paiement !== 'carte' && ' — à régler sur place'}
            </div>
          )}
          <p className="text-gray-400 text-sm mb-8">
            Confirmation envoyée à <strong className="text-[#1A1040]">{form.email}</strong> 📧
          </p>
          <button onClick={onClose}
            className="w-full bg-rose-400 text-white py-3.5 rounded-2xl font-black border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            Super, à bientôt ! 👋
          </button>
        </div>
      </div>
    )
  }

  // ── Récap atelier (commun aux deux étapes) ───────────────────────────────────
  const RecapAtelier = () => (
    <div className="px-6 py-4 bg-rose-50 border-b-2 border-dashed border-rose-200">
      <h3 className="font-black text-[#1A1040] mb-2 text-sm">📸 {atelier.titre}</h3>
      <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600 font-medium">
        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-rose-400" /><span className="capitalize">{dateFormatted}</span></div>
        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-turquoise-500" />{atelier.heure} · {atelier.duree}</div>
        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-citron-500" />{atelier.lieu}</div>
        <div className="flex items-center gap-1.5"><Euro className="w-3.5 h-3.5 text-lime-600" /><strong>{atelier.prix} €</strong>/personne</div>
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
            {/* Étapes */}
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
              <input
                required type="number" min="5" max="120"
                value={form.age} placeholder="Ex : 32"
                onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1">Adresse e-mail *</label>
              <input
                required type="email"
                value={form.email} placeholder="votre@email.fr"
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1">N° de téléphone *</label>
              <input
                required type="tel"
                value={form.telephone} placeholder="06 00 00 00 00"
                onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-candy"
              />
            </div>

            {/* Mode de règlement */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-2">Mode de règlement *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'carte',   label: 'Carte',   icon: <CreditCard className="w-5 h-5" />,  desc: 'En ligne' },
                  { value: 'cheque',  label: 'Chèque',  icon: <BookCheck className="w-5 h-5" />,   desc: 'Sur place' },
                  { value: 'especes', label: 'Espèces', icon: <Banknote className="w-5 h-5" />,    desc: 'Sur place' },
                ].map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, paiement: value as FormData['paiement'] }))}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 font-bold text-xs transition-all ${
                      form.paiement === value
                        ? 'bg-[#1A1040] text-white border-[#1A1040]'
                        : 'bg-candy text-[#1A1040] border-gray-200 hover:border-[#1A1040]'
                    }`}
                  >
                    {icon}
                    <span className="font-black">{label}</span>
                    <span className={`text-[10px] font-medium ${form.paiement === value ? 'text-white/60' : 'text-gray-400'}`}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Info modes sur place */}
            {(form.paiement === 'cheque' || form.paiement === 'especes') && (
              <div className="bg-citron-400/20 border-2 border-citron-400/40 rounded-xl px-4 py-3 text-xs text-[#1A1040] font-medium">
                ℹ️ Le règlement {form.paiement === 'cheque' ? 'par chèque (à l\'ordre de l\'univers créatif d\'Anaïs)' : 'en espèces'} s'effectue directement sur place le jour de l'atelier.
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
                {loading
                  ? '⏳ Envoi...'
                  : form.paiement === 'carte'
                  ? '➡️ Passer au paiement'
                  : `🎉 Confirmer — ${atelier.prix} €`}
              </button>
            </div>
          </form>
        )}

        {/* ── ÉTAPE 2 : Paiement Stripe ── */}
        {step === 'paiement' && (
          <div className="px-6 py-5">
            {/* Récap identité */}
            <div className="bg-candy rounded-2xl border-2 border-[#1A1040] px-4 py-3 mb-4 text-sm">
              <p className="font-black text-[#1A1040] mb-0.5">👤 {form.prenom} {form.nom}</p>
              <p className="text-gray-500 text-xs">{form.email} · {form.telephone}</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm border-2 border-red-200 font-medium mb-4">
                😬 {error}
              </div>
            )}

            <Elements stripe={stripePromise}>
              <StripeCardForm
                atelier={atelier}
                form={form}
                onSuccess={saveReservation}
                onError={(msg) => setError(msg)}
              />
            </Elements>

            <button
              onClick={() => { setStep('form'); setError('') }}
              className="w-full mt-3 border-2 border-gray-200 text-gray-500 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-50"
            >
              ← Retour au formulaire
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
