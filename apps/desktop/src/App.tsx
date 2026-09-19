import { useState } from 'react';
import './App.css';

function App() {
  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800 font-bold tracking-widest text-sm text-neutral-400">
          PROJECTOS
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 mb-2 uppercase">Library</div>
          <button className="w-full text-left px-3 py-2 rounded bg-neutral-800 text-neutral-100 text-sm">
            All Projects
          </button>
          <button className="w-full text-left px-3 py-2 rounded text-neutral-400 hover:bg-neutral-800/50 text-sm">
            Recent
          </button>
          <button className="w-full text-left px-3 py-2 rounded text-neutral-400 hover:bg-neutral-800/50 text-sm">
            Favorites
          </button>
          
          <div className="text-xs font-semibold text-neutral-500 mt-6 mb-2 uppercase">Discovery</div>
          <button className="w-full text-left px-3 py-2 rounded text-neutral-400 hover:bg-neutral-800/50 text-sm flex justify-between">
            Inbox
            <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-xs">14</span>
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
          <div className="flex items-center space-x-4">
            <button className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded transition-colors text-neutral-300">
              Settings
            </button>
          </div>
        </header>

        {/* Project Grid */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">All Projects</h1>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              + Scan Folder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Empty State / Placeholder Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-5 flex flex-col hover:border-neutral-700 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded bg-blue-900/30 flex items-center justify-center text-blue-400">
                  <span className="font-bold">Rs</span>
                </div>
                <div className="text-xs text-neutral-500 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Local</span>
                </div>
              </div>
              <h3 className="font-bold text-neutral-100 mb-1 group-hover:text-blue-400 transition-colors">Astraea</h3>
              <p className="text-xs text-neutral-400 mb-4 line-clamp-2">High performance game server architecture with Rust and Bevy.</p>
              <div className="mt-auto flex items-center justify-between text-xs">
                <div className="flex space-x-2">
                  <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-400">Rust</span>
                  <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-400">Git</span>
                </div>
                <span className="text-neutral-500">2d ago</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
