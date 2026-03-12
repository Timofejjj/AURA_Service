import React from 'react';
import { ArrowLeft, Clock, Infinity, TrendingUp } from 'lucide-react';

interface AuraPlusViewProps {
  onBack: () => void;
}

export const AuraPlusView: React.FC<AuraPlusViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white pb-32 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Background Elements */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-[#E95D2C] via-blue-400 to-cyan-400 rounded-full blur-3xl opacity-20 dark:opacity-30 animate-pulse" />
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-blue-500 to-[#E95D2C] rounded-full blur-2xl opacity-30 dark:opacity-40" />
      
      <div className="max-w-md mx-auto px-6 pt-12 relative z-10">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Main Card */}
        <div className="bg-white/90 dark:bg-dark-bg-card/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden transition-colors duration-300">
          {/* Decorative gradient orbs inside card */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-[#E95D2C]/80 to-blue-300 rounded-full blur-2xl opacity-40 dark:opacity-30" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-cyan-300 to-blue-300 rounded-full blur-2xl opacity-40 dark:opacity-30" />
          
          {/* Logo/Icon */}
          <div className="relative mb-6 flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-[#E95D2C] via-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-28 h-28 bg-gradient-to-tr from-blue-400 to-[#E95D2C] rounded-full flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="drop-shadow-xl">
                  <path d="M20 40 Q30 20, 40 40 T60 40" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
                  <circle cx="25" cy="35" r="4" fill="white"/>
                  <circle cx="40" cy="45" r="5" fill="white"/>
                  <circle cx="55" cy="35" r="4" fill="white"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="relative text-center mb-2">
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="text-3xl font-black text-gray-900 dark:text-dark-text-primary transition-colors duration-300">Aura Plus</span>
              <span className="text-2xl">👑</span>
            </div>
          </div>

          {/* Price */}
          <p className="text-center text-xl font-semibold text-gray-700 dark:text-dark-text-secondary mb-8 transition-colors duration-300">$5.99 / month</p>

          {/* Features List */}
          <div className="space-y-5 mb-8">
            {/* Feature 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E95D2C]/70 to-blue-100 dark:from-[#E95D2C]/20 dark:to-blue-900/50 flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                <Clock className="text-[#E95D2C] dark:text-[#E95D2C]" size={20} />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-dark-text-primary transition-colors duration-300">Voice recordings up to</p>
                <p className="text-base font-medium text-gray-900 dark:text-dark-text-primary transition-colors duration-300">5 minutes</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                <Infinity className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-dark-text-primary transition-colors duration-300">100 notes per day</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-[#E95D2C]/70 dark:from-cyan-900/50 dark:to-[#E95D2C]/20 flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                <TrendingUp className="text-cyan-600 dark:text-cyan-400" size={20} />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-dark-text-primary transition-colors duration-300">Deep analytics and reports</p>
              </div>
            </div>
          </div>

          {/* CTA Button with Gradient Orbs Effect */}
          <div className="relative">
            {/* Gradient orbs background */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full blur-xl opacity-70 animate-pulse" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#E95D2C] to-[#c94d20] rounded-full blur-2xl opacity-60" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-gradient-to-t from-pink-500 to-[#E95D2C] rounded-full blur-xl opacity-70" style={{ animationDelay: '1s' }} />
            </div>
            
            {/* Button */}
            <button className="relative w-full py-4 rounded-full bg-gradient-to-r from-blue-500 via-[#E95D2C] to-pink-500 text-white text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden">
              <span className="relative z-10">Upgrade to Plus</span>
            </button>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-sm text-gray-600 dark:text-dark-text-muted mt-6 transition-colors duration-300">
          Unlock unlimited potential with Aura Plus
        </p>
      </div>
    </div>
  );
};

