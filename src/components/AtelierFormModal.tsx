import { useState, useEffect } from 'react'
import { X, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Atelier } from '../types'

interface Props {
  atelier?: Atelier | null
  categoryId?: string | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY_FORM = {
  titre: '', description: '', date: '', heure: '',
  duree: '', lieu: '', prix: '', places_max: '',
  prix_type: 'personne' as 'personne' | 'duo',
}

export default function AtelierFormModal({ atelier, categoryId, onClose, onSaved }: Props) {
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const isEdit = !!atelier

  useEffect(() => {
    if (atelier) {
      setForm({
        titre:       atelier.titre,
        description: atelier.description,
        date:        atelier.date,
        heure:       atelier.heure,
        duree:       atelier.duree,
        lieu:        atelier.lieu,
        prix:        String(atelier.prix),
        places_max:  String(atelier.places_max),
        prix_type:   atelier.prix_type ?? 'personne',
      })
      if (atelier.image_url) setImagePreview(atelier.image_url)
    }
  }, [atelier])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let image_url = atelier?.image_url ?? null
      if (imageFile) {
        const ext      = imageFile.name.split('.').pop()
        const fileName = `ateliers/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('ateliers').upload(fileName, imageFile, { upsert: true })
        if (uploadError) throw uploadError
        image_url = supabase.storage.from('ateliers').getPublicUrl(fileName).data.publicUrl
      }

      const payload = {
        titre:            form.titre,
        description:      form.description,
        date:             form.date,
        heure:            form.heure,
        duree:            form.duree,
        lieu:             form.lieu,
        prix:             parseFloat(form.prix),
        prix_type:        form.prix_type,
        places_max:       parseInt(form.places_max),
        places_restantes: parseInt(form.places_max),
        image_url,
        category_id:      categoryId ?? atelier?.category_id ?? null,
      }

      if (isEdit && atelier) {
        const { error } = await supabase.from('ateliers')
          .update({ ...payload, places_restantes: atelier.places_restantes })
          .eq('id', atelier.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ateliers').insert([payload])
        if (error) throw error
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-black text-[#1A1040] mb-1">{label}</label>
      <input
        required type={type} value={form[key] as string} placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] shadow-pop w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-[#1A1040] bg-[#1A1040] rounded-t-3xl">
          <h2 className="font-serif text-xl font-black text-citron-400">
            {isEdit ? '✏️ Modifier l\'atelier' : '✨ Nouvel atelier'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm border-2 border-red-200 font-medium">
              😬 {error}
            </div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1">📸 Photo de l'atelier</label>
            <div
              className="border-4 border-dashed border-[#1A1040] rounded-2xl p-4 text-center cursor-pointer hover:bg-rose-50 transition-colors"
              onClick={() => document.getElementById('image-input')?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="aperçu"
                  className="w-full h-40 object-cover rounded-xl border-2 border-[#1A1040]"
                  draggable={false} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl border-2 border-[#1A1040] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-rose-400" />
                  </div>
                  <span className="text-sm font-bold">Clique pour ajouter une photo</span>
                </div>
              )}
              <input id="image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>

          {field('🏷️ Titre de l\'atelier', 'titre', 'text', 'Ex: Bracelet Macramé')}

          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1">📝 Description</label>
            <textarea
              required value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Décrivez l'atelier..."
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('📅 Date', 'date', 'date')}
            {field('🕐 Heure de début', 'heure', 'time')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('⏱️ Durée', 'duree', 'text', 'Ex: 2h30')}
            {field('📍 Lieu', 'lieu', 'text', 'Ex: 12 rue des Arts')}
          </div>

          {/* Prix + type */}
          <div className="grid grid-cols-2 gap-3">
            {field('💶 Prix (€)', 'prix', 'number', '35')}
            <div>
              <label className="block text-sm font-black text-[#1A1040] mb-1">👤 Prix par</label>
              <div className="flex rounded-xl overflow-hidden border-2 border-[#1A1040] h-[42px]">
                {(['personne', 'duo'] as const).map(type => (
                  <button key={type} type="button"
                    onClick={() => setForm(p => ({ ...p, prix_type: type }))}
                    className={`flex-1 text-sm font-black transition-all ${
                      form.prix_type === type
                        ? 'bg-[#1A1040] text-citron-400'
                        : 'bg-candy text-[#1A1040] hover:bg-rose-50'
                    }`}>
                    {type === 'personne' ? '👤 Pers.' : '👥 Duo'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {field('👥 Nb de places', 'places_max', 'number', '8')}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-3 rounded-2xl font-black text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1A1040] text-citron-400 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 transition-all disabled:opacity-60"
              style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
              {loading ? '⏳ Enregistrement...' : isEdit ? '✅ Modifier' : '🚀 Créer l\'atelier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
