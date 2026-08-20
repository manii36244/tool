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
  RefreshCw,
  PackagePlus,
  Inbox
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

  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    sku: 'SRV-001',
    description: '',
    unit_price: 1500,
    category: 'service' as 'service' | 'product' | 'subscription',
    tax_rate: 0,
    active: true,
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

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return;
    try {
      await api.deleteInvoice(invoiceId);
      showToast('Invoice Deleted', `Invoice ${invoiceNumber} removed`);
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Delete Error', err.message, 'error');
    }
  };

  const handleDeleteQuote = async (quoteId: string, quoteNumber: string) => {
    if (!confirm(`Are you sure you want to delete quotation ${quoteNumber}?`)) return;
    try {
      await api.deleteQuote(quoteId);
      showToast('Quote Deleted', `Quotation ${quoteNumber} removed`);
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Delete Error', err.message, 'error');
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete ${productName}?`)) return;
    try {
      await api.deleteProduct(productId);
      showToast('Product Deleted', `${productName} removed from catalog`);
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Delete Error', err.message, 'error');
    }
  };

  const handleDeleteExpense = async (expenseId: string, expenseDesc: string) => {
    if (!confirm(`Are you sure you want to delete expense "${expenseDesc}"?`)) return;
    try {
      await api.deleteExpense(expenseId);
      showToast('Expense Deleted', `Removed expense`);
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Delete Error', err.message, 'error');
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct({
        ...newProductData,
        unit_price: Number(newProductData.unit_price) || 0,
        tax_rate: Number(newProductData.tax_rate) || 0,
      });
      showToast('Product Added', `${newProductData.name} saved to catalog`);
      setIsNewProductOpen(false);
      setNewProductData({
        name: '',
        sku: `SRV-${Math.floor(100 + Math.random() * 900)}`,
        description: '',
        unit_price: 1500,
        category: 'service',
        tax_rate: 0,
        active: true,
      });
      await loadFinanceData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
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

  const totalInvoiced = (invoices || []).reduce((sum, i) => sum + (Number(i?.total) || 0), 0);
  const totalPaid = (invoices || []).reduce((sum, i) => sum + (Number(i?.paid_amount) || (i?.status === 'paid' ? Number(i?.total) || 0 : 0)), 0);
  const totalRemaining = Math.max(0, totalInvoiced - totalPaid);
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);

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
          {activeTab === 'products' && (
            <button
              onClick={() => setIsNewProductOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Add Product / Service</span>
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
        invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No invoices yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Create your first client invoice with customizable line items and Stripe payment checkout.</p>
            <button
              onClick={() => setIsNewInvoiceModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Create New Invoice
            </button>
          </div>
        ) : (
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
                    const invTotal = Number(inv?.total) || 0;
                    const invPaid = Number(inv?.paid_amount) || (inv?.status === 'paid' ? invTotal : 0);
                    const invRemaining = Math.max(0, invTotal - invPaid);
                    const isPaid = inv?.status === 'paid' || invRemaining <= 0;

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
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
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

                            <button
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                              title="Delete Invoice"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* TAB 2: QUOTATIONS */}
      {activeTab === 'quotes' && (
        quotes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No quotes yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Send itemized commercial proposals and convert them directly into invoices once accepted.</p>
          </div>
        ) : (
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
                        {q.valid_until ? new Date(q.valid_until).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">${(Number(q.total) || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status !== 'accepted' && (
                            <button
                              onClick={() => handleConvertQuote(q.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                            >
                              <span>Convert to Invoice</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteQuote(q.id, q.quote_number)}
                            title="Delete Quote"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* TAB 3: PRODUCTS & SERVICES */}
      {activeTab === 'products' && (
        products.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No products or services yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Add your catalog items, service packages, and retainer tiers for fast invoicing.</p>
            <button
              onClick={() => setIsNewProductOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Add First Product / Service</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{p?.name || 'Product / Service'}</h3>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{p?.sku || 'SKU-001'}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                      ${(Number(p?.unit_price) || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{p?.description || 'No description provided.'}</p>
                </div>
                
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                      {p?.category || 'service'}
                    </span>
                    <span>Tax: {p?.tax_rate ?? 0}%</span>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    title="Delete Product"
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === 'expenses' && (
        expenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No expenses recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Log business receipts, contractor fees, SaaS subscriptions, and calculate net profit.</p>
            <button
              onClick={() => setIsNewExpenseOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Log First Expense
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500">
                        {e.date ? new Date(e.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{e.description}</td>
                      <td className="py-3 px-4 text-slate-600">{e.vendor || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {e.category || 'Other'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">${(Number(e.amount) || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteExpense(e.id, e.description)}
                          title="Delete Expense"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
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

      {/* Add Product / Service Modal */}
      {isNewProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Add Product or Service</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Item Name *</label>
                <input
                  required
                  placeholder="e.g. Enterprise SEO Strategy Package"
                  value={newProductData.name}
                  onChange={e => setNewProductData({ ...newProductData, name: e.target.value })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">SKU / Code</label>
                  <input
                    placeholder="SRV-201"
                    value={newProductData.sku}
                    onChange={e => setNewProductData({ ...newProductData, sku: e.target.value })}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit Price ($) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1500"
                    value={newProductData.unit_price}
                    onChange={e => setNewProductData({ ...newProductData, unit_price: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={newProductData.category}
                  onChange={e => setNewProductData({ ...newProductData, category: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                >
                  <option value="service">Professional Service</option>
                  <option value="product">Digital / Physical Product</option>
                  <option value="subscription">Monthly Subscription / Retainer</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details and scope included with this product or service..."
                  value={newProductData.description}
                  onChange={e => setNewProductData({ ...newProductData, description: e.target.value })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewProductOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
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
