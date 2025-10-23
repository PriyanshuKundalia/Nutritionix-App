import React, { useState } from 'react';
import { registerUser } from '../../services/auth';

export default function RegisterForm({ onRegisterSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    try {
      await registerUser({ email, password });
      setError(null);
      onRegisterSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: 'auto' }}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <input type="password" placeholder="Confirm Password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
      <button type="submit">Register</button>
    </form>
  );
}
