import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  FolderSearch, Folder, Library, Inbox, Settings, 
  Terminal, Play, Clock, Box, Plus, Search, GitBranch, Archive, Loader2, X
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
  // Ephemeral states populated by frontend
  gitStatus?: GitStatus;
  activeTaskId?: string;
}

interface GitCommit {
  hash: string;
  message: string;
  author_name: string;
  author_email: string;
  timestamp: number;
}

interface GitStatus {
  current_branch: string;
  is_dirty: boolean;
  uncommitted_files: number;
  head_commit?: GitCommit;
}

interface SearchResult {
  project_id: string;
  path: string;
  title: string;
  snippet: string;
  score: number;
}

interface TaskConfig {
  project_id: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  working_dir: string;
}

type View = 'library' | 'inbox';

function App() {
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scanning, setScanning] = useState(false);
  const [view, setView] = useState<View>('library');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    try {
      const p = await invoke<Project[]>('get_projects');
      setProjects(p);
      
      // Lazily load Git status for each project
      p.forEach(async () => {
        // Find the root path (we don't store it explicitly in Project struct in Rust yet, 
        // wait, we do store `root_path` or `name` might be the path if name is default. 
        // Actually, without the real root_path in the DB, we might fail. 
        // We will mock this or assume name is a valid directory name, 
        // but for now, we'll try to invoke git status using the project name/path if possible.
        // If it fails, we ignore it.
      });
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
      setCandidates(candidates.filter(c => c !== candidate));
      loadProjects();
    } catch (err) {
      console.error("Failed to import project", err);
    }
  };

  const handleSpawnTask = async (projectId: string, workingDir: string) => {
    try {
      // Mock command for demonstration (e.g. run a quick echo or npm install)
      const config: TaskConfig = {
        project_id: projectId,
        command: "cmd", // Windows specific for testing
        args: ["/c", "echo", "ProjectOS Task Runner Initialized"],
        env: {},
        working_dir: workingDir || "."
      };
      const taskId = await invoke<string>('spawn_task', { config });
      console.log("Spawned task:", taskId);
      
      // Update UI to show running state
      setProjects(prev => prev.map(p => 
        p.id["0"] === projectId ? { ...p, activeTaskId: taskId } : p
      ));
      
      // Simulate task completion after 2 seconds for UI UX
      setTimeout(() => {
        setProjects(prev => prev.map(p => 
          p.id["0"] === projectId ? { ...p, activeTaskId: undefined } : p
        ));
      }, 2000);

    } catch (err) {
      console.error("Failed to spawn task", err);
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      setIsSearching(true);
      try {
        const res = await invoke<SearchResult[]>('search_docs', { query: searchQuery });
        setSearchResults(res);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleCreateSnapshot = async (projectId: string, sourcePath: string) => {
    try {
      const snap = await invoke('create_snapshot', {
        projectIdStr: projectId,
        sourcePath: sourcePath,
        description: "Manual Backup"
      });
      console.log("Created snapshot:", snap);
      alert("Snapshot created successfully!");
    } catch (err) {
      console.error("Failed to create snapshot", err);
      alert("Snapshot creation failed.");
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col z-20">
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
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center px-6 justify-between bg-neutral-900/50 backdrop-blur-sm relative z-30">
          <div className="relative">
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 w-[400px] text-sm focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-neutral-500 mr-2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search Tantivy index... (Enter to search)" 
                className="bg-transparent border-none outline-none w-full text-neutral-200 placeholder-neutral-600"
              />
              {isSearching && <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2" />}
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-12 left-0 w-[500px] max-h-96 overflow-y-auto bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl z-50 p-2 space-y-2">
                <div className="flex justify-between items-center px-2 pb-2 border-b border-neutral-700 mb-2">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Search Results</span>
                  <button onClick={() => setSearchResults([])} className="text-neutral-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {searchResults.map((res, i) => (
                  <div key={i} className="p-2 hover:bg-neutral-700/50 rounded cursor-pointer transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-blue-400">{res.title}</span>
                      <span className="text-[10px] text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{res.path}</span>
                    </div>
                    <div className="text-xs text-neutral-300 line-clamp-2" dangerouslySetInnerHTML={{ __html: res.snippet }}></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-2 border border-neutral-700"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderSearch className="w-4 h-4" />}
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
                    <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col hover:border-neutral-700 hover:shadow-lg hover:shadow-black/20 transition-all group relative overflow-hidden">
                      {/* Decorative gradient */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-blue-400 font-bold text-lg border border-neutral-700 shadow-inner">
                          {p.name.substring(0, 2).toUpperCase()}
                        </div>
                        {/* Git Status Badge Placeholder */}
                        <div className="flex items-center text-[10px] text-neutral-400 bg-neutral-800 px-2 py-1 rounded-full border border-neutral-700">
                          <GitBranch className="w-3 h-3 mr-1 text-green-500" />
                          main
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-neutral-100 mb-1 group-hover:text-blue-400 transition-colors truncate">
                        {p.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mb-6 line-clamp-2 min-h-[32px]">
                        {p.description || "Project ready. Press Resume to spawn tasks."}
                      </p>
                      
                      {/* Actions */}
                      <div className="mt-auto pt-4 border-t border-neutral-800/50 grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => handleSpawnTask(p.id["0"], p.name)}
                          disabled={!!p.activeTaskId}
                          className={`col-span-2 flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 border ${
                            p.activeTaskId 
                              ? 'bg-neutral-800 text-green-400 border-neutral-700' 
                              : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border-blue-600/20'
                          }`}
                        >
                          {p.activeTaskId ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </>
                          )}
                        </button>
                        
                        <div className="col-span-1 flex space-x-1">
                          <button 
                            onClick={() => handleCreateSnapshot(p.id["0"], p.name)}
                            title="Create Snapshot"
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center rounded transition-colors border border-neutral-700"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            title="Terminal Output"
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center rounded transition-colors border border-neutral-700"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'inbox' && (
            <>
              {/* Inbox code remains similar but polished */}
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
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col hover:border-neutral-700 transition-colors">
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
