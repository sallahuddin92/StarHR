import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  FileText,
  Replace,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  max_days_per_year: number;
  carry_forward_allowed: boolean;
  max_carry_forward_days: number;
  carry_forward_expiry_months: number | null;
  requires_approval: boolean;
  requires_document: boolean;
  is_paid: boolean;
  min_notice_days: number;
  max_consecutive_days: number | null;
  sort_order: number;
}

interface TOILRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  trigger_type: string;
  credit_type: string;
  credit_days: number;
  min_hours_required: number | null;
  max_days_per_event: number | null;
  max_days_per_month: number | null;
  max_days_per_year: number | null;
  expiry_days: number | null;
  carry_forward_allowed: boolean;
  eligible_departments: string[] | null;
  eligible_grades: string[] | null;
  eligible_employment_types: string[] | null;
  requires_approval: boolean;
  auto_credit_on_approval: boolean;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

interface LeavePolicyScreenProps {
  onNavigate: (screen: any) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LeavePolicyScreen: React.FC<LeavePolicyScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'types' | 'toil'>('types');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [toilRules, setToilRules] = useState<TOILRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Leave type form
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState<Partial<LeaveType>>({
    code: '',
    name: '',
    description: '',
    is_active: true,
    max_days_per_year: 0,
    carry_forward_allowed: false,
    max_carry_forward_days: 0,
    requires_approval: true,
    requires_document: false,
    is_paid: true,
    min_notice_days: 0,
    sort_order: 0,
  });

  // TOIL rule form
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    rule_code: '',
    rule_name: '',
    description: '',
    trigger_type: 'TRAINING',
    credit_type: 'FIXED',
    credit_days: 1,
    expiry_days: 90,
    requires_approval: true,
    eligible_departments: '',
    eligible_grades: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

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
      const [typesRes, toilRes] = await Promise.all([
        fetch('/api/leave/types', { headers }),
        fetch('/api/leave/replacement-rules', { headers }),
      ]);
      const typesData = await typesRes.json();
      const toilData = toilRes.ok ? await toilRes.json() : { data: [] };
      setLeaveTypes(typesData.data || []);
      setToilRules(toilData.data || []);
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
  // LEAVE TYPE HANDLERS
  // ============================================================================

  const handleSaveType = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const url = editingTypeId ? `/api/leave/types/${editingTypeId}` : '/api/leave/types';
      const res = await fetch(url, {
        method: editingTypeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(typeForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      await fetchData();
      setShowTypeForm(false);
      setEditingTypeId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Delete this leave type?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/leave/types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditType = (lt: LeaveType) => {
    setTypeForm(lt);
    setEditingTypeId(lt.id);
    setShowTypeForm(true);
  };

  const resetTypeForm = () =>
    setTypeForm({
      code: '',
      name: '',
      description: '',
      is_active: true,
      max_days_per_year: 0,
      carry_forward_allowed: false,
      max_carry_forward_days: 0,
      requires_approval: true,
      requires_document: false,
      is_paid: true,
      min_notice_days: 0,
      sort_order: 0,
    });

  // ============================================================================
  // TOIL RULE HANDLERS
  // ============================================================================

  const handleSaveRule = async () => {
    if (!ruleForm.rule_code || !ruleForm.rule_name) {
      setError('Rule code and name are required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        ...ruleForm,
        eligible_departments: ruleForm.eligible_departments
          ? ruleForm.eligible_departments
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : null,
        eligible_grades: ruleForm.eligible_grades
          ? ruleForm.eligible_grades
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : null,
      };
      const url = editingRuleId
        ? `/api/leave/replacement-rules/${editingRuleId}`
        : '/api/leave/replacement-rules';
      const res = await fetch(url, {
        method: editingRuleId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      await fetchData();
      setShowRuleForm(false);
      setEditingRuleId(null);
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
      await fetch(`/api/leave/replacement-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditRule = (rule: TOILRule) => {
    setRuleForm({
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      credit_type: rule.credit_type,
      credit_days: rule.credit_days,
      expiry_days: rule.expiry_days || 90,
      requires_approval: rule.requires_approval,
      eligible_departments: rule.eligible_departments?.join(', ') || '',
      eligible_grades: rule.eligible_grades?.join(', ') || '',
      effective_from: rule.effective_from.split('T')[0],
    });
    setEditingRuleId(rule.id);
    setShowRuleForm(true);
  };

  const resetRuleForm = () =>
    setRuleForm({
      rule_code: '',
      rule_name: '',
      description: '',
      trigger_type: 'TRAINING',
      credit_type: 'FIXED',
      credit_days: 1,
      expiry_days: 90,
      requires_approval: true,
      eligible_departments: '',
      eligible_grades: '',
      effective_from: new Date().toISOString().split('T')[0],
    });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6 md:p-8 bg-[#fafaf8] dark:bg-[#0f0f08] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Sliders className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Leave Policy Configuration
            </h1>
            <p className="text-sm text-[#8c8b5f]">Define leave types and replacement leave rules</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a190b] border rounded-lg"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'types' ? 'bg-white dark:bg-[#1a190b] shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <FileText size={18} /> Leave Types
        </button>
        <button
          onClick={() => setActiveTab('toil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'toil' ? 'bg-white dark:bg-[#1a190b] shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Replace size={18} /> Replacement Leave Rules
        </button>
      </div>

      {/* ============================================================================
          TAB: LEAVE TYPES
          ============================================================================ */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetTypeForm();
                setEditingTypeId(null);
                setShowTypeForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Plus size={18} /> Add Leave Type
            </button>
          </div>

          <div className="bg-white dark:bg-[#1a190b] rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b">
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Code
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Name
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Max Days
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Carry Fwd
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Approval
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Status
                  </th>
                  <th className="text-right py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Actions
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
                ) : leaveTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      No leave types defined
                    </td>
                  </tr>
                ) : (
                  leaveTypes.map(lt => (
                    <tr
                      key={lt.id}
                      className={`hover:bg-[#f8f8f5] ${!lt.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="py-3 px-6">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono rounded">
                          {lt.code}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-medium">{lt.name}</td>
                      <td className="py-3 px-6 text-center">{lt.max_days_per_year}</td>
                      <td className="py-3 px-6 text-center">
                        {lt.carry_forward_allowed ? (
                          <Check className="mx-auto text-emerald-500" size={16} />
                        ) : (
                          <X className="mx-auto text-slate-300" size={16} />
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {lt.requires_approval ? (
                          <Check className="mx-auto text-emerald-500" size={16} />
                        ) : (
                          <X className="mx-auto text-slate-300" size={16} />
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${lt.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {lt.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => openEditType(lt)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteType(lt.id)}
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
          TAB: TOIL RULES
          ============================================================================ */}
      {activeTab === 'toil' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl flex items-start gap-3 flex-1 mr-4">
              <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-blue-800 dark:text-blue-300 font-medium">
                  Replacement Leave (Time-Off-in-Lieu)
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Configure rules for granting replacement leave when employees work on off-days,
                  public holidays, or attend off-day training. Rules determine credit amount,
                  eligibility, and expiry.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetRuleForm();
                setEditingRuleId(null);
                setShowRuleForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Plus size={18} /> Add TOIL Rule
            </button>
          </div>

          <div className="bg-white dark:bg-[#1a190b] rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b">
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Code
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Rule Name
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Trigger
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Credit
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Expiry
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Status
                  </th>
                  <th className="text-right py-4 px-6 text-xs font-semibold uppercase text-[#8c8b5f]">
                    Actions
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
                ) : toilRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8c8b5f]">
                      No TOIL rules defined. Add rules to enable replacement leave.
                    </td>
                  </tr>
                ) : (
                  toilRules.map(rule => (
                    <tr
                      key={rule.id}
                      className={`hover:bg-[#f8f8f5] ${!rule.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="py-3 px-6">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-mono rounded">
                          {rule.rule_code}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-medium">{rule.rule_name}</td>
                      <td className="py-3 px-6 text-sm">
                        {triggerTypes.find(t => t.value === rule.trigger_type)?.label ||
                          rule.trigger_type}
                      </td>
                      <td className="py-3 px-6 text-center font-bold">
                        {rule.credit_days} day{rule.credit_days !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {rule.expiry_days ? `${rule.expiry_days} days` : 'Never'}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          LEAVE TYPE MODAL
          ============================================================================ */}
      {showTypeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingTypeId ? 'Edit Leave Type' : 'Add Leave Type'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input
                    type="text"
                    value={typeForm.code || ''}
                    onChange={e => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="e.g., AL"
                    disabled={!!editingTypeId}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={typeForm.name || ''}
                    onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="e.g., Annual Leave"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={typeForm.description || ''}
                    onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Days/Year</label>
                  <input
                    type="number"
                    value={typeForm.max_days_per_year || 0}
                    onChange={e =>
                      setTypeForm({ ...typeForm, max_days_per_year: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={typeForm.sort_order || 0}
                    onChange={e =>
                      setTypeForm({ ...typeForm, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeForm.carry_forward_allowed || false}
                    onChange={e =>
                      setTypeForm({ ...typeForm, carry_forward_allowed: e.target.checked })
                    }
                    className="w-4 h-4"
                  />{' '}
                  Carry Forward
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeForm.requires_approval || false}
                    onChange={e =>
                      setTypeForm({ ...typeForm, requires_approval: e.target.checked })
                    }
                    className="w-4 h-4"
                  />{' '}
                  Requires Approval
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeForm.requires_document || false}
                    onChange={e =>
                      setTypeForm({ ...typeForm, requires_document: e.target.checked })
                    }
                    className="w-4 h-4"
                  />{' '}
                  Requires Document
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeForm.is_paid || false}
                    onChange={e => setTypeForm({ ...typeForm, is_paid: e.target.checked })}
                    className="w-4 h-4"
                  />{' '}
                  Paid Leave
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeForm.is_active || false}
                    onChange={e => setTypeForm({ ...typeForm, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />{' '}
                  Active
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowTypeForm(false)}
                className="px-5 py-2.5 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveType}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}{' '}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TOIL RULE MODAL
          ============================================================================ */}
      {showRuleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a190b] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingRuleId ? 'Edit TOIL Rule' : 'Add TOIL Rule'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rule Code *</label>
                  <input
                    type="text"
                    value={ruleForm.rule_code}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, rule_code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="e.g., TRAINING_OFFDAY"
                    disabled={!!editingRuleId}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rule Name *</label>
                  <input
                    type="text"
                    value={ruleForm.rule_name}
                    onChange={e => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="e.g., Training on Off-Day"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={ruleForm.description}
                    onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trigger Type *</label>
                  <select
                    value={ruleForm.trigger_type}
                    onChange={e => setRuleForm({ ...ruleForm, trigger_type: e.target.value })}
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
                  <label className="block text-sm font-medium mb-1">Credit Type</label>
                  <select
                    value={ruleForm.credit_type}
                    onChange={e => setRuleForm({ ...ruleForm, credit_type: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  >
                    <option value="FIXED">Fixed Amount</option>
                    <option value="RATIO">Ratio-Based</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Days *</label>
                  <input
                    type="number"
                    value={ruleForm.credit_days}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, credit_days: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                    step="0.5"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Days</label>
                  <input
                    type="number"
                    value={ruleForm.expiry_days}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, expiry_days: parseInt(e.target.value) || 90 })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="Days until credit expires"
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
                <div>
                  <label className="block text-sm font-medium mb-1">Eligible Departments</label>
                  <input
                    type="text"
                    value={ruleForm.eligible_departments}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, eligible_departments: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="e.g., Engineering, Sales (blank=all)"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Eligible Grades</label>
                  <input
                    type="text"
                    value={ruleForm.eligible_grades}
                    onChange={e => setRuleForm({ ...ruleForm, eligible_grades: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg"
                    placeholder="e.g., SENIOR, MANAGER (blank=all)"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ruleForm.requires_approval}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, requires_approval: e.target.checked })
                    }
                    className="w-4 h-4"
                  />{' '}
                  Requires Approval
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowRuleForm(false)}
                className="px-5 py-2.5 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}{' '}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePolicyScreen;
