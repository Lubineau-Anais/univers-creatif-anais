# L'Univers Créatif d'Anaïs

Site vitrine pour les ateliers créatifs, la boutique et la galerie d'Anaïs.

🌐 **Production** : [lunivers-creatif-danais.fr](https://lunivers-creatif-danais.fr)

## Stack

- **Frontend** : React 19 + TypeScript + Vite 8
- **Style** : Tailwind CSS v3.4 (design pastel néo-brutalist)
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Paiement** : Stripe
- **Emails** : Resend via Edge Functions Deno
- **Déploiement** : Netlify (CI/CD depuis `main`)

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173
```

Variables d'environnement requises dans `.env.local` :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLIC_KEY=...
```

## Build

```bash
npm run build      # compile dans dist/
```

## Structure

```
src/
├── pages/          # Routes publiques + admin (lazy-loaded)
├── components/     # Composants partagés (Navbar, CartDrawer, …)
├── context/        # Auth, panier, paramètres site
├── lib/            # supabase.ts, sanitize.ts, …
└── types/          # Types TypeScript globaux

supabase/
└── functions/      # Edge Functions Deno (emails, paiement, …)

public/
├── robots.txt
└── sitemap.xml
```

## Pages publiques

| Route | Description |
|-------|-------------|
| `/` | Accueil |
| `/ateliers` | Catalogue des ateliers + réservation |
| `/boutique` | Boutique en ligne |
| `/galerie` | Galerie photos |
| `/contact` | Formulaire de contact |
| `/informations` | Infos pratiques |
| `/mentions-legales` | Mentions légales |

## Pages admin (accès restreint)

Toutes protégées par `ProtectedRoute` (connexion Supabase Auth requise).  
Route de connexion : `/connexion`
