import { useState, useEffect, useRef } from 'react'
import {
  Images, Plus, Pencil, Trash2, X, Check,
  Upload, ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react'
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

// ─── Page admin Galerie ───────────────────────────────────────────────────────
export default function GalerieAdmin() {
  const [categories, setCategories]   = useState<GalerieCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<GalerieCategory | null>(null)
  const [photos, setPhotos]           = useState<GaleriePhoto[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  // Gestion catégories
  const [showAddCat, setShowAddCat]   = useState(false)
  const [newCatNom, setNewCatNom]     = useState('')
  const [editCatId, setEditCatId]     = useState<string | null>(null)
  const [editCatNom, setEditCatNom]   = useState('')
  const [savingCat, setSavingCat]     = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)

  // Upload photos
  const [uploading, setUploading]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadCategories() }, [])

  // ── Chargement ──────────────────────────────────────────────────────────────

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

  async function loadPhotos(catId: string) {
    setLoadingPhotos(true)
    const { data } = await supabase
      .from('galerie_photos')
      .select('*')
      .eq('category_id', catId)
      .order('created_at', { ascending: false })
    setPhotos((data as GaleriePhoto[]) || [])
    setLoadingPhotos(false)
  }

  async function selectCategory(cat: GalerieCategory) {
    setSelectedCat(cat)
    await loadPhotos(cat.id)
  }

  // ── CRUD catégories ─────────────────────────────────────────────────────────

  async function addCategory() {
    if (!newCatNom.trim()) return
    setSavingCat(true)
    const maxOrdre = categories.length > 0 ? Math.max(...categories.map(c => c.ordre)) + 1 : 0
    const { data, error } = await supabase
      .from('galerie_categories')
      .insert({ nom: newCatNom.trim(), ordre: maxOrdre })
      .select()
      .single()
    if (!error && data) {
      setCategories(prev => [...prev, data as GalerieCategory])
      setNewCatNom('')
      setShowAddCat(false)
    }
    setSavingCat(false)
  }

  async function updateCategory(id: string) {
    if (!editCatNom.trim()) return
    setSavingCat(true)
    const { error } = await supabase
      .from('galerie_categories')
      .update({ nom: editCatNom.trim() })
      .eq('id', id)
    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, nom: editCatNom.trim() } : c))
      if (selectedCat?.id === id) setSelectedCat(prev => prev ? { ...prev, nom: editCatNom.trim() } : null)
      setEditCatId(null)
    }
    setSavingCat(false)
  }

  async function deleteCategory(id: string) {
    setDeletingCatId(id)
    await supabase.from('galerie_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    if (selectedCat?.id === id) { setSelectedCat(null); setPhotos([]) }
    setDeletingCatId(null)
    setConfirmDeleteCat(null)
  }

  async function moveCategory(id: string, dir: 'up' | 'down') {
    const idx = categories.findIndex(c => c.id === id)
    if (idx < 0) return
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === categories.length - 1) return

    const other   = categories[dir === 'up' ? idx - 1 : idx + 1]
    const current = categories[idx]

    await Promise.all([
      supabase.from('galerie_categories').update({ ordre: other.ordre }).eq('id', current.id),
      supabase.from('galerie_categories').update({ ordre: current.ordre }).eq('id', other.id),
    ])

    const next = [...categories]
    next[idx] = { ...current, ordre: other.ordre }
    next[dir === 'up' ? idx - 1 : idx + 1] = { ...other, ordre: current.ordre }
    next.sort((a, b) => a.ordre - b.ordre || a.created_at.localeCompare(b.created_at))
    setCategories(next)
  }

  // ── Upload photos ───────────────────────────────────────────────────────────

  async function uploadPhotos(files: FileList) {
    if (!selectedCat || !files.length) return
    setUploading(true)
    let done = 0
    const total = files.length

    for (const file of Array.from(files)) {
      const ext      = file.name.split('.').pop() ?? 'jpg'
      const fileName = `${selectedCat.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { data: up, error: upErr } = await supabase.storage
        .from('galerie')
        .upload(fileName, file, { contentType: file.type })

      if (!upErr && up) {
        const { data: urlData } = supabase.storage.from('galerie').getPublicUrl(up.path)
        const { data: photoData } = await supabase
          .from('galerie_photos')
          .insert({ category_id: selectedCat.id, url: urlData.publicUrl })
          .select()
          .single()
        if (photoData) setPhotos(prev => [photoData as GaleriePhoto, ...prev])
      }

      done++
      setUploadProgress(Math.round((done / total) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deletePhoto(photo: GaleriePhoto) {
    setDeletingPhotoId(photo.id)

    // Supprimer du stockage
    try {
      const url   = new URL(photo.url)
      const parts = url.pathname.split('/object/public/galerie/')
      if (parts[1]) await supabase.storage.from('galerie').remove([parts[1]])
    } catch { /* URL non standard, on ignore */ }

    const { error } = await supabase.from('galerie_photos').delete().eq('id', photo.id)
    if (!error) setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setDeletingPhotoId(null)
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🖼️</div>
        <p className="font-black text-[#1A1040]">Chargement...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-candy">

      {/* ── En-tête admin ── */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
            style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
            <Images className="w-7 h-7 text-[#1A1040]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
              🔐 Espace administrateur
            </div>
            <h1 className="font-serif text-3xl font-black text-white">
              Galerie <span className="text-citron-400">✦</span>
            </h1>
          </div>
          <button
            onClick={() => { loadCategories(); if (selectedCat) loadPhotos(selectedCat.id) }}
            className="ml-auto flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Panneau gauche : catégories ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>

            {/* Header catégories */}
            <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-white text-lg">Catégories</h2>
              <button
                onClick={() => { setShowAddCat(true); setEditCatId(null) }}
                className="flex items-center gap-1.5 bg-citron-400 text-[#1A1040] px-3 py-1.5 rounded-xl text-xs font-black border-2 border-citron-300 hover:bg-yellow-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* Formulaire ajout */}
            {showAddCat && (
              <div className="px-5 py-4 border-b-2 border-[#1A1040]/10 bg-citron-50">
                <p className="text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Nouvelle catégorie</p>
                <input
                  type="text"
                  value={newCatNom}
                  onChange={e => setNewCatNom(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addCategory()
                    if (e.key === 'Escape') { setShowAddCat(false); setNewCatNom('') }
                  }}
                  placeholder="ex. Aquarelle, Broderie..."
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#1A1040] text-sm font-bold text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-citron-400 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addCategory}
                    disabled={savingCat || !newCatNom.trim()}
                    className="flex items-center gap-1.5 bg-[#1A1040] text-citron-400 px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-50 hover:bg-[#2d2060] transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Créer
                  </button>
                  <button
                    onClick={() => { setShowAddCat(false); setNewCatNom('') }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Liste des catégories */}
            <div className="divide-y-2 divide-[#1A1040]/8">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-400 px-6">
                  <div className="text-4xl mb-2">📂</div>
                  <p className="text-sm font-bold">Aucune catégorie</p>
                  <p className="text-xs mt-1">Créez votre première catégorie ci-dessus</p>
                </div>
              ) : (
                categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                      selectedCat?.id === cat.id ? 'bg-rose-50 border-l-4 border-rose-400' : 'hover:bg-candy/40'
                    }`}
                    onClick={() => selectCategory(cat)}
                  >
                    {editCatId === cat.id ? (
                      /* ── Édition inline ── */
                      <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editCatNom}
                          onChange={e => setEditCatNom(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateCategory(cat.id)
                            if (e.key === 'Escape') setEditCatId(null)
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 rounded-lg border-2 border-[#1A1040] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citron-400"
                        />
                        <button
                          onClick={() => updateCategory(cat.id)}
                          disabled={savingCat}
                          className="p-1.5 bg-lime-400 rounded-lg border-2 border-[#1A1040] hover:bg-lime-300 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5 text-[#1A1040]" />
                        </button>
                        <button
                          onClick={() => setEditCatId(null)}
                          className="p-1.5 bg-gray-200 rounded-lg border-2 border-gray-300 hover:bg-gray-300"
                        >
                          <X className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-black truncate ${
                          selectedCat?.id === cat.id ? 'text-rose-600' : 'text-[#1A1040]'
                        }`}>
                          {cat.nom}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => moveCategory(cat.id, 'up')}
                            disabled={idx === 0}
                            title="Monter"
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveCategory(cat.id, 'down')}
                            disabled={idx === categories.length - 1}
                            title="Descendre"
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditCatId(cat.id); setEditCatNom(cat.nom) }}
                            title="Renommer"
                            className="p-1 rounded hover:bg-citron-100 text-gray-400 hover:text-[#1A1040] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteCat === cat.id ? (
                            <div className="flex items-center gap-1 bg-red-50 rounded-lg px-1.5 py-0.5 border border-red-200">
                              <span className="text-[10px] text-red-600 font-black whitespace-nowrap">Supprimer ?</span>
                              <button
                                onClick={() => deleteCategory(cat.id)}
                                disabled={!!deletingCatId}
                                className="p-0.5 bg-red-500 rounded text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteCat(null)}
                                className="p-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteCat(cat.id)}
                              title="Supprimer"
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Panneau droit : photos ── */}
        <div className="lg:col-span-2">
          {!selectedCat ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border-4 border-dashed border-[#1A1040]/25 text-center"
              style={{ boxShadow: '5px 5px 0px 0px rgba(26,16,64,0.08)' }}>
              <div className="text-5xl mb-3">👈</div>
              <p className="font-black text-[#1A1040]/40 text-lg">Sélectionnez une catégorie</p>
              <p className="text-sm text-gray-400 mt-1">pour gérer ses photos</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
              style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>

              {/* Header photos */}
              <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-rose-300 text-xs font-bold">Photos</p>
                  <h2 className="font-black text-white text-lg truncate">{selectedCat.nom}</h2>
                </div>
                <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl text-xs font-black border-2 border-citron-300 hover:bg-yellow-300 disabled:opacity-50 transition-colors shrink-0"
                >
                  {uploading
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? `Envoi ${uploadProgress}%` : 'Ajouter des photos'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) uploadPhotos(e.target.files) }}
                />
              </div>

              {/* Barre de progression */}
              {uploading && (
                <div className="w-full h-2 bg-gray-100">
                  <div
                    className="h-full bg-citron-400 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Grille photos */}
              <div className="p-6">
                {loadingPhotos ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3 animate-pulse">📸</div>
                    <p className="font-black text-[#1A1040]/60">Chargement...</p>
                  </div>
                ) : photos.length === 0 ? (
                  <div
                    className="border-4 border-dashed border-[#1A1040]/20 rounded-2xl py-16 text-center cursor-pointer hover:border-[#1A1040]/40 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-5xl mb-3">📸</div>
                    <p className="font-black text-[#1A1040]/40 text-lg">Aucune photo dans cette catégorie</p>
                    <p className="text-sm text-gray-400 mt-1">Cliquez ici ou sur « Ajouter des photos »</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative group">
                        <div
                          className="aspect-square rounded-xl overflow-hidden border-2 border-[#1A1040]"
                          style={{ boxShadow: '2px 2px 0px 0px #1A1040' }}
                        >
                          <img
                            src={photo.url}
                            alt={photo.titre || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Overlay suppression au survol */}
                        <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border-2 border-[#1A1040]">
                          <button
                            onClick={() => deletePhoto(photo)}
                            disabled={deletingPhotoId === photo.id}
                            className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black border-2 border-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                          >
                            {deletingPhotoId === photo.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                            Supprimer
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 text-center truncate px-1">
                          {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
