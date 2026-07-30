-- Table des commandes boutique
create table if not exists public.shop_orders (
  id                        uuid primary key default gen_random_uuid(),
  client_prenom             text not null,
  client_nom                text not null,
  client_email              text not null,
  client_telephone          text not null,
  mode_livraison            text not null, -- 'mondial_relay' | 'click_and_collect'
  relay_id                  text,
  relay_nom                 text,
  relay_adresse             text,
  relay_cp                  text,
  relay_ville               text,
  relay_pays                text,
  articles                  jsonb not null default '[]'::jsonb,
  sous_total                numeric(10,2) not null default 0,
  frais_livraison           numeric(10,2) not null default 0,
  remise                    numeric(10,2) not null default 0,
  total                     numeric(10,2) not null default 0,
  code_promo                text,
  stripe_payment_intent_id  text,
  statut                    text not null default 'en_attente',
  notes                     text,
  created_at                timestamptz default now()
);

alter table public.shop_orders enable row level security;

-- Les clients (anon) peuvent créer des commandes
create policy "Clients peuvent créer des commandes"
  on public.shop_orders for insert
  with check (true);

-- Les admins (authentifiés) peuvent tout faire
create policy "Admin peut gérer les commandes"
  on public.shop_orders for all
  to authenticated
  using (true)
  with check (true);
