import { db } from '../db/mockDb.ts';
import { AutomationWorkflow, AutomationTriggerType, AutomationLog } from '../../../shared/types.ts';

export async function triggerAutomationEvent(
  workspaceId: string,
  eventType: AutomationTriggerType,
  payload: Record<string, any>
): Promise<AutomationLog[]> {
  const matchingWorkflows = db.automations.filter(
    a => a.workspace_id === workspaceId && a.is_active && a.trigger.type === eventType
  );

  const executionLogs: AutomationLog[] = [];

  for (const workflow of matchingWorkflows) {
    const startTime = Date.now();
    let actionsExecuted = 0;
    let status: 'success' | 'failed' = 'success';
    let errorMessage: string | undefined;

    try {
      // 1. Evaluate Conditions
      const conditionsPassed = evaluateConditions(workflow.conditions, payload);
      if (!conditionsPassed) {
        continue;
      }

      // 2. Execute Actions
      for (const action of workflow.actions) {
        await executeAction(workspaceId, action, payload);
        actionsExecuted++;
      }

      // 3. Update workflow execution count
      workflow.execution_count = (workflow.execution_count || 0) + 1;
      workflow.last_executed_at = new Date().toISOString();
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message || 'Error executing action';
    }

    const duration = Date.now() - startTime;
    const log: AutomationLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workspace_id: workspaceId,
      automation_id: workflow.id,
      automation_name: workflow.name,
      trigger_event: `${eventType} (${payload.title || payload.first_name || payload.invoice_number || 'Triggered'})`,
      status,
      duration_ms: Math.max(12, duration),
      actions_executed: actionsExecuted,
      error_message: errorMessage,
      payload_summary: JSON.stringify(payload).slice(0, 120) + '...',
      created_at: new Date().toISOString()
    };

    db.automationLogs.unshift(log);
    executionLogs.push(log);
  }

  return executionLogs;
}

function evaluateConditions(conditions: any[], payload: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;

  for (const cond of conditions) {
    const val = payload[cond.field];
    if (val === undefined) continue;

    switch (cond.operator) {
      case 'equals':
        if (String(val).toLowerCase() !== String(cond.value).toLowerCase()) return false;
        break;
      case 'not_equals':
        if (String(val).toLowerCase() === String(cond.value).toLowerCase()) return false;
        break;
      case 'greater_than':
        if (Number(val) <= Number(cond.value)) return false;
        break;
      case 'less_than':
        if (Number(val) >= Number(cond.value)) return false;
        break;
      case 'contains':
        if (!String(val).toLowerCase().includes(String(cond.value).toLowerCase())) return false;
        break;
    }
  }

  return true;
}

async function executeAction(workspaceId: string, action: any, payload: Record<string, any>) {
  switch (action.type) {
    case 'assign_team_member': {
      if (payload.id && action.config?.staff_id) {
        const lead = db.leads.find(l => l.id === payload.id);
        if (lead) {
          lead.assigned_to = action.config.staff_id;
        }
      }
      break;
    }

    case 'create_task': {
      db.tasks.unshift({
        id: `tsk-${Date.now()}`,
        workspace_id: workspaceId,
        title: replacePlaceholders(action.config?.title || 'Automated Task', payload),
        description: 'Auto-generated via Nexus Automation Engine.',
        priority: action.config?.priority || 'medium',
        status: 'todo',
        assigned_to: action.config?.assigned_to || 'usr-sales-03',
        due_date: new Date(Date.now() + (action.config?.due_hours || 24) * 3600000).toISOString(),
        created_at: new Date().toISOString()
      });
      break;
    }

    case 'send_email_notification': {
      // Create in-app and simulated email notification
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        workspace_id: workspaceId,
        title: `Automated Notification: ${action.config?.template || 'Alert'}`,
        message: replacePlaceholders(action.config?.recipient || 'Action triggered for business record', payload),
        type: 'automation',
        is_read: false,
        created_at: new Date().toISOString()
      });
      break;
    }

    case 'add_tag': {
      if (action.config?.tag && payload.id) {
        const contact = db.contacts.find(c => c.id === payload.id || c.email === payload.email);
        if (contact && !contact.tags.includes(action.config.tag)) {
          contact.tags.push(action.config.tag);
        }
      }
      break;
    }

    case 'run_ai_action': {
      // AI action background dispatch
      break;
    }
  }
}

function replacePlaceholders(template: string, payload: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'object' && value !== null) {
      for (const [subKey, subVal] of Object.entries(value)) {
        result = result.replace(new RegExp(`{{${key}.${subKey}}}`, 'g'), String(subVal));
      }
    } else {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
  }
  return result;
}
