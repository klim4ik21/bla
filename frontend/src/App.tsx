import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { LogsPage } from './pages/LogsPage';
import { DebugPanel } from './components/DebugPanel';

/**
 * Main application component with routing.
 * 
 * Routes:
 * - / - Home page (create room)
 * - /r/:roomId - Room page (video call)
 * - /logs - Debug logs viewer
 */
function App() {
  return (
    <div className="min-h-screen grid-pattern">
      {/* Main content */}
      <main className="relative">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/r/:roomId" element={<RoomPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>

      {/* Debug panel - always visible */}
      <DebugPanel />
    </div>
  );
}

export default App;
