import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X, MapPin, Phone, Mail, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import HeroTitleEditor, { type HeroStyle, buildTitleStyle } from '../components/HeroTitleEditor'
import { type HeroBg, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'

interface ContentBlock { section: string; contenu: string }

const DEFAULT_CONTACT_BG: HeroBg = { ...DEFAULT_HERO_BG, color: '#1A1040' }

const DEFAULT_TITRE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 36, color: '#ffffff', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}

const DEFAULT_CONTENT: Record<string, string> = {
  contact_titre:     'Viens nous dire bonjour 👋',
  contact_adresse:   '12 rue des Artisans, 75001 Paris',
  contact_telephone: '06 12 34 56 78',
  contact_email:     'contact@univers-creatif-anais.fr',
}

interface FormData { nom: string; email: string; message: string }
const EMPTY_FORM: FormData = { nom: '', email: '', message: '' }

export default function Contact() {
  const { isAdmin } = useAuth()
  const [content, setContent]     = useState<Record<string, string>>(DEFAULT_CONTENT)
  const [contactBg, setContactBg] = useState<HeroBg>(DEFAULT_CONTACT_BG)
  const [titreStyle, setTitreStyle] = useState<HeroStyle>(DEFAULT_TITRE_STYLE)
  const [showTitreEditor, setShowTitreEditor] = useState(false)

  const [form,    setForm]    = useState<FormData>(EMPTY_FORM)
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    loadContent()

    const ch = supabase
      .channel('realtime-contact')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_content' }, () => loadContent())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' },      () => loadSettings())
      .subscribe()

    loadSettings()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function loadContent() {
    const { data } = await supabase
      .from('page_content')
      .select('section, contenu')
      .eq('page', 'contact')
    if (data?.length) {
      const map = { ...DEFAULT_CONTENT }
      data.forEach((row: ContentBlock) => { map[row.section] = row.contenu })
      setContent(map)
    }
  }

  async function loadSettings() {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['contact_bg_config', 'contact_titre_style'])
    if (!data) return
    data.forEach((s: { key: string; value: string }) => {
      if (s.key === 'contact_bg_config')   { try { setContactBg(p => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      if (s.key === 'contact_titre_style') { try { setTitreStyle(p => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Merci de remplir tous les champs.')
      return
    }
    setSending(true)
    setError('')
    try {
      // 1. Enregistrer en base
      await supabase.from('messages').insert([{
        nom:     form.nom,
        email:   form.email,
        message: form.message,
      }])

      // 2. Notification email via Edge Function (silencieuse si non configurée)
      try {
        await supabase.functions.invoke('send-contact-email', {
          body: { nom: form.nom, email: form.email, message: form.message },
        })
      } catch {
        // Email optionnel — le message est déjà sauvegardé
      }

      setSent(true)
      setForm(EMPTY_FORM)
    } catch {
      setError('Une erreur est survenue. Réessaie plus tard.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex-1">

      {/* ===== HERO CONTACT ===== */}
      <section
        className="py-16 px-4 text-center border-b-4 border-[#1A1040] relative overflow-hidden"
        style={buildHeroBgStyle(contactBg)}>
        <div className="max-w-3xl mx-auto relative z-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-rose-400 text-white px-4 py-1.5
                          rounded-full text-sm font-bold border-2 border-rose-300 mb-6">
            <Star className="w-4 h-4 fill-white" /> On est là pour toi !
          </div>

          {/* Titre */}
          <h1
            className="mb-4 leading-tight"
            style={buildTitleStyle(titreStyle)}
            dangerouslySetInnerHTML={{ __html: content['contact_titre'] }}
          />
          {isAdmin && (
            <div className="flex justify-center mb-6">
              <button onClick={() => setShowTitreEditor(true)}
                className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1
                           rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                <Pencil className="w-3 h-3" /> Modifier le titre
              </button>
            </div>
          )}

          {/* Infos de contact */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-4">
            {content['contact_adresse'] && (
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <MapPin className="w-4 h-4 text-rose-300 shrink-0" />
                <span>{content['contact_adresse']}</span>
              </div>
            )}
            {content['contact_telephone'] && (
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <Phone className="w-4 h-4 text-citron-400 shrink-0" />
                <a href={`tel:${content['contact_telephone'].replace(/\s/g, '')}`}
                  className="hover:text-white transition-colors">
                  {content['contact_telephone']}
                </a>
              </div>
            )}
            {content['contact_email'] && (
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <Mail className="w-4 h-4 text-turquoise-400 shrink-0" />
                <a href={`mailto:${content['contact_email']}`}
                  className="hover:text-white transition-colors">
                  {content['contact_email']}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== FORMULAIRE ===== */}
      <section className="py-16 px-4 bg-candy border-b-4 border-[#1A1040]">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>

            <div className="bg-citron-400 border-b-4 border-[#1A1040] px-6 py-4">
              <h2 className="font-serif font-black text-[#1A1040] text-xl">
                ✉️ Envoie-moi un message
              </h2>
            </div>

            <div className="p-6">
              {sent ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 bg-lime-300 rounded-2xl border-2 border-[#1A1040] flex items-center justify-center mx-auto"
                    style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                    <Check className="w-8 h-8 text-[#1A1040]" />
                  </div>
                  <p className="font-black text-[#1A1040] text-lg">Message envoyé ! 🎉</p>
                  <p className="text-gray-500 text-sm">Merci ! Je te revient très vite.</p>
                  <button onClick={() => setSent(false)}
                    className="btn-outline text-sm px-4 py-2">
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">
                      Ton prénom *
                    </label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Sophie"
                      className="w-full border-2 border-[#1A1040] rounded-xl px-4 py-2.5 text-sm font-medium
                                 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">
                      Ton email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="sophie@example.fr"
                      className="w-full border-2 border-[#1A1040] rounded-xl px-4 py-2.5 text-sm font-medium
                                 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">
                      Ton message *
                    </label>
                    <textarea
                      rows={4}
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Coucou ! Je voudrais m'inscrire à…"
                      className="w-full border-2 border-[#1A1040] rounded-xl px-4 py-2.5 text-sm font-medium
                                 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy resize-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-2.5 text-sm text-red-600 font-bold">
                      <X className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}

                  <button type="submit" disabled={sending}
                    className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
                    {sending ? '⏳ Envoi en cours…' : '✉️ Envoyer le message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== ÉDITEUR TITRE ===== */}
      {showTitreEditor && (
        <HeroTitleEditor
          initialText={content['contact_titre']}
          initialStyle={titreStyle}
          sectionKey="contact_titre"
          styleKey="contact_titre_style"
          label="✏️ Titre — Page Contact"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, contact_titre: text }))
            setTitreStyle(style)
            setShowTitreEditor(false)
          }}
          onClose={() => setShowTitreEditor(false)}
        />
      )}

    </main>
  )
}
