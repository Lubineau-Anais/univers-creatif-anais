import { useState, useEffect, useRef, useCallback } from 'react'
import { ShoppingCart, X, Plus, Minus, Tag, Clock, ChevronRight, ChevronDown, Trash2, AlertCircle, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildHeroBgStyle, type HeroBg, DEFAULT_HERO_BG } from '../lib/heroBg'
import { buildTitleStyle, type HeroStyle } from '../components/HeroTitleEditor'
import { useCart } from '../context/CartContext'
import type { ShopCategory, ShopProduct, ShopPromotion } from '../lib/shop'
import { formatPrice, getActivePromoForProduct, getDiscountedPrice } from '../lib/shop'
import type { ShopStatus } from '../lib/shop'

// ─── Défauts ───────────────────────────────────────────────────────────────────
const DEFAULT_BG: HeroBg = { ...DEFAULT_HERO_BG, color: '#c4b5fd' }
const DEFAULT_TITRE: HeroStyle = {
  font: 'serif', fontSize: 40, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}

// ─── Composant : Carte produit ─────────────────────────────────────────────────
function ProductCard({ product, promotions, onAddToCart }: {
  product: ShopProduct
  promotions: ShopPromotion[]
  onAddToCart: (productId: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded]   = useState(false)
  const [hovered, setHovered] = useState(false)
  const promo = getActivePromoForProduct(product, promotions)
  const discountedPrice = getDiscountedPrice(product, promotions)
  const isOutOfStock = product.stock === 0

  async function handleAdd() {
    if (isOutOfStock || adding) return
    setAdding(true)
    await onAddToCart(product.id)
    setAdding(false); setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden flex flex-col transition-all hover:-translate-y-1"
      style={{ boxShadow: hovered ? '6px 6px 0px 0px #1A1040' : '4px 4px 0px 0px #1A1040' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* Image */}
      <div className="relative h-44 bg-candy border-b-2 border-[#1A1040] overflow-hidden">
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-6xl">🛍️</div>}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOutOfStock && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-red-600">Rupture de stock</span>
          )}
          {promo && !isOutOfStock && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-600">
              -{promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatPrice(promo.discount_value)}
            </span>
          )}
          {product.compare_price && product.compare_price > product.price && !promo && (
            <span className="bg-amber-400 text-[#1A1040] text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500">PROMO</span>
          )}
        </div>
        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute bottom-2 right-2 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400">
            Plus que {product.stock} !
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex-1">
          <h3 className="font-black text-[#1A1040] text-sm leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Prix */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-[#1A1040]">{formatPrice(discountedPrice)}</span>
          {(promo || (product.compare_price && product.compare_price > product.price)) && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(promo ? product.price : (product.compare_price ?? 0))}
            </span>
          )}
        </div>

        {/* Bouton */}
        <button
          onClick={handleAdd}
          disabled={isOutOfStock || adding}
          className={`w-full py-2.5 rounded-2xl font-black text-sm border-2 transition-all flex items-center justify-center gap-2 ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : added
              ? 'bg-green-400 text-white border-green-400'
              : 'bg-citron-400 text-[#1A1040] border-[#1A1040] hover:bg-yellow-300 active:translate-y-0.5'
          }`}
          style={!isOutOfStock && !added ? { boxShadow: '2px 2px 0px 0px #1A1040' } : {}}>
          {isOutOfStock ? 'Rupture de stock'
            : added ? '✓ Ajouté !'
            : adding ? '…'
            : <><ShoppingCart className="w-4 h-4"/> Ajouter au panier</>}
        </button>
      </div>
    </div>
  )
}

// ─── Panneau panier ────────────────────────────────────────────────────────────
function CartPanel() {
  const { items, subtotal, discount, total, appliedCode, expiresAt, isOpen, setIsOpen,
          removeItem, clearCart, applyPromoCode, removePromoCode } = useCart()
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [timeLeft, setTimeLeft]   = useState('')

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const diff = expiresAt.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expiré'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${m}:${s.toString().padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  async function handleApplyCode() {
    if (!codeInput.trim()) return
    setCodeLoading(true); setCodeError('')
    const result = await applyPromoCode(codeInput)
    if (!result.success) setCodeError(result.error || 'Erreur')
    else setCodeInput('')
    setCodeLoading(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsOpen(false)}/>

      {/* Panneau */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 border-l-4 border-[#1A1040] flex flex-col" style={{ boxShadow:'-4px 0 0 0 #1A1040' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#1A1040] bg-candy shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#1A1040]"/>
            <h2 className="font-black text-[#1A1040]">Mon panier</h2>
            {items.length > 0 && (
              <span className="bg-[#1A1040] text-citron-400 text-xs font-black px-2 py-0.5 rounded-full">
                {items.reduce((s,i)=>s+i.quantity,0)}
              </span>
            )}
          </div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-white flex items-center justify-center hover:bg-red-50">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Timer */}
        {expiresAt && items.length > 0 && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-700 font-bold shrink-0">
            <Clock className="w-3.5 h-3.5"/> Réservé encore {timeLeft} — finalise vite !
          </div>
        )}

        {/* Articles */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-20"/>
              <p className="font-black text-lg">Panier vide</p>
              <p className="text-sm">Ajoute des articles pour commencer !</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-200 bg-gray-50">
                <div className="w-14 h-14 rounded-xl border-2 border-gray-200 overflow-hidden shrink-0 bg-white">
                  {item.product?.images?.[0]
                    ? <img src={item.product.images[0]} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#1A1040] text-sm truncate">{item.product?.name}</p>
                  <p className="text-sm font-bold text-rose-500">{formatPrice(item.product?.price ?? 0)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => removeItem(item.product_id, 1)}
                    className="w-7 h-7 rounded-lg border-2 border-[#1A1040] bg-white flex items-center justify-center hover:bg-red-50">
                    <Minus className="w-3 h-3"/>
                  </button>
                  <span className="w-7 text-center font-black text-sm">{item.quantity}</span>
                  <button disabled className="w-7 h-7 rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center opacity-50">
                    <Plus className="w-3 h-3"/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t-2 border-[#1A1040] bg-white px-5 py-4 space-y-3 shrink-0">
            {/* Code promo */}
            {!appliedCode ? (
              <div className="flex gap-2">
                <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);setCodeError('')}} placeholder="Code promo"
                  onKeyDown={e=>e.key==='Enter'&&handleApplyCode()}
                  className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-xs font-mono font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-citron-400"/>
                <button onClick={handleApplyCode} disabled={codeLoading||!codeInput.trim()}
                  className="px-3 py-2 bg-[#1A1040] text-citron-400 rounded-xl font-black text-xs border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 flex items-center gap-1">
                  <Tag className="w-3 h-3"/> OK
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 border-2 border-green-400 rounded-xl px-3 py-2">
                <span className="text-xs font-black text-green-700 flex items-center gap-1"><Tag className="w-3 h-3"/> {appliedCode.code}</span>
                <button onClick={removePromoCode} className="text-green-600 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>
            )}
            {codeError && <p className="text-xs text-red-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{codeError}</p>}

            {/* Totaux */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Sous-total</span><span className="font-bold">{formatPrice(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Réduction</span><span>-{formatPrice(discount)}</span></div>}
              <div className="flex justify-between text-[#1A1040] font-black text-base border-t-2 border-[#1A1040] pt-2 mt-2">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* CTA */}
            <button className="w-full bg-[#1A1040] text-citron-400 py-3.5 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all"
              style={{ boxShadow:'3px 3px 0px 0px #ffe500' }}>
              Commander → {formatPrice(total)}
            </button>
            <button onClick={clearCart} className="w-full text-xs text-gray-400 hover:text-red-500 font-bold flex items-center justify-center gap-1 transition-colors">
              <Trash2 className="w-3 h-3"/> Vider le panier
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function Boutique() {
  const { itemCount, setIsOpen, addItem } = useCart()

  // Settings boutique
  const [status, setStatus]             = useState<ShopStatus>('active')
  const [stockingText, setStockingText] = useState('La boutique sera bientôt disponible 🚀')
  const [stockingDate, setStockingDate] = useState('')
  const [stockingImg,  setStockingImg]  = useState('')
  const [heroBg, setHeroBg]             = useState<HeroBg>(DEFAULT_BG)
  const [heroBgTab, setHeroBgTab]       = useState(DEFAULT_BG.type)
  const [titreText, setTitreText]       = useState('Notre boutique 🛍️')
  const [titreStyle, setTitreStyle]     = useState<HeroStyle>(DEFAULT_TITRE)
  const [badge, setBadge]               = useState({ text:'🛍️ Notre boutique', bg:'#fb7185', textColor:'#ffffff', radius:'rounded-full' })
  const [loading, setLoading]           = useState(true)

  // Produits
  const [categories, setCategories]   = useState<ShopCategory[]>([])
  const [products, setProducts]       = useState<ShopProduct[]>([])
  const [promotions, setPromotions]   = useState<ShopPromotion[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => { loadShop() }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = heroBg.videoMuted
  }, [heroBg.videoMuted])

  async function loadShop() {
    setLoading(true)
    const [{ data: settings }, { data: content }, { data: cats }, { data: prods }, { data: promos }] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', [
        'shop_status','shop_stocking_text','shop_stocking_date','shop_stocking_image',
        'shop_bg_config','shop_badge_config','shop_titre_style',
      ]),
      supabase.from('page_content').select('section,contenu').eq('page','boutique').in('section',['shop_titre']),
      supabase.from('shop_categories').select('*').order('sort_order').order('name'),
      supabase.from('shop_products').select('*').eq('is_active',true).order('sort_order').order('name'),
      supabase.from('shop_promotions').select('*').eq('is_active',true),
    ])
    ;(settings || []).forEach((s: { key: string; value: string }) => {
      try {
        if (s.key === 'shop_status')         setStatus(s.value as ShopStatus)
        if (s.key === 'shop_stocking_text')  setStockingText(s.value)
        if (s.key === 'shop_stocking_date')  setStockingDate(s.value)
        if (s.key === 'shop_stocking_image') setStockingImg(s.value)
        if (s.key === 'shop_bg_config')      { const v=JSON.parse(s.value); setHeroBg(p=>({...p,...v})); setHeroBgTab(v.type||'color') }
        if (s.key === 'shop_badge_config')   setBadge(p=>({...p,...JSON.parse(s.value)}))
        if (s.key === 'shop_titre_style')    setTitreStyle(p=>({...p,...JSON.parse(s.value)}))
      } catch {}
    })
    ;(content || []).forEach((c: { section: string; contenu: string }) => {
      if (c.section === 'shop_titre') setTitreText(c.contenu)
    })
    setCategories((cats as ShopCategory[]) || [])
    setProducts((prods as ShopProduct[]) || [])
    setPromotions((promos as ShopPromotion[]) || [])
    setLoading(false)
  }

  // Déterminer le statut effectif (auto-activation si date passée)
  const effectiveStatus: ShopStatus = (() => {
    if (status === 'stocking' && stockingDate) {
      if (new Date(stockingDate) <= new Date()) return 'active'
    }
    return status
  })()

  // Countdown
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (effectiveStatus !== 'stocking' || !stockingDate) return
    const iv = setInterval(() => {
      const diff = new Date(stockingDate).getTime() - Date.now()
      if (diff <= 0) { setCountdown(''); loadShop(); return }
      const d = Math.floor(diff/86400000)
      const h = Math.floor((diff%86400000)/3600000)
      const m = Math.floor((diff%3600000)/60000)
      const s = Math.floor((diff%60000)/1000)
      setCountdown(d>0 ? `${d}j ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }, 1000)
    return () => clearInterval(iv)
  }, [effectiveStatus, stockingDate])

  const handleAddToCart = useCallback(async (productId: string) => {
    const result = await addItem(productId)
    if (result.success) setIsOpen(true)
  }, [addItem, setIsOpen])

  const bgStyle = buildHeroBgStyle({ ...heroBg, type: heroBgTab as HeroBg['type'] })

  // Catégories à afficher dans le filtre (principales + sous-cat)
  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory ||
        categories.find(c => c.id === p.category_id)?.parent_id === activeCategory)
    : products

  const topCategories = categories.filter(c => !c.parent_id)

  // ─── Boutique inactive ─────────────────────────────────────────────────────
  if (!loading && effectiveStatus === 'inactive') {
    return (
      <main className="flex-1 bg-candy flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">🔒</div>
          <h1 className="font-serif text-4xl font-black text-[#1A1040] mb-3">Boutique fermée</h1>
          <p className="text-gray-600 font-medium">La boutique n'est pas disponible pour le moment. Revenez bientôt !</p>
        </div>
      </main>
    )
  }

  // ─── En cours d'approvisionnement ─────────────────────────────────────────
  if (!loading && effectiveStatus === 'stocking') {
    return (
      <main className="flex-1">
        <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden" style={bgStyle}>
          {heroBgTab === 'video' && heroBg.videoUrl && (
            <video ref={videoRef} src={heroBg.videoUrl} autoPlay muted={heroBg.videoMuted} loop={heroBg.videoLoop} playsInline
              className="absolute inset-0 w-full h-full object-cover" style={{ zIndex:0 }}/>
          )}
          {heroBgTab === 'video' && heroBg.videoOverlay !== 'transparent' && (
            <div className="absolute inset-0" style={{ backgroundColor: heroBg.videoOverlay, zIndex:1 }}/>
          )}
          <div className="relative z-10 text-center px-6 space-y-6 max-w-xl mx-auto">
            {stockingImg ? (
              <img src={stockingImg} alt="" className="max-h-48 mx-auto rounded-3xl border-4 border-[#1A1040]" style={{ boxShadow:'6px 6px 0px 0px #1A1040' }}/>
            ) : (
              <div className="text-8xl">🔄</div>
            )}
            <h2 className="font-serif text-3xl font-black" style={buildTitleStyle(titreStyle)}>{stockingText}</h2>
            {stockingDate && countdown && (
              <div className="inline-flex items-center gap-3 bg-white border-4 border-[#1A1040] rounded-2xl px-6 py-4" style={{ boxShadow:'4px 4px 0px 0px #1A1040' }}>
                <Clock className="w-5 h-5 text-[#1A1040]"/>
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Ouverture dans</div>
                  <div className="font-black text-[#1A1040] text-lg">{countdown}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 bg-candy">

      {/* HERO */}
      <section className="relative overflow-hidden" style={bgStyle}>
        {heroBgTab === 'video' && heroBg.videoUrl && (
          <video ref={videoRef} src={heroBg.videoUrl} autoPlay muted={heroBg.videoMuted} loop={heroBg.videoLoop} playsInline
            className="absolute inset-0 w-full h-full object-cover" style={{ zIndex:0 }}/>
        )}
        {heroBgTab === 'video' && heroBg.videoOverlay !== 'transparent' && (
          <div className="absolute inset-0" style={{ backgroundColor: heroBg.videoOverlay, zIndex:1 }}/>
        )}
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold border-2 border-gray-300 mb-4 ${badge.radius}`}
            style={{ backgroundColor:badge.bg, color:badge.textColor }}>{badge.text}</div>
          <h1 style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: titreText }} className="leading-tight"/>
        </div>
      </section>

      {/* CONTENU : SIDEBAR + GRILLE */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-6 items-start">

          {/* ── Sidebar catégories (desktop + tablet) ── */}
          {topCategories.length > 0 && (
            <aside className="hidden sm:block w-48 shrink-0 sticky top-20">
              <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'4px 4px 0px 0px #1A1040' }}>
                <div className="px-4 py-3 bg-[#1A1040] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-citron-400"/>
                  <span className="font-black text-white text-sm">Catégories</span>
                </div>

                <div className="p-2">
                  {/* Tout voir */}
                  <button onClick={() => setActiveCategory('')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl font-black text-sm transition-all mb-1 ${!activeCategory ? 'bg-[#1A1040] text-citron-400' : 'text-[#1A1040] hover:bg-candy'}`}>
                    Tout voir
                  </button>

                  {topCategories.map(cat => {
                    const subCats = categories.filter(c => c.parent_id === cat.id)
                    const isCatActive  = activeCategory === cat.id
                    const hasSubActive = subCats.some(s => s.id === activeCategory)
                    const isOpen       = isCatActive || hasSubActive || expandedCats.has(cat.id)

                    return (
                      <div key={cat.id} className="mb-1">
                        {/* Catégorie principale */}
                        <button
                          onClick={() => {
                            if (subCats.length === 0) {
                              setActiveCategory(isCatActive ? '' : cat.id)
                            } else {
                              setExpandedCats(prev => {
                                const n = new Set(prev)
                                if (n.has(cat.id)) n.delete(cat.id)
                                else n.add(cat.id)
                                return n
                              })
                              if (!isCatActive && !hasSubActive) setActiveCategory(cat.id)
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-black text-sm transition-all ${isCatActive || hasSubActive ? 'bg-rose-100 text-rose-600' : 'text-[#1A1040] hover:bg-candy'}`}>
                          <span>{cat.name}</span>
                          {subCats.length > 0 && (
                            isOpen
                              ? <ChevronDown className="w-4 h-4 shrink-0"/>
                              : <ChevronRight className="w-4 h-4 shrink-0"/>
                          )}
                        </button>

                        {/* Sous-catégories */}
                        {subCats.length > 0 && isOpen && (
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-[#1A1040]/10 pl-2">
                            <button
                              onClick={() => setActiveCategory(cat.id)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCategory === cat.id ? 'bg-[#1A1040] text-citron-400' : 'text-gray-500 hover:text-[#1A1040] hover:bg-candy'}`}>
                              Tout ({cat.name})
                            </button>
                            {subCats.map(sub => (
                              <button key={sub.id}
                                onClick={() => setActiveCategory(activeCategory === sub.id ? cat.id : sub.id)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCategory === sub.id ? 'bg-rose-400 text-white' : 'text-gray-500 hover:text-[#1A1040] hover:bg-candy'}`}>
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </aside>
          )}

          {/* ── Colonne produits (filtre mobile + grille) ── */}
          <div className="flex-1 min-w-0">

            {/* Filtre mobile (accordion) — visible uniquement sous 640px */}
            {topCategories.length > 0 && (
              <div className="sm:hidden mb-4">
                <button
                  onClick={() => setMobileFilterOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border-4 border-[#1A1040] font-black text-sm text-[#1A1040]"
                  style={{ boxShadow:'3px 3px 0px 0px #1A1040' }}>
                  <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/> Filtrer par catégorie</span>
                  {mobileFilterOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                </button>
                {mobileFilterOpen && (
                  <div className="mt-2 bg-white rounded-2xl border-4 border-[#1A1040] p-3 space-y-1" style={{ boxShadow:'3px 3px 0px 0px #1A1040' }}>
                    <button onClick={() => { setActiveCategory(''); setMobileFilterOpen(false) }}
                      className={`w-full text-left px-3 py-2 rounded-xl font-black text-sm ${!activeCategory ? 'bg-[#1A1040] text-citron-400' : 'hover:bg-candy text-[#1A1040]'}`}>
                      Tout voir
                    </button>
                    {topCategories.map(cat => {
                      const subCats = categories.filter(c => c.parent_id === cat.id)
                      return (
                        <div key={cat.id}>
                          <button onClick={() => { setActiveCategory(cat.id); if(subCats.length === 0) setMobileFilterOpen(false) }}
                            className={`w-full text-left px-3 py-2 rounded-xl font-black text-sm ${activeCategory === cat.id ? 'bg-rose-100 text-rose-600' : 'hover:bg-candy text-[#1A1040]'}`}>
                            {cat.name}
                          </button>
                          {subCats.map(sub => (
                            <button key={sub.id}
                              onClick={() => { setActiveCategory(sub.id); setMobileFilterOpen(false) }}
                              className={`w-full text-left px-4 py-1.5 rounded-xl text-xs font-bold ml-2 ${activeCategory === sub.id ? 'bg-rose-400 text-white' : 'text-gray-500 hover:bg-candy hover:text-[#1A1040]'}`}>
                              └ {sub.name}
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Label catégorie active */}
            {activeCategory && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wide">
                  {(() => {
                    const cat = categories.find(c => c.id === activeCategory)
                    if (!cat) return ''
                    const parent = cat.parent_id ? categories.find(c => c.id === cat.parent_id) : null
                    return parent ? `${parent.name} › ${cat.name}` : cat.name
                  })()}
                </span>
                <button onClick={() => setActiveCategory('')}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors">
                  <X className="w-3 h-3"/> Effacer
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...Array(6)].map((_,i) => (
                  <div key={i} className="bg-white rounded-3xl border-4 border-gray-200 h-72 animate-pulse"/>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-20"/>
                <p className="font-black text-xl">Aucun produit disponible</p>
                <p className="text-sm mt-1">Revenez bientôt, de nouveaux articles arrivent !</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredProducts.map(prod => (
                  <ProductCard key={prod.id} product={prod} promotions={promotions} onAddToCart={handleAddToCart}/>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* BOUTON PANIER FLOTTANT */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-[#1A1040] text-citron-400 rounded-2xl border-4 border-[#1A1040] flex items-center justify-center transition-all hover:bg-[#2d2060] hover:-translate-y-1"
        style={{ boxShadow:'4px 4px 0px 0px #ffe500' }}>
        <ShoppingCart className="w-6 h-6"/>
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-xs font-black rounded-full border-2 border-white flex items-center justify-center">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </button>

      {/* Panneau panier */}
      <CartPanel/>
    </main>
  )
}
