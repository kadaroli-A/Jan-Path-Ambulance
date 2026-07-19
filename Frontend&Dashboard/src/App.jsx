import React from 'react';
import StatusBar from './components/StatusBar';
import Dashboard from './components/Dashboard';
import { useJanPath } from './hooks/useJanPath';

function App() {
  const { junctionData, loading, error, connectionStatus } = useJanPath();

  return (
    <div className="app-container">
      <StatusBar 
        connectionStatus={connectionStatus} 
        junctionData={junctionData}
      />
      <main className="main-content">
        <Dashboard 
          junctionData={junctionData}
          loading={loading}
          connectionStatus={connectionStatus}
        />
      </main>
    </div>
  );
}

export default App;
