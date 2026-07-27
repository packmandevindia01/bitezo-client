import React, { useState, useCallback } from 'react';
import { ChevronLeft, LayoutGrid, Search, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/common';
import { useAppDispatch } from '../../../../app/hooks';
import { setSectionId, setTableId, setTableNo, setGuestNo, clearCart, setOrderTypeByName } from '../store/posSlice';
import { useDineIn } from '../hooks/useDineIn';
import { Loader } from '../../../../components/common';
import { GuestCountModal } from '../components/modals/dining/GuestCountModal';
import { DineInTableOrdersModal } from '../components/modals/dining/DineInTableOrdersModal';
import type { DineInTable } from '../../types';

/* ─────────────────────────── helpers ─────────────────────────────────── */

function buildGrid(tables: DineInTable[]): { sparse: boolean; cells: Array<DineInTable | null> } {
  const positions = tables.map(t => t.position);
  const uniquePositions = new Set(positions);
  const positionsAreUnique = uniquePositions.size === tables.length && !positions.every(p => p === positions[0]);

  if (!positionsAreUnique) {
    return { sparse: false, cells: tables };
  }

  const maxPos = positions.reduce((m, p) => Math.max(m, p), 0);
  const totalSlots = Math.max(25, maxPos);
  const byPos = new Map<number, DineInTable>();
  const unplaced: DineInTable[] = [];

  tables.forEach(t => {
    if (t.position > 0 && !byPos.has(t.position)) byPos.set(t.position, t);
    else unplaced.push(t);
  });

  const cells: Array<DineInTable | null> = Array.from({ length: totalSlots }, (_, i) => byPos.get(i + 1) ?? null);
  unplaced.forEach(t => cells.push(t));
  return { sparse: true, cells };
}

function formatOrderTime(dateStr: string): string | null {
  if (!dateStr || dateStr.startsWith('0001')) return null;
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return null; }
}

/* ─────────────────────────── component ─────────────────────────────────── */

export const DineInSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sections, tables, selectedSectionId, setSelectedSectionId, loading } = useDineIn();

  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');

  // Modal state
  const [guestTable, setGuestTable] = useState<DineInTable | null>(null);
  const [ordersTable, setOrdersTable] = useState<DineInTable | null>(null);

  /* derived */
  const filteredTables = tables.filter(table => {
    return statusFilter === 'all' || table.status === statusFilter;
  });

  const isFiltered = statusFilter !== 'all';
  const { sparse, cells } = buildGrid(tables);

  /* ── event handlers ── */
  const handleBack = () => navigate('/pos');

  const handleTableClick = useCallback((table: DineInTable) => {
    if (table.isUsed) {
      // Occupied: show table orders
      setOrdersTable(table);
    } else {
      // Available: ask for guest count
      setGuestTable(table);
    }
  }, []);

  const handleSectionSelect = (id: number) => {
    setSelectedSectionId(id);
    dispatch(setSectionId(id));
  };

  /* Guest count confirmed → go to terminal */
  const handleGuestConfirm = (guestCount: number) => {
    if (!guestTable) return;
    dispatch(clearCart());
    dispatch(setSectionId(selectedSectionId ?? 0));
    dispatch(setTableId(guestTable.tableId));
    dispatch(setTableNo(guestTable.tableName || guestTable.tableId.toString()));
    dispatch(setGuestNo(guestCount));
    dispatch(setOrderTypeByName('DineIn'));
    setGuestTable(null);
    navigate('/pos');
  };

  /* ── Table card ── */
  const TableCard = ({ table }: { table: DineInTable }) => {
    const isOccupied = table.isUsed;
    const orderTime = isOccupied ? formatOrderTime(table.orderDate) : null;

    return (
      <button
        onClick={() => handleTableClick(table)}
        tabIndex={-1}
        title={isOccupied
          ? `Occupied by ${table.employeeName ?? 'Staff'}${orderTime ? ` · ${orderTime}` : ''}`
          : `Select ${table.tableName}`}
        className={[
          'relative group flex flex-col items-center justify-center w-full aspect-square rounded-2xl border-2 transition-all duration-300 select-none overflow-hidden',
          isOccupied
            ? 'bg-amber-50 border-amber-300/70 hover:border-amber-400 hover:shadow-[0_8px_30px_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer'
            : 'bg-white border-slate-100 hover:border-[#49293e] hover:shadow-[0_8px_30px_rgba(73,41,62,0.20)] hover:-translate-y-1 active:scale-95 shadow-sm cursor-pointer',
        ].join(' ')}
      >
        {isOccupied && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-amber-200/20 pointer-events-none" />
        )}

        {/* icon */}
        <div className={[
          'w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all duration-300',
          isOccupied
            ? 'bg-amber-200/60 text-amber-700'
            : 'bg-slate-50 text-slate-400 group-hover:bg-[#49293e] group-hover:text-white',
        ].join(' ')}>
          <LayoutGrid size={20} />
        </div>

        {/* table name */}
        <span className={[
          'text-[14px] font-black tracking-tight leading-tight text-center px-1 break-words max-w-full',
          isOccupied ? 'text-amber-900' : 'text-[#49293e]',
        ].join(' ')}>
          {table.tableName}
        </span>

        {/* occupied meta */}
        {isOccupied && (
          <div className="flex flex-col items-center gap-0.5 mt-1.5 z-10">
            {table.employeeName && (
              <div className="flex items-center gap-1 text-[8px] font-bold text-amber-700 uppercase tracking-wider">
                <User size={8} />
                <span className="truncate max-w-[70px]">{table.employeeName}</span>
              </div>
            )}
            {orderTime && (
              <div className="flex items-center gap-1 text-[8px] font-bold text-amber-600 uppercase tracking-wider">
                <Clock size={8} />
                <span>{orderTime}</span>
              </div>
            )}
          </div>
        )}

        {/* occupied badge */}
        {isOccupied && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black uppercase tracking-widest rounded-full shadow-sm">
            <span className="w-1 h-1 bg-white rounded-full animate-ping" />
            Busy
          </span>
        )}

        {/* available hover ring */}
        {!isOccupied && (
          <div className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-[#49293e]/20 transition-all duration-300 pointer-events-none" />
        )}
      </button>
    );
  };

  const EmptySlot = () => (
    <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30" />
  );

  const gridClass = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcf9fb] to-[#f4eff2] flex flex-col font-sans">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hover:text-[#49293e]">
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#49293e] uppercase tracking-tight leading-none">Select Table</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dine-In Order Assignment</p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleBack} className="px-5" tabIndex={-1}>Cancel</Button>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Main floor-plan ── */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4">

            {/* Filters */}
            <div className="flex justify-start">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {(['all', 'available', 'occupied'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} tabIndex={-1}
                    className={['px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all', statusFilter === s ? 'bg-white text-[#49293e] shadow-sm' : 'text-slate-400 hover:text-slate-600'].join(' ')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            {!isFiltered && !loading && tables.length > 0 && (
              <div className="flex items-center gap-5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border-2 border-slate-200 shadow-sm inline-block" />Available — tap to order</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-300 inline-block" />Occupied — tap to manage</span>
                {sparse && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-50 border-2 border-dashed border-slate-200 inline-block" />Empty slot</span>}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader text="Loading floor plan…" /></div>
            ) : isFiltered ? (
              filteredTables.length > 0 ? (
                <div className={gridClass}>{filteredTables.map(t => <TableCard key={t.tableId} table={t} />)}</div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <Search size={56} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-sm font-black uppercase tracking-[0.2em]">No tables match your filter</p>
                </div>
              )
            ) : tables.length > 0 ? (
              <div className={gridClass}>
                {cells.map((cell, idx) => cell ? <TableCard key={cell.tableId} table={cell} /> : <EmptySlot key={`e-${idx}`} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <LayoutGrid size={56} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">No tables in this section</p>
              </div>
            )}
          </div>
        </main>

        {/* ── Section sidebar ── */}
        <aside className="w-60 xl:w-64 bg-white/70 backdrop-blur-xl border-l border-white/40 flex flex-col shadow-[-4px_0_30px_rgba(0,0,0,0.04)] z-20">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-[9px] font-black text-[#49293e]/40 uppercase tracking-[0.3em]">Floor Sections</h2>
          </div>
          <nav className="flex-1 overflow-auto p-3 space-y-2">
            {sections.map(section => {
              const isSelected = selectedSectionId === section.sectionId;
              return (
                <button key={section.sectionId} onClick={() => handleSectionSelect(section.sectionId)} tabIndex={-1}
                  className={['w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 text-left group relative overflow-hidden', isSelected ? 'bg-[#49293e] text-white shadow-xl shadow-[#49293e]/25 -translate-y-0.5' : 'bg-white/50 text-slate-600 hover:bg-white hover:shadow-md border border-white/60'].join(' ')}>
                  {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}
                  <div className="flex flex-col relative z-10 min-w-0">
                    <span className={`text-[11px] font-black uppercase tracking-[0.12em] truncate ${isSelected ? 'text-white' : 'text-[#49293e]'}`}>{section.sectionName}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                      {isSelected ? `${tables.length} tables` : 'tap to view'}
                    </span>
                  </div>
                  <div className={['w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 relative z-10 shrink-0', isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-400 group-hover:bg-[#49293e]/10 group-hover:text-[#49293e]'].join(' ')}>
                    <LayoutGrid size={14} />
                  </div>
                </button>
              );
            })}
          </nav>
          <div className="px-3 pb-3">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">Real-time sync active</p>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Guest Count Modal (available table selected) ── */}
      <GuestCountModal
        isOpen={guestTable !== null}
        tableName={guestTable?.tableName ?? ''}
        tableCapacity={guestTable?.capacity ?? 0}
        onConfirm={handleGuestConfirm}
        onClose={() => setGuestTable(null)}
      />

      {/* ── Table Orders Modal (occupied table selected) ── */}
      <DineInTableOrdersModal
        isOpen={ordersTable !== null}
        table={ordersTable}
        sectionId={selectedSectionId ?? 0}
        onClose={() => setOrdersTable(null)}
        onEditSuccess={() => setOrdersTable(null)}
        onSettleSuccess={() => setOrdersTable(null)}
      />
    </div>
  );
};

export default DineInSelectionPage;
