'use client';

import { useState } from 'react';

export default function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit() {
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Anonymous', message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setMessage('');
      setTimeout(() => {
        setStatus('idle');
        setOpen(false);
      }, 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-full shadow-lg transition-colors z-50"
      >
        Feedback
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-green-800 rounded-xl shadow-2xl p-4 w-80 z-50 border border-green-600">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-bold">Send Feedback</h3>
        <button onClick={() => setOpen(false)} className="text-green-400 hover:text-white text-lg leading-none">&times;</button>
      </div>
      <input
        type="text"
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-green-700 text-white placeholder-green-400 px-3 py-2 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
        maxLength={50}
      />
      <textarea
        placeholder="Suggestions, bugs, ideas..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full bg-green-700 text-white placeholder-green-400 px-3 py-2 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none h-24"
        maxLength={2000}
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || status === 'sending'}
        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-green-900 font-bold py-2 rounded-lg transition-colors text-sm"
      >
        {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Sent!' : status === 'error' ? 'Failed — try again' : 'Submit'}
      </button>
    </div>
  );
}
