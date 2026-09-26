import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  List as ListIcon,
  Columns as KanbanIcon,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';

export default function MoveHistory() {
  const [moves, setMoves] = useState([]);
  const [kanbanData, setKanbanData] = useState(null);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMoves = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (view === 'kanban') params.view = 'kanban';
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/ledger', { params });
      const unwrapped = unwrap(res);

      if (view === 'kanban') {
        setKanbanData(unwrapped);
        setMoves(unwrapped.data || []);
      } else {
        setMoves(unwrapped || []);
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMoves();
  }, [view]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadMoves();
  };

  return (
    <div className="move-history-page" id="move-history-container">
      {/* Header Row */}
      <div className="wf-page-header">
        <div>
          <h1 className="wf-view-title">Move History</h1>
          <p className="page-subtitle">Double-entry audit trail tracking all In/Out/Internal warehouse stock movements.</p>
        </div>

        <div className="wf-header-right">
          <form className="wf-search-box" onSubmit={handleSearch}>
            <Search size={16} className="wf-search-icon" />
            <input
              id="moves-search-input"
              type="text"
              placeholder="Search reference, contact, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          {/* View Toggles */}
          <div className="wf-view-toggles">
            <button
              id="moves-toggle-list"
              className={`wf-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List View"
            >
              <ListIcon size={18} />
            </button>
            <button
              id="moves-toggle-kanban"
              className={`wf-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
              title="Kanban View"
            >
              <KanbanIcon size={18} />
            </button>
          </div>

          <button className="btn btn-secondary" onClick={loadMoves} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* VIEW: List View */}
      {view === 'list' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="wf-table" id="move-history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Reference</th>
                  <th>Product</th>
                  <th>Contact</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Quantity Delta</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-muted">
                      <RefreshCw size={18} className="spin inline-block mr-2" /> Loading move history…
                    </td>
                  </tr>
                ) : moves.length > 0 ? (
                  moves.map((m) => {
                    const isPositive = m.quantityDelta > 0;
                    const isZero = m.quantityDelta === 0;
                    return (
                      <tr key={m._id} id={`move-row-${m._id}`}>
                        <td>
                          <span className="text-xs text-muted">
                            {m.timestamp ? new Date(m.timestamp).toLocaleString() : '—'}
                          </span>
                        </td>
                        <td>
                          <b className="font-mono text-cyan">{m.referenceNumber}</b>
                        </td>
                        <td>
                          <b>{m.productName}</b>
                          <code className="text-xs text-muted block">{m.sku}</code>
                        </td>
                        <td>
                          <span className="text-secondary">{m.contact || '—'}</span>
                        </td>
                        <td>
                          <span className="text-muted text-xs">
                            {m.sourceWarehouse} / {m.sourceLocation}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted text-xs">
                            {m.destinationWarehouse} / {m.destinationLocation}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`font-mono font-bold px-2 py-1 rounded ${
                              isZero
                                ? 'text-indigo bg-indigo-950/40'
                                : isPositive
                                ? 'text-emerald bg-emerald-950/40'
                                : 'text-rose bg-rose-950/40'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {m.quantityDelta} {m.uom}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill status-${String(m.status || 'done').toLowerCase()}`}>
                            {m.status || 'Done'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted">
                      No stock movement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Kanban View */}
      {view === 'kanban' && (
        <div className="kanban-board" id="move-history-kanban-board">
          {['IN', 'OUT', 'INTERNAL', 'ADJUSTMENT'].map((type) => {
            const cards =
              kanbanData?.columns?.[type] ||
              moves.filter((m) => (m.direction ? m.direction === type : m.transactionType?.toUpperCase().includes(type)));
            return (
              <div className="kanban-col" key={type} id={`kanban-move-col-${type.toLowerCase()}`}>
                <div className="kanban-col-header">
                  <div className="kanban-col-title">
                    <span
                      className={`status-indicator ${
                        type === 'IN' ? 'status-done' : type === 'OUT' ? 'status-canceled' : 'status-ready'
                      }`}
                    />
                    <b>{type} Moves</b>
                  </div>
                  <span className="kanban-badge">{cards.length}</span>
                </div>

                <div className="kanban-cards-stack">
                  {cards.map((card) => {
                    const isPositive = card.quantityDelta > 0;
                    return (
                      <div className="kanban-card" key={card._id}>
                        <div className="kanban-card-top">
                          <code className="text-cyan font-bold">{card.referenceNumber}</code>
                          <span
                            className={`font-mono font-bold text-xs ${
                              isPositive ? 'text-emerald' : card.quantityDelta === 0 ? 'text-indigo' : 'text-rose'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {card.quantityDelta} {card.uom}
                          </span>
                        </div>
                        <div className="kanban-card-contact">
                          <b>{card.productName}</b>
                          <small className="text-muted block">{card.contact || 'Azure Interior'}</small>
                        </div>
                        <div className="kanban-route">
                          <span>{card.sourceLocation || 'Dock'}</span>
                          <ArrowRight size={13} className="text-muted" />
                          <span>{card.destinationLocation || 'Stock'}</span>
                        </div>
                        <div className="kanban-card-footer">
                          <small className="text-muted">
                            {card.timestamp ? new Date(card.timestamp).toLocaleDateString() : ''}
                          </small>
                          <span className={`status-pill status-${String(card.status || 'done').toLowerCase()}`}>
                            {card.status || 'Done'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && <div className="kanban-empty">No moves</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
