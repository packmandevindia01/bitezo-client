import React, { useState } from 'react';
import { ChevronLeft, LayoutGrid, Users, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/common';

import { useDineIn } from '../hooks/useDineIn';
import { Loader } from '../../../../components/common';

export const DineInSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    sections, 
    tables, 
    selectedSectionId, 
    setSelectedSectionId, 
    loading 
  } = useDineIn();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.tableName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;

  const handleBack = () => {
    navigate('/pos', { state: { openMoreModal: true } });
  };

  const handleTableSelect = (_tableId: number) => {

    // Here you would typically dispatch an action to set the table in the order state
    navigate('/pos');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcf9fb] to-[#f4eff2] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hover:text-[#49293e]"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-[#49293e] uppercase tracking-tight">
              Select Table
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Dine-In Order Assignment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleBack} className="px-6">
            Cancel
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Area - Table Grid */}
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {(['all', 'available', 'occupied'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`
                      px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all
                      ${statusFilter === status 
                        ? 'bg-white text-[#49293e] shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                      }
                    `}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="relative group min-w-[300px]">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#49293e] transition-colors" />
                <input
                  type="text"
                  placeholder="SEARCH TABLE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-[#49293e] placeholder:text-slate-300 focus:outline-none focus:border-[#49293e] transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-3xl border-2 border-slate-50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <LayoutGrid size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tables</p>
                  <p className="text-xl font-black text-[#49293e]">{tables.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border-2 border-slate-50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available</p>
                  <p className="text-xl font-black text-[#49293e]">{availableCount}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border-2 border-slate-50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Occupied</p>
                  <p className="text-xl font-black text-[#49293e]">{occupiedCount}</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader text="Fetching tables..." />
              </div>
            ) : filteredTables.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                {filteredTables.map(table => (
                  <button
                    key={table.tableId}
                    onClick={() => handleTableSelect(table.tableId)}
                    className={`
                      relative group flex flex-col items-center justify-center aspect-square rounded-[2rem] border-2 transition-all duration-500
                      ${table.status === 'occupied' 
                        ? 'bg-white/40 border-amber-100/50 cursor-not-allowed opacity-60' 
                        : 'bg-white border-white/60 hover:border-[#49293e] hover:shadow-[0_20px_50px_rgba(73,41,62,0.15)] hover:-translate-y-2 active:scale-95 shadow-sm backdrop-blur-sm'
                      }
                    `}
                    disabled={table.status === 'occupied'}
                  >
                    <div className={`
                      p-4 rounded-2xl mb-2 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3
                      ${table.status === 'occupied' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400 group-hover:bg-[#49293e] group-hover:text-white'}
                    `}>
                      <LayoutGrid size={28} />
                    </div>
                    <span className="text-xl font-black text-[#49293e] tracking-tighter group-hover:scale-110 transition-transform">{table.tableName}</span>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100 transition-opacity">
                      <Users size={12} className="opacity-50" />
                      <span>{table.capacity} SEATS</span>
                    </div>
                    
                    {table.status === 'occupied' && (
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/30">
                        <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                        Occupied
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Search size={64} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">No tables found matching your filters</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Sections */}
        <aside className="w-80 bg-white/70 backdrop-blur-xl border-l border-white/40 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.05)] z-20">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-[11px] font-black text-[#49293e]/40 uppercase tracking-[0.3em]">Floor Sections</h2>
          </div>
          <nav className="flex-1 overflow-auto p-6 space-y-4">
            {sections.map(section => (
              <button
                key={section.sectionId}
                onClick={() => setSelectedSectionId(section.sectionId)}
                className={`
                  w-full flex items-center justify-between p-6 rounded-[2rem] transition-all duration-500 text-left group relative overflow-hidden
                  ${selectedSectionId === section.sectionId 
                    ? 'bg-[#49293e] text-white shadow-2xl shadow-[#49293e]/30 -translate-y-1' 
                    : 'bg-white/50 text-slate-600 hover:bg-white hover:shadow-xl border border-white/60'
                  }
                `}
              >
                {selectedSectionId === section.sectionId && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                )}
                <div className="flex flex-col relative z-10">
                  <span className={`text-[13px] font-black uppercase tracking-[0.15em] ${selectedSectionId === section.sectionId ? 'text-white' : 'text-[#49293e]'}`}>
                    {section.sectionName}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1 h-1 rounded-full ${selectedSectionId === section.sectionId ? 'bg-white/40' : 'bg-slate-300'}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedSectionId === section.sectionId ? 'text-white/50' : 'text-slate-400'}`}>
                      {selectedSectionId === section.sectionId ? `${tables.length} Units` : 'Select to view'}
                    </span>
                  </div>
                </div>
                <div className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10
                  ${selectedSectionId === section.sectionId ? 'bg-white/20 rotate-12' : 'bg-slate-100 text-slate-400 group-hover:bg-[#49293e]/10 group-hover:text-[#49293e] group-hover:-rotate-12'}
                `}>
                  <LayoutGrid size={20} />
                </div>
              </button>
            ))}
          </nav>
          <div className="p-8 bg-slate-50/50 border-t border-slate-100">
            <div className="p-4 bg-white/60 rounded-2xl border border-white/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center leading-relaxed italic">
                Real-time sync active
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DineInSelectionPage;
