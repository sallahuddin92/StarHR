import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Users,
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Save,
  X,
  AlertCircle,
  Check,
  RefreshCw,
  User,
  ArrowRight,
  Trash2,
  GitBranch,
} from 'lucide-react';
import type { Screen } from '../App';

interface HierarchyBuilderScreenProps {
  onNavigate: (screen: Screen) => void;
  userRole?: string;
}

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  designation: string;
  isActive: boolean;
  hierarchy: {
    id: string;
    reportsToId: string | null;
    supervisorName: string | null;
    departmentId: string | null;
    deptCode: string;
    deptName: string;
    positionTitle: string | null;
    hierarchyLevel: number;
    levelName: string;
    canApproveLeave: boolean;
  } | null;
}

interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  headEmployeeId: string | null;
  headName: string | null;
  fallbackApproverId: string | null;
  fallbackName: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface HierarchyLevel {
  level_number: number;
  level_name: string;
  description: string | null;
}

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

const HierarchyBuilderScreen: React.FC<HierarchyBuilderScreenProps> = ({ userRole }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tree' | 'list' | 'departments'>('tree');
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    reportsToId: '',
    departmentId: '',
    positionTitle: '',
    hierarchyLevel: 6,
    canApproveLeave: false,
  });

  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    description: '',
    parentId: '',
    headEmployeeId: '',
    fallbackApproverId: '',
  });

  const isHRAdmin = userRole === 'HR_ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hierarchy', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch hierarchy data');

      const data = await response.json();

      if (data.success) {
        setEmployees(data.data.employees || []);
        setDepartments(data.data.departments || []);
        setHierarchyLevels(data.data.hierarchyLevels || []);
        // Auto-expand root nodes
        const roots = (data.data.employees || []).filter(
          (e: Employee) => !e.hierarchy?.reportsToId
        );
        setExpandedNodes(new Set(roots.map((e: Employee) => e.id)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load hierarchy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build tree structure from flat employee list
  const buildTree = useCallback((): TreeNode[] => {
    const employeeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes
    employees.forEach(emp => {
      employeeMap.set(emp.id, { employee: emp, children: [] });
    });

    // Build tree
    employees.forEach(emp => {
      const node = employeeMap.get(emp.id)!;
      const supervisorId = emp.hierarchy?.reportsToId;

      if (supervisorId && employeeMap.has(supervisorId)) {
        employeeMap.get(supervisorId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort roots by hierarchy level
    roots.sort(
      (a, b) =>
        (a.employee.hierarchy?.hierarchyLevel || 99) - (b.employee.hierarchy?.hierarchyLevel || 99)
    );

    return roots;
  }, [employees]);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleDragStart = (employeeId: string) => {
    setDraggedEmployee(employeeId);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedEmployee || draggedEmployee === targetId) {
      setDraggedEmployee(null);
      return;
    }

    setSaving(true);
    try {
      const draggedEmp = employees.find(e => e.id === draggedEmployee);
      const response = await fetch(`/api/hierarchy/${draggedEmployee}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportsToId: targetId,
          departmentId: draggedEmp?.hierarchy?.departmentId || null,
          positionTitle: draggedEmp?.hierarchy?.positionTitle || null,
          hierarchyLevel: draggedEmp?.hierarchy?.hierarchyLevel || 6,
          canApproveLeave: draggedEmp?.hierarchy?.canApproveLeave || false,
        }),
      });

      if (!response.ok) throw new Error('Failed to update hierarchy');

      setSuccess('Reporting line updated');
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDraggedEmployee(null);
      setSaving(false);
    }
  };

  const handleSaveEmployee = async (employeeId: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/hierarchy/${employeeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportsToId: editForm.reportsToId || null,
          departmentId: editForm.departmentId || null,
          positionTitle: editForm.positionTitle || null,
          hierarchyLevel: editForm.hierarchyLevel,
          canApproveLeave: editForm.canApproveLeave,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setSuccess('Hierarchy updated successfully');
      setEditingEmployee(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDepartment = async () => {
    setSaving(true);
    setError(null);
    try {
      const method = editingDept === 'new' ? 'POST' : 'PUT';
      const url =
        editingDept === 'new'
          ? '/api/hierarchy/departments'
          : `/api/hierarchy/departments/${editingDept}`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: deptForm.code,
          name: deptForm.name,
          description: deptForm.description || null,
          parentId: deptForm.parentId || null,
          headEmployeeId: deptForm.headEmployeeId || null,
          fallbackApproverId: deptForm.fallbackApproverId || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save department');

      setSuccess('Department saved successfully');
      setEditingDept(null);
      setDeptForm({
        code: '',
        name: '',
        description: '',
        parentId: '',
        headEmployeeId: '',
        fallbackApproverId: '',
      });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Render tree node recursively
  const renderTreeNode = (
    node: TreeNode,
    depth: number = 0,
    isLast: boolean = true
  ): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.employee.id);
    const levelColor = getLevelColor(node.employee.hierarchy?.hierarchyLevel || 6);

    return (
      <div key={node.employee.id} className="relative">
        {/* Connection lines */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 h-full" style={{ width: depth * 40 }}>
            <div
              className="absolute border-l-2 border-dashed border-[#e5e5e0] dark:border-[#3e3d25]"
              style={{ left: (depth - 1) * 40 + 20, top: 0, height: isLast ? 28 : '100%' }}
            />
            <div
              className="absolute border-t-2 border-dashed border-[#e5e5e0] dark:border-[#3e3d25]"
              style={{ left: (depth - 1) * 40 + 20, top: 28, width: 20 }}
            />
          </div>
        )}

        {/* Node card */}
        <div
          className={`relative ml-${depth * 10} mb-2`}
          style={{ marginLeft: depth * 40 }}
          draggable={isHRAdmin}
          onDragStart={() => handleDragStart(node.employee.id)}
          onDragOver={e => e.preventDefault()}
          onDrop={() => handleDrop(node.employee.id)}
        >
          <div
            className={`
                        bg-surface-light dark:bg-surface-dark rounded-xl p-4 
                        border-2 ${draggedEmployee === node.employee.id ? 'border-primary' : 'border-[#e5e5e0] dark:border-[#3e3d25]'}
                        ${isHRAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-lg' : ''}
                        transition-all duration-200
                    `}
          >
            <div className="flex items-start gap-3">
              {/* Expand/collapse button */}
              {hasChildren && (
                <button
                  onClick={() => toggleNode(node.employee.id)}
                  className="mt-1 p-1 hover:bg-[#e5e5e0] dark:hover:bg-[#3e3d25] rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#8c8b5f]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#8c8b5f]" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-6" />}

              {/* Avatar */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${levelColor}`}
              >
                {node.employee.fullName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#181811] dark:text-white truncate">
                  {node.employee.fullName}
                </p>
                <p className="text-sm text-[#8c8b5f] truncate">
                  {node.employee.hierarchy?.positionTitle || node.employee.designation}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {node.employee.hierarchy?.deptName && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {node.employee.hierarchy.deptName}
                    </span>
                  )}
                  {node.employee.hierarchy?.levelName && (
                    <span className={`text-xs px-2 py-0.5 rounded text-white ${levelColor}`}>
                      {node.employee.hierarchy.levelName}
                    </span>
                  )}
                  {node.employee.hierarchy?.canApproveLeave && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      ✓ Approver
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isHRAdmin && (
                <button
                  onClick={() => {
                    setEditingEmployee(node.employee.id);
                    setEditForm({
                      reportsToId: node.employee.hierarchy?.reportsToId || '',
                      departmentId: node.employee.hierarchy?.departmentId || '',
                      positionTitle: node.employee.hierarchy?.positionTitle || '',
                      hierarchyLevel: node.employee.hierarchy?.hierarchyLevel || 6,
                      canApproveLeave: node.employee.hierarchy?.canApproveLeave || false,
                    });
                  }}
                  className="p-2 text-[#8c8b5f] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Direct reports count */}
            {hasChildren && (
              <div className="mt-3 pt-3 border-t border-[#e5e5e0] dark:border-[#3e3d25] flex items-center gap-2 text-xs text-[#8c8b5f]">
                <GitBranch className="w-3 h-3" />
                {node.children.length} direct report{node.children.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children
              .sort(
                (a, b) =>
                  (a.employee.hierarchy?.hierarchyLevel || 99) -
                  (b.employee.hierarchy?.hierarchyLevel || 99)
              )
              .map((child, idx) =>
                renderTreeNode(child, depth + 1, idx === node.children.length - 1)
              )}
          </div>
        )}
      </div>
    );
  };

  const getLevelColor = (level: number): string => {
    const colors = [
      'bg-purple-600', // 1 - Executive
      'bg-blue-600', // 2 - Senior Director
      'bg-cyan-600', // 3 - Director
      'bg-teal-600', // 4 - Senior Manager
      'bg-emerald-600', // 5 - Manager
      'bg-amber-600', // 6 - Team Lead
      'bg-orange-500', // 7 - Staff
    ];
    return colors[Math.min(level - 1, colors.length - 1)] || 'bg-slate-500';
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-[#8c8b5f]">Loading organization structure...</p>
        </div>
      </div>
    );
  }

  if (!isHRAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#181811] dark:text-white mb-2">Access Denied</h1>
          <p className="text-[#8c8b5f]">Only HR Administrators can access the Hierarchy Builder.</p>
        </div>
      </div>
    );
  }

  const tree = buildTree();
  const configuredCount = employees.filter(e => e.hierarchy).length;
  const unconfiguredCount = employees.filter(e => !e.hierarchy).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#181811] dark:text-white">
            Organization Hierarchy
          </h1>
          <p className="text-[#8c8b5f] text-sm mt-1">
            Configure reporting structure and approval chains
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-light dark:bg-surface-dark hover:bg-[#e5e5e0] dark:hover:bg-[#3e3d25] border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-500" />
          <span className="text-emerald-700 dark:text-emerald-400">{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#181811] dark:text-white">
                {employees.length}
              </p>
              <p className="text-xs text-[#8c8b5f]">Total Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#181811] dark:text-white">{configuredCount}</p>
              <p className="text-xs text-[#8c8b5f]">Configured</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#181811] dark:text-white">
                {unconfiguredCount}
              </p>
              <p className="text-xs text-[#8c8b5f]">Unconfigured</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-[#e5e5e0] dark:border-[#3e3d25]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#181811] dark:text-white">
                {departments.length}
              </p>
              <p className="text-xs text-[#8c8b5f]">Departments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'tree'
              ? 'border-primary text-primary'
              : 'border-transparent text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white'
          }`}
        >
          <Network className="w-4 h-4" />
          Tree View
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          List View
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'departments'
              ? 'border-primary text-primary'
              : 'border-transparent text-[#8c8b5f] hover:text-[#181811] dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments
        </button>
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#181811] dark:text-white">Edit Position</h2>
              <button
                onClick={() => setEditingEmployee(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
              >
                <X className="w-5 h-5 text-[#8c8b5f]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Reports To
                </label>
                <select
                  value={editForm.reportsToId}
                  onChange={e => setEditForm({ ...editForm, reportsToId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                >
                  <option value="">No supervisor (Top Level)</option>
                  {employees
                    .filter(e => e.id !== editingEmployee)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Department
                </label>
                <select
                  value={editForm.departmentId}
                  onChange={e => setEditForm({ ...editForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                >
                  <option value="">No department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Hierarchy Level
                </label>
                <select
                  value={editForm.hierarchyLevel}
                  onChange={e =>
                    setEditForm({ ...editForm, hierarchyLevel: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                >
                  {hierarchyLevels.map(l => (
                    <option key={l.level_number} value={l.level_number}>
                      {l.level_number}. {l.level_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                  Position Title
                </label>
                <input
                  type="text"
                  value={editForm.positionTitle}
                  onChange={e => setEditForm({ ...editForm, positionTitle: e.target.value })}
                  placeholder="e.g. Senior Manager"
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canApprove"
                  checked={editForm.canApproveLeave}
                  onChange={e => setEditForm({ ...editForm, canApproveLeave: e.target.checked })}
                  className="w-4 h-4 rounded border-[#e5e5e0]"
                />
                <label htmlFor="canApprove" className="text-sm text-[#181811] dark:text-white">
                  Can approve leave requests
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingEmployee(null)}
                className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEmployee(editingEmployee)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tree View */}
      {activeTab === 'tree' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25] p-6">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            💡 <strong>Tip:</strong> Drag and drop employee cards to change their reporting line
          </div>
          <div className="space-y-2">
            {tree.map((node, idx) => renderTreeNode(node, 0, idx === tree.length - 1))}
            {tree.length === 0 && (
              <div className="text-center py-12 text-[#8c8b5f]">
                <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hierarchy configured yet.</p>
                <p className="text-sm mt-2">Switch to List View to configure employee positions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e5e0] dark:border-[#3e3d25]">
          <div className="p-5 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
            <h2 className="font-semibold text-[#181811] dark:text-white">All Employees</h2>
            <p className="text-sm text-[#8c8b5f]">
              Click edit to configure position and reporting line
            </p>
          </div>
          <div className="divide-y divide-[#e5e5e0] dark:divide-[#3e3d25]">
            {employees.map(emp => (
              <div
                key={emp.id}
                className="p-4 flex items-center justify-between hover:bg-[#f9f9f7] dark:hover:bg-[#1a1909] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getLevelColor(emp.hierarchy?.hierarchyLevel || 6)}`}
                  >
                    {emp.fullName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-[#181811] dark:text-white">{emp.fullName}</p>
                    <p className="text-sm text-[#8c8b5f]">
                      {emp.hierarchy?.positionTitle || emp.designation}
                      {emp.hierarchy?.deptName && (
                        <span className="ml-2 text-indigo-600">• {emp.hierarchy.deptName}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {emp.hierarchy?.supervisorName && (
                    <span className="text-sm text-[#8c8b5f]">→ {emp.hierarchy.supervisorName}</span>
                  )}
                  {!emp.hierarchy && (
                    <span className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      Not configured
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setEditingEmployee(emp.id);
                      setEditForm({
                        reportsToId: emp.hierarchy?.reportsToId || '',
                        departmentId: emp.hierarchy?.departmentId || '',
                        positionTitle: emp.hierarchy?.positionTitle || '',
                        hierarchyLevel: emp.hierarchy?.hierarchyLevel || 6,
                        canApproveLeave: emp.hierarchy?.canApproveLeave || false,
                      });
                    }}
                    className="p-2 text-[#8c8b5f] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingDept('new');
                setDeptForm({
                  code: '',
                  name: '',
                  description: '',
                  parentId: '',
                  headEmployeeId: '',
                  fallbackApproverId: '',
                });
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>

          {/* Department Form Modal */}
          {editingDept && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#181811] dark:text-white">
                    {editingDept === 'new' ? 'Add New Department' : 'Edit Department'}
                  </h2>
                  <button
                    onClick={() => setEditingDept(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
                  >
                    <X className="w-5 h-5 text-[#8c8b5f]" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                        Code *
                      </label>
                      <input
                        type="text"
                        value={deptForm.code}
                        onChange={e =>
                          setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })
                        }
                        placeholder="HR"
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={deptForm.name}
                        onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                        placeholder="Human Resources"
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={deptForm.description}
                      onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                      Department Head
                    </label>
                    <select
                      value={deptForm.headEmployeeId}
                      onChange={e => setDeptForm({ ...deptForm, headEmployeeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                    >
                      <option value="">Select head</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#181811] dark:text-white mb-1">
                      Fallback Approver
                    </label>
                    <select
                      value={deptForm.fallbackApproverId}
                      onChange={e =>
                        setDeptForm({ ...deptForm, fallbackApproverId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] bg-transparent"
                    >
                      <option value="">Select fallback</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.fullName}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[#8c8b5f] mt-1">
                      Used for employees without a direct supervisor
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditingDept(null)}
                    className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDepartment}
                    disabled={saving || !deptForm.code || !deptForm.name}
                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Department'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Departments List */}
          <div className="grid grid-cols-2 gap-4">
            {departments.map(dept => (
              <div
                key={dept.id}
                className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-[#e5e5e0] dark:border-[#3e3d25]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#181811] dark:text-white">{dept.name}</h3>
                      <p className="text-xs text-[#8c8b5f]">{dept.code}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingDept(dept.id);
                      setDeptForm({
                        code: dept.code,
                        name: dept.name,
                        description: dept.description || '',
                        parentId: dept.parentId || '',
                        headEmployeeId: dept.headEmployeeId || '',
                        fallbackApproverId: dept.fallbackApproverId || '',
                      });
                    }}
                    className="p-2 text-[#8c8b5f] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8c8b5f]">Head:</span>
                    <span className="text-[#181811] dark:text-white">
                      {dept.headName || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8c8b5f]">Fallback:</span>
                    <span className="text-[#181811] dark:text-white">
                      {dept.fallbackName || 'Not assigned'}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-[#e5e5e0] dark:border-[#3e3d25]">
                    <span className="text-xs px-2 py-1 rounded bg-[#f5f5f0] dark:bg-[#2e2d15] text-[#8c8b5f]">
                      {employees.filter(e => e.hierarchy?.departmentId === dept.id).length}{' '}
                      employees
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchyBuilderScreen;
