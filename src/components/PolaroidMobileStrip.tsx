import { useState } from 'react'
import { type HeroPolaroid } from './HeroPolaroidManager'

export default function PolaroidMobileStrip({ polaroids, isAdmin }: {
  polaroids: HeroPolaroid[]
  isAdmin: boolean
}) {
  const [zoomed, setZoomed] = useState<HeroPolaroid | null>(null)
  const visible = polaroids.filter(p => p.is_visible || isAdmin)
  if (visible.length === 0) return null

  const ROTS = ['-3deg', '2deg', '-1deg', '3deg', '-2deg', '1deg']

  return (
    <>
      {/* Bande défilante horizontale — mobile uniquement */}
      <div className="md:hidden bg-candy border-b-4 border-[#1A1040] py-6 px-4 overflow-x-auto">
        <div className="flex gap-5 w-max mx-auto">
          {visible.map((p, i) => (
            <div key={p.id}
              onClick={() => setZoomed(p)}
              className="shrink-0 bg-white p-2 pb-3 border-2 border-[#1A1040] rounded-sm cursor-pointer active:scale-95 transition-transform"
              style={{ width: '140px', boxShadow: '3px 3px 0px 0px #1A1040', transform: `rotate(${ROTS[i % ROTS.length]})` }}>
              <div className="w-full aspect-square bg-candy border border-gray-200 overflow-hidden">
                {p.image_url
                  ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>}
              </div>
              {(p.title || p.text) && (
                <div className="pt-1.5 text-center">
                  {p.title && <p className="font-bold text-[10px] text-[#1A1040] leading-tight">{p.title}</p>}
                  {p.text  && <p className="text-[9px] text-[#1A1040] leading-snug mt-0.5">{p.text}</p>}
                </div>
              )}
              {isAdmin && !p.is_visible && (
                <p className="text-[8px] text-center font-black text-red-500 mt-0.5">MASQUÉ</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox zoom — mobile uniquement */}
      {zoomed && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setZoomed(null)}>
          <div className="relative bg-white p-3 pb-5 border-4 border-[#1A1040] rounded-sm w-full max-w-xs"
            style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoomed(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#1A1040] text-white flex items-center justify-center text-sm font-black leading-none z-10">✕</button>
            <div className="w-full aspect-square bg-candy border border-gray-200 overflow-hidden rounded-sm">
              {zoomed.image_url
                ? <img src={zoomed.image_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-5xl">📷</div>}
            </div>
            {(zoomed.title || zoomed.text) && (
              <div className="pt-3 text-center px-1">
                {zoomed.title && <p className="font-bold text-sm text-[#1A1040] leading-tight">{zoomed.title}</p>}
                {zoomed.text  && <p className="text-xs text-[#1A1040] leading-snug mt-1">{zoomed.text}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
