import { Scissors } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#1A1040] border-t-4 border-[#1A1040]">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-white/30">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif text-lg font-black text-white">l'univers créatif d'Anaïs</span>
          <span className="text-citron-400 font-black">✦</span>
        </div>

        {/* Confettis déco */}
        <div className="flex items-center gap-2">
          {['bg-rose-400','bg-citron-400','bg-turquoise-400','bg-lime-300','bg-corail-400'].map((c, i) => (
            <div key={i} className={`w-3 h-3 ${c} rounded-sm border border-white/20`} style={{ transform: `rotate(${i * 15}deg)` }} />
          ))}
        </div>

        <p className="text-gray-400 text-sm font-medium">
          © {new Date().getFullYear()} l'univers créatif d'Anaïs — Fait avec 🎨 & ❤️
        </p>
      </div>
    </footer>
  )
}
