# 🚲 Paris Vélib' Real-Time Map

A beautiful real-time visualization of Paris bike-sharing stations using Mapbox GL.

![Vélib' Map](https://img.shields.io/badge/React-19-blue) ![Mapbox](https://img.shields.io/badge/Mapbox_GL-3.17-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## 🎯 What is this?

This app displays **real-time availability** of all 1,400+ Vélib' bike stations in Paris:
- See available bikes (electric ⚡ and mechanical 🚴)
- View empty docks for returning bikes
- Explore different visualization modes

## 📊 Data Source

Uses the official **Vélib' Métropole GBFS API** (General Bikeshare Feed Specification):
- Station locations & capacity
- Real-time bike availability (updated every ~30 seconds)
- Station status (open/closed)

## 🗺️ Visualization Modes

| Mode | Description |
|------|-------------|
| **Clusters** | Groups nearby stations into bubbles showing total bikes |
| **Heatmap** | Color intensity shows bike concentration across the city |
| **Markers** | Individual station pins with color-coded availability |

## 🚀 Quick Start

### 1. Get a Mapbox Token (Free)

1. Create a free account at [mapbox.com](https://mapbox.com)
2. Go to your [Account page](https://account.mapbox.com/access-tokens/)
3. Copy your **Default public token**

### 2. Clone & Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/mapbox-realtime-bike.git
cd mapbox-realtime-bike

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

### 3. Add Your Token

Edit the `.env` file and paste your Mapbox token:

```env
VITE_MAPBOX_TOKEN=pk.your_token_here
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Mapbox GL** - Interactive maps
- **Vite** - Fast development server
- **Axios** - API requests

## 📁 Project Structure

```
src/
├── components/
│   ├── Controls/     # Layer toggles, stats panel
│   └── Map/          # Map layers (clusters, heatmap, markers)
├── services/         # API calls to Vélib' GBFS
├── types/            # TypeScript definitions
└── App.tsx           # Main application
```

## 📝 License

MIT - Feel free to use and modify!

---

Made with ❤️ for the Paris cycling community
