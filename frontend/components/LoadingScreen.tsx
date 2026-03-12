
import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-t from-[#FFFFFF] to-[#0511E9]">
      <style>{`
        @keyframes deepPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.1; }
        }
      `}</style>
      <h1 
        className="text-6xl font-black text-white tracking-tighter select-none"
        style={{ animation: 'deepPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
      >
        Aura
      </h1>
    </div>
  );
};
