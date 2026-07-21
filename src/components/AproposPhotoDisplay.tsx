import { useRef, useState, useEffect } from 'react'

export interface AproposPhoto {
  id:            string
  image_url:     string
  offset_x:      number
  offset_y:      number
  rotation:      number
  size:          number
  show_cadre:    boolean
  cadre_color:   string
  cadre_width:   number
  show_contour:  boolean
  contour_color: string
  show_fond:     boolean
  fond_color:    string
  shape:         string
  is_visible:    boolean
  sort_order:    number
  caption:       string
}

const SHAPE_RADIUS: Record<string, string> = {
  'rounded-none': '0px',
  'rounded-xl':   '12px',
  'rounded-2xl':  '16px',
  'rounded-3xl':  '24px',
  'rounded-full': '9999px',
}

export default function AproposPhotoDisplay({ photo, isAdmin, onSaveOffset }: {
  photo:          AproposPhoto
  isAdmin?:       boolean
  onSaveOffset?:  (ox: number, oy: number) => void
}) {
  const borderRadius = SHAPE_RADIUS[photo.shape] ?? '16px'
  const canDrag = isAdmin && !!onSaveOffset && !!photo.image_url

  const isDragging = useRef(false)
  const dragStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const finalOff   = useRef({ x: 0, y: 0 })
  const [ox, setOx] = useState(photo.offset_x || 0)
  const [oy, setOy] = useState(photo.offset_y || 0)

  useEffect(() => {
    setOx(photo.offset_x || 0)
    setOy(photo.offset_y || 0)
  }, [photo.id, photo.offset_x, photo.offset_y])

  function getClient(e: React.MouseEvent | React.TouchEvent) {
    return 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY }
  }

  function onDragStart(e: React.MouseEvent | React.TouchEvent) {
    if (!canDrag) return
    e.preventDefault()
    const { x, y } = getClient(e)
    isDragging.current  = true
    dragStart.current   = { x, y, ox, oy }
    finalOff.current    = { x: ox, y: oy }
  }

  function onDragMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging.current || !canDrag) return
    e.preventDefault()
    const { x, y } = getClient(e)
    const newOx = Math.max(-50, Math.min(50, dragStart.current.ox + (x - dragStart.current.x) * 0.4))
    const newOy = Math.max(-50, Math.min(50, dragStart.current.oy + (y - dragStart.current.y) * 0.4))
    finalOff.current = { x: newOx, y: newOy }
    setOx(newOx)
    setOy(newOy)
  }

  function onDragEnd() {
    if (!isDragging.current || !canDrag) return
    isDragging.current = false
    onSaveOffset?.(finalOff.current.x, finalOff.current.y)
  }

  const dragHandlers = canDrag ? {
    onMouseDown:  onDragStart,
    onMouseMove:  onDragMove,
    onMouseUp:    onDragEnd,
    onMouseLeave: onDragEnd,
    onTouchStart: onDragStart,
    onTouchMove:  onDragMove,
    onTouchEnd:   onDragEnd,
  } : {}

  return (
    <div className="flex justify-center">
      <div
        className="relative overflow-hidden transition-all duration-300 select-none"
        style={{
          width:           `${photo.size}px`,
          height:          `${photo.size}px`,
          maxWidth:        '100%',
          borderRadius,
          border:          photo.show_cadre ? `${photo.cadre_width}px solid ${photo.cadre_color}` : 'none',
          backgroundColor: photo.show_fond ? photo.fond_color : 'transparent',
          outline:         photo.show_contour ? `3px solid ${photo.contour_color}` : 'none',
          outlineOffset:   photo.show_contour ? '3px' : undefined,
          boxShadow:       photo.show_cadre ? `4px 4px 0px 0px ${photo.cadre_color}` : undefined,
          transform:       `rotate(${photo.rotation}deg)`,
          opacity:         (!photo.is_visible && isAdmin) ? 0.45 : 1,
          cursor:          canDrag ? 'grab' : 'default',
        }}
        {...dragHandlers}
      >
        {photo.image_url
          ? <img
              src={photo.image_url}
              alt={photo.caption || ''}
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: `${50 + ox}% ${50 + oy}%` }}
              draggable={false}
            />
          : <div className="w-full h-full flex items-center justify-center text-5xl bg-rose-50">📷</div>
        }

        {/* Hint glisser (admin uniquement) */}
        {canDrag && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <span className="bg-black/55 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
              ✋ Glisse pour recadrer
            </span>
          </div>
        )}

        {isAdmin && !photo.is_visible && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
            <span className="text-white text-[9px] font-black bg-red-500 px-1.5 py-0.5 rounded">MASQUÉ</span>
          </div>
        )}
      </div>
    </div>
  )
}
