import React, { useState } from 'react';
import { X, Plus, Trash2, DollarSign, User, Building, Mail, Calendar, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

interface LineItemInput {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface NewInvoiceModalProps {
  onClose: () => void;
  onInvoiceCreated: () => void;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  onClose,
  onInvoiceCreated,
}) => {
  const { showToast, workspace } = useApp();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dueDays, setDueDays] = useState(14);
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('Payment due within terms. Please remit payment promptly.');

  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    {
      id: `li-1`,
      description: 'Business Cloud & Retainer Services',
      quantity: 1,
      unit_price: 3500,
      tax_rate: 8.875,
    },
  ]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `li-${Date.now()}`,
        description: '',
        quantity: 1,
        unit_price: 500,
        tax_rate: 8.875,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItemInput, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
  const taxAmount = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price) * (Number(item.tax_rate) / 100)), 0);
  const total = subtotal + taxAmount;
  const remainingBalance = Math.max(0, total - Number(initialPaidAmount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = lineItems.map(item => ({
        id: item.id,
        description: item.description || 'Service',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        tax_rate: Number(item.tax_rate) || 0,
        total: Number(item.quantity) * Number(item.unit_price),
      }));

      const paid = Number(initialPaidAmount) || 0;
      const status = paid >= total ? 'paid' : 'sent';

      await api.createInvoice({
        contact_name: contactName,
        contact_email: contactEmail,
        company_name: companyName,
        line_items: items,
        subtotal,
        tax_amount: taxAmount,
        total,
        paid_amount: paid,
        status,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0],
        notes,
      });

      showToast('Invoice Created', `Invoice generated with balance of $${remainingBalance.toLocaleString()}`);
      onInvoiceCreated();
      onClose();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold">Create New Client Invoice</h3>
            <p className="text-[11px] text-slate-400">Generate itemized invoice with balance tracking and company branding</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Customer Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer / Client Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Email *</label>
                <input
                  required
                  type="email"
                  placeholder="client@company.com"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Innovations Corp"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Payment Term (Due Date)</label>
                <select
                  value={dueDays}
                  onChange={e => setDueDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-md border border-slate-200 focus:outline-blue-600"
                >
                  <option value={7}>Net 7 Days</option>
                  <option value={14}>Net 14 Days</option>
                  <option value={30}>Net 30 Days</option>
                  <option value={60}>Net 60 Days</option>
                  <option value={0}>Due on Receipt</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Invoice Line Items</span>
              </h4>
              <button
                type="button"
                onClick={addLineItem}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Description</label>
                    <input
                      required
                      type="text"
                      placeholder="Service / Product Name"
                      value={item.description}
                      onChange={e => updateLineItem(idx, 'description', e.target.value)}
                      className="w-full p-2 bg-white rounded-md border border-slate-200 focus:outline-blue-600 text-xs"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Qty</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full p-2 bg-white rounded-md border border-slate-200 focus:outline-blue-600 text-xs"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Price ($)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateLineItem(idx, 'unit_price', Number(e.target.value))}
                      className="w-full p-2 bg-white rounded-md border border-slate-200 focus:outline-blue-600 text-xs font-semibold"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Total</label>
                    <div className="p-2 font-bold text-slate-800 text-xs">
                      ${(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amount Paid So Far / Deposit Section */}
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
            <h4 className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Current Payment Status (Amount Received vs Remaining)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-emerald-900 block mb-1">
                  Amount Client Has Already Paid ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-700">$</span>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={initialPaidAmount}
                    onChange={e => setInitialPaidAmount(Number(e.target.value))}
                    placeholder="0.00 (Enter if client paid advance)"
                    className="w-full pl-7 pr-3 py-2 bg-white rounded-md border border-emerald-300 focus:outline-emerald-600 font-bold text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-emerald-200 flex flex-col justify-center space-y-1">
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Total Invoiced:</span>
                  <span className="font-bold text-slate-900">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-700 text-[11px] font-semibold">
                  <span>Paid so far:</span>
                  <span>${Number(initialPaidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-black text-xs pt-1 border-t border-slate-100">
                  <span>Remaining Due:</span>
                  <span>${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs shadow-xs transition-colors"
            >
              Generate & Save Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
