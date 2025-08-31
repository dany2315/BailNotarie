# Configuration du Blog Dynamique - BailNotarie

## 🚀 Installation et Configuration

### 1. Configuration de la Base de Données

Créez un fichier `.env` à la racine du projet avec la configuration suivante :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/bailnotarie?schema=public"

# URL du site
SITE_URL="https://bailnotarie.fr"
```

### 2. Installation des Dépendances

```bash
npm install
```

### 3. Configuration de la Base de Données

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables en base
npx prisma db push

# Insérer les données de test
npm run db:seed
```

## 📁 Structure du Projet

### Schéma Prisma (`prisma/schema.prisma`)

- **Category** : Catégories d'articles
- **Article** : Articles de blog avec relations

### Pages Dynamiques

- `app/blog/[slug]/page.tsx` : Page d'article individuel avec SSG + ISR
- `app/blog/page.tsx` : Liste des articles

### Configuration SEO

- `next-sitemap.config.js` : Sitemap automatique avec articles de blog
- Métadonnées dynamiques pour chaque article

## 🔧 Fonctionnalités

### ✅ Implémentées

1. **SSG + ISR** : Pages générées statiquement avec revalidation
2. **SEO Optimisé** : Métadonnées dynamiques, Open Graph, Twitter Cards
3. **Sitemap Automatique** : Intégration avec next-sitemap
4. **Design Conservé** : Interface utilisateur identique à l'existant
5. **Articles de Test** : 5 articles sur le bail notarié

### 📝 Articles Inclus

1. "Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?"
2. "Les étapes pour établir un bail notarié : guide complet"
3. "Force exécutoire : l'avantage majeur du bail notarié"
4. "Bail notarié vs bail classique : analyse comparative"
5. "Les obligations légales dans un bail notarié"

## 🚀 Déploiement

1. Configurez votre base de données PostgreSQL
2. Mettez à jour l'URL dans `.env`
3. Exécutez les migrations : `npx prisma db push`
4. Seedez les données : `npm run db:seed`
5. Déployez votre application

## 📊 SEO

- **URLs** : `/blog/[slug]` avec slugs générés automatiquement
- **Métadonnées** : Title, description, Open Graph, Twitter Cards
- **Sitemap** : Génération automatique avec `changefreq: "weekly"` et `priority: 0.9`
- **ISR** : Revalidation toutes les 60 secondes

## 🔗 URLs Générées

- `/blog/bail-notarie-quest-ce-que-cest`
- `/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet`
- `/blog/force-executoire-lavantage-majeur-du-bail-notarie`
- `/blog/bail-notarie-vs-bail-classique-analyse-comparative`
- `/blog/les-obligations-legales-dans-un-bail-notarie`
