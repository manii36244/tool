import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  User, 
  Mail, 
  Check, 
  X, 
  Sparkles, 
  Lock, 
  ShieldAlert,
  MoreVertical
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { User as UserType, UserRole } from '../../../shared/types.ts';

export const TeamManagementView: React.FC = () => {
  const { showToast, refreshData } = useApp();
  const [teamMembers, setTeamMembers] = useState<UserType[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'sales_manager' as UserRole,
  });

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const members = await api.getTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.error('Error loading team:', err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.inviteTeamMember(inviteForm);
      showToast('Invitation Sent', `Sent workspace access link to ${inviteForm.email}`);
      setIsInviteOpen(false);
      setInviteForm({ name: '', email: '', role: 'sales_manager' });
      await loadTeam();
    } catch (err: any) {
      showToast('Invite Error', err.message, 'error');
    }
  };

  const rbacMatrix = [
    { module: 'Executive Analytics & BI', owner: true, admin: true, sales: false, marketing: false, accountant: true, support: false },
    { module: 'CRM, Deals & Pipeline', owner: true, admin: true, sales: true, marketing: false, accountant: false, support: true },
    { module: 'Invoicing & Stripe Billing', owner: true, admin: true, sales: true, marketing: false, accountant: true, support: false },
    { module: 'Marketing Campaigns & Forms', owner: true, admin: true, sales: false, marketing: true, accountant: false, support: false },
    { module: 'Omnichannel Unified Inbox', owner: true, admin: true, sales: true, marketing: true, accountant: false, support: true },
    { module: 'Appointments Scheduling', owner: true, admin: true, sales: true, marketing: false, accountant: false, support: true },
    { module: 'Automations & Redis Queues', owner: true, admin: true, sales: false, marketing: false, accountant: false, support: false },
    { module: 'Workspace Settings & Team RBAC', owner: true, admin: true, sales: false, marketing: false, accountant: false, support: false },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Management & RBAC Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage tenant users, assign granular roles, and enforce security policies</p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Active Workspace Members ({teamMembers.length})</h3>
          <span className="text-xs text-slate-500 font-medium">Multi-tenant RLS Enforced</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Access Level</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map(member => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <span className="font-bold text-slate-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{member.email}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold capitalize text-slate-800">
                      {member.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {member.role === 'owner' || member.role === 'admin' ? 'Full Read/Write/Admin' : 'Role-Scoped'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Granular Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC) Matrix</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Enforced by backend authorization middleware</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Module / Feature</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">Admin</th>
                <th className="py-3 px-3">Sales</th>
                <th className="py-3 px-3">Marketing</th>
                <th className="py-3 px-3">Accountant</th>
                <th className="py-3 px-3">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rbacMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-left font-semibold text-slate-800">{row.module}</td>
                  <td className="py-3 px-3">{row.owner ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-3 px-3">{row.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-3 px-3">{row.sales ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-3 px-3">{row.marketing ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-3 px-3">{row.accountant ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-3 px-3">{row.support ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <input
                required
                placeholder="Full Name"
                value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <input
                required
                type="email"
                placeholder="Work Email"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Role & Permission Preset</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="sales_manager">Sales Manager (CRM & Invoicing)</option>
                  <option value="marketing_manager">Marketing Manager (Campaigns & Forms)</option>
                  <option value="accountant">Accountant (Invoices & Expenses)</option>
                  <option value="support_agent">Support Agent (Inbox & Appointments)</option>
                  <option value="employee">Standard Employee</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-2xs transition-colors"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
