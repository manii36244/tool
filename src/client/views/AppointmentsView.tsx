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
  DollarSign,
  Trash2,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { Appointment, AppointmentType } from '../../../shared/types.ts';

export const AppointmentsView: React.FC = () => {
  const { showToast, refreshData, openAiDrawerWithPrompt, setActiveView } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'types'>('bookings');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customer_name: '',
    customer_email: '',
    appointment_type_name: 'Product Demo & Workflow Walkthrough',
    start_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  const [isNewTypeOpen, setIsNewTypeOpen] = useState(false);
  const [newType, setNewType] = useState({
    name: '',
    slug: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    location_type: 'Google Meet Video Call',
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
      if (tps.length > 0 && !newBooking.appointment_type_name) {
        setNewBooking(prev => ({ ...prev, appointment_type_name: tps[0].name }));
      }
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

  const handleDeleteAppointment = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete appointment with ${title}?`)) return;
    try {
      await api.deleteAppointment(id);
      showToast('Appointment Deleted', `Removed appointment with ${title}`);
      await loadAppointmentsData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteType = async (typeId: string, typeName: string) => {
    if (!confirm(`Are you sure you want to delete "${typeName}"?`)) return;
    try {
      await api.deleteAppointmentType(typeId);
      showToast('Type Deleted', `Removed ${typeName}`);
      await loadAppointmentsData();
      await refreshData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slugVal = newType.slug || newType.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || `meeting-${Date.now()}`;
      await api.createAppointmentType({
        ...newType,
        slug: slugVal,
      });
      showToast('Meeting Type Created', `New booking link created: /booking/${slugVal}`);
      setIsNewTypeOpen(false);
      setNewType({
        name: '',
        slug: '',
        description: '',
        duration_minutes: 30,
        price: 0,
        location_type: 'Google Meet Video Call',
      });
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
      showToast('Booking Created', 'Appointment and Google Meet link generated');
      setIsNewBookingOpen(false);
      setNewBooking({
        customer_name: '',
        customer_email: '',
        appointment_type_name: types[0]?.name || 'Product Demo & Workflow Walkthrough',
        start_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      });
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

  const copyMeetLink = (id: string, meetUrl: string) => {
    navigator.clipboard.writeText(meetUrl);
    setCopiedId(id);
    showToast('Google Meet Link Copied', meetUrl);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments & Online Scheduling</h1>
          <p className="text-sm text-slate-500 mt-0.5">Public booking links, automated Google Meet generation, and calendar slot availability</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAiDrawerWithPrompt('Suggest optimal meeting schedule based on open deals')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Schedule Optimizer</span>
          </button>
          {activeTab === 'types' ? (
            <button
              onClick={() => setIsNewTypeOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Appointment Type</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewBookingOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          )}
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
                  <th className="py-3 px-4">Google Meet Link</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map(apt => {
                  const meetLink = apt.meeting_url || (apt.location?.startsWith('http') ? apt.location : `https://meet.google.com/nex-meet-${apt.id.slice(-4)}`);
                  return (
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
                        <div className="text-[11px] text-blue-600 font-medium">
                          {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{apt.location || 'Google Meet'}</span>
                        </div>
                      </td>
                      {/* Google Meet Link Column after Location */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md font-medium text-[11px] transition-colors"
                            title="Join Google Meet Room"
                          >
                            <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Join Meet</span>
                            <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => copyMeetLink(apt.id, meetLink)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Copy Google Meet Link"
                          >
                            {copiedId === apt.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {apt.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'completed')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </button>
                          )}
                          {apt.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Cancel Meeting"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAppointment(apt.id, apt.customer_name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Appointment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENT TYPES */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          {types.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-xs">
              <Clock className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Appointment Types Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create appointment types with custom durations and shareable booking links so your clients can schedule Google Meet calls directly.
              </p>
              <button
                onClick={() => setIsNewTypeOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Appointment Type</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {types.map(tp => (
                <div key={tp.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{tp.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tp.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                        {tp.duration_minutes} mins
                      </span>
                      <button
                        onClick={() => handleDeleteType(tp.id, tp.name)}
                        title="Delete Meeting Type"
                        className="p-1 text-slate-300 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tp.price > 0 ? `$${tp.price}` : 'Free'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tp.location_type || 'Google Meet Video Call'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400 truncate">/booking/{tp.slug}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/booking/${tp.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Open Live Booking Page"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Preview</span>
                      </a>
                      <button
                        onClick={() => copyBookingLink(tp.slug)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book Appointment Modal */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Book Customer Appointment</h3>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                <Video className="w-3 h-3" /> Auto Meet Link
              </span>
            </div>
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
                {types.length === 0 && <option value="Strategy Consultation">Strategy Consultation (30 min)</option>}
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
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                A unique Google Meet room will be generated and associated with this appointment.
              </p>
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
                  Confirm & Generate Meet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Appointment Type Modal */}
      {isNewTypeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Create Appointment Type</h3>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Public Booking
              </span>
            </div>
            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Appointment Name *</label>
                <input
                  required
                  placeholder="e.g. Executive Strategy Call"
                  value={newType.name}
                  onChange={e => {
                    const nameVal = e.target.value;
                    setNewType({
                      ...newType,
                      name: nameVal,
                      slug: newType.slug || nameVal.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    });
                  }}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Custom Link Slug</label>
                <div className="flex items-center rounded-md border border-slate-200 overflow-hidden bg-slate-50">
                  <span className="text-[11px] text-slate-400 px-2.5 font-mono">/booking/</span>
                  <input
                    required
                    placeholder="executive-call"
                    value={newType.slug}
                    onChange={e => setNewType({ ...newType, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full text-xs p-2 bg-white outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Duration (minutes)</label>
                  <select
                    value={newType.duration_minutes}
                    onChange={e => setNewType({ ...newType, duration_minutes: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for Free"
                    value={newType.price}
                    onChange={e => setNewType({ ...newType, price: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe what will be covered during this meeting..."
                  value={newType.description}
                  onChange={e => setNewType({ ...newType, description: e.target.value })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-blue-600"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center gap-2 text-blue-800 text-[11px]">
                <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Google Meet links are automatically attached to all confirmed bookings.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewTypeOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Create Meeting Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
