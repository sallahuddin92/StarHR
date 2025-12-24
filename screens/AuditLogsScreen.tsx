import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  User,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  performed_by_name: string;
  performed_by_id: string;
  target_employee_name: string | null;
  target_employee_id: string | null;
  request_id: string | null;
  leave_type: string | null;
  notes: string | null;
  created_at: string;
}

interface AuditLogsScreenProps {
  onNavigate: (screen: any) => void;
}

const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      let url = '/api/leave/admin/audit-logs?limit=200';
      if (dateFrom) url += `&from=${dateFrom}`;
      if (dateTo) url += `&to=${dateTo}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setLogs(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Get unique actions
  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))];

  // Filter logs
  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.performed_by_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.target_employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-emerald-100 text-emerald-700',
      REJECTED: 'bg-red-100 text-red-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-slate-100 text-slate-600',
      OVERRIDE: 'bg-purple-100 text-purple-700',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[action] || 'bg-slate-100 text-slate-600'}`}
      >
        {action}
      </span>
    );
  };

  const exportCSV = () => {
    const headers = [
      'Date/Time',
      'Action',
      'Performed By',
      'Target Employee',
      'Leave Type',
      'Notes',
    ];
    const rows = filteredLogs.map(l => [
      formatDateTime(l.created_at),
      l.action,
      l.performed_by_name,
      l.target_employee_name || '',
      l.leave_type || '',
      l.notes || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 bg-[#fafaf8] dark:bg-[#0f0f08] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <ClipboardList className="text-slate-600 dark:text-slate-400" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Audit & Compliance Logs
            </h1>
            <p className="text-sm text-[#8c8b5f]">
              Track all leave approvals, rejections, and admin actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a190b] border border-[#e6e6db] dark:border-[#3a392a] rounded-lg hover:bg-gray-50"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a190b] border border-[#e6e6db] dark:border-[#3a392a] rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b5f]"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name, notes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
              />
            </div>
          </div>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="px-4 py-2.5 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
          >
            <option value="ALL">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8c8b5f]">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8c8b5f]">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{logs.length}</p>
          <p className="text-xs text-[#8c8b5f]">Total Records</p>
        </div>
        <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4">
          <p className="text-2xl font-bold text-emerald-600">
            {logs.filter(l => l.action === 'APPROVED').length}
          </p>
          <p className="text-xs text-[#8c8b5f]">Approved</p>
        </div>
        <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4">
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.action === 'REJECTED').length}
          </p>
          <p className="text-xs text-[#8c8b5f]">Rejected</p>
        </div>
        <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-2xl font-bold text-purple-600">
            {logs.filter(l => l.notes?.includes('OVERRIDE')).length}
          </p>
          <p className="text-xs text-purple-500">HR Overrides</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b border-[#e6e6db] dark:border-[#3a392a]">
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Date/Time
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Action
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Performed By
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Target Employee
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Leave Type
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a392a]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#8c8b5f]">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  Loading audit logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#8c8b5f]">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.slice(0, 100).map(log => (
                <tr
                  key={log.id}
                  className={`hover:bg-[#f8f8f5] dark:hover:bg-[#1a1909] transition-colors ${log.notes?.includes('OVERRIDE') ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                >
                  <td className="py-4 px-6 text-sm font-mono">{formatDateTime(log.created_at)}</td>
                  <td className="py-4 px-6">{getActionBadge(log.action)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User className="text-blue-600" size={14} />
                      </div>
                      <span className="font-medium">{log.performed_by_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">{log.target_employee_name || '—'}</td>
                  <td className="py-4 px-6">
                    {log.leave_type && (
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded">
                        {log.leave_type}
                      </span>
                    )}
                  </td>
                  <td
                    className="py-4 px-6 text-sm text-[#8c8b5f] max-w-[300px] truncate"
                    title={log.notes || ''}
                  >
                    {log.notes?.includes('OVERRIDE') && (
                      <span className="px-1 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded mr-1">
                        OVERRIDE
                      </span>
                    )}
                    {log.notes?.replace('[HR ADMIN OVERRIDE] ', '') || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filteredLogs.length > 100 && (
          <div className="p-4 text-center text-sm text-[#8c8b5f] border-t border-[#e6e6db] dark:border-[#3a392a]">
            Showing 100 of {filteredLogs.length} records. Use filters to narrow down.
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsScreen;
