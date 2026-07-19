# JAN-PATH — AI-Assisted Emergency Vehicle Traffic Intelligence System

## Frontend Application

A professional, crash-resistant React frontend for the JAN-PATH emergency vehicle traffic control system.

### Features

- **Real-time Emergency Control Dashboard**
  - Live ETA countdown with color-coded urgency
  - Active junction monitoring
  - Signal control visualization
  - Lane occupancy tracking
  - Multilingual public advisory system

- **Interactive Map**
  - OpenStreetMap integration via Leaflet
  - Fixed ambulance position marker
  - Dynamic junction markers
  - Route visualization with polylines

- **Robust Architecture**
  - Null/undefined safe rendering
  - Automatic polling with error recovery
  - Connection status monitoring
  - Graceful degradation on API failures
  - No runtime crashes

### Tech Stack

- React 18
- Tailwind CSS
- React Leaflet
- Axios
- OpenStreetMap

### Prerequisites

- Node.js 16+ and npm
- Backend FastAPI server running on `http://127.0.0.1:8000`

### Installation

```bash
# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Running the Application

```bash
# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx       # Main dashboard layout
│   ├── ETACard.jsx         # ETA countdown display
│   ├── LaneCard.jsx        # Lane occupancy visualization
│   ├── SignalCard.jsx      # Signal control display
│   ├── AdvisoryPanel.jsx   # Multilingual advisory
│   ├── MapView.jsx         # Leaflet map component
│   └── StatusBar.jsx       # Connection status bar
│
├── hooks/
│   └── useJanPath.js       # Main polling hook
│
├── constants/
│   └── config.js           # Configuration constants
│
├── App.jsx                 # Root component
└── index.js                # Entry point
```

### Configuration

Edit `src/constants/config.js` to modify:

- API base URL
- Polling interval
- Ambulance ID
- ETA thresholds
- Map settings
- Junction coordinates

### API Integration

The frontend integrates with these FastAPI endpoints:

1. **POST /ambulance/update** (one-time initialization)
   - Sends ambulance position and route on app load

2. **GET /priority-junction/AMB001** (polling every 3 seconds)
   - Fetches current junction status and control data

### Key Features

#### Crash Resistance
- Optional chaining for all nested data access
- Fallback values for missing data
- Try/catch on all API calls
- Preserved state on connection failures

#### Connection Management
- Automatic retry on failures
- Visual connection status indicator
- Standby mode when no active emergency
- Error recovery without page reload

#### Map Stability
- Fixed ambulance marker (no animation flicker)
- Smooth junction marker updates
- Conditional route polyline rendering
- Dark theme optimized tiles

#### Dashboard Intelligence
- ETA color coding (red < 30s, yellow 30-60s, green > 60s)
- Selected lane highlighting
- High urgency visual indicators
- Signal action parsing and badge display

### Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

### Notes

- Backend must be running before starting frontend
- Ambulance position is FIXED at [13.0827, 80.2707]
- Map does not animate ambulance movement
- Only junction status updates dynamically
- No mock data - requires live backend

### Troubleshooting

**Map not loading:**
- Check Leaflet CSS is imported in index.html
- Verify internet connection for tile loading

**API connection errors:**
- Ensure backend is running on port 8000
- Check CORS configuration on backend
- Verify API_BASE_URL in config.js

**Polling not working:**
- Check browser console for errors
- Verify ambulance initialization POST succeeded
- Check network tab for failed requests

### License

Final Year Engineering Project
