import React from 'react';
import { JournalFolder } from '../types';

interface FolderCardProps {
  folder: JournalFolder;
  onClick?: (folder: JournalFolder) => void;
  className?: string;
  index?: number;
  mode?: 'scroll' | 'grid';
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onClick, className = '', index = 0, mode = 'scroll' }) => {
  // Набор градиентов; берём по id, чтобы цвета были разные и стабильные
  const gradients = [
    'linear-gradient(180deg, #4C1D95 0%, #EC4899 100%)', // фиолетовый→розовый
    'linear-gradient(180deg, #0066FF 0%, #00C9FF 100%)', // синий
    'linear-gradient(180deg, #F97316 0%, #FCD34D 100%)', // оранж→жёлтый
    'linear-gradient(180deg, #10B981 0%, #6EE7B7 100%)', // зелёный
    'linear-gradient(180deg, #B91C1C 0%, #FCA5A5 100%)', // красный
    'linear-gradient(180deg, #1F2937 0%, #9CA3AF 100%)', // серый
  ];
  const getGradient = (seed: number) => gradients[Math.abs(seed) % gradients.length];
  const gradientSeed = Number.isFinite(folder.id) ? Number(folder.id) : index;

  const widthClasses = mode === 'grid' 
    ? 'w-full max-w-[280px]' 
    : 'min-w-[170px] sm:min-w-[200px] lg:min-w-[240px] xl:min-w-[280px]';

  return (
    <div 
      onClick={() => onClick && onClick(folder)}
      className={`relative ${widthClasses} h-[190px] sm:h-[220px] lg:h-[260px] xl:h-[300px] rounded-[20px] sm:rounded-[24px] lg:rounded-[28px] shadow-[0_12px_28px_rgba(0,0,0,0.18)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.24)] overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[0.98] active:scale-95 ${className}`}
      style={{ background: getGradient(gradientSeed) }}
    >
      {/* Три белых листа веером в верхней части */}
      <div className="absolute top-4 sm:top-5 lg:top-6 left-1/2 -translate-x-1/2 w-[140px] h-[85px] sm:w-[170px] sm:h-[105px] lg:w-[200px] lg:h-[125px] xl:w-[230px] xl:h-[140px] pointer-events-none">
        <div 
          className="absolute top-3 sm:top-4 lg:top-5 left-0 w-[95px] h-[70px] sm:w-[115px] sm:h-[85px] lg:w-[135px] lg:h-[100px] xl:w-[155px] xl:h-[115px] bg-white rounded-[3px] sm:rounded-[4px] shadow-[0_3px_10px_rgba(0,0,0,0.2)]" 
          style={{ transform: 'rotate(-18deg)' }}
        />
        <div 
          className="absolute top-0 left-[22px] sm:left-[28px] lg:left-[33px] xl:left-[38px] w-[95px] h-[70px] sm:w-[115px] sm:h-[85px] lg:w-[135px] lg:h-[100px] xl:w-[155px] xl:h-[115px] bg-white rounded-[3px] sm:rounded-[4px] shadow-[0_4px_14px_rgba(0,0,0,0.3)] z-10" 
          style={{ transform: 'rotate(3deg)' }}
        />
        <div 
          className="absolute top-4 sm:top-5 lg:top-6 right-0 w-[95px] h-[70px] sm:w-[115px] sm:h-[85px] lg:w-[135px] lg:h-[100px] xl:w-[155px] xl:h-[115px] bg-white rounded-[3px] sm:rounded-[4px] shadow-[0_3px_10px_rgba(0,0,0,0.2)]" 
          style={{ transform: 'rotate(18deg)' }}
        />
      </div>

      {/* Текст внизу */}
      <div className="absolute z-20 left-5 sm:left-6 lg:left-7 bottom-5 sm:bottom-6 lg:bottom-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
        <h3 className="font-semibold text-[16px] sm:text-[19px] lg:text-[22px] xl:text-[25px] leading-tight mb-0.5 sm:mb-1">{folder.title}</h3>
        <p className="text-white/90 text-[13px] sm:text-[15px] lg:text-[17px] xl:text-[19px] font-normal">{folder.count} записей</p>
      </div>
    </div>
  );
};
