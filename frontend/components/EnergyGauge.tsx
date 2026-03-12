import React from 'react';
interface EnergyGaugeProps {
  percentage: number | null;
}

export const EnergyGauge: React.FC<EnergyGaugeProps> = ({ percentage }) => {
  return (
    <div className="relative flex flex-col items-center justify-center py-6 sm:py-8 lg:py-10">
      <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px] xl:w-[420px] xl:h-[420px] flex items-center justify-center">
        {/* Мягкое свечение вокруг круга */}
        <div
          className="absolute inset-0 rounded-full energy-glow-1"
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-full energy-glow-2"
          aria-hidden
        />
        
        {/* Мягкие волны свечения */}
        <div className="absolute inset-0 wave-1" aria-hidden />
        <div className="absolute inset-0 wave-2" aria-hidden />
        <div className="absolute inset-0 wave-3" aria-hidden />

        {/* Белый центр (в темной теме - темный) */}
        <div className="relative z-10 w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] lg:w-[340px] lg:h-[340px] xl:w-[380px] xl:h-[380px] rounded-full bg-white dark:bg-dark-bg-card flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-colors duration-300 pulse-circle">
          <div className="flex flex-col items-center justify-center text-center px-6 sm:px-8 lg:px-10 leading-tight">
            <span className="text-black dark:text-dark-text-primary text-[15px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-medium transition-colors duration-300">Уровень вашей энергии</span>
            <span className="text-black dark:text-dark-text-primary text-[15px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-medium mb-3 sm:mb-4 lg:mb-5 transition-colors duration-300">сегодня:</span>
            <div className="flex items-center justify-center">
              <span className="text-[58px] sm:text-[72px] lg:text-[88px] xl:text-[100px] leading-none font-extrabold text-black dark:text-dark-text-primary tracking-tight transition-colors duration-300">
                {percentage !== null ? Math.round(percentage) : '--'}%
              </span>
              <button className="ml-2 sm:ml-3 lg:ml-4 w-[22px] h-[22px] sm:w-[28px] sm:h-[28px] lg:w-[32px] lg:h-[32px] bg-black dark:bg-white text-white dark:text-dark-bg-primary rounded-full flex items-center justify-center text-[12px] sm:text-[14px] lg:text-[16px] font-bold leading-none transition-colors duration-300 hover:scale-110 active:scale-95 transition-transform">
                ?
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .energy-glow-1 {
          background: radial-gradient(circle at 35% 25%,
            rgba(124, 58, 237, 0.85) 0%,
            rgba(59, 130, 246, 0.7) 30%,
            rgba(236, 72, 153, 0.6) 55%,
            rgba(124, 58, 237, 0.5) 75%,
            rgba(124, 58, 237, 0) 100%);
          filter: blur(22px);
          transform: scale(1.02);
          opacity: 0.95;
          animation: gentle-pulse 6s ease-in-out infinite;
        }
        .energy-glow-2 {
          background: radial-gradient(circle at 65% 75%,
            rgba(79, 70, 229, 0.75) 0%,
            rgba(34, 211, 238, 0.55) 35%,
            rgba(236, 72, 153, 0.55) 60%,
            rgba(124, 58, 237, 0.45) 80%,
            rgba(124, 58, 237, 0) 100%);
          filter: blur(24px);
          opacity: 0.9;
          animation: gentle-pulse 7s ease-in-out infinite reverse;
        }
        
        /* Мягкие волны свечения, движущиеся по кругу */
        .wave-1 {
          background: radial-gradient(ellipse 80px 200px at 50% 0%,
            rgba(124, 58, 237, 0.3) 0%,
            rgba(236, 72, 153, 0.25) 40%,
            transparent 70%);
          filter: blur(18px);
          animation: rotate-wave-1 6s linear infinite;
        }
        .wave-2 {
          background: radial-gradient(ellipse 70px 180px at 50% 0%,
            rgba(59, 130, 246, 0.25) 0%,
            rgba(34, 211, 238, 0.2) 45%,
            transparent 75%);
          filter: blur(16px);
          animation: rotate-wave-2 8s linear infinite reverse;
        }
        .wave-3 {
          background: radial-gradient(ellipse 90px 190px at 50% 0%,
            rgba(236, 72, 153, 0.28) 0%,
            rgba(124, 58, 237, 0.22) 35%,
            transparent 65%);
          filter: blur(20px);
          animation: rotate-wave-3 10s linear infinite;
        }
        
        @keyframes gentle-pulse {
          0%, 100% {
            opacity: 0.9;
            transform: scale(1.02);
          }
          50% {
            opacity: 1;
            transform: scale(1.03);
          }
        }
        
        @keyframes rotate-wave-1 {
          0% {
            opacity: 0.4;
            transform: rotate(0deg) scale(1);
          }
          25% {
            opacity: 0.6;
            transform: rotate(90deg) scale(1.05);
          }
          50% {
            opacity: 0.5;
            transform: rotate(180deg) scale(1);
          }
          75% {
            opacity: 0.6;
            transform: rotate(270deg) scale(1.05);
          }
          100% {
            opacity: 0.4;
            transform: rotate(360deg) scale(1);
          }
        }
        
        @keyframes rotate-wave-2 {
          0% {
            opacity: 0.35;
            transform: rotate(0deg) scale(1.02);
          }
          20% {
            opacity: 0.55;
            transform: rotate(72deg) scale(1.08);
          }
          40% {
            opacity: 0.45;
            transform: rotate(144deg) scale(1.02);
          }
          60% {
            opacity: 0.55;
            transform: rotate(216deg) scale(1.08);
          }
          80% {
            opacity: 0.4;
            transform: rotate(288deg) scale(1.02);
          }
          100% {
            opacity: 0.35;
            transform: rotate(360deg) scale(1.02);
          }
        }
        
        @keyframes rotate-wave-3 {
          0% {
            opacity: 0.3;
            transform: rotate(0deg) scale(0.98);
          }
          30% {
            opacity: 0.5;
            transform: rotate(108deg) scale(1.06);
          }
          60% {
            opacity: 0.4;
            transform: rotate(216deg) scale(0.98);
          }
          90% {
            opacity: 0.5;
            transform: rotate(324deg) scale(1.06);
          }
          100% {
            opacity: 0.3;
            transform: rotate(360deg) scale(0.98);
          }
        }
        
        @keyframes pulse-circle {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0_10px_30px_rgba(0,0,0,0.08), 0_0_0_0_rgba(124,58,237,0);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0_10px_30px_rgba(0,0,0,0.08), 0_0_20px_10px_rgba(124,58,237,0.15);
          }
        }
        
        .pulse-circle {
          animation: pulse-circle 3s ease-in-out infinite;
        }
        
        .dark .pulse-circle {
          animation: pulse-circle-dark 3s ease-in-out infinite;
        }
        
        @keyframes pulse-circle-dark {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0_10px_30px_rgba(0,0,0,0.4), 0_0_0_0_rgba(124,58,237,0);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0_10px_30px_rgba(0,0,0,0.4), 0_0_20px_10px_rgba(124,58,237,0.25);
          }
        }
      `}</style>
    </div>
  );
};
