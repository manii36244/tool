import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Code, 
  Link, 
  Tag, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  QrCode, 
  TrendingUp, 
  Sparkles, 
  Eye, 
  Layers, 
  BarChart3, 
  DollarSign, 
  Users, 
  Target, 
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Campaign, LeadForm, Coupon } from '../../../shared/types.ts';

export const MarketingView: React.FC = () => {
  const { showToast, refreshData, openAiDrawerWithPrompt } = useApp();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'forms' | 'utm' | 'coupons'>('campaigns');
  const [isLoading, setIsLoading] = useState(true);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // UTM Generator State
  const [utmUrl, setUtmUrl] = useState('https://mybusiness.nexus.app/offer');
  const [utmSource, setUtmSource] = useState('google');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmCampaign, setUtmCampaign] = useState('q4_growth_inbound');
  const [utmTerm, setUtmTerm] = useState('business-management-software');

  // New Campaign Modal
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'lead_gen',
    budget: 3500,
    target_audience: 'B2B Founders & Managing Directors',
  });

  // New Form Modal
  const [isNewFormOpen, setIsNewFormOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
  });

  // New Coupon Modal
  const [isNewCouponOpen, setIsNewCouponOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 20,
    max_uses: 100,
  });

  useEffect(() => {
    loadMarketingData();
  }, []);

  const loadMarketingData = async () => {
    setIsLoading(true);
    try {
      const [cData, fData, coupData] = await Promise.all([
        api.getCampaigns().catch(() => []),
        api.getForms().catch(() => []),
        api.getCoupons().catch(() => []),
      ]);
      setCampaigns(Array.isArray(cData) ? cData : []);
      setForms(Array.isArray(fData) ? fData : []);
      setCoupons(Array.isArray(coupData) ? coupData : []);
    } catch (err) {
      console.error('Error loading marketing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCampaign(newCampaign);
      showToast('Campaign Created', newCampaign.name);
      setIsNewCampaignOpen(false);
      setNewCampaign({ name: '', type: 'lead_gen', budget: 3500, target_audience: 'B2B Founders' });
      await loadMarketingData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createForm({
        ...newForm,
        fields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Work Email', type: 'email', required: true },
          { name: 'company', label: 'Company', type: 'text', required: false },
          { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
        ]
      });
      showToast('Lead Form Created', newForm.title);
      setIsNewFormOpen(false);
      setNewForm({ title: '', description: '' });
      await loadMarketingData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCoupon(newCoupon);
      showToast('Coupon Created', newCoupon.code);
      setIsNewCouponOpen(false);
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: 100 });
      await loadMarketingData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) return;
    try {
      await api.deleteCampaign(id);
      showToast('Campaign Deleted', `Deleted campaign ${name}`);
      await loadMarketingData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteForm = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete form "${title}"?`)) return;
    try {
      await api.deleteForm(id);
      showToast('Form Deleted', `Deleted lead form ${title}`);
      await loadMarketingData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete promo coupon "${code}"?`)) return;
    try {
      await api.deleteCoupon(id);
      showToast('Coupon Deleted', `Deleted promo coupon ${code}`);
      await loadMarketingData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const generatedUtm = `${utmUrl || 'https://mybusiness.nexus.app'}?utm_source=${encodeURIComponent(utmSource || 'google')}&utm_medium=${encodeURIComponent(utmMedium || 'cpc')}&utm_campaign=${encodeURIComponent(utmCampaign || 'campaign')}${utmTerm ? `&utm_term=${encodeURIComponent(utmTerm)}` : ''}`;

  const copyToClipboard = (text: string, title = 'Copied!') => {
    navigator.clipboard.writeText(text);
    showToast(title, 'Copied to clipboard');
  };

  const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c?.budget) || 0), 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + (Number(c?.actual_spend ?? c?.spend) || 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (Number(c?.leads_generated ?? c?.leads_count) || 0), 0);
  const totalPipeline = campaigns.reduce((sum, c) => sum + (Number(c?.pipeline_value_generated) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Marketing & Growth Hub</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Campaign budgets, lead capture funnels, UTM attribution, and promo coupons</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadMarketingData()}
            title="Refresh Data"
            className="p-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openAiDrawerWithPrompt('Generate 3 high-converting B2B campaign angles with ad copy and hooks')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Growth Copy</span>
          </button>
          <button
            onClick={() => {
              if (activeTab === 'campaigns') setIsNewCampaignOpen(true);
              else if (activeTab === 'forms') setIsNewFormOpen(true);
              else if (activeTab === 'coupons') setIsNewCouponOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'campaigns' ? 'Launch Campaign' : activeTab === 'forms' ? 'Create Form' : activeTab === 'coupons' ? 'New Coupon' : 'Create Campaign'}
            </span>
          </button>
        </div>
      </div>

      {/* Purpose Explanation Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Growth Intelligence
            </span>
            <h3 className="text-sm font-semibold text-white">Why Track Marketing Budgets & Funnels?</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            This module links your marketing spend directly to CRM leads, deal pipelines, and closed revenue. 
            By tracking allocated budgets against actual ad spend and conversions, you get clear ROI figures (+{totalSpend > 0 ? Math.round(((totalPipeline - totalSpend) / totalSpend) * 100) : 0}% current ROI) to see which customer acquisition channels generate real profit.
          </p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 text-right shrink-0 min-w-[150px]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Generated Pipeline</div>
          <div className="text-base sm:text-lg font-bold text-emerald-400">${totalPipeline.toLocaleString()}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Budget</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900">${totalBudget.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1">Cap across active campaigns</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Actual Spend</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900">${totalSpend.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {totalBudget > 0 ? `${Math.round((totalSpend / totalBudget) * 100)}% budget utilized` : 'Ad & outreach cost'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Leads Captured</span>
            <Users className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-blue-600">{totalLeads}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {totalLeads > 0 ? `$${Math.round(totalSpend / totalLeads)} Cost/Lead` : 'From forms & ads'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Active Forms</span>
            <Code className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{forms.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Embeddable capture widgets</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'campaigns' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Growth Campaigns ({campaigns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'forms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Lead Capture Forms ({forms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('utm')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'utm' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>UTM & QR Generator</span>
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'coupons' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Promotions & Coupons ({coupons.length})</span>
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Campaigns Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Launch multi-channel ad campaigns, webinar funnels, and referral initiatives with full ROI tracking.</p>
              <button
                onClick={() => setIsNewCampaignOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 shadow-2xs"
              >
                Launch First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {campaigns.map(camp => {
                const budget = Number(camp?.budget) || 0;
                const spend = Number(camp?.spend) || 0;
                const revenue = Number(camp?.revenue_generated) || 0;
                const leads = Number(camp?.leads_count) || 0;
                const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

                return (
                  <div key={camp.id || `camp-${Math.random()}`} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{camp?.name || 'Untitled Campaign'}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Audience: {camp?.target_audience || 'General B2B'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          camp?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {camp?.status || 'Active'}
                        </span>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                          title="Delete Campaign"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">Budget</span>
                        <span className="text-xs font-bold text-slate-800">${budget.toLocaleString()}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">Spent</span>
                        <span className="text-xs font-bold text-slate-800">${spend.toLocaleString()}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">Leads</span>
                        <span className="text-xs font-bold text-blue-600">{leads}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-600 font-semibold block">ROI</span>
                        <span className="text-xs font-bold text-emerald-700">+{roi.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEAD CAPTURE FORMS */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          {forms.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
              <Code className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Lead Forms Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Create embeddable website forms that automatically capture leads and trigger automations.</p>
              <button
                onClick={() => setIsNewFormOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 shadow-2xs"
              >
                Create Lead Form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {forms.map(f => {
                const embedSnippet = `<iframe src="${window.location.origin}/form/${f.id}" width="100%" height="450" frameborder="0"></iframe>`;
                return (
                  <div key={f.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{f.title || 'Inbound Lead Form'}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{f.description || 'Website capture funnel'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {f.submission_count || 0} Submissions
                        </span>
                        <button
                          onClick={() => handleDeleteForm(f.id, f.title)}
                          title="Delete Lead Form"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono flex items-center justify-between shadow-2xs overflow-hidden">
                      <span className="truncate mr-2">{embedSnippet}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(embedSnippet, 'Embed Snippet Copied')}
                          title="Copy Embed Code"
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/form/${f.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Form Live"
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UTM & QR CODE GENERATOR */}
      {activeTab === 'utm' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Custom Campaign Link Builder</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Destination URL</label>
                <input
                  type="text"
                  value={utmUrl}
                  onChange={e => setUtmUrl(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTM Source</label>
                  <input
                    type="text"
                    value={utmSource}
                    onChange={e => setUtmSource(e.target.value)}
                    placeholder="google / newsletter / facebook"
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTM Medium</label>
                  <input
                    type="text"
                    value={utmMedium}
                    onChange={e => setUtmMedium(e.target.value)}
                    placeholder="cpc / email / banner"
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTM Campaign</label>
                  <input
                    type="text"
                    value={utmCampaign}
                    onChange={e => setUtmCampaign(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">UTM Term / Keyword</label>
                  <input
                    type="text"
                    value={utmTerm}
                    onChange={e => setUtmTerm(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Generated Trackable Link</h3>
              <p className="text-[11px] text-slate-500 mb-3">Copy this URL or generate QR code for print, social, and physical campaigns</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all select-all">
                {generatedUtm}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-2xs shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Instant QR Ready</p>
                  <p className="text-[10px] text-slate-400">Scannable redirect for print materials</p>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(generatedUtm, 'Campaign Link Copied')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          {coupons.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
              <Tag className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Active Coupons</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Create promo codes and discount vouchers for invoices and quotes.</p>
              <button
                onClick={() => setIsNewCouponOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 shadow-2xs"
              >
                Create Promo Code
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {coupons.map(coup => (
                <div key={coup.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                      {coup.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-600">
                        {coup.discount_type === 'percentage' ? `${coup.discount_value}% OFF` : `$${coup.discount_value} OFF`}
                      </span>
                      <button
                        onClick={() => handleDeleteCoupon(coup.id, coup.code)}
                        title="Delete Promo Code"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span>Redeemed: {coup.times_used || 0} / {coup.max_uses || 100}</span>
                    <span className="font-semibold text-emerald-600">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Launch Campaign Modal */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Launch Growth Campaign</h3>
            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <input
                required
                placeholder="Campaign Name (e.g. Q4 Executive Summit Inbound)"
                value={newCampaign.name}
                onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="number"
                  placeholder="Budget ($)"
                  value={newCampaign.budget}
                  onChange={e => setNewCampaign({ ...newCampaign, budget: Number(e.target.value) })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
                <select
                  value={newCampaign.type}
                  onChange={e => setNewCampaign({ ...newCampaign, type: e.target.value })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                >
                  <option value="lead_gen">Lead Generation</option>
                  <option value="webinar">Webinar</option>
                  <option value="referral">Referral Program</option>
                </select>
              </div>
              <input
                placeholder="Target Audience (e.g. SMB Founders, VP Sales)"
                value={newCampaign.target_audience}
                onChange={e => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Form Modal */}
      {isNewFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create Lead Capture Form</h3>
            <form onSubmit={handleCreateForm} className="space-y-3">
              <input
                required
                placeholder="Form Title (e.g. Request Demo & Discovery)"
                value={newForm.title}
                onChange={e => setNewForm({ ...newForm, title: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <textarea
                placeholder="Description / Subtitle for leads"
                value={newForm.description}
                onChange={e => setNewForm({ ...newForm, description: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                rows={2}
              />
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewFormOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Create Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Coupon Modal */}
      {isNewCouponOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create Promo Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <input
                required
                placeholder="Coupon Code (e.g. VIP2026, SUMMER20)"
                value={newCoupon.code}
                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600 font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newCoupon.discount_type}
                  onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
                <input
                  required
                  type="number"
                  placeholder="Discount Value"
                  value={newCoupon.discount_value}
                  onChange={e => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                  className="text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <input
                type="number"
                placeholder="Max Redemptions"
                value={newCoupon.max_uses}
                onChange={e => setNewCoupon({ ...newCoupon, max_uses: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCouponOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
