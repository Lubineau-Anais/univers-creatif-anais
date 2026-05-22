import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Atelier } from '../types'
import AtelierFormModal from '../components/AtelierFormModal'
import ReservationModal from '../components/ReservationModal'

// Données de démonstration (affichées si la base est vide ou non configurée)
const DEMO_ATELIERS: Atelier[] = [
  {
    id: 'demo-1',
    titre: 'Scrapbooking',
    description: 'Créez de magnifiques albums souvenirs en assemblant photos, papiers colorés, stickers et décorations. Un atelier créatif et convivial pour tous les niveaux !',
    date: '2026-04-25',
    heure: '15:00',
    duree: '3h',
    lieu: "l'univers créatif d'Anaïs",
    prix: 25,
    places_max: 7,
    places_restantes: 7,
    image_url: '/images/scrapbooking.jpg',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    titre: 'Bijoux en Fimo',
    description: 'Modelez et créez vos propres bijoux uniques en pâte Fimo ! Bagues, colliers, boucles d\'oreilles... Laissez parler votre créativité et repartez avec vos créations.',
    date: '2026-04-26',
    heure: '15:00',
    duree: '3h',
    lieu: "l'univers créatif d'Anaïs",
    prix: 30,
    places_max: 8,
    places_restantes: 8,
    image_url: '/images/fimo.jpg',
    created_at: new Date().toISOString(),
  },
]

// Rotations légèrement différentes pour chaque polaroid
const ROTATIONS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-3', 'rotate-1']

// Couleurs du scotch décoratif en haut
const TAPE_COLORS = [
  'bg-citron-400/70',
  'bg-rose-400/70',
  'bg-turquoise-400/70',
  'bg-lime-300/70',
  'bg-corail-400/70',
]

export default function NosAteliers() {
  const { isAdmin } = useAuth()
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAtelier, setEditingAtelier] = useState<Atelier | null>(null)
  const [reservingAtelier, setReservingAtelier] = useState<Atelier | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => { loadAteliers() }, [])

  async function loadAteliers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ateliers').select('*').order('date', { ascending: true })
      if (!error && data && data.length > 0) {
        setAteliers(data)
      } else {
        // Fallback : données démo si base vide ou non configurée
        setAteliers(DEMO_ATELIERS)
      }
    } catch {
      setAteliers(DEMO_ATELIERS)
    }
    setLoading(false)
  }

  async function deleteAtelier(id: string) {
    if (id.startsWith('demo-')) {
      setAteliers(prev => prev.filter(a => a.id !== id))
      setDeleteConfirm(null)
      return
    }
    const { error } = await supabase.from('ateliers').delete().eq('id', id)
    if (!error) setAteliers(prev => prev.filter(a => a.id !== id))
    setDeleteConfirm(null)
  }

  function handleEdit(atelier: Atelier) {
    setEditingAtelier(atelier)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingAtelier(null)
  }

  const dateFormatted = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

  const isDemo = ateliers.length > 0 && ateliers[0].id.startsWith('demo-')

  return (
    <main className="flex-1 bg-candy overflow-x-hidden">

      {/* ===== HEADER ===== */}
      <section className="relative bg-[#1A1040] py-16 px-4 text-center border-b-4 border-[#1A1040] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none confetti-bg opacity-20" />
        {/* Polaroids décoratifs en fond */}
        <div className="absolute -left-8 top-4 w-24 h-28 bg-white/10 border-2 border-white/20 rounded-sm rotate-12 hidden md:block" />
        <div className="absolute -right-6 bottom-2 w-20 h-24 bg-white/10 border-2 border-white/20 rounded-sm -rotate-6 hidden md:block" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-citron-400 text-[#1A1040] px-4 py-1.5 rounded-full text-sm font-black border-2 border-[#1A1040] mb-4">
            📸 Collection printemps 2026
          </div>
          <h1 className="font-serif text-5xl font-black text-white mb-3">
            Nos Ateliers <span className="text-rose-400">✦</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto font-medium">
            Choisis ton atelier, réserve ta place et viens créer avec nous !
          </p>
        </div>
      </section>

      {/* ===== CONTENU ===== */}
      <section className="max-w-6xl mx-auto px-4 py-16">

        {/* Bouton Admin */}
        {isAdmin && (
          <div className="flex justify-end mb-10">
            <button
              onClick={() => { setEditingAtelier(null); setShowForm(true) }}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-5 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: '4px 4px 0px 0px #ffb5c8' }}
            >
              <Plus className="w-5 h-5" />
              ✦ Ajouter un atelier
            </button>
          </div>
        )}

        {/* Badge demo */}
        {isDemo && !isAdmin && (
          <div className="text-center mb-8">
            <span className="inline-block bg-citron-400/30 text-[#1A1040] px-4 py-2 rounded-full text-xs font-bold border border-citron-400">
              💡 Aperçu — Configurez Supabase pour gérer vos vrais ateliers
            </span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-bounce">📸</div>
            <p className="text-gray-500 font-bold">Développement des photos...</p>
          </div>
        ) : ateliers.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">📷</div>
            <p className="text-[#1A1040] text-xl font-black">Aucun atelier prévu.</p>
            {isAdmin && <p className="text-rose-400 mt-2 font-bold">Clique sur « + » pour créer le premier !</p>}
          </div>
        ) : (
          /* ===== GRILLE POLAROIDS ===== */
          <div className="flex flex-wrap justify-center gap-10 md:gap-14">
            {ateliers.map((atelier, idx) => {
              const rotation = ROTATIONS[idx % ROTATIONS.length]
              const tapeColor = TAPE_COLORS[idx % TAPE_COLORS.length]
              const isComplet = atelier.places_restantes === 0
              const isUrgent = atelier.places_restantes > 0 && atelier.places_restantes <= 2

              return (
                <div
                  key={atelier.id}
                  className={`relative ${rotation} hover:rotate-0 hover:-translate-y-3 transition-all duration-300 cursor-pointer`}
                  style={{ filter: 'drop-shadow(4px 6px 12px rgba(0,0,0,0.25))' }}
                >
                  {/* Scotch décoratif */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-6 ${tapeColor} rounded-sm z-10 border border-white/40`} />

                  {/* Carte polaroid */}
                  <div className="bg-white border-2 border-gray-100 w-64 md:w-72"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}
                  >
                    {/* Zone photo */}
                    <div className="relative w-full h-60 overflow-hidden bg-gray-100">
                      {atelier.image_url ? (
                        <img
                          src={atelier.image_url}
                          alt={atelier.titre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-rose-100 flex items-center justify-center text-6xl">
                          🎨
                        </div>
                      )}

                      {/* Overlay complet */}
                      {isComplet && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-white text-[#1A1040] font-black px-4 py-2 text-lg rotate-[-15deg] border-4 border-[#1A1040]">
                            COMPLET
                          </span>
                        </div>
                      )}

                      {/* Badge places urgentes */}
                      {isUrgent && !isComplet && (
                        <div className="absolute top-2 right-2 bg-corail-400 text-white text-xs font-black px-2 py-1 rounded-full border-2 border-white">
                          🔥 Dernières places !
                        </div>
                      )}
                    </div>

                    {/* ===== STRIP POLAROID (info) ===== */}
                    <div className="px-4 pt-4 pb-5">

                      {/* Nom de l'atelier */}
                      <h3 className="font-serif text-xl font-black text-[#1A1040] text-center mb-3 leading-tight">
                        {atelier.titre}
                      </h3>

                      {/* Ligne séparatrice */}
                      <div className="border-t border-dashed border-gray-200 mb-3" />

                      {/* Infos */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="capitalize">{dateFormatted(atelier.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-turquoise-500 shrink-0" />
                          {atelier.heure} · {atelier.duree}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-citron-500 shrink-0" />
                          {atelier.lieu}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Users className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                            <span className={isComplet ? 'text-red-500 font-black' : isUrgent ? 'text-corail-500 font-black' : 'text-gray-600'}>
                              {isComplet ? 'Complet 😢' : `${atelier.places_restantes} place${atelier.places_restantes > 1 ? 's' : ''} restante${atelier.places_restantes > 1 ? 's' : ''}`}
                            </span>
                          </div>
                          <span className="text-lg font-black text-[#1A1040]">
                            {atelier.prix}€<span className="text-xs font-bold text-gray-400">/pers.</span>
                          </span>
                        </div>
                      </div>

                      {/* Boutons */}
                      <div className="mt-4">
                        {isAdmin ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(atelier)}
                              className="flex-1 flex items-center justify-center gap-1 bg-[#1A1040] text-citron-400 py-2 rounded-xl text-xs font-black border-2 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 transition-all"
                              style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}
                            >
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(atelier.id)}
                              className="w-9 h-9 flex items-center justify-center bg-[#1A1040] text-rose-400 rounded-xl border-2 border-[#1A1040] hover:bg-red-700 hover:text-white transition-colors"
                              style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => !isComplet && setReservingAtelier(atelier)}
                            disabled={isComplet}
                            className={`w-full py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                              isComplet
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-rose-400 text-white border-[#1A1040] hover:-translate-y-0.5'
                            }`}
                            style={!isComplet ? { boxShadow: '3px 3px 0px 0px #1A1040' } : {}}
                          >
                            {isComplet ? 'Complet' : '🎟️ Je réserve !'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modales */}
      {showForm && (
        <AtelierFormModal atelier={editingAtelier} onClose={handleCloseForm} onSaved={loadAteliers} />
      )}
      {reservingAtelier && (
        <ReservationModal atelier={reservingAtelier} onClose={() => setReservingAtelier(null)} onReserved={loadAteliers} />
      )}

      {/* Confirmation suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 text-center"
            style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>
            <div className="text-5xl mb-3">🗑️</div>
            <h3 className="font-serif text-xl font-black text-[#1A1040] mb-2">Supprimer l'atelier ?</h3>
            <p className="text-gray-500 text-sm mb-6">Cette action est définitive.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-2.5 rounded-2xl text-sm font-black hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => deleteAtelier(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-2xl text-sm font-black border-2 border-red-700 hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
