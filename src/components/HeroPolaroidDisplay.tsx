import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { POLAROID_FONTS, type HeroPolaroid } from './HeroPolaroidManager'

export default function HeroPolaroidDisplay({ polaroid, index, isAdmin, onMoved, tableName = 'hero_polaroids' }: {
  polaroid: HeroPolaroid
  index: number
  isAdmin: boolean
  onMoved: (id: string, offset_x: number, offset_y: number) => void
  tableName?: string
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  if (!polaroid.is_visible && !isAdmin) return null

  const canDrag = isAdmin && polaroid.draggable
  const offsetX = drag ? drag.x : polaroid.offset_x
  const offsetY = drag ? drag.y : polaroid.offset_y

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
    const dx = e.clientX - start.current.px
    const dy = e.clientY - start.current.py
    setDrag({ x: start.current.ox + dx, y: start.current.oy + dy })
  }

  async function onPointerUp() {
    if (!start.current || !drag) { start.current = null; return }
    start.current = null
    const { x, y } = drag
    setDrag(null)
    onMoved(polaroid.id, x, y)
    await supabase.from(tableName).update({ offset_x: x, offset_y: y }).eq('id', polaroid.id)
  }

  const baseTop = `${15 + (index % 3) * 28}%`
  const sideStyle = polaroid.side === 'left' ? { left: '16px' } : { right: '16px' }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute z-20 select-none ${canDrag ? 'cursor-move' : ''} ${!polaroid.is_visible ? 'opacity-40' : ''}`}
      style={{
        top: baseTop,
        ...sideStyle,
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${polaroid.rotation}deg)`,
        transition: drag ? 'none' : 'transform 0.2s ease-out',
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
