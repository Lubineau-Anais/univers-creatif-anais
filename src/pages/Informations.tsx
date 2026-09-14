import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X, Clock, MapPin, ParkingCircle, Scissors, ExternalLink, Palette } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import HeroTitleEditor, { type HeroStyle, buildTitleStyle } from '../components/HeroTitleEditor'
import { type HeroBg, type BgType, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'
import BgEditor from '../components/BgEditor'
import HeroPolaroidDisplay from '../components/HeroPolaroidDisplay'
import HeroPolaroidManager, { type HeroPolaroid } from '../components/HeroPolaroidManager'
import PolaroidMobileStrip from '../components/PolaroidMobileStrip'

const DEFAULT_BG: HeroBg = { ...DEFAULT_HERO_BG, color: '#1A1040' }
const DEFAULT_TITRE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 36, color: '#ffffff', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CONTENT: Record<string, string> = {
  infos_titre:         'Informations pratiques 📍',
  infos_horaires:      'Lundi – Vendredi : 9h – 18h\nSamedi : 10h – 16h\nDimanche : Fermé',
  infos_maps_src:      '',
  infos_adresse:       '',
  infos_stationnement: 'Parking gratuit devant l\'atelier.',
  infos_materiel:      'Aucun matériel spécifique requis, tout est fourni sur place !',
}

function EditableBlock({
  value, onSave, placeholder, isAdmin,
}: {
  value: string; onSave: (v: string) => Promise<void>
  placeholder?: string; isAdmin: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  async function save() {
    setSaving(true); await onSave(draft); setSaving(false); setEditing(false)
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </p>
    )
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5}
          className="w-full text-sm border-2 border-[#1A1040] rounded-xl px-3 py-2 resize-y focus:outline-none focus:border-rose-400" />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 bg-lime-300 text-[#1A1040] px-3 py-1.5 rounded-xl text-xs font-black border-2 border-[#1A1040] disabled:opacity-60"
            style={{ boxShadow: '2px 2px 0 #1A1040' }}>
            <Check className="w-3.5 h-3.5" /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
          <button onClick={() => setEditing(false)}
            className="flex items-center gap-1 bg-white text-[#1A1040] px-3 py-1.5 rounded-xl text-xs font-black border-2 border-[#1A1040]">
            <X className="w-3.5 h-3.5" /> Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pr-8">
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </p>
      <button onClick={() => setEditing(true)}
        className="absolute top-0 right-0 w-7 h-7 bg-citron-400 rounded-lg border-2 border-[#1A1040] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ boxShadow: '2px 2px 0 #1A1040' }}>
        <Pencil className="w-3.5 h-3.5 text-[#1A1040]" />
      </button>
    </div>
  )
}

export default function Informations() {
  const { isAdmin } = useAuth()
  const [content,         setContent]         = useState<Record<string, string>>(DEFAULT_CONTENT)
  const [heroBg,          setHeroBg]          = useState<HeroBg>(DEFAULT_BG)
  const [titreStyle,      setTitreStyle]      = useState<HeroStyle>(DEFAULT_TITRE_STYLE)
  const [showBgEditor,    setShowBgEditor]    = useState(false)
  const [showTitreEditor, setShowTitreEditor] = useState(false)
  const [bgUploading,     setBgUploading]     = useState(false)
  const [bgUploadError,   setBgUploadError]   = useState('')
  const bgFileRef = useRef<HTMLInputElement | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const [polaroids,           setPolaroids]           = useState<HeroPolaroid[]>([])
  const [showPolaroidManager, setShowPolaroidManager] = useState(false)

  useEffect(() => {
    loadContent(); loadSettings(); loadPolaroids()
    const ch = supabase
      .channel('realtime-infos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_content' }, () => loadContent())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' },      () => loadSettings())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = heroBg.videoMuted
  }, [heroBg.videoMuted])

  async function loadContent() {
    const { data } = await supabase.from('page_content').select('section, contenu')
      .in('section', Object.keys(DEFAULT_CONTENT))
    if (!data) return
    const map: Record<string, string> = {}
    data.forEach(r => { map[r.section] = r.contenu })
    setContent(prev => ({ ...prev, ...map }))
  }

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('key, value')
      .in('key', ['infos_hero_bg', 'infos_titre_style'])
    if (!data) return
    data.forEach(r => {
      if (r.key === 'infos_hero_bg')     { try { setHeroBg(p => ({ ...p, ...JSON.parse(r.value) })) } catch {} }
      if (r.key === 'infos_titre_style') { try { setTitreStyle(p => ({ ...p, ...JSON.parse(r.value) })) } catch {} }
    })
  }

  async function loadPolaroids() {
    const { data } = await supabase.from('infos_polaroids').select('*').order('sort_order')
    setPolaroids((data as HeroPolaroid[]) || [])
  }

  async function saveContent(section: string, contenu: string) {
    await supabase.from('page_content').upsert({ section, contenu }, { onConflict: 'section' })
    setContent(prev => ({ ...prev, [section]: contenu }))
  }

  async function saveBg() {
    await supabase.from('settings').upsert({ key: 'infos_hero_bg', value: JSON.stringify(heroBg) }, { onConflict: 'key' })
    setShowBgEditor(false)
  }

  function handlePolaroidMoved(id: string, offset_x: number, offset_y: number) {
    setPolaroids(prev => prev.map(p => p.id === id ? { ...p, offset_x, offset_y } : p))
  }

  const mapsUrl = content.infos_maps_src?.trim()
  const adresse = content.infos_adresse?.trim()

  return (
    <main className="flex-1 bg-candy overflow-x-hidden">

      <PolaroidMobileStrip polaroids={polaroids} isAdmin={isAdmin} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b-4 border-[#1A1040]"
        style={{ ...buildHeroBgStyle(heroBg), minHeight: '220px' }}>
        {heroBg.type === 'video' && heroBg.videoUrl && (
          <video ref={videoRef} src={heroBg.videoUrl} autoPlay muted={heroBg.videoMuted}
            loop={heroBg.videoLoop} playsInline
            className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
        )}
        {heroBg.type === 'video' && heroBg.videoOverlay !== 'transparent' && (
          <div className="absolute inset-0" style={{ backgroundColor: heroBg.videoOverlay, zIndex: 1 }} />
        )}

        {isAdmin && (
          <button onClick={() => setShowBgEditor(true)}
            className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
            <Palette className="w-3.5 h-3.5" /> Fond du hero
          </button>
        )}

        {/* Polaroids desktop */}
        <div className="hidden md:contents">
          {polaroids.filter(p => p.is_visible || isAdmin).map((p, i) => (
            <HeroPolaroidDisplay key={p.id} polaroid={p} index={i} isAdmin={isAdmin}
              onMoved={handlePolaroidMoved} tableName="infos_polaroids" />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-14 flex flex-col items-center text-center gap-4">
          <h1 style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: content.infos_titre }} />
          {isAdmin && (
            <div className="flex flex-wrap gap-2 mt-1">
              <button onClick={() => setShowTitreEditor(true)}
                className="flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                <Pencil className="w-3.5 h-3.5" /> Modifier le titre
              </button>
              <button onClick={() => setShowPolaroidManager(true)}
                className="flex items-center gap-1.5 bg-rose-400 text-white px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-rose-500 transition-all">
                📸 Polaroids
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Contenu ── */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Horaires */}
          <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '4px 4px 0 #1A1040' }}>
            <div className="bg-citron-400 px-5 py-3 border-b-2 border-[#1A1040] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1A1040]" />
              <h2 className="font-black text-[#1A1040] text-sm uppercase tracking-wide">Horaires d'ouverture</h2>
            </div>
            <div className="px-5 py-4">
              <EditableBlock value={content.infos_horaires}
                onSave={v => saveContent('infos_horaires', v)}
                placeholder="Ex: Lundi – Vendredi : 9h – 18h" isAdmin={isAdmin} />
            </div>
          </div>

          {/* Carte Google Maps — 2 lignes sur desktop */}
          <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden md:row-span-2"
            style={{ boxShadow: '4px 4px 0 #1A1040' }}>
            <div className="bg-[#00d4c8] px-5 py-3 border-b-2 border-[#1A1040] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1A1040]" />
                <h2 className="font-black text-[#1A1040] text-sm uppercase tracking-wide">Plan d'accès</h2>
              </div>
              {adresse && (
                <a href={`https://maps.google.com/maps?q=${encodeURIComponent(adresse)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-black text-[#1A1040] bg-white/60 px-2 py-1 rounded-lg border border-[#1A1040]/30 hover:bg-white transition-colors">
                  <ExternalLink className="w-3 h-3" /> Ouvrir
                </a>
              )}
            </div>

            {mapsUrl ? (
              <div className="relative" style={{ paddingBottom: '75%' }}>
                <iframe src={mapsUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Plan d'accès à l'atelier" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-gray-400 gap-3">
                <MapPin className="w-12 h-12 opacity-20" />
                <p className="text-sm font-bold text-gray-300">Carte non configurée</p>
                {isAdmin && (
                  <a href="/informations-admin"
                    className="text-xs text-turquoise-500 font-black underline hover:text-turquoise-700">
                    → Configurer dans Infos admin
                  </a>
                )}
              </div>
            )}

            {adresse && (
              <div className="px-5 py-3 border-t-2 border-[#1A1040] bg-candy">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#00d4c8] shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 font-medium">{adresse}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stationnement */}
          <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '4px 4px 0 #1A1040' }}>
            <div className="bg-lime-300 px-5 py-3 border-b-2 border-[#1A1040] flex items-center gap-2">
              <ParkingCircle className="w-4 h-4 text-[#1A1040]" />
              <h2 className="font-black text-[#1A1040] text-sm uppercase tracking-wide">Stationnement</h2>
            </div>
            <div className="px-5 py-4">
              <EditableBlock value={content.infos_stationnement}
                onSave={v => saveContent('infos_stationnement', v)}
                placeholder="Ex: Parking gratuit devant l'atelier." isAdmin={isAdmin} />
            </div>
          </div>
        </div>

        {/* Matériel nécessaire — pleine largeur */}
        <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '4px 4px 0 #1A1040' }}>
          <div className="bg-rose-400 px-5 py-3 border-b-2 border-[#1A1040] flex items-center gap-2">
            <Scissors className="w-4 h-4 text-white" />
            <h2 className="font-black text-white text-sm uppercase tracking-wide">Matériel nécessaire</h2>
          </div>
          <div className="px-5 py-4">
            <EditableBlock value={content.infos_materiel}
              onSave={v => saveContent('infos_materiel', v)}
              placeholder="Listez le matériel à apporter..." isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      {/* ── Éditeur titre ── */}
      {showTitreEditor && (
        <HeroTitleEditor
          initialText={content.infos_titre}
          initialStyle={titreStyle}
          page="informations"
          sectionKey="infos_titre"
          styleKey="infos_titre_style"
          label="✏️ Titre — Page Informations"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, infos_titre: text }))
            setTitreStyle(style)
            setShowTitreEditor(false)
          }}
          onClose={() => setShowTitreEditor(false)}
        />
      )}

      {/* ── Éditeur fond hero ── */}
      {showBgEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowBgEditor(false) }}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '8px 8px 0px 0px #1A1040' }}>
            <div className="sticky top-0 bg-candy border-b-4 border-[#1A1040] px-6 py-4 flex items-center justify-between z-10">
              <span className="font-black text-[#1A1040]">🎨 Fond du hero</span>
              <button onClick={() => setShowBgEditor(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-[#1A1040] hover:bg-red-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <BgEditor
                bg={heroBg}
                setBg={setHeroBg}
                activeTab={heroBg.type as BgType}
                setActiveTab={t => setHeroBg(p => ({ ...p, type: t }))}
                fileRef={bgFileRef}
                uploadError={bgUploadError}
                setUploadError={setBgUploadError}
                uploading={bgUploading}
                setUploading={setBgUploading}
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t-4 border-[#1A1040] px-6 py-4 flex gap-3 z-10">
              <button onClick={() => setShowBgEditor(false)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50 transition-all">
                Annuler
              </button>
              <button onClick={saveBg}
                className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] transition-all flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gestionnaire polaroids ── */}
      {showPolaroidManager && (
        <HeroPolaroidManager
          polaroids={polaroids}
          onClose={() => setShowPolaroidManager(false)}
          onRefresh={loadPolaroids}
          tableName="infos_polaroids"
          title="Polaroïds — Page Informations"
        />
      )}
    </main>
  )
}
