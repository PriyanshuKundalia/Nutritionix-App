import { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  function validatePassword(pw) {
    if (pw.length < 8) return false;
    if (!/[A-Z]/.test(pw)) return false;   // check uppercase letter
    if (!/[a-z]/.test(pw)) return false;   // check lowercase letter
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validatePassword(password)) {
      setError('Password must be at least 8 chars, with 1 uppercase and 1 lowercase letter');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Registration failed');
        return;
      }

      const data = await response.json();

      login(data.token);
      window.location.href = '/';
    } catch (err) {
      setError('Network error');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      /><br />
      <input
        type="password"
        placeholder="Password (min 8 chars, 1 uppercase, 1 lowercase)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      /><br />
      <button type="submit">Register</button>
    </form>
  );
}
