import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Star, Image as ImageIcon, Palette, Check, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { supabase } from '../lib/supabase'
import HeroTitleEditor, { type HeroStyle, DEFAULT_HERO_STYLE, buildTitleStyle } from '../components/HeroTitleEditor'
import { type HeroBg, type BgType, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'
import BgEditor from '../components/BgEditor'
import HeroPolaroidManager, { type HeroPolaroid } from '../components/HeroPolaroidManager'
import AproposPhotoManager from '../components/AproposPhotoManager'
import AproposPhotoDisplay, { type AproposPhoto } from '../components/AproposPhotoDisplay'
import HeroPolaroidDisplay from '../components/HeroPolaroidDisplay'

// ─── Types ─────────────────────────────────────────────────────────────────
interface ContentBlock { section: string; contenu: string }
interface Actu {
  id: string; slot: number; titre: string; texte: string
  photo_url: string; date_debut: string; date_fin: string
}

const ROTS  = ['-rotate-2', 'rotate-1', 'rotate-3', '-rotate-1', 'rotate-2', '-rotate-3']
const TAPES = ['bg-citron-400/60', 'bg-rose-400/60', 'bg-turquoise-400/60', 'bg-lime-400/60', 'bg-orange-400/60', 'bg-violet-400/60']

// ─── Types section Actu ────────────────────────────────────────────────────
interface BadgeConfig  { text: string; bg: string; textColor: string; radius: string }
interface BtnConfig    { bg: string; text: string; label: string; radius: string; bold: boolean; fontSize: number }
interface HeroCtaBtn   { label: string; bg: string; text: string; border: string; radius: string; bold: boolean; fontSize: number; font: string }

const DEFAULT_HERO_BTN1: HeroCtaBtn = { label: '🎨 Voir les ateliers', bg: '#ffffff', text: '#1A1040', border: '#1A1040', radius: 'rounded-2xl', bold: true, fontSize: 14, font: 'sans' }
const DEFAULT_HERO_BTN2: HeroCtaBtn = { label: '✉️ Nous contacter',    bg: '#ffffff', text: '#1A1040', border: '#1A1040', radius: 'rounded-2xl', bold: true, fontSize: 14, font: 'sans' }

const BTN_FONT_MAP: Record<string, string> = { sans: 'sans-serif', serif: 'serif', mono: 'monospace', cursive: 'cursive' }
function heroBtnStyle(btn: HeroCtaBtn) {
  return { backgroundColor: btn.bg, color: btn.text, borderColor: btn.border, fontSize: `${btn.fontSize}px`, fontWeight: btn.bold ? 'bold' : 'normal', fontFamily: BTN_FONT_MAP[btn.font] || 'sans-serif' }
}

const DEFAULT_ACTU_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#1A1040',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}

const DEFAULT_APROPOS_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#1A1040',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}

// ─── Section Avis Google ─────────────────────────────────────────────────────
interface GoogleReview {
  rating: number
  text?: { text: string; languageCode?: string }
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }
  relativePublishTimeDescription?: string
}

const DEFAULT_AVIS_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#ffffff',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}

// ─── Section Réseaux sociaux ───────────────────────────────────────────────────
const DEFAULT_RESEAUX_BADGE: BadgeConfig = { text: '✨ Suivez-nous !', bg: '#fb7185', textColor: '#ffffff', radius: 'rounded-full' }
const DEFAULT_RESEAUX_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 24, color: '#ffffff',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}

// ─── Section Valeurs ──────────────────────────────────────────────────────────
interface ValeurCard {
  id: string; icon: string; iconType: 'emoji' | 'image'; iconBg: string
  title: string; desc: string; cardRadius: string; cardBg: string; borderColor: string
}
const RADIUS_TO_PX: Record<string, string> = {
  'rounded-none': '0', 'rounded-xl': '12px', 'rounded-2xl': '16px',
  'rounded-3xl': '24px', 'rounded-full': '9999px',
}
const DEFAULT_VALEURS_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CARD_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 18, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CARD_DESC_STYLE: HeroStyle = {
  font: 'sans', fontSize: 14, color: '#4b5563', bold: false, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_VALEURS_CARDS: ValeurCard[] = [
  { id: '1', icon: '🌈', iconType: 'emoji', iconBg: '#fb7185', title: 'Ambiance top moumoute',  desc: 'Zéro pression, 100% bonne humeur. On vient pour se faire plaisir, pas pour être parfait·e !', cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040' },
  { id: '2', icon: '✂️', iconType: 'emoji', iconBg: '#4dd9c0', title: 'Créativité sans limites', desc: 'Broderie, couture, peinture, collage… autant d\'ateliers que d\'envies. À toi de choisir !',     cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040' },
  { id: '3', icon: '🎉', iconType: 'emoji', iconBg: '#ffe500', title: 'Des rencontres en or',    desc: 'Les meilleurs souvenirs se créent souvent autour d\'une table et de plein de matières colorées.', cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040' },
]

const DEFAULT_APROPOS_BODY_STYLE: HeroStyle = {
  font: 'sans', fontSize: 16, color: '#374151',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: false, italic: false, underline: false,
}

// ─── Contenu par défaut ─────────────────────────────────────────────────────
const DEFAULT_CONTENT: Record<string, string> = {
  hero_titre:         'Crée, explore & éclate-toi !',
  hero_sous_titre:   'Des ateliers créatifs hauts en couleur pour laisser libre cours à ton imagination. Broderie, peinture, couture... ici, tout est permis (sauf l\'ennui) ! 🎉',
  actu_section_titre: 'Les dernières nouvelles ✦',
  valeurs_titre:      'Pourquoi nous rejoindre ?',
  avis_titre:         'Avis clients ✦',
  apropos_titre:      'Une passion, plein de couleurs !',
  apropos_texte:     'Bonjour ! Moi c\'est l\'univers créatif d\'Anaïs, le QG des passionné·e·s de créations manuelles. J\'ai ouvert cet espace parce que je crois dur comme fer que créer avec ses mains, ça rend heureux·se. Ici, on rigole, on expérimente, on rate (et on recommence avec le sourire). Peu importe ton niveau — débutant·e total·e ou artiste en herbe, t\'es le·la bienvenu·e !',
  reseaux_titre:     'On est aussi sur les réseaux ✦',
}


// Icônes réseaux sociaux
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)
const IconFacebook = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
const IconTiktok = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z"/>
  </svg>
)
const IconLinkedin = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)
const IconPinterest = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
)

// ─── Page Accueil ──────────────────────────────────────────────────────────
export default function Accueil() {
  const { isAdmin } = useAuth()
  const { logoUrl } = useSiteSettings()
  const [logoVisible, setLogoVisible] = useState(true)
  const [content, setContent]   = useState<Record<string, string>>(DEFAULT_CONTENT)
  const [actus, setActus]             = useState<Actu[]>([])
  const [maxSlotAccueil, setMaxSlotAccueil] = useState(3)
  const [slotVisibility, setSlotVisibility] = useState<Record<number, boolean>>({})
  const [actuPolaroidSize, setActuPolaroidSize] = useState(208)
  const [actuTitreFont,  setActuTitreFont]  = useState('cursive')
  const [actuTitreSize,  setActuTitreSize]  = useState(18)
  const [actuTitreColor, setActuTitreColor] = useState('#1A1040')
  const [actuTexteFont,  setActuTexteFont]  = useState('sans')
  const [actuTexteSize,  setActuTexteSize]  = useState(13)
  const [actuTexteColor, setActuTexteColor] = useState('#4b5563')
  const [expandedActu, setExpandedActu] = useState<Actu | null>(null)
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [heroStyle, setHeroStyle]           = useState<HeroStyle>(DEFAULT_HERO_STYLE)
  const [showTitleEditor, setShowTitleEditor] = useState(false)
  const [heroBg,  setHeroBg]  = useState<HeroBg>(DEFAULT_HERO_BG)
  const [showBgEditor, setShowBgEditor]   = useState(false)
  const [bgUploading, setBgUploading]     = useState(false)
  const [bgUploadError, setBgUploadError] = useState('')
  const bgFileRef = useRef<HTMLInputElement | null>(null)
  // ── Section Actu ──
  const [actuBg,          setActuBg]          = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#ffffff' })
  const [actuTitleStyle,  setActuTitleStyle]   = useState<HeroStyle>(DEFAULT_ACTU_TITLE_STYLE)
  const [,               setActuBadge]        = useState<BadgeConfig>({ text: '🗞️ Actu du moment', bg: '#ffe500', textColor: '#1A1040', radius: 'rounded-full' })
  const [actuBtn,         setActuBtn]          = useState<BtnConfig>({ bg: '#1A1040', text: '#ffe500', label: '✏️ Modifier', radius: 'rounded-lg', bold: true, fontSize: 10 })
  const [showActuTitleEditor, setShowActuTitleEditor] = useState(false)

  // Boutons CTA Hero
  const [heroBtn1, setHeroBtn1] = useState<HeroCtaBtn>(DEFAULT_HERO_BTN1)
  const [heroBtn2, setHeroBtn2] = useState<HeroCtaBtn>(DEFAULT_HERO_BTN2)
  const [navAteliersVisible, setNavAteliersVisible] = useState(true)
  const [navContactVisible,  setNavContactVisible]  = useState(true)

  // Section Valeurs
  const [valeursBg,            setValeursBg]            = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#fff5fb' })
  const [valeursTitleStyle,    setValeursTitleStyle]    = useState<HeroStyle>(DEFAULT_VALEURS_TITLE_STYLE)
  const [valeursCardTitleStyle,setValeursCardTitleStyle]= useState<HeroStyle>(DEFAULT_CARD_TITLE_STYLE)
  const [valeursCardDescStyle, setValeursCardDescStyle] = useState<HeroStyle>(DEFAULT_CARD_DESC_STYLE)
  const [valeursCards,         setValeursCards]         = useState<ValeurCard[]>(DEFAULT_VALEURS_CARDS)
  const [showValeursTitleEditor, setShowValeursTitleEditor] = useState(false)

  // Section À Propos
  const [aproposBg,            setAproposBg]            = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#ffffff' })
  const [aproposPhotos,        setAproposPhotos]        = useState<AproposPhoto[]>([])
  const [showAproposManager,   setShowAproposManager]   = useState(false)

  // Drag photo À Propos (admin) — collage libre
  const aproposDrag = useRef({ active: false, id: '', mx: 0, my: 0, ox: 0, oy: 0, fx: 0, fy: 0 })
  const [draggingAproposId, setDraggingAproposId] = useState<string | null>(null)
  const [aproposTitleStyle,    setAproposTitleStyle]    = useState<HeroStyle>(DEFAULT_APROPOS_TITLE_STYLE)
  const [showAproposTitleEditor, setShowAproposTitleEditor] = useState(false)
  const [aproposBodyStyle,     setAproposBodyStyle]     = useState<HeroStyle>(DEFAULT_APROPOS_BODY_STYLE)
  const [showAproposBodyEditor,  setShowAproposBodyEditor]  = useState(false)

  // Section Avis clients
  const [avisBg,            setAvisBg]            = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#1A1040' })
  const [avisTitleStyle,    setAvisTitleStyle]    = useState<HeroStyle>(DEFAULT_AVIS_TITLE_STYLE)
  const [googleReviews,     setGoogleReviews]     = useState<GoogleReview[]>([])
  const [reviewsLoading,    setReviewsLoading]    = useState(false)
  const [googleApiKey,      setGoogleApiKey]      = useState('')
  const [googlePlaceId,     setGooglePlaceId]     = useState('')
  const [showAvisTitleEditor, setShowAvisTitleEditor] = useState(false)

  // Section Réseaux sociaux
  const [reseauxBadge,       setReseauxBadge]       = useState<BadgeConfig>(DEFAULT_RESEAUX_BADGE)
  const [reseauxTitleStyle,  setReseauxTitleStyle]  = useState<HeroStyle>(DEFAULT_RESEAUX_TITLE_STYLE)
  const [showReseauxBadgeEditor, setShowReseauxBadgeEditor] = useState(false)
  const [showReseauxTitleEditor, setShowReseauxTitleEditor] = useState(false)

  // Ref pour la vidéo hero (nécessaire pour gérer muted en React)
  const heroVideoRef = useRef<HTMLVideoElement>(null)

  const DEFAULT_HERO_SUB_STYLE: HeroStyle = {
    ...DEFAULT_HERO_STYLE,
    fontSize:  18,
    color:     '#ffe4e6',
    bold:      false,
    shadow:    false,
  }
  const [heroSubStyle, setHeroSubStyle]         = useState<HeroStyle>(DEFAULT_HERO_SUB_STYLE)
  const [showSubEditor, setShowSubEditor]       = useState(false)
  const [heroTitreVisible,     setHeroTitreVisible]     = useState(true)
  const [heroSousTitreVisible, setHeroSousTitreVisible] = useState(true)

  // Polaroïds du Hero
  const [polaroids, setPolaroids] = useState<HeroPolaroid[]>([])
  const [showPolaroidManager, setShowPolaroidManager] = useState(false)

  // Évite d'afficher le fond/titre par défaut avant le chargement des vrais réglages
  const [heroReady, setHeroReady] = useState(false)

  // Sync muted sur la vidéo (React ne propage pas l'attribut muted en re-render)
  useEffect(() => {
    if (heroVideoRef.current) heroVideoRef.current.muted = heroBg.videoMuted
  }, [heroBg.videoMuted, heroBg.videoUrl])

  // Fetch des avis Google dès que l'API key + Place ID sont disponibles
  useEffect(() => {
    if (!googleApiKey || !googlePlaceId) return
    let cancelled = false
    setReviewsLoading(true)
    fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}?languageCode=fr`,
      { headers: { 'X-Goog-Api-Key': googleApiKey, 'X-Goog-FieldMask': 'reviews' } }
    )
      .then(r => r.json())
      .then(data => { if (!cancelled) setGoogleReviews(data.reviews || []) })
      .catch(() => { if (!cancelled) setGoogleReviews([]) })
      .finally(() => { if (!cancelled) setReviewsLoading(false) })
    return () => { cancelled = true }
  }, [googleApiKey, googlePlaceId])

  useEffect(() => {
    Promise.all([loadContent(), loadActus()]).then(() => setHeroReady(true))
    loadSocialLinks()
    loadPolaroids()
    loadAproposPhotos()

    // ── Realtime : mise à jour instantanée dès qu'un admin modifie quelque chose ──
    const channelSettings = supabase
      .channel('realtime-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        loadActus()
        loadSocialLinks()
      })
      .subscribe()

    const channelContent = supabase
      .channel('realtime-page-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_content' }, () => {
        loadContent()
      })
      .subscribe()

    const channelActus = supabase
      .channel('realtime-actus')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actus' }, () => {
        loadActus()
      })
      .subscribe()

    const channelPolaroids = supabase
      .channel('realtime-hero-polaroids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_polaroids' }, () => {
        loadPolaroids()
      })
      .subscribe()

    const channelAproposPhotos = supabase
      .channel('realtime-apropos-photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apropos_photos' }, () => {
        loadAproposPhotos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channelSettings)
      supabase.removeChannel(channelContent)
      supabase.removeChannel(channelActus)
      supabase.removeChannel(channelPolaroids)
      supabase.removeChannel(channelAproposPhotos)
    }
  }, [])

  async function loadPolaroids() {
    const { data } = await supabase.from('hero_polaroids').select('*').order('sort_order')
    setPolaroids((data as HeroPolaroid[]) || [])
  }

  async function loadAproposPhotos() {
    const { data } = await supabase.from('apropos_photos').select('*').order('sort_order')
    setAproposPhotos((data as AproposPhoto[]) || [])
  }

  function handlePolaroidMoved(id: string, offset_x: number, offset_y: number) {
    setPolaroids(prev => prev.map(p => p.id === id ? { ...p, offset_x, offset_y } : p))
  }

async function loadContent() {
    const { data } = await supabase.from('page_content').select('section, contenu').eq('page', 'accueil')
    if (data?.length) {
      const map = { ...DEFAULT_CONTENT }
      data.forEach((row: ContentBlock) => { map[row.section] = row.contenu })
      setContent(map)
    }
  }

  async function loadActus() {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: actuData }, { data: settData }] = await Promise.all([
      supabase.from('actus').select('*').lte('date_debut', today).gte('date_fin', today).order('slot'),
      supabase.from('settings').select('key, value'),
    ])
    // Lire visibilité slots et maxSlot
    const vis: Record<number, boolean> = {}
    let maxS = 3
    ;(settData || []).forEach((s: { key: string; value: string }) => {
      if (s.key === 'actu_max_slot') maxS = parseInt(s.value) || 3
      else if (s.key === 'actu_polaroid_size')       { setActuPolaroidSize(parseInt(s.value) || 208) }
      else if (s.key === 'actu_card_titre_font')     { setActuTitreFont(s.value) }
      else if (s.key === 'actu_card_titre_size')     { setActuTitreSize(parseInt(s.value) || 18) }
      else if (s.key === 'actu_card_titre_color')    { setActuTitreColor(s.value) }
      else if (s.key === 'actu_card_texte_font')     { setActuTexteFont(s.value) }
      else if (s.key === 'actu_card_texte_size')     { setActuTexteSize(parseInt(s.value) || 13) }
      else if (s.key === 'actu_card_texte_color')    { setActuTexteColor(s.value) }
      else if (s.key === 'hero_bg_config')           { try { setHeroBg(p         => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'actu_bg_config')           { try { setActuBg(p         => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'actu_section_titre_style') { try { setActuTitleStyle(p  => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'actu_badge_config')        { try { setActuBadge(p       => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'actu_btn_config')          { try { setActuBtn(p         => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'hero_btn1_config')         { try { setHeroBtn1(p           => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'hero_btn2_config')         { try { setHeroBtn2(p           => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'valeurs_bg_config')          { try { setValeursBg(p              => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'valeurs_titre_style')        { try { setValeursTitleStyle(p      => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'valeurs_carte_titre_style')  { try { setValeursCardTitleStyle(p  => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'valeurs_carte_desc_style')   { try { setValeursCardDescStyle(p   => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'valeurs_cards')              { try { setValeursCards(JSON.parse(s.value)) } catch {} }
      else if (s.key === 'apropos_bg_config')          { try { setAproposBg(p              => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'apropos_titre_style')      { try { setAproposTitleStyle(p  => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'apropos_texte_style')      { try { setAproposBodyStyle(p   => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'avis_bg_config')           { try { setAvisBg(p          => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'avis_titre_style')         { try { setAvisTitleStyle(p  => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'reseaux_badge_config')     { try { setReseauxBadge(p      => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'reseaux_titre_style')      { try { setReseauxTitleStyle(p => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      else if (s.key === 'hero_logo_visible')        { try { setLogoVisible(JSON.parse(s.value) !== false) } catch {} }
      else if (s.key === 'hero_titre_visible')       { try { setHeroTitreVisible(JSON.parse(s.value) !== false) } catch {} }
      else if (s.key === 'hero_sous_titre_visible')  { try { setHeroSousTitreVisible(JSON.parse(s.value) !== false) } catch {} }
      else if (s.key === 'google_places_api_key')    { if (s.value) setGoogleApiKey(s.value) }
      else if (s.key === 'google_place_id')          { if (s.value) setGooglePlaceId(s.value) }
      else if (s.key === 'nav_ateliers_visible')     { setNavAteliersVisible(s.value !== 'false') }
      else if (s.key === 'nav_contact_visible')      { setNavContactVisible(s.value !== 'false') }
      else if (s.key === 'hero_titre_style') {
        try { setHeroStyle({ ...DEFAULT_HERO_STYLE, ...JSON.parse(s.value) }) } catch {}
      } else if (s.key === 'hero_sous_titre_style') {
        try { setHeroSubStyle(prev => ({ ...prev, ...JSON.parse(s.value) })) } catch {}
      } else if (s.key.startsWith('slot_visible_')) {
        const n = parseInt(s.key.replace('slot_visible_', ''))
        if (!isNaN(n)) vis[n] = s.value !== 'false'
      }
    })
    const fromData = (actuData || []).map((a: any) => a.slot as number)
    setMaxSlotAccueil(Math.max(maxS, ...fromData, 3))
    setSlotVisibility(vis)
    // Garder uniquement les actus des slots visibles
    const filtered = (actuData || []).filter((a: any) => vis[a.slot] !== false)
    setActus(filtered as Actu[])
  }

  async function loadSocialLinks() {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['instagram_url','facebook_url','tiktok_url','linkedin_url','pinterest_url'])
    if (data) {
      const map: Record<string, string> = {}
      data.forEach(row => { map[row.key] = row.value || '' })
      setSocialLinks(map)
    }
  }


  async function saveBg() {
    const val = JSON.stringify(heroBg)
    await supabase.from('settings').upsert({ key: 'hero_bg_config', value: val }, { onConflict: 'key' })
    setShowBgEditor(false)
  }

  const hasSocialLinks = Object.values(socialLinks).some(v => v.trim() !== '')

  return (
    <main className="flex-1">

      {/* ===== HERO ===== */}
      <section
        className="relative min-h-screen px-4 text-center overflow-hidden border-b-4 border-[#1A1040] flex flex-col"
        style={{
          ...(heroReady ? buildHeroBgStyle(heroBg) : { backgroundColor: '#ffffff' }),
          opacity: heroReady ? 1 : 0,
          transition: 'opacity 0.25s ease-in',
        }}>

        {/* Vidéo de fond */}
        {heroBg.type === 'video' && heroBg.videoUrl && (
          <>
            <video
              ref={heroVideoRef}
              src={heroBg.videoUrl}
              autoPlay
              loop={heroBg.videoLoop}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {heroBg.videoOverlay && heroBg.videoOverlay !== 'transparent' && (
              <div className="absolute inset-0" style={{ backgroundColor: heroBg.videoOverlay }} />
            )}
          </>
        )}

        {/* Polaroïds décoratifs gauche/droite */}
        {polaroids.map((p, i) => (
          <HeroPolaroidDisplay key={p.id} polaroid={p} index={i} isAdmin={isAdmin} onMoved={handlePolaroidMoved} />
        ))}

        {/* Boutons admin hero */}
        {isAdmin && (
          <button onClick={() => setShowBgEditor(true)}
            className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
            <Palette className="w-3.5 h-3.5" /> Fond du hero
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setShowPolaroidManager(true)}
            className="absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
            <ImageIcon className="w-3.5 h-3.5" /> Gérer les polaroïds
          </button>
        )}

        {/* Contenu centré verticalement */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-20">
        <div className="max-w-3xl mx-auto w-full">
          {/* Logo centré */}
          {logoVisible && (
            <div className="mb-8 flex justify-center">
              <div className="bg-white rounded-3xl px-8 py-6 border-4 border-white/80 inline-block"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15), 6px 6px 0px 0px rgba(26,16,64,0.15)' }}>
                <img
                  src={logoUrl}
                  alt="l'univers créatif d'Anaïs"
                  className="h-44 md:h-56 w-auto"
                  onError={e => {
                    const t = e.currentTarget
                    const parent = t.parentElement
                    if (parent) parent.style.display = 'none'
                    const fallback = document.getElementById('logo-fallback')
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              </div>
              {/* Fallback si logo absent */}
              <div id="logo-fallback" className="hidden flex-col items-center bg-white/20 backdrop-blur-sm rounded-3xl px-8 py-4 border-4 border-white/60">
                <p className="font-script text-gray-700 text-2xl">l'univers créatif</p>
                <p className="font-brand font-bold text-rose-700 text-5xl">d'Anaïs</p>
              </div>
            </div>
          )}

          {(heroTitreVisible || isAdmin) && (
            <>
              {heroTitreVisible && (
                <h1
                  className="text-4xl md:text-5xl mb-6 leading-tight"
                  style={buildTitleStyle(heroStyle)}
                  dangerouslySetInnerHTML={{ __html: content['hero_titre'] }}
                />
              )}
              {isAdmin && (
                <div className="flex justify-center items-center gap-2 mb-2 -mt-4">
                  <button onClick={() => setShowTitleEditor(true)}
                    className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                    <Pencil className="w-3 h-3" /> Modifier le titre
                  </button>
                  <button
                    onClick={async () => { const next = !heroTitreVisible; setHeroTitreVisible(next); await supabase.from('settings').upsert({ key: 'hero_titre_visible', value: JSON.stringify(next) }, { onConflict: 'key' }) }}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border-2 transition-all ${heroTitreVisible ? 'bg-lime-300 border-[#1A1040] text-[#1A1040]' : 'bg-gray-300 border-gray-500 text-gray-600'}`}>
                    {heroTitreVisible ? '👁 Visible' : '🙈 Masqué'}
                  </button>
                </div>
              )}
            </>
          )}

          {(heroSousTitreVisible || isAdmin) && (
            <>
              {heroSousTitreVisible && (
                <p
                  className={`max-w-2xl mx-auto leading-relaxed ${isAdmin ? 'mb-2' : 'mb-10'}`}
                  style={buildTitleStyle(heroSubStyle)}
                  dangerouslySetInnerHTML={{ __html: content['hero_sous_titre'] }}
                />
              )}
              {isAdmin && (
                <div className="flex justify-center items-center gap-2 mb-10">
                  <button onClick={() => setShowSubEditor(true)}
                    className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                    <Pencil className="w-3 h-3" /> Modifier le sous-titre
                  </button>
                  <button
                    onClick={async () => { const next = !heroSousTitreVisible; setHeroSousTitreVisible(next); await supabase.from('settings').upsert({ key: 'hero_sous_titre_visible', value: JSON.stringify(next) }, { onConflict: 'key' }) }}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border-2 transition-all ${heroSousTitreVisible ? 'bg-lime-300 border-[#1A1040] text-[#1A1040]' : 'bg-gray-300 border-gray-500 text-gray-600'}`}>
                    {heroSousTitreVisible ? '👁 Visible' : '🙈 Masqué'}
                  </button>
                </div>
              )}
            </>
          )}

        </div>
        </div>

        {/* Boutons CTA — ancrés en bas du hero */}
        <div className="relative z-10 pb-10 flex flex-col sm:flex-row gap-4 justify-center">
          {(navAteliersVisible || isAdmin) && (
            <Link to="/ateliers"
              className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 shadow-pop hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#1A1040] transition-all relative ${heroBtn1.radius} ${!navAteliersVisible ? 'opacity-50' : ''}`}
              style={heroBtnStyle(heroBtn1)}>
              {!navAteliersVisible && <span className="absolute -top-2 -right-2 text-sm" title="Masqué au public (onglet Nos Ateliers masqué)">🙈</span>}
              {heroBtn1.label}
            </Link>
          )}
          {(navContactVisible || isAdmin) && (
            <Link to="/contact"
              className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 shadow-pop hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#1A1040] transition-all relative ${heroBtn2.radius} ${!navContactVisible ? 'opacity-50' : ''}`}
              style={heroBtnStyle(heroBtn2)}>
              {!navContactVisible && <span className="absolute -top-2 -right-2 text-sm" title="Masqué au public (onglet Contact masqué)">🙈</span>}
              {heroBtn2.label}
            </Link>
          )}
        </div>
      </section>

      {/* ===== ACTU DU MOMENT ===== */}
      {(() => {
        // Slots visibles uniquement
        const visibleSlots = Array.from({ length: maxSlotAccueil }, (_, i) => i + 1)
          .filter(slot => slotVisibility[slot] !== false)
        const hasContent  = actus.length > 0
        const hasEmpty    = isAdmin && visibleSlots.some(slot => !actus.find(a => a.slot === slot))
        if (!hasContent && !hasEmpty) return null

        return (
          <section className="relative py-16 px-4 border-b-4 border-[#1A1040] overflow-hidden" style={buildHeroBgStyle(actuBg)}>
            {actuBg.type === 'video' && actuBg.videoUrl && (
              <>
                <video src={actuBg.videoUrl} autoPlay loop={actuBg.videoLoop} muted={actuBg.videoMuted} playsInline className="absolute inset-0 w-full h-full object-cover" />
                {actuBg.videoOverlay && actuBg.videoOverlay !== 'transparent' && (
                  <div className="absolute inset-0" style={{ backgroundColor: actuBg.videoOverlay }} />
                )}
              </>
            )}
            <div className="relative z-10 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                {/* Titre */}
                <h2
                  className="leading-tight"
                  style={buildTitleStyle(actuTitleStyle)}
                  dangerouslySetInnerHTML={{ __html: content['actu_section_titre'] }}
                />
                {isAdmin && (
                  <div className="flex justify-center mt-2">
                    <button onClick={() => setShowActuTitleEditor(true)}
                      className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                      <Pencil className="w-3 h-3" /> Modifier le titre
                    </button>
                  </div>
                )}
              </div>

              {/* Polaroïds dynamiques — se replacent harmonieusement */}
              <div className="flex flex-wrap items-start justify-center gap-10 md:gap-14">
                {visibleSlots.map((slot, idx) => {
                  const actu = actus.find(a => a.slot === slot)
                  const rot  = ROTS[idx % ROTS.length]
                  const tape = TAPES[idx % TAPES.length]

                  // Slot vide — placeholder admin uniquement
                  if (!actu) {
                    if (!isAdmin) return null
                    return (
                      <div key={slot} className={`${rot} hover:rotate-0 transition-all duration-300`}
                        style={{ filter: 'drop-shadow(3px 5px 10px rgba(0,0,0,0.15))' }}>
                        <div className="bg-gray-50 border-4 border-dashed border-gray-300 rounded-sm p-4 pb-10 flex flex-col items-center justify-center text-center"
                          style={{ width: `${actuPolaroidSize}px`, minHeight: `${actuPolaroidSize * 1.35}px` }}>
                          <div className="text-4xl mb-3 opacity-30">📷</div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Polaroïd {slot} — vide</p>
                          <p className="text-gray-400 text-xs mt-1">Aucune actu active</p>
                          <Link to="/actu-moment"
                            className="mt-4 text-xs bg-[#1A1040] text-citron-400 px-3 py-1.5 rounded-xl font-bold border-2 border-[#1A1040] hover:bg-[#2d2060] transition-colors">
                            + Programmer
                          </Link>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={slot} className={`${rot} hover:rotate-0 transition-all duration-300 relative`}
                      style={{ filter: 'drop-shadow(4px 6px 12px rgba(0,0,0,0.2))' }}>
                      {/* Scotch */}
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 ${tape} rounded-sm rotate-3 z-10 border border-white/40`} />
                      <div onClick={() => setExpandedActu(actu)}
                        className="bg-white p-3 pb-10 border-2 border-[#1A1040] rounded-sm cursor-pointer hover:-translate-y-1 hover:rotate-0 transition-transform"
                        style={{ width: `${actuPolaroidSize}px`, boxShadow: '5px 5px 0px 0px #1A1040' }}>
                        <div className="w-full bg-candy border border-gray-200 overflow-hidden mb-4"
                          style={{ height: `${actuPolaroidSize * 0.85}px` }}>
                          {actu.photo_url
                            ? /\.(mp4|webm|mov)(\?|$)/i.test(actu.photo_url)
                              ? <video src={actu.photo_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                              : <img src={actu.photo_url} alt={actu.titre} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>}
                        </div>
                        {actu.titre && (
                          <p className="font-bold text-center leading-tight mb-1"
                            style={{ fontSize: `${actuTitreSize}px`, fontFamily: BTN_FONT_MAP[actuTitreFont] || 'cursive', color: actuTitreColor }}>
                            {actu.titre}
                          </p>
                        )}
                        {actu.texte && (
                          <p className="text-center leading-relaxed"
                            style={{ fontSize: `${actuTexteSize}px`, fontFamily: BTN_FONT_MAP[actuTexteFont] || 'sans-serif', color: actuTexteColor }}>
                            {actu.texte}
                          </p>
                        )}
                        {isAdmin && (
                          <Link to="/actu-moment" onClick={e => e.stopPropagation()}
                            className={`mt-3 block text-center px-2 py-1 ${actuBtn.radius} hover:opacity-75 transition-all`}
                            style={{ backgroundColor: actuBtn.bg, color: actuBtn.text, fontSize: `${actuBtn.fontSize}px`, fontWeight: actuBtn.bold ? 'bold' : 'normal' }}>
                            {actuBtn.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })()}

      {/* ===== VALEURS ===== */}
      {valeursCards.length > 0 && (
        <section className="relative py-16 px-4 border-b-4 border-[#1A1040] overflow-hidden" style={buildHeroBgStyle(valeursBg)}>
          {valeursBg.type === 'video' && valeursBg.videoUrl && (
            <>
              <video src={valeursBg.videoUrl} autoPlay loop={valeursBg.videoLoop} muted={valeursBg.videoMuted} playsInline className="absolute inset-0 w-full h-full object-cover" />
              {valeursBg.videoOverlay && valeursBg.videoOverlay !== 'transparent' && (
                <div className="absolute inset-0" style={{ backgroundColor: valeursBg.videoOverlay }} />
              )}
            </>
          )}
          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="leading-tight"
                style={buildTitleStyle(valeursTitleStyle)}
                dangerouslySetInnerHTML={{ __html: content['valeurs_titre'] }}
              />
              {isAdmin && (
                <div className="flex justify-center mt-2">
                  <button onClick={() => setShowValeursTitleEditor(true)}
                    className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                    <Pencil className="w-3 h-3" /> Modifier le titre
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6"
              style={{ gridTemplateColumns: `repeat(${Math.min(valeursCards.length, 4)}, minmax(0, 1fr))` }}>
              {valeursCards.map((card) => (
                <div key={card.id} className="p-6 text-center border-2"
                  style={{
                    backgroundColor: card.cardBg,
                    borderColor: card.borderColor,
                    borderRadius: RADIUS_TO_PX[card.cardRadius] || '16px',
                    boxShadow: '4px 4px 0px 0px #1A1040',
                  }}>
                  {/* Icône */}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#1A1040]"
                    style={{ backgroundColor: card.iconBg, boxShadow: '3px 3px 0px 0px #1A1040' }}>
                    {card.iconType === 'image'
                      ? <img src={card.icon} alt="" className="w-10 h-10 object-contain rounded-xl" />
                      : <span className="text-3xl leading-none">{card.icon}</span>
                    }
                  </div>
                  {/* Titre */}
                  <div className="mb-2" style={buildTitleStyle(valeursCardTitleStyle)}
                    dangerouslySetInnerHTML={{ __html: card.title }} />
                  {/* Description */}
                  <div style={buildTitleStyle(valeursCardDescStyle)} className="leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: card.desc }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Éditeur titre Section Valeurs ── */}
      {showValeursTitleEditor && (
        <HeroTitleEditor
          initialText={content['valeurs_titre']}
          initialStyle={valeursTitleStyle}
          sectionKey="valeurs_titre"
          styleKey="valeurs_titre_style"
          label="✏️ Titre — Section Valeurs"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, valeurs_titre: text }))
            setValeursTitleStyle(style)
            setShowValeursTitleEditor(false)
          }}
          onClose={() => setShowValeursTitleEditor(false)}
        />
      )}

      {/* ===== À PROPOS ===== */}
      <section className="relative py-20 px-4 border-y-4 border-[#1A1040] overflow-hidden" style={buildHeroBgStyle(aproposBg)}>
        {aproposBg.type === 'video' && aproposBg.videoUrl && (
          <>
            <video src={aproposBg.videoUrl} autoPlay loop={aproposBg.videoLoop} muted={aproposBg.videoMuted} playsInline className="absolute inset-0 w-full h-full object-cover" />
            {aproposBg.videoOverlay && aproposBg.videoOverlay !== 'transparent' && (
              <div className="absolute inset-0" style={{ backgroundColor: aproposBg.videoOverlay }} />
            )}
          </>
        )}
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">

          {/* Zone photos — collage libre */}
          {(() => {
            const visibles = aproposPhotos.filter(p => p.is_visible || isAdmin)
            return (
              <div
                className="flex-1 relative"
                style={{ minHeight: '460px' }}
                onMouseMove={isAdmin ? (e: React.MouseEvent) => {
                  if (!aproposDrag.current.active) return
                  const { id, mx, my, ox, oy } = aproposDrag.current
                  const nx = ox + (e.clientX - mx)
                  const ny = oy + (e.clientY - my)
                  aproposDrag.current.fx = nx
                  aproposDrag.current.fy = ny
                  setAproposPhotos(prev => prev.map(p => p.id === id ? { ...p, offset_x: nx, offset_y: ny } : p))
                } : undefined}
                onMouseUp={isAdmin ? async () => {
                  if (!aproposDrag.current.active) return
                  aproposDrag.current.active = false
                  const { id, fx, fy } = aproposDrag.current
                  setDraggingAproposId(null)
                  await supabase.from('apropos_photos').update({ offset_x: fx, offset_y: fy }).eq('id', id)
                } : undefined}
                onMouseLeave={isAdmin ? async () => {
                  if (!aproposDrag.current.active) return
                  aproposDrag.current.active = false
                  const { id, fx, fy } = aproposDrag.current
                  setDraggingAproposId(null)
                  await supabase.from('apropos_photos').update({ offset_x: fx, offset_y: fy }).eq('id', id)
                } : undefined}
              >
                {visibles.length === 0 && isAdmin && (
                  <div className="flex items-center justify-center w-full h-60 border-4 border-dashed border-gray-300 rounded-3xl bg-gray-50/50">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="text-sm font-black">Aucune photo</p>
                      <p className="text-xs mt-1">Ajoute-en une via "Gérer les photos"</p>
                    </div>
                  </div>
                )}

                {visibles.map((photo, i) => {
                  const DEFAULT_POSITIONS = [
                    { x: 10,  y: 10  },
                    { x: 220, y: 60  },
                    { x: 80,  y: 220 },
                    { x: 300, y: 200 },
                    { x: 0,   y: 380 },
                  ]
                  const isUnpositioned = photo.offset_x === 0 && photo.offset_y === 0
                  const def = DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length]
                  const left = isUnpositioned ? (i === 0 ? 0 : def.x) : photo.offset_x
                  const top  = isUnpositioned ? (i === 0 ? 0 : def.y) : photo.offset_y
                  return (
                  <div
                    key={photo.id}
                    className={`absolute select-none ${isAdmin ? (draggingAproposId === photo.id ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                    style={{
                      left:    `${left}px`,
                      top:     `${top}px`,
                      zIndex:  draggingAproposId === photo.id ? 50 : i + 1,
                    }}
                    onMouseDown={isAdmin ? (e: React.MouseEvent) => {
                      e.preventDefault()
                      aproposDrag.current = { active: true, id: photo.id, mx: e.clientX, my: e.clientY, ox: photo.offset_x, oy: photo.offset_y, fx: photo.offset_x, fy: photo.offset_y }
                      setDraggingAproposId(photo.id)
                    } : undefined}
                  >
                    <AproposPhotoDisplay photo={photo} isAdmin={isAdmin} />
                    {photo.caption && (
                      <p className="text-xs text-center italic text-gray-500 font-medium mt-1 px-1 max-w-[200px]">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                  )
                })}

                {isAdmin && visibles.length > 0 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap pointer-events-none">
                    ✋ Glisse chaque photo pour la repositionner
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setShowAproposManager(true)}
                    className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-white text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-citron-400 transition-all whitespace-nowrap z-50"
                    style={{ boxShadow: '2px 2px 0px 0px #1A1040' }}>
                    📷 Gérer les photos
                  </button>
                )}
              </div>
            )
          })()}

          {/* Texte */}
          <div className="flex-1">
            <h2 className="mb-2 leading-tight"
              style={buildTitleStyle(aproposTitleStyle)}
              dangerouslySetInnerHTML={{ __html: content['apropos_titre'] }}
            />
            {isAdmin && (
              <div className="mb-4">
                <button onClick={() => setShowAproposTitleEditor(true)}
                  className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                  <Pencil className="w-3 h-3" /> Modifier le titre
                </button>
              </div>
            )}

            <p className="leading-relaxed"
              style={buildTitleStyle(aproposBodyStyle)}
              dangerouslySetInnerHTML={{ __html: content['apropos_texte'] }}
            />
            {isAdmin && (
              <div className="mt-2">
                <button onClick={() => setShowAproposBodyEditor(true)}
                  className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                  <Pencil className="w-3 h-3" /> Modifier le texte
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== ÉDITEUR TITRE À PROPOS ===== */}
      {showAproposTitleEditor && (
        <HeroTitleEditor
          initialText={content['apropos_titre']}
          initialStyle={aproposTitleStyle}
          sectionKey="apropos_titre"
          styleKey="apropos_titre_style"
          label="✏️ Titre — À Propos"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, apropos_titre: text }))
            setAproposTitleStyle(style)
            setShowAproposTitleEditor(false)
          }}
          onClose={() => setShowAproposTitleEditor(false)}
        />
      )}

      {/* ===== ÉDITEUR TEXTE À PROPOS ===== */}
      {showAproposBodyEditor && (
        <HeroTitleEditor
          initialText={content['apropos_texte']}
          initialStyle={aproposBodyStyle}
          sectionKey="apropos_texte"
          styleKey="apropos_texte_style"
          label="✏️ Texte — À Propos"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, apropos_texte: text }))
            setAproposBodyStyle(style)
            setShowAproposBodyEditor(false)
          }}
          onClose={() => setShowAproposBodyEditor(false)}
        />
      )}

      {/* ===== AVIS CLIENTS ===== */}
      {(googleReviews.length > 0 || reviewsLoading || isAdmin) && (
        <section className="relative py-16 px-4 border-b-4 border-[#1A1040] overflow-hidden" style={buildHeroBgStyle(avisBg)}>
          {avisBg.type === 'video' && avisBg.videoUrl && (
            <>
              <video src={avisBg.videoUrl} autoPlay loop={avisBg.videoLoop} muted={avisBg.videoMuted} playsInline className="absolute inset-0 w-full h-full object-cover" />
              {avisBg.videoOverlay && avisBg.videoOverlay !== 'transparent' && (
                <div className="absolute inset-0" style={{ backgroundColor: avisBg.videoOverlay }} />
              )}
            </>
          )}
          <style>{`
            @keyframes avis-scroll {
              from { transform: translateX(0); }
              to   { transform: translateX(-50%); }
            }
            .avis-scroll-track { animation: avis-scroll 45s linear infinite; }
            .avis-scroll-track:hover { animation-play-state: paused; }
          `}</style>

          <div className="relative z-10 max-w-6xl mx-auto">
            {/* Titre */}
            <div className="text-center mb-12">
              <h2
                className="leading-tight"
                style={buildTitleStyle(avisTitleStyle)}
                dangerouslySetInnerHTML={{ __html: content['avis_titre'] }}
              />
              {isAdmin && (
                <div className="flex justify-center mt-2">
                  <button onClick={() => setShowAvisTitleEditor(true)}
                    className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                    <Pencil className="w-3 h-3" /> Modifier le titre
                  </button>
                </div>
              )}
            </div>

            {/* Carrousel */}
            {reviewsLoading ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2 animate-pulse">⭐</div>
                <p className="text-white/60 text-sm font-bold">Chargement des avis…</p>
              </div>
            ) : googleReviews.length > 0 ? (
              <div className="overflow-hidden cursor-default select-none">
                {/* On duplique pour le défilement sans coupure */}
                <div className="avis-scroll-track flex gap-6" style={{ width: 'max-content' }}>
                  {[...googleReviews, ...googleReviews].map((review, idx) => (
                    <div key={idx}
                      className="w-72 bg-white rounded-2xl border-2 border-[#1A1040] p-5 shrink-0 flex flex-col gap-3"
                      style={{ boxShadow: '4px 4px 0px 0px rgba(255,181,200,0.8)' }}>
                      {/* Étoiles */}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-4 h-4" style={{ fill: i < (review.rating || 0) ? '#ffe500' : '#e5e7eb', color: i < (review.rating || 0) ? '#ffe500' : '#e5e7eb' }} />
                        ))}
                      </div>
                      {/* Texte */}
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 flex-1">
                        {review.text?.text || ''}
                      </p>
                      {/* Auteur */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        {review.authorAttribution?.photoUri ? (
                          <img
                            src={review.authorAttribution.photoUri}
                            alt=""
                            className="w-8 h-8 rounded-full border-2 border-[#1A1040] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-400 border-2 border-[#1A1040] flex items-center justify-center text-white text-xs font-black shrink-0">
                            {(review.authorAttribution?.displayName || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-black text-xs text-[#1A1040] truncate">{review.authorAttribution?.displayName || 'Anonyme'}</p>
                          <p className="text-gray-400 text-[10px]">{review.relativePublishTimeDescription || ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isAdmin ? (
              /* Placeholder admin si pas d'avis configurés */
              <div className="text-center py-12 border-4 border-dashed border-white/20 rounded-3xl">
                <div className="text-5xl mb-3">⭐</div>
                <p className="font-black text-white/40 mb-2">Aucun avis Google chargé</p>
                <Link to="/connecteurs"
                  className="inline-flex items-center gap-1.5 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl text-sm font-black border-2 border-[#1A1040] hover:bg-yellow-300 transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
                  → Configurer dans les Connecteurs
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ===== ÉDITEUR TITRE AVIS CLIENTS ===== */}
      {showAvisTitleEditor && (
        <HeroTitleEditor
          initialText={content['avis_titre']}
          initialStyle={avisTitleStyle}
          sectionKey="avis_titre"
          styleKey="avis_titre_style"
          label="✏️ Titre — Section Avis clients"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, avis_titre: text }))
            setAvisTitleStyle(style)
            setShowAvisTitleEditor(false)
          }}
          onClose={() => setShowAvisTitleEditor(false)}
        />
      )}


      {/* ===== RÉSEAUX SOCIAUX ===== */}
      {(hasSocialLinks || isAdmin) && (
        <section className="py-12 px-4 bg-[#1A1040] border-b-4 border-[#1A1040]">
          <div className="max-w-3xl mx-auto text-center">
            <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold border-2 border-white/20 mb-2 ${reseauxBadge.radius}`}
              style={{ backgroundColor: reseauxBadge.bg, color: reseauxBadge.textColor }}>
              {reseauxBadge.text}
            </div>
            {isAdmin && (
              <div className="flex justify-center mb-4">
                <button onClick={() => setShowReseauxBadgeEditor(true)}
                  className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                  <Pencil className="w-3 h-3" /> Modifier le badge
                </button>
              </div>
            )}
            <h2 className="leading-tight mb-2"
              style={buildTitleStyle(reseauxTitleStyle)}
              dangerouslySetInnerHTML={{ __html: content['reseaux_titre'] }}
            />
            {isAdmin && (
              <div className="flex justify-center mb-8">
                <button onClick={() => setShowReseauxTitleEditor(true)}
                  className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                  <Pencil className="w-3 h-3" /> Modifier le titre
                </button>
              </div>
            )}
            {!isAdmin && <div className="mb-8" />}

            <div className="flex flex-wrap items-center justify-center gap-4">
              {socialLinks.instagram_url && (
                <a href={socialLinks.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2 border-white/20 hover:-translate-y-1 transition-all"
                  style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: 'white', boxShadow: '3px 3px 0px 0px #e6683c' }}>
                  <IconInstagram /> Instagram
                </a>
              )}
              {socialLinks.facebook_url && (
                <a href={socialLinks.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2 text-white transition-all hover:-translate-y-1"
                  style={{ background: '#1877f2', borderColor: '#1877f2', boxShadow: '3px 3px 0px 0px #1255b3' }}>
                  <IconFacebook /> Facebook
                </a>
              )}
              {socialLinks.tiktok_url && (
                <a href={socialLinks.tiktok_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2 text-white transition-all hover:-translate-y-1"
                  style={{ background: '#010101', borderColor: '#ff0050', boxShadow: '3px 3px 0px 0px #ff0050' }}>
                  <IconTiktok /> TikTok
                </a>
              )}
              {socialLinks.linkedin_url && (
                <a href={socialLinks.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2 text-white transition-all hover:-translate-y-1"
                  style={{ background: '#0077b5', borderColor: '#0077b5', boxShadow: '3px 3px 0px 0px #005885' }}>
                  <IconLinkedin /> LinkedIn
                </a>
              )}
              {socialLinks.pinterest_url && (
                <a href={socialLinks.pinterest_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2 text-white transition-all hover:-translate-y-1"
                  style={{ background: '#e60023', borderColor: '#e60023', boxShadow: '3px 3px 0px 0px #ad081b' }}>
                  <IconPinterest /> Pinterest
                </a>
              )}
              {!hasSocialLinks && isAdmin && (
                <p className="text-white/40 text-sm font-bold">Aucun lien réseau configuré — ajoute-les dans /connecteurs</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== ÉDITEUR BADGE RÉSEAUX SOCIAUX ===== */}
      {showReseauxBadgeEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowReseauxBadgeEditor(false)}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 space-y-4" style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}>
            <h3 className="font-black text-[#1A1040]">🏷️ Badge — Réseaux sociaux</h3>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
              <input value={reseauxBadge.text} onChange={e => setReseauxBadge(p => ({ ...p, text: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citron-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fond</label>
                <input type="color" value={reseauxBadge.bg} onChange={e => setReseauxBadge(p => ({ ...p, bg: e.target.value }))}
                  className="w-full h-9 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
                <input type="color" value={reseauxBadge.textColor} onChange={e => setReseauxBadge(p => ({ ...p, textColor: e.target.value }))}
                  className="w-full h-9 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
              <div className="flex gap-2 flex-wrap">
                {['rounded-none', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'].map(r => (
                  <button key={r} onClick={() => setReseauxBadge(p => ({ ...p, radius: r }))}
                    className={`px-3 py-1.5 border-2 text-xs font-black ${r} ${reseauxBadge.radius === r ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                    Aa
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowReseauxBadgeEditor(false)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-2.5 font-black text-[#1A1040] hover:bg-gray-50">Annuler</button>
              <button onClick={async () => {
                await supabase.from('settings').upsert({ key: 'reseaux_badge_config', value: JSON.stringify(reseauxBadge) }, { onConflict: 'key' })
                setShowReseauxBadgeEditor(false)
              }} className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-2.5 font-black hover:bg-[#2d2060]">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ÉDITEUR TITRE RÉSEAUX SOCIAUX ===== */}
      {showReseauxTitleEditor && (
        <HeroTitleEditor
          initialText={content['reseaux_titre']}
          initialStyle={reseauxTitleStyle}
          sectionKey="reseaux_titre"
          styleKey="reseaux_titre_style"
          label="✏️ Titre — Réseaux sociaux"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, reseaux_titre: text }))
            setReseauxTitleStyle(style)
            setShowReseauxTitleEditor(false)
          }}
          onClose={() => setShowReseauxTitleEditor(false)}
        />
      )}

      {/* ===== ÉDITEUR TITRE HERO ===== */}
      {showTitleEditor && (
        <HeroTitleEditor
          initialText={content['hero_titre']}
          initialStyle={heroStyle}
          sectionKey="hero_titre"
          styleKey="hero_titre_style"
          label="✏️ Éditeur du titre"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, hero_titre: text }))
            setHeroStyle(style)
            setShowTitleEditor(false)
          }}
          onClose={() => setShowTitleEditor(false)}
        />
      )}

      {/* ===== ÉDITEUR TITRE SECTION ACTU ===== */}
      {showActuTitleEditor && (
        <HeroTitleEditor
          initialText={content['actu_section_titre']}
          initialStyle={actuTitleStyle}
          sectionKey="actu_section_titre"
          styleKey="actu_section_titre_style"
          label="✏️ Titre — Actu du moment"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, actu_section_titre: text }))
            setActuTitleStyle(style)
            setShowActuTitleEditor(false)
          }}
          onClose={() => setShowActuTitleEditor(false)}
        />
      )}

      {/* ===== LIGHTBOX — POLAROÏD ACTU AGRANDI ===== */}
      {expandedActu && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={() => setExpandedActu(null)}>
          <div className="bg-white p-5 pb-10 border-4 border-[#1A1040] rounded-sm max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '8px 8px 0px 0px #1A1040' }} onClick={e => e.stopPropagation()}>
            <div className="w-full bg-candy border-2 border-gray-200 overflow-hidden mb-5 max-h-[55vh]">
              {expandedActu.photo_url
                ? /\.(mp4|webm|mov)(\?|$)/i.test(expandedActu.photo_url)
                  ? <video src={expandedActu.photo_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                  : <img src={expandedActu.photo_url} alt={expandedActu.titre} className="w-full h-full object-cover" />
                : <div className="w-full h-64 flex items-center justify-center text-6xl">🎨</div>}
            </div>
            {expandedActu.titre && (
              <p className="font-bold text-center leading-tight mb-2"
                style={{ fontSize: `${actuTitreSize * 1.6}px`, fontFamily: BTN_FONT_MAP[actuTitreFont] || 'cursive', color: actuTitreColor }}>
                {expandedActu.titre}
              </p>
            )}
            {expandedActu.texte && (
              <p className="text-center leading-relaxed"
                style={{ fontSize: `${actuTexteSize * 1.3}px`, fontFamily: BTN_FONT_MAP[actuTexteFont] || 'sans-serif', color: actuTexteColor }}>
                {expandedActu.texte}
              </p>
            )}
            <button onClick={() => setExpandedActu(null)}
              className="mt-5 mx-auto block bg-[#1A1040] text-citron-400 px-5 py-2 rounded-xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] transition-colors">
              Fermer ✕
            </button>
          </div>
        </div>
      )}

      {/* ===== GESTIONNAIRE PHOTOS À PROPOS ===== */}
      {showAproposManager && (
        <AproposPhotoManager
          photos={aproposPhotos}
          onClose={() => setShowAproposManager(false)}
          onRefresh={loadAproposPhotos}
        />
      )}

      {/* ===== ÉDITEUR FOND DU HERO ===== */}
      {showBgEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowBgEditor(false) }}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '8px 8px 0px 0px #1A1040' }}>
            <div className="sticky top-0 bg-candy border-b-4 border-[#1A1040] px-6 py-4 flex items-center justify-between z-10">
              <span className="font-black text-[#1A1040]">🎨 Fond du hero</span>
              <button onClick={() => setShowBgEditor(false)} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-[#1A1040] hover:bg-red-50"><X className="w-4 h-4"/></button>
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
              <button onClick={() => setShowBgEditor(false)} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50 transition-all">Annuler</button>
              <button onClick={saveBg} className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] transition-all flex items-center justify-center gap-2"><Check className="w-4 h-4"/> Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== GESTIONNAIRE POLAROÏDS HERO ===== */}
      {showPolaroidManager && (
        <HeroPolaroidManager
          polaroids={polaroids}
          onClose={() => setShowPolaroidManager(false)}
          onRefresh={loadPolaroids}
        />
      )}

      {/* ===== ÉDITEUR SOUS-TITRE HERO ===== */}
      {showSubEditor && (
        <HeroTitleEditor
          initialText={content['hero_sous_titre']}
          initialStyle={heroSubStyle}
          sectionKey="hero_sous_titre"
          styleKey="hero_sous_titre_style"
          label="✏️ Éditeur du sous-titre"
          onSave={(text, style) => {
            setContent(prev => ({ ...prev, hero_sous_titre: text }))
            setHeroSubStyle(style)
            setShowSubEditor(false)
          }}
          onClose={() => setShowSubEditor(false)}
        />
      )}

    </main>
  )
}
