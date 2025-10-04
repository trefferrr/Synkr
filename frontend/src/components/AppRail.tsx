import { LogOut, UserCircle, Star, EyeOff } from "lucide-react";
import React from "react";

interface AppRailProps{
  onProfile?: () => void;
  onLogout: () => void;
  activeFilter?: 'all'|'favourites'|'hidden';
  setActiveFilter?: (f: 'all'|'favourites'|'hidden') => void;
}

const AppRail: React.FC<AppRailProps> = ({ onProfile, onLogout, activeFilter='all', setActiveFilter }) => {
  return (
    <aside className="flex fixed top-0 left-0 h-screen w-16 bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-800 flex-col items-center justify-between py-4 z-30">
      <div className="px-2 text-center" />

      {/* Filters */}
      <div className="flex-1 flex flex-col items-center gap-3 mt-4">
        <button
          onClick={() => setActiveFilter && setActiveFilter('all')}
          title="All"
          className={`p-2.5 rounded-lg border ${activeFilter==='all' ? 'bg-gray-800 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
        >
          <span className="text-xs">All</span>
        </button>
        <button
          onClick={() => setActiveFilter && setActiveFilter('favourites')}
          title="Favourites"
          className={`p-2.5 rounded-lg border ${activeFilter==='favourites' ? 'bg-gray-800 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveFilter && setActiveFilter('hidden')}
          title="Hidden"
          className={`p-2.5 rounded-lg border ${activeFilter==='hidden' ? 'bg-gray-800 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 pb-2">
        <button
          onClick={onProfile}
          title="Profile"
          className="p-2.5 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200"
          aria-label="Profile"
        >
          <UserCircle className="w-5 h-5" />
        </button>
        <button
          onClick={onLogout}
          title="Logout"
          className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

export default AppRail;


