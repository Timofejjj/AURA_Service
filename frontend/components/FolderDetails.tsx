

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { JournalFolder, FolderDetailsResponse } from '../types';
import { fetchFolderDetails, deleteThought } from '../services/api';
import { debounce } from '../utils/debounce';

interface FolderDetailsProps {
  folder: JournalFolder;
  userId: number;
  onBack: () => void;
  onThoughtClick?: (thought: any) => void;
  refreshKey?: number;
}

export const FolderDetails: React.FC<FolderDetailsProps> = ({ folder, userId, onBack, onThoughtClick, refreshKey }) => {
  const [details, setDetails] = useState<FolderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [thoughtToDelete, setThoughtToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State to track expanded months: key format `${year}-${month_number}`
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        console.log(`[FolderDetails] Loading folder details for folder.id=${folder.id}, refreshKey=${refreshKey ?? 0}`);
        const data = await fetchFolderDetails(userId, folder.id);
        console.log(`[FolderDetails] Loaded ${data.timeline.length} years of data`);
        setDetails(data);
        
        // Auto-expand all months by default (as per user behavior expectation in browsable lists)
        const allKeys = new Set<string>();
        data.timeline.forEach(year => {
          year.months.forEach(month => {
            allKeys.add(`${year.year}-${month.month_number}`);
          });
        });
        setExpandedMonths(allKeys);

      } catch (error) {
        console.error("Failed to load folder details", error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [folder.id, folder, userId, refreshKey ?? 0]); // Added refreshKey to force refresh when needed

  const toggleMonth = (year: number, monthNumber: number) => {
    const key = `${year}-${monthNumber}`;
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getSentimentDisplayName = (label: string) => {
    const l = label.toLowerCase();
    if (l === 'positive') return 'Позитив';
    if (l === 'negative') return 'Негатив';
    // Default fallback for 'neutral', 'plan' or any unknown string
    return 'Нейтральное';
  };

  const handleDeleteClick = (e: React.MouseEvent, thoughtId: number) => {
    e.stopPropagation(); // Prevent card click
    setThoughtToDelete(thoughtId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!thoughtToDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await deleteThought(thoughtToDelete);
      
      // Reload folder details to refresh the list
      const data = await fetchFolderDetails(userId, folder.id);
      setDetails(data);
      
      setShowDeleteModal(false);
      setThoughtToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete thought:", error);
      alert("Не удалось удалить запись. Попробуйте еще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-32 pt-12 px-6 max-w-md mx-auto animate-fade-in transition-colors duration-300">
      
      {/* 1. Header with Title */}
      <div className="relative flex items-center justify-center mb-8">
        <button 
          onClick={onBack}
          className="absolute left-0 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={28} className="text-gray-900" />
        </button>
        {/* Use title from API if available, else fallback to prop */}
        <h1 className="text-3xl font-black text-black transition-colors duration-300">
          {details?.folder_info?.title || folder.title}
        </h1>
      </div>

      {/* 2. Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-[#E95D2C]"></div>
        </div>
      ) : details && details.timeline.length > 0 ? (
        <div className="space-y-8">
          
          {details.timeline.map((yearGroup) => (
            <div key={yearGroup.year} className="animate-fade-in-up">
              
              {/* Year Header */}
              <div className="flex justify-center mb-4">
                <span className="text-xl font-medium text-[#E95D2C]">
                  {yearGroup.year} год
                </span>
              </div>

              {/* Months List */}
              <div className="space-y-6">
                {yearGroup.months.map((month) => {
                  const isExpanded = expandedMonths.has(`${yearGroup.year}-${month.month_number}`);
                  
                  return (
                    <div key={month.month_number}>
                      {/* Accordion Header */}
                      <button 
                        onClick={() => toggleMonth(yearGroup.year, month.month_number)}
                        className="flex items-center text-primary font-bold text-xl mb-3 hover:opacity-80 transition-opacity"
                      >
                         {isExpanded ? (
                           <ChevronDown className="mr-2 text-primary" size={24} />
                         ) : (
                           <ChevronRight className="mr-2 text-primary" size={24} />
                         )}
                         {month.month_name}
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                          
                          {/* Photos Carousel */}
                          {month.has_photos && month.photos.length > 0 && (
                            <div className="flex overflow-x-auto gap-3 pb-2 -mx-6 px-6 no-scrollbar snap-x snap-mandatory mb-4">
                              {month.photos.map((photo) => (
                                <div key={photo.photo_id} className="snap-center shrink-0">
                                  <img 
                                    src={photo.url} 
                                    alt="Memory" 
                                    className="w-[160px] h-[140px] object-cover rounded-2xl shadow-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Thoughts Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {month.thoughts.map((thought) => (
                              <div 
                                key={thought.thought_id} 
                                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[180px] cursor-pointer hover:shadow-md transition-shadow relative"
                                onClick={() => {
                                  if (onThoughtClick) {
                                    onThoughtClick(thought);
                                  }
                                }}
                              >
                                <div>
                                  {/* Top Row: Sentiment */}
                                  <div className="flex justify-end mb-2">
                                    <span 
                                      className="text-xs font-bold"
                                      style={{ color: thought.sentiment_color }}
                                    >
                                      {getSentimentDisplayName(thought.sentiment_label)}
                                    </span>
                                  </div>
                                  
                                  {/* Title & Preview */}
                                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
                                    {thought.title || "Untitled"}
                                  </h3>
                                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                                    {thought.preview_text}
                                  </p>
                                </div>

                                {/* Date Footer with Delete Button */}
                                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    {thought.date_str}
                                  </span>
                                  <button
                                    onClick={(e) => handleDeleteClick(e, thought.thought_id)}
                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Удалить запись"
                                  >
                                    <Trash2 size={14} className="text-gray-400 hover:text-red-500 transition-colors" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          ))}

        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>В этой папке пока нет записей.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Удалить запись?
            </h2>
            <p className="text-gray-600 mb-6">
              Это действие нельзя отменить. Запись будет удалена навсегда.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setThoughtToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
