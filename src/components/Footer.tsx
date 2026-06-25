import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Pencil, Upload, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import HeroTitleEditor, { type HeroStyle, DEFAULT_HERO_STYLE, buildTitleStyle } from './HeroTitleEditor'

const DEFAULT_FOOTER_TEXT = "l'univers créatif d'Anaïs ✦"
const DEFAULT_FOOTER_STYLE: HeroStyle = {
  ...DEFAULT_HERO_STYLE,
  font: 'sans', fontSize: 18, color: '#ffffff', bold: true, shadow: false,
}

export default function Footer() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [text,  setText]  = useState(DEFAULT_FOOTER_TEXT)
  const [style, setStyle] = useState<HeroStyle>(DEFAULT_FOOTER_STYLE)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: content }, { data: settings }] = await Promise.all([
      supabase.from('page_content').select('contenu').eq('page', 'accueil').eq('section', 'footer_titre').maybeSingle(),
      supabase.from('settings').select('key, value').in('key', ['footer_titre_style', 'footer_icon_url']),
    ])
    if (content?.contenu) setText(content.contenu)
    ;(settings || []).forEach(s => {
      if (s.key === 'footer_titre_style') { try { setStyle(p => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      if (s.key === 'footer_icon_url')    { setIconUrl(s.value || null) }
    })
  }

  async function uploadIcon(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `footer-icon-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('hero').getPublicUrl(filename)
      const url = data.publicUrl + '?t=' + Date.now()
      setIconUrl(url)
      await supabase.from('settings').upsert({ key: 'footer_icon_url', value: url }, { onConflict: 'key' })
    }
    setUploading(false)
  }

  async function resetIcon() {
    setIconUrl(null)
    await supabase.from('settings').upsert({ key: 'footer_icon_url', value: '' }, { onConflict: 'key' })
  }

  return (
    <footer className="bg-[#1A1040] border-t-4 border-[#1A1040]">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-white/30 overflow-hidden shrink-0 group"
            onClick={() => isAdmin && fileRef.current?.click()}
            style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
            {iconUrl
              ? <img src={iconUrl} alt="" className="w-full h-full object-cover" />
              : <Scissors className="w-5 h-5 text-white" />}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploading ? <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" /> : <Upload className="w-3.5 h-3.5 text-white" />}
              </div>
            )}
          </div>
          {isAdmin && (
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadIcon(f); e.target.value = '' }} />
          )}

          <span style={buildTitleStyle(style)} dangerouslySetInnerHTML={{ __html: text }} />

          {isAdmin && (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => setShowEditor(true)}
                className="inline-flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[10px] font-black border border-white/20 hover:bg-white/20 transition-all">
                <Pencil className="w-3 h-3" /> Texte
              </button>
              {iconUrl && (
                <button onClick={resetIcon} title="Revenir à l'icône ciseaux par défaut"
                  className="inline-flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[10px] font-black border border-white/20 hover:bg-red-500/40 transition-all">
                  <X className="w-3 h-3" /> Icône
                </button>
              )}
            </div>
          )}
        </div>

        {/* Confettis déco — le carré jaune cache l'accès à la connexion */}
        <div className="flex items-center gap-2">
          {['bg-rose-400','bg-citron-400','bg-turquoise-400','bg-lime-300','bg-corail-400'].map((c, i) => (
            <div key={i} className={`w-3 h-3 ${c} rounded-sm border border-white/20`}
              style={{ transform: `rotate(${i * 15}deg)`, cursor: i === 1 ? 'pointer' : 'default' }}
              onClick={i === 1 ? () => navigate('/connexion') : undefined} />
          ))}
        </div>

        <p className="text-gray-400 text-sm font-medium">
          © {new Date().getFullYear()} l'univers créatif d'Anaïs — Fait avec 🎨 & ❤️
        </p>
      </div>

      {showEditor && (
        <HeroTitleEditor
          initialText={text}
          initialStyle={style}
          sectionKey="footer_titre"
          styleKey="footer_titre_style"
          label="✏️ Texte du pied de page"
          onSave={(t, s) => { setText(t); setStyle(s); setShowEditor(false) }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </footer>
  )
}
