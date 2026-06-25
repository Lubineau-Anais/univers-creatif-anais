import { useState } from 'react'
import { X, ShoppingCart, Trash2, Calendar, Clock, MapPin, Users, Check, CreditCard, Landmark, BookCheck, Banknote, ShoppingBag, ChevronRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAtelierCart } from '../context/AtelierCartContext'
import { supabase } from '../lib/supabase'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  })
}

const MODE_ICON: Record<string, React.ReactNode> = {
  cb:       <CreditCard className="w-3.5 h-3.5" />,
  virement: <Landmark   className="w-3.5 h-3.5" />,
  cheque:   <BookCheck  className="w-3.5 h-3.5" />,
  especes:  <Banknote   className="w-3.5 h-3.5" />,
}
const MODE_LABEL: Record<string, string> = {
  cb: 'CB', virement: 'Virement', cheque: 'Chèque', especes: 'Espèces',
}

export default function CartDrawer() {
  const { isOpen, setIsOpen, items: shopItems, itemCount: shopCount } = useCart()
  const { items: atelierItems, itemCount: atelierCount, removeItem, clearItems } = useAtelierCart()

  const [checkingOut, setCheckingOut] = useState(false)
  const [checked,     setChecked]     = useState(false)
  const [checkError,  setCheckError]  = useState('')

  const totalAteliers = atelierItems.reduce((s, i) => s + i.total, 0)
  const hasItems = atelierItems.length > 0 || shopItems.length > 0

  async function confirmAtelierReservations() {
    setCheckingOut(true)
    setCheckError('')
    try {
      for (const item of atelierItems) {
        const { error: insertError } = await supabase.from('reservations').insert([{
          atelier_id:      item.atelier.id,
          nom:             item.form.nom,
          prenom:          item.form.prenom,
          age:             item.form.age,
          email:           item.form.email,
          telephone:       item.form.telephone,
          mode_paiement:   item.form.paiement || 'especes',
          statut_paiement: item.form.paiement === 'cb' ? 'paye' : 'en_attente',
          nb_personnes:    item.nbPersonnes,
          personnes_sup:   item.personnesSup,
        }])
        if (insertError) throw insertError

        if (!item.atelier.id.startsWith('demo-')) {
          await supabase.from('ateliers')
            .update({ places_restantes: item.atelier.places_restantes - item.nbPersonnes })
            .eq('id', item.atelier.id)
        }
      }
      clearItems()
      setChecked(true)
    } catch (err: unknown) {
      setCheckError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setCheckingOut(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => { setIsOpen(false); setChecked(false) }}
      />

      {/* Tiroir */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col bg-white border-l-4 border-[#1A1040]"
        style={{ boxShadow: '-6px 0 0 0 #1A1040' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1A1040] border-b-4 border-[#1A1040]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-citron-400" />
            <h2 className="font-serif font-black text-xl text-white">Mon panier</h2>
            {(atelierCount + shopCount) > 0 && (
              <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {atelierCount + shopCount}
              </span>
            )}
          </div>
          <button onClick={() => { setIsOpen(false); setChecked(false) }}
            className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── SUCCÈS réservations ── */}
          {checked ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-20 h-20 bg-lime-300 rounded-full border-4 border-[#1A1040] flex items-center justify-center mb-4"
                style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
                <Check className="w-10 h-10 text-[#1A1040]" />
              </div>
              <div className="inline-block bg-citron-400 text-[#1A1040] px-4 py-1 rounded-full text-sm font-black border-2 border-[#1A1040] mb-3">
                🎉 Réservations confirmées !
              </div>
              <p className="text-gray-600 font-medium mb-1">Tes réservations sont enregistrées.</p>
              <p className="text-gray-400 text-sm">Tu recevras un email de confirmation.</p>
              <button onClick={() => { setIsOpen(false); setChecked(false) }}
                className="mt-6 bg-rose-400 text-white px-6 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                Fermer 👋
              </button>
            </div>

          ) : !hasItems ? (
            /* ── Panier vide ── */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-black text-lg text-gray-300">Ton panier est vide</p>
              <p className="text-sm mt-1">Ajoute des ateliers ou des articles boutique !</p>
              <button onClick={() => setIsOpen(false)}
                className="mt-6 bg-rose-400 text-white px-6 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                Continuer mes achats 🛍️
              </button>
            </div>

          ) : (
            <div className="px-4 py-4 space-y-4">

              {/* ── Section Ateliers ── */}
              {atelierItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-[#1A1040] uppercase tracking-wider">🎨 Ateliers réservés</span>
                    <div className="flex-1 h-0.5 bg-[#1A1040]/10" />
                    <span className="text-xs font-black text-rose-400">{atelierItems.length} atelier{atelierItems.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-3">
                    {atelierItems.map(item => (
                      <div key={item.cartId}
                        className="bg-candy rounded-2xl border-2 border-[#1A1040] overflow-hidden"
                        style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>

                        {/* Nom atelier */}
                        <div className="bg-[#1A1040] px-3 py-2 flex items-center justify-between">
                          <span className="text-white font-black text-sm">📸 {item.atelier.titre}</span>
                          <button onClick={() => removeItem(item.cartId)}
                            className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center hover:bg-red-500 transition-colors">
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>

                        <div className="px-3 py-3 space-y-2">
                          {/* Infos atelier */}
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-rose-400" />
                              <span className="capitalize">{formatDate(item.atelier.date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-turquoise-500" />
                              {item.atelier.heure}
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <MapPin className="w-3 h-3 text-citron-500" />
                              {item.atelier.lieu}
                            </div>
                          </div>

                          {/* Réservant */}
                          <div className="bg-white rounded-xl px-3 py-2 text-xs">
                            <div className="font-black text-[#1A1040]">👤 {item.form.prenom} {item.form.nom}</div>
                            <div className="text-gray-400">{item.form.email}</div>
                            {item.nbPersonnes > 1 && (
                              <div className="flex items-center gap-1 text-rose-500 font-bold mt-0.5">
                                <Users className="w-3 h-3" /> {item.nbPersonnes} participants
                              </div>
                            )}
                          </div>

                          {/* Mode + total */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-white/70 text-[#1A1040] text-[10px] font-black px-2 py-1 rounded-lg border border-[#1A1040]/20">
                              {MODE_ICON[item.form.paiement]}
                              {MODE_LABEL[item.form.paiement] || item.form.paiement}
                            </div>
                            <span className="font-black text-[#1A1040] text-base">{item.total} €</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section Boutique ── */}
              {shopItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-[#1A1040] uppercase tracking-wider">🛍️ Articles boutique</span>
                    <div className="flex-1 h-0.5 bg-[#1A1040]/10" />
                    <span className="text-xs font-black text-rose-400">{shopItems.length} article{shopItems.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-candy rounded-2xl border-2 border-[#1A1040] px-4 py-3 space-y-2"
                    style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                    {shopItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-bold text-[#1A1040]">{item.product?.name}</span>
                          {item.chosen_price != null && <span className="text-gray-400 ml-1.5">({item.chosen_price} €)</span>}
                          <span className="text-gray-400 ml-1.5">×{item.quantity}</span>
                        </div>
                        <span className="font-black text-[#1A1040]">{((item.chosen_price ?? item.product?.price ?? 0) * item.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-[#1A1040]/20 pt-2 flex justify-end">
                      <a href="/boutique"
                        className="flex items-center gap-1 text-xs font-black text-rose-400 hover:text-rose-600">
                        Aller à la boutique <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — Confirmer les réservations ateliers */}
        {!checked && atelierItems.length > 0 && (
          <div className="border-t-4 border-[#1A1040] px-4 py-4 bg-white space-y-3">
            {checkError && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold border-2 border-red-200">
                😬 {checkError}
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-black text-[#1A1040]">
              <span>Total ateliers ({atelierItems.length})</span>
              <span className="text-xl">{totalAteliers} €</span>
            </div>
            <button
              onClick={confirmAtelierReservations}
              disabled={checkingOut}
              className="w-full bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
              {checkingOut ? '⏳ Confirmation...' : '🎟️ Confirmer mes réservations'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full border-2 border-[#1A1040] text-[#1A1040] py-2.5 rounded-2xl font-black text-sm hover:bg-candy transition-colors flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Continuer mes achats
            </button>
          </div>
        )}

        {/* Footer boutique seul (si pas d'ateliers) */}
        {!checked && atelierItems.length === 0 && shopItems.length > 0 && (
          <div className="border-t-4 border-[#1A1040] px-4 py-4 bg-white">
            <a href="/boutique"
              className="w-full bg-citron-400 text-[#1A1040] py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
              <ShoppingBag className="w-4 h-4" /> Voir la boutique
            </a>
          </div>
        )}
      </div>
    </>
  )
}
