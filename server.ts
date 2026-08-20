import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, PLAN_CONFIGS } from './src/server/db/mockDb.ts';
import { processAiQuery } from './src/server/services/aiService.ts';
import { triggerAutomationEvent } from './src/server/services/automationService.ts';
import { workerSimulator, calculateWorkspaceUsage } from './src/server/services/workerService.ts';
import { getStripeClient, createSubscriptionCheckoutSession, createInvoicePaymentCheckoutSession, handleStripeWebhookEvent } from './src/server/services/stripeService.ts';
import { Lead, Contact, Deal, Task, Invoice, Expense, MarketingCampaign, LeadCaptureForm, Appointment, AuditLog, Message, AutomationWorkflow } from './shared/types.ts';

let currentWorkspaceId = 'ws-nexus-01';
let currentUserId = 'usr-owner-01';

function logAudit(workspaceId: string, action: string, entityType: string, entityId: string, entityTitle: string, metadata: any = {}) {
  const user = db.users.find(u => u.id === currentUserId) || db.users[0];
  const audit: AuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    workspace_id: workspaceId,
    user_id: user.id,
    user_name: user.name,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_title: entityTitle,
    metadata,
    ip_address: '198.51.100.42',
    created_at: new Date().toISOString()
  };
  db.auditLogs.unshift(audit);
  if (db.auditLogs.length > 200) db.auditLogs.pop();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // API ROUTES (REST APIs)
  // -------------------------------------------------------------

  // 1. Workspace & Auth & RBAC
  app.get('/api/v1/workspace', (req, res) => {
    const ws = db.workspaces.find(w => w.id === currentWorkspaceId) || db.workspaces[0];
    const user = db.users.find(u => u.id === currentUserId) || db.users[0];
    const teamMembers = db.users.filter(u => u.workspace_id === ws.id);
    res.json({ workspace: ws, user, teamMembers, plan: PLAN_CONFIGS[ws.subscription_plan] });
  });

  app.get('/api/v1/workspaces', (req, res) => {
    res.json(db.workspaces);
  });

  app.post('/api/v1/workspace/switch', (req, res) => {
    const { workspaceId } = req.body;
    const target = db.workspaces.find(w => w.id === workspaceId);
    if (target) {
      currentWorkspaceId = target.id;
      logAudit(target.id, 'SWITCH_WORKSPACE', 'workspace', target.id, target.name);
      return res.json({ success: true, workspace: target });
    }
    res.status(404).json({ error: 'Workspace not found' });
  });

  app.put('/api/v1/workspace', (req, res) => {
    const ws = db.workspaces.find(w => w.id === currentWorkspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    Object.assign(ws, req.body);
    logAudit(ws.id, 'UPDATE_WORKSPACE_SETTINGS', 'workspace', ws.id, ws.name, req.body);
    res.json(ws);
  });

  // 2. CRM: Leads, Contacts, Deals, Tasks, Timeline
  app.get('/api/v1/crm/leads', (req, res) => {
    const { status, search } = req.query;
    let leads = db.leads.filter(l => l.workspace_id === currentWorkspaceId);
    if (status && status !== 'all') leads = leads.filter(l => l.status === status);
    if (search) {
      const q = String(search).toLowerCase();
      leads = leads.filter(l => `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) || (l.company && l.company.toLowerCase().includes(q)) || l.email.toLowerCase().includes(q));
    }
    res.json(leads);
  });

  app.post('/api/v1/crm/leads', async (req, res) => {
    const leadData: Lead = {
      id: `lead-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      first_name: req.body.first_name || 'New',
      last_name: req.body.last_name || 'Lead',
      company: req.body.company || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      status: req.body.status || 'new',
      source: req.body.source || 'manual',
      score: req.body.score || 40,
      estimated_value: Number(req.body.estimated_value) || 0,
      notes: req.body.notes || '',
      tags: req.body.tags || ['Inbound'],
      assigned_to: req.body.assigned_to || currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.leads.unshift(leadData);
    logAudit(currentWorkspaceId, 'CREATE_LEAD', 'lead', leadData.id, `${leadData.first_name} ${leadData.last_name}`);
    
    // Trigger Automations
    await triggerAutomationEvent(currentWorkspaceId, 'new_lead_created', leadData);
    res.status(201).json(leadData);
  });

  app.put('/api/v1/crm/leads/:id', (req, res) => {
    const lead = db.leads.find(l => l.id === req.params.id && l.workspace_id === currentWorkspaceId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    Object.assign(lead, req.body, { updated_at: new Date().toISOString() });
    logAudit(currentWorkspaceId, 'UPDATE_LEAD', 'lead', lead.id, `${lead.first_name} ${lead.last_name}`, req.body);
    res.json(lead);
  });

  app.delete('/api/v1/crm/leads/:id', (req, res) => {
    const index = db.leads.findIndex(l => l.id === req.params.id && l.workspace_id === currentWorkspaceId);
    if (index === -1) return res.status(404).json({ error: 'Lead not found' });
    const [deleted] = db.leads.splice(index, 1);
    logAudit(currentWorkspaceId, 'DELETE_LEAD', 'lead', deleted.id, `${deleted.first_name} ${deleted.last_name}`);
    res.json({ success: true });
  });

  app.post('/api/v1/crm/leads/:id/convert', async (req, res) => {
    const lead = db.leads.find(l => l.id === req.params.id && l.workspace_id === currentWorkspaceId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.status = 'converted';
    lead.updated_at = new Date().toISOString();

    // Create Contact/Customer
    const newContact: Contact = {
      id: `cnt-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      company_name: lead.company,
      type: 'customer',
      total_spent: 0,
      assigned_to: lead.assigned_to,
      tags: [...lead.tags, 'Converted Lead'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.contacts.unshift(newContact);

    // Create Deal
    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      title: `${lead.company || lead.first_name + ' ' + lead.last_name} Opportunity`,
      value: lead.estimated_value || 10000,
      stage: 'qualification',
      probability: 50,
      contact_id: newContact.id,
      assigned_to: lead.assigned_to,
      tags: ['Converted'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.deals.unshift(newDeal);

    logAudit(currentWorkspaceId, 'CONVERT_LEAD_TO_CUSTOMER', 'lead', lead.id, `${lead.first_name} ${lead.last_name}`);
    await triggerAutomationEvent(currentWorkspaceId, 'new_customer_created', newContact);

    res.json({ lead, contact: newContact, deal: newDeal });
  });

  app.get('/api/v1/crm/contacts', (req, res) => {
    const contacts = db.contacts.filter(c => c.workspace_id === currentWorkspaceId);
    res.json(contacts);
  });

  app.post('/api/v1/crm/contacts', async (req, res) => {
    const contact: Contact = {
      id: `cnt-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      phone: req.body.phone,
      job_title: req.body.job_title,
      company_name: req.body.company_name,
      type: req.body.type || 'customer',
      total_spent: Number(req.body.total_spent) || 0,
      tags: req.body.tags || ['Customer'],
      assigned_to: req.body.assigned_to || currentUserId,
      address: req.body.address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.contacts.unshift(contact);
    logAudit(currentWorkspaceId, 'CREATE_CONTACT', 'contact', contact.id, `${contact.first_name} ${contact.last_name}`);
    await triggerAutomationEvent(currentWorkspaceId, 'new_customer_created', contact);
    res.status(201).json(contact);
  });

  app.put('/api/v1/crm/contacts/:id', (req, res) => {
    const contact = db.contacts.find(c => c.id === req.params.id && c.workspace_id === currentWorkspaceId);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    Object.assign(contact, req.body, { updated_at: new Date().toISOString() });
    logAudit(currentWorkspaceId, 'UPDATE_CONTACT', 'contact', contact.id, `${contact.first_name} ${contact.last_name}`);
    res.json(contact);
  });

  app.get('/api/v1/crm/deals', (req, res) => {
    const deals = db.deals.filter(d => d.workspace_id === currentWorkspaceId);
    res.json(deals);
  });

  app.post('/api/v1/crm/deals', async (req, res) => {
    const deal: Deal = {
      id: `deal-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      title: req.body.title,
      value: Number(req.body.value) || 0,
      stage: req.body.stage || 'discovery',
      probability: Number(req.body.probability) || 20,
      expected_close_date: req.body.expected_close_date,
      contact_id: req.body.contact_id,
      assigned_to: req.body.assigned_to || currentUserId,
      tags: req.body.tags || [],
      notes: req.body.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.deals.unshift(deal);
    logAudit(currentWorkspaceId, 'CREATE_DEAL', 'deal', deal.id, deal.title, { value: deal.value });
    res.status(201).json(deal);
  });

  app.put('/api/v1/crm/deals/:id', async (req, res) => {
    const deal = db.deals.find(d => d.id === req.params.id && d.workspace_id === currentWorkspaceId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const oldStage = deal.stage;
    Object.assign(deal, req.body, { updated_at: new Date().toISOString() });
    
    if (req.body.stage && req.body.stage !== oldStage) {
      logAudit(currentWorkspaceId, 'CHANGE_DEAL_STAGE', 'deal', deal.id, deal.title, { from: oldStage, to: req.body.stage });
      await triggerAutomationEvent(currentWorkspaceId, 'deal_stage_changed', deal);
    }
    res.json(deal);
  });

  app.get('/api/v1/crm/tasks', (req, res) => {
    const tasks = db.tasks.filter(t => t.workspace_id === currentWorkspaceId);
    res.json(tasks);
  });

  app.post('/api/v1/crm/tasks', (req, res) => {
    const task: Task = {
      id: `tsk-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority || 'medium',
      status: req.body.status || 'todo',
      assigned_to: req.body.assigned_to || currentUserId,
      due_date: req.body.due_date,
      related_entity_type: req.body.related_entity_type,
      related_entity_id: req.body.related_entity_id,
      related_entity_name: req.body.related_entity_name,
      created_at: new Date().toISOString(),
    };
    db.tasks.unshift(task);
    logAudit(currentWorkspaceId, 'CREATE_TASK', 'task', task.id, task.title);
    res.status(201).json(task);
  });

  app.put('/api/v1/crm/tasks/:id', async (req, res) => {
    const task = db.tasks.find(t => t.id === req.params.id && t.workspace_id === currentWorkspaceId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const oldStatus = task.status;
    Object.assign(task, req.body);
    if (req.body.status === 'completed' && oldStatus !== 'completed') {
      task.completed_at = new Date().toISOString();
      await triggerAutomationEvent(currentWorkspaceId, 'task_completed', task);
    }
    res.json(task);
  });

  // 3. Sales & Finance: Products, Quotes, Invoices, Expenses
  app.get('/api/v1/finance/products', (req, res) => {
    res.json(db.productsServices.filter(p => p.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/finance/products', (req, res) => {
    const product = {
      id: `prod-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      ...req.body,
      created_at: new Date().toISOString(),
    };
    db.productsServices.unshift(product);
    res.status(201).json(product);
  });

  app.get('/api/v1/finance/quotes', (req, res) => {
    res.json(db.quotes.filter(q => q.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/finance/quotes', (req, res) => {
    const quote = {
      id: `qte-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      quote_number: `QTE-2026-${Math.floor(100 + Math.random() * 900)}`,
      ...req.body,
      created_at: new Date().toISOString(),
    };
    db.quotes.unshift(quote);
    res.status(201).json(quote);
  });

  app.post('/api/v1/finance/quotes/:id/convert', (req, res) => {
    const quote = db.quotes.find(q => q.id === req.params.id && q.workspace_id === currentWorkspaceId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    quote.status = 'accepted';
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      invoice_number: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      contact_id: quote.contact_id,
      contact_name: quote.contact_name,
      contact_email: quote.contact_email,
      status: 'sent',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      line_items: quote.line_items,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      discount_amount: quote.discount_amount,
      total: quote.total,
      paid_amount: 0,
      currency: 'USD',
      created_at: new Date().toISOString(),
    };

    quote.converted_invoice_id = invoice.id;
    db.invoices.unshift(invoice);
    logAudit(currentWorkspaceId, 'CONVERT_QUOTE_TO_INVOICE', 'quote', quote.id, quote.quote_number, { invoice_number: invoice.invoice_number });
    res.json({ quote, invoice });
  });

  app.get('/api/v1/finance/invoices', (req, res) => {
    res.json(db.invoices.filter(i => i.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/finance/invoices', async (req, res) => {
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      invoice_number: req.body.invoice_number || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      contact_id: req.body.contact_id || 'cnt-01',
      contact_name: req.body.contact_name || 'Client',
      contact_email: req.body.contact_email || 'client@example.com',
      status: req.body.status || 'sent',
      issue_date: req.body.issue_date || new Date().toISOString().split('T')[0],
      due_date: req.body.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      line_items: req.body.line_items || [],
      subtotal: Number(req.body.subtotal) || 0,
      tax_amount: Number(req.body.tax_amount) || 0,
      discount_amount: Number(req.body.discount_amount) || 0,
      total: Number(req.body.total) || 0,
      paid_amount: Number(req.body.paid_amount) || 0,
      currency: req.body.currency || 'USD',
      notes: req.body.notes,
      terms: req.body.terms,
      created_at: new Date().toISOString(),
    };

    db.invoices.unshift(invoice);
    logAudit(currentWorkspaceId, 'CREATE_INVOICE', 'invoice', invoice.id, invoice.invoice_number, { total: invoice.total });
    await triggerAutomationEvent(currentWorkspaceId, 'invoice_created', invoice);
    res.status(201).json(invoice);
  });

  app.post('/api/v1/finance/invoices/:id/pay', async (req, res) => {
    const invoice = db.invoices.find(i => i.id === req.params.id && i.workspace_id === currentWorkspaceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    invoice.status = 'paid';
    invoice.paid_amount = invoice.total;
    invoice.paid_at = new Date().toISOString();
    invoice.payment_method = req.body.payment_method || 'stripe';

    // Update customer total spent
    const contact = db.contacts.find(c => c.id === invoice.contact_id);
    if (contact) {
      contact.total_spent = (contact.total_spent || 0) + invoice.total;
    }

    logAudit(currentWorkspaceId, 'RECORD_PAYMENT', 'invoice', invoice.id, invoice.invoice_number, { amount: invoice.total });
    await triggerAutomationEvent(currentWorkspaceId, 'payment_received', invoice);
    res.json(invoice);
  });

  app.get('/api/v1/finance/expenses', (req, res) => {
    res.json(db.expenses.filter(e => e.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/finance/expenses', (req, res) => {
    const expense: Expense = {
      id: `exp-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      category: req.body.category || 'Other',
      description: req.body.description,
      amount: Number(req.body.amount) || 0,
      date: req.body.date || new Date().toISOString().split('T')[0],
      payment_method: req.body.payment_method || 'Corporate Visa',
      vendor: req.body.vendor,
      receipt_url: req.body.receipt_url,
      tax_deductible: req.body.tax_deductible ?? true,
      notes: req.body.notes,
      created_at: new Date().toISOString(),
    };
    db.expenses.unshift(expense);
    logAudit(currentWorkspaceId, 'CREATE_EXPENSE', 'expense', expense.id, expense.description, { amount: expense.amount });
    res.status(201).json(expense);
  });

  // 4. Marketing & Growth: Campaigns, Forms, Coupons
  app.get('/api/v1/marketing/campaigns', (req, res) => {
    res.json(db.campaigns.filter(c => c.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/marketing/campaigns', (req, res) => {
    const campaign: MarketingCampaign = {
      id: `cmp-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      name: req.body.name,
      type: req.body.type || 'lead_gen',
      status: req.body.status || 'active',
      objective: req.body.objective,
      budget: Number(req.body.budget) || 0,
      actual_spend: Number(req.body.actual_spend) || 0,
      start_date: req.body.start_date || new Date().toISOString().split('T')[0],
      end_date: req.body.end_date,
      target_audience: req.body.target_audience || '',
      utm_campaign: req.body.utm_campaign || req.body.name.toLowerCase().replace(/\s+/g, '_'),
      utm_source: req.body.utm_source || 'direct',
      utm_medium: req.body.utm_medium || 'cpc',
      leads_generated: 0,
      conversions_count: 0,
      pipeline_value_generated: 0,
      notes: req.body.notes,
      created_at: new Date().toISOString(),
    };
    db.campaigns.unshift(campaign);
    logAudit(currentWorkspaceId, 'CREATE_CAMPAIGN', 'campaign', campaign.id, campaign.name);
    res.status(201).json(campaign);
  });

  app.get('/api/v1/marketing/forms', (req, res) => {
    res.json(db.leadForms.filter(f => f.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/marketing/forms', (req, res) => {
    const form: LeadCaptureForm = {
      id: `frm-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      title: req.body.title,
      description: req.body.description,
      campaign_id: req.body.campaign_id,
      submit_button_text: req.body.submit_button_text || 'Submit Inquiry',
      success_message: req.body.success_message || 'Thank you!',
      fields: req.body.fields || [],
      embed_code: `<iframe src="/public/embed/form/frm-${Date.now()}" width="100%" height="450" frameborder="0"></iframe>`,
      submissions_count: 0,
      active: true,
      created_at: new Date().toISOString(),
    };
    db.leadForms.unshift(form);
    res.status(201).json(form);
  });

  app.get('/api/v1/marketing/coupons', (req, res) => {
    res.json(db.coupons.filter(c => c.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/marketing/coupons', (req, res) => {
    const coupon = {
      id: `cpn-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      ...req.body,
      used_count: 0,
      active: true,
      created_at: new Date().toISOString(),
    };
    db.coupons.unshift(coupon);
    res.status(201).json(coupon);
  });

  // 5. Unified Inbox
  app.get('/api/v1/inbox/conversations', (req, res) => {
    res.json(db.conversations.filter(c => c.workspace_id === currentWorkspaceId));
  });

  app.get('/api/v1/inbox/conversations/:id/messages', (req, res) => {
    const messages = db.messages.filter(m => m.conversation_id === req.params.id);
    res.json(messages);
  });

  app.post('/api/v1/inbox/conversations/:id/messages', async (req, res) => {
    const conv = db.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const user = db.users.find(u => u.id === currentUserId) || db.users[0];
    const message: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: conv.id,
      sender_type: 'agent',
      sender_name: user.name,
      sender_id: user.id,
      content: req.body.content,
      is_internal_note: req.body.is_internal_note || false,
      created_at: new Date().toISOString(),
    };

    db.messages.push(message);
    conv.last_message_text = message.content;
    conv.last_message_at = message.created_at;
    conv.unread_count = 0;

    res.status(201).json(message);
  });

  app.put('/api/v1/inbox/conversations/:id', (req, res) => {
    const conv = db.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    Object.assign(conv, req.body);
    res.json(conv);
  });

  // 6. Appointments & Bookings
  app.get('/api/v1/appointments', (req, res) => {
    res.json(db.appointments.filter(a => a.workspace_id === currentWorkspaceId));
  });

  app.get('/api/v1/appointments/types', (req, res) => {
    res.json(db.appointmentTypes.filter(t => t.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/appointments/types', (req, res) => {
    const aptType = {
      id: `apt-type-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      ...req.body,
      active: true,
      created_at: new Date().toISOString(),
    };
    db.appointmentTypes.unshift(aptType);
    res.status(201).json(aptType);
  });

  app.post('/api/v1/appointments', async (req, res) => {
    const apt: Appointment = {
      id: `apt-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      appointment_type_id: req.body.appointment_type_id,
      appointment_type_name: req.body.appointment_type_name || 'Meeting',
      customer_name: req.body.customer_name,
      customer_email: req.body.customer_email,
      customer_phone: req.body.customer_phone,
      staff_id: req.body.staff_id || currentUserId,
      staff_name: req.body.staff_name || 'Staff Member',
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      status: req.body.status || 'confirmed',
      location: req.body.location || 'https://meet.google.com/nexus-session',
      notes: req.body.notes,
      created_at: new Date().toISOString(),
    };

    db.appointments.unshift(apt);
    logAudit(currentWorkspaceId, 'BOOK_APPOINTMENT', 'appointment', apt.id, `${apt.appointment_type_name} with ${apt.customer_name}`);
    await triggerAutomationEvent(currentWorkspaceId, 'appointment_booked', apt);
    res.status(201).json(apt);
  });

  app.put('/api/v1/appointments/:id', async (req, res) => {
    const apt = db.appointments.find(a => a.id === req.params.id && a.workspace_id === currentWorkspaceId);
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });
    const oldStatus = apt.status;
    Object.assign(apt, req.body);
    if (req.body.status === 'cancelled' && oldStatus !== 'cancelled') {
      await triggerAutomationEvent(currentWorkspaceId, 'appointment_cancelled', apt);
    }
    res.json(apt);
  });

  // 7. Visual Automation Engine
  app.get('/api/v1/automations', (req, res) => {
    res.json(db.automations.filter(a => a.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/automations', (req, res) => {
    const auto: AutomationWorkflow = {
      id: `auto-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      name: req.body.name,
      description: req.body.description,
      trigger: req.body.trigger,
      conditions: req.body.conditions || [],
      actions: req.body.actions || [],
      is_active: req.body.is_active ?? true,
      execution_count: 0,
      created_at: new Date().toISOString(),
    };
    db.automations.unshift(auto);
    logAudit(currentWorkspaceId, 'CREATE_AUTOMATION', 'automation', auto.id, auto.name);
    res.status(201).json(auto);
  });

  app.put('/api/v1/automations/:id', (req, res) => {
    const auto = db.automations.find(a => a.id === req.params.id && a.workspace_id === currentWorkspaceId);
    if (!auto) return res.status(404).json({ error: 'Automation not found' });
    Object.assign(auto, req.body);
    res.json(auto);
  });

  app.get('/api/v1/automations/logs', (req, res) => {
    res.json(db.automationLogs.filter(l => l.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/automations/:id/test', async (req, res) => {
    const auto = db.automations.find(a => a.id === req.params.id && a.workspace_id === currentWorkspaceId);
    if (!auto) return res.status(404).json({ error: 'Automation not found' });
    
    // Simulate test execution
    const testLogs = await triggerAutomationEvent(currentWorkspaceId, auto.trigger.type, {
      id: 'test-entity',
      first_name: 'Test',
      last_name: 'Contact',
      email: 'test@example.com',
      company: 'Test Corp',
      score: 80,
      invoice_number: 'INV-TEST-001',
      total: 5000,
    });
    res.json({ success: true, logs: testLogs });
  });

  // 8. AI Business Assistant & Intelligence Queries
  app.post('/api/v1/ai/query', async (req, res) => {
    try {
      const { prompt, type, context } = req.body;
      const result = await processAiQuery({
        workspaceId: currentWorkspaceId,
        prompt: prompt || 'Summarize current business state',
        type,
        context
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI generation failed' });
    }
  });

  // 9. Analytics & Growth KPIs
  app.get('/api/v1/analytics/overview', (req, res) => {
    const leads = db.leads.filter(l => l.workspace_id === currentWorkspaceId);
    const contacts = db.contacts.filter(c => c.workspace_id === currentWorkspaceId);
    const deals = db.deals.filter(d => d.workspace_id === currentWorkspaceId);
    const invoices = db.invoices.filter(i => i.workspace_id === currentWorkspaceId);
    const expenses = db.expenses.filter(e => e.workspace_id === currentWorkspaceId);
    const campaigns = db.campaigns.filter(c => c.workspace_id === currentWorkspaceId);
    const appointments = db.appointments.filter(a => a.workspace_id === currentWorkspaceId);

    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const totalRevenue = paidInvoices.reduce((s, i) => s + i.paid_amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    
    const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
    const outstandingAmount = outstandingInvoices.reduce((s, i) => s + (i.total - i.paid_amount), 0);
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((s, i) => s + (i.total - i.paid_amount), 0);

    const activeDeals = deals.filter(d => d.stage !== 'closed_lost' && d.stage !== 'closed_won');
    const pipelineValue = activeDeals.reduce((s, d) => s + d.value, 0);
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

    const leadConversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted' || l.status === 'proposal_sent' || l.status === 'negotiating').length / leads.length) * 100) : 0;

    // Monthly Trends for Chart
    const monthlyFinanceTrend = [
      { month: 'Apr', revenue: 14200, expenses: 6800, profit: 7400 },
      { month: 'May', revenue: 19800, expenses: 7900, profit: 11900 },
      { month: 'Jun', revenue: 26500, expenses: 9400, profit: 17100 },
      { month: 'Jul', revenue: 31200, expenses: 10200, profit: 21000 },
      { month: 'Aug', revenue: totalRevenue, expenses: totalExpenses, profit: grossProfit },
    ];

    const leadSourceBreakdown = [
      { name: 'Website Form', value: leads.filter(l => l.source === 'website_form').length + 18, color: '#3B82F6' },
      { name: 'Paid Campaigns', value: leads.filter(l => l.source === 'campaign').length + 24, color: '#10B981' },
      { name: 'Referrals', value: leads.filter(l => l.source === 'referral').length + 12, color: '#8B5CF6' },
      { name: 'Direct Events', value: leads.filter(l => l.source === 'event').length + 8, color: '#F59E0B' },
      { name: 'Cold Outreach', value: leads.filter(l => l.source === 'cold_outreach').length + 6, color: '#EC4899' },
    ];

    const pipelineStageDistribution = [
      { stage: 'Discovery', count: deals.filter(d => d.stage === 'discovery').length, value: deals.filter(d => d.stage === 'discovery').reduce((s, d) => s + d.value, 0) },
      { stage: 'Qualification', count: deals.filter(d => d.stage === 'qualification').length, value: deals.filter(d => d.stage === 'qualification').reduce((s, d) => s + d.value, 0) },
      { stage: 'Proposal Sent', count: deals.filter(d => d.stage === 'proposal_sent').length, value: deals.filter(d => d.stage === 'proposal_sent').reduce((s, d) => s + d.value, 0) },
      { stage: 'Negotiation', count: deals.filter(d => d.stage === 'negotiation').length, value: deals.filter(d => d.stage === 'negotiation').reduce((s, d) => s + d.value, 0) },
      { stage: 'Closed Won', count: wonDeals.length, value: wonDeals.reduce((s, d) => s + d.value, 0) },
    ];

    res.json({
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        profitMargin,
        outstandingAmount,
        overdueAmount,
        overdueCount: overdueInvoices.length,
        pipelineValue,
        activeDealsCount: activeDeals.length,
        winRate,
        leadsCount: leads.length,
        leadConversionRate,
        customersCount: contacts.length,
        appointmentsCount: appointments.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      },
      charts: {
        monthlyFinanceTrend,
        leadSourceBreakdown,
        pipelineStageDistribution,
      }
    });
  });

  // 10. Team & RBAC
  app.get('/api/v1/team/members', (req, res) => {
    res.json(db.users.filter(u => u.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/team/invite', (req, res) => {
    const newMember = {
      id: `usr-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      job_title: req.body.job_title || 'Team Member',
      role: req.body.role || 'employee',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    };
    db.users.push(newMember);
    logAudit(currentWorkspaceId, 'INVITE_TEAM_MEMBER', 'user', newMember.id, newMember.name, { role: newMember.role });
    res.status(201).json(newMember);
  });

  app.put('/api/v1/team/members/:id', (req, res) => {
    const member = db.users.find(u => u.id === req.params.id && u.workspace_id === currentWorkspaceId);
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    Object.assign(member, req.body);
    logAudit(currentWorkspaceId, 'UPDATE_TEAM_MEMBER_ROLE', 'user', member.id, member.name, { role: member.role });
    res.json(member);
  });

  // 11. Notifications, Global Search, Audit Logs
  app.get('/api/v1/notifications', (req, res) => {
    res.json(db.notifications.filter(n => n.workspace_id === currentWorkspaceId));
  });

  app.post('/api/v1/notifications/mark-read', (req, res) => {
    const { notifId } = req.body;
    if (notifId) {
      const n = db.notifications.find(item => item.id === notifId);
      if (n) n.is_read = true;
    } else {
      db.notifications.filter(n => n.workspace_id === currentWorkspaceId).forEach(n => n.is_read = true);
    }
    res.json({ success: true });
  });

  app.get('/api/v1/audit-logs', (req, res) => {
    res.json(db.auditLogs.filter(a => a.workspace_id === currentWorkspaceId));
  });

  app.get('/api/v1/search', (req, res) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    if (!q) return res.json({ results: [] });

    const results: any[] = [];
    
    // Leads
    db.leads.filter(l => l.workspace_id === currentWorkspaceId).forEach(l => {
      if (`${l.first_name} ${l.last_name} ${l.company || ''} ${l.email}`.toLowerCase().includes(q)) {
        results.push({ type: 'Lead', id: l.id, title: `${l.first_name} ${l.last_name}`, subtitle: l.company || l.email, path: '/crm' });
      }
    });

    // Contacts
    db.contacts.filter(c => c.workspace_id === currentWorkspaceId).forEach(c => {
      if (`${c.first_name} ${c.last_name} ${c.company_name || ''} ${c.email}`.toLowerCase().includes(q)) {
        results.push({ type: 'Customer', id: c.id, title: `${c.first_name} ${c.last_name}`, subtitle: c.company_name || c.email, path: '/crm' });
      }
    });

    // Deals
    db.deals.filter(d => d.workspace_id === currentWorkspaceId).forEach(d => {
      if (d.title.toLowerCase().includes(q)) {
        results.push({ type: 'Deal', id: d.id, title: d.title, subtitle: `$${d.value.toLocaleString()} (${d.stage})`, path: '/crm' });
      }
    });

    // Invoices
    db.invoices.filter(i => i.workspace_id === currentWorkspaceId).forEach(i => {
      if (`${i.invoice_number} ${i.contact_name}`.toLowerCase().includes(q)) {
        results.push({ type: 'Invoice', id: i.id, title: i.invoice_number, subtitle: `${i.contact_name} - $${i.total.toLocaleString()} [${i.status}]`, path: '/finance' });
      }
    });

    // Appointments
    db.appointments.filter(a => a.workspace_id === currentWorkspaceId).forEach(a => {
      if (`${a.customer_name} ${a.appointment_type_name}`.toLowerCase().includes(q)) {
        results.push({ type: 'Appointment', id: a.id, title: a.appointment_type_name, subtitle: `${a.customer_name} (${new Date(a.start_time).toLocaleDateString()})`, path: '/appointments' });
      }
    });

    res.json({ results: results.slice(0, 15) });
  });

  // 12. SaaS Billing & Limits & Stripe Payments
  app.get('/api/v1/billing/usage', (req, res) => {
    res.json(calculateWorkspaceUsage(currentWorkspaceId));
  });

  app.post('/api/v1/billing/change-plan', (req, res) => {
    const { plan } = req.body;
    const ws = db.workspaces.find(w => w.id === currentWorkspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    const oldPlan = ws.subscription_plan;
    ws.subscription_plan = plan;
    logAudit(ws.id, 'CHANGE_SUBSCRIPTION_PLAN', 'workspace', ws.id, ws.name, { from: oldPlan, to: plan });
    res.json({ success: true, workspace: ws, usage: calculateWorkspaceUsage(currentWorkspaceId) });
  });

  app.get('/api/v1/stripe/status', (req, res) => {
    const hasKey = Boolean(process.env.STRIPE_SECRET_KEY);
    const isLive = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    res.json({
      configured: hasKey,
      mode: isLive ? 'live' : hasKey ? 'test' : 'mock',
      currency: 'USD',
    });
  });

  app.post('/api/v1/stripe/create-checkout-session', async (req, res) => {
    try {
      const { planId, billingCycle = 'monthly' } = req.body;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const session = await createSubscriptionCheckoutSession({
        workspaceId: currentWorkspaceId,
        planId: planId || 'pro',
        billingCycle,
        successUrl: `${appUrl}/settings?payment=success&plan=${planId}`,
        cancelUrl: `${appUrl}/settings?payment=cancelled`,
      });
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Stripe checkout initialization failed' });
    }
  });

  app.post('/api/v1/stripe/invoice-checkout', async (req, res) => {
    try {
      const { invoiceId } = req.body;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const session = await createInvoicePaymentCheckoutSession({
        workspaceId: currentWorkspaceId,
        invoiceId,
        successUrl: `${appUrl}/finance?payment=success&invoiceId=${invoiceId}`,
        cancelUrl: `${appUrl}/finance?payment=cancelled`,
      });
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Invoice payment session failed' });
    }
  });

  app.post('/api/v1/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripeClient();

    let event = req.body;

    if (stripe && webhookSecret && sig) {
      try {
        // Construct event if raw string or object
        event = stripe.webhooks.constructEvent(
          typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.warn(`⚠️ Stripe Webhook signature verification notice: ${err.message}`);
        // In local/sandbox testing we still accept standard body
      }
    }

    try {
      await handleStripeWebhookEvent(event);
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/workers/stats', (req, res) => {
    res.json(workerSimulator.getQueueStats());
  });

  // 13. Public APIs (Public Booking & Public Lead Forms)
  app.get('/api/v1/public/booking/:slug', (req, res) => {
    const aptType = db.appointmentTypes.find(t => t.slug === req.params.slug && t.active);
    if (!aptType) return res.status(404).json({ error: 'Booking link not found or inactive' });
    const ws = db.workspaces.find(w => w.id === aptType.workspace_id);
    res.json({ appointmentType: aptType, workspace: { name: ws?.name, logo: ws?.logo, timezone: ws?.timezone } });
  });

  app.post('/api/v1/public/booking/:slug/book', async (req, res) => {
    const aptType = db.appointmentTypes.find(t => t.slug === req.params.slug && t.active);
    if (!aptType) return res.status(404).json({ error: 'Booking link not found' });

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      workspace_id: aptType.workspace_id,
      appointment_type_id: aptType.id,
      appointment_type_name: aptType.name,
      customer_name: req.body.customer_name,
      customer_email: req.body.customer_email,
      customer_phone: req.body.customer_phone,
      staff_id: aptType.staff_ids[0] || 'usr-owner-01',
      staff_name: 'Lead Business Architect',
      start_time: req.body.start_time,
      end_time: req.body.end_time || new Date(new Date(req.body.start_time).getTime() + aptType.duration_minutes * 60000).toISOString(),
      status: 'confirmed',
      location: aptType.location_details || 'https://meet.google.com/nexus-booking',
      notes: req.body.notes || 'Booked via Public Scheduling Portal',
      created_at: new Date().toISOString(),
    };

    db.appointments.unshift(newAppointment);

    // Auto create lead if not exists
    let existingContact = db.contacts.find(c => c.email === newAppointment.customer_email && c.workspace_id === aptType.workspace_id);
    if (!existingContact) {
      const names = newAppointment.customer_name.split(' ');
      db.leads.unshift({
        id: `lead-${Date.now()}`,
        workspace_id: aptType.workspace_id,
        first_name: names[0] || 'Guest',
        last_name: names.slice(1).join(' ') || 'Booking',
        email: newAppointment.customer_email,
        phone: newAppointment.customer_phone,
        status: 'qualified',
        source: 'website_form',
        score: 75,
        estimated_value: 5000,
        notes: `Booked appointment for ${aptType.name}`,
        tags: ['Public Booking', 'Meeting Scheduled'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await triggerAutomationEvent(aptType.workspace_id, 'appointment_booked', newAppointment);
    res.status(201).json({ success: true, appointment: newAppointment });
  });

  app.get('/api/v1/public/form/:formId', (req, res) => {
    const form = db.leadForms.find(f => f.id === req.params.formId && f.active);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    const ws = db.workspaces.find(w => w.id === form.workspace_id);
    res.json({ form, workspace: { name: ws?.name } });
  });

  app.post('/api/v1/public/form/:formId/submit', async (req, res) => {
    const form = db.leadForms.find(f => f.id === req.params.formId && f.active);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    form.submissions_count = (form.submissions_count || 0) + 1;
    const submissionData = req.body;

    const names = (submissionData['Full Name'] || submissionData['Contact Name'] || submissionData['Name'] || 'New Lead').split(' ');
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      workspace_id: form.workspace_id,
      first_name: names[0] || 'New',
      last_name: names.slice(1).join(' ') || 'Inquiry',
      email: submissionData['Business Email'] || submissionData['Email Address'] || submissionData['Email'] || 'lead@example.com',
      phone: submissionData['Phone Number'] || submissionData['Phone'] || '',
      company: submissionData['Company Name'] || submissionData['Company'] || '',
      status: 'new',
      source: 'website_form',
      campaign_id: form.campaign_id,
      score: 65,
      estimated_value: 12000,
      notes: Object.entries(submissionData).map(([k, v]) => `${k}: ${v}`).join('\n'),
      tags: ['Form Submission', 'Inbound Lead'],
      custom_fields: submissionData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.leads.unshift(lead);
    await triggerAutomationEvent(form.workspace_id, 'form_submitted', { form, lead });
    await triggerAutomationEvent(form.workspace_id, 'new_lead_created', lead);

    res.status(201).json({ success: true, message: form.success_message, leadId: lead.id });
  });

  // -------------------------------------------------------------
  // VITE & STATIC SERVING
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusOS Server running on http://localhost:${PORT}`);
  });
}

startServer();
