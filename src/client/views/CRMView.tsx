import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  ArrowRight, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign, 
  Calendar, 
  Trash2, 
  Edit, 
  Plus, 
  Sparkles, 
  Kanban, 
  List, 
  CheckSquare, 
  Clock, 
  MoreVertical,
  GripVertical,
  MoveHorizontal
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Lead, Contact, Deal, Task } from '../../../shared/types.ts';

export const CRMView: React.FC = () => {
  const { showToast, refreshData, openAiDrawerWithPrompt } = useApp();
  const [activeTab, setActiveTab] = useState<'leads' | 'deals' | 'contacts' | 'tasks'>('leads');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Drag and Drop state for Deals Board
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // New item modal states
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    estimated_value: 12000,
    source: 'Website Form',
    status: 'new',
  });

  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: '',
    value: 20000,
    stage: 'discovery',
    probability: 30,
    expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    try {
      setIsLoading(true);
      const [leadsData, dealsData, contactsData, tasksData] = await Promise.all([
        api.getLeads(),
        api.getDeals(),
        api.getContacts(),
        api.getTasks(),
      ]);
      setLeads(leadsData);
      setDeals(dealsData);
      setContacts(contactsData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading CRM data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertLead = async (leadId: string) => {
    try {
      await api.convertLead(leadId);
      showToast('Lead Converted', 'Lead converted into Customer Contact and Active Deal');
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Conversion Error', err.message, 'error');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await api.deleteLead(leadId);
      showToast('Lead Deleted', 'Lead removed from CRM');
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await api.deleteDeal(dealId);
      showToast('Deal Removed', 'Deal deleted from pipeline');
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await api.deleteContact(contactId);
      showToast('Contact Removed', 'Customer record deleted');
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      showToast('Task Deleted', 'Task removed from agenda');
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLead(newLead);
      showToast('Lead Added', `${newLead.first_name} ${newLead.last_name} created`);
      setIsNewLeadOpen(false);
      setNewLead({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        estimated_value: 12000,
        source: 'Website Form',
        status: 'new',
      });
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDeal(newDeal);
      showToast('Deal Created', newDeal.title);
      setIsNewDealOpen(false);
      setNewDeal({
        title: '',
        value: 20000,
        stage: 'discovery',
        probability: 30,
        expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      await loadCRMData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleAdvanceDealStage = async (deal: Deal, nextStage: string) => {
    try {
      // Optimistic update
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: nextStage as any } : d));
      await api.updateDeal(deal.id, { stage: nextStage });
      const stageObj = dealStages.find(s => s.id === nextStage);
      showToast('Deal Stage Updated', `"${deal.title}" moved to ${stageObj?.label || nextStage}`);
      await refreshData();
    } catch (err: any) {
      showToast('Error updating stage', err.message, 'error');
      await loadCRMData();
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingDealId(dealId);
  };

  const handleDragEnd = () => {
    setDraggingDealId(null);
    setDragOverStageId(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    // Only reset if leaving the column element itself
    if (dragOverStageId === stageId) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggingDealId;
    setDragOverStageId(null);
    setDraggingDealId(null);

    if (!dealId) return;

    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === targetStageId) return;

    const targetStageObj = dealStages.find(s => s.id === targetStageId);

    try {
      // Optimistic state update
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: targetStageId as any } : d));
      showToast('Deal Moved', `"${deal.title}" dropped into ${targetStageObj?.label || targetStageId}`);
      await api.updateDeal(dealId, { stage: targetStageId });
      await refreshData();
    } catch (err: any) {
      showToast('Error updating deal', err.message, 'error');
      await loadCRMData();
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch = `${l.first_name} ${l.last_name} ${l.company || ''} ${l.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const dealStages = [
    { id: 'discovery', label: 'Discovery' },
    { id: 'qualification', label: 'Qualification' },
    { id: 'proposal_sent', label: 'Proposal Sent' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'closed_won', label: 'Closed Won' },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CRM & Pipeline Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track leads, deals, customers, and sales activities with multi-stage pipelines</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAiDrawerWithPrompt('Analyze top leads and recommend next follow-up actions for each')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Lead Insights</span>
          </button>
          {activeTab === 'leads' && (
            <button
              onClick={() => setIsNewLeadOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          )}
          {activeTab === 'deals' && (
            <button
              onClick={() => setIsNewDealOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'leads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Leads Pipeline ({leads.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('deals')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'deals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>Deals Board ({deals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'contacts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Customer Directory ({contacts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tasks & Follow-ups ({tasks.length})</span>
        </button>
      </div>

      {/* TAB 1: LEADS PIPELINE */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                placeholder="Search leads by name, email, company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent outline-hidden w-full text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-blue-600"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Lead Name</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Est. Value</th>
                    <th className="py-3 px-4">Lead Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No leads matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div>
                            <span>{lead.first_name} {lead.last_name}</span>
                            <span className="block text-[11px] font-normal text-slate-400">{lead.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {lead.company || '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          ${(lead.estimated_value || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (lead.score || 0) >= 80 ? 'bg-emerald-500' : (lead.score || 0) >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${lead.score || 0}%` }}
                              />
                            </div>
                            <span className="font-semibold text-[11px] text-slate-700">{lead.score || 0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                            lead.status === 'new' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            lead.status === 'qualified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            lead.status === 'contacted' ? 'bg-slate-100 text-slate-700' :
                            lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {lead.source}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleConvertLead(lead.id)}
                              title="Convert to Deal & Customer"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Convert</span>
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEALS KANBAN BOARD */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <MoveHorizontal className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Interactive Pipeline:</strong> Drag and drop any deal card between columns to update its status instantly.
              </span>
            </div>
            <span className="font-semibold text-blue-600 hidden sm:inline">
              Total Pipeline: ${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {dealStages.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.id);
              const totalStageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
              const isOver = dragOverStageId === stage.id;

              return (
                <div 
                  key={stage.id} 
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={(e) => handleDragLeave(e, stage.id)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`bg-white rounded-xl border transition-all duration-200 p-3.5 flex flex-col min-w-[220px] shadow-xs ${
                    isOver 
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-200 shadow-md scale-[1.01]' 
                      : 'border-slate-200'
                  }`}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{stage.label}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">${totalStageValue.toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOver ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Stage Cards */}
                  <div className="space-y-2.5 flex-1 min-h-[120px]">
                    {stageDeals.length === 0 ? (
                      <div className={`h-28 flex flex-col items-center justify-center text-[11px] rounded-lg border-2 border-dashed transition-colors ${
                        isOver 
                          ? 'border-blue-400 bg-blue-100/50 text-blue-700 font-semibold' 
                          : 'border-slate-200 text-slate-400'
                      }`}>
                        <span>{isOver ? 'Drop deal here' : 'No deals in this stage'}</span>
                        <span className="text-[10px] text-slate-400 mt-1">Drag a deal card here</span>
                      </div>
                    ) : (
                      stageDeals.map(deal => {
                        const isBeingDragged = draggingDealId === deal.id;
                        return (
                          <div 
                            key={deal.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            onDragEnd={handleDragEnd}
                            className={`group p-3 rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing select-none relative ${
                              isBeingDragged 
                                ? 'opacity-40 border-blue-400 bg-blue-50 ring-2 ring-blue-400 shadow-lg scale-95' 
                                : 'bg-slate-50 border-slate-200 shadow-2xs hover:bg-white hover:border-blue-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <h5 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                                {deal.title}
                              </h5>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDeal(deal.id);
                                  }}
                                  title="Delete Deal"
                                  className="p-1 text-slate-300 hover:text-red-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-600" />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs my-2">
                              <span className="font-bold text-slate-900">${(deal.value || 0).toLocaleString()}</span>
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {deal.probability}% Prob
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                              <span>
                                {deal.expected_close_date 
                                  ? `Close: ${new Date(deal.expected_close_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}` 
                                  : 'Target: Open'}
                              </span>
                              {deal.tags && deal.tags.length > 0 && (
                                <span className="text-[9px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">
                                  {deal.tags[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER CONTACTS DIRECTORY */}
      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered Customers & Organizations</h3>
            <span className="text-xs text-slate-500">{contacts.length} Active Accounts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No customer contacts yet. Add your first customer above.
                    </td>
                  </tr>
                ) : (
                  contacts.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {c.company_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{c.email}</div>
                        <div className="text-[11px] text-slate-400">{c.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        ${(c.total_spent || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {c.tags?.map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          title="Delete Customer"
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB 4: TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">CRM Tasks & Follow-up Agenda</h3>
            <span className="text-xs text-slate-500">{tasks.length} Total Tasks</span>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active tasks. Use quick actions to create a follow-up.
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={async () => {
                        await api.updateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' });
                        loadCRMData();
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <p className={`text-xs font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase ${
                      task.priority === 'urgent' ? 'bg-red-50 text-red-700 border border-red-200' :
                      task.priority === 'high' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date'}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete Task"
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create New CRM Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="First Name"
                  value={newLead.first_name}
                  onChange={e => setNewLead({ ...newLead, first_name: e.target.value })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
                <input
                  required
                  placeholder="Last Name"
                  value={newLead.last_name}
                  onChange={e => setNewLead({ ...newLead, last_name: e.target.value })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <input
                required
                type="email"
                placeholder="Email Address"
                value={newLead.email}
                onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <input
                placeholder="Company Name"
                value={newLead.company}
                onChange={e => setNewLead({ ...newLead, company: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Estimated Value ($)"
                  value={newLead.estimated_value}
                  onChange={e => setNewLead({ ...newLead, estimated_value: Number(e.target.value) })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
                <select
                  value={newLead.source}
                  onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                >
                  <option value="Website Form">Website Form</option>
                  <option value="Campaign Ads">Campaign Ads</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct Outreach">Direct Outreach</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewLeadOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {isNewDealOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create New Deal</h3>
            <form onSubmit={handleCreateDeal} className="space-y-3">
              <input
                required
                placeholder="Deal Title (e.g. Enterprise Tier Expansion)"
                value={newDeal.title}
                onChange={e => setNewDeal({ ...newDeal, title: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="number"
                  placeholder="Deal Value ($)"
                  value={newDeal.value}
                  onChange={e => setNewDeal({ ...newDeal, value: Number(e.target.value) })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
                <input
                  required
                  type="number"
                  placeholder="Probability (%)"
                  value={newDeal.probability}
                  onChange={e => setNewDeal({ ...newDeal, probability: Number(e.target.value) })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <select
                value={newDeal.stage}
                onChange={e => setNewDeal({ ...newDeal, stage: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              >
                {dealStages.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewDealOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
