# 📋 Rapport Complet du Fonctionnement - Vélib' Live

## 🎯 Vue d'Ensemble

**Vélib' Live** est une application web React/TypeScript qui visualise en temps réel les données des stations Vélib' de Paris sur une carte interactive Mapbox. L'application récupère les données via l'API GBFS (General Bikeshare Feed Specification) de Vélib' Métropole et les affiche avec plusieurs modes de visualisation : marqueurs individuels, heatmap (carte de chaleur) et clusters intelligents.

---

## 🏗️ Architecture du Projet

### Structure des Dossiers

```
src/
├── components/          # Composants React réutilisables
│   ├── Map/            # Composants liés à la carte
│   ├── Controls/       # Panneaux de contrôle
│   └── UI/             # Composants d'interface
├── hooks/              # Hooks React personnalisés
├── services/           # Services API et logique métier
├── types/              # Définitions TypeScript
└── utils/              # Fonctions utilitaires
```

---

## 🔄 Flux de Données Principal

### 1. **Point d'Entrée** (`main.tsx`)
- Initialise l'application React avec `StrictMode`
- Monte le composant `App` dans le DOM

### 2. **Composant Principal** (`App.tsx`)

**Rôle** : Orchestre l'ensemble de l'application

**Fonctionnalités** :
- Utilise le hook `useVelibData` pour récupérer les données
- Gère l'état de visibilité des couches (markers, heatmap, clusters)
- Affiche l'interface utilisateur (header, carte, contrôles, footer)
- Gère les erreurs avec un bandeau d'alerte

**État géré** :
```typescript
layerVisibility: {
  markers: boolean,    // Marqueurs individuels
  heatmap: boolean,   // Carte de chaleur
  clusters: boolean   // Groupements intelligents
}
```

---

## 📡 Récupération des Données

### Hook `useVelibData` (`hooks/useVelibData.ts`)

**Responsabilités** :
1. **Chargement initial** : Récupère les données au montage du composant
2. **Auto-refresh** : Met à jour automatiquement toutes les 60 secondes (configurable)
3. **Gestion d'état** : Maintient `stations`, `isLoading`, `error`, `lastUpdate`
4. **Mémorisation** : Utilise `useMemo` pour optimiser les calculs de GeoJSON et statistiques

**Cycle de vie** :
```
Montage → Chargement initial → Intervalle auto-refresh → Mise à jour → Re-render
```

### Service `velibService` (`services/velibService.ts`)

#### **A. Cache des Informations Statiques**

```typescript
stationInfoCache: Map<string, StationInfo>
INFO_CACHE_TTL = 5 minutes
```

**Stratégie** :
- Les informations statiques (nom, position, capacité) sont mises en cache 5 minutes
- Évite les appels API inutiles pour des données qui changent rarement

#### **B. Fonction `fetchStationInfo()`**

**Endpoint** : `/api/velib/station_information.json`

**Données récupérées** :
- `station_id` : Identifiant unique
- `name` : Nom de la station
- `lat` / `lon` : Coordonnées géographiques
- `capacity` : Capacité totale
- `stationCode` : Code de la station

**Retour** : `Map<string, StationInfo>` pour accès rapide par ID

#### **C. Fonction `fetchStationStatus()`**

**Endpoint** : `/api/velib/station_status.json`

**Données récupérées** (temps réel) :
- `num_bikes_available` : Nombre total de vélos disponibles
- `num_bikes_available_types` : Détail mécaniques/électriques
- `num_docks_available` : Places libres
- `is_installed` : Station installée (1/0)
- `is_renting` / `is_returning` : État opérationnel
- `last_reported` : Timestamp de dernière mise à jour

#### **D. Fonction `fetchStations()`**

**Processus de fusion** :
1. Appelle en parallèle `fetchStationInfo()` et `fetchStationStatus()`
2. Pour chaque statut, trouve l'info correspondante via `station_id`
3. Extrait les compteurs de vélos mécaniques/électriques depuis le tableau
4. Calcule les métriques dérivées :
   - `availabilityRatio` : Ratio vélos disponibles / capacité (0-1)
   - `fillLevel` : Ratio places occupées / capacité (0-1)
5. Retourne un tableau de `Station[]` fusionnées

#### **E. Fonction `stationsToGeoJSON()`**

**Conversion** :
- Filtre les stations installées avec coordonnées valides
- Transforme chaque station en Feature GeoJSON Point
- Format : `{ type: 'FeatureCollection', features: [...] }`

#### **F. Fonction `calculateStats()`**

**Statistiques globales calculées** :
- `totalStations` : Nombre total de stations
- `activeStations` : Stations installées et opérationnelles
- `totalBikes` : Somme de tous les vélos disponibles
- `mechanicalBikes` / `electricBikes` : Totaux par type
- `availableDocks` : Total des places libres
- `totalCapacity` : Capacité totale du réseau
- `averageAvailability` : Ratio moyen de disponibilité
- `lastUpdated` : Date de dernière mise à jour la plus récente

---

## 🗺️ Visualisation Carte

### Composant `MapContainer` (`components/Map/MapContainer.tsx`)

**Technologie** : `react-map-gl` (wrapper React pour Mapbox GL JS)

**Configuration initiale** :
```typescript
latitude: 48.8566   // Centre de Paris
longitude: 2.3522
zoom: 12
pitch: 45°          // Vue inclinée 3D
```

**Fonctionnalités** :
1. **Gestion de la vue** : Suit les changements de zoom/pan
2. **Sélection de station** : Gère le popup d'information
3. **Animation** : `flyTo()` pour centrer sur une station cliquée
4. **Curseur** : Change en `pointer` au survol des marqueurs
5. **Fermeture popup** : Touche `Escape` ou clic extérieur

**Ordre de rendu des couches** :
1. Heatmap (dessous)
2. Clusters
3. Markers (dessus, si clusters désactivés)

---

## 🎨 Couches de Visualisation

### 1. **HeatmapLayer** (`components/Map/HeatmapLayer.tsx`)

**Type** : Couche native Mapbox GL (`type: 'heatmap'`)

**Configuration** :

**Poids** (`heatmap-weight`) :
- Basé sur `totalBikes` de chaque station
- Interpolation linéaire : 0→0, 5→0.3, 15→0.6, 30→0.8, 50→1

**Intensité** (`heatmap-intensity`) :
- Augmente avec le zoom : 10→0.5, 13→1, 16→1.5

**Couleurs** (`heatmap-color`) :
- Gradient violet → indigo → bleu → cyan → vert → ambre → orange → rouge
- Basé sur `heatmap-density` (densité calculée par Mapbox)

**Rayon** (`heatmap-radius`) :
- Adaptatif au zoom : 10→20px, 12→30px, 14→40px, 16→50px

**Opacité** (`heatmap-opacity`) :
- Diminue avec le zoom : 10→0.8, 14→0.7, 16→0.5

**Résultat visuel** : Zones colorées montrant la densité de vélos disponibles

---

### 2. **ClustersLayer** (`components/Map/ClustersLayer.tsx`)

**Technologie** : `supercluster` (clustering côté client)

**Algorithme Supercluster** :

**Configuration** :
```typescript
radius: 60 pixels      // Distance de regroupement
maxZoom: 16            // Zoom max pour clustering
minZoom: 0
```

**Fonction `map()`** :
- Extrait les propriétés à agréger : `totalBikes`, `mechanicalBikes`, `electricBikes`, `availableDocks`, `capacity`

**Fonction `reduce()`** :
- Additionne les valeurs pour créer des totaux de cluster

**Processus** :
1. Crée une instance Supercluster avec les données GeoJSON
2. À chaque changement de zoom/bounds, appelle `getClusters()`
3. Retourne un mélange de :
   - **Clusters** : Points groupés avec `cluster: true`
   - **Points individuels** : Stations non-groupées avec `cluster: false`

**Rendu des Clusters** :
- **Taille** : `getClusterRadius(pointCount)` - logarithmique, max 50px
- **Couleur** : `getClusterColor(totalBikes, capacity)` - basée sur ratio disponibilité
- **Affichage** : Nombre de stations + total vélos (format "1.2k" si >1000)
- **Interaction** : Clic pour zoomer (expansion automatique)

**Rendu des Points Individuels** :
- Cercle coloré avec nombre de vélos
- Clic pour ouvrir le popup

**Optimisation** : Recalcule uniquement quand `zoom` ou `bounds` changent

---

### 3. **MarkersLayer** (`components/Map/MarkersLayer.tsx`)

**Rôle** : Affiche des marqueurs individuels pour chaque station

**Limitation** : Maximum 500 marqueurs affichés (performance)

**Styling** :
- **Taille** : 12-20px, proportionnelle au nombre de vélos
- **Couleur** : `getAvailabilityColor(availabilityRatio)`
  - Vert émeraude (≥60%) → Lime (≥40%) → Ambre (≥20%) → Orange (≥10%) → Rouge (<10%)
- **Effet** : Ombre portée colorée + animation pulse

**Interaction** : Clic pour ouvrir le popup

---

## 🎛️ Composants de Contrôle

### **LayerToggle** (`components/Controls/LayerToggle.tsx`)

**Fonction** : Permet d'activer/désactiver chaque couche

**Interface** :
- 3 boutons : Markers, Heatmap, Clusters
- Indicateur visuel (on/off)
- Icônes et descriptions

**Logique** :
- Toggle individuel par couche
- Markers et Clusters mutuellement exclusifs (si clusters activés, markers désactivés)

---

### **StatsPanel** (`components/Controls/StatsPanel.tsx`)

**Affichage** :

1. **Header** :
   - Titre "Vélib' Paris"
   - Bouton refresh (spinner si chargement)

2. **Statistiques** (grille 2x2) :
   - **Available Bikes** (carte principale) :
     - Total vélos
     - Détail mécaniques/électriques
   - **Active Stations** : Nombre actif / total
   - **Free Docks** : Places libres / capacité totale
   - **Availability** : Pourcentage moyen + barre de progression

3. **Footer** :
   - Timestamp dernière mise à jour
   - Lien vers source de données

**Formatage** :
- Nombres : `toLocaleString('en-US')` (séparateurs milliers)
- Pourcentages : `(value * 100).toFixed(1)%`
- Heure : Format 24h HH:MM:SS

---

## 💬 Composant Popup (`components/UI/Popup.tsx`)

**Affichage** : Modal centré avec informations détaillées d'une station

**Contenu** :

1. **Header** :
   - Indicateur coloré (disponibilité)
   - Nom de la station
   - Bouton fermeture (×)

2. **Statistiques** (3 colonnes) :
   - 🚲 Vélos mécaniques
   - ⚡ Vélos électriques
   - 🅿️ Places libres

3. **Barre de capacité** :
   - Barre de progression colorée
   - Texte "X / Y bikes"

4. **Badge de statut** :
   - "Station Active" (si `isRenting && isReturning`)
   - "Station Inactive" sinon

**Fermeture** : Clic sur ×, touche Escape, ou clic extérieur

---

## 🔧 Utilitaires

### `dataTransform.ts` (`utils/dataTransform.ts`)

**Fonctions** :

1. **`createSupercluster()`** :
   - Initialise Supercluster avec configuration optimale
   - Transforme les features GeoJSON en format Supercluster
   - Charge les points dans l'instance

2. **`getClusters()`** :
   - Récupère clusters pour bounds et zoom donnés
   - Utilise `supercluster.getClusters(bounds, zoom)`

3. **`formatNumber()`** :
   - Formate les grands nombres : 1000 → "1.0k"

4. **`getClusterRadius()`** :
   - Calcule rayon basé sur nombre de points
   - Formule : `baseRadius + log10(pointCount + 1) * 15`
   - Maximum : 50px

5. **`getClusterColor()`** :
   - Retourne couleur selon ratio disponibilité
   - Seuils : 50% (vert), 30% (lime), 15% (ambre), sinon (rouge)

---

## 🌐 Configuration et Proxy

### `vite.config.ts`

**Proxy CORS** :
```typescript
'/api/velib' → 'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole'
```

**Raison** : L'API Vélib' n'autorise pas les requêtes cross-origin depuis le navigateur. Vite proxy les requêtes en développement pour contourner cette limitation.

**Réécriture** : `/api/velib/station_status.json` → `/opendata/Velib_Metropole/station_status.json`

---

## 🎨 Système de Couleurs

### Fonction `getAvailabilityColor()` (`services/velibService.ts`)

**Seuils** :
- `≥ 60%` : `#10b981` (Vert émeraude) - Excellente disponibilité
- `≥ 40%` : `#84cc16` (Lime) - Bonne disponibilité
- `≥ 20%` : `#f59e0b` (Ambre) - Disponibilité moyenne
- `≥ 10%` : `#f97316` (Orange) - Faible disponibilité
- `< 10%` : `#ef4444` (Rouge) - Très faible disponibilité

**Utilisation** :
- Marqueurs individuels
- Clusters
- Popup indicateur
- Barres de progression

---

## ⚡ Optimisations de Performance

### 1. **Mémorisation React**
- `useMemo` pour GeoJSON (recalcul uniquement si `stations` change)
- `useMemo` pour statistiques
- `useMemo` pour clusters (recalcul si `bounds` ou `zoom` change)

### 2. **Cache API**
- Cache 5 minutes pour informations statiques
- Réduit les appels API inutiles

### 3. **Limitation de Rendu**
- MarkersLayer limité à 500 marqueurs
- Clustering automatique pour réduire le nombre d'éléments DOM

### 4. **Lazy Loading**
- Couches rendues uniquement si `mapLoaded === true`
- Évite les erreurs avant initialisation de Mapbox

### 5. **Callbacks Mémorisés**
- `useCallback` pour éviter re-création de fonctions
- Réduit re-renders inutiles

---

## 🔄 Cycle de Vie Complet

### Démarrage
```
1. main.tsx monte App
2. App.tsx utilise useVelibData
3. useVelibData appelle fetchStations()
4. fetchStations() récupère info + status en parallèle
5. Fusion des données → calcul stats → conversion GeoJSON
6. MapContainer reçoit geoJSON et affiche les couches
```

### Mise à Jour Automatique
```
1. Intervalle 60s déclenche refresh()
2. fetchStations() récupère nouvelles données
3. États mis à jour (stations, stats, geoJSON)
4. Composants re-rendus avec nouvelles données
5. Carte mise à jour automatiquement
```

### Interaction Utilisateur
```
1. Clic sur marqueur/cluster
2. handleStationClick() appelé
3. Animation flyTo() vers station
4. Popup affiché avec détails
5. Fermeture via Escape/×/clic extérieur
```

---

## 📊 Types TypeScript

### Hiérarchie des Types

**Données API** :
- `StationInfo` : Données statiques (API)
- `StationStatus` : Données temps réel (API)

**Données Application** :
- `Station` : Fusion info + status + métriques calculées
- `StationFeature` : Feature GeoJSON avec Station
- `StationGeoJSON` : FeatureCollection complète

**Clustering** :
- `ClusterProperties` : Propriétés pour Supercluster
- `ClusterFeature` : Feature cluster ou point

**Interface** :
- `LayerVisibility` : État des couches
- `VelibStats` : Statistiques globales

---

## 🚀 Scripts et Déploiement

### Scripts NPM
- `npm run dev` : Serveur développement Vite (port 5173)
- `npm run build` : Build production (TypeScript + Vite)
- `npm run preview` : Prévisualiser le build
- `npm run lint` : Vérification ESLint

### Variables d'Environnement
- `VITE_MAPBOX_TOKEN` : Token d'accès Mapbox (requis)

---

## 🐛 Gestion d'Erreurs

### Niveaux de Gestion

1. **Service** (`velibService.ts`) :
   - Try/catch dans `fetchStationInfo()` → retourne cache expiré si erreur
   - Try/catch dans `fetchStationStatus()` → throw error

2. **Hook** (`useVelibData.ts`) :
   - Try/catch dans `refresh()` → set error state
   - Log console pour debugging

3. **UI** (`App.tsx`) :
   - Affichage bandeau d'erreur si `error !== null`
   - Auto-retry via intervalle suivant

---

## 🎯 Points Clés du Fonctionnement

1. **Temps Réel** : Mise à jour automatique toutes les 60 secondes
2. **Multi-Couches** : 3 modes de visualisation complémentaires
3. **Performance** : Clustering + mémorisation + cache
4. **Interactivité** : Popups, animations, contrôles utilisateur
5. **Type-Safe** : TypeScript strict pour éviter erreurs
6. **Modulaire** : Architecture composants réutilisables
7. **Responsive** : Interface adaptative

---

## 📝 Conclusion

Cette application démontre une architecture React moderne avec :
- **Séparation des responsabilités** : Services, hooks, composants
- **Optimisations** : Cache, mémorisation, clustering
- **UX soignée** : Animations, feedback visuel, statistiques
- **Maintenabilité** : TypeScript, structure claire, code commenté

Le système permet de visualiser efficacement l'état en temps réel du réseau Vélib' parisien avec des performances optimales même avec des milliers de stations.
