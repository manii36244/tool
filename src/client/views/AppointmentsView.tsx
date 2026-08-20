import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  User, 
  Sparkles, 
  Video, 
  MapPin, 
  DollarSign 
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Appointment, AppointmentType } from '../../../shared/types.ts';

export const AppointmentsView: React.FC = () => {
  const { showToast, refreshData, openAiDrawerWithPrompt } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'types'>('bookings');

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customer_name: '',
    customer_email: '',
    appointment_type_name: 'Product Demo & Workflow Walkthrough',
    start_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    loadAppointmentsData();
  }, []);

  const loadAppointmentsData = async () => {
    try {
      const [apts, tps] = await Promise.all([
        api.getAppointments(),
        api.getAppointmentTypes(),
      ]);
      setAppointments(apts);
      setTypes(tps);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await api.updateAppointment(id, { status });
      showToast('Status Updated', `Appointment marked as ${status}`);
      await loadAppointmentsData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(newBooking.start_time).toISOString();
      const end = new Date(new Date(newBooking.start_time).getTime() + 30 * 60000).toISOString();
      await api.createAppointment({
        ...newBooking,
        start_time: start,
        end_time: end,
      });
      showToast('Booking Created', 'Appointment successfully added');
      setIsNewBookingOpen(false);
      await loadAppointmentsData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const copyBookingLink = (slug: string) => {
    const url = `${window.location.origin}/booking/${slug}`;
    navigator.clipboard.writeText(url);
    showToast('Public Booking Link Copied', url);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments & Online Scheduling</h1>
          <p className="text-sm text-slate-500 mt-0.5">Public booking links, automated reminders, and calendar slot availability</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAiDrawerWithPrompt('Suggest optimal meeting schedule based on open deals')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Schedule Optimizer</span>
          </button>
          <button
            onClick={() => setIsNewBookingOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'bookings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Scheduled Bookings ({appointments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'types' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Appointment Types & Links ({types.length})</span>
        </button>
      </div>

      {/* TAB 1: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Appointment Type</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{apt.customer_name}</span>
                      <span className="text-[11px] text-slate-400">{apt.customer_email}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {apt.appointment_type_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {new Date(apt.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-blue-600">
                        {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Meet</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                        apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        apt.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        apt.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {apt.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete</span>
                          </button>
                        )}
                        {apt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENT TYPES */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {types.map(tp => (
            <div key={tp.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{tp.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{tp.description}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  {tp.duration_minutes} mins
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tp.price > 0 ? `$${tp.price}` : 'Free'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tp.location_type}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 truncate">/booking/{tp.slug}</span>
                <button
                  onClick={() => copyBookingLink(tp.slug)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Public Link</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Appointment Modal */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Book Customer Appointment</h3>
            <form onSubmit={handleCreateBooking} className="space-y-3">
              <input
                required
                placeholder="Client Name"
                value={newBooking.customer_name}
                onChange={e => setNewBooking({ ...newBooking, customer_name: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <input
                required
                type="email"
                placeholder="Client Email"
                value={newBooking.customer_email}
                onChange={e => setNewBooking({ ...newBooking, customer_email: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              />
              <select
                value={newBooking.appointment_type_name}
                onChange={e => setNewBooking({ ...newBooking, appointment_type_name: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
              >
                {types.map(t => (
                  <option key={t.id} value={t.name}>{t.name} ({t.duration_minutes} min)</option>
                ))}
              </select>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date & Time</label>
                <input
                  required
                  type="datetime-local"
                  value={newBooking.start_time}
                  onChange={e => setNewBooking({ ...newBooking, start_time: e.target.value })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
