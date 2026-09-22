import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/navigation/Header';
import { Footer } from '../components/navigation/Footer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#262732] text-slate-100 antialiased">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
