
import React, { useState } from 'react';
import { submitOnboardingTags } from '../services/api';

interface OnboardingViewProps {
  userId: number;
  onFinish: () => void;
}

const WORDS = [
  "ментальное здоровье",
  "коучинг",
  "лидерство",
  "прогресс",
  "сон",
  "осознанность"
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ userId, onFinish }) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleWord = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else {
      if (selectedWords.length < 4) {
        setSelectedWords([...selectedWords, word]);
      } else {
        // Optional: shake animation or feedback for limit reached
      }
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      await submitOnboardingTags(userId, selectedWords);
      onFinish();
    } catch (error) {
      console.error("Onboarding submit failed", error);
      alert("Произошла ошибка, попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 font-sans relative transition-colors duration-300">
      
      {/* 1. Header Area */}
      <div className="pt-20 pb-8">
        <h1 
          className="text-[48px] font-black tracking-tighter leading-[1.1] mb-20"
          style={{
            background: 'linear-gradient(90deg, #9E9E9E 0%, #0008F9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          Добро<br />
          пожаловать<br />
          в Aura
        </h1>
        
        <p className="text-[22px] font-bold text-black dark:text-dark-text-primary leading-tight transition-colors duration-300">
          Выберите слова, для <span className="italic">контекста</span> Ваших персональных отчетов
        </p>
      </div>

      {/* 2. Chips Selection Area */}
      <div className="flex-1">
        <div className="flex flex-wrap gap-3">
          {WORDS.map((word) => {
            const isSelected = selectedWords.includes(word);
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                className={`px-5 py-2.5 rounded-full border transition-all duration-200 text-sm font-medium ${
                  isSelected 
                    ? 'bg-[#E95D2C] border-[#E95D2C] text-white shadow-lg shadow-[#E95D2C]/40 dark:shadow-[#E95D2C]/20' 
                    : 'bg-white dark:bg-dark-bg-secondary border-[#E95D2C] dark:border-[#E95D2C] text-black dark:text-dark-text-primary hover:bg-[#E95D2C]/30 dark:hover:bg-dark-bg-hover'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Footer Action */}
      <div className="pb-12 pt-4">
        <button 
          onClick={handleContinue}
          disabled={loading}
          className="w-full bg-[#E95D2C] text-white rounded-full py-5 text-lg font-bold shadow-xl shadow-blue-200 dark:shadow-blue-900/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
        >
          {loading ? 'Сохранение...' : 'Продолжить'}
        </button>
      </div>

    </div>
  );
};
