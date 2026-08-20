import React, { useState, useEffect } from 'react';
import { Search, X, Users, CreditCard, Calendar, Megaphone, FileText, ChevronRight, CheckSquare } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, setActiveView } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.globalSearch(query);
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isSearchOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'Lead':
      case 'Customer':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'Deal':
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      case 'Invoice':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'Appointment':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, deals, contacts, invoices, appointments..."
            autoFocus
            className="flex-1 text-xs bg-transparent outline-hidden text-slate-800 placeholder-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors border border-slate-200"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {isSearching ? (
            <div className="p-8 text-center text-xs text-slate-400">Searching Nexus database...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setIsSearchOpen(false);
                    const viewTarget = item.path.replace('/', '');
                    setActiveView(viewTarget || 'dashboard');
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-md group-hover:bg-white group-hover:shadow-2xs transition-all">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-xs text-slate-400">No matching business records found.</div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Type to search across CRM, Invoices, Deals, Campaigns, and Appointments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
