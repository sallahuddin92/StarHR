import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  X,
  Eye,
  MessageSquare,
  Send,
  Filter,
} from 'lucide-react';

interface PendingRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  leave_type_name: string;
  leave_type_code: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: string;
  submitted_at: string;
  current_approver_name: string | null;
  pending_since_days: number;
}

interface EscalationsScreenProps {
  onNavigate: (screen: any) => void;
}

const EscalationsScreen: React.FC<EscalationsScreenProps> = ({ onNavigate }) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [overrideAction, setOverrideAction] = useState<'approve' | 'reject' | null>(null);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/leave/admin/all-requests?include_all=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOverride = async () => {
    if (!selectedRequest || !overrideAction || !justification.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/leave/admin/override/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: overrideAction,
          justification: justification.trim(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to override');
      }

      await fetchRequests();
      setSelectedRequest(null);
      setOverrideAction(null);
      setJustification('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch =
      r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Requests that need escalation (pending > 3 days or stuck)
  const escalationNeeded = requests.filter(r => r.status === 'PENDING' && r.pending_since_days > 3);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles['PENDING']}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-[#fafaf8] dark:bg-[#0f0f08] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Escalations & Overrides
            </h1>
            <p className="text-sm text-[#8c8b5f]">
              Handle exceptional cases and override approvals with audit trail
            </p>
          </div>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a190b] border border-[#e6e6db] dark:border-[#3a392a] rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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

      {/* Alert Banner for Escalations */}
      {escalationNeeded.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-xl flex items-center gap-4">
          <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg">
            <Clock className="text-red-600" size={24} />
          </div>
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">
              {escalationNeeded.length} request{escalationNeeded.length > 1 ? 's' : ''} pending for
              more than 3 days
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              These may require HR Admin intervention
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div
          className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4 cursor-pointer hover:ring-2 hover:ring-amber-400"
          onClick={() => setFilterStatus('PENDING')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {requests.filter(r => r.status === 'PENDING').length}
              </p>
              <p className="text-xs text-[#8c8b5f]">Pending</p>
            </div>
          </div>
        </div>
        <div
          className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4 cursor-pointer hover:ring-2 hover:ring-emerald-400"
          onClick={() => setFilterStatus('APPROVED')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {requests.filter(r => r.status === 'APPROVED').length}
              </p>
              <p className="text-xs text-[#8c8b5f]">Approved</p>
            </div>
          </div>
        </div>
        <div
          className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] p-4 cursor-pointer hover:ring-2 hover:ring-red-400"
          onClick={() => setFilterStatus('REJECTED')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {requests.filter(r => r.status === 'REJECTED').length}
              </p>
              <p className="text-xs text-[#8c8b5f]">Rejected</p>
            </div>
          </div>
        </div>
        <div
          className="bg-white dark:bg-[#1a190b] rounded-xl border border-red-200 dark:border-red-800 p-4 cursor-pointer hover:ring-2 hover:ring-red-500"
          onClick={() => setFilterStatus('PENDING')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{escalationNeeded.length}</p>
              <p className="text-xs text-red-500">Need Escalation</p>
            </div>
          </div>
        </div>
      </div>

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
                placeholder="Search by name or employee ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Request Table */}
      <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b border-[#e6e6db] dark:border-[#3a392a]">
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Employee
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Leave
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Dates
              </th>
              <th className="text-center py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Days
              </th>
              <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Approver
              </th>
              <th className="text-center py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Status
              </th>
              <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a392a]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  Loading requests...
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                  No requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.slice(0, 50).map(r => (
                <tr
                  key={r.id}
                  className={`hover:bg-[#f8f8f5] dark:hover:bg-[#1a1909] transition-colors ${r.status === 'PENDING' && r.pending_since_days > 3 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                >
                  <td className="py-4 px-6">
                    <p className="font-medium text-slate-900 dark:text-white">{r.employee_name}</p>
                    <p className="text-xs text-[#8c8b5f]">
                      {r.employee_code} • {r.department}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 text-xs font-medium rounded">
                      {r.leave_type_code}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    {formatDate(r.start_date)} - {formatDate(r.end_date)}
                  </td>
                  <td className="py-4 px-6 text-center font-bold">{r.days_requested}</td>
                  <td className="py-4 px-6 text-sm text-[#8c8b5f]">
                    {r.current_approver_name || '—'}
                    {r.pending_since_days > 3 && r.status === 'PENDING' && (
                      <span className="block text-xs text-red-500 font-medium">
                        {r.pending_since_days} days pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">{getStatusBadge(r.status)}</td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => {
                        setSelectedRequest(r);
                        setOverrideAction(null);
                        setJustification('');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                    >
                      {r.status === 'PENDING' ? 'Override' : 'View'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Override Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-[#e6e6db] dark:border-[#3a392a]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedRequest.status === 'PENDING' ? 'Override Request' : 'Request Details'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Request Details */}
              <div className="p-4 bg-[#f8f8f5] dark:bg-[#1a1909] rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#8c8b5f]">Employee</span>
                  <span className="font-medium">{selectedRequest.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#8c8b5f]">Leave Type</span>
                  <span className="font-medium">{selectedRequest.leave_type_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#8c8b5f]">Dates</span>
                  <span>
                    {formatDate(selectedRequest.start_date)} -{' '}
                    {formatDate(selectedRequest.end_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#8c8b5f]">Days</span>
                  <span className="font-bold">{selectedRequest.days_requested}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#8c8b5f]">Reason</span>
                  <span className="text-right max-w-[200px]">{selectedRequest.reason || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#8c8b5f]">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <>
                  {/* Action Selection */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOverrideAction('approve')}
                      className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${overrideAction === 'approve' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                    >
                      <CheckCircle className="inline mr-2" size={18} />
                      Force Approve
                    </button>
                    <button
                      onClick={() => setOverrideAction('reject')}
                      className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${overrideAction === 'reject' ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
                    >
                      <XCircle className="inline mr-2" size={18} />
                      Force Reject
                    </button>
                  </div>

                  {/* Justification */}
                  {overrideAction && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Justification <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={justification}
                        onChange={e => setJustification(e.target.value)}
                        placeholder="Enter reason for override (required for audit)"
                        rows={3}
                        className="w-full px-4 py-2.5 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg bg-white dark:bg-[#0f0f08]"
                      />
                      <p className="text-xs text-[#8c8b5f] mt-1">
                        This will be logged for compliance.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-6 border-t border-[#e6e6db] dark:border-[#3a392a] flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setOverrideAction(null);
                  setJustification('');
                }}
                className="px-5 py-2.5 border border-[#e6e6db] dark:border-[#3a392a] rounded-lg font-medium hover:bg-gray-50"
              >
                {selectedRequest.status === 'PENDING' ? 'Cancel' : 'Close'}
              </button>
              {selectedRequest.status === 'PENDING' && overrideAction && (
                <button
                  onClick={handleOverride}
                  disabled={saving || !justification.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 font-semibold rounded-lg disabled:opacity-50 ${overrideAction === 'approve' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  Confirm {overrideAction === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalationsScreen;
