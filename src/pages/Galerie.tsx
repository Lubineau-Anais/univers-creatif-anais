import { useState, useEffect } from 'react'
import { ChevronLeft, Images, ZoomIn } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GalerieCategory {
  id: string
  nom: string
  ordre: number
  created_at: string
}

interface GaleriePhoto {
  id: string
  category_id: string
  url: string
  titre: string | null
  created_at: string
}

// ─── Couleurs cycliques pour les cartes de catégories ────────────────────────
const CAT_COLORS = [
  { bg: '#ffb5c8', text: '#1A1040', emoji: '🪢' },
  { bg: '#ffe500', text: '#1A1040', emoji: '🧵' },
  { bg: '#4dd9c0', text: '#1A1040', emoji: '💎' },
  { bg: '#c4b5fd', text: '#1A1040', emoji: '🎨' },
  { bg: '#fdba74', text: '#1A1040', emoji: '✨' },
  { bg: '#86efac', text: '#1A1040', emoji: '🌸' },
]

// ─── Page publique Galerie ────────────────────────────────────────────────────
export default function Galerie() {
  const [categories, setCategories] = useState<GalerieCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<GalerieCategory | null>(null)
  const [photos, setPhotos]           = useState<GaleriePhoto[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [lightbox, setLightbox]       = useState<string | null>(null)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('galerie_categories')
      .select('*')
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true })
    setCategories((data as GalerieCategory[]) || [])
    setLoading(false)
  }

  async function openCategory(cat: GalerieCategory) {
    setSelectedCat(cat)
    setLoadingPhotos(true)
    const { data } = await supabase
      .from('galerie_photos')
      .select('*')
      .eq('category_id', cat.id)
      .order('created_at', { ascending: false })
    setPhotos((data as GaleriePhoto[]) || [])
    setLoadingPhotos(false)
  }

  function back() {
    setSelectedCat(null)
    setPhotos([])
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🖼️</div>
        <p className="font-black text-[#1A1040]">Chargement de la galerie...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-white min-h-screen">

      {/* ── En-tête ── */}
      <section className="bg-[#1A1040] py-12 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-6xl mx-auto">
          {selectedCat ? (
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={back}
                className="flex items-center gap-2 bg-candy text-[#1A1040] px-4 py-2 rounded-xl font-black text-sm border-2 border-candy hover:bg-rose-200 transition-colors"
                style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}
              >
                <ChevronLeft className="w-4 h-4" /> Retour à la galerie
              </button>
              <div>
                <p className="text-rose-300 text-sm font-bold">Galerie</p>
                <h1 className="font-serif text-3xl font-black text-white">{selectedCat.nom}</h1>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
                style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
                <Images className="w-7 h-7 text-[#1A1040]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
                  ✨ Créations d'Anaïs
                </div>
                <h1 className="font-serif text-3xl font-black text-white">Galerie</h1>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* ── Liste des catégories ── */}
        {!selectedCat && (
          <>
            {categories.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🖼️</div>
                <p className="font-black text-[#1A1040] text-2xl mb-2">Galerie bientôt disponible</p>
                <p className="text-gray-500">Les créations seront publiées très prochainement.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {categories.map((cat, i) => {
                  const c = CAT_COLORS[i % CAT_COLORS.length]
                  return (
                    <button
                      key={cat.id}
                      onClick={() => openCategory(cat)}
                      className="group rounded-3xl border-4 border-[#1A1040] overflow-hidden transition-all hover:-translate-y-1.5 active:translate-y-0 text-left focus:outline-none focus:ring-4 focus:ring-[#1A1040]/20"
                      style={{ backgroundColor: c.bg, boxShadow: '6px 6px 0px 0px #1A1040' }}
                    >
                      <div className="p-8">
                        <div className="text-5xl mb-4">{c.emoji}</div>
                        <h2 className="font-serif text-2xl font-black mb-1" style={{ color: c.text }}>
                          {cat.nom}
                        </h2>
                        <p className="text-sm font-bold opacity-60 group-hover:opacity-100 transition-opacity"
                          style={{ color: c.text }}>
                          Voir les créations →
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Grille de photos ── */}
        {selectedCat && (
          <>
            {loadingPhotos ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-3 animate-pulse">📸</div>
                <p className="font-black text-[#1A1040]">Chargement des photos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📷</div>
                <p className="font-black text-[#1A1040] text-2xl mb-2">Aucune photo pour l'instant</p>
                <p className="text-gray-500">Des créations seront ajoutées prochainement.</p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="break-inside-avoid mb-4">
                    <div
                      className="relative group rounded-2xl overflow-hidden border-2 border-[#1A1040] cursor-zoom-in"
                      style={{ boxShadow: '3px 3px 0px 0px #1A1040', userSelect: 'none' }}
                      onClick={() => setLightbox(photo.url)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.titre || ''}
                        draggable={false}
                        onContextMenu={e => e.preventDefault()}
                        className="w-full h-auto block pointer-events-none"
                      />
                      {/* Overlay protecteur — intercepte le clic droit */}
                      <div
                        className="absolute inset-0 z-10"
                        onContextMenu={e => e.preventDefault()}
                      />
                      {/* Survol */}
                      <div className="absolute inset-0 z-20 bg-[#1A1040]/0 group-hover:bg-[#1A1040]/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>
                    {photo.titre && (
                      <p className="text-xs font-bold text-gray-500 mt-1.5 px-1">{photo.titre}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 bg-white rounded-xl flex items-center justify-center font-black text-[#1A1040] text-lg border-2 border-white hover:bg-rose-100 transition-colors z-10"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <div className="relative max-w-5xl w-full flex items-center justify-center">
            <img
              src={lightbox}
              alt=""
              draggable={false}
              onContextMenu={e => e.preventDefault()}
              className="max-w-full max-h-[88vh] rounded-2xl object-contain select-none pointer-events-none"
            />
            {/* Overlay protecteur dans la lightbox */}
            <div
              className="absolute inset-0 z-10 rounded-2xl"
              onContextMenu={e => e.preventDefault()}
              onClick={() => setLightbox(null)}
            />
          </div>
        </div>
      )}
    </main>
  )
}
