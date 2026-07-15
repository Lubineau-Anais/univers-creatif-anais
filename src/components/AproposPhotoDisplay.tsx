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

export default function AproposPhotoDisplay({ photo, isAdmin }: {
  photo:    AproposPhoto
  isAdmin?: boolean
}) {
  const borderRadius = SHAPE_RADIUS[photo.shape] ?? '16px'

  return (
    <div className="flex justify-center">
      <div
        className="relative overflow-hidden transition-all duration-300"
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
        }}>
        {photo.image_url
          ? <img
              src={photo.image_url}
              alt={photo.caption || ''}
              className="w-full h-full object-cover"
              draggable={false}
            />
          : <div className="w-full h-full flex items-center justify-center text-5xl bg-rose-50">📷</div>
        }
        {isAdmin && !photo.is_visible && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
            <span className="text-white text-[9px] font-black bg-red-500 px-1.5 py-0.5 rounded">MASQUÉ</span>
          </div>
        )}
      </div>
    </div>
  )
}
