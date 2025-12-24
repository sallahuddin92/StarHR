import React, { useEffect, useState, useRef } from 'react';
import { api, ApiError } from '../src/lib/api';
import type { Screen } from '../App';

type EmployeeRow = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
};

interface EmployeeMasterScreenProps {
  onNavigate: (screen: Screen) => void;
}

type TabMode = 'records' | 'import' | 'hierarchy';

const EmployeeMasterScreen: React.FC<EmployeeMasterScreenProps> = ({ onNavigate }) => {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);

  // Hierarchy import state
  const [hierarchyFile, setHierarchyFile] = useState<File | null>(null);
  const [hierarchyData, setHierarchyData] = useState<any[]>([]);
  const [hierarchyImportLoading, setHierarchyImportLoading] = useState(false);
  const [hierarchyImportResult, setHierarchyImportResult] = useState<any>(null);
  const [hierarchyValidation, setHierarchyValidation] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [hierarchyDragging, setHierarchyDragging] = useState(false);
  const hierarchyFileRef = useRef<HTMLInputElement>(null);

  // Helper to parse hierarchy CSV file
  const parseHierarchyFile = (file: File) => {
    setHierarchyFile(file);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => !line.startsWith('#') && line.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines
        .slice(1)
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
          const row: any = {};
          headers.forEach((h, i) => (row[h] = values[i] || ''));
          return row;
        })
        .filter(row => row.Employee_Code);

      setHierarchyData(data);
      setHierarchyImportResult(null);
    };
    reader.readAsText(file);
  };

  // Authenticated file download helper
  const downloadWithAuth = async (
    url: string,
    filename: string,
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  // Validate data before import
  const validateHierarchyData = async () => {
    setHierarchyImportLoading(true);
    setHierarchyValidation(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/hierarchy/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: hierarchyData }),
      });
      const result = await response.json();
      setHierarchyValidation(result.data);
      setShowConfirmModal(true);
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setHierarchyImportLoading(false);
    }
  };

  // Perform actual import
  const performImport = async () => {
    setShowConfirmModal(false);
    setHierarchyImportLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/hierarchy/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: hierarchyData }),
      });
      const result = await response.json();
      setHierarchyImportResult(result);
      setHierarchyValidation(null);
    } catch (err: any) {
      setHierarchyImportResult({ success: false, message: err.message });
    } finally {
      setHierarchyImportLoading(false);
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.employees.getAll();
        setEmployees(response.data || []);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to fetch employees';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden">
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-wrap gap-2 px-1">
          <button
            className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal hover:underline"
            onClick={() => onNavigate('Dashboard')}
          >
            Home
          </button>
          <span className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal">
            /
          </span>
          <button
            className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal hover:underline"
            onClick={() => onNavigate('Dashboard')}
          >
            HR
          </button>
          <span className="text-[#8c8b5f] dark:text-[#a3a272] text-sm font-medium leading-normal">
            /
          </span>
          <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
            Employee Master
          </span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">
              Employee Master
            </h1>
            <p className="text-[#8c8b5f] dark:text-[#a3a272] text-base font-normal max-w-2xl">
              Manage employee data, import bulk records, and validate hierarchy assignments.
            </p>
          </div>
          <div className="bg-[#e6e6db] dark:bg-[#3a392a] p-1 rounded-full flex items-center">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'records' ? 'bg-primary text-black shadow-sm font-bold' : 'text-[#6b6a48] dark:text-[#a3a272] hover:text-slate-900 dark:hover:text-white'}`}
              onClick={() => setActiveTab('records')}
            >
              View Records
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'import' ? 'bg-primary text-black shadow-sm font-bold' : 'text-[#6b6a48] dark:text-[#a3a272] hover:text-slate-900 dark:hover:text-white'}`}
              onClick={() => setActiveTab('import')}
            >
              Bulk Import
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'hierarchy' ? 'bg-primary text-black shadow-sm font-bold' : 'text-[#6b6a48] dark:text-[#a3a272] hover:text-slate-900 dark:hover:text-white'}`}
              onClick={() => setActiveTab('hierarchy')}
            >
              Hierarchy Import
            </button>
          </div>
        </div>

        {/* Hierarchy Import Tab */}
        {activeTab === 'hierarchy' && (
          <div className="bg-white dark:bg-[#1a190b] rounded-xl p-8 border border-[#e6e6db] dark:border-[#3a392a] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Organization Hierarchy Import
                </h2>
                <p className="text-sm text-[#8c8b5f] mt-1">
                  Download template, distribute to departments, then upload completed file
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    downloadWithAuth(
                      '/api/hierarchy/template',
                      'hierarchy_template.csv',
                      setDownloadingTemplate
                    )
                  }
                  disabled={downloadingTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">
                    {downloadingTemplate ? 'progress_activity' : 'download'}
                  </span>
                  {downloadingTemplate ? 'Downloading...' : 'Download Template'}
                </button>
                <button
                  onClick={() =>
                    downloadWithAuth(
                      '/api/hierarchy/export',
                      'hierarchy_export.csv',
                      setDownloadingExport
                    )
                  }
                  disabled={downloadingExport}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">
                    {downloadingExport ? 'progress_activity' : 'table_chart'}
                  </span>
                  {downloadingExport ? 'Exporting...' : 'Export Current Data'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-blue-600">looks_one</span>
                  <span className="font-semibold text-blue-800 dark:text-blue-300">
                    Download Template
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Get the CSV template with all employees and department codes
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-600">looks_two</span>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    Distribute to Departments
                  </span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Each department fills in their reporting lines and positions
                </p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600">looks_3</span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Upload & Apply
                  </span>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  HR uploads the completed file to update system-wide
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={hierarchyFileRef}
              className="hidden"
              accept=".csv"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) parseHierarchyFile(file);
              }}
            />

            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
                hierarchyDragging
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
                  : hierarchyFile
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-[#f8f8f5] dark:bg-[#1a1909] border-[#e6e6db] dark:border-[#3a392a] hover:border-primary/50 hover:bg-primary/5'
              }`}
              onClick={() => hierarchyFileRef.current?.click()}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
                setHierarchyDragging(true);
              }}
              onDragEnter={e => {
                e.preventDefault();
                e.stopPropagation();
                setHierarchyDragging(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
                setHierarchyDragging(false);
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                setHierarchyDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.name.endsWith('.csv')) {
                  parseHierarchyFile(file);
                }
              }}
            >
              <div
                className={`size-16 rounded-full flex items-center justify-center transition-all ${
                  hierarchyDragging
                    ? 'bg-primary/30 animate-pulse'
                    : hierarchyFile
                      ? 'bg-emerald-100 dark:bg-emerald-800'
                      : 'bg-primary/20'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${
                    hierarchyDragging
                      ? 'text-primary animate-bounce'
                      : hierarchyFile
                        ? 'text-emerald-600'
                        : 'text-black/70 dark:text-white'
                  }`}
                >
                  {hierarchyDragging
                    ? 'file_download'
                    : hierarchyFile
                      ? 'check_circle'
                      : 'upload_file'}
                </span>
              </div>
              {hierarchyDragging ? (
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">Drop your CSV here!</p>
                  <p className="text-sm text-primary/70">Release to upload</p>
                </div>
              ) : hierarchyFile ? (
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {hierarchyFile.name}
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    ✓ {hierarchyData.length} records parsed successfully
                  </p>
                  <p className="text-xs text-[#8c8b5f] mt-1">
                    Click or drag another file to replace
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    Drag & Drop Your CSV Here
                  </p>
                  <p className="text-sm text-[#8c8b5f] mt-1">or click to browse files</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-[#8c8b5f]">
                    <span className="px-2 py-1 bg-white dark:bg-[#2a2910] rounded border border-[#e6e6db] dark:border-[#3a392a]">
                      📄 .csv
                    </span>
                    <span>Supports CSV format only</span>
                  </div>
                </div>
              )}
            </div>

            {hierarchyData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Preview ({hierarchyData.length} records)
                  </h3>
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-lg disabled:opacity-50"
                    disabled={hierarchyImportLoading}
                    onClick={validateHierarchyData}
                  >
                    {hierarchyImportLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">
                          progress_activity
                        </span>{' '}
                        Validating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">fact_check</span> Validate &amp;
                        Import
                      </>
                    )}
                  </button>
                </div>

                {/* Import Result Message - Prominent display */}
                {hierarchyImportResult && (
                  <div
                    className={`p-5 rounded-xl border-2 ${
                      hierarchyImportResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`size-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          hierarchyImportResult.success
                            ? 'bg-emerald-100 dark:bg-emerald-800'
                            : 'bg-red-100 dark:bg-red-800'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-2xl ${
                            hierarchyImportResult.success ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {hierarchyImportResult.success ? 'check_circle' : 'error'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`text-lg font-bold ${
                            hierarchyImportResult.success
                              ? 'text-emerald-800 dark:text-emerald-300'
                              : 'text-red-800 dark:text-red-300'
                          }`}
                        >
                          {hierarchyImportResult.success
                            ? '✓ Import Successful!'
                            : '✗ Import Failed'}
                        </h3>
                        <p
                          className={`mt-1 ${
                            hierarchyImportResult.success
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {hierarchyImportResult.message}
                        </p>
                        {hierarchyImportResult.details && (
                          <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            {hierarchyImportResult.details.new > 0 && (
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full">
                                {hierarchyImportResult.details.new} new
                              </span>
                            )}
                            {hierarchyImportResult.details.updated > 0 && (
                              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-full">
                                {hierarchyImportResult.details.updated} updated
                              </span>
                            )}
                            {hierarchyImportResult.details.errors > 0 && (
                              <span className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full">
                                {hierarchyImportResult.details.errors} errors
                              </span>
                            )}
                          </div>
                        )}
                        {hierarchyImportResult.details?.errorDetails?.length > 0 && (
                          <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-sm">
                            {hierarchyImportResult.details.errorDetails.map(
                              (e: string, i: number) => (
                                <p key={i} className="text-red-600 dark:text-red-400">
                                  • {e}
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setHierarchyImportResult(null)}
                        className="text-[#8c8b5f] hover:text-slate-700 dark:hover:text-white"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-[#e6e6db] dark:border-[#3a392a]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f8f8f5] dark:bg-[#23220f]">
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#8c8b5f]">
                          Employee
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#8c8b5f]">
                          Department
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#8c8b5f]">
                          Position
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#8c8b5f]">
                          Level
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#8c8b5f]">
                          Reports To
                        </th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-[#8c8b5f]">
                          Approver
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a392a]">
                      {hierarchyData.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#f8f8f5] dark:hover:bg-[#1a1909]">
                          <td className="py-2 px-3">
                            <span className="font-medium">{row.Employee_Code}</span>
                            <span className="text-[#8c8b5f] ml-2">{row.Full_Name}</span>
                          </td>
                          <td className="py-2 px-3">{row.Department_Code || '—'}</td>
                          <td className="py-2 px-3">{row.Position_Title || '—'}</td>
                          <td className="py-2 px-3">{row.Hierarchy_Level || '6'}</td>
                          <td className="py-2 px-3">{row.Reports_To_Code || '—'}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${row.Can_Approve_Leave?.toLowerCase() === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                            >
                              {row.Can_Approve_Leave || 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {hierarchyData.length > 20 && (
                    <div className="p-2 text-center text-sm text-[#8c8b5f] bg-[#f8f8f5] dark:bg-[#23220f]">
                      ... and {hierarchyData.length - 20} more records
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation Confirmation Modal */}
        {showConfirmModal && hierarchyValidation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#181811] dark:text-white">
                  Import Validation Summary
                </h2>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
                >
                  <span className="material-symbols-outlined text-[#8c8b5f]">close</span>
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {hierarchyValidation.newRecords}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">New Records</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {hierarchyValidation.updateRecords}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Updates (Override)</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-600">
                    {hierarchyValidation.duplicatesInFile}
                  </p>
                  <p className="text-xs text-slate-500">Duplicates Skipped</p>
                </div>
              </div>

              {/* Errors that block import */}
              {hierarchyValidation.missingEmployee.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      {hierarchyValidation.missingEmployee.length} Employee(s) Not Found
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                    These employee codes don't exist in the system. Fix before importing:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {hierarchyValidation.missingEmployee.slice(0, 10).map((code: string) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-xs rounded"
                      >
                        {code}
                      </span>
                    ))}
                    {hierarchyValidation.missingEmployee.length > 10 && (
                      <span className="text-xs text-red-500">
                        +{hierarchyValidation.missingEmployee.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings that don't block import */}
              {hierarchyValidation.missingSupervisor.length > 0 && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-500">warning</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {hierarchyValidation.missingSupervisor.length} Supervisor(s) Not Found
                    </span>
                  </div>
                  <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
                    {hierarchyValidation.missingSupervisor.slice(0, 5).map((line: string) => (
                      <p key={line}>• {line}</p>
                    ))}
                  </div>
                </div>
              )}

              {hierarchyValidation.selfReporting.length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-orange-500">warning</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">
                      {hierarchyValidation.selfReporting.length} Self-Reporting Detected
                    </span>
                  </div>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    These will be skipped: {hierarchyValidation.selfReporting.join(', ')}
                  </p>
                </div>
              )}

              {hierarchyValidation.invalidDepartment.length > 0 && (
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-500">info</span>
                    <span className="font-semibold text-purple-700 dark:text-purple-400">
                      {hierarchyValidation.invalidDepartment.length} Unknown Department(s)
                    </span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Department will be left blank for:{' '}
                    {hierarchyValidation.invalidDepartment.slice(0, 5).join(', ')}
                  </p>
                </div>
              )}

              {/* Confirmation section */}
              {hierarchyValidation.updateRecords > 0 &&
                hierarchyValidation.missingEmployee.length === 0 && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>
                        ⚠️ {hierarchyValidation.updateRecords} existing records will be overwritten.
                      </strong>{' '}
                      Make sure this is intentional.
                    </p>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#e5e5e0] dark:border-[#3e3d25] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2e2d15]"
                >
                  Cancel
                </button>
                <button
                  onClick={performImport}
                  disabled={!hierarchyValidation.valid || hierarchyImportLoading}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!hierarchyValidation.valid
                    ? 'Fix Errors First'
                    : `Confirm Import (${hierarchyValidation.newRecords + hierarchyValidation.updateRecords} records)`}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'import' && (
          <div className="bg-white dark:bg-[#1a190b] rounded-xl p-8 border border-[#e6e6db] dark:border-[#3a392a] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Bulk Employee Import
                </h2>
                <p className="text-sm text-[#8c8b5f] mt-1">
                  Upload CSV or Excel file to add/update employee records
                </p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Download Template
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
                  : selectedFile
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-[#f8f8f5] dark:bg-[#1a1909] border-[#e6e6db] dark:border-[#3a392a] hover:border-primary/50 hover:bg-primary/5'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragEnter={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (
                  file &&
                  (file.name.endsWith('.csv') ||
                    file.name.endsWith('.xlsx') ||
                    file.name.endsWith('.xls'))
                ) {
                  setSelectedFile(file);
                }
              }}
            >
              <div
                className={`size-16 rounded-full flex items-center justify-center transition-all ${
                  isDragging
                    ? 'bg-primary/30 animate-pulse'
                    : selectedFile
                      ? 'bg-emerald-100 dark:bg-emerald-800'
                      : 'bg-primary/20'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${
                    isDragging
                      ? 'text-primary animate-bounce'
                      : selectedFile
                        ? 'text-emerald-600'
                        : 'text-black/70 dark:text-white'
                  }`}
                >
                  {isDragging ? 'file_download' : selectedFile ? 'check_circle' : 'upload_file'}
                </span>
              </div>
              {isDragging ? (
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">Drop your file here!</p>
                  <p className="text-sm text-primary/70">Release to upload</p>
                </div>
              ) : selectedFile ? (
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    ✓ {(selectedFile.size / 1024).toFixed(1)} KB ready to import
                  </p>
                  <p className="text-xs text-[#8c8b5f] mt-1">
                    Click or drag another file to replace
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    Drag & Drop Your File Here
                  </p>
                  <p className="text-sm text-[#8c8b5f] mt-1">or click to browse files</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-[#8c8b5f]">
                    <span className="px-2 py-1 bg-white dark:bg-[#2a2910] rounded border border-[#e6e6db] dark:border-[#3a392a]">
                      📄 .csv
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-[#2a2910] rounded border border-[#e6e6db] dark:border-[#3a392a]">
                      📊 .xlsx
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-[#2a2910] rounded border border-[#e6e6db] dark:border-[#3a392a]">
                      📊 .xls
                    </span>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-lg">
                  <span className="material-symbols-outlined">upload</span>
                  Import Employees
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab === 'records' && (
          <div className="bg-white dark:bg-[#1a190b] rounded-xl border border-[#e6e6db] dark:border-[#3a392a] shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#e6e6db] dark:border-[#3a392a] flex items-center justify-between bg-white dark:bg-[#1a190b]">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Employees</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#f5f5f0] dark:bg-[#2c2b1a] text-xs font-medium text-[#8c8b5f]">
                  {employees.length} records
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {loading && <span className="text-[#8c8b5f]">Loading…</span>}
                {error && <span className="text-red-500">{error}</span>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f8f5] dark:bg-[#23220f] border-b border-[#e6e6db] dark:border-[#3a392a]">
                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                      Emp ID
                    </th>
                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                      Employee Name
                    </th>
                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                      Department
                    </th>
                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f]">
                      Designation
                    </th>
                    <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-[#8c8b5f] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e6db] dark:divide-[#3a392a]">
                  {employees.map(emp => (
                    <tr
                      key={emp.id}
                      className="hover:bg-[#f5f5f0] dark:hover:bg-[#2c2b1a] transition-colors"
                    >
                      <td className="py-4 px-6 text-sm font-medium">{emp.employee_id}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {emp.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {emp.full_name}
                            </span>
                            <span className="text-xs text-[#8c8b5f]">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900 dark:text-white">
                        {emp.department || '—'}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900 dark:text-white">
                        {emp.designation || '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="text-[#8c8b5f] hover:text-primary transition-colors p-1.5 rounded hover:bg-[#f5f5f0] dark:hover:bg-[#3a392a]"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && !loading && !error && (
                    <tr>
                      <td colSpan={4} className="py-6 px-6 text-sm text-[#8c8b5f] text-center">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#e6e6db] dark:border-[#3a392a] bg-[#f8f8f5] dark:bg-[#23220f] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-[#8c8b5f] order-2 sm:order-1">
                <span className="material-symbols-outlined text-lg">info</span>
                <p>
                  Only valid records will be processed. Invalid records must be corrected in the
                  source file and re-uploaded.
                </p>
              </div>
              <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                <button
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                  onClick={() => onNavigate('Dashboard')}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-black hover:bg-[#d6d305] shadow-md transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                  onClick={async () => {
                    const payloads = employees.map(emp => ({
                      employeeId: emp.employee_id,
                      fullName: emp.full_name,
                      email: emp.email,
                      department: emp.department || undefined,
                      designation: emp.designation || undefined,
                    }));

                    try {
                      await Promise.all(payloads.map(body => api.employees.create(body)));
                      alert('Employees saved');
                    } catch (err) {
                      const message =
                        err instanceof ApiError ? err.message : 'Failed to save employees';
                      alert(message);
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                  Save Valid Records
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#181811] dark:text-white">Employee Details</h2>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded"
              >
                <span className="material-symbols-outlined text-[#8c8b5f]">close</span>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold">
                {selectedEmployee.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#181811] dark:text-white">
                  {selectedEmployee.full_name}
                </h3>
                <p className="text-sm text-[#8c8b5f]">{selectedEmployee.employee_id}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
                <span className="text-[#8c8b5f]">Email</span>
                <span className="font-medium text-[#181811] dark:text-white">
                  {selectedEmployee.email}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
                <span className="text-[#8c8b5f]">Department</span>
                <span className="font-medium text-[#181811] dark:text-white">
                  {selectedEmployee.department || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
                <span className="text-[#8c8b5f]">Designation</span>
                <span className="font-medium text-[#181811] dark:text-white">
                  {selectedEmployee.designation || '—'}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-[#181811] font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMasterScreen;
