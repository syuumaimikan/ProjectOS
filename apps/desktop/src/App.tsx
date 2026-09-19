import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './App.css';

interface DiscoveryCandidate {
  suggested_root: string;
  project_type: string;
  languages: string[];
  package_managers: string[];
  source_controls: string[];
  confidence: string;
  evidence: string[];
}

function App() {
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected) {
        setScanning(true);
        const result = await invoke<DiscoveryCandidate[]>('scan_directory', { 
          path: selected 
        });
        setCandidates(result);
        setScanning(false);
      }
    } catch (err) {
      console.error("Scan failed", err);
      setScanning(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800 font-bold tracking-widest text-sm text-neutral-400">
          PROJECTOS
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 mb-2 uppercase">Library</div>
          <button className="w-full text-left px-3 py-2 rounded text-neutral-400 hover:bg-neutral-800/50 text-sm">
            All Projects
          </button>
          
          <div className="text-xs font-semibold text-neutral-500 mt-6 mb-2 uppercase">Discovery</div>
          <button className="w-full text-left px-3 py-2 rounded bg-neutral-800 text-neutral-100 text-sm flex justify-between">
            Inbox
            {candidates.length > 0 && (
              <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-xs">{candidates.length}</span>
            )}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center px-6 justify-between">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 w-96 text-sm">
            <span className="text-neutral-500 mr-2">🔍</span>
            <input 
              type="text" 
              placeholder="Search projects, files, commands... (Ctrl+K)" 
              className="bg-transparent border-none outline-none w-full text-neutral-200 placeholder-neutral-600"
            />
          </div>
        </header>

        {/* Project Grid */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Discovery Inbox</h1>
            <button 
              onClick={handleScan}
              disabled={scanning}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              {scanning ? 'Scanning...' : '+ Scan Folder'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {candidates.length === 0 && !scanning && (
              <div className="col-span-full text-center py-12 text-neutral-500">
                No projects in inbox. Click "Scan Folder" to discover projects.
              </div>
            )}
            
            {candidates.map((c, i) => (
              <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-lg p-5 flex flex-col hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded bg-blue-900/30 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                    {c.project_type.substring(0, 2)}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>{c.confidence}</span>
                  </div>
                </div>
                <h3 className="font-bold text-neutral-100 mb-1 truncate" title={c.suggested_root}>
                  {c.suggested_root.split(/[\\/]/).pop()}
                </h3>
                <p className="text-xs text-neutral-500 mb-4 truncate" title={c.suggested_root}>
                  {c.suggested_root}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 text-xs">
                  <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-400">{c.project_type}</span>
                  {c.source_controls.includes('Git') && (
                    <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-400">Git</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
