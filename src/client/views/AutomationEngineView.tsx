import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Mail, 
  Users, 
  CreditCard, 
  Calendar, 
  Sparkles,
  Layers,
  Activity,
  RefreshCw,
  X,
  Check,
  Tag,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { AutomationWorkflow, AutomationLog } from '../../../shared/types.ts';

export const AutomationEngineView: React.FC = () => {
  const { showToast, refreshData, openAiDrawerWithPrompt } = useApp();
  const [automations, setAutomations] = useState<AutomationWorkflow[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New Workflow Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    triggerType: 'new_lead_created',
    actionType: 'send_email_notification',
    actionParam: 'client@example.com',
    conditionField: 'score',
    conditionOp: 'greater_than',
    conditionVal: '50',
    hasCondition: true
  });

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    setIsLoading(true);
    try {
      const [rules, logList] = await Promise.all([
        api.getAutomations(),
        api.getAutomationLogs(),
      ]);
      setAutomations(rules);
      setLogs(logList);
    } catch (err) {
      console.error('Error loading automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (rule: AutomationWorkflow) => {
    try {
      await api.updateAutomation(rule.id, { is_active: !rule.is_active });
      showToast('Automation Updated', `${rule.name} is now ${!rule.is_active ? 'Active' : 'Paused'}`);
      await loadAutomationData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleTestRun = async (ruleId: string) => {
    setTestingId(ruleId);
    try {
      const result = await api.testAutomation(ruleId);
      showToast('Automation Fired Successfully', `Executed background actions and logged event details.`);
      await loadAutomationData();
    } catch (err: any) {
      showToast('Test Run Error', err.message, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflow.name.trim()) {
      showToast('Error', 'Workflow name is required', 'error');
      return;
    }

    try {
      const payload: Partial<AutomationWorkflow> = {
        name: newWorkflow.name,
        description: newWorkflow.description || 'Custom automated workflow trigger & action chain.',
        trigger: {
          type: newWorkflow.triggerType as any,
          config: {}
        },
        conditions: newWorkflow.hasCondition ? [
          {
            field: newWorkflow.conditionField,
            operator: newWorkflow.conditionOp as any,
            value: newWorkflow.conditionVal
          }
        ] : [],
        actions: [
          {
            id: `act-${Date.now()}`,
            type: newWorkflow.actionType as any,
            config: {
              target: newWorkflow.actionParam,
              title: `Auto Task: ${newWorkflow.name}`,
              recipient: newWorkflow.actionParam
            }
          }
        ],
        is_active: true
      };

      await api.createAutomation(payload);
      showToast('Workflow Created', `"${newWorkflow.name}" is now active in your automation engine.`);
      setIsNewModalOpen(false);
      setNewWorkflow({
        name: '',
        description: '',
        triggerType: 'new_lead_created',
        actionType: 'send_email_notification',
        actionParam: 'client@example.com',
        conditionField: 'score',
        conditionOp: 'greater_than',
        conditionVal: '50',
        hasCondition: true
      });
      await loadAutomationData();
    } catch (err: any) {
      showToast('Error creating workflow', err.message, 'error');
    }
  };

  const formatTrigger = (type?: string) => {
    switch (type) {
      case 'new_lead_created':
        return { label: 'New Lead Created', desc: 'Fires when website form or CRM lead is captured', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'appointment_booked':
        return { label: 'Appointment Booked', desc: 'Fires when client books via public link', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      case 'invoice_created':
        return { label: 'Invoice Generated', desc: 'Fires when draft or sent invoice is created', icon: CreditCard, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'invoice_overdue':
        return { label: 'Invoice Overdue Alert', desc: 'Fires when due date passes without payment', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'payment_received':
        return { label: 'Payment Confirmed (Stripe/Bank)', desc: 'Fires when funds clear successfully', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'deal_stage_changed':
        return { label: 'Deal Stage Advanced', desc: 'Fires when deal moves in pipeline Kanban', icon: ArrowRight, color: 'text-amber-600 bg-amber-50 border-amber-200' };
      default:
        return { label: type?.replace(/_/g, ' ') || 'Event Trigger', desc: 'System event triggered', icon: Zap, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const formatAction = (type: string) => {
    switch (type) {
      case 'send_email_notification':
        return { label: 'Send Email Notification', icon: Mail };
      case 'create_task':
        return { label: 'Create Operational Task', icon: CheckCircle2 };
      case 'assign_team_member':
        return { label: 'Route & Assign Team Member', icon: Users };
      case 'add_tag':
        return { label: 'Attach Customer Tag', icon: Tag };
      case 'run_ai_action':
        return { label: 'Dispatch AI Copilot Task', icon: Bot };
      default:
        return { label: type.replace(/_/g, ' '), icon: Zap };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Visual Automation Engine</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Automated triggers, routing rules, overdue invoice recovery, and task dispatchers</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadAutomationData()}
            title="Refresh Automations"
            className="p-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openAiDrawerWithPrompt('Suggest 3 powerful automation workflows to reduce admin time and accelerate client onboarding')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Automation Architect</span>
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* Purpose Explanation Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              24/7 Autopilot
            </span>
            <h3 className="text-sm font-semibold text-white">Why Use the Automation Engine?</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            The Automation Engine eliminates repetitive manual tasks across your business. When a client submits a form, books a call, or misses an invoice payment, Nexus automatically assigns staff, triggers notifications, and generates tasks without human delay.
          </p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-right shrink-0 min-w-[160px]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Auto-Executions</div>
          <div className="text-base sm:text-lg font-bold text-emerald-400">
            {automations.reduce((sum, a) => sum + (a.execution_count || 0), 0)} Runs
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Active Workflows ({automations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Execution Logs ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: WORKFLOWS */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {automations.map(rule => {
            const triggerInfo = formatTrigger(rule.trigger?.type);
            const TriggerIcon = triggerInfo.icon;

            return (
              <div key={rule.id} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                      rule.is_active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rule.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {rule.is_active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{rule.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      {rule.execution_count || 0} Runs
                    </span>
                    <button
                      onClick={() => handleTestRun(rule.id)}
                      disabled={testingId === rule.id}
                      className="px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 border border-blue-200"
                    >
                      <Play className="w-3 h-3 text-blue-600" />
                      <span>{testingId === rule.id ? 'Simulating...' : 'Test Run'}</span>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={() => handleToggle(rule)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Visual Pipeline Block Flow */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                  {/* Trigger */}
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <TriggerIcon className="w-3.5 h-3.5 text-blue-700" />
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">1. TRIGGER EVENT</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{triggerInfo.label}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{triggerInfo.desc}</p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-mono mt-2 pt-2 border-t border-blue-200/50">
                      event: {rule.trigger?.type}
                    </span>
                  </div>

                  {/* Condition */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">2. CONDITION FILTER</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {rule.conditions && rule.conditions.length > 0 
                          ? `${rule.conditions[0].field} ${rule.conditions[0].operator.replace('_', ' ')} ${rule.conditions[0].value}` 
                          : 'Always True (All Events Pass)'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {rule.conditions && rule.conditions.length > 0 
                          ? 'Only executes when condition matches incoming payload'
                          : 'Executes immediately whenever trigger fires'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                      Evaluated synchronously
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">3. AUTOMATED ACTIONS</span>
                      </div>
                      <div className="space-y-1.5">
                        {rule.actions.map((act, aIdx) => {
                          const actionInfo = formatAction(act.type);
                          const ActionIcon = actionInfo.icon;
                          return (
                            <div key={aIdx} className="text-xs font-bold text-slate-900 flex items-start gap-1.5">
                              <ActionIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <span>{actionInfo.label}</span>
                                {act.config?.staff_name && (
                                  <span className="block text-[10px] text-slate-500 font-normal">Staff: {act.config.staff_name}</span>
                                )}
                                {act.config?.title && (
                                  <span className="block text-[10px] text-slate-500 font-normal truncate max-w-[200px]">{act.config.title}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono mt-2 pt-2 border-t border-emerald-200/50">
                      {rule.actions.length} action(s) configured
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: EXECUTION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Background Queue & Execution Telemetry</h3>
            <span className="text-xs text-slate-500">{logs.length} Total Logs Recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Workflow & Trigger</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payload Summary</th>
                  <th className="py-3 px-4 text-right">Runtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No automation logs yet. Click "Test Run" on any active workflow to generate a live execution event.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {log.created_at 
                          ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                          : 'Just now'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{log.automation_name || 'Automated Event'}</div>
                        <div className="text-[10px] text-blue-600 font-mono">{log.trigger_event}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-xs">
                        {log.payload_summary || 'Trigger payload evaluated'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono font-semibold">
                        {log.duration_ms || 14}ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE WORKFLOW MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Create Automation Workflow</h3>
              </div>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Workflow Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Auto-Assign Qualified Inbound Leads"
                  value={newWorkflow.name}
                  onChange={e => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="What does this automation accomplish?"
                  value={newWorkflow.description}
                  onChange={e => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 space-y-3">
                <label className="block text-[11px] font-bold text-blue-900 uppercase">1. Trigger Event</label>
                <select
                  value={newWorkflow.triggerType}
                  onChange={e => setNewWorkflow({ ...newWorkflow, triggerType: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="new_lead_created">New Lead Captured (Form / Manual)</option>
                  <option value="appointment_booked">Appointment Booked by Client</option>
                  <option value="invoice_created">New Invoice Issued</option>
                  <option value="invoice_overdue">Invoice Past Due Date</option>
                  <option value="payment_received">Payment Received (Stripe)</option>
                  <option value="deal_stage_changed">Deal Stage Moved in Pipeline</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 uppercase">2. Condition (Optional)</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWorkflow.hasCondition}
                      onChange={e => setNewWorkflow({ ...newWorkflow, hasCondition: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Enable Filter</span>
                  </label>
                </div>

                {newWorkflow.hasCondition && (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Field (e.g. score)"
                      value={newWorkflow.conditionField}
                      onChange={e => setNewWorkflow({ ...newWorkflow, conditionField: e.target.value })}
                      className="text-xs p-2 rounded border border-slate-300 bg-white"
                    />
                    <select
                      value={newWorkflow.conditionOp}
                      onChange={e => setNewWorkflow({ ...newWorkflow, conditionOp: e.target.value })}
                      className="text-xs p-2 rounded border border-slate-300 bg-white"
                    >
                      <option value="greater_than">&gt; (Greater)</option>
                      <option value="less_than">&lt; (Less)</option>
                      <option value="equals">= (Equals)</option>
                      <option value="contains">Contains</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value (e.g. 50)"
                      value={newWorkflow.conditionVal}
                      onChange={e => setNewWorkflow({ ...newWorkflow, conditionVal: e.target.value })}
                      className="text-xs p-2 rounded border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-3">
                <label className="block text-[11px] font-bold text-emerald-900 uppercase">3. Automated Action</label>
                <select
                  value={newWorkflow.actionType}
                  onChange={e => setNewWorkflow({ ...newWorkflow, actionType: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="send_email_notification">Send Automated Email Alert</option>
                  <option value="create_task">Create Follow-up Operational Task</option>
                  <option value="assign_team_member">Assign to Senior Sales Lead</option>
                  <option value="add_tag">Tag Customer (e.g. VIP)</option>
                  <option value="run_ai_action">Execute AI Intelligence Action</option>
                </select>
                <input
                  type="text"
                  placeholder="Target Recipient / Staff ID / Tag Name"
                  value={newWorkflow.actionParam}
                  onChange={e => setNewWorkflow({ ...newWorkflow, actionParam: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs"
                >
                  Save & Activate Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
