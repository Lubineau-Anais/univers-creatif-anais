import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function MentionsLegales() {
  return (
    <main className="flex-1 bg-[#fff5fb]">
      <Helmet>
        <title>Mentions légales & Politique de confidentialité — L'Univers Créatif d'Anaïs</title>
        <meta name="description" content="Mentions légales, politique de confidentialité et informations légales du site L'Univers Créatif d'Anaïs." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Hero */}
      <div className="bg-[#1A1040] text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-rose-300 hover:text-white text-sm font-bold mb-4 inline-block">← Retour à l'accueil</Link>
          <h1 className="font-serif text-3xl font-black">Mentions légales &amp; Politique de confidentialité</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* ── 1. Mentions légales ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-black text-2xl text-[#1A1040] mb-4 pb-2 border-b-2 border-rose-200">1. Mentions légales</h2>

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-bold text-[#1A1040]">Éditeur du site</h3>
              <p>L'Univers Créatif d'Anaïs — activité en nom propre</p>
              <p>Responsable de la publication : Anaïs</p>
              <p>
                Contact :{' '}
                <a href="mailto:contact@lunivers-creatif-danais.fr" className="text-rose-500 hover:underline">
                  contact@lunivers-creatif-danais.fr
                </a>
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040]">Hébergement</h3>
              <p>Ce site est hébergé par <strong>Netlify, Inc.</strong>, 44 Montgomery Street, Suite 300, San Francisco, CA 94104, États-Unis.</p>
              <p>Les données de la base de données sont hébergées par <strong>Supabase</strong> (infrastructure AWS, région eu-west-3 — Paris).</p>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040]">Propriété intellectuelle</h3>
              <p>L'ensemble du contenu de ce site (textes, photographies, illustrations) est la propriété exclusive d'Anaïs. Toute reproduction, même partielle, est interdite sans autorisation préalable écrite.</p>
            </div>
          </div>
        </section>

        {/* ── 2. Politique de confidentialité ────────────────────────────────── */}
        <section>
          <h2 className="font-black text-2xl text-[#1A1040] mb-4 pb-2 border-b-2 border-rose-200">2. Politique de confidentialité</h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Données collectées</h3>
              <p>Lors d'une réservation d'atelier ou d'une commande boutique, nous collectons :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Nom et prénom</li>
                <li>Adresse e-mail</li>
                <li>Numéro de téléphone (si fourni)</li>
                <li>Adresse postale (pour la livraison boutique)</li>
                <li>Informations de paiement (traitées exclusivement par Stripe — nous ne stockons aucune donnée bancaire)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Finalités du traitement</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Gestion des réservations et des commandes</li>
                <li>Envoi des confirmations et rappels par e-mail</li>
                <li>Gestion des remboursements</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Base légale</h3>
              <p>Le traitement est fondé sur l'exécution du contrat (article 6.1.b du RGPD) lors de vos achats et réservations.</p>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Conservation des données</h3>
              <p>Vos données sont conservées pendant la durée nécessaire à la gestion de votre réservation ou commande, et au maximum 3 ans à des fins comptables.</p>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Sous-traitants</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong> — hébergement de la base de données (UE)</li>
                <li><strong>Stripe</strong> — paiement en ligne sécurisé</li>
                <li><strong>Netlify</strong> — hébergement du site</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Vos droits</h3>
              <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour exercer ces droits, contactez-nous à :</p>
              <p className="mt-1">
                <a href="mailto:contact@lunivers-creatif-danais.fr" className="text-rose-500 hover:underline">
                  contact@lunivers-creatif-danais.fr
                </a>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Vous pouvez également introduire une réclamation auprès de la{' '}
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:underline">CNIL</a>.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[#1A1040] mb-1">Cookies</h3>
              <p>Ce site n'utilise pas de cookies de traçage ou de publicité. Les seuls cookies présents sont techniques et nécessaires au fonctionnement du site (session d'authentification).</p>
            </div>

          </div>
        </section>

        <p className="text-sm text-gray-400 text-right">Dernière mise à jour : octobre 2026</p>
      </div>
    </main>
  )
}
