import React, { useState } from 'react';
import { Screen } from '../App';

interface TravelScreenProps {
  onNavigate: (screen: Screen) => void;
}

interface TravelRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedDate: string;
}

const MOCK_REQUESTS: TravelRequest[] = [
  {
    id: '1',
    employeeName: 'Ahmad bin Abdullah',
    employeeId: 'EMP001',
    destination: 'Singapore',
    purpose: 'Client Meeting',
    startDate: '2025-12-28',
    endDate: '2025-12-30',
    budget: 2500,
    status: 'pending',
    submittedDate: '2025-12-20',
  },
  {
    id: '2',
    employeeName: 'Sarah Jenkins',
    employeeId: 'EMP-001',
    destination: 'Bangkok, Thailand',
    purpose: 'Tech Conference',
    startDate: '2026-01-15',
    endDate: '2026-01-18',
    budget: 3800,
    status: 'approved',
    submittedDate: '2025-12-15',
  },
  {
    id: '3',
    employeeName: 'Mike Ross',
    employeeId: 'EMP-004',
    destination: 'Jakarta, Indonesia',
    purpose: 'Sales Presentation',
    startDate: '2025-12-22',
    endDate: '2025-12-23',
    budget: 1800,
    status: 'completed',
    submittedDate: '2025-12-10',
  },
  {
    id: '4',
    employeeName: 'Jessica Pearson',
    employeeId: 'EMP-012',
    destination: 'Tokyo, Japan',
    purpose: 'Legal Summit',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    budget: 6500,
    status: 'pending',
    submittedDate: '2025-12-21',
  },
];

const STATUS_STYLES = {
  pending: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Pending',
  },
  approved: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Rejected',
  },
  completed: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Completed',
  },
};

const TravelScreen: React.FC<TravelScreenProps> = ({ onNavigate }) => {
  const [requests, setRequests] = useState<TravelRequest[]>(MOCK_REQUESTS);
  const [showModal, setShowModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    destination: '',
    purpose: '',
    startDate: '',
    endDate: '',
    budget: '',
  });
  const [filter, setFilter] = useState<'all' | TravelRequest['status']>('all');

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const handleSubmit = () => {
    if (!newRequest.destination || !newRequest.startDate || !newRequest.budget) return;
    const request: TravelRequest = {
      id: `new-${Date.now()}`,
      employeeName: 'Current User',
      employeeId: 'EMP001',
      destination: newRequest.destination,
      purpose: newRequest.purpose,
      startDate: newRequest.startDate,
      endDate: newRequest.endDate || newRequest.startDate,
      budget: parseFloat(newRequest.budget),
      status: 'pending',
      submittedDate: new Date().toISOString().slice(0, 10),
    };
    setRequests([request, ...requests]);
    setNewRequest({ destination: '', purpose: '', startDate: '', endDate: '', budget: '' });
    setShowModal(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#181811] dark:text-white">Travel & Expense</h1>
          <p className="text-[#8c8b5f] text-sm mt-1">Manage travel requests and expense claims</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Total Requests',
            value: requests.length,
            icon: 'flight_takeoff',
            color: 'bg-blue-500',
          },
          {
            label: 'Pending Approval',
            value: requests.filter(r => r.status === 'pending').length,
            icon: 'hourglass_top',
            color: 'bg-amber-500',
          },
          {
            label: 'Total Budget',
            value: formatCurrency(requests.reduce((sum, r) => sum + r.budget, 0)),
            icon: 'payments',
            color: 'bg-green-500',
          },
          {
            label: 'This Month',
            value: requests.filter(r => r.submittedDate.startsWith('2025-12')).length,
            icon: 'calendar_month',
            color: 'bg-purple-500',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}
              >
                <span className="material-symbols-outlined text-white">{stat.icon}</span>
              </div>
              <div>
                <p className="text-xl font-bold text-[#181811] dark:text-white">{stat.value}</p>
                <p className="text-xs text-[#8c8b5f]">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'completed', 'rejected'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary text-[#181811]'
                : 'bg-[#f5f5f0] dark:bg-[#2e2d15] text-[#8c8b5f] hover:bg-[#e5e5e0] dark:hover:bg-[#3e3d25]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f9f9f7] dark:bg-[#1a1909]">
            <tr className="text-left text-xs font-semibold text-[#8c8b5f] uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Destination</th>
              <th className="p-4">Purpose</th>
              <th className="p-4">Travel Dates</th>
              <th className="p-4">Budget</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(request => (
              <tr
                key={request.id}
                className="border-t border-[#e5e5e0] dark:border-[#3e3d25] hover:bg-[#f9f9f7] dark:hover:bg-[#1a1909]/50"
              >
                <td className="p-4">
                  <div>
                    <p className="font-semibold text-[#181811] dark:text-white">
                      {request.employeeName}
                    </p>
                    <p className="text-xs text-[#8c8b5f]">{request.employeeId}</p>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#8c8b5f]">
                      location_on
                    </span>
                    <span className="font-medium text-[#181811] dark:text-white">
                      {request.destination}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-[#8c8b5f]">{request.purpose}</td>
                <td className="p-4 text-sm text-[#181811] dark:text-white">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </td>
                <td className="p-4 font-mono font-semibold text-[#181811] dark:text-white">
                  {formatCurrency(request.budget)}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[request.status].bg} ${STATUS_STYLES[request.status].text}`}
                  >
                    {STATUS_STYLES[request.status].label}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-1.5 hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] rounded text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#181811] dark:text-white">
                New Travel Request
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
              >
                <span className="material-symbols-outlined text-[#8c8b5f]">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={newRequest.destination}
                  onChange={e => setNewRequest({ ...newRequest, destination: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Singapore"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Purpose
                </label>
                <input
                  type="text"
                  value={newRequest.purpose}
                  onChange={e => setNewRequest({ ...newRequest, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Client Meeting"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={e => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={e => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Estimated Budget (RM)
                </label>
                <input
                  type="number"
                  value={newRequest.budget}
                  onChange={e => setNewRequest({ ...newRequest, budget: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="2500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelScreen;
