export interface AtelierCategory {
  id: string
  nom: string
  description: string | null
  cover_url: string | null
  ordre: number
  created_at: string
}

export interface Atelier {
  id: string
  titre: string
  description: string
  date: string
  heure: string
  duree: string
  lieu: string
  prix: number
  prix_type: 'personne' | 'duo'
  places_max: number
  places_restantes: number
  image_url: string | null
  category_id: string | null
  created_at: string
}

export interface Reservation {
  id: string
  atelier_id: string
  nom: string
  prenom: string
  age: string | null
  email: string
  telephone: string | null
  mode_paiement: 'carte' | 'cheque' | 'especes'
  statut_paiement: 'en_attente' | 'paye' | 'annule'
  created_at: string
}

export interface ReservationAvecAtelier extends Reservation {
  atelier: {
    titre: string
    date: string
    heure: string
    duree: string
    lieu: string
    prix: number
  }
}

export interface PageContent {
  id: string
  page: string
  section: string
  contenu: string
  updated_at: string
}
