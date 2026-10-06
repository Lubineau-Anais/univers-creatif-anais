import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center bg-[#fff5fb]">
      <Helmet>
        <title>Page introuvable — L'Univers Créatif d'Anaïs</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className="text-8xl font-black text-rose-300 leading-none">404</p>
      <h1 className="mt-4 text-2xl font-black text-[#1A1040]">Oups, cette page n'existe pas !</h1>
      <p className="mt-3 text-gray-500 max-w-sm">
        La page que tu cherches a peut-être été déplacée, supprimée, ou n'a jamais existé.
      </p>
      <Link to="/" className="btn-primary mt-8 inline-block">
        ← Retour à l'accueil
      </Link>
    </main>
  )
}
