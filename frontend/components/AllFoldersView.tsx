import React, { useEffect, useState } from 'react';
import { JournalFolder } from '../types';
import { fetchAllFolders } from '../services/api';
import { FolderCard } from './FolderCard';

interface AllFoldersViewProps {
  userId: number;
  onFolderClick: (folder: JournalFolder) => void;
}

export const AllFoldersView: React.FC<AllFoldersViewProps> = ({ userId, onFolderClick }) => {
  const [folders, setFolders] = useState<JournalFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await fetchAllFolders(userId);
      console.log("AllFoldersView: Loaded folders:", data);
      setFolders(data);
    } catch (error) {
      console.error("Failed to fetch all folders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-32 pt-8 sm:pt-12 lg:pt-16 px-6 sm:px-8 lg:px-12 max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto animate-fade-in relative transition-colors duration-300">
      <div className="relative z-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-6 sm:mb-8 lg:mb-10 text-black dark:text-dark-text-primary transition-colors duration-300">
          Все записи
        </h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-[#E95D2C]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
            {folders.map((folder, idx) => (
              <div key={folder.id} className="flex justify-center">
                <FolderCard 
                  folder={folder} 
                  index={idx}
                  onClick={onFolderClick}
                  mode="grid"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
