import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

export default function Login() {
  const navigate = useNavigate();
  return (
    <LoginForm onLogin={() => navigate('/dashboard')} />
  );
}
