import { useState } from 'react';

export default function PasswordReset() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:8080/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMessage('Reset email sent. Check your inbox.');
      } else {
        setMessage('Failed to send reset email.');
      }
    } catch {
      setMessage('Network error.');
    }
  }

  return (
    <div style={{ maxWidth: '450px', margin: '40px auto', padding: '30px', background: '#181818', borderRadius: '10px', color: '#e0e0e0', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)' }}>
      <h2 style={{ color: '#61dafb', textAlign: 'center', marginBottom: '25px', fontSize: '1.8rem', fontWeight: '700' }}>Reset Password</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '6px', border: '1.5px solid #444', background: '#222', color: '#e0e0e0', fontSize: '1rem', transition: 'border-color 0.3s ease' }}
        />
        <button type="submit" style={{ backgroundColor: '#27ae60', color: 'white', fontWeight: '700', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'background-color 0.3s ease' }}>
          Send Reset Email
        </button>
      </form>
      {message && <p style={{ marginTop: '25px', textAlign: 'center', fontWeight: '600' }}>{message}</p>}
    </div>
  );
}
