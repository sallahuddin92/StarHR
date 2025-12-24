import React, { useState, useEffect, useMemo } from 'react';
import { api, ApprovalRequest, ApiError } from '../src/lib/api';
import { Screen } from '../App';

interface PendingApprovalsScreenProps {
  onNavigate: (screen: Screen) => void;
}

const PendingApprovalsScreen: React.FC<PendingApprovalsScreenProps> = ({ onNavigate }) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await api.approvals.getPending();
      if (response.success && response.data) {
        setApprovals(response.data);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load approvals';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await api.approvals.approve(id);
      if (response.success) {
        setToast({ message: 'Request approved successfully!', type: 'success' });
        setApprovals(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to approve';
      setToast({ message, type: 'error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading(id);
    try {
      const response = await api.approvals.reject(id, reason);
      if (response.success) {
        setToast({ message: 'Request rejected', type: 'success' });
        setApprovals(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reject';
      setToast({ message, type: 'error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '--:--';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const normalizedStatus = a.status?.toLowerCase() || 'pending';
      const matchesFilter =
        filter === 'all' ||
        (filter === 'pending' && normalizedStatus === 'pending') ||
        (filter === 'approved' && normalizedStatus === 'approved');

      return matchesSearch && matchesFilter;
    });
  }, [approvals, searchQuery, filter]);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-text-main dark:text-gray-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
        >
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col h-full min-h-screen">
        <main className="flex-1 flex justify-center py-8 px-4 sm:px-8 lg:px-12 overflow-y-auto">
          <div className="w-full max-w-[960px] flex flex-col gap-8 pb-20">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
              <button
                onClick={() => onNavigate('Dashboard')}
                className="text-text-sub dark:text-gray-400 hover:text-primary transition-colors font-medium"
              >
                Home
              </button>
              <span className="material-symbols-outlined text-text-sub dark:text-gray-400 text-[16px]">
                chevron_right
              </span>
              <span className="text-text-main dark:text-white font-medium">Pending Approvals</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-text-main dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  Pending Approvals
                </h1>
                <p className="text-text-sub dark:text-gray-400 text-base font-normal">
                  Review and action time-off and overtime requests from your team.
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-text-sub dark:text-gray-400">
                  Last synced: Just now
                </span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:w-96 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub dark:text-gray-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="w-full h-12 pl-12 pr-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-main dark:text-white placeholder:text-text-sub transition-shadow"
                  placeholder="Search by name, ID, or type..."
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <button
                  onClick={() => setFilter('pending')}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-bold text-sm transition-transform active:scale-95 ${filter === 'pending'
                      ? 'bg-black dark:bg-white text-primary dark:text-black border border-transparent'
                      : 'bg-white dark:bg-card-dark text-text-main dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  <span className="material-symbols-outlined text-[18px]">inbox</span> Pending (
                  {approvals.length})
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white dark:bg-card-dark text-text-main dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 font-medium text-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>{' '}
                  History
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
                  <span className="material-symbols-outlined text-red-500 text-4xl mb-2">
                    error
                  </span>
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <button
                    onClick={fetchApprovals}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredApprovals.length === 0 ? (
                <div className="bg-white dark:bg-card-dark rounded-[2rem] p-12 text-center border border-gray-100 dark:border-gray-800">
                  <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-6xl mb-4">
                    task_alt
                  </span>
                  <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">
                    All caught up!
                  </h3>
                  <p className="text-text-sub dark:text-gray-400">
                    No pending approvals at the moment.
                  </p>
                </div>
              ) : (
                filteredApprovals.map((approval, idx) => (
                  <div
                    key={approval.id}
                    className="bg-white dark:bg-card-dark rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="bg-center bg-no-repeat bg-cover rounded-full size-14 border-2 border-white dark:border-gray-700 shadow-sm"
                          style={{
                            backgroundImage: `url('${approval.avatarUrl || `https://placehold.co/140x140`}')`,
                          }}
                        ></div>
                        <div className="flex flex-col">
                          <h3 className="text-xl font-bold text-text-main dark:text-white">
                            {approval.employeeName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-text-sub dark:text-gray-400 font-mono">
                            <span>#{approval.employeeCode}</span>
                            <span className="size-1 bg-gray-300 rounded-full"></span>
                            <span>{approval.designation}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full border border-yellow-100 dark:border-yellow-900/30">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm">
                          schedule
                        </span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                          Submitted {formatDate(approval.submittedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                      <div className="col-span-1 md:col-span-8 bg-background-light dark:bg-background-dark/50 rounded-3xl p-5 border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500">
                            Shift Details
                          </span>
                          <span className="text-xs font-mono text-text-sub dark:text-gray-500">
                            ID: {approval.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 font-mono text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-sub dark:text-gray-500">Date</span>
                            <span className="font-semibold text-text-main dark:text-gray-200">
                              {approval.details?.attendanceDate
                                ? formatDate(approval.details.attendanceDate)
                                : '--'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-sub dark:text-gray-500">
                              Clock In
                            </span>
                            <span className="font-semibold text-text-main dark:text-gray-200">
                              {formatTime(approval.details?.clockIn)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-text-sub dark:text-gray-500">
                              Clock Out
                            </span>
                            <span className="font-semibold text-text-main dark:text-gray-200">
                              {formatTime(approval.details?.clockOut)}
                            </span>
                          </div>
                        </div>
                        {approval.details?.notes && (
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm italic text-text-main dark:text-gray-300">
                              "{approval.details.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                      <div
                        className={`col-span-1 md:col-span-4 flex flex-col justify-center items-center rounded-3xl p-5 text-center relative overflow-hidden group ${idx === 0 ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'
                          }`}
                      >
                        {idx === 0 && (
                          <div className="absolute -right-6 -top-6 size-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                        )}
                        <span
                          className={`text-sm font-bold mb-1 z-10 ${idx === 0 ? 'text-black/70' : 'text-text-sub dark:text-gray-400'}`}
                        >
                          Total Overtime
                        </span>
                        <span
                          className={`text-5xl font-black tracking-tight z-10 ${idx === 0 ? 'text-black' : 'text-primary'}`}
                        >
                          +{approval.details?.requestedHours?.toFixed(1) || '0.0'}{' '}
                          <span className="text-2xl font-bold">HRS</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-sub dark:text-gray-500 pl-1">
                          Approval: Manager Decision (Final)
                        </span>
                        <div className="flex items-center gap-3">
                          {/* Single step - Manager approval is FINAL */}
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full border-2 border-primary relative flex items-center justify-center">
                              <div className="size-2 bg-primary rounded-full animate-pulse"></div>
                            </div>
                            <span className="text-sm font-bold text-text-main dark:text-white">
                              Manager
                            </span>
                          </div>
                          <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                          <div className="flex items-center gap-2 opacity-50">
                            <div className="size-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <span className="material-symbols-outlined text-gray-400 text-sm">calculate</span>
                            </div>
                            <span className="text-sm font-medium text-text-sub dark:text-gray-400">
                              Payroll (Auto-calculated)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end xl:self-auto">
                        <button
                          onClick={() => handleReject(approval.id)}
                          disabled={actionLoading === approval.id}
                          className="h-12 px-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>Reject
                        </button>
                        <button
                          onClick={() => handleApprove(approval.id)}
                          disabled={actionLoading === approval.id}
                          className="h-12 px-8 rounded-full bg-black dark:bg-white text-primary dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-black/5 dark:shadow-white/5 active:scale-95 disabled:opacity-50"
                        >
                          {actionLoading === approval.id ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary dark:border-black border-t-transparent"></div>
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">check</span>
                          )}
                          Approve Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PendingApprovalsScreen;
