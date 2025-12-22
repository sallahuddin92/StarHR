import React, { useState, useEffect, useRef } from 'react';
import { api, EmployeeDocument, ApiError, PayslipPdfData, EaFormData } from '../src/lib/api';
import { Screen } from '../App';

interface DocumentCenterScreenProps {
    onNavigate: (screen: Screen) => void;
}

const StatusComponent: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'Ready':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><span className="material-symbols-outlined text-[16px]">check_circle</span>Ready</span>;
        case 'Generating':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><span className="material-symbols-outlined text-[16px] animate-spin">sync</span>Generating</span>;
        case 'Pending':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"><span className="material-symbols-outlined text-[16px]">pending</span>Pending</span>;
        case 'Error':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"><span className="material-symbols-outlined text-[16px]">error</span>Error</span>;
        default: return null;
    }
};

// PDF Preview Modal Component
const PdfPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    data: PayslipPdfData | EaFormData | null;
    type: 'payslip' | 'ea-form';
}> = ({ isOpen, onClose, data, type }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${type === 'payslip' ? 'Payslip' : 'EA Form'}</title>
            <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-name { font-size: 24px; font-weight: bold; } .document-title { font-size: 18px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
            .section-title { font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 10px 15px; }
            .row { display: flex; justify-content: space-between; padding: 8px 15px; border-bottom: 1px solid #eee; }
            .label { color: #666; } .value { font-weight: 600; } .total-row { background: #f9f9f9; font-weight: bold; }
            .net-pay { font-size: 20px; background: #e8f5e9; padding: 20px; text-align: center; margin-top: 20px; border-radius: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; } @media print { body { padding: 0; } }</style>
            </head><body>${content.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    const handleDownload = () => {
        const content = printRef.current;
        if (!content) return;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${type === 'payslip' ? 'Payslip' : 'EA Form'}</title>
            <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-name { font-size: 24px; font-weight: bold; } .document-title { font-size: 16px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
            .section-title { font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 10px 15px; }
            .row { display: flex; justify-content: space-between; padding: 8px 15px; border-bottom: 1px solid #eee; }
            .label { color: #666; } .value { font-weight: 600; } .total-row { background: #f9f9f9; }
            .net-pay { font-size: 20px; background: #e8f5e9; padding: 20px; text-align: center; margin-top: 20px; border-radius: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; }</style>
            </head><body>${content.innerHTML}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'payslip' ? 'Payslip' : 'EA-Form'}-${data?.employeeCode || 'document'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen || !data) return null;
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#23220f] rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">
                    <h3 className="text-lg font-bold text-[#181811] dark:text-white">{type === 'payslip' ? 'Payslip Preview' : 'EA Form Preview'}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[18px]">download</span>Download
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[18px]">print</span>Print
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#3e3d25] rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-[20px] text-[#8c8b5f]">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#1a1909]">
                    <div ref={printRef} className="bg-white p-8 rounded-lg shadow max-w-2xl mx-auto">
                        {type === 'payslip' && data.type === 'payslip' ? (
                            <>
                                <div className="header"><div className="company-name">{(data as PayslipPdfData).companyName}</div><div className="document-title">PAYSLIP - {(data as PayslipPdfData).periodDisplay}</div></div>
                                <div className="section"><div className="section-title">Employee Information</div>
                                    <div className="row"><span className="label">Employee Name</span><span className="value">{data.employeeName}</span></div>
                                    <div className="row"><span className="label">Employee ID</span><span className="value">{data.employeeCode}</span></div>
                                    <div className="row"><span className="label">Department</span><span className="value">{(data as PayslipPdfData).department}</span></div>
                                </div>
                                <div className="section"><div className="section-title">Earnings</div>
                                    <div className="row"><span className="label">Basic Salary</span><span className="value">{formatCurrency((data as PayslipPdfData).earnings.basicSalary)}</span></div>
                                    <div className="row"><span className="label">Allowances</span><span className="value">{formatCurrency((data as PayslipPdfData).earnings.allowances)}</span></div>
                                    <div className="row total-row"><span className="label">Gross Total</span><span className="value">{formatCurrency((data as PayslipPdfData).earnings.grossTotal)}</span></div>
                                </div>
                                <div className="section"><div className="section-title">Deductions</div>
                                    <div className="row"><span className="label">EPF (11%)</span><span className="value">{formatCurrency((data as PayslipPdfData).deductions.epfEmployee)}</span></div>
                                    <div className="row"><span className="label">SOCSO</span><span className="value">{formatCurrency((data as PayslipPdfData).deductions.socsoEmployee)}</span></div>
                                    <div className="row"><span className="label">EIS</span><span className="value">{formatCurrency((data as PayslipPdfData).deductions.eisEmployee)}</span></div>
                                    <div className="row"><span className="label">PCB (Tax)</span><span className="value">{formatCurrency((data as PayslipPdfData).deductions.pcb)}</span></div>
                                    <div className="row total-row"><span className="label">Total Deductions</span><span className="value">{formatCurrency((data as PayslipPdfData).deductions.totalDeductions)}</span></div>
                                </div>
                                <div className="net-pay"><div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>NET PAY</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>{formatCurrency((data as PayslipPdfData).netPay)}</div></div>
                                <div className="footer"><p>Payment Date: {(data as PayslipPdfData).paymentDate} | This is a computer-generated document.</p></div>
                            </>
                        ) : (
                            <>
                                <div className="header"><div className="company-name">BORANG EA / EA FORM</div><div className="document-title">Annual Remuneration Statement - {(data as EaFormData).year}</div></div>
                                <div className="section"><div className="section-title">Part A - Employer Details</div>
                                    <div className="row"><span className="label">Employer No.</span><span className="value">{(data as EaFormData).employerNo}</span></div>
                                    <div className="row"><span className="label">Employer Name</span><span className="value">{(data as EaFormData).employerName}</span></div>
                                </div>
                                <div className="section"><div className="section-title">Part B - Employee Details</div>
                                    <div className="row"><span className="label">Employee No.</span><span className="value">{(data as EaFormData).employeeNo}</span></div>
                                    <div className="row"><span className="label">Employee Name</span><span className="value">{(data as EaFormData).employeeName}</span></div>
                                    <div className="row"><span className="label">IC No.</span><span className="value">{(data as EaFormData).icNo}</span></div>
                                </div>
                                <div className="section"><div className="section-title">Part D - Gross Remuneration</div>
                                    <div className="row"><span className="label">Salary/Wages</span><span className="value">{formatCurrency((data as EaFormData).salaryWages)}</span></div>
                                    <div className="row total-row"><span className="label">Total Gross</span><span className="value">{formatCurrency((data as EaFormData).totalGrossRemuneration)}</span></div>
                                </div>
                                <div className="section"><div className="section-title">Part E - Deductions</div>
                                    <div className="row"><span className="label">EPF Contribution</span><span className="value">{formatCurrency((data as EaFormData).epfContribution)}</span></div>
                                    <div className="row"><span className="label">SOCSO</span><span className="value">{formatCurrency((data as EaFormData).socsoContribution)}</span></div>
                                </div>
                                <div className="section"><div className="section-title">Part F - Tax Deducted</div>
                                    <div className="row"><span className="label">PCB Deducted</span><span className="value">{formatCurrency((data as EaFormData).pcbDeducted)}</span></div>
                                    <div className="row total-row"><span className="label">Total Tax</span><span className="value">{formatCurrency((data as EaFormData).totalTaxDeducted)}</span></div>
                                </div>
                                <div className="footer"><p>Form No: {(data as EaFormData).formNo} | Prepared per Income Tax Act 1967</p></div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const DocumentCenterScreen: React.FC<DocumentCenterScreenProps> = ({ onNavigate }) => {
    const [selectedProcess, setSelectedProcess] = useState<'payslip' | 'ea-form'>('payslip');
    const [employeeDocs, setEmployeeDocs] = useState<EmployeeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pagination, setPagination] = useState({ total: 0, limit: 100, offset: 0 });
    const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; data: PayslipPdfData | EaFormData | null; type: 'payslip' | 'ea-form' }>({ isOpen: false, data: null, type: 'payslip' });
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentYear = new Date().getFullYear().toString();

    useEffect(() => {
        fetchEmployeeDocuments();
    }, [selectedProcess]);

    const fetchEmployeeDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.documents.getEmployees({
                type: selectedProcess,
                period: currentPeriod,
            });
            if (response.success && response.data) {
                setEmployeeDocs(response.data);
                // Auto-select all "Ready" documents
                const readyIds = new Set(response.data.filter(d => d.status === 'Ready').map(d => d.id));
                setSelectedIds(readyIds);
                if (response.pagination) {
                    setPagination(response.pagination as any);
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to load documents';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = async (emp: EmployeeDocument) => {
        try {
            setDownloadingId(emp.id);
            if (selectedProcess === 'payslip') {
                const response = await api.documents.getPayslipPdf(emp.employeeId, currentPeriod);
                if (response.success && response.data) {
                    setPreviewModal({ isOpen: true, data: response.data, type: 'payslip' });
                }
            } else {
                const response = await api.documents.getEaForm(emp.employeeId, currentYear);
                if (response.success && response.data) {
                    setPreviewModal({ isOpen: true, data: response.data, type: 'ea-form' });
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to load document';
            setToast({ message, type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setDownloadingId(null);
        }
    };

    // Alias for preview button
    const handlePreview = handleViewDocument;

    // Direct PDF download handler
    const handleDownloadPdf = async (emp: EmployeeDocument) => {
        try {
            setDownloadingId(emp.id);
            if (selectedProcess === 'payslip') {
                const response = await api.documents.getPayslipPdf(emp.employeeId, currentPeriod);
                if (response.success && response.data) {
                    // Generate HTML and trigger download
                    const data = response.data;
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip - ${data.employeeName}</title>
                        <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                        .company-name { font-size: 24px; font-weight: bold; } .document-title { font-size: 16px; color: #666; margin-top: 5px; }
                        .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
                        .section-title { font-size: 14px; font-weight: bold; background: #f5f5f5; padding: 10px 15px; }
                        .row { display: flex; justify-content: space-between; padding: 8px 15px; border-bottom: 1px solid #eee; }
                        .label { color: #666; } .value { font-weight: 600; } .total-row { background: #f9f9f9; }
                        .net-pay { font-size: 20px; background: #e8f5e9; padding: 20px; text-align: center; margin-top: 20px; border-radius: 8px; }
                        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; }</style>
                        </head><body>
                        <div class="header"><div class="company-name">${data.companyName}</div><div class="document-title">PAYSLIP - ${data.periodDisplay}</div></div>
                        <div class="section"><div class="section-title">Employee Details</div>
                        <div class="row"><span class="label">Name</span><span class="value">${data.employeeName}</span></div>
                        <div class="row"><span class="label">Employee ID</span><span class="value">${data.employeeCode}</span></div>
                        <div class="row"><span class="label">Department</span><span class="value">${data.department}</span></div></div>
                        <div class="section"><div class="section-title">Earnings</div>
                        <div class="row"><span class="label">Basic Salary</span><span class="value">RM ${data.earnings.basicSalary.toLocaleString()}</span></div>
                        <div class="row"><span class="label">Allowances</span><span class="value">RM ${data.earnings.allowances.toLocaleString()}</span></div>
                        <div class="row"><span class="label">Overtime</span><span class="value">RM ${data.earnings.overtime.toLocaleString()}</span></div>
                        <div class="row total-row"><span class="label"><strong>Gross Total</strong></span><span class="value"><strong>RM ${data.earnings.grossTotal.toLocaleString()}</strong></span></div></div>
                        <div class="section"><div class="section-title">Deductions</div>
                        <div class="row"><span class="label">EPF (11%)</span><span class="value">RM ${data.deductions.epfEmployee.toLocaleString()}</span></div>
                        <div class="row"><span class="label">SOCSO</span><span class="value">RM ${data.deductions.socsoEmployee.toLocaleString()}</span></div>
                        <div class="row"><span class="label">EIS</span><span class="value">RM ${data.deductions.eisEmployee.toLocaleString()}</span></div>
                        <div class="row"><span class="label">PCB (Tax)</span><span class="value">RM ${data.deductions.pcb.toLocaleString()}</span></div>
                        <div class="row total-row"><span class="label"><strong>Total Deductions</strong></span><span class="value"><strong>RM ${Number(data.deductions.totalDeductions).toFixed(2)}</strong></span></div></div>
                        <div class="net-pay"><strong>NET PAY: RM ${Number(data.netPay).toFixed(2)}</strong></div>
                        <div class="footer">Generated: ${new Date().toLocaleDateString('en-MY')}</div>
                        </body></html>`;
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Payslip-${data.employeeCode}-${currentPeriod}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setToast({ message: `Payslip downloaded for ${data.employeeName}`, type: 'success' });
                }
            } else {
                const response = await api.documents.getEaForm(emp.employeeId, currentYear);
                if (response.success && response.data) {
                    setToast({ message: 'EA Form download started', type: 'success' });
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to download document';
            setToast({ message, type: 'error' });
        } finally {
            setDownloadingId(null);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleBatchDownload = async () => {
        try {
            const selectedEmployeeIds = employeeDocs
                .filter(d => selectedIds.has(d.id) && d.status === 'Ready')
                .map(d => d.employeeId);
            const response = await api.documents.downloadBatch({
                type: selectedProcess,
                period: selectedProcess === 'payslip' ? currentPeriod : currentYear,
                employeeIds: selectedEmployeeIds,
            });
            if (response.success) {
                setToast({ message: `Batch download initiated for ${response.data?.documentCount || selectedEmployeeIds.length} documents`, type: 'success' });
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Batch download failed';
            setToast({ message, type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleBroadcast = async () => {
        setBroadcastLoading(true);
        try {
            const selectedEmployeeIds = employeeDocs
                .filter(d => selectedIds.has(d.id) && d.status === 'Ready')
                .map(d => d.employeeId);

            const response = await api.documents.broadcast({
                channel: 'whatsapp',
                employeeIds: selectedEmployeeIds,
            });

            if (response.success) {
                setToast({
                    message: `Documents queued for ${response.data?.recipientCount || selectedEmployeeIds.length} employees!`,
                    type: 'success'
                });
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Broadcast failed';
            setToast({ message, type: 'error' });
        } finally {
            setBroadcastLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const readyIds = new Set(employeeDocs.filter(d => d.status === 'Ready').map(d => d.id));
            setSelectedIds(readyIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getDeptColorClass = (dept: string) => {
        const colors: Record<string, string> = {
            'Engineering': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'Marketing': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            'Sales': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            'HR': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            'Finance': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        };
        return colors[dept] || 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    };

    const readyCount = employeeDocs.filter(d => d.status === 'Ready').length;
    const progressPercent = employeeDocs.length > 0 ? Math.round((readyCount / employeeDocs.length) * 100) : 0;

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#181811] dark:text-white font-display min-h-screen flex flex-col">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    <span className="material-symbols-outlined text-sm">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {toast.message}
                </div>
            )}

            {/* PDF Preview Modal */}
            <PdfPreviewModal
                isOpen={previewModal.isOpen}
                onClose={() => setPreviewModal({ isOpen: false, data: null, type: 'payslip' })}
                data={previewModal.data}
                type={previewModal.type}
            />

            <div className="flex-1 p-4 md:p-8">
                <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                        <nav className="flex items-center gap-2 text-sm text-[#8c8b5f]"><button onClick={() => onNavigate('Dashboard')} className="hover:text-[#181811] dark:hover:text-white transition-colors">Home</button><span className="material-symbols-outlined text-[16px]">chevron_right</span><span className="text-[#181811] dark:text-white font-medium">Document Center</span></nav>
                        <div className="flex flex-wrap justify-between items-end gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-[#181811] dark:text-white tracking-tight mb-2">Document Center</h1>
                                <p className="text-[#8c8b5f] text-base md:text-lg max-w-2xl">Batch process and generate employee documents for payroll and tax compliance.</p>
                            </div>
                            <div className="flex gap-2"><button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#2e2d15] border border-[#e5e5e0] dark:border-[#3e3d25] rounded-full text-sm font-medium text-[#181811] dark:text-white hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] transition-colors"><span className="material-symbols-outlined text-[20px]">history</span>History Log</button></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
                        <div className="relative group cursor-pointer" onClick={() => setSelectedProcess('payslip')}>
                            <div className={`absolute inset-0 rounded-xl blur-sm transition-opacity ${selectedProcess === 'payslip' ? 'bg-primary/20 dark:bg-primary/10 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-neutral-200/50 dark:group-hover:bg-neutral-800/50'}`}></div>
                            <div className={`relative h-full flex flex-col p-6 rounded-xl bg-surface-light dark:bg-surface-dark transition-all ${selectedProcess === 'payslip' ? 'border-2 border-primary' : 'border border-[#e5e5e0] dark:border-[#3e3d25] hover:border-[#8c8b5f] dark:hover:border-neutral-500'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-primary/20 rounded-full text-[#181811]"><span className="material-symbols-outlined text-[32px]">receipt_long</span></div>
                                    {selectedProcess === 'payslip' && <div className="px-3 py-1 bg-primary text-[#181811] text-xs font-bold uppercase rounded-full tracking-wide">Selected</div>}
                                </div>
                                <h3 className="text-xl font-bold text-[#181811] dark:text-white mb-2">Payslip Run</h3>
                                <p className="text-[#8c8b5f] text-sm leading-relaxed mb-6">Generate monthly salary slips for all active employees. Includes standard deductions and bonus calculations.</p>
                                <div className="mt-auto pt-4 border-t border-[#e5e5e0] dark:border-[#3e3d25] flex items-center text-sm font-medium text-[#181811] dark:text-white"><span>Current period: {currentPeriod}</span></div>
                            </div>
                        </div>
                        <div className="relative group cursor-pointer" onClick={() => setSelectedProcess('ea-form')}>
                            <div className={`absolute inset-0 rounded-xl blur-sm transition-opacity ${selectedProcess === 'ea-form' ? 'bg-primary/20 dark:bg-primary/10 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:bg-neutral-200/50 dark:group-hover:bg-neutral-800/50'}`}></div>
                            <div className={`relative h-full flex flex-col p-6 rounded-xl bg-surface-light dark:bg-surface-dark transition-all ${selectedProcess === 'ea-form' ? 'border-2 border-primary' : 'border border-[#e5e5e0] dark:border-[#3e3d25] hover:border-[#8c8b5f] dark:hover:border-neutral-500'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-[#f5f5f0] dark:bg-[#3e3d25] rounded-full text-[#8c8b5f] group-hover:text-[#181811] dark:group-hover:text-white transition-colors"><span className="material-symbols-outlined text-[32px]">description</span></div>
                                    {selectedProcess === 'ea-form' && <div className="px-3 py-1 bg-primary text-[#181811] text-xs font-bold uppercase rounded-full tracking-wide">Selected</div>}
                                </div>
                                <h3 className="text-xl font-bold text-[#181811] dark:text-white mb-2">EA Form Generation</h3>
                                <p className="text-[#8c8b5f] text-sm leading-relaxed mb-6">Process annual tax forms for the fiscal year. Requires finalized annual payroll data.</p>
                                <div className="mt-auto pt-4 border-t border-[#e5e5e0] dark:border-[#3e3d25] flex items-center text-sm font-medium text-[#8c8b5f]"><span>Scheduled: Dec 31, 2025</span></div>
                            </div>
                        </div>
                    </div>

                    {selectedProcess === 'payslip' && (
                        <div className="flex flex-col gap-6 p-6 md:p-8 bg-surface-light dark:bg-surface-dark border border-[#e5e5e0] dark:border-[#3e3d25] rounded-xl shadow-sm mt-2 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
                            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-lg font-bold text-[#181811] dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">play_circle</span>
                                        Active Run: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h2>
                                    <p className="text-sm text-[#8c8b5f]">Batch ID: #PAY-{currentPeriod.replace('-', '')}-001 • {employeeDocs.length} Employees</p>
                                </div>
                                <div className="flex flex-1 max-w-md flex-col gap-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#181811] dark:text-white">
                                        <span>Generating Documents</span>
                                        <span className={progressPercent === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
                                            {progressPercent}% Complete
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-[#f5f5f0] dark:bg-[#3e3d25] rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full relative overflow-hidden transition-all duration-500" style={{ width: `${progressPercent}%` }}>
                                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={fetchEmployeeDocuments}
                                        className="px-5 py-2.5 rounded-full border border-[#e5e5e0] dark:border-[#3e3d25] text-[#181811] dark:text-white font-medium hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] transition-colors flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                                        <span>Refresh</span>
                                    </button>
                                    <button
                                        onClick={handleBroadcast}
                                        disabled={broadcastLoading || selectedIds.size === 0}
                                        className="px-6 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {broadcastLoading ? (
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <span className="material-symbols-outlined text-[20px]">send</span>
                                        )}
                                        <span>Broadcast to WhatsApp</span>
                                    </button>
                                </div>
                            </div>
                            <div className="border rounded-xl border-[#e5e5e0] dark:border-[#3e3d25] overflow-hidden bg-white dark:bg-[#23220f]">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                    </div>
                                ) : error ? (
                                    <div className="p-8 text-center">
                                        <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
                                        <p className="text-red-600 dark:text-red-400">{error}</p>
                                        <button onClick={fetchEmployeeDocuments} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 text-sm font-medium">
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-[#f9f9f7] dark:bg-[#2e2d15] text-[#8c8b5f] text-xs font-bold uppercase tracking-wider">
                                                    <tr>
                                                        <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25] w-12">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.size === employeeDocs.filter(d => d.status === 'Ready').length && selectedIds.size > 0}
                                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                                className="rounded border-gray-300 text-primary focus:ring-primary bg-transparent"
                                                            />
                                                        </th>
                                                        <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Employee</th>
                                                        <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Department</th>
                                                        <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Net Pay</th>
                                                        <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25]">Status</th>
                                                        <th className="p-4 border-b border-[#e5e5e0] dark:border-[#3e3d25] text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {employeeDocs.map((emp, idx) => (
                                                        <tr key={emp.id} className="group hover:bg-[#f9f9f7] dark:hover:bg-[#2e2d15]/50 transition-colors border-b border-[#f5f5f0] dark:border-[#3e3d25]">
                                                            <td className="p-4">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(emp.id)}
                                                                    onChange={(e) => handleSelectOne(emp.id, e.target.checked)}
                                                                    disabled={emp.status !== 'Ready'}
                                                                    className="rounded border-gray-300 text-primary focus:ring-primary bg-transparent disabled:opacity-50"
                                                                />
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    {emp.avatarUrl ? (
                                                                        <div className="size-9 rounded-full bg-cover bg-center border border-[#e5e5e0] dark:border-[#3e3d25]" style={{ backgroundImage: `url(${emp.avatarUrl})` }}></div>
                                                                    ) : (
                                                                        <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-[#181811]">
                                                                            {emp.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <p className="font-bold text-[#181811] dark:text-white">{emp.employeeName}</p>
                                                                        <p className="text-[#8c8b5f] text-xs">ID: {emp.employeeCode}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getDeptColorClass(emp.department)}`}>
                                                                    {emp.department}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-mono text-[#181811] dark:text-white">{formatCurrency(emp.netPay)}</td>
                                                            <td className="p-4"><StatusComponent status={emp.status} /></td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handlePreview(emp)}
                                                                        className="text-[#8c8b5f] hover:text-[#181811] dark:hover:text-primary transition-colors p-1.5 rounded hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        disabled={emp.status !== 'Ready'}
                                                                        title="Preview"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[20px]">{emp.status === 'Ready' ? 'visibility' : 'visibility_off'}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownloadPdf(emp)}
                                                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                                        disabled={emp.status !== 'Ready' || downloadingId === emp.id}
                                                                        title="Download PDF"
                                                                    >
                                                                        {downloadingId === emp.id ? (
                                                                            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                                                        ) : (
                                                                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex items-center justify-between p-4 border-t border-[#e5e5e0] dark:border-[#3e3d25] bg-surface-light dark:bg-surface-dark">
                                            <p className="text-sm text-[#8c8b5f]">
                                                Showing <span className="font-medium text-[#181811] dark:text-white">1-{employeeDocs.length}</span> of <span className="font-medium text-[#181811] dark:text-white">{pagination.total || employeeDocs.length}</span> results
                                            </p>
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] text-sm text-[#8c8b5f] hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25] disabled:opacity-50" disabled>Previous</button>
                                                <button className="px-3 py-1 rounded-lg border border-[#e5e5e0] dark:border-[#3e3d25] text-sm text-[#181811] dark:text-white hover:bg-[#f5f5f0] dark:hover:bg-[#3e3d25]">Next</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentCenterScreen;
