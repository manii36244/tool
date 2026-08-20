import { db, PLAN_CONFIGS } from '../db/mockDb.ts';

export interface BackgroundJob {
  id: string;
  queue: 'reminders' | 'invoices' | 'automations' | 'ai_processing' | 'notifications';
  name: string;
  data: Record<string, any>;
  status: 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  attempts: number;
  maxAttempts: number;
  timestamp: string;
}

export class BullMqWorkerSimulator {
  private activeJobs: BackgroundJob[] = [
    {
      id: 'job-rem-01',
      queue: 'reminders',
      name: 'send_appointment_reminder_24h',
      data: { appointment_id: 'apt-01', customer_email: 'liam@starlightmedia.co' },
      status: 'completed',
      progress: 100,
      attempts: 1,
      maxAttempts: 3,
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'job-inv-02',
      queue: 'invoices',
      name: 'overdue_invoice_sweep_and_dunning',
      data: { workspace_id: 'ws-nexus-01', invoices_checked: 5 },
      status: 'completed',
      progress: 100,
      attempts: 1,
      maxAttempts: 3,
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'job-ai-03',
      queue: 'ai_processing',
      name: 'generate_weekly_business_insights',
      data: { workspace_id: 'ws-nexus-01' },
      status: 'active',
      progress: 65,
      attempts: 1,
      maxAttempts: 2,
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    }
  ];

  getQueueStats() {
    return {
      redisConnected: true,
      redisHost: '127.0.0.1:6379 (BullMQ v5.x)',
      activeWorkers: 4,
      totalProcessed: 1482,
      failedCount: 3,
      queues: {
        reminders: { active: 0, waiting: 2, completed: 580 },
        invoices: { active: 0, waiting: 0, completed: 320 },
        automations: { active: 0, waiting: 1, completed: 410 },
        ai_processing: { active: 1, waiting: 0, completed: 172 }
      },
      recentJobs: this.activeJobs
    };
  }

  enqueueJob(queue: BackgroundJob['queue'], name: string, data: Record<string, any>) {
    const job: BackgroundJob = {
      id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      queue,
      name,
      data,
      status: 'active',
      progress: 0,
      attempts: 1,
      maxAttempts: 3,
      timestamp: new Date().toISOString()
    };
    this.activeJobs.unshift(job);
    if (this.activeJobs.length > 20) this.activeJobs.pop();
    return job;
  }
}

export const workerSimulator = new BullMqWorkerSimulator();

export function calculateWorkspaceUsage(workspaceId: string) {
  const ws = db.workspaces.find(w => w.id === workspaceId) || db.workspaces[0];
  const plan = PLAN_CONFIGS[ws.subscription_plan] || PLAN_CONFIGS.starter;

  const teamMembers = db.users.filter(u => u.workspace_id === workspaceId).length;
  const contactsCount = db.contacts.filter(c => c.workspace_id === workspaceId).length + db.leads.filter(l => l.workspace_id === workspaceId).length;
  const invoicesThisMonth = db.invoices.filter(i => i.workspace_id === workspaceId).length;
  const automationsCount = db.automations.filter(a => a.workspace_id === workspaceId).length;
  const campaignsCount = db.campaigns.filter(c => c.workspace_id === workspaceId).length;

  return {
    plan: ws.subscription_plan,
    planDetails: plan,
    status: ws.subscription_status,
    usage: {
      teamMembers: { used: teamMembers, limit: plan.maxTeamMembers, percentage: Math.min(100, Math.round((teamMembers / plan.maxTeamMembers) * 100)) },
      contacts: { used: contactsCount, limit: plan.maxContacts, percentage: Math.min(100, Math.round((contactsCount / plan.maxContacts) * 100)) },
      invoices: { used: invoicesThisMonth, limit: plan.maxInvoicesPerMonth, percentage: Math.min(100, Math.round((invoicesThisMonth / plan.maxInvoicesPerMonth) * 100)) },
      automations: { used: automationsCount, limit: plan.maxAutomations, percentage: Math.min(100, Math.round((automationsCount / plan.maxAutomations) * 100)) },
      campaigns: { used: campaignsCount, limit: plan.maxCampaigns, percentage: Math.min(100, Math.round((campaignsCount / plan.maxCampaigns) * 100)) },
      aiCredits: { used: 142, limit: plan.aiCreditsMonthly, percentage: Math.min(100, Math.round((142 / plan.aiCreditsMonthly) * 100)) }
    }
  };
}
