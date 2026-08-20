export type UserRole = 
  | 'owner' 
  | 'admin' 
  | 'manager' 
  | 'sales_manager' 
  | 'marketing_manager' 
  | 'accountant' 
  | 'support_agent' 
  | 'employee';

export interface UserPermissions {
  crm: { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };
  finance: { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };
  marketing: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  inbox: { view: boolean; reply: boolean; assign: boolean; manage: boolean };
  appointments: { view: boolean; manage: boolean; book: boolean };
  automations: { view: boolean; create: boolean; edit: boolean; toggle: boolean };
  analytics: { view: boolean; export: boolean };
  team: { view: boolean; invite: boolean; edit_roles: boolean; remove: boolean };
  settings: { view: boolean; edit_business: boolean; edit_billing: boolean };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  job_title?: string;
  role: UserRole;
  workspace_id: string;
  permissions?: UserPermissions;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  owner_id: string;
  currency: string; // USD, EUR, GBP, etc.
  timezone: string;
  industry: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string;
  company_address?: string;
  tax_id?: string;
  subscription_plan: 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled';
  trial_ends_at?: string;
  current_period_end?: string;
  created_at: string;
}

export interface PlanLimits {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxTeamMembers: number;
  maxContacts: number;
  maxInvoicesPerMonth: number;
  maxAutomations: number;
  maxCampaigns: number;
  aiCreditsMonthly: number;
  storageGB: number;
  features: string[];
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'converted' | 'unqualified' | 'lost';
export type DealStage = 'discovery' | 'qualification' | 'demo_presented' | 'proposal_sent' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Lead {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  source: 'website_form' | 'manual' | 'cold_outreach' | 'referral' | 'event' | 'campaign' | 'whatsapp' | 'other' | string;
  campaign_id?: string;
  assigned_to?: string;
  score: number; // 0-100
  estimated_value?: number;
  notes?: string;
  tags: string[];
  custom_fields?: Record<string, string | number | boolean>;
  last_contacted_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  company_id?: string;
  company_name?: string;
  type: 'customer' | 'lead' | 'partner' | 'vendor';
  total_spent?: number;
  assigned_to?: string;
  tags: string[];
  avatar?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  industry?: string;
  domain?: string;
  phone?: string;
  size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  annual_revenue?: number;
  address?: string;
  city?: string;
  country?: string;
  assigned_to?: string;
  tags: string[];
  created_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number; // 0-100%
  expected_close_date?: string;
  contact_id?: string;
  company_id?: string;
  assigned_to?: string;
  tags: string[];
  notes?: string;
  loss_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  related_entity_type?: 'lead' | 'contact' | 'deal' | 'invoice' | 'appointment';
  related_entity_id?: string;
  related_entity_name?: string;
  created_at: string;
  completed_at?: string;
}

export interface ActivityTimelineItem {
  id: string;
  workspace_id: string;
  user_id?: string;
  user_name?: string;
  entity_type: 'lead' | 'contact' | 'deal' | 'invoice' | 'appointment' | 'message' | 'automation';
  entity_id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'payment' | 'form_submission' | 'automation_fired';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ProductService {
  id: string;
  workspace_id: string;
  name: string;
  sku: string;
  type: 'service' | 'product';
  price: number;
  cost?: number;
  tax_rate: number; // e.g. 10 for 10%
  billing_period?: 'one_off' | 'monthly' | 'quarterly' | 'annual';
  description?: string;
  category?: string;
  active: boolean;
  created_at: string;
}

export interface LineItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate?: number;
  total: number;
}

export interface Quote {
  id: string;
  workspace_id: string;
  quote_number: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  issue_date: string;
  expiry_date: string;
  line_items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes?: string;
  terms?: string;
  converted_invoice_id?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  invoice_number: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  line_items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  paid_amount: number;
  currency: string;
  payment_method?: 'stripe' | 'bank_transfer' | 'credit_card' | 'cash' | 'check' | 'other';
  paid_at?: string;
  notes?: string;
  terms?: string;
  recurring?: {
    frequency: 'monthly' | 'quarterly' | 'yearly';
    next_issue_date: string;
  };
  created_at: string;
}

export interface Expense {
  id: string;
  workspace_id: string;
  category: 'Marketing' | 'Software & Subscriptions' | 'Office & Rent' | 'Salaries & Contractors' | 'Travel & Entertainment' | 'Legal & Accounting' | 'Utilities' | 'Other';
  description: string;
  amount: number;
  date: string;
  payment_method: string;
  vendor?: string;
  receipt_url?: string;
  notes?: string;
  tax_deductible: boolean;
  created_at: string;
}

export interface MarketingCampaign {
  id: string;
  workspace_id: string;
  name: string;
  type: 'email' | 'lead_gen' | 'referral' | 'webinar' | 'in_person_event' | 'content_seo' | 'partner' | 'direct_outreach';
  status: 'draft' | 'active' | 'completed' | 'paused';
  objective: string;
  budget: number;
  actual_spend: number;
  start_date: string;
  end_date?: string;
  target_audience: string;
  utm_campaign: string;
  utm_source: string;
  utm_medium: string;
  leads_generated: number;
  conversions_count: number;
  pipeline_value_generated: number;
  roi_percentage?: number;
  notes?: string;
  created_at: string;
}

export interface LeadCaptureForm {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  campaign_id?: string;
  submit_button_text: string;
  success_message: string;
  redirect_url?: string;
  fields: {
    id: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
    placeholder?: string;
    required: boolean;
    options?: string[]; // for select
  }[];
  embed_code: string;
  submissions_count: number;
  active: boolean;
  created_at: string;
}

export interface PromotionCoupon {
  id: string;
  workspace_id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_spend?: number;
  max_uses?: number;
  used_count: number;
  expires_at?: string;
  active: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  channel: 'email' | 'whatsapp' | 'web_chat' | 'sms';
  contact_id?: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  subject?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  status: 'open' | 'pending' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  unread_count: number;
  last_message_text: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'system' | 'bot';
  sender_name: string;
  sender_id?: string;
  content: string;
  attachments?: { name: string; url: string; size: string; type: string }[];
  is_internal_note?: boolean;
  created_at: string;
}

export interface AppointmentType {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  price: number;
  currency?: string;
  location_type?: 'video_call' | 'phone' | 'in_person' | 'custom' | string;
  location_details?: string; // e.g. Google Meet URL or Office Address
  staff_ids?: string[];
  buffer_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  active?: boolean;
  color?: string;
  created_at?: string;
}

export interface Appointment {
  id: string;
  workspace_id: string;
  appointment_type_id: string;
  appointment_type_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  contact_id?: string;
  staff_id: string;
  staff_name: string;
  start_time: string; // ISO String
  end_time: string; // ISO String
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location: string;
  meeting_url?: string; // Dedicated Google Meet / Video Room URL
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
}

export type AutomationTriggerType = 
  | 'new_lead_created'
  | 'new_customer_created'
  | 'form_submitted'
  | 'appointment_booked'
  | 'appointment_cancelled'
  | 'invoice_created'
  | 'invoice_overdue'
  | 'payment_received'
  | 'deal_stage_changed'
  | 'new_message_received'
  | 'task_completed';

export type AutomationActionType = 
  | 'create_crm_lead'
  | 'create_crm_deal'
  | 'update_customer'
  | 'create_task'
  | 'assign_team_member'
  | 'send_email_notification'
  | 'send_whatsapp_message'
  | 'create_invoice'
  | 'add_tag'
  | 'change_deal_stage'
  | 'send_appointment_reminder'
  | 'run_ai_action';

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface AutomationAction {
  id: string;
  type: AutomationActionType;
  config: Record<string, any>;
}

export interface AutomationWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  trigger: {
    type: AutomationTriggerType;
    config?: Record<string, any>;
  };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
}

export interface AutomationLog {
  id: string;
  workspace_id: string;
  automation_id: string;
  automation_name: string;
  trigger_event: string;
  status: 'success' | 'failed' | 'retrying';
  duration_ms: number;
  actions_executed: number;
  error_message?: string;
  payload_summary: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  workspace_id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'lead' | 'invoice' | 'appointment' | 'message' | 'deal' | 'automation' | 'system';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_title?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: { label: string; action: string; payload?: any }[];
  contextDataSnapshot?: any;
}

// Convenience Type Aliases
export type Product = ProductService;
export type Campaign = MarketingCampaign;
export type LeadForm = LeadCaptureForm;
export type Coupon = PromotionCoupon;
export type AutomationRule = AutomationWorkflow;

