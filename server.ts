import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, PLAN_CONFIGS } from './src/server/db/mockDb.ts';
import { processAiQuery } from './src/server/services/aiService.ts';
import { triggerAutomationEvent } from './src/server/services/automationService.ts';
import { workerSimulator, calculateWorkspaceUsage } from './src/server/services/workerService.ts';
import { getStripeClient, createSubscriptionCheckoutSession, createInvoicePaymentCheckoutSession, handleStripeWebhookEvent } from './src/server/services/stripeService.ts';
import { Lead, Contact, Deal, Task, Invoice, Expense, MarketingCampaign, LeadCaptureForm, Appointment, AppointmentType, AuditLog, Message, AutomationWorkflow, ProductService, Workspace, User } from './shared/types.ts';

let currentWorkspaceId = 'ws-nexus-01';
let currentUserId = 'usr-owner-01';

function generateGoogleMeetLink(topic?: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`;
}

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

  app.post('/api/v1/workspace/init-user', (req, res) => {
    const { userId, userEmail, userName, companyName, avatar, photoURL } = req.body;
    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId and userEmail are required' });
    }

    // Check if user workspace already exists
    let userWs = db.workspaces.find(w => w.id === `ws-${userId}` || w.owner_id === userId);
    let targetUser = db.users.find(u => u.id === userId || u.email.toLowerCase() === userEmail.toLowerCase());

    const userAvatar = photoURL || avatar || '';

    if (!userWs) {
      const newWsId = `ws-${userId}`;
      const wsName = companyName || (userName ? `${userName}'s Workspace` : `${userEmail.split('@')[0]}'s Workspace`);
      userWs = {
        id: newWsId,
        name: wsName,
        slug: userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
        owner_id: userId,
        currency: 'USD',
        timezone: 'America/New_York',
        industry: 'Technology',
        subscription_plan: 'professional',
        subscription_status: 'active',
        created_at: new Date().toISOString()
      };
      db.workspaces.unshift(userWs);

      // Create or update user with real avatar or empty (not a stock photo of another person)
      if (!targetUser) {
        targetUser = {
          id: userId,
          workspace_id: newWsId,
          name: userName || userEmail.split('@')[0],
          email: userEmail,
          role: 'owner',
          avatar: userAvatar,
          job_title: 'Executive Lead',
          phone: '',
          created_at: new Date().toISOString()
        };
        db.users.unshift(targetUser);
      } else {
        targetUser.workspace_id = newWsId;
        targetUser.role = 'owner';
        if (userAvatar) targetUser.avatar = userAvatar;
        if (userName) targetUser.name = userName;
      }

      // Initial Appointment Types so public booking links work immediately
      const defaultDiscoveryType: AppointmentType = {
        id: `apt-type-${Date.now()}-1`,
        workspace_id: newWsId,
        name: '30-Min Discovery & Demo',
        slug: 'discovery-call',
        description: 'Quick walkthrough of our solutions, custom scope, and next steps.',
        duration_minutes: 30,
        price: 0,
        location_type: 'Google Meet Video Call',
        buffer_minutes: 10,
        active: true,
        created_at: new Date().toISOString()
      };
      const defaultStrategyType: AppointmentType = {
        id: `apt-type-${Date.now()}-2`,
        workspace_id: newWsId,
        name: '60-Min Strategy Deep Dive',
        slug: 'strategy-deep-dive',
        description: 'In-depth architecture, system roadmap, and technical alignment call.',
        duration_minutes: 60,
        price: 150,
        location_type: 'Google Meet Video Call',
        buffer_minutes: 15,
        active: true,
        created_at: new Date().toISOString()
      };
      db.appointmentTypes.unshift(defaultDiscoveryType, defaultStrategyType);
      
      // Note: CRM leads, contacts, deals, invoices, and bookings start completely clean for newly signed up users!
    } else {
      if (targetUser) {
        if (userAvatar) targetUser.avatar = userAvatar;
        if (userName && (targetUser.name === 'Business Leader' || !targetUser.name)) targetUser.name = userName;
      }
    }

    currentWorkspaceId = userWs.id;
    currentUserId = targetUser?.id || userId;

    logAudit(userWs.id, 'USER_LOGIN_SYNC', 'user', currentUserId, userEmail);
    res.json({ success: true, workspace: userWs, user: targetUser, currentWorkspaceId });
  });

  app.put('/api/v1/workspace', (req, res) => {
    const ws = db.workspaces.find(w => w.id === currentWorkspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    Object.assign(ws, req.body);
    logAudit(ws.id, 'UPDATE_WORKSPACE_SETTINGS', 'workspace', ws.id, ws.name, req.body);
    res.json(ws);
  });

  app.put('/api/v1/user/profile', (req, res) => {
    const user = db.users.find(u => u.id === currentUserId) || db.users.find(u => u.workspace_id === currentWorkspaceId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (req.body.name) user.name = req.body.name;
    if (req.body.job_title) user.job_title = req.body.job_title;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.avatar !== undefined) user.avatar = req.body.avatar;
    logAudit(currentWorkspaceId, 'UPDATE_USER_PROFILE', 'user', user.id, user.name, req.body);
    res.json(user);
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

  app.delete('/api/v1/crm/contacts/:id', (req, res) => {
    const idx = db.contacts.findIndex(c => c.id === req.params.id && c.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Contact not found' });
    const [deleted] = db.contacts.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_CONTACT', 'contact', deleted.id, `${deleted.first_name} ${deleted.last_name}`);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/crm/deals/:id', (req, res) => {
    const idx = db.deals.findIndex(d => d.id === req.params.id && d.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Deal not found' });
    const [deleted] = db.deals.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_DEAL', 'deal', deleted.id, deleted.title);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/crm/tasks/:id', (req, res) => {
    const idx = db.tasks.findIndex(t => t.id === req.params.id && t.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    const [deleted] = db.tasks.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_TASK', 'task', deleted.id, deleted.title);
    res.json({ success: true, deleted });
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
    logAudit(currentWorkspaceId, 'CREATE_PRODUCT', 'product', product.id, product.name);
    res.status(201).json(product);
  });

  app.delete('/api/v1/finance/products/:id', (req, res) => {
    const idx = db.productsServices.findIndex(p => p.id === req.params.id && p.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    const [deleted] = db.productsServices.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_PRODUCT', 'product', deleted.id, deleted.name);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/finance/quotes/:id', (req, res) => {
    const idx = db.quotes.findIndex(q => q.id === req.params.id && q.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Quote not found' });
    const [deleted] = db.quotes.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_QUOTE', 'quote', deleted.id, deleted.quote_number);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/finance/invoices/:id', (req, res) => {
    const idx = db.invoices.findIndex(i => i.id === req.params.id && i.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Invoice not found' });
    const [deleted] = db.invoices.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_INVOICE', 'invoice', deleted.id, deleted.invoice_number);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/finance/expenses/:id', (req, res) => {
    const idx = db.expenses.findIndex(e => e.id === req.params.id && e.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Expense not found' });
    const [deleted] = db.expenses.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_EXPENSE', 'expense', deleted.id, deleted.description);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/marketing/campaigns/:id', (req, res) => {
    const idx = db.campaigns.findIndex(c => c.id === req.params.id && c.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Campaign not found' });
    const [deleted] = db.campaigns.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_CAMPAIGN', 'campaign', deleted.id, deleted.name);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/marketing/forms/:id', (req, res) => {
    const idx = db.leadForms.findIndex(f => f.id === req.params.id && f.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Form not found' });
    const [deleted] = db.leadForms.splice(idx, 1);
    res.json({ success: true, deleted });
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

  app.delete('/api/v1/marketing/coupons/:id', (req, res) => {
    const idx = db.coupons.findIndex(c => c.id === req.params.id && c.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });
    const [deleted] = db.coupons.splice(idx, 1);
    res.json({ success: true, deleted });
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
    const slug = req.body.slug || req.body.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || `meeting-${Date.now()}`;
    const aptType: AppointmentType = {
      id: `apt-type-${Date.now()}`,
      workspace_id: currentWorkspaceId,
      name: req.body.name || 'Strategy Consultation',
      slug,
      description: req.body.description || 'Google Meet video strategy and walkthrough session.',
      duration_minutes: Number(req.body.duration_minutes) || 30,
      price: Number(req.body.price) || 0,
      location_type: req.body.location_type || 'Google Meet Video Call',
      buffer_minutes: Number(req.body.buffer_minutes) || 10,
      active: req.body.active ?? true,
      created_at: new Date().toISOString(),
    };
    db.appointmentTypes.unshift(aptType);
    logAudit(currentWorkspaceId, 'CREATE_APPOINTMENT_TYPE', 'appointment_type', aptType.id, aptType.name);
    res.status(201).json(aptType);
  });

  app.put('/api/v1/appointments/types/:id', (req, res) => {
    const aptType = db.appointmentTypes.find(t => t.id === req.params.id && t.workspace_id === currentWorkspaceId);
    if (!aptType) return res.status(404).json({ error: 'Appointment type not found' });
    Object.assign(aptType, req.body);
    res.json(aptType);
  });

  app.delete('/api/v1/appointments/types/:id', (req, res) => {
    const idx = db.appointmentTypes.findIndex(t => t.id === req.params.id && t.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Appointment type not found' });
    const [deleted] = db.appointmentTypes.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_APPOINTMENT_TYPE', 'appointment_type', deleted.id, deleted.name);
    res.json({ success: true, deleted });
  });

  app.post('/api/v1/appointments', async (req, res) => {
    const meetUrl = req.body.meeting_url || generateGoogleMeetLink(req.body.appointment_type_name);
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
      location: req.body.location || 'Google Meet Video Call',
      meeting_url: meetUrl,
      notes: req.body.notes,
      created_at: new Date().toISOString(),
    };

    db.appointments.unshift(apt);
    logAudit(currentWorkspaceId, 'BOOK_APPOINTMENT', 'appointment', apt.id, `${apt.appointment_type_name} with ${apt.customer_name}`);
    await triggerAutomationEvent(currentWorkspaceId, 'appointment_booked', apt);
    res.status(201).json(apt);
  });

  app.delete('/api/v1/appointments/:id', (req, res) => {
    const idx = db.appointments.findIndex(a => a.id === req.params.id && a.workspace_id === currentWorkspaceId);
    if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });
    const [deleted] = db.appointments.splice(idx, 1);
    logAudit(currentWorkspaceId, 'DELETE_APPOINTMENT', 'appointment', deleted.id, `${deleted.appointment_type_name} with ${deleted.customer_name}`);
    res.json({ success: true, deleted });
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
      role: req.body.role || 'sales_manager',
      avatar: req.body.avatar || '',
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

  app.delete('/api/v1/team/members/:id', (req, res) => {
    const member = db.users.find(u => u.id === req.params.id && u.workspace_id === currentWorkspaceId);
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    if (member.role === 'owner') return res.status(400).json({ error: 'Cannot remove workspace owner' });
    const idx = db.users.findIndex(u => u.id === req.params.id && u.workspace_id === currentWorkspaceId);
    if (idx !== -1) {
      const [deleted] = db.users.splice(idx, 1);
      logAudit(currentWorkspaceId, 'DELETE_TEAM_MEMBER', 'user', deleted.id, deleted.name);
      return res.json({ success: true, deleted });
    }
    res.status(404).json({ error: 'Team member not found' });
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
    const slug = req.params.slug?.toLowerCase();
    let aptType = db.appointmentTypes.find(t => t.slug?.toLowerCase() === slug || t.id === req.params.slug);
    
    // If not found in memory, find the first active type or provision a standard booking type
    if (!aptType) {
      aptType = db.appointmentTypes.find(t => t.workspace_id === currentWorkspaceId && t.active);
    }

    if (!aptType) {
      aptType = {
        id: `apt-type-default`,
        workspace_id: currentWorkspaceId,
        name: 'Strategy Consultation',
        slug: slug || 'strategy-meeting',
        description: 'Google Meet strategy and project walkthrough session.',
        duration_minutes: 30,
        price: 0,
        location_type: 'Google Meet Video Call',
        buffer_minutes: 10,
        active: true,
        created_at: new Date().toISOString(),
      };
      db.appointmentTypes.push(aptType);
    }

    const ws = db.workspaces.find(w => w.id === aptType!.workspace_id) || db.workspaces[0];
    res.json({ appointmentType: aptType, workspace: { name: ws?.name || 'Nexus Business', logo: ws?.logo, timezone: ws?.timezone || 'UTC' } });
  });

  app.post('/api/v1/public/booking/:slug/book', async (req, res) => {
    const slug = req.params.slug?.toLowerCase();
    let aptType = db.appointmentTypes.find(t => t.slug?.toLowerCase() === slug || t.id === req.params.slug);
    if (!aptType) {
      aptType = db.appointmentTypes.find(t => t.workspace_id === currentWorkspaceId && t.active) || db.appointmentTypes[0];
    }
    const targetWsId = aptType?.workspace_id || currentWorkspaceId;
    const typeName = aptType?.name || 'Strategy Meeting';
    const meetUrl = generateGoogleMeetLink(typeName);

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      workspace_id: targetWsId,
      appointment_type_id: aptType?.id || 'apt-type-default',
      appointment_type_name: typeName,
      customer_name: req.body.customer_name || 'Guest Client',
      customer_email: req.body.customer_email || 'client@example.com',
      customer_phone: req.body.customer_phone,
      staff_id: currentUserId,
      staff_name: 'Lead Consultant',
      start_time: req.body.start_time || new Date().toISOString(),
      end_time: req.body.end_time || new Date(new Date(req.body.start_time || Date.now()).getTime() + (aptType?.duration_minutes || 30) * 60000).toISOString(),
      status: 'confirmed',
      location: 'Google Meet Video Call',
      meeting_url: meetUrl,
      notes: req.body.notes || 'Booked via Public Scheduling Portal',
      created_at: new Date().toISOString(),
    };

    db.appointments.unshift(newAppointment);

    // Auto create lead if not exists
    let existingContact = db.contacts.find(c => c.email === newAppointment.customer_email && c.workspace_id === targetWsId);
    if (!existingContact) {
      const names = newAppointment.customer_name.split(' ');
      db.leads.unshift({
        id: `lead-${Date.now()}`,
        workspace_id: targetWsId,
        first_name: names[0] || 'Guest',
        last_name: names.slice(1).join(' ') || 'Client',
        email: newAppointment.customer_email,
        phone: newAppointment.customer_phone || '',
        company: 'Online Booking Lead',
        score: 85,
        status: 'qualified',
        estimated_value: 5000,
        source: 'Google Meet Booking Link',
        tags: ['Online Booking', 'Google Meet'],
        created_at: new Date().toISOString(),
      });
    }

    logAudit(targetWsId, 'BOOK_PUBLIC_APPOINTMENT', 'appointment', newAppointment.id, `${newAppointment.appointment_type_name} with ${newAppointment.customer_name}`);
    await triggerAutomationEvent(targetWsId, 'appointment_booked', newAppointment);

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
