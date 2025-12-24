import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../src/lib/api';

// --- INTERFACES ---
interface EwaRequest {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  accruedSalary: number;
  safeLimit: number;
  requestedAmount: number;
  requestDate: string;
  daysWorked: number;
}

// --- HELPER COMPONENTS ---
const SafeLimitProgress: React.FC<{ requested: number; limit: number }> = ({
  requested,
  limit,
}) => {
  const percentage = Math.min((requested / limit) * 100, 100);
  const isOverLimit = requested > limit;

  return (
    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 relative">
      <div
        className={`h-2.5 rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-primary'}`}
        style={{ width: `${isOverLimit ? 100 : percentage}%` }}
      ></div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const EwaManagerScreen: React.FC = () => {
  const SAFE_LIMIT_PERCENTAGE = 0.5;
  const TOTAL_POOL = 50000;

  // State
  const [pendingRequests, setPendingRequests] = useState<EwaRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [totalDisbursed, setTotalDisbursed] = useState(15400); // Will be calculated from API later

  const UTILIZATION_PERCENTAGE = (totalDisbursed / TOTAL_POOL) * 100;

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      const response = await api.ewa.getPending();
      if (response.success && response.data) {
        setPendingRequests(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // Approve request
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await api.ewa.approve(id);
      if (response.success) {
        setToast({ message: `Request approved and disbursed!`, type: 'success' });
        // Remove from list
        setPendingRequests(prev => prev.filter(req => req.id !== id));
        // Update total disbursed
        const approved = pendingRequests.find(r => r.id === id);
        if (approved) {
          setTotalDisbursed(prev => prev + approved.requestedAmount);
        }
      } else {
        setToast({ message: response.message || 'Failed to approve', type: 'error' });
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Network error';
      setToast({ message, type: 'error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Reject request
  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await api.ewa.reject(id, 'Rejected by manager');
      if (response.success) {
        setToast({ message: `Request rejected`, type: 'success' });
        // Remove from list
        setPendingRequests(prev => prev.filter(req => req.id !== id));
      } else {
        setToast({ message: response.message || 'Failed to reject', type: 'error' });
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Network error';
      setToast({ message, type: 'error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="bg-background-light dark:bg-slate-900 min-h-screen font-body text-slate-800 dark:text-slate-200 flex flex-col">
      <header className="flex-none px-6 py-4 md:px-10 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-slate-900 dark:text-white text-2xl md:text-3xl font-bold tracking-tight">
              EWA Liquidity Engine
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
              Monitor and approve Earned Wage Access requests.
            </p>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Live Feed</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Liquidity Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Total Disbursed
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {formatCurrency(totalDisbursed)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Available Pool
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {formatCurrency(TOTAL_POOL - totalDisbursed)}
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${UTILIZATION_PERCENTAGE}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Pending Requests
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {pendingRequests.length}
                  </p>
                  <span className="text-sm text-slate-400">requests</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-orange-600 font-medium">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Action required
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                  Recovery Projection
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white mt-2">
                  To be deducted in Nov Payroll
                </p>
              </div>
            </div>

            {/* Request Approval Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <h3 className="text-lg font-bold p-6 text-slate-900 dark:text-white">
                Request Approval Queue
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 font-medium">Employee</th>
                      <th className="px-6 py-3 font-medium">Department</th>
                      <th className="px-6 py-3 font-medium">Accrued Salary</th>
                      <th className="px-6 py-3 font-medium w-48">Safe Limit (50%)</th>
                      <th className="px-6 py-3 font-medium">Requested</th>
                      <th className="px-6 py-3 font-medium text-center">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          <span className="material-symbols-outlined animate-spin text-2xl">
                            progress_activity
                          </span>
                          <p className="mt-2">Loading pending requests...</p>
                        </td>
                      </tr>
                    ) : pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          <span className="material-symbols-outlined text-4xl text-slate-300">
                            inbox
                          </span>
                          <p className="mt-2">No pending EWA requests</p>
                        </td>
                      </tr>
                    ) : (
                      pendingRequests.map(req => {
                        const safeLimit =
                          req.safeLimit || req.accruedSalary * SAFE_LIMIT_PERCENTAGE;
                        const isHighRisk = req.requestedAmount > safeLimit;
                        const isActionLoading = actionLoading === req.id;
                        return (
                          <tr
                            key={req.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isHighRisk ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                          >
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                    {req.name
                                      .split(' ')
                                      .map(n => n[0])
                                      .join('')
                                      .slice(0, 2)}
                                  </span>
                                </div>
                                <span>{req.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                                {req.department}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {formatCurrency(req.accruedSalary)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs text-slate-500">
                                  {formatCurrency(safeLimit)}
                                </span>
                                <SafeLimitProgress
                                  requested={req.requestedAmount}
                                  limit={safeLimit}
                                />
                              </div>
                            </td>
                            <td
                              className={`px-6 py-4 font-bold ${isHighRisk ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}
                            >
                              {formatCurrency(req.requestedAmount)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isHighRisk ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/20 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20">
                                  High Risk
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                                  Safe
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleReject(req.id)}
                                  disabled={isActionLoading}
                                  className="p-2 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <span className="material-symbols-outlined text-xl">cancel</span>
                                </button>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  disabled={isActionLoading}
                                  className="p-2 rounded-full text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  {isActionLoading ? (
                                    <span className="material-symbols-outlined text-xl animate-spin">
                                      progress_activity
                                    </span>
                                  ) : (
                                    <span className="material-symbols-outlined text-xl">
                                      check_circle
                                    </span>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        <aside className="w-72 bg-white dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-800 p-6 flex-col hidden xl:flex">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500">Recent withdrawals will appear here</p>
          </div>
        </aside>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100'
              : 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100'
          }`}
        >
          <span className="material-symbols-outlined">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EwaManagerScreen;
