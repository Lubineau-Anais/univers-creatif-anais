import { useRef, useState } from 'react'
import { X, Upload, RefreshCw, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  photo:    string
  size:     number
  rotation: number
  visible:  boolean
  onClose:  () => void
  onChange: (patch: { photo?: string; size?: number; rotation?: number; visible?: boolean }) => void
}

export default function AproposPhotoManager({ photo, size, rotation, visible, onClose, onChange }: Props) {
  const fileRef    = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  async function uploadPhoto(file: File) {
    setUploading(true)
    setUploadErr('')
    const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `apropos-photo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setUploadErr('Erreur upload : ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('hero').getPublicUrl(filename)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.from('settings').upsert({ key: 'apropos_photo_url', value: url }, { onConflict: 'key' })
    onChange({ photo: url })
    setUploading(false)
  }

  async function saveSize(v: number) {
    onChange({ size: v })
    await supabase.from('settings').upsert({ key: 'apropos_photo_size', value: String(v) }, { onConflict: 'key' })
  }

  async function saveRotation(v: number) {
    onChange({ rotation: v })
    await supabase.from('settings').upsert({ key: 'apropos_photo_rotation', value: String(v) }, { onConflict: 'key' })
  }

  async function toggleVisible() {
    const next = !visible
    onChange({ visible: next })
    await supabase.from('settings').upsert({ key: 'apropos_photo_visible', value: String(next) }, { onConflict: 'key' })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panneau */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm flex flex-col bg-white border-l-4 border-[#1A1040]"
        style={{ boxShadow: '-6px 0 0 0 #1A1040' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1A1040]">
          <div>
            <h2 className="font-serif font-black text-lg text-white">📷 Photo À Propos</h2>
            <p className="text-white/50 text-xs font-medium mt-0.5">Taille · Inclinaison · Visibilité</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Aperçu */}
          <div className="flex justify-center py-5 bg-candy rounded-2xl border-2 border-dashed border-[#1A1040]/20">
            {visible
              ? <img src={photo} alt="À propos" className="object-cover rounded-2xl border-4 border-[#1A1040] transition-transform duration-300"
                  style={{ width: 140, height: 140, transform: `rotate(${rotation}deg)` }} />
              : <div className="w-[140px] h-[140px] rounded-2xl border-4 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-300">
                  <EyeOff className="w-8 h-8" />
                  <span className="text-xs font-black">Masquée</span>
                </div>
            }
          </div>

          {/* Upload */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2 block">Photo</label>
            <label
              className={`flex items-center gap-3 border-4 border-dashed rounded-2xl px-4 py-3 cursor-pointer transition-all ${uploading ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-[#1A1040] bg-candy hover:bg-rose-50'}`}
              onClick={() => !uploading && fileRef.current?.click()}>
              {uploading
                ? <><RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /><span className="font-black text-gray-400 text-sm">Téléchargement…</span></>
                : <><div className="w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0"><Upload className="w-4 h-4 text-white" /></div>
                   <div><p className="font-black text-[#1A1040] text-sm">Changer la photo</p><p className="text-gray-400 text-xs">JPG, PNG, WebP — carré recommandé</p></div></>
              }
            </label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = '' }} />
            {uploadErr && <p className="text-xs text-red-600 font-medium mt-1">{uploadErr}</p>}
          </div>

          {/* Taille */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">📐 Taille</label>
              <span className="text-xs font-black text-[#1A1040]">{size} px</span>
            </div>
            <input type="range" min={120} max={480} step={10} value={size}
              onChange={e => saveSize(parseInt(e.target.value))}
              className="w-full accent-rose-400" />
            <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
              <span>120 px</span><span>480 px</span>
            </div>
          </div>

          {/* Inclinaison */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">🔄 Inclinaison</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#1A1040]">{rotation}°</span>
                {rotation !== 0 && (
                  <button onClick={() => saveRotation(0)}
                    className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-rose-400 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>
            <input type="range" min={-30} max={30} step={1} value={rotation}
              onChange={e => saveRotation(parseFloat(e.target.value))}
              className="w-full accent-turquoise-500" />
            <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
              <span>-30°</span><span className="text-center flex-1">Droit</span><span>+30°</span>
            </div>
          </div>

          {/* Visibilité */}
          <div className="flex items-center justify-between bg-candy rounded-2xl px-4 py-4 border-2 border-[#1A1040]/20">
            <div>
              <p className="text-sm font-black text-[#1A1040]">
                {visible ? <><Eye className="inline w-4 h-4 mr-1" />Visible du public</> : <><EyeOff className="inline w-4 h-4 mr-1" />Masquée du public</>}
              </p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                {visible ? 'La photo apparaît sur le site' : 'La photo est cachée aux visiteurs'}
              </p>
            </div>
            <button onClick={toggleVisible}
              className={`relative w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors shrink-0 ${visible ? 'bg-lime-400' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#1A1040] transition-all ${visible ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
