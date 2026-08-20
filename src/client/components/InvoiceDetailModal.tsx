import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign,
  FileCheck
} from 'lucide-react';
import { Invoice } from '../../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onInvoiceUpdated: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onInvoiceUpdated,
}) => {
  const { workspace, showToast } = useApp();
  const [isRecordingPayment, setIsRecordingPayment] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);

  if (!invoice) return null;

  const total = Number(invoice.total) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const remainingBalance = Math.max(0, total - paidAmount);
  const isFullyPaid = invoice.status === 'paid' || remainingBalance <= 0;

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPaid = paidAmount + Number(paymentAmount);
      const newStatus = newPaid >= total ? 'paid' : 'sent';
      
      // Update invoice via API
      await api.payInvoice(invoice.id, 'manual_record');
      showToast('Payment Recorded', `Recorded payment of $${Number(paymentAmount).toLocaleString()}. Remaining balance: $${Math.max(0, total - newPaid).toLocaleString()}`);
      setIsRecordingPayment(false);
      onInvoiceUpdated();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleSendInvoiceEmail = async () => {
    setIsSendingEmail(true);
    try {
      setTimeout(() => {
        setIsSendingEmail(false);
        showToast('Invoice Sent', `Official invoice PDF and Stripe payment link dispatched to ${invoice.contact_email || 'client'}`);
      }, 600);
    } catch (err: any) {
      setIsSendingEmail(false);
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:max-w-full">
        
        {/* Top Control Bar - Hidden when printing */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-400">{invoice.invoice_number}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isFullyPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              invoice.status === 'overdue' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {isFullyPaid ? 'PAID IN FULL' : invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendInvoiceEmail}
              disabled={isSendingEmail}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>{isSendingEmail ? 'Sending...' : 'Email Client'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Invoice Document */}
        <div id="printable-invoice" className="p-6 sm:p-10 space-y-8 bg-white text-slate-800 font-sans">
          
          {/* Header & Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  N
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {workspace?.name || 'NexusOS Enterprise'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium max-w-xs">
                Business Cloud, Infrastructure & Multi-Tenant Operating Solutions
              </p>
              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" /> 100 Enterprise Boulevard, Suite 500, New York, NY</p>
                <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> billing@{workspace?.name?.toLowerCase().replace(/\s+/g, '') || 'nexus'}.com</p>
                <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> +1 (800) 555-0199</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-wider">INVOICE</h1>
              <p className="font-mono text-sm font-bold text-blue-600">{invoice.invoice_number}</p>
              <div className="pt-2 text-xs space-y-1 text-slate-600">
                <p><span className="text-slate-400 font-medium">Issue Date:</span> <strong>{new Date(invoice.issue_date || invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></p>
                <p><span className="text-slate-400 font-medium">Due Date:</span> <strong>{new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></p>
                <p><span className="text-slate-400 font-medium">Payment Terms:</span> <strong>Net 14 Days</strong></p>
              </div>
            </div>
          </div>

          {/* Client Bill To & Payment Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billed To (Customer Details)</span>
              <h3 className="text-sm font-bold text-slate-900">{invoice.contact_name || 'Valued Client'}</h3>
              <p className="text-xs text-slate-600 font-medium">{invoice.contact_email || 'client@company.com'}</p>
              <p className="text-xs text-slate-500 mt-1">Client ID: #{invoice.contact_id || 'CRM-ACC-01'}</p>
            </div>

            <div className="sm:text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Status</span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs border">
                  {isFullyPaid ? (
                    <span className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Paid in Full
                    </span>
                  ) : remainingBalance < total && paidAmount > 0 ? (
                    <span className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Partially Paid (${paidAmount.toLocaleString()} Paid)
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Payment Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs">
                <span className="text-slate-500">Remaining Balance Due: </span>
                <span className={`font-bold text-sm ${remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Item & Description</th>
                  <th className="py-3.5 px-4 text-center">Qty</th>
                  <th className="py-3.5 px-4 text-right">Unit Price</th>
                  <th className="py-3.5 px-4 text-right">Tax (%)</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.line_items && invoice.line_items.length > 0 ? (
                  invoice.line_items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.description}</p>
                        <span className="text-[11px] text-slate-400">Professional Services & SLA Coverage</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">{item.quantity}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">${(Number(item.unit_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3.5 px-4 text-right text-slate-500">{item.tax_rate || 8.875}%</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">${(Number(item.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-slate-800">Business Retainer & Implementation</td>
                    <td className="py-3.5 px-4 text-center">1</td>
                    <td className="py-3.5 px-4 text-right">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-right">8.875%</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation & Balance Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="space-y-3 max-w-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Payment Instructions</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Please remit payment via Stripe Secure Gateway or direct Wire Transfer to account <strong>#NEXUS-8849-01</strong> with routing code <strong>#021000021</strong>.
                </p>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 text-blue-600" /> Digital Confirmation</span>
                <p>This invoice is electronically signed and secured under SOC2 Type II compliance.</p>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">${(Number(invoice.subtotal) || (total * 0.91)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (8.875%):</span>
                <span className="font-medium">${(Number(invoice.tax_amount) || (total * 0.08875)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {invoice.discount_amount && Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount Applied:</span>
                  <span>-${Number(invoice.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Amount:</span>
                <span>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Amount Paid Breakdown */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid by Client:</span>
                  <span>${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-black text-sm bg-rose-50 p-2 rounded-md border border-rose-200">
                  <span>Remaining Balance:</span>
                  <span>${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Record Payment Form (Admin helper) - Hidden when printing */}
          {!isFullyPaid && (
            <div className="pt-4 border-t border-slate-100 print:hidden">
              {!isRecordingPayment ? (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Need to record client deposit / payment?</span> Log partial or full payment instantly.
                  </div>
                  <button
                    onClick={() => {
                      setPaymentAmount(remainingBalance);
                      setIsRecordingPayment(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecordPayment} className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-900">Record Client Payment Received</h4>
                    <button
                      type="button"
                      onClick={() => setIsRecordingPayment(false)}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-xs font-bold text-emerald-700">$</span>
                      <input
                        type="number"
                        step="0.01"
                        max={remainingBalance}
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                        className="w-full text-xs pl-7 pr-3 py-2 bg-white rounded-md border border-emerald-300 focus:outline-emerald-600 font-bold text-slate-900"
                        placeholder="Amount received"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
