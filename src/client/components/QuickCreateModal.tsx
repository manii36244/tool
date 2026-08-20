import React, { useState } from 'react';
import { X, Users, CreditCard, Calendar, Megaphone, CheckSquare, Plus, DollarSign, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

type CreateType = 'lead' | 'contact' | 'deal' | 'task' | 'invoice' | 'expense' | 'appointment' | 'campaign';

export const QuickCreateModal: React.FC = () => {
  const { isQuickCreateOpen, setIsQuickCreateOpen, refreshData, showToast, setActiveView } = useApp();
  const [selectedType, setSelectedType] = useState<CreateType>('lead');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [leadForm, setLeadForm] = useState({ first_name: '', last_name: '', company: '', email: '', phone: '', estimated_value: '10000', source: 'manual' });
  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', company_name: '', email: '', phone: '', type: 'customer' });
  const [dealForm, setDealForm] = useState({ title: '', value: '25000', stage: 'discovery', probability: '25' });
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] });
  const [invoiceForm, setInvoiceForm] = useState({ contact_name: '', contact_email: '', description: 'Professional Business Consulting Retainer', amount: '5000' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '250', category: 'Software & Subscriptions', vendor: '' });
  const [appointmentForm, setAppointmentForm] = useState({ customer_name: '', customer_email: '', appointment_type_name: 'Product Demo & Workflow Walkthrough', start_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16) });
  const [campaignForm, setCampaignForm] = useState({ name: '', type: 'lead_gen', budget: '3000', target_audience: 'B2B SMB Founders' });

  if (!isQuickCreateOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedType === 'lead') {
        await api.createLead({ ...leadForm, estimated_value: Number(leadForm.estimated_value) });
        showToast('Lead Created', `${leadForm.first_name} ${leadForm.last_name} added to CRM`);
        setActiveView('crm');
      } else if (selectedType === 'contact') {
        await api.createContact(contactForm);
        showToast('Contact Created', `${contactForm.first_name} ${contactForm.last_name} created`);
        setActiveView('crm');
      } else if (selectedType === 'deal') {
        await api.createDeal({ ...dealForm, value: Number(dealForm.value), probability: Number(dealForm.probability) });
        showToast('Deal Created', dealForm.title);
        setActiveView('crm');
      } else if (selectedType === 'task') {
        await api.createTask(taskForm);
        showToast('Task Created', taskForm.title);
        setActiveView('crm');
      } else if (selectedType === 'invoice') {
        await api.createInvoice({
          contact_name: invoiceForm.contact_name || 'Client',
          contact_email: invoiceForm.contact_email || 'client@example.com',
          line_items: [{ id: 'li-1', description: invoiceForm.description, quantity: 1, unit_price: Number(invoiceForm.amount), tax_rate: 8.875, total: Number(invoiceForm.amount) }],
          subtotal: Number(invoiceForm.amount),
          tax_amount: Number(invoiceForm.amount) * 0.08875,
          total: Number(invoiceForm.amount) * 1.08875,
        });
        showToast('Invoice Created', `Invoice generated for ${invoiceForm.contact_name || 'Client'}`);
        setActiveView('finance');
      } else if (selectedType === 'expense') {
        await api.createExpense({ ...expenseForm, amount: Number(expenseForm.amount) });
        showToast('Expense Logged', expenseForm.description);
        setActiveView('finance');
      } else if (selectedType === 'appointment') {
        await api.createAppointment({
          ...appointmentForm,
          start_time: new Date(appointmentForm.start_time).toISOString(),
          end_time: new Date(new Date(appointmentForm.start_time).getTime() + 30 * 60000).toISOString(),
        });
        showToast('Appointment Booked', `${appointmentForm.appointment_type_name} booked`);
        setActiveView('appointments');
      } else if (selectedType === 'campaign') {
        await api.createCampaign({ ...campaignForm, budget: Number(campaignForm.budget) });
        showToast('Campaign Launched', campaignForm.name);
        setActiveView('marketing');
      }

      await refreshData();
      setIsQuickCreateOpen(false);
    } catch (err: any) {
      showToast('Creation Failed', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types: { id: CreateType; label: string; icon: React.ElementType }[] = [
    { id: 'lead', label: 'Lead', icon: Users },
    { id: 'contact', label: 'Customer', icon: Users },
    { id: 'deal', label: 'Deal', icon: DollarSign },
    { id: 'invoice', label: 'Invoice', icon: CreditCard },
    { id: 'expense', label: 'Expense', icon: FileText },
    { id: 'appointment', label: 'Appointment', icon: Calendar },
    { id: 'campaign', label: 'Campaign', icon: Megaphone },
    { id: 'task', label: 'Task', icon: CheckSquare },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Quick Create Business Record</h2>
            <p className="text-[11px] text-slate-500">Instantly generate leads, invoices, deals, or bookings</p>
          </div>
          <button
            onClick={() => setIsQuickCreateOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Selector Pills */}
        <div className="px-6 pt-4 flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
          {types.map(t => {
            const Icon = t.icon;
            const isSel = selectedType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isSel ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {selectedType === 'lead' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">First Name *</label>
                  <input
                    required
                    type="text"
                    value={leadForm.first_name}
                    onChange={e => setLeadForm({ ...leadForm, first_name: e.target.value })}
                    placeholder="Marcus"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={leadForm.last_name}
                    onChange={e => setLeadForm({ ...leadForm, last_name: e.target.value })}
                    placeholder="Sterling"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Company</label>
                  <input
                    type="text"
                    value={leadForm.company}
                    onChange={e => setLeadForm({ ...leadForm, company: e.target.value })}
                    placeholder="Sterling Logistics Inc."
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    value={leadForm.estimated_value}
                    onChange={e => setLeadForm({ ...leadForm, estimated_value: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Business Email *</label>
                  <input
                    required
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="marcus@sterling.com"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          {selectedType === 'deal' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Deal Title *</label>
                <input
                  required
                  type="text"
                  value={dealForm.title}
                  onChange={e => setDealForm({ ...dealForm, title: e.target.value })}
                  placeholder="e.g. Acme Corp Enterprise Migration"
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Deal Value ($) *</label>
                  <input
                    required
                    type="number"
                    value={dealForm.value}
                    onChange={e => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Stage</label>
                  <select
                    value={dealForm.stage}
                    onChange={e => setDealForm({ ...dealForm, stage: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  >
                    <option value="discovery">Discovery</option>
                    <option value="qualification">Qualification</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Closed Won</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {selectedType === 'invoice' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Client Name *</label>
                  <input
                    required
                    type="text"
                    value={invoiceForm.contact_name}
                    onChange={e => setInvoiceForm({ ...invoiceForm, contact_name: e.target.value })}
                    placeholder="Jonathan Hastings"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Client Email *</label>
                  <input
                    required
                    type="email"
                    value={invoiceForm.contact_email}
                    onChange={e => setInvoiceForm({ ...invoiceForm, contact_email: e.target.value })}
                    placeholder="j.hastings@solartide.com"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Service Description</label>
                  <input
                    type="text"
                    value={invoiceForm.description}
                    onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          {selectedType === 'expense' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Expense Description *</label>
                <input
                  required
                  type="text"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="AWS Cloud Server Hosting"
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  >
                    <option value="Software & Subscriptions">Software & Subscriptions</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Office & Rent">Office & Rent</option>
                    <option value="Salaries & Contractors">Salaries & Contractors</option>
                    <option value="Travel & Entertainment">Travel & Entertainment</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {selectedType === 'appointment' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Name *</label>
                  <input
                    required
                    type="text"
                    value={appointmentForm.customer_name}
                    onChange={e => setAppointmentForm({ ...appointmentForm, customer_name: e.target.value })}
                    placeholder="Liam Gallagher"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Email *</label>
                  <input
                    required
                    type="email"
                    value={appointmentForm.customer_email}
                    onChange={e => setAppointmentForm({ ...appointmentForm, customer_email: e.target.value })}
                    placeholder="liam@starlight.co"
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date & Time *</label>
                <input
                  required
                  type="datetime-local"
                  value={appointmentForm.start_time}
                  onChange={e => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
            </>
          )}

          {selectedType === 'campaign' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Campaign Name *</label>
                <input
                  required
                  type="text"
                  value={campaignForm.name}
                  onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="Q4 Inbound Lead Generation"
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Budget ($) *</label>
                  <input
                    required
                    type="number"
                    value={campaignForm.budget}
                    onChange={e => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={campaignForm.target_audience}
                    onChange={e => setCampaignForm({ ...campaignForm, target_audience: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          {selectedType === 'task' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Task Title *</label>
                <input
                  required
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Prepare executive strategy deck"
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(false)}
              className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
