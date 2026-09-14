import { useState, useEffect } from 'react'
import { Check, RefreshCw, MapPin, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function InformationsAdmin() {
  const [mapsUrl,    setMapsUrl]    = useState('')
  const [adresse,    setAdresse]    = useState('')
  const [mapsSaving, setMapsSaving] = useState(false)
  const [mapsSaved,  setMapsSaved]  = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase.from('page_content').select('section, contenu')
      .in('section', ['infos_maps_src', 'infos_adresse'])
    if (!data) return
    const map: Record<string, string> = {}
    data.forEach(r => { map[r.section] = r.contenu })
    setMapsUrl(map['infos_maps_src'] || '')
    setAdresse(map['infos_adresse']  || '')
  }

  async function saveMaps(e: React.FormEvent) {
    e.preventDefault()
    setMapsSaving(true)
    await Promise.all([
      supabase.from('page_content').upsert({ section: 'infos_maps_src', contenu: mapsUrl.trim() }, { onConflict: 'section' }),
      supabase.from('page_content').upsert({ section: 'infos_adresse',  contenu: adresse.trim()  }, { onConflict: 'section' }),
    ])
    setMapsSaving(false); setMapsSaved(true)
    setTimeout(() => setMapsSaved(false), 3000)
  }

  return (
    <main className="flex-1 bg-candy overflow-x-hidden">

      {/* En-tête */}
      <div className="bg-[#1A1040] border-b-4 border-[#1A1040] px-6 py-8 text-center">
        <h1 className="font-serif font-black text-3xl text-white mb-1">ℹ️ Page Informations</h1>
        <p className="text-white/60 text-sm">Configurez les informations pratiques de l'atelier</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Lien vers la page publique */}
        <a href="/informations" target="_blank"
          className="flex items-center justify-center gap-2 w-full bg-white text-[#1A1040] py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
          style={{ boxShadow: '4px 4px 0 #1A1040' }}>
          <ExternalLink className="w-4 h-4" /> Voir la page Informations →
        </a>

        <p className="text-xs text-gray-500 text-center -mt-2">
          Les horaires, stationnement et matériel sont modifiables directement sur la page (en cliquant sur ✏️)
        </p>

        {/* Google Maps */}
        <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '4px 4px 0 #1A1040' }}>
          <div className="bg-candy px-6 py-4 border-b-2 border-[#1A1040] flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#00d4c8]" />
            <div>
              <h2 className="font-black text-[#1A1040] text-sm">Carte Google Maps</h2>
              <p className="text-[10px] text-gray-400 font-bold">URL embed pour afficher le plan sur la page Informations</p>
            </div>
          </div>

          <form onSubmit={saveMaps} className="p-6 space-y-5">

            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1.5">Adresse de l'atelier</label>
              <input value={adresse} onChange={e => setAdresse(e.target.value)}
                placeholder="12 rue des Artisans, 75001 Paris"
                className="w-full text-sm border-2 border-[#1A1040]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00d4c8]" />
              <p className="text-[10px] text-gray-400 mt-1">Affichée sous la carte avec un lien "Ouvrir dans Maps"</p>
            </div>

            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1.5">URL d'intégration Google Maps</label>
              <input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full text-sm border-2 border-[#1A1040]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00d4c8] font-mono" />
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-[11px] text-blue-700 space-y-1">
                <p className="font-black">Comment obtenir l'URL embed :</p>
                <ol className="space-y-0.5 list-decimal list-inside">
                  <li>Ouvrez Google Maps et trouvez votre adresse</li>
                  <li>Cliquez sur <strong>Partager</strong> → <strong>Intégrer une carte</strong></li>
                  <li>Copiez uniquement l'URL dans <code className="bg-blue-100 px-1 rounded">src="…"</code> de l'iframe</li>
                </ol>
              </div>
            </div>

            {mapsUrl && (
              <div className="rounded-2xl overflow-hidden border-2 border-[#1A1040]"
                style={{ paddingBottom: '56%', position: 'relative' }}>
                <iframe src={mapsUrl} className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Aperçu carte" />
              </div>
            )}

            <button type="submit" disabled={mapsSaving}
              className="flex items-center gap-1.5 bg-lime-300 text-[#1A1040] px-5 py-2.5 rounded-xl text-sm font-black border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60"
              style={{ boxShadow: '3px 3px 0 #1A1040' }}>
              {mapsSaving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                : mapsSaved
                  ? '✅ Sauvegardé !'
                  : <><Check className="w-4 h-4" /> Sauvegarder</>}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
