import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Download, 
  Send, 
  Sparkles, 
  Trash2, 
  Printer, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  Layers,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Invoice, Quote, Product, Expense } from '../../../shared/types.ts';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal.tsx';
import { NewInvoiceModal } from '../components/NewInvoiceModal.tsx';

export const SalesFinanceView: React.FC = () => {
  const { showToast, refreshData, openAiDrawerWithPrompt } = useApp();
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes' | 'products' | 'expenses'>('invoices');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Invoice for Detailed Template View & Print
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Modals
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [newQuoteData, setNewQuoteData] = useState({
    contact_name: '',
    contact_email: '',
    title: 'Custom Business Software Implementation',
    description: 'Architecture, multi-tenant setup, custom automations',
    total: 18500,
  });

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({
    description: '',
    amount: 500,
    category: 'Software & Subscriptions',
    vendor: '',
  });

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setIsLoading(true);
      const [invData, qData, pData, expData] = await Promise.all([
        api.getInvoices().catch(() => []),
        api.getQuotes().catch(() => []),
        api.getProducts().catch(() => []),
        api.getExpenses().catch(() => []),
      ]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setQuotes(Array.isArray(qData) ? qData : []);
      setProducts(Array.isArray(pData) ? pData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      await api.payInvoice(invoiceId, 'stripe_card');
      showToast('Payment Processed', 'Invoice marked as Paid via Stripe integration');
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Payment Error', err.message, 'error');
    }
  };

  const handleConvertQuote = async (quoteId: string) => {
    try {
      await api.convertQuote(quoteId);
      showToast('Quote Converted', 'Invoice generated from Quote');
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Conversion Error', err.message, 'error');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        ...newExpenseData,
        amount: Number(newExpenseData.amount),
        date: new Date().toISOString(),
      });
      showToast('Expense Logged', newExpenseData.description);
      setIsNewExpenseOpen(false);
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i?.total) || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (Number(i?.paid_amount) || (i?.status === 'paid' ? Number(i?.total) || 0 : 0)), 0);
  const totalRemaining = Math.max(0, totalInvoiced - totalPaid);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Sales & Financial Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Invoices, quotes, expenses, product catalog, and P&L tracking</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadFinanceData()}
            title="Refresh"
            className="p-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openAiDrawerWithPrompt('Analyze cash flow, identify overdue accounts, and suggest cash collection strategy')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Cash Flow Analysis</span>
          </button>
          {activeTab === 'invoices' && (
            <button
              onClick={() => setIsNewInvoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </button>
          )}
          {activeTab === 'expenses' && (
            <button
              onClick={() => setIsNewExpenseOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Invoiced</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-2xl font-bold text-slate-900">${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Paid by Clients</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded hidden sm:inline">Collected</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Remaining Balance Due</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-2xl font-bold text-rose-600">${totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded hidden sm:inline">Receivable</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Expenses</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-2xl font-bold text-slate-700">${totalExpenses.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Invoices ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'quotes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quotations ({quotes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Products & Services ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'expenses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses ({expenses.length})</span>
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid so Far</th>
                  <th className="py-3 px-4">Remaining Due</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => {
                  const invTotal = Number(inv.total) || 0;
                  const invPaid = Number(inv.paid_amount) || (inv.status === 'paid' ? invTotal : 0);
                  const invRemaining = Math.max(0, invTotal - invPaid);
                  const isPaid = inv.status === 'paid' || invRemaining <= 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{inv.contact_name || 'Client'}</span>
                        <span className="text-[11px] text-slate-400">{inv.contact_email || 'No email provided'}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ${invTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">
                        ${invPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-600">
                        ${invRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(inv.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          inv.status === 'overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          inv.paid_amount && inv.paid_amount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {isPaid ? 'PAID' : inv.paid_amount && inv.paid_amount > 0 ? 'PARTIAL' : inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            title="View Proper Invoice Template, Print & Details"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>View / Print</span>
                          </button>
                          
                          {!isPaid && (
                            <button
                              onClick={async () => {
                                try {
                                  const session = await api.createStripeInvoiceCheckout({ invoiceId: inv.id });
                                  if (session?.url && !session.url.includes('sim_inv')) {
                                    window.location.href = session.url;
                                  } else {
                                    handlePayInvoice(inv.id);
                                  }
                                } catch (e) {
                                  handlePayInvoice(inv.id);
                                }
                              }}
                              title="Pay via Stripe Checkout or Mark Paid"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Mark Paid</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTATIONS */}
      {activeTab === 'quotes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Title / Client</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.quote_number}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{q.title}</span>
                      <span className="text-[11px] text-slate-400">{q.contact_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(q.valid_until).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">${q.total.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleConvertQuote(q.id)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 ml-auto transition-colors shadow-2xs"
                      >
                        <span>Convert to Invoice</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">{p.sku}</span>
                </div>
                <span className="text-sm font-bold text-blue-600">${p.unit_price.toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="capitalize">{p.category}</span>
                <span>Tax: {p.tax_rate}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{e.description}</td>
                    <td className="py-3 px-4 text-slate-600">{e.vendor}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">${e.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onInvoiceUpdated={async () => {
            await loadFinanceData();
            await refreshData();
          }}
        />
      )}

      {isNewInvoiceModalOpen && (
        <NewInvoiceModal
          onClose={() => setIsNewInvoiceModalOpen(false)}
          onInvoiceCreated={async () => {
            await loadFinanceData();
            await refreshData();
          }}
        />
      )}

      {/* Log Expense Modal */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Log New Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <input
                required
                placeholder="Expense Description"
                value={newExpenseData.description}
                onChange={e => setNewExpenseData({ ...newExpenseData, description: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="number"
                  placeholder="Amount ($)"
                  value={newExpenseData.amount}
                  onChange={e => setNewExpenseData({ ...newExpenseData, amount: Number(e.target.value) })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
                <input
                  placeholder="Vendor Name"
                  value={newExpenseData.vendor}
                  onChange={e => setNewExpenseData({ ...newExpenseData, vendor: e.target.value })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <select
                value={newExpenseData.category}
                onChange={e => setNewExpenseData({ ...newExpenseData, category: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              >
                <option value="Software & Subscriptions">Software & Subscriptions</option>
                <option value="Marketing & Advertising">Marketing & Advertising</option>
                <option value="Office & Rent">Office & Rent</option>
                <option value="Salaries & Contractors">Salaries & Contractors</option>
              </select>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
