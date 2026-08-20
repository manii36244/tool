import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Download, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  ArrowUpRight, 
  PieChart as PieIcon,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

export const AnalyticsGrowthView: React.FC = () => {
  const { showToast, openAiDrawerWithPrompt } = useApp();
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAnalyticsOverview();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const funnelData = [
    { stage: 'Total Inbound Leads', count: 77, conversion: '100%' },
    { stage: 'Qualified Pipeline', count: 42, conversion: '54.5%' },
    { stage: 'Proposals Delivered', count: 28, conversion: '36.3%' },
    { stage: 'Negotiation', count: 18, conversion: '23.3%' },
    { stage: 'Closed Won Customers', count: 14, conversion: '18.1%' },
  ];

  const channelPerformance = [
    { channel: 'Google Search Ads', spend: 3200, revenue: 14500, leads: 34, roas: '4.5x' },
    { channel: 'Organic SEO & Form', spend: 800, revenue: 9800, leads: 22, roas: '12.2x' },
    { channel: 'Referral Partner Program', spend: 1200, revenue: 11200, leads: 14, roas: '9.3x' },
    { channel: 'Executive Webinar Series', spend: 1500, revenue: 8400, leads: 7, roas: '5.6x' },
  ];

  const exportReport = (format: 'csv' | 'json') => {
    const dataStr = format === 'json' 
      ? JSON.stringify(analyticsData, null, 2)
      : `Stage,Count,Conversion\n${funnelData.map(f => `${f.stage},${f.count},${f.conversion}`).join('\n')}`;
    
    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-bi-report-${Date.now()}.${format}`;
    a.click();
    showToast('Report Exported', `Downloaded executive ${format.toUpperCase()} dataset`);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Executive Analytics & Growth Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cross-module business intelligence, unit economics, conversion funnels, and ROAS</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200">
            {['7d', '30d', 'this_quarter', 'this_year'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md capitalize transition-all ${
                  timeRange === r ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => exportReport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Conversion Funnel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">End-to-End Sales & Lead Conversion Funnel</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Conversion velocity from initial lead acquisition to paid customer</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            18.1% Overall Lead-to-Customer Rate
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {funnelData.map((stage, idx) => {
            const pct = (stage.count / 77) * 100;
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-medium">{stage.count} entities</span>
                    <span className="font-bold text-blue-600">{stage.conversion}</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Channel Attribution & ROAS Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Marketing Acquisition Channel ROAS</h3>
          <span className="text-xs text-slate-500">Direct spend attribution</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Ad / Promo Spend</th>
                <th className="py-3 px-4">Leads Attributed</th>
                <th className="py-3 px-4">Closed Revenue</th>
                <th className="py-3 px-4 text-right">Return on Ad Spend (ROAS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channelPerformance.map((chan, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{chan.channel}</td>
                  <td className="py-3 px-4 text-slate-700">${chan.spend.toLocaleString()}</td>
                  <td className="py-3 px-4 font-semibold text-blue-600">{chan.leads}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">${chan.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {chan.roas}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
