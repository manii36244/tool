import React, { useState, useEffect } from 'react';
import { CheckCircle2, Send, Layers } from 'lucide-react';
import { api } from '../lib/api.ts';

export const PublicLeadFormPage: React.FC<{ formId: string }> = ({ formId }) => {
  const [formData, setFormData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      const data = await api.getPublicForm(formId);
      setFormData(data.form);
    } catch (err) {
      console.error('Error loading form:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.submitPublicForm(formId, answers);
      setIsSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Thank You!</h2>
          <p className="text-xs text-slate-600">
            {formData?.success_message || 'Your inquiry has been received. Our team will get back to you shortly.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Inquiry Form</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{formData?.title || 'Contact Us'}</h2>
          <p className="text-xs text-slate-500 mt-1">{formData?.description || 'Fill out the details below to request a callback.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">First Name *</label>
              <input
                required
                type="text"
                placeholder="Marcus"
                onChange={e => setAnswers({ ...answers, first_name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name *</label>
              <input
                required
                type="text"
                placeholder="Sterling"
                onChange={e => setAnswers({ ...answers, last_name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email Address *</label>
            <input
              required
              type="email"
              placeholder="marcus@company.com"
              onChange={e => setAnswers({ ...answers, email: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Company Name</label>
            <input
              type="text"
              placeholder="Acme Global Logistics"
              onChange={e => setAnswers({ ...answers, company: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="+1 (555) 234-5678"
              onChange={e => setAnswers({ ...answers, phone: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Project Requirements / Notes</label>
            <textarea
              rows={3}
              placeholder="Tell us about your team size, workflow requirements..."
              onChange={e => setAnswers({ ...answers, notes: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-indigo-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Inquiry'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
