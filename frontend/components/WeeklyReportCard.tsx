import React from 'react';

interface WeeklyReportCardProps {
  onClick: () => void;
}

export const WeeklyReportCard: React.FC<WeeklyReportCardProps> = ({ onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="w-full h-24 sm:h-28 lg:h-32 xl:h-36 rounded-[18px] sm:rounded-[22px] lg:rounded-[26px] overflow-hidden cursor-pointer flex shadow-xl hover:shadow-2xl mb-8 sm:mb-10 lg:mb-12 active:scale-95 transition-all duration-200 bg-black"
    >
      {/* Left text area */}
      <div className="flex-1 flex items-center pl-6 sm:pl-8 lg:pl-10 xl:pl-12">
        <div className="relative z-10">
          <h3 className="text-white text-[24px] sm:text-[28px] lg:text-[34px] xl:text-[40px] font-bold leading-tight">
            Ваш отчет готов
          </h3>
        </div>
      </div>

      {/* Right gradient area with overlapping blobs (orange gradient) */}
      <div className="relative w-[38%] h-full">
        {/* Soft divider */}
        <div className="absolute left-0 top-0 h-full w-6 sm:w-8 lg:w-10 bg-gradient-to-r from-black via-black/40 to-transparent" />

        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-black" />

        {/* Blobs */}
        <div
          className="absolute rounded-full"
          style={{
            width: '220px',
            height: '220px',
            background: '#FF7A00',
            left: '-50px',
            top: '-80px',
            filter: 'blur(48px)',
            opacity: 0.9
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '240px',
            height: '240px',
            background: '#FFB347',
            left: '10px',
            top: '-70px',
            filter: 'blur(50px)',
            opacity: 0.95
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '210px',
            height: '210px',
            background: '#FF6F61',
            right: '-70px',
            top: '-50px',
            filter: 'blur(50px)',
            opacity: 0.95
          }}
        />

        {/* Shine overlay for smoother blend */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/25 to-transparent opacity-80" />
      </div>
    </div>
  );
};
