import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X, Clock, MapPin, ParkingCircle, Scissors, ExternalLink, Palette, Bold, Italic } from 'lucide-react'
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
  infos_titre:              'Informations pratiques 📍',
  infos_horaires:           'Lundi – Vendredi : 9h – 18h\nSamedi : 10h – 16h\nDimanche : Fermé',
  infos_maps_src:           '',
  infos_adresse:            '',
  infos_stationnement:      'Parking gratuit devant l\'atelier.',
  infos_materiel:           'Aucun matériel spécifique requis, tout est fourni sur place !',
  infos_titre_horaires:     'Horaires d\'ouverture',
  infos_titre_maps:         'Plan d\'accès',
  infos_titre_stationnement:'Stationnement',
  infos_titre_materiel:     'Matériel nécessaire',
}

export interface CardStyle {
  headerBg:        string
  headerTextColor: string
  contentColor:    string
  fontFamily:      string
  fontSize:        number
  bold:            boolean
  italic:          boolean
}
type CardKey = 'horaires' | 'maps' | 'stationnement' | 'materiel'
type CardsStyle = Record<CardKey, CardStyle>

const DEFAULT_CARD_STYLES: CardsStyle = {
  horaires:      { headerBg: '#ffe500', headerTextColor: '#1A1040', contentColor: '#374151', fontFamily: 'sans-serif', fontSize: 14, bold: false, italic: false },
  maps:          { headerBg: '#00d4c8', headerTextColor: '#1A1040', contentColor: '#374151', fontFamily: 'sans-serif', fontSize: 14, bold: false, italic: false },
  stationnement: { headerBg: '#b4ff39', headerTextColor: '#1A1040', contentColor: '#374151', fontFamily: 'sans-serif', fontSize: 14, bold: false, italic: false },
  materiel:      { headerBg: '#ffb5c8', headerTextColor: '#1A1040', contentColor: '#374151', fontFamily: 'sans-serif', fontSize: 14, bold: false, italic: false },
}

const FONTS = [
  { value: 'sans-serif',  label: 'Sans-serif' },
  { value: 'serif',       label: 'Serif' },
  { value: 'monospace',   label: 'Monospace' },
  { value: "'Pacifico', cursive",     label: 'Pacifico' },
  { value: "'Playfair Display', serif", label: 'Playfair' },
]

function CardStyleEditor({ style, onSave, onClose }: {
  style: CardStyle
  onSave: (s: CardStyle) => Promise<void>; onClose: () => void
}) {
  const [draft, setDraft] = useState<CardStyle>({ ...style })
  const [saving, setSaving] = useState(false)

  const up = (patch: Partial<CardStyle>) => setDraft(p => ({ ...p, ...patch }))

  async function save() {
    setSaving(true); await onSave(draft); setSaving(false); onClose()
  }

  return (
    <div className="bg-white border-2 border-[#1A1040] rounded-2xl shadow-xl p-4 space-y-3 text-[#1A1040]"
      style={{ boxShadow: '4px 4px 0 #1A1040' }}>

      {/* Aperçu */}
      <div className="rounded-xl overflow-hidden border-2 border-[#1A1040]">
        <div className="px-4 py-2 text-xs font-black uppercase tracking-wide"
          style={{ backgroundColor: draft.headerBg, color: draft.headerTextColor }}>
          Aperçu du bandeau
        </div>
        <div className="px-4 py-2 text-gray-400"
          style={{ color: draft.contentColor, fontFamily: draft.fontFamily, fontSize: draft.fontSize,
            fontWeight: draft.bold ? 700 : 400, fontStyle: draft.italic ? 'italic' : 'normal' }}>
          Texte d'exemple
        </div>
      </div>

      {/* Couleurs bandeau */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { label: 'Fond bandeau',  field: 'headerBg'        as const },
          { label: 'Texte bandeau', field: 'headerTextColor' as const },
        ]).map(({ label, field }) => (
          <div key={field}>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
            <div className="flex items-center gap-2">
              <input type="color" value={draft[field]} onChange={e => up({ [field]: e.target.value })}
                className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5 shrink-0" />
              <input type="text" value={draft[field]} maxLength={7}
                onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) up({ [field]: e.target.value }) }}
                className="flex-1 border-2 border-[#1A1040]/30 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1A1040]" />
            </div>
          </div>
        ))}
      </div>

      {/* Couleur contenu */}
      <div>
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Couleur du texte</label>
        <div className="flex items-center gap-2">
          <input type="color" value={draft.contentColor} onChange={e => up({ contentColor: e.target.value })}
            className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5 shrink-0" />
          <input type="text" value={draft.contentColor} maxLength={7}
            onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) up({ contentColor: e.target.value }) }}
            className="flex-1 border-2 border-[#1A1040]/30 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1A1040]" />
        </div>
      </div>

      {/* Police */}
      <div>
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Police</label>
        <select value={draft.fontFamily} onChange={e => up({ fontFamily: e.target.value })}
          className="w-full border-2 border-[#1A1040]/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1A1040] bg-white">
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Taille + style */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Taille (px)</label>
          <input type="number" min={10} max={32} value={draft.fontSize}
            onChange={e => up({ fontSize: Math.min(32, Math.max(10, parseInt(e.target.value) || 14)) })}
            className="w-full border-2 border-[#1A1040]/30 rounded-xl px-3 py-2 text-sm text-center font-black focus:outline-none focus:border-[#1A1040]" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => up({ bold: !draft.bold })}
            className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-sm transition-all ${draft.bold ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-[#1A1040]/30 text-gray-500 hover:border-[#1A1040]'}`}>
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => up({ italic: !draft.italic })}
            className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${draft.italic ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-[#1A1040]/30 text-gray-500 hover:border-[#1A1040]'}`}>
            <Italic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose}
          className="flex-1 border-2 border-[#1A1040] rounded-xl py-2 text-xs font-black hover:bg-gray-50">
          Annuler
        </button>
        <button onClick={save} disabled={saving}
          className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-xl py-2 text-xs font-black flex items-center justify-center gap-1 disabled:opacity-60">
          <Check className="w-3.5 h-3.5" /> {saving ? 'Sauvegarde…' : 'Appliquer'}
        </button>
      </div>
    </div>
  )
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

function EditableTitle({ value, onSave, isAdmin, textColor }: {
  value: string; onSave: (v: string) => Promise<void>
  isAdmin: boolean; textColor: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  async function save() {
    if (!draft.trim()) return
    setSaving(true); await onSave(draft.trim()); setSaving(false); setEditing(false)
  }

  if (!isAdmin) {
    return <span className="font-black text-sm uppercase tracking-wide" style={{ color: textColor }}>{value}</span>
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 min-w-0 bg-white/80 text-[#1A1040] text-xs font-black uppercase tracking-wide border-2 border-[#1A1040] rounded-lg px-2 py-0.5 focus:outline-none" />
        <button onClick={save} disabled={saving}
          className="w-5 h-5 rounded-md bg-lime-300 border border-[#1A1040] flex items-center justify-center shrink-0 disabled:opacity-50">
          <Check className="w-3 h-3 text-[#1A1040]" />
        </button>
        <button onClick={() => setEditing(false)}
          className="w-5 h-5 rounded-md bg-white border border-[#1A1040] flex items-center justify-center shrink-0">
          <X className="w-3 h-3 text-[#1A1040]" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
      <span className="font-black text-sm uppercase tracking-wide" style={{ color: textColor }}>{value}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" style={{ color: textColor }} />
    </button>
  )
}

export default function Informations() {
  const { isAdmin } = useAuth()
  const [content,         setContent]         = useState<Record<string, string>>(DEFAULT_CONTENT)
  const [heroBg,          setHeroBg]          = useState<HeroBg>(DEFAULT_BG)
  const [titreStyle,      setTitreStyle]      = useState<HeroStyle>(DEFAULT_TITRE_STYLE)
  const [cardStyles,      setCardStyles]      = useState<CardsStyle>(DEFAULT_CARD_STYLES)
  const [editingCard,     setEditingCard]     = useState<CardKey | null>(null)
  const [showBgEditor,    setShowBgEditor]    = useState(false)
  const [showTitreEditor, setShowTitreEditor] = useState(false)
  const [bgUploading,     setBgUploading]     = useState(false)
  const [bgUploadError,   setBgUploadError]   = useState('')
  const bgFileRef = useRef<HTMLInputElement | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)

  // Fond du contenu
  const [contentBg, setContentBg] = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#ffffff' })
  const [showContentBgEditor, setShowContentBgEditor] = useState(false)
  const [contentBgUploading, setContentBgUploading] = useState(false)
  const [contentBgUploadError, setContentBgUploadError] = useState('')
  const contentBgFileRef = useRef<HTMLInputElement | null>(null)
  const contentVideoRef  = useRef<HTMLVideoElement>(null)
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
      .eq('page', 'informations').in('section', Object.keys(DEFAULT_CONTENT))
    if (!data) return
    const map: Record<string, string> = {}
    data.forEach(r => { map[r.section] = r.contenu })
    setContent(prev => ({ ...prev, ...map }))
  }

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('key, value')
      .in('key', ['infos_hero_bg', 'infos_titre_style', 'infos_cards_style', 'infos_content_bg'])
    if (!data) return
    data.forEach(r => {
      if (r.key === 'infos_hero_bg')     { try { setHeroBg(p => ({ ...p, ...JSON.parse(r.value) })) } catch {} }
      if (r.key === 'infos_titre_style') { try { setTitreStyle(p => ({ ...p, ...JSON.parse(r.value) })) } catch {} }
      if (r.key === 'infos_cards_style') { try { setCardStyles(p => ({ ...p, ...JSON.parse(r.value) })) } catch {} }
      if (r.key === 'infos_content_bg')  { try { setContentBg(p => ({ ...p, ...JSON.parse(r.value) })) } catch {} }
    })
  }

  async function saveContentBg() {
    await supabase.from('settings').upsert({ key: 'infos_content_bg', value: JSON.stringify(contentBg) }, { onConflict: 'key' })
    setShowContentBgEditor(false)
  }

  async function saveCardStyle(key: CardKey, style: CardStyle) {
    const updated = { ...cardStyles, [key]: style }
    await supabase.from('settings').upsert({ key: 'infos_cards_style', value: JSON.stringify(updated) }, { onConflict: 'key' })
    setCardStyles(updated)
  }

  async function loadPolaroids() {
    const { data } = await supabase.from('infos_polaroids').select('*').order('sort_order')
    setPolaroids((data as HeroPolaroid[]) || [])
  }

  async function saveContent(section: string, contenu: string) {
    await supabase.from('page_content').upsert({ page: 'informations', section, contenu }, { onConflict: 'page,section' })
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

      {/* Enveloppe Hero + Contenu pour que les polaroïds flottent sur toute la page */}
      <div className="relative">

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

        {/* Polaroïds flottants — desktop uniquement, positionnés par rapport à la page entière */}
        <div className="hidden md:contents">
          {polaroids.filter(p => p.is_visible || isAdmin).map((p, i) => (
            <HeroPolaroidDisplay key={p.id} polaroid={p} index={i} isAdmin={isAdmin}
              onMoved={handlePolaroidMoved} tableName="infos_polaroids" />
          ))}
        </div>

        {/* ── Contenu ── */}
        <div className="relative overflow-hidden" style={buildHeroBgStyle(contentBg)}>
          {contentBg.type === 'video' && contentBg.videoUrl && (
            <>
              <video ref={contentVideoRef} src={contentBg.videoUrl} autoPlay muted={contentBg.videoMuted} loop={contentBg.videoLoop} playsInline className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}/>
              {contentBg.videoOverlay !== 'transparent' && <div className="absolute inset-0" style={{ backgroundColor: contentBg.videoOverlay, zIndex: 1 }}/>}
            </>
          )}
          {isAdmin && (
            <button onClick={() => setShowContentBgEditor(true)}
              className="absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
              <Palette className="w-3.5 h-3.5" /> Fond du contenu
            </button>
          )}
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Horaires */}
          <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '4px 4px 0 #1A1040' }}>
            <div className="px-5 py-3 border-b-2 border-[#1A1040] flex items-center justify-between gap-2"
              style={{ backgroundColor: cardStyles.horaires.headerBg }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Clock className="w-4 h-4 shrink-0" style={{ color: cardStyles.horaires.headerTextColor }} />
                <EditableTitle value={content.infos_titre_horaires}
                  onSave={v => saveContent('infos_titre_horaires', v)}
                  isAdmin={isAdmin} textColor={cardStyles.horaires.headerTextColor} />
              </div>
              {isAdmin && (
                <button onClick={() => setEditingCard(editingCard === 'horaires' ? null : 'horaires')}
                  className="w-6 h-6 rounded-lg border-2 border-[#1A1040]/30 flex items-center justify-center hover:bg-black/10 transition-colors">
                  <Palette className="w-3.5 h-3.5" style={{ color: cardStyles.horaires.headerTextColor }} />
                </button>
              )}
            </div>
            {editingCard === 'horaires' && (
              <div className="px-5 pt-4">
                <CardStyleEditor style={cardStyles.horaires}
                  onSave={s => saveCardStyle('horaires', s)} onClose={() => setEditingCard(null)} />
              </div>
            )}
            <div className="px-5 py-4"
              style={{ color: cardStyles.horaires.contentColor, fontFamily: cardStyles.horaires.fontFamily,
                fontSize: cardStyles.horaires.fontSize, fontWeight: cardStyles.horaires.bold ? 700 : 400,
                fontStyle: cardStyles.horaires.italic ? 'italic' : 'normal' }}>
              <EditableBlock value={content.infos_horaires}
                onSave={v => saveContent('infos_horaires', v)}
                placeholder="Ex: Lundi – Vendredi : 9h – 18h" isAdmin={isAdmin} />
            </div>
          </div>

          {/* Carte Google Maps — 2 lignes sur desktop */}
          <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden md:row-span-2"
            style={{ boxShadow: '4px 4px 0 #1A1040' }}>
            <div className="px-5 py-3 border-b-2 border-[#1A1040] flex items-center justify-between gap-2"
              style={{ backgroundColor: cardStyles.maps.headerBg }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: cardStyles.maps.headerTextColor }} />
                <EditableTitle value={content.infos_titre_maps}
                  onSave={v => saveContent('infos_titre_maps', v)}
                  isAdmin={isAdmin} textColor={cardStyles.maps.headerTextColor} />
              </div>
              <div className="flex items-center gap-2">
                {adresse && (
                  <a href={`https://maps.google.com/maps?q=${encodeURIComponent(adresse)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-black bg-white/60 px-2 py-1 rounded-lg border border-[#1A1040]/30 hover:bg-white transition-colors"
                    style={{ color: cardStyles.maps.headerTextColor }}>
                    <ExternalLink className="w-3 h-3" /> Ouvrir
                  </a>
                )}
                {isAdmin && (
                  <button onClick={() => setEditingCard(editingCard === 'maps' ? null : 'maps')}
                    className="w-6 h-6 rounded-lg border-2 border-[#1A1040]/30 flex items-center justify-center hover:bg-black/10 transition-colors">
                    <Palette className="w-3.5 h-3.5" style={{ color: cardStyles.maps.headerTextColor }} />
                  </button>
                )}
              </div>
            </div>
            {editingCard === 'maps' && (
              <div className="px-5 pt-4">
                <CardStyleEditor style={cardStyles.maps}
                  onSave={s => saveCardStyle('maps', s)} onClose={() => setEditingCard(null)} />
              </div>
            )}

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
            <div className="px-5 py-3 border-b-2 border-[#1A1040] flex items-center justify-between gap-2"
              style={{ backgroundColor: cardStyles.stationnement.headerBg }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ParkingCircle className="w-4 h-4 shrink-0" style={{ color: cardStyles.stationnement.headerTextColor }} />
                <EditableTitle value={content.infos_titre_stationnement}
                  onSave={v => saveContent('infos_titre_stationnement', v)}
                  isAdmin={isAdmin} textColor={cardStyles.stationnement.headerTextColor} />
              </div>
              {isAdmin && (
                <button onClick={() => setEditingCard(editingCard === 'stationnement' ? null : 'stationnement')}
                  className="w-6 h-6 rounded-lg border-2 border-[#1A1040]/30 flex items-center justify-center hover:bg-black/10 transition-colors">
                  <Palette className="w-3.5 h-3.5" style={{ color: cardStyles.stationnement.headerTextColor }} />
                </button>
              )}
            </div>
            {editingCard === 'stationnement' && (
              <div className="px-5 pt-4">
                <CardStyleEditor style={cardStyles.stationnement}
                  onSave={s => saveCardStyle('stationnement', s)} onClose={() => setEditingCard(null)} />
              </div>
            )}
            <div className="px-5 py-4"
              style={{ color: cardStyles.stationnement.contentColor, fontFamily: cardStyles.stationnement.fontFamily,
                fontSize: cardStyles.stationnement.fontSize, fontWeight: cardStyles.stationnement.bold ? 700 : 400,
                fontStyle: cardStyles.stationnement.italic ? 'italic' : 'normal' }}>
              <EditableBlock value={content.infos_stationnement}
                onSave={v => saveContent('infos_stationnement', v)}
                placeholder="Ex: Parking gratuit devant l'atelier." isAdmin={isAdmin} />
            </div>
          </div>
        </div>

        {/* Matériel nécessaire — pleine largeur */}
        <div className="bg-white rounded-3xl border-2 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '4px 4px 0 #1A1040' }}>
          <div className="px-5 py-3 border-b-2 border-[#1A1040] flex items-center justify-between gap-2"
            style={{ backgroundColor: cardStyles.materiel.headerBg }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Scissors className="w-4 h-4 shrink-0" style={{ color: cardStyles.materiel.headerTextColor }} />
              <EditableTitle value={content.infos_titre_materiel}
                onSave={v => saveContent('infos_titre_materiel', v)}
                isAdmin={isAdmin} textColor={cardStyles.materiel.headerTextColor} />
            </div>
            {isAdmin && (
              <button onClick={() => setEditingCard(editingCard === 'materiel' ? null : 'materiel')}
                className="w-6 h-6 rounded-lg border-2 border-[#1A1040]/30 flex items-center justify-center hover:bg-black/10 transition-colors">
                <Palette className="w-3.5 h-3.5" style={{ color: cardStyles.materiel.headerTextColor }} />
              </button>
            )}
          </div>
          {editingCard === 'materiel' && (
            <div className="px-5 pt-4">
              <CardStyleEditor style={cardStyles.materiel}
                onSave={s => saveCardStyle('materiel', s)} onClose={() => setEditingCard(null)} />
            </div>
          )}
          <div className="px-5 py-4"
            style={{ color: cardStyles.materiel.contentColor, fontFamily: cardStyles.materiel.fontFamily,
              fontSize: cardStyles.materiel.fontSize, fontWeight: cardStyles.materiel.bold ? 700 : 400,
              fontStyle: cardStyles.materiel.italic ? 'italic' : 'normal' }}>
            <EditableBlock value={content.infos_materiel}
              onSave={v => saveContent('infos_materiel', v)}
              placeholder="Listez le matériel à apporter..." isAdmin={isAdmin} />
          </div>
        </div>
      </div>
        </div>{/* fin max-w contenu */}
        </div>{/* fin fond du contenu */}

      </div>{/* fin div.relative */}

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

      {/* ── Éditeur fond contenu ── */}
      {showContentBgEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowContentBgEditor(false) }}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '8px 8px 0px 0px #1A1040' }}>
            <div className="sticky top-0 bg-candy border-b-4 border-[#1A1040] px-6 py-4 flex items-center justify-between z-10">
              <span className="font-black text-[#1A1040]">🎨 Fond du contenu — Informations</span>
              <button onClick={() => setShowContentBgEditor(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-[#1A1040] hover:bg-red-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <BgEditor
                bg={contentBg} setBg={setContentBg}
                activeTab={contentBg.type as BgType} setActiveTab={t => setContentBg(p => ({ ...p, type: t }))}
                fileRef={contentBgFileRef}
                uploadError={contentBgUploadError} setUploadError={setContentBgUploadError}
                uploading={contentBgUploading} setUploading={setContentBgUploading}
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t-4 border-[#1A1040] px-6 py-4 flex gap-3 z-10">
              <button onClick={() => setShowContentBgEditor(false)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50 transition-all">
                Annuler
              </button>
              <button onClick={saveContentBg}
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
