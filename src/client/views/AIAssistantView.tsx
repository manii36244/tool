import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  Copy, 
  Download, 
  HelpCircle, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CreditCard, 
  Megaphone, 
  FileText, 
  Loader2,
  CheckCheck,
  Search,
  Receipt
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

export const AIAssistantView: React.FC = () => {
  const { showToast } = useApp();
  const [prompt, setPrompt] = useState('');
  const [responseType, setResponseType] = useState<'general' | 'financial' | 'sales_email' | 'marketing' | 'proposal'>('general');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>>([
    {
      role: 'assistant',
      content: `Welcome to **Nexus AI Business Intelligence Copilot**.\n\nI have complete real-time access to your entire system: **Clients, Invoices (Paid amounts & Remaining balances), Leads, Sales Deals, Appointments, Expenses, and Campaigns**.\n\nAsk me anything about any client, invoice, or financial status (in English, Urdu, or Roman Urdu)!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const businessPrompts = [
    { title: '🔍 Search Client Details', prompt: 'Search and show full details for client Sarah Connor including company, phone, email, and associated invoices' },
    { title: '💰 Invoice Balances & Amounts', prompt: 'Check all invoices: how much has each client paid and how much balance is remaining?' },
    { title: '📄 Specific Invoice Breakdown', prompt: 'Show detailed ledger and breakdown for invoice INV-2026-001' },
    { title: '⚠️ Overdue Invoices & Collection', prompt: 'Which invoices are currently overdue and what is the optimal recovery action for each?' },
    { title: '👥 Top Revenue Clients', prompt: 'Which clients have generated the highest lifetime value in our workspace?' },
    { title: '🎯 Uncontacted High-Score Leads', prompt: 'Which leads with a score above 70 have not been contacted yet?' },
  ];

  const handleQuery = async (customPrompt?: string) => {
    const text = (customPrompt || prompt).trim();
    if (!text || isLoading) return;

    setChatHistory(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await api.queryAi({ prompt: text, type: responseType });
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message || 'AI service failure'}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied', 'Content copied to clipboard');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-xl text-white shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30">
              GEMINI 2.5 FLASH INTEL ENGINE
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold mt-2 tracking-tight text-white">Nexus AI Business Intelligence Copilot</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Instantly search any client profile, query invoice amounts paid vs remaining balances, analyze pipeline deals, and draft customer replies.
          </p>
        </div>
      </div>

      {/* Instant Business Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {businessPrompts.map((bp, idx) => (
          <button
            key={idx}
            onClick={() => handleQuery(bp.prompt)}
            className="p-3.5 sm:p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left shadow-2xs transition-all flex flex-col justify-between group"
          >
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              {bp.title}
            </span>
            <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{bp.prompt}</p>
          </button>
        ))}
      </div>

      {/* Main Conversation & Output View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-xl p-3.5 sm:p-4 text-xs shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none leading-relaxed'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content.split('\n').map((line, lIdx) => {
                    if (line.startsWith('### ')) {
                      return <h4 key={lIdx} className="font-bold text-sm text-slate-900 mt-2 mb-1">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={lIdx} className="font-bold text-slate-900 mb-1">{line.replace(/\*\*/g, '')}</p>;
                    }
                    return <p key={lIdx} className="mb-1 last:mb-0">{line}</p>;
                  })}
                </div>
                <div className={`flex items-center justify-between gap-2 mt-3 pt-2 border-t text-[10px] ${
                  msg.role === 'user' ? 'border-blue-500/50 text-blue-100' : 'border-slate-100 text-slate-400'
                }`}>
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyText(msg.content)}
                      className="hover:text-slate-700 flex items-center gap-1 font-semibold transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Output</span>
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200 max-w-xs shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Searching system data & generating answer...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleQuery();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask about any client, invoice (INV-001), remaining balance, leads, or finance..."
              className="flex-1 text-xs p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-blue-600 focus:bg-white transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
