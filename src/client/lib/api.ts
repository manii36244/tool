// Typed API Client for NexusOS

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Workspace & Auth
  getWorkspace: () => fetchApi<any>('/workspace'),
  getWorkspaces: () => fetchApi<any[]>('/workspaces'),
  switchWorkspace: (workspaceId: string) => fetchApi<any>('/workspace/switch', { method: 'POST', body: JSON.stringify({ workspaceId }) }),
  updateWorkspace: (data: any) => fetchApi<any>('/workspace', { method: 'PUT', body: JSON.stringify(data) }),
  initUserWorkspace: (data: { userId: string; userEmail: string; userName: string; companyName?: string; avatar?: string }) => 
    fetchApi<any>('/workspace/init-user', { method: 'POST', body: JSON.stringify(data) }),

  // CRM
  getLeads: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return fetchApi<any[]>(`/crm/leads?${query.toString()}`);
  },
  createLead: (data: any) => fetchApi<any>('/crm/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: any) => fetchApi<any>(`/crm/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => fetchApi<any>(`/crm/leads/${id}`, { method: 'DELETE' }),
  convertLead: (id: string) => fetchApi<any>(`/crm/leads/${id}/convert`, { method: 'POST' }),

  getContacts: () => fetchApi<any[]>('/crm/contacts'),
  createContact: (data: any) => fetchApi<any>('/crm/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: string, data: any) => fetchApi<any>(`/crm/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id: string) => fetchApi<any>(`/crm/contacts/${id}`, { method: 'DELETE' }),

  getDeals: () => fetchApi<any[]>('/crm/deals'),
  createDeal: (data: any) => fetchApi<any>('/crm/deals', { method: 'POST', body: JSON.stringify(data) }),
  updateDeal: (id: string, data: any) => fetchApi<any>(`/crm/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeal: (id: string) => fetchApi<any>(`/crm/deals/${id}`, { method: 'DELETE' }),

  getTasks: () => fetchApi<any[]>('/crm/tasks'),
  createTask: (data: any) => fetchApi<any>('/crm/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => fetchApi<any>(`/crm/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => fetchApi<any>(`/crm/tasks/${id}`, { method: 'DELETE' }),

  // Sales & Finance
  getProducts: () => fetchApi<any[]>('/finance/products'),
  createProduct: (data: any) => fetchApi<any>('/finance/products', { method: 'POST', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => fetchApi<any>(`/finance/products/${id}`, { method: 'DELETE' }),
  getQuotes: () => fetchApi<any[]>('/finance/quotes'),
  createQuote: (data: any) => fetchApi<any>('/finance/quotes', { method: 'POST', body: JSON.stringify(data) }),
  deleteQuote: (id: string) => fetchApi<any>(`/finance/quotes/${id}`, { method: 'DELETE' }),
  convertQuote: (id: string) => fetchApi<any>(`/finance/quotes/${id}/convert`, { method: 'POST' }),
  getInvoices: () => fetchApi<any[]>('/finance/invoices'),
  createInvoice: (data: any) => fetchApi<any>('/finance/invoices', { method: 'POST', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => fetchApi<any>(`/finance/invoices/${id}`, { method: 'DELETE' }),
  payInvoice: (id: string, payment_method: string = 'stripe') => fetchApi<any>(`/finance/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify({ payment_method }) }),
  getExpenses: () => fetchApi<any[]>('/finance/expenses'),
  createExpense: (data: any) => fetchApi<any>('/finance/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => fetchApi<any>(`/finance/expenses/${id}`, { method: 'DELETE' }),

  // Marketing
  getCampaigns: () => fetchApi<any[]>('/marketing/campaigns'),
  createCampaign: (data: any) => fetchApi<any>('/marketing/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => fetchApi<any>(`/marketing/campaigns/${id}`, { method: 'DELETE' }),
  getForms: () => fetchApi<any[]>('/marketing/forms'),
  createForm: (data: any) => fetchApi<any>('/marketing/forms', { method: 'POST', body: JSON.stringify(data) }),
  deleteForm: (id: string) => fetchApi<any>(`/marketing/forms/${id}`, { method: 'DELETE' }),
  getCoupons: () => fetchApi<any[]>('/marketing/coupons'),
  createCoupon: (data: any) => fetchApi<any>('/marketing/coupons', { method: 'POST', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => fetchApi<any>(`/marketing/coupons/${id}`, { method: 'DELETE' }),

  // Unified Inbox
  getConversations: () => fetchApi<any[]>('/inbox/conversations'),
  getMessages: (conversationId: string) => fetchApi<any[]>(`/inbox/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: { content: string; is_internal_note?: boolean }) => fetchApi<any>(`/inbox/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  updateConversation: (id: string, data: any) => fetchApi<any>(`/inbox/conversations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Appointments
  getAppointments: () => fetchApi<any[]>('/appointments'),
  getAppointmentTypes: () => fetchApi<any[]>('/appointments/types'),
  createAppointmentType: (data: any) => fetchApi<any>('/appointments/types', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointmentType: (id: string, data: any) => fetchApi<any>(`/appointments/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointmentType: (id: string) => fetchApi<any>(`/appointments/types/${id}`, { method: 'DELETE' }),
  createAppointment: (data: any) => fetchApi<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: any) => fetchApi<any>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id: string) => fetchApi<any>(`/appointments/${id}`, { method: 'DELETE' }),

  // Automations
  getAutomations: () => fetchApi<any[]>('/automations'),
  createAutomation: (data: any) => fetchApi<any>('/automations', { method: 'POST', body: JSON.stringify(data) }),
  updateAutomation: (id: string, data: any) => fetchApi<any>(`/automations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAutomationLogs: () => fetchApi<any[]>('/automations/logs'),
  testAutomation: (id: string) => fetchApi<any>(`/automations/${id}/test`, { method: 'POST' }),

  // AI
  queryAi: (data: { prompt: string; type?: string; context?: any }) => fetchApi<{ content: string; source: string; generatedAt: string }>('/ai/query', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics & BI
  getAnalyticsOverview: () => fetchApi<any>('/analytics/overview'),

  // Team & User Profile
  getTeamMembers: () => fetchApi<any[]>('/team/members'),
  inviteTeamMember: (data: any) => fetchApi<any>('/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id: string, data: any) => fetchApi<any>(`/team/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string) => fetchApi<any>(`/team/members/${id}`, { method: 'DELETE' }),
  updateUserProfile: (data: any) => fetchApi<any>('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateProfile: (data: any) => fetchApi<any>('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications, Search, Audit
  getNotifications: () => fetchApi<any[]>('/notifications'),
  markNotificationsRead: (notifId?: string) => fetchApi<any>('/notifications/mark-read', { method: 'POST', body: JSON.stringify({ notifId }) }),
  globalSearch: (q: string) => fetchApi<{ results: any[] }>(`/search?q=${encodeURIComponent(q)}`),
  getAuditLogs: () => fetchApi<any[]>('/audit-logs'),

  // Billing & Stripe
  getBillingUsage: () => fetchApi<any>('/billing/usage'),
  changePlan: (plan: string) => fetchApi<any>('/billing/change-plan', { method: 'POST', body: JSON.stringify({ plan }) }),
  getStripeStatus: () => fetchApi<{ configured: boolean; mode: string; currency: string }>('/stripe/status'),
  createStripeSubscriptionCheckout: (data: { planId: string; billingCycle?: 'monthly' | 'annual' }) => 
    fetchApi<{ url: string; sessionId: string; mode: string; message?: string }>('/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify(data) }),
  createStripeInvoiceCheckout: (data: { invoiceId: string }) => 
    fetchApi<{ url: string; sessionId: string; mode: string }>('/stripe/invoice-checkout', { method: 'POST', body: JSON.stringify(data) }),
  getWorkerStats: () => fetchApi<any>('/workers/stats'),

  // Public
  getPublicBooking: (slug: string) => fetchApi<any>(`/public/booking/${slug}`),
  submitPublicBooking: (slug: string, data: any) => fetchApi<any>(`/public/booking/${slug}/book`, { method: 'POST', body: JSON.stringify(data) }),
  getPublicForm: (formId: string) => fetchApi<any>(`/public/form/${formId}`),
  submitPublicForm: (formId: string, data: any) => fetchApi<any>(`/public/form/${formId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
};
