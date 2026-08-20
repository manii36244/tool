import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, CheckCircle2, User, Mail, DollarSign, Layers } from 'lucide-react';
import { api } from '../lib/api.ts';

export const PublicBookingPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [typeData, setTypeData] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPublicBooking();
  }, [slug]);

  const loadPublicBooking = async () => {
    try {
      const data = await api.getPublicBooking(slug);
      setTypeData(data.appointmentType);
      setWorkspace(data.workspace);
    } catch (err) {
      console.error('Error loading booking:', err);
    }
  };

  const timeSlots = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const start = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const end = new Date(new Date(start).getTime() + (typeData?.duration_minutes || 30) * 60000).toISOString();

      await api.submitPublicBooking(slug, {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        start_time: start,
        end_time: end,
      });

      setIsBooked(true);
    } catch (err: any) {
      alert(err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBooked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Appointment Confirmed!</h2>
          <p className="text-xs text-slate-600">
            A calendar invite and Google Meet link have been dispatched to <strong>{email}</strong> for <strong>{selectedDate} at {selectedTime}</strong>.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-700 text-left space-y-1">
            <p><strong>Host:</strong> {workspace?.name}</p>
            <p><strong>Session:</strong> {typeData?.name}</p>
            <p><strong>Duration:</strong> {typeData?.duration_minutes} minutes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side Details */}
        <div className="p-8 bg-slate-900 text-white flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-300">{workspace?.name || 'Nexus Business'}</span>
            </div>

            <h2 className="text-lg font-bold text-white">{typeData?.name || 'Strategy Meeting'}</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{typeData?.description || 'Select a time slot for our strategy session.'}</p>

            <div className="space-y-2 mt-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{typeData?.duration_minutes || 30} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <span>Google Meet Video Call</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-400" />
                <span>{typeData?.price > 0 ? `$${typeData.price}` : 'Complimentary'}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500">Powered by NexusOS Multi-tenant Scheduling</p>
        </div>

        {/* Right Side Slot & Form */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Date</label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Available Times</label>
              <div className="grid grid-cols-3 gap-1.5">
                {timeSlots.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      selectedTime === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Your Full Name *</label>
              <input
                required
                placeholder="Marcus Vance"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email *</label>
              <input
                required
                type="email"
                placeholder="marcus@vancecapital.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
