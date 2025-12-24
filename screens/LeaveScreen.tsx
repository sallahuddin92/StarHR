import React, { useState, useEffect } from 'react';
import {
  Palmtree,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  AlertCircle,
  TrendingUp,
  User,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';
import { api, LeaveType, LeaveBalance, LeaveRequest } from '../src/lib/api';
import type { Screen } from '../App';

interface LeaveScreenProps {
  onNavigate: (screen: Screen) => void;
  userRole?: string;
}

type TabId = 'overview' | 'apply' | 'history' | 'approvals';

const LeaveScreen: React.FC<LeaveScreenProps> = ({ onNavigate, userRole = 'WORKER' }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply form state
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isManager = userRole === 'HR_ADMIN' || userRole === 'MANAGER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesRes, balancesRes, requestsRes] = await Promise.all([
        api.leave.getTypes(),
        api.leave.getBalance(),
        api.leave.getRequests(),
      ]);

      setLeaveTypes(typesRes.data || []);
      setLeaveBalances(balancesRes.data || []);
      setLeaveRequests(requestsRes.data || []);

      if (isManager) {
        const pendingRes = await api.leave.getPending();
        setPendingApprovals(pendingRes.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch leave data:', err);
      setError(err.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveType || !startDate || !endDate) return;

    setSubmitting(true);
    setError(null);
    try {
      const leaveType = leaveTypes.find(t => t.id === selectedLeaveType);
      await api.leave.apply({
        leaveTypeCode: leaveType?.code || selectedLeaveType,
        startDate,
        endDate,
        reason,
      });
      setSubmitSuccess(true);
      setSelectedLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      await fetchData();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await api.leave.cancel(requestId);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.leave.approve(requestId, 'Approved');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    const remarks = prompt('Please provide a reason for rejection:');
    if (remarks === null) return;
    try {
      await api.leave.reject(requestId, remarks || 'Rejected');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      CANCELLED: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.PENDING}`}
      >
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: TrendingUp },
    { id: 'apply' as TabId, label: 'Apply Leave', icon: Plus },
    { id: 'history' as TabId, label: 'My Requests', icon: FileText },
    ...(isManager ? [{ id: 'approvals' as TabId, label: 'Approvals', icon: CheckCircle }] : []),
  ];

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <Palmtree className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Management</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Manage your leave requests and balances
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'approvals' && pendingApprovals.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={fetchData}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Leave Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalances.map((balance, idx) => {
              const leaveType = leaveTypes.find(t => t.id === balance.leaveTypeId);
              const usedPercentage =
                balance.allocated > 0 ? Math.round((balance.taken / balance.allocated) * 100) : 0;

              return (
                <div
                  key={balance.leaveTypeId || idx}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {leaveType?.name || balance.leaveTypeName || 'Leave'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {leaveType?.code || ''}
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        balance.remaining > 0
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${
                          balance.remaining > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Available</span>
                      <span className="font-bold text-2xl text-slate-900 dark:text-white">
                        {balance.remaining}
                      </span>
                    </div>

                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usedPercentage > 80
                            ? 'bg-red-500'
                            : usedPercentage > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${usedPercentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Used: {balance.taken}</span>
                      <span>Pending: {balance.pending || 0}</span>
                      <span>Total: {balance.allocated}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {leaveBalances.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl">
              <Palmtree className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">
                No Leave Entitlements
              </h3>
              <p className="text-slate-400 mt-1">
                Your leave entitlements will appear here once configured.
              </p>
            </div>
          )}

          {/* Recent Requests */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Requests
              </h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {leaveRequests.slice(0, 5).map(request => (
                <div key={request.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {request.leaveTypeName || 'Leave'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        <span className="ml-2 text-slate-400">({request.daysRequested} days)</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    {request.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {leaveRequests.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No leave requests found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'apply' && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              Apply for Leave
            </h2>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  Leave request submitted successfully!
                </span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Leave Type *
                </label>
                <select
                  value={selectedLeaveType}
                  onChange={e => setSelectedLeaveType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </option>
                  ))}
                </select>
                {selectedLeaveType &&
                  (() => {
                    const leaveType = leaveTypes.find(t => t.id === selectedLeaveType);
                    const balance = leaveBalances.find(b => b.leaveTypeId === selectedLeaveType);
                    if (leaveType) {
                      return (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                          <p className="text-slate-600 dark:text-slate-400">
                            {leaveType.description}
                          </p>
                          {balance && (
                            <p className="mt-1 font-medium text-emerald-600 dark:text-emerald-400">
                              Available: {balance.remaining} days
                            </p>
                          )}
                          {leaveType.minNoticeDays && leaveType.minNoticeDays > 0 && (
                            <p className="mt-1 text-amber-600 dark:text-amber-400">
                              ⚠️ Requires {leaveType.minNoticeDays} days notice
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Reason / Remarks
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Optional: Provide additional details..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedLeaveType || !startDate || !endDate}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Submit Leave Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              My Leave Requests
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {leaveRequests.length} requests
            </span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {leaveRequests.map(request => (
              <div key={request.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
                      <Calendar className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {request.leaveTypeName || 'Leave Request'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatDate(request.startDate)} → {formatDate(request.endDate)}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {request.daysRequested} day(s)
                        </span>
                        {request.reason && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {request.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(request.status)}
                    {request.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {leaveRequests.length === 0 && (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">
                  No Leave Requests
                </h3>
                <p className="text-slate-400 mt-1">You haven't submitted any leave requests yet.</p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Apply for Leave
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'approvals' && isManager && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending Approvals
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {pendingApprovals.length} pending
            </span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pendingApprovals.map(request => (
              <div key={request.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                      <User className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {request.employeeName || 'Employee'}
                      </h3>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {request.leaveTypeName || 'Leave Request'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatDate(request.startDate)} → {formatDate(request.endDate)}
                        <span className="ml-2">({request.daysRequested} days)</span>
                      </p>
                      {request.reason && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Reason: {request.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingApprovals.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-300 dark:text-emerald-800 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">
                  All Caught Up!
                </h3>
                <p className="text-slate-400 mt-1">No pending leave requests to approve.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveScreen;
