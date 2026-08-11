import { useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { POLAROID_FONTS, type HeroPolaroid } from './HeroPolaroidManager'

export default function HeroPolaroidDisplay({ polaroid, index: _index, isAdmin, onMoved, tableName = 'hero_polaroids' }: {
  polaroid: HeroPolaroid
  index: number
  isAdmin: boolean
  onMoved: (id: string, offset_x: number, offset_y: number) => void
  tableName?: string
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  // rightToLeft: left-absolute equivalent of a right-side polaroid, computed once at mount.
  // Never updated on resize — stable reference prevents drift when scrollbar appears/disappears.
  const [rightToLeft, setRightToLeft] = useState<number | null>(null)
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  useLayoutEffect(() => {
    if (polaroid.side !== 'right') { setRightToLeft(null); return }
    const el = elRef.current
    if (!el) return
    const parent = el.offsetParent as HTMLElement | null
    if (!parent) return
    // Compute once — no resize listener so scrollbar changes don't shift the polaroid
    setRightToLeft(parent.offsetWidth - el.offsetWidth + polaroid.offset_x)
  }, [polaroid.side, polaroid.offset_x])

  if (!polaroid.is_visible && !isAdmin) return null
  const canDrag = isAdmin && polaroid.draggable

  function onPointerDown(e: React.PointerEvent) {
    if (!canDrag) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, ox: polaroid.offset_x, oy: polaroid.offset_y }
    setDrag({ x: polaroid.offset_x, y: polaroid.offset_y })
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return
    setDrag({ x: start.current.ox + (e.clientX - start.current.px), y: start.current.oy + (e.clientY - start.current.py) })
  }

  async function onPointerUp(e: React.PointerEvent) {
    if (!start.current) { start.current = null; return }
    const rawX = start.current.ox + (e.clientX - start.current.px)
    const rawY = start.current.oy + (e.clientY - start.current.py)
    start.current = null
    setDrag(null)

    // Always save as left-absolute — eliminates container-width dependency permanently.
    // Right-side polaroids are converted once on first drag; side becomes 'left' in DB and state.
    let finalX = rawX
    if (polaroid.side === 'right' && rightToLeft !== null) {
      finalX = rightToLeft + (rawX - polaroid.offset_x)
    }

    onMoved(polaroid.id, finalX, rawY)
    await supabase.from(tableName).update({ offset_x: finalX, offset_y: rawY, side: 'left' }).eq('id', polaroid.id)
  }

  const rawX = drag ? drag.x : polaroid.offset_x
  const rawY = drag ? drag.y : polaroid.offset_y

  let displayX: number
  if (polaroid.side === 'right' && rightToLeft !== null) {
    displayX = rightToLeft + (rawX - polaroid.offset_x)
  } else {
    displayX = rawX
  }

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute z-20 select-none ${canDrag ? 'cursor-move' : ''} ${!polaroid.is_visible ? 'opacity-40' : ''}`}
      style={{
        top: 0,
        left: 0,
        transform: `translate(${displayX}px, ${rawY}px) rotate(${polaroid.rotation}deg)`,
      }}>
      <div className="bg-white p-2 pb-3 border-2 border-[#1A1040] rounded-sm"
        style={{ width: `${polaroid.size}px`, boxShadow: '4px 4px 0px 0px #1A1040', filter: 'drop-shadow(2px 4px 8px rgba(0,0,0,0.15))' }}>
        <div className="w-full aspect-square bg-candy border border-gray-200 overflow-hidden">
          {polaroid.image_url
            ? <img src={polaroid.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
            : <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>}
        </div>
        {(polaroid.title || polaroid.text) && (
          <div className="pt-2 px-0.5 text-center">
            {polaroid.title && (
              <p className="font-bold leading-tight"
                style={{ fontSize: `${polaroid.title_size}px`, fontFamily: POLAROID_FONTS[polaroid.title_font] || 'sans-serif', color: polaroid.title_color }}>
                {polaroid.title}
              </p>
            )}
            {polaroid.text && (
              <p className="leading-snug"
                style={{ fontSize: `${polaroid.text_size}px`, fontFamily: POLAROID_FONTS[polaroid.text_font] || 'sans-serif', color: polaroid.text_color }}>
                {polaroid.text}
              </p>
            )}
          </div>
        )}
        {isAdmin && !polaroid.is_visible && (
          <p className="text-[9px] text-center font-black text-red-500 mt-1">MASQUÉ</p>
        )}
      </div>
    </div>
  )
}
