import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Calendar, 
  Inbox, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Sparkles,
  Zap,
  BarChart3,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

export const DashboardView: React.FC = () => {
  const { 
    workspace, 
    setIsQuickCreateOpen, 
    openAiDrawerWithPrompt, 
    setActiveView 
  } = useApp();

  const [analytics, setAnalytics] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState<'30d' | 'quarter'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [workspace?.id]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [analyticsData, tasksData, leadsData, appointmentsData, invoicesData] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getTasks(),
        api.getLeads(),
        api.getAppointments(),
        api.getInvoices(),
      ]);
      setAnalytics(analyticsData);
      setTasks(tasksData.slice(0, 5));
      setLeads(leadsData.slice(0, 5));
      setAppointments(appointmentsData.filter(a => a.status === 'confirmed').slice(0, 4));
      setInvoices(invoicesData.slice(0, 4));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const summary = analytics?.summary || {
    totalRevenue: 42850,
    totalExpenses: 11200,
    grossProfit: 31650,
    profitMargin: 74,
    outstandingAmount: 19270,
    overdueAmount: 11649,
    overdueCount: 1,
    pipelineValue: 184200,
    activeDealsCount: 4,
    winRate: 80,
    leadsCount: 156,
    customersCount: 42,
    appointmentsCount: 12,
  };

  const monthlyData = analytics?.charts?.monthlyFinanceTrend || [
    { month: 'Mon', revenue: 4200, goal: 3800 },
    { month: 'Tue', revenue: 6100, goal: 4500 },
    { month: 'Wed', revenue: 8900, goal: 6000 },
    { month: 'Thu', revenue: 7400, goal: 5500 },
    { month: 'Fri', revenue: 5800, goal: 5000 },
    { month: 'Sat', revenue: 9200, goal: 7000 },
    { month: 'Sun', revenue: 10400, goal: 8000 },
    { month: 'Mon', revenue: 4800, goal: 4000 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header Overview Row */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Business Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back. Here is what is happening with {workspace?.name || 'Acme Corp'} today.
          </p>
        </div>
        <div className="flex rounded-md border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            onClick={() => setSelectedRange('30d')}
            className={`rounded px-3 py-1 text-xs font-semibold transition-all ${
              selectedRange === '30d' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setSelectedRange('quarter')}
            className={`rounded px-3 py-1 text-xs font-semibold transition-all ${
              selectedRange === 'quarter' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Last Quarter
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Revenue</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">${summary.totalRevenue.toLocaleString()}.00</span>
            <span className="text-xs font-medium text-emerald-600">+12.4% ↑</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">New Leads</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{summary.leadsCount || 156}</span>
            <span className="text-xs font-medium text-emerald-600">+8.2% ↑</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pipeline Value</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">${summary.pipelineValue.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-400">Stable</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Appointments</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{summary.appointmentsCount || 12} Today</span>
            <span className="text-xs font-medium text-blue-600">3 pending</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Sales Performance</h3>
            <div className="flex gap-3">
              <span className="flex items-center text-[11px] text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span> Revenue
              </span>
              <span className="flex items-center text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300 mr-1.5"></span> Goal
              </span>
            </div>
          </div>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                />
                <Bar dataKey="goal" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Average Deal Velocity: <strong>14 Days</strong></span>
            <button
              onClick={() => setActiveView('finance')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Detailed Analytics →
            </button>
          </div>
        </div>

        {/* Right Column: AI Business Insight + Recent Activity */}
        <div className="flex flex-col gap-6">
          {/* Dark AI Insight Card */}
          <div className="rounded-xl bg-slate-900 p-5 shadow-lg text-white relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-400 text-base">🪄</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Business Insight</span>
              </div>
              <p className="text-sm leading-relaxed font-light text-slate-200">
                "Your conversion rate for <span className="text-blue-400 font-medium">Spring Campaign</span> is 15% higher than average. Consider increasing budget for next week."
              </p>
              <button
                onClick={() => openAiDrawerWithPrompt('Recommend optimal budget reallocation for the Spring Campaign based on 15% higher conversion rate')}
                className="mt-4 text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Apply Optimization</span>
                <span>→</span>
              </button>
            </div>
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-600 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
          </div>

          {/* Clean Recent Activity Card */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-xs font-medium text-slate-700">Invoice <span className="font-bold">#INV-402</span> Paid</p>
                  <p className="text-[10px] text-slate-400">2 minutes ago • Finance</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-xs font-medium text-slate-700">New Lead: <span className="font-bold">Jordan Smith</span></p>
                  <p className="text-[10px] text-slate-400">14 minutes ago • CRM</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-xs font-medium text-slate-700">Appointment Rescheduled</p>
                  <p className="text-[10px] text-slate-400">1 hour ago • Booking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot CRM Leads */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Priority Leads</h3>
            <button onClick={() => setActiveView('crm')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              View CRM →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {leads.map(lead => (
              <div key={lead.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{lead.first_name} {lead.last_name}</p>
                  <p className="text-[11px] text-slate-400">{lead.company || lead.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">${(lead.estimated_value || 0).toLocaleString()}</span>
                  <span className="block text-[10px] font-semibold text-blue-600">Score {lead.score}/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Action Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Action Tasks</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {tasks.filter(t => t.status !== 'completed').length} Pending
            </span>
          </div>
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={async () => {
                    await api.updateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' });
                    loadDashboardData();
                  }}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`text-xs ${task.status === 'completed' ? 'line-through text-slate-400' : 'font-semibold text-slate-800'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="capitalize">{task.priority} Priority</span>
                    <span>•</span>
                    <span>Due {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Soon'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
