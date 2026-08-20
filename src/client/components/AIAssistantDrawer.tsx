import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User as UserIcon, Loader2, ArrowRight, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
}

export const AIAssistantDrawer: React.FC = () => {
  const { isAiDrawerOpen, setIsAiDrawerOpen, aiDrawerInitialPrompt, showToast } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **Nexus AI Business Copilot**.\n\nI have direct authorized access to your live CRM, deals, invoices, customer inbox, campaigns, and appointments data. How can I help optimize your operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'gemini-2.5-flash',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Which leads have not been contacted?',
    'What was my revenue this month?',
    'Which customers generated the most revenue?',
    'Which invoices are overdue?',
    'Which campaigns generated the most leads?',
    'Draft a high-converting sales follow-up email',
  ];

  useEffect(() => {
    if (aiDrawerInitialPrompt) {
      handleSend(aiDrawerInitialPrompt);
    }
  }, [aiDrawerInitialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.queryAi({ prompt: text, type: 'chat' });
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: response.source,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error executing AI query: ${err.message || 'Unable to connect to AI engine'}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to Clipboard', 'Text copied successfully');
  };

  if (!isAiDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        onClick={() => setIsAiDrawerOpen(false)}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-blue-200 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Nexus AI Assistant</h3>
                <p className="text-[10px] text-blue-300">Live Workspace Intelligence Copilot</p>
              </div>
            </div>
            <button
              onClick={() => setIsAiDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Instant Business Queries
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-md shrink-0 shadow-2xs transition-all flex items-center gap-1"
                >
                  <span>{p}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-3.5 text-xs shadow-2xs ${
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
                      return <p key={lIdx} className="mb-1 last:mb-0">{line}</p>;
                    })}
                  </div>
                  <div className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t text-[10px] ${
                    msg.role === 'user' ? 'border-blue-500/50 text-blue-100' : 'border-slate-100 text-slate-400'
                  }`}>
                    <span>{msg.timestamp} {msg.source ? `• ${msg.source}` : ''}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        className="hover:text-slate-600 flex items-center gap-0.5"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Synthesizing live workspace intelligence...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about revenue, deals, email drafts..."
                className="w-full text-xs pl-3.5 pr-10 py-2.5 rounded-md border border-slate-200 focus:outline-blue-600 text-slate-800 placeholder-slate-400 bg-slate-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
