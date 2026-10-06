import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import { CartProvider } from './context/CartContext'
import { AtelierCartProvider } from './context/AtelierCartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ProtectedRoute from './components/ProtectedRoute'

// Pages critiques — chargées immédiatement
import Accueil from './pages/Accueil'
import NosAteliers from './pages/NosAteliers'
import Boutique from './pages/Boutique'
import Contact from './pages/Contact'

// Pages secondaires — chargement différé
const Connexion       = lazy(() => import('./pages/Connexion'))
const Galerie         = lazy(() => import('./pages/Galerie'))
const Informations    = lazy(() => import('./pages/Informations'))
const MentionsLegales = lazy(() => import('./pages/MentionsLegales'))

// Pages admin — chargement différé (auth requise)
const Connecteurs      = lazy(() => import('./pages/Connecteurs'))
const TableauDeBord    = lazy(() => import('./pages/TableauDeBord'))
const Archives         = lazy(() => import('./pages/Archives'))
const ActuAdmin        = lazy(() => import('./pages/ActuAdmin'))
const AccueilAdmin     = lazy(() => import('./pages/AccueilAdmin'))
const ContactAdmin     = lazy(() => import('./pages/ContactAdmin'))
const NavbarAdmin      = lazy(() => import('./pages/NavbarAdmin'))
const BoutiqueAdmin    = lazy(() => import('./pages/BoutiqueAdmin'))
const ProduitsAdmin    = lazy(() => import('./pages/ProduitsAdmin'))
const PromosAdmin      = lazy(() => import('./pages/PromosAdmin'))
const GalerieAdmin     = lazy(() => import('./pages/GalerieAdmin'))
const CommandesAdmin   = lazy(() => import('./pages/CommandesAdmin'))
const InformationsAdmin = lazy(() => import('./pages/InformationsAdmin'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-4 border-rose-300 border-t-rose-500 animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <SiteSettingsProvider>
        <CartProvider>
          <AtelierCartProvider>
          <BrowserRouter>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-white focus:text-[#1A1040] focus:font-bold focus:px-4 focus:py-2 focus:rounded-xl focus:ring-2 focus:ring-rose-400"
            >
              Aller au contenu principal
            </a>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <CartDrawer />
              <main id="main-content" tabIndex={-1} className="outline-none flex-1 flex flex-col">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Accueil />} />
                  <Route path="/ateliers" element={<NosAteliers />} />
                  <Route path="/boutique" element={<Boutique />} />
                  <Route path="/connexion" element={<Connexion />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/galerie" element={<Galerie />} />
                  <Route path="/informations" element={<Informations />} />
                  <Route path="/mentions-legales" element={<MentionsLegales />} />
                  <Route path="/informations-admin" element={
                    <ProtectedRoute><InformationsAdmin /></ProtectedRoute>
                  } />
                  <Route path="/connecteurs" element={
                    <ProtectedRoute><Connecteurs /></ProtectedRoute>
                  } />
                  <Route path="/tableau-de-bord" element={
                    <ProtectedRoute><TableauDeBord /></ProtectedRoute>
                  } />
                  <Route path="/archives" element={
                    <ProtectedRoute><Archives /></ProtectedRoute>
                  } />
                  <Route path="/actu-moment" element={
                    <ProtectedRoute><ActuAdmin /></ProtectedRoute>
                  } />
                  <Route path="/accueil-admin" element={
                    <ProtectedRoute><AccueilAdmin /></ProtectedRoute>
                  } />
                  <Route path="/contact-admin" element={
                    <ProtectedRoute><ContactAdmin /></ProtectedRoute>
                  } />
                  <Route path="/navbar-admin" element={
                    <ProtectedRoute><NavbarAdmin /></ProtectedRoute>
                  } />
                  <Route path="/boutique-admin" element={
                    <ProtectedRoute><BoutiqueAdmin /></ProtectedRoute>
                  } />
                  <Route path="/produits-admin" element={
                    <ProtectedRoute><ProduitsAdmin /></ProtectedRoute>
                  } />
                  <Route path="/promos-admin" element={
                    <ProtectedRoute><PromosAdmin /></ProtectedRoute>
                  } />
                  <Route path="/galerie-admin" element={
                    <ProtectedRoute><GalerieAdmin /></ProtectedRoute>
                  } />
                  <Route path="/commandes-admin" element={
                    <ProtectedRoute><CommandesAdmin /></ProtectedRoute>
                  } />
                </Routes>
              </Suspense>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
          </AtelierCartProvider>
        </CartProvider>
      </SiteSettingsProvider>
    </AuthProvider>
    </HelmetProvider>
  )
}
