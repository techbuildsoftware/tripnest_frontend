import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading your workspace…</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
