import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  Users,
  Building2,
  Plus,
  Edit2,
  Save,
  X,
  RefreshCw,
  AlertTriangle,
  Settings,
  User,
  ChevronDown,
  ChevronUp,
  Trash2,
  Info,
  Replace,
  Check,
  Clock,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  year: number;
  allocated_days: number;
  taken_days: number;
  pending_days: number;
  carry_forward_days: number;
}

interface EntitlementRule {
  id: string;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  rule_name: string | null;
  rule_description: string | null;
  employee_grade: string | null;
  department: string | null;
  min_tenure_months: number;
  max_tenure_months: number | null;
  allocated_days: number;
  effective_from: string;
  effective_to: string | null;
  priority: number;
  is_active: boolean;
}

interface Exception {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  allocated_days: number;
  reason: string;
  effective_year: number;
  is_active: boolean;
  approved_by_name: string | null;
}

interface TOILCredit {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  trigger_type: string;
  trigger_date: string;
  trigger_description: string;
  days_credited: number;
  days_remaining: number;
  status: string;
  expiry_date: string | null;
  approved_by_name: string | null;
  rule_name: string | null;
}

interface EntitlementScreenProps {
  onNavigate: (screen: any) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EntitlementScreen: React.FC<EntitlementScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'balances' | 'exceptions' | 'toil'>('rules');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [rules, setRules] = useState<EntitlementRule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [toilCredits, setToilCredits] = useState<TOILCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');

  // Modals
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EntitlementRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Form states
  const [ruleForm, setRuleForm] = useState({
    leave_type_id: '',
    rule_name: '',
    rule_description: '',
    employee_grade: '',
    department: '',
    min_tenure_months: 0,
    max_tenure_months: '',
    allocated_days: 0,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    priority: 50,
    change_reason: '',
  });
  const [exceptionForm, setExceptionForm] = useState({
    employee_id: '',
    leave_type_id: '',
    allocated_days: 0,
    reason: '',
    effective_year: new Date().getFullYear(),
  });
  const [bulkDept, setBulkDept] = useState<string>('all');
  const [bulkLeaveType, setBulkLeaveType] = useState<string>('');
  const [bulkDays, setBulkDays] = useState<number>(0);

  // TOIL Grant state
  const [showToilModal, setShowToilModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [toilForm, setToilForm] = useState({
    trigger_type: 'TRAINING',
    trigger_date: new Date().toISOString().split('T')[0],
    trigger_description: '',
    days_credited: 1,
  });

  const currentYear = new Date().getFullYear();
  const departments = [
    'Engineering',
    'HR',
    'Finance',
    'Sales',
    'Marketing',
    'Operations',
    'IT',
    'Legal',
  ];
  const grades = ['JUNIOR', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'];
  const triggerTypes = [
    { value: 'TRAINING', label: 'Training on Off-Day' },
    { value: 'PUBLIC_HOLIDAY_WORK', label: 'Public Holiday Work' },
    { value: 'REST_DAY_WORK', label: 'Rest Day Work' },
    { value: 'OVERTIME', label: 'Overtime' },
    { value: 'OFFICIAL_DUTY', label: 'Official Duty' },
    { value: 'CUSTOM', label: 'Custom Event' },
  ];

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [empRes, typesRes, balRes, rulesRes, exceptionsRes, toilRes] = await Promise.all([
        fetch('/api/employees', { headers }),
        fetch('/api/leave/types', { headers }),
        fetch(`/api/leave/admin/balances?year=${currentYear}`, { headers }),
        fetch('/api/leave/admin/entitlement-rules', { headers }),
        fetch('/api/leave/admin/exceptions', { headers }),
        fetch('/api/leave/admin/replacement-credits', { headers }),
      ]);

      const empData = await empRes.json();
      const typesData = await typesRes.json();
      const balData = balRes.ok ? await balRes.json() : { data: [] };
      const rulesData = rulesRes.ok ? await rulesRes.json() : { data: [] };
      const exceptionsData = exceptionsRes.ok ? await exceptionsRes.json() : { data: [] };
      const toilData = toilRes.ok ? await toilRes.json() : { data: [] };

      setEmployees(empData.data || []);
      setLeaveTypes(typesData.data || []);
      setBalances(balData.data || []);
      setRules(rulesData.data || []);
      setExceptions(exceptionsData.data || []);
      setToilCredits(toilData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================================================
  // HANDLERS: Rules
  // ============================================================================

  const resetRuleForm = () =>
    setRuleForm({
      leave_type_id: '',
      rule_name: '',
      rule_description: '',
      employee_grade: '',
      department: '',
      min_tenure_months: 0,
      max_tenure_months: '',
      allocated_days: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      priority: 50,
      change_reason: '',
    });

  const openAddRule = () => {
    resetRuleForm();
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (rule: EntitlementRule) => {
    setEditingRule(rule);
    setRuleForm({
      leave_type_id: rule.leave_type_id,
      rule_name: rule.rule_name || '',
      rule_description: rule.rule_description || '',
      employee_grade: rule.employee_grade || '',
      department: rule.department || '',
      min_tenure_months: rule.min_tenure_months,
      max_tenure_months: rule.max_tenure_months?.toString() || '',
      allocated_days: rule.allocated_days,
      effective_from: rule.effective_from.split('T')[0],
      effective_to: rule.effective_to?.split('T')[0] || '',
      priority: rule.priority,
      change_reason: '',
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.leave_type_id || !ruleForm.allocated_days || !ruleForm.effective_from) {
      setError('Leave type, allocated days, and effective date are required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        ...ruleForm,
        max_tenure_months: ruleForm.max_tenure_months ? parseInt(ruleForm.max_tenure_months) : null,
        employee_grade: ruleForm.employee_grade || null,
        department: ruleForm.department || null,
        effective_to: ruleForm.effective_to || null,
      };
      const url = editingRule
        ? `/api/leave/admin/entitlement-rules/${editingRule.id}`
        : '/api/leave/admin/entitlement-rules';
      const res = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      await fetchData();
      setShowRuleModal(false);
      resetRuleForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Deactivate this rule?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/leave/admin/entitlement-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ============================================================================
  // HANDLERS: Exceptions
  // ============================================================================

  const handleSaveException = async () => {
    if (!exceptionForm.employee_id || !exceptionForm.leave_type_id || !exceptionForm.reason) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/leave/admin/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(exceptionForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      await fetchData();
      setShowExceptionModal(false);
      setExceptionForm({
        employee_id: '',
        leave_type_id: '',
        allocated_days: 0,
        reason: '',
        effective_year: currentYear,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!confirm('Remove this exception?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/leave/admin/exceptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ============================================================================
  // HANDLERS: Balances
  // ============================================================================

  const handleUpdateBalance = async (balanceId: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/leave/admin/balances/${balanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allocated_days: editValue }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchData();
      setEditingBalance(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAllocate = async () => {
    if (!bulkLeaveType || bulkDays <= 0) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/leave/admin/bulk-allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          leave_type_id: bulkLeaveType,
          department: bulkDept === 'all' ? null : bulkDept,
          days: bulkDays,
          year: currentYear,
        }),
      });
      if (!res.ok) throw new Error('Failed to allocate');
      await fetchData();
      setShowBulkModal(false);
      setBulkDays(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // HANDLERS: TOIL Credits
  // ============================================================================

  const handleGrantToil = async () => {
    if (selectedEmployees.length === 0 || !toilForm.trigger_description) {
      setError('Select at least one employee and provide a description');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      // Grant TOIL credit to each selected employee
      for (const empId of selectedEmployees) {
        await fetch('/api/leave/replacement-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            employee_id: empId,
            ...toilForm,
          }),
        });
      }
      await fetchData();
      setShowToilModal(false);
      setSelectedEmployees([]);
      setToilForm({
        trigger_type: 'TRAINING',
        trigger_date: new Date().toISOString().split('T')[0],
        trigger_description: '',
        days_credited: 1,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveToil = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/leave/replacement-credits/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectToil = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/leave/replacement-credits/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployees(prev => (prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]));
  };

  const selectAllEmployees = () => {
    const filtered = filteredEmployees.map(e => e.id);
    setSelectedEmployees(filtered);
  };

  const clearSelection = () => setSelectedEmployees([]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const filteredBalances = balances.filter(
    b =>
      (b.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.employee_code.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedDept === 'all' || b.department === selectedDept) &&
      (selectedLeaveType === 'all' || b.leave_type_id === selectedLeaveType)
  );

  const groupedRules = leaveTypes.map(lt => ({
    ...lt,
    rules: rules.filter(r => r.leave_type_id === lt.id),
  }));
  const uniqueDepts = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const filteredEmployees = employees.filter(
    e =>
      (e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedDept === 'all' || e.department === selectedDept)
  );

  const formatTenure = (min: number, max: number | null) => {
    if (min === 0 && max === null) return 'All tenures';
    if (max === null) return `>${Math.floor(min / 12)} years`;
    return `${Math.floor(min / 12)}-${Math.floor(max / 12)} years`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6 md:p-8 bg-[#fafaf8] dark:bg-[#0f0f08] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Scale className="text-purple-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Leave Entitlements
            </h1>
            <p className="text-sm text-[#8c8b5f]">
              Configure rules, manage balances, and set individual exceptions
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a190b] border border-[#e6e6db] rounded-lg"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {[
          { id: 'rules', label: 'Entitlement Rules', icon: Settings },
          { id: 'balances', label: 'Employee Balances', icon: Users },
          { id: 'exceptions', label: 'Individual Exceptions', icon: User },
          { id: 'toil', label: 'TOIL Credits', icon: Replace },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-white dark:bg-[#1a190b] shadow-sm text-purple-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================================
          TAB: RULES
          ============================================================================ */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl flex items-start gap-3 flex-1 mr-4">
              <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Rules are matched by priority. More specific rules (tenure + grade + department)
                take precedence. Individual exceptions override all rules.
              </p>
            </div>
            <button
              onClick={openAddRule}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
            >
              <Plus size={18} /> Add Rule
            </button>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#1a190b] rounded-xl p-12 text-center border">
              <RefreshCw className="animate-spin mx-auto mb-2 text-[#8c8b5f]" size={32} />
              <p className="text-[#8c8b5f]">Loading rules...</p>
            </div>
          ) : (
            groupedRules.map(lt => (
              <div
                key={lt.id}
                className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedType(expandedType === lt.id ? null : lt.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#f8f8f5] dark:hover:bg-[#1a1909] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 text-sm font-medium rounded">
                      {lt.code}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{lt.name}</span>
                    <span className="text-sm text-[#8c8b5f]">({lt.rules.length} rules)</span>
                  </div>
                  {expandedType === lt.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedType === lt.id && (
                  <div className="border-t border-[#e6e6db] dark:border-[#3a392a]">
                    {lt.rules.length === 0 ? (
                      <div className="p-6 text-center text-[#8c8b5f]">
                        No rules. Using leave type default.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[#f8f8f5] dark:bg-[#23220f]">
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Rule Name
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Tenure
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Grade
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Dept
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Days
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Priority
                            </th>
                            <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a392a]">
                          {lt.rules
                            .sort((a, b) => a.priority - b.priority)
                            .map(rule => (
                              <tr
                                key={rule.id}
                                className={`hover:bg-[#f8f8f5] ${!rule.is_active ? 'opacity-50' : ''}`}
                              >
                                <td className="py-3 px-4 font-medium">
                                  {rule.rule_name || 'Unnamed'}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {formatTenure(rule.min_tenure_months, rule.max_tenure_months)}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {rule.employee_grade || (
                                    <span className="text-[#8c8b5f]">Any</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {rule.department || <span className="text-[#8c8b5f]">Any</span>}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-lg">
                                  {rule.allocated_days}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-1 bg-slate-100 text-xs rounded">
                                    {rule.priority}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => openEditRule(rule)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRule(rule.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================================
          TAB: BALANCES
          ============================================================================ */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1a190b] rounded-xl border p-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b5f]"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-[#0f0f08]"
              />
            </div>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-4 py-2.5 border rounded-lg"
            >
              <option value="all">All Departments</option>
              {uniqueDepts.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={selectedLeaveType}
              onChange={e => setSelectedLeaveType(e.target.value)}
              className="px-4 py-2.5 border rounded-lg"
            >
              <option value="all">All Leave Types</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              <Plus size={18} /> Bulk Allocate
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#1a190b] rounded-xl border p-4">
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-xs text-[#8c8b5f]">Employees</p>
            </div>
            <div className="bg-white dark:bg-[#1a190b] rounded-xl border p-4">
              <p className="text-2xl font-bold text-emerald-600">{balances.length}</p>
              <p className="text-xs text-[#8c8b5f]">Balance Records</p>
            </div>
            <div className="bg-white dark:bg-[#1a190b] rounded-xl border p-4">
              <p className="text-2xl font-bold text-purple-600">{uniqueDepts.length}</p>
              <p className="text-xs text-[#8c8b5f]">Departments</p>
            </div>
            <div className="bg-white dark:bg-[#1a190b] rounded-xl border p-4">
              <p className="text-2xl font-bold text-amber-600">{leaveTypes.length}</p>
              <p className="text-xs text-[#8c8b5f]">Leave Types</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a190b] rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b">
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Employee
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Dept
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Leave
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Allocated
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Taken
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Remaining
                  </th>
                  <th className="text-right py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                      Loading...
                    </td>
                  </tr>
                ) : filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      No balances. Use Bulk Allocate.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.slice(0, 50).map(b => {
                    const remaining =
                      b.allocated_days + b.carry_forward_days - b.taken_days - b.pending_days;
                    return (
                      <tr key={b.id} className="hover:bg-[#f8f8f5]">
                        <td className="py-3 px-6">
                          <p className="font-medium">{b.employee_name}</p>
                          <p className="text-xs text-[#8c8b5f]">{b.employee_code}</p>
                        </td>
                        <td className="py-3 px-6 text-sm">{b.department || '—'}</td>
                        <td className="py-3 px-6">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {b.leave_type_code}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          {editingBalance === b.id ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-center"
                              autoFocus
                            />
                          ) : (
                            <span className="font-bold text-lg">{b.allocated_days}</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center text-red-600">{b.taken_days}</td>
                        <td className="py-3 px-6 text-center">
                          <span
                            className={`font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}
                          >
                            {remaining}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          {editingBalance === b.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateBalance(b.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={() => setEditingBalance(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingBalance(b.id);
                                setEditValue(b.allocated_days);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredBalances.length > 50 && (
              <div className="p-4 text-center text-sm text-[#8c8b5f] border-t">
                Showing 50 of {filteredBalances.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB: EXCEPTIONS
          ============================================================================ */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl flex items-start gap-3 flex-1 mr-4">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Exceptions override ALL rules. Use for special cases like contract terms, medical
                conditions, or executive packages.
              </p>
            </div>
            <button
              onClick={() => setShowExceptionModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              <Plus size={18} /> Add Exception
            </button>
          </div>

          <div className="bg-white dark:bg-[#1a190b] rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b">
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Employee
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Leave Type
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Days
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Year
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Reason
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Approved By
                  </th>
                  <th className="text-right py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      <RefreshCw className="animate-spin mx-auto" size={24} />
                    </td>
                  </tr>
                ) : exceptions.filter(e => e.is_active).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      No exceptions configured.
                    </td>
                  </tr>
                ) : (
                  exceptions
                    .filter(e => e.is_active)
                    .map(ex => (
                      <tr key={ex.id} className="hover:bg-[#f8f8f5]">
                        <td className="py-3 px-6">
                          <p className="font-medium">{ex.employee_name}</p>
                          <p className="text-xs text-[#8c8b5f]">{ex.employee_code}</p>
                        </td>
                        <td className="py-3 px-6">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            {ex.leave_type_code}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center font-bold text-lg text-purple-600">
                          {ex.allocated_days}
                        </td>
                        <td className="py-3 px-6 text-center">{ex.effective_year}</td>
                        <td className="py-3 px-6 text-sm max-w-[200px] truncate" title={ex.reason}>
                          {ex.reason}
                        </td>
                        <td className="py-3 px-6 text-sm">{ex.approved_by_name || '—'}</td>
                        <td className="py-3 px-6 text-right">
                          <button
                            onClick={() => handleDeleteException(ex.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB: TOIL CREDITS
          ============================================================================ */}
      {activeTab === 'toil' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 rounded-xl flex items-start gap-3 flex-1 mr-4">
              <Replace className="text-purple-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-purple-800 dark:text-purple-300 font-medium">
                  Replacement Leave (Time-Off-in-Lieu)
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Select employees and grant TOIL credits for training, public holiday work, or
                  other events.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowToilModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              <Plus size={18} /> Grant TOIL Credits
            </button>
          </div>

          {/* Pending Credits */}
          <div className="bg-white dark:bg-[#1a190b] rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-[#f8f8f5] dark:bg-[#23220f]">
              <h3 className="font-semibold">All TOIL Credits</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Trigger
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Date
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Days
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Expiry
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <RefreshCw className="animate-spin mx-auto" size={24} />
                    </td>
                  </tr>
                ) : toilCredits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      No TOIL credits. Click "Grant TOIL Credits" to add.
                    </td>
                  </tr>
                ) : (
                  toilCredits.map(c => (
                    <tr key={c.id} className="hover:bg-[#f8f8f5]">
                      <td className="py-3 px-4">
                        <p className="font-medium">{c.employee_name}</p>
                        <p className="text-xs text-[#8c8b5f]">{c.employee_code}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {triggerTypes.find(t => t.value === c.trigger_type)?.label ||
                            c.trigger_type}
                        </span>
                        <p
                          className="text-xs text-[#8c8b5f] truncate max-w-[150px]"
                          title={c.trigger_description}
                        >
                          {c.trigger_description}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(c.trigger_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{c.days_credited}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : c.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : c.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveToil(c.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded mr-1"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleRejectToil(c.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODALS
          ============================================================================ */}

      {/* TOIL Grant Modal */}
      {showToilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Grant Replacement Leave Credits</h2>
              <p className="text-sm text-[#8c8b5f] mt-1">
                Select employees and configure the TOIL credit
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left: Employee Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">
                      Select Employees{' '}
                      <span className="text-purple-600">({selectedEmployees.length} selected)</span>
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllEmployees}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b5f]"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {filteredEmployees.slice(0, 50).map(emp => (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8f8f5] cursor-pointer border-b last:border-b-0 ${selectedEmployees.includes(emp.id) ? 'bg-purple-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="w-4 h-4 accent-purple-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{emp.full_name}</p>
                          <p className="text-xs text-[#8c8b5f]">
                            {emp.employee_id} • {emp.department}
                          </p>
                        </div>
                      </label>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <p className="p-4 text-center text-[#8c8b5f] text-sm">No employees found</p>
                    )}
                  </div>
                </div>
                {/* Right: Credit Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium mb-3">Credit Details</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Trigger Type *</label>
                    <select
                      value={toilForm.trigger_type}
                      onChange={e => setToilForm({ ...toilForm, trigger_type: e.target.value })}
                      className="w-full px-4 py-2.5 border rounded-lg"
                    >
                      {triggerTypes.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Event Date *</label>
                    <input
                      type="date"
                      value={toilForm.trigger_date}
                      onChange={e => setToilForm({ ...toilForm, trigger_date: e.target.value })}
                      className="w-full px-4 py-2.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description *</label>
                    <input
                      type="text"
                      value={toilForm.trigger_description}
                      onChange={e =>
                        setToilForm({ ...toilForm, trigger_description: e.target.value })
                      }
                      placeholder="e.g., Safety Training Course, CNY Public Holiday"
                      className="w-full px-4 py-2.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Days to Credit</label>
                    <input
                      type="number"
                      value={toilForm.days_credited}
                      onChange={e =>
                        setToilForm({ ...toilForm, days_credited: parseFloat(e.target.value) || 1 })
                      }
                      step="0.5"
                      min="0.5"
                      className="w-full px-4 py-2.5 border rounded-lg"
                    />
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-700">
                      ✓ As HR Admin, credits will be <strong>auto-approved</strong> for selected
                      employees.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-between items-center">
              <p className="text-sm text-[#8c8b5f]">
                {selectedEmployees.length} employee(s) × {toilForm.days_credited} day(s) ={' '}
                <strong>{selectedEmployees.length * toilForm.days_credited}</strong> total days
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowToilModal(false);
                    setSelectedEmployees([]);
                  }}
                  className="px-5 py-2.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantToil}
                  disabled={
                    saving || selectedEmployees.length === 0 || !toilForm.trigger_description
                  }
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}{' '}
                  Grant Credits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{editingRule ? 'Edit Rule' : 'Create Rule'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Leave Type *</label>
                  <select
                    value={ruleForm.leave_type_id}
                    onChange={e => setRuleForm({ ...ruleForm, leave_type_id: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                    disabled={!!editingRule}
                  >
                    <option value="">Select...</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>
                        {lt.code} - {lt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={ruleForm.rule_name}
                    onChange={e => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                    placeholder="e.g., Senior Staff Annual Leave"
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Tenure (months)</label>
                  <input
                    type="number"
                    value={ruleForm.min_tenure_months}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, min_tenure_months: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Tenure (months)</label>
                  <input
                    type="number"
                    value={ruleForm.max_tenure_months}
                    onChange={e => setRuleForm({ ...ruleForm, max_tenure_months: e.target.value })}
                    placeholder="No limit"
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Grade</label>
                  <select
                    value={ruleForm.employee_grade}
                    onChange={e => setRuleForm({ ...ruleForm, employee_grade: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  >
                    <option value="">Any</option>
                    {grades.map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    value={ruleForm.department}
                    onChange={e => setRuleForm({ ...ruleForm, department: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  >
                    <option value="">Any</option>
                    {departments.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Days *</label>
                  <input
                    type="number"
                    value={ruleForm.allocated_days}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, allocated_days: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <input
                    type="number"
                    value={ruleForm.priority}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 50 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Effective From *</label>
                  <input
                    type="date"
                    value={ruleForm.effective_from}
                    onChange={e => setRuleForm({ ...ruleForm, effective_from: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRuleModal(false);
                  resetRuleForm();
                }}
                className="px-5 py-2.5 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}{' '}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Add Individual Exception</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee *</label>
                <select
                  value={exceptionForm.employee_id}
                  onChange={e =>
                    setExceptionForm({ ...exceptionForm, employee_id: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border rounded-lg"
                >
                  <option value="">Select...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Leave Type *</label>
                <select
                  value={exceptionForm.leave_type_id}
                  onChange={e =>
                    setExceptionForm({ ...exceptionForm, leave_type_id: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border rounded-lg"
                >
                  <option value="">Select...</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Days *</label>
                <input
                  type="number"
                  value={exceptionForm.allocated_days}
                  onChange={e =>
                    setExceptionForm({
                      ...exceptionForm,
                      allocated_days: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input
                  type="number"
                  value={exceptionForm.effective_year}
                  onChange={e =>
                    setExceptionForm({ ...exceptionForm, effective_year: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason *</label>
                <input
                  type="text"
                  value={exceptionForm.reason}
                  onChange={e => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                  placeholder="e.g., Executive package per contract"
                  className="w-full px-4 py-2.5 border rounded-lg"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowExceptionModal(false)}
                className="px-5 py-2.5 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveException}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}{' '}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Allocate Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Bulk Allocate Leave</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Leave Type *</label>
                <select
                  value={bulkLeaveType}
                  onChange={e => setBulkLeaveType(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg"
                >
                  <option value="">Select...</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  value={bulkDept}
                  onChange={e => setBulkDept(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg"
                >
                  <option value="all">All</option>
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Days *</label>
                <input
                  type="number"
                  value={bulkDays}
                  onChange={e => setBulkDays(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border rounded-lg"
                />
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700">
                  ⚠️ This adds to existing allocations for year {currentYear}.
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-5 py-2.5 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAllocate}
                disabled={saving || !bulkLeaveType || bulkDays <= 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}{' '}
                Allocate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntitlementScreen;
