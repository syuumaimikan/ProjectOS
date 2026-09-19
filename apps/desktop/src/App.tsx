import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  FolderSearch, Folder, Library, Inbox, Settings, 
  Terminal, Play, Clock, Box, Plus, Search
} from 'lucide-react';
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

interface Project {
  id: { "0": string }; // Uuid wrapper
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  is_archived: boolean;
}

type View = 'library' | 'inbox';

function App() {
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scanning, setScanning] = useState(false);
  const [view, setView] = useState<View>('library');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const p = await invoke<Project[]>('get_projects');
      setProjects(p);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  const handleScan = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected) {
        setScanning(true);
        setView('inbox');
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

  const handleImport = async (candidate: DiscoveryCandidate) => {
    try {
      await invoke('add_project', { candidate });
      // Remove from inbox
      setCandidates(candidates.filter(c => c !== candidate));
      // Reload projects
      loadProjects();
      // Optional: switch back to library
      // setView('library');
    } catch (err) {
      console.error("Failed to import project", err);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center space-x-2">
          <Box className="w-5 h-5 text-blue-500" />
          <span className="font-bold tracking-widest text-sm text-neutral-300">
            PROJECTOS
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Library</div>
          <button 
            onClick={() => setView('library')}
            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center space-x-3 transition-colors ${
              view === 'library' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800/50'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>All Projects</span>
          </button>
          <button className="w-full text-left px-3 py-2 rounded text-neutral-400 hover:bg-neutral-800/50 text-sm flex items-center space-x-3">
            <Clock className="w-4 h-4" />
            <span>Recent</span>
          </button>
          
          <div className="text-xs font-semibold text-neutral-500 mt-6 mb-2 uppercase tracking-wider">Discovery</div>
          <button 
            onClick={() => setView('inbox')}
            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ${
              view === 'inbox' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
            </div>
            {candidates.length > 0 && (
              <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-xs">{candidates.length}</span>
            )}
          </button>
        </div>
        
        <div className="p-4 border-t border-neutral-800">
          <button className="w-full text-left px-3 py-2 rounded text-neutral-400 hover:bg-neutral-800/50 text-sm flex items-center space-x-3">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center px-6 justify-between bg-neutral-900/50 backdrop-blur-sm z-10">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 w-96 text-sm focus-within:border-neutral-600 transition-colors">
            <Search className="w-4 h-4 text-neutral-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search projects, files, commands... (Ctrl+K)" 
              className="bg-transparent border-none outline-none w-full text-neutral-200 placeholder-neutral-600"
            />
          </div>
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-2 border border-neutral-700"
          >
            <FolderSearch className="w-4 h-4" />
            <span>{scanning ? 'Scanning...' : 'Scan Folder'}</span>
          </button>
        </header>

        {/* Dynamic Main Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          
          {view === 'library' && (
            <>
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-1">Library</h1>
                  <p className="text-neutral-500 text-sm">Your imported projects across all environments.</p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                  <Folder className="w-12 h-12 mb-4 text-neutral-700" />
                  <p className="mb-2">No projects in your library yet.</p>
                  <button onClick={handleScan} className="text-blue-500 hover:text-blue-400 text-sm font-medium">
                    Scan a directory to find projects
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {projects.map((p, i) => (
                    <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col hover:border-neutral-700 hover:shadow-lg hover:shadow-black/20 transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-blue-400 font-bold text-lg border border-neutral-700 shadow-inner">
                          {p.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <h3 className="font-bold text-neutral-100 mb-1 group-hover:text-blue-400 transition-colors truncate">
                        {p.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mb-6 line-clamp-2 min-h-[32px]">
                        {p.description || "No description provided."}
                      </p>
                      
                      {/* Actions */}
                      <div className="mt-auto pt-4 border-t border-neutral-800/50 flex items-center space-x-2">
                        <button className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-blue-600/20">
                          <Play className="w-3 h-3" />
                          <span>Resume</span>
                        </button>
                        <button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-1.5 rounded transition-colors border border-neutral-700">
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'inbox' && (
            <>
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-1">Discovery Inbox</h1>
                  <p className="text-neutral-500 text-sm">Review found projects and import them to your Library.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {candidates.length === 0 && !scanning && (
                  <div className="col-span-full text-center py-20 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                    <FolderSearch className="w-12 h-12 mb-4 text-neutral-700 mx-auto" />
                    <p className="mb-2">No projects waiting in inbox.</p>
                  </div>
                )}
                
                {candidates.map((c, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded bg-blue-900/20 flex items-center justify-center text-blue-400 font-bold text-xs uppercase border border-blue-900/30">
                        {c.project_type.substring(0, 2)}
                      </div>
                      <div className="text-xs font-medium text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700 flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.confidence === 'Exact' || c.confidence === 'Strong' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span>{c.confidence}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-neutral-100 mb-1 truncate" title={c.suggested_root}>
                      {c.suggested_root.split(/[\\/]/).pop()}
                    </h3>
                    <p className="text-xs text-neutral-500 mb-4 truncate font-mono" title={c.suggested_root}>
                      {c.suggested_root}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[10px] uppercase font-bold tracking-wider mb-6">
                      <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700/50">{c.project_type}</span>
                      {c.source_controls.includes('Git') && (
                        <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700/50">Git</span>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-neutral-800/50">
                      <button 
                        onClick={() => handleImport(c)}
                        className="w-full bg-neutral-100 hover:bg-white text-neutral-900 py-1.5 rounded text-sm font-semibold transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Import Project</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;
