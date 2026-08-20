import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Send, 
  Sparkles, 
  Mail, 
  MessageSquare, 
  Phone, 
  User, 
  Building2, 
  DollarSign, 
  Tag, 
  CheckCircle2, 
  Clock, 
  StickyNote, 
  Filter, 
  Search,
  ExternalLink,
  ChevronLeft,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Conversation, Message } from '../../../shared/types.ts';

export const UnifiedInboxView: React.FC = () => {
  const { showToast, refreshData, setActiveView } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
      setShowMobileList(false);
    }
  }, [selectedConvId]);

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvId) return;

    try {
      const newMsg = await api.sendMessage(selectedConvId, {
        content: inputText,
        is_internal_note: isInternalNote,
      });
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      await loadConversations();
      showToast('Message Dispatched', isInternalNote ? 'Internal note saved' : 'Reply sent to customer');
    } catch (err: any) {
      showToast('Send Failed', err.message, 'error');
    }
  };

  const handleGenerateAiReply = async (tone: string = 'professional') => {
    if (!selectedConvId || messages.length === 0) return;
    setIsGeneratingAi(true);
    try {
      const lastMsg = messages[messages.length - 1]?.content || 'Customer inquiry';
      const prompt = `Draft a ${tone} customer support reply to the following customer message:\n"${lastMsg}". Keep it professional, empathetic, and clear.`;
      const res = await api.queryAi({ prompt, type: 'support_reply' });
      setInputText(res.content);
      showToast('AI Draft Generated', `Drafted ${tone} response`);
    } catch (err: any) {
      showToast('AI Generation Failed', err.message, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConvId);

  const filteredConversations = conversations.filter(c => {
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.contact_name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.last_message_preview?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />;
      case 'whatsapp':
        return <Phone className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Unified Omnichannel Inbox</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Real-time centralized Email, WhatsApp, and Web Chat messages with AI drafting</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-blue-600 shadow-2xs w-full sm:w-auto"
          >
            <option value="all">All Channels</option>
            <option value="email">Email Inbound</option>
            <option value="whatsapp">WhatsApp Business</option>
            <option value="chat">Live Web Chat</option>
          </select>
        </div>
      </div>

      {/* Main Inbox Responsive Layout */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex overflow-hidden min-h-0">
        
        {/* Left Column: Conversations List */}
        <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50 ${
          !showMobileList ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-slate-200 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sender, email, subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-hidden text-slate-800 placeholder-slate-400 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length > 0 ? (
              filteredConversations.map(conv => {
                const isSelected = conv.id === selectedConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setShowMobileList(false);
                    }}
                    className={`p-3.5 text-left cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(conv.channel)}
                        <span className="text-xs font-bold text-slate-800 truncate">{conv.contact_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-700 truncate">{conv.subject || 'Customer Inquiry'}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{conv.last_message_preview}</p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {conv.channel}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching messages found.
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Active Thread */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white ${
          showMobileList ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Thread Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {selectedConversation?.contact_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">{selectedConversation?.contact_name}</h3>
                <p className="text-[11px] text-slate-500">{selectedConversation?.contact_email} • Via {selectedConversation?.channel?.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                selectedConversation?.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {selectedConversation?.status || 'open'}
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-slate-50/40">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-3.5 rounded-xl text-xs shadow-2xs ${
                    msg.is_internal_note
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : msg.sender_type === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.is_internal_note && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 uppercase mb-1">
                      <StickyNote className="w-3 h-3" />
                      <span>Internal Team Note (Private)</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <span className={`text-[10px] block mt-1.5 ${
                    msg.sender_type === 'user' && !msg.is_internal_note ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Helper Bar */}
          <div className="px-3 sm:px-4 py-2 bg-blue-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-900 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Auto-Draft:</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleGenerateAiReply('professional')}
                disabled={isGeneratingAi}
                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors"
              >
                Professional
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAiReply('friendly')}
                disabled={isGeneratingAi}
                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors"
              >
                Friendly
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAiReply('urgent')}
                disabled={isGeneratingAi}
                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors"
              >
                Direct
              </button>
            </div>
          </div>

          {/* Reply Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInternalNote(false)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    !isInternalNote ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Customer Reply
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternalNote(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    isInternalNote ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <StickyNote className="w-3 h-3" />
                  <span>Internal Note</span>
                </button>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                rows={3}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={isInternalNote ? "Write a private internal team note..." : "Type reply to customer..."}
                className={`w-full text-xs p-2.5 rounded-md border focus:outline-blue-600 ${
                  isInternalNote ? 'bg-amber-50/50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 shadow-xs shrink-0 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Customer Context Profile */}
        <div className="w-72 border-l border-slate-200 p-4 bg-slate-50/60 hidden xl:flex flex-col space-y-4">
          <div className="text-center pb-3 border-b border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-base mx-auto mb-2 shadow-2xs">
              {selectedConversation?.contact_name?.charAt(0) || 'C'}
            </div>
            <h4 className="text-xs font-bold text-slate-900">{selectedConversation?.contact_name}</h4>
            <p className="text-[11px] text-slate-500">{selectedConversation?.contact_email}</p>
          </div>

          <div className="space-y-2">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Inbound Channel</span>
              <p className="text-xs font-bold text-slate-800 capitalize mt-0.5">{selectedConversation?.channel}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Customer Lifetime Value</span>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">$38,500</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Active Invoices</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">INV-2026-001</p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('crm')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <span>Open CRM Profile</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
