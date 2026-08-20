import { GoogleGenAI } from '@google/genai';
import { db } from '../db/mockDb.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export interface AiRequestOptions {
  workspaceId: string;
  prompt: string;
  type?: 'chat' | 'marketing_copy' | 'sales_followup' | 'proposal' | 'support_reply' | 'product_description' | 'business_insights';
  context?: Record<string, any>;
}

export async function processAiQuery(options: AiRequestOptions) {
  const { workspaceId, prompt, type = 'chat', context } = options;

  // Retrieve current workspace data for context
  const ws = db.workspaces.find(w => w.id === workspaceId) || db.workspaces[0];
  const leads = db.leads.filter(l => l.workspace_id === workspaceId);
  const contacts = db.contacts.filter(c => c.workspace_id === workspaceId);
  const deals = db.deals.filter(d => d.workspace_id === workspaceId);
  const invoices = db.invoices.filter(i => i.workspace_id === workspaceId);
  const campaigns = db.campaigns.filter(c => c.workspace_id === workspaceId);
  const appointments = db.appointments.filter(a => a.workspace_id === workspaceId);
  const tasks = db.tasks.filter(t => t.workspace_id === workspaceId);
  const quotes = db.quotes.filter(q => q.workspace_id === workspaceId);
  const expenses = db.expenses.filter(e => e.workspace_id === workspaceId);

  // Compute key analytics to feed to the AI context
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.paid_amount) || Number(i.total) || 0), 0);
  const outstandingRevenue = invoices.reduce((sum, i) => sum + Math.max(0, (Number(i.total) || 0) - (Number(i.paid_amount) || (i.status === 'paid' ? Number(i.total) || 0 : 0))), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const uncontactedLeads = leads.filter(l => !l.last_contacted_at || l.status === 'new');
  const pipelineValue = deals.filter(d => d.stage !== 'closed_lost' && d.stage !== 'closed_won').reduce((sum, d) => sum + Number(d.value), 0);

  const topCustomers = [...contacts].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 8);
  const topCampaigns = [...campaigns].sort((a, b) => (b.leads_generated || 0) - (a.leads_generated || 0));

  // Comprehensive serializations of records for deep system search
  const serializedInvoices = invoices.map(i => {
    const total = Number(i.total) || 0;
    const paid = Number(i.paid_amount) || (i.status === 'paid' ? total : 0);
    const remaining = Math.max(0, total - paid);
    return `Invoice ${i.invoice_number}: Client="${i.contact_name}" (${i.contact_email}), Total=$${total.toLocaleString()}, Paid=$${paid.toLocaleString()}, RemainingDue=$${remaining.toLocaleString()}, Status=${i.status}, DueDate=${i.due_date}`;
  }).join('\n');

  const serializedContacts = contacts.map(c => {
    return `Client "${c.first_name} ${c.last_name}": Company="${c.company_name || 'N/A'}", Email=${c.email}, Phone=${c.phone || 'N/A'}, TotalSpent=$${(c.total_spent || 0).toLocaleString()}, Tags=[${c.tags?.join(', ') || ''}], Notes="${c.notes || ''}"`;
  }).join('\n');

  const serializedLeads = leads.map(l => {
    return `Lead "${l.first_name} ${l.last_name}": Company="${l.company || 'N/A'}", Email=${l.email}, Phone=${l.phone || 'N/A'}, Status=${l.status}, Score=${l.score}/100, EstValue=$${(l.estimated_value || 0).toLocaleString()}, Source=${l.source}`;
  }).join('\n');

  const serializedDeals = deals.map(d => {
    return `Deal "${d.title}": Value=$${d.value.toLocaleString()}, Stage=${d.stage}, Probability=${d.probability}%, ExpectedClose=${d.expected_close_date}`;
  }).join('\n');

  const systemContext = `
You are Nexus AI, the unified intelligent enterprise copilot for "${ws.name}" (${ws.industry}).
Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Workspace Currency: ${ws.currency}.

LIVE ENTERPRISE SYSTEM DATA DIRECTORY:
=== INVOICES & FINANCIAL LEDGER ===
${serializedInvoices || 'No invoices found.'}

=== CLIENTS & CONTACTS DIRECTORY ===
${serializedContacts || 'No clients found.'}

=== LEADS DIRECTORY ===
${serializedLeads || 'No leads found.'}

=== ACTIVE SALES DEALS & PIPELINE ===
${serializedDeals || 'No deals found.'}

=== FINANCIAL OVERVIEW ===
- Total Collected Revenue: $${totalRevenue.toLocaleString()}
- Total Remaining Balance Due / Receivables: $${outstandingRevenue.toLocaleString()}
- Overdue Invoices: ${overdueInvoices.length}
- Active Pipeline Value: $${pipelineValue.toLocaleString()} across ${deals.length} deals

INSTRUCTIONS:
1. Whenever the user asks about ANY client, contact, company, invoice, payment balance, lead, or deal in the entire system, immediately search through the records above and provide the exact matching details.
2. For invoice questions: Always specify the Invoice Number, Client Name, Total Invoice Amount, Amount Paid so far, and Remaining Balance Due clearly.
3. For client questions: Provide their full name, company, email, phone, total spent, and any associated invoices or deals.
4. Support inquiries in English, Urdu, Roman Urdu, or multilingual queries naturally with precise formatting.
5. Format with clear Markdown headings, bullet points, and highlight metrics with bold text.
`;

  const ai = getAiClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemContext}\n\nUser Question / Search Query:\n${prompt}\n\nAdditional Context:\n${JSON.stringify(context || {})}`
              }
            ]
          }
        ]
      });

      const responseText = response.text || 'Unable to generate response.';
      return {
        content: responseText,
        source: 'gemini-2.5-flash',
        generatedAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.warn('Gemini API error, falling back to intelligent deterministic search engine:', err.message);
    }
  }

  // Intelligent deterministic search engine
  return generateDeterministicSearchResponse(prompt, type, {
    ws,
    leads,
    contacts,
    deals,
    invoices,
    campaigns,
    appointments,
    tasks,
    quotes,
    expenses,
    totalRevenue,
    outstandingRevenue,
    overdueInvoices,
    uncontactedLeads,
    topCustomers,
    topCampaigns,
    context
  });
}

function generateDeterministicSearchResponse(prompt: string, type: string, data: any) {
  const p = prompt.toLowerCase().trim();

  // 1. Check for specific invoice searches (e.g. "INV-2026-001", "invoice 001", "inv-")
  const invoiceMatch = data.invoices.find((inv: any) => 
    p.includes(inv.invoice_number.toLowerCase()) || 
    p.includes(inv.invoice_number.replace(/-/g, '').toLowerCase()) ||
    (inv.contact_name && p.includes(inv.contact_name.toLowerCase()))
  );

  if (invoiceMatch && (p.includes('inv') || p.includes('invoice') || p.includes('bill') || p.includes('amount') || p.includes('paid') || p.includes('balance'))) {
    const total = Number(invoiceMatch.total) || 0;
    const paid = Number(invoiceMatch.paid_amount) || (invoiceMatch.status === 'paid' ? total : 0);
    const remaining = Math.max(0, total - paid);

    return {
      content: `### 📄 Invoice Search Results: **${invoiceMatch.invoice_number}**\n\n` +
        `- **Customer Name:** **${invoiceMatch.contact_name}** (${invoiceMatch.contact_email || 'No email'})\n` +
        `- **Invoice Status:** \`${invoiceMatch.status.toUpperCase()}\`\n` +
        `- **Issue Date:** ${invoiceMatch.issue_date || invoiceMatch.created_at.split('T')[0]}\n` +
        `- **Due Date:** ${invoiceMatch.due_date}\n` +
        `- **Total Invoice Amount:** **$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}**\n` +
        `- **Amount Paid by Client:** **$${paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}**\n` +
        `- **Remaining Balance Due:** **$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}**\n\n` +
        `**Line Items:**\n` +
        (invoiceMatch.line_items && invoiceMatch.line_items.length > 0 
          ? invoiceMatch.line_items.map((li: any) => `• ${li.description} (Qty: ${li.quantity}) — **$${(Number(li.total) || Number(li.unit_price) * Number(li.quantity)).toLocaleString()}**`).join('\n')
          : `• Core Retainer & Implementation — **$${total.toLocaleString()}**`) +
        `\n\n*You can view the full printable template or process Stripe payments directly in the **Sales & Finance** tab.*`,
      source: 'nexus-system-search-engine',
      generatedAt: new Date().toISOString()
    };
  }

  // 2. Check for specific Client / Contact searches (e.g. "Sarah", "Alex", "TechFlow", "David", "Elena", "Acme", etc.)
  const contactMatch = data.contacts.find((c: any) => 
    p.includes(c.first_name.toLowerCase()) || 
    p.includes(c.last_name.toLowerCase()) || 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(p) ||
    (c.company_name && p.includes(c.company_name.toLowerCase())) ||
    (c.email && p.includes(c.email.toLowerCase()))
  );

  if (contactMatch) {
    const clientInvoices = data.invoices.filter((i: any) => 
      i.contact_id === contactMatch.id || 
      i.contact_email === contactMatch.email || 
      (i.contact_name && i.contact_name.toLowerCase().includes(contactMatch.first_name.toLowerCase()))
    );
    const clientDeals = data.deals.filter((d: any) => d.contact_id === contactMatch.id);

    const invoicesList = clientInvoices.map((inv: any) => {
      const tot = Number(inv.total) || 0;
      const pd = Number(inv.paid_amount) || (inv.status === 'paid' ? tot : 0);
      const rem = Math.max(0, tot - pd);
      return `• **${inv.invoice_number}** — Total: **$${tot.toLocaleString()}** | Paid: **$${pd.toLocaleString()}** | Balance Due: **$${rem.toLocaleString()}** (\`${inv.status}\`)`;
    }).join('\n');

    return {
      content: `### 👤 Client Profile & Records: **${contactMatch.first_name} ${contactMatch.last_name}**\n\n` +
        `- **Company / Organization:** **${contactMatch.company_name || 'Individual Client'}**\n` +
        `- **Email Address:** \`${contactMatch.email}\`\n` +
        `- **Phone Number:** ${contactMatch.phone || '+1 (555) 019-2834'}\n` +
        `- **Total Lifetime Spent:** **$${(contactMatch.total_spent || 0).toLocaleString()}**\n` +
        `- **Client Tags:** ${contactMatch.tags?.map((t: string) => `\`${t}\``).join(' ') || 'Standard'}\n` +
        `- **Notes / Bio:** ${contactMatch.notes || 'High-value enterprise account in good standing.'}\n\n` +
        `**Associated Invoices & Balances:**\n` +
        (invoicesList || '• No invoices generated for this client yet.') +
        `\n\n**Associated Sales Deals:**\n` +
        (clientDeals.map((d: any) => `• **${d.title}** — Value: **$${d.value.toLocaleString()}** (Stage: \`${d.stage}\`)`).join('\n') || '• No active pipeline deals.') +
        `\n\n*Would you like to generate a new invoice or draft a follow-up email for this client?*`,
      source: 'nexus-system-search-engine',
      generatedAt: new Date().toISOString()
    };
  }

  // 3. Check for specific Lead searches (e.g. by lead name or company)
  const leadMatch = data.leads.find((l: any) => 
    p.includes(l.first_name.toLowerCase()) || 
    p.includes(l.last_name.toLowerCase()) || 
    (l.company && p.includes(l.company.toLowerCase()))
  );

  if (leadMatch && (p.includes('lead') || p.includes('prospect') || p.includes('score') || p.includes(leadMatch.first_name.toLowerCase()))) {
    return {
      content: `### 🎯 Lead Information: **${leadMatch.first_name} ${leadMatch.last_name}**\n\n` +
        `- **Company:** **${leadMatch.company || 'Direct Inbound'}**\n` +
        `- **Email:** \`${leadMatch.email}\` | **Phone:** ${leadMatch.phone || 'N/A'}\n` +
        `- **Lead Score:** **${leadMatch.score}/100** (\`${leadMatch.score > 70 ? 'Hot Lead' : 'Warm Prospect'}\`)\n` +
        `- **Pipeline Status:** \`${leadMatch.status.toUpperCase()}\`\n` +
        `- **Estimated Deal Value:** **$${(leadMatch.estimated_value || 0).toLocaleString()}**\n` +
        `- **Acquisition Source:** \`${leadMatch.source}\`\n` +
        `- **Notes:** ${leadMatch.notes || 'Inbound interest recorded via marketing funnel.'}\n\n` +
        `**Recommended Action:** Trigger automated intro sequence or schedule a discovery appointment in the **Appointments** tab.`,
      source: 'nexus-system-search-engine',
      generatedAt: new Date().toISOString()
    };
  }

  // 4. Invoices general query / Balance breakdown
  if (p.includes('invoice') || p.includes('invoices') || p.includes('kitni amount') || p.includes('balance') || p.includes('receivable') || p.includes('unpaid') || p.includes('overdue')) {
    const list = data.invoices.map((inv: any) => {
      const tot = Number(inv.total) || 0;
      const pd = Number(inv.paid_amount) || (inv.status === 'paid' ? tot : 0);
      const rem = Math.max(0, tot - pd);
      return `• **${inv.invoice_number}** — **${inv.contact_name}** | Total: **$${tot.toLocaleString()}** | Paid: **$${pd.toLocaleString()}** | **Due: $${rem.toLocaleString()}** (\`${inv.status}\`)`;
    }).join('\n');

    return {
      content: `### 📊 System Invoices & Receivables Ledger\n\nHere is the current financial status across all client invoices in **${data.ws.name}**:\n\n${list}\n\n- **Total Invoiced:** **$${data.invoices.reduce((s: number, i: any) => s + Number(i.total), 0).toLocaleString()}**\n- **Total Cash Collected:** **$${data.totalRevenue.toLocaleString()}**\n- **Outstanding Balance Still Due:** **$${data.outstandingRevenue.toLocaleString()}**\n\n*Click **Sales & Finance** to view the full printable invoice template, download PDF, or process card payments via Stripe.*`,
      source: 'nexus-system-search-engine',
      generatedAt: new Date().toISOString()
    };
  }

  // 5. Uncontacted leads
  if (p.includes('uncontacted') || p.includes('not contacted') || p.includes('new leads')) {
    const list = data.uncontactedLeads.map((l: any) => `• **${l.first_name} ${l.last_name}** (${l.company || 'N/A'}) — Score: **${l.score}/100** | Est. Value: **$${(l.estimated_value || 0).toLocaleString()}**`).join('\n');
    return {
      content: `### 🎯 Uncontacted Leads Requiring Outreach (${data.uncontactedLeads.length} Leads)\n\n${list || 'All leads have been contacted.'}\n\n**Action:** Use the **Auto-Qualify & Route** automation or open the CRM to begin outreach.`,
      source: 'nexus-system-search-engine',
      generatedAt: new Date().toISOString()
    };
  }

  // 6. Top Clients & Revenue
  if (p.includes('client') || p.includes('customer') || p.includes('top customer')) {
    const list = data.topCustomers.map((c: any, idx: number) => `${idx + 1}. **${c.first_name} ${c.last_name}** (${c.company_name || 'Individual'}) — **$${(c.total_spent || 0).toLocaleString()}** total revenue | Email: \`${c.email}\``).join('\n');
    return {
      content: `### 👥 Registered Clients & Revenue Directory\n\n${list}\n\n*You can ask me for details on any specific client above (e.g. "Tell me details of Sarah" or "Check invoice for TechFlow").*`,
      source: 'nexus-system-search-engine',
      generatedAt: new Date().toISOString()
    };
  }

  // Default Overview
  return {
    content: `### 🤖 Nexus System Copilot & Data Intelligence\n\nI have complete real-time access to your workspace data for **${data.ws.name}**:\n\n` +
      `- **Clients & Contacts:** **${data.contacts.length}** registered accounts (Total spent: **$${data.totalRevenue.toLocaleString()}**)\n` +
      `- **Invoices:** **${data.invoices.length}** invoices (**$${data.totalRevenue.toLocaleString()}** collected, **$${data.outstandingRevenue.toLocaleString()}** balance remaining)\n` +
      `- **CRM Leads:** **${data.leads.length}** leads (**${data.uncontactedLeads.length}** awaiting outreach)\n` +
      `- **Pipeline Deals:** **${data.deals.length}** active deals (**$${(data.deals.reduce((s: number, d: any) => s + Number(d.value), 0)).toLocaleString()}** pipeline)\n` +
      `- **Upcoming Meetings:** **${data.appointments.length}** appointments booked\n\n` +
      `**Try asking me:**\n` +
      `• *"Show invoice details and remaining balance for Alex Morgan"*\n` +
      `• *"What are the client details for Sarah Connor?"*\n` +
      `• *"List all unpaid invoices and how much is remaining"*`,
    source: 'nexus-system-search-engine',
    generatedAt: new Date().toISOString()
  };
}
