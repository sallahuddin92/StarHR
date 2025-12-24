import PDFDocument from 'pdfkit';
import { PayrollRun, Employee } from '../../shared/types';
import { query } from './db';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import archiver from 'archiver';
import stream from 'stream';

export interface PayrollItem {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  basicSalary: number;
  allowances: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonus: number;
  otherEarnings: number;
  grossAmount: number;
  epfEmployee: number;
  socso: number;
  pcbTax: number;
  ewaDeductions: number;
  loanDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netAmount: number;
  paymentStatus: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  bankReference: string | null;
  calculatedBy: string | null;
  calculatedDate: string | null;
  approvedBy: string | null;
  approvedDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function generatePayslipPDF(
  payrollItem: PayrollItem,
  employee: Employee
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Password protection using last 6 digits of NRIC
    const password = employee.nric ? employee.nric.slice(-6) : '123456';
    const ownerPassword = process.env.PDF_OWNER_PASSWORD || 'hr-admin-2025';

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 72, right: 72 },
      userPassword: password,
      ownerPassword: ownerPassword,
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Header
    doc.fontSize(20).text('Payslip', { align: 'center' });
    doc.fontSize(12).text('Demo Company Sdn Bhd', { align: 'center' });
    doc.moveDown();

    // Employee Details
    doc.fontSize(10).text(`Employee: ${employee.fullName}`);
    doc.text(`Employee ID: ${employee.employeeId}`);
    doc.moveDown();

    // Earnings
    doc.fontSize(14).text('Earnings');
    doc.lineCap('butt').moveTo(72, doc.y).lineTo(523, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(10).text(`Basic Salary: RM ${payrollItem.basicSalary.toFixed(2)}`);
    doc.text(`Overtime: RM ${payrollItem.overtimeAmount.toFixed(2)}`);
    doc.text(`Allowances: RM ${payrollItem.allowances.toFixed(2)}`);
    doc.text(`Bonus: RM ${payrollItem.bonus.toFixed(2)}`);
    doc.text(`Other Earnings: RM ${payrollItem.otherEarnings.toFixed(2)}`);
    doc.moveDown();
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`Gross Pay: RM ${payrollItem.grossAmount.toFixed(2)}`);
    doc.moveDown();

    // Deductions
    doc.fontSize(14).text('Deductions');
    doc.lineCap('butt').moveTo(72, doc.y).lineTo(523, doc.y).stroke();
    doc.moveDown();
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`EPF: RM ${payrollItem.epfEmployee.toFixed(2)}`);
    doc.text(`SOCSO: RM ${payrollItem.socso.toFixed(2)}`);
    doc.text(`PCB (Income Tax): RM ${payrollItem.pcbTax.toFixed(2)}`);
    doc.text(`EWA Deductions: RM ${payrollItem.ewaDeductions.toFixed(2)}`);
    doc.text(`Loan Deductions: RM ${payrollItem.loanDeductions.toFixed(2)}`);
    doc.text(`Other Deductions: RM ${payrollItem.otherDeductions.toFixed(2)}`);
    doc.moveDown();
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`Total Deductions: RM ${payrollItem.totalDeductions.toFixed(2)}`);
    doc.moveDown();

    // Net Pay
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(`Net Pay: RM ${payrollItem.netAmount.toFixed(2)}`, { align: 'right' });

    doc.end();
  });
}

export async function generatePayrollLedgerPDF(payrollRunId: string): Promise<Buffer> {
  const { rows: items } = await query('SELECT * FROM payroll_items WHERE payroll_run_id = $1', [
    payrollRunId,
  ]);
  const payrollItems = items as PayrollItem[];

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Header
    doc.fontSize(18).text('Payroll Ledger', { align: 'center' });
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    const itemX = 50;
    const grossX = 250;
    const deductionsX = 400;
    const netX = 550;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Employee', itemX, tableTop);
    doc.text('Gross Pay', grossX, tableTop);
    doc.text('Deductions', deductionsX, tableTop);
    doc.text('Net Pay', netX, tableTop, { width: 100, align: 'right' });
    doc.font('Helvetica');

    // Table Body
    let y = tableTop + 25;
    for (const item of payrollItems) {
      doc.text(item.employeeId, itemX, y);
      doc.text(`RM ${item.grossAmount.toFixed(2)}`, grossX, y);
      doc.text(`RM ${item.totalDeductions.toFixed(2)}`, deductionsX, y);
      doc.text(`RM ${item.netAmount.toFixed(2)}`, netX, y, { width: 100, align: 'right' });
      y += 20;

      totalGross += item.grossAmount;
      totalDeductions += item.totalDeductions;
      totalNet += item.netAmount;
    }

    // Table Footer
    const totalY = y + 20;
    doc.font('Helvetica-Bold');
    doc.text('Total', itemX, totalY);
    doc.text(`RM ${totalGross.toFixed(2)}`, grossX, totalY);
    doc.text(`RM ${totalDeductions.toFixed(2)}`, deductionsX, totalY);
    doc.text(`RM ${totalNet.toFixed(2)}`, netX, totalY, { width: 100, align: 'right' });
    doc.font('Helvetica');

    doc.end();
  });
}
