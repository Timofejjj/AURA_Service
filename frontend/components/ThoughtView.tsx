import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Paperclip, X, Maximize2, Trash2 } from 'lucide-react';
import { Thought } from '../types';
import { uploadImage, saveThought, deleteThought } from '../services/api';

interface ThoughtViewProps {
  thought: Thought;
  userId: number;
  onBack: () => void;
  onSave?: () => void;
  onZoomChange?: (isZoomed: boolean) => void; // Callback to notify parent about zoom state
  highlightText?: string | null; // Текст для выделения
}

// Helper function to extract title and content from stored format
const extractTitleAndContent = (storedContent: string): { title: string; content: string } => {
  if (!storedContent) return { title: '', content: '' };
  
  // Check if content starts with title marker
  if (storedContent.startsWith('__TITLE__:')) {
    const lines = storedContent.split('\n');
    const firstLine = lines[0];
    const title = firstLine.replace('__TITLE__:', '');
    const content = lines.slice(1).join('\n');
    return { title, content };
  }
  
  // No title marker - content is just content, title is empty
  return { title: '', content: storedContent };
};

export const ThoughtView: React.FC<ThoughtViewProps> = ({ thought, userId, onBack, onSave, onZoomChange, highlightText }) => {
  // Extract title and content from thought
  const { title: extractedTitle, content: extractedContent } = extractTitleAndContent(thought.content || '');
  
  // Use thought.title if available, otherwise use extracted title
  const [title, setTitle] = useState(thought.title || extractedTitle);
  const [content, setContent] = useState(extractedContent);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Initialize title, content and images from thought
  useEffect(() => {
    // Extract title and content when thought changes
    const { title: extractedTitle, content: extractedContent } = extractTitleAndContent(thought.content || '');
    
    // Use thought.title if available, otherwise use extracted title
    setTitle(thought.title || extractedTitle);
    setContent(extractedContent);
    
    // Initialize images from thought
    if (thought.image_id) {
      // If image_id is base64 (data:image), use it directly
      // If it's a blob URL (shouldn't happen after fix, but handle it), use it
      // If it's a regular URL, use it
      // Otherwise, treat it as an ID and prefix with #
      let imageUrl: string;
      if (thought.image_id.startsWith('data:image')) {
        // Base64 image - use directly
        imageUrl = thought.image_id;
      } else if (thought.image_id.startsWith('http') || thought.image_id.startsWith('blob:')) {
        // Full URL (http/https/blob) - use as-is
        imageUrl = thought.image_id;
      } else {
        // Treat as ID - prefix with # for internal tracking
        imageUrl = `#${thought.image_id}`;
      }
      setImages([imageUrl]);
    } else {
      // No image - clear images array
      setImages([]);
    }
  }, [thought]);

  // Выделение текста и прокрутка при наличии highlightText
  useEffect(() => {
    if (highlightText && content && contentTextareaRef.current) {
      // Находим позицию текста в content
      const textLower = content.toLowerCase();
      const highlightLower = highlightText.toLowerCase();
      const index = textLower.indexOf(highlightLower);
      
      if (index !== -1) {
        // Прокручиваем к тексту
        setTimeout(() => {
          if (contentTextareaRef.current) {
            // Устанавливаем курсор в начало выделенного текста
            contentTextareaRef.current.setSelectionRange(index, index + highlightText.length);
            // Прокручиваем к выделенному тексту
            contentTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Выделяем текст
            contentTextareaRef.current.focus();
            contentTextareaRef.current.setSelectionRange(index, index + highlightText.length);
            
            // Через небольшую задержку снимаем выделение, но оставляем прокрутку
            setTimeout(() => {
              if (contentTextareaRef.current) {
                contentTextareaRef.current.setSelectionRange(index, index);
              }
            }, 2000);
          }
        }, 100);
      }
    }
  }, [highlightText, content]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input immediately to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Check file size (6 MB limit)
    const maxSize = 6 * 1024 * 1024; // 6 MB in bytes
    if (file.size > maxSize) {
      alert(`Размер файла превышает 6 МБ. Текущий размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ`);
      return;
    }
    
    try {
      // Конвертируем в base64 сразу при загрузке для быстрого сохранения (оптимизация!)
      const base64Image = await convertFileToBase64(file);
      
      // Добавляем изображение в массив (будет отображаться в блоке изображений)
      setImages(prev => [...prev, base64Image]);
    } catch (err: any) {
      console.error("Failed to upload image:", err);
      const errorMessage = err?.message || "Не удалось загрузить изображение";
      alert(`Не удалось загрузить изображение: ${errorMessage}`);
    }
  };
  
  // Функция для конвертации файла в base64 (оптимизированная)
  const convertFileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Оптимизируем изображение перед сохранением
        optimizeBase64Image(result, 1920, 0.7).then(resolve).catch(() => resolve(result));
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  // Функция для оптимизации base64 изображения
  const optimizeBase64Image = async (base64: string, maxSize: number = 1920, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Масштабируем если нужно
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedBase64);
      };
      img.onerror = reject;
      img.src = base64;
    });
  };

  const handleImageZoom = (imageUrl: string) => {
    if (selectedImage === imageUrl) {
      const newZoomState = !isZoomed;
      setIsZoomed(newZoomState);
      if (onZoomChange) {
        onZoomChange(newZoomState);
      }
    } else {
      setSelectedImage(imageUrl);
      setIsZoomed(true);
      if (onZoomChange) {
        onZoomChange(true);
      }
    }
  };

  const handleImageDelete = (imageUrl: string) => {
    console.log('[ThoughtView] Deleting image:', imageUrl);
    console.log('[ThoughtView] Images before delete:', images);
    setImages(prev => {
      const newImages = prev.filter(img => img !== imageUrl);
      console.log('[ThoughtView] Images after delete:', newImages);
      return newImages;
    });
    if (selectedImage === imageUrl) {
      setSelectedImage(null);
      setIsZoomed(false);
      if (onZoomChange) {
        onZoomChange(false);
      }
    }
    console.log('[ThoughtView] Image deleted. Remember to save changes!');
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent double save
    setIsSaving(true);
    
    try {
      // ОПТИМИЗАЦИЯ: Быстрая проверка изменений без лишних операций
      const { title: extractedTitle, content: extractedContent } = extractTitleAndContent(thought.content || '');
      const originalTitle = thought.title || extractedTitle;
      const originalContent = extractedContent;
      
      // Быстрое сравнение (без trim для ускорения)
      const titleChanged = title !== originalTitle;
      const contentChanged = content !== originalContent;
      
      // Быстрая проверка изображений
      const originalImageId = thought.image_id || null;
      const latestImage = images.length > 0 ? images[images.length - 1] : null;
      const imagesChanged = (originalImageId !== null) !== (latestImage !== null) || 
                           (latestImage && latestImage.startsWith('blob:'));
      
      if (!titleChanged && !contentChanged && !imagesChanged) {
        onBack();
        return;
      }

      // ОПТИМИЗАЦИЯ: Быстрое извлечение image_id
      let imageId: string | null = null;
      if (latestImage) {
        imageId = latestImage.startsWith('data:image') ? latestImage : 
                  latestImage.startsWith('#') ? latestImage.substring(1) : latestImage;
      }
      
      // Формируем content с заголовком
      const contentWithTitle = title.trim() 
        ? `__TITLE__:${title.trim()}\n${content.trim()}`
        : content.trim();
      
      // Сохранение (без ожидания onSave - он вызовется асинхронно)
      await saveThought({
        user_id: userId,
        thought_id: thought.thought_id || thought.id,
        content: contentWithTitle,
        image_id: imageId,
        type_thought: thought.type_thought || undefined
      });
      
      // Вызываем onSave в фоне (не блокируем возврат)
      if (onSave) {
        onSave().catch(err => console.warn('Background refresh failed:', err));
      }
      
      // Сразу возвращаемся (быстрая реакция UI)
      onBack();
    } catch (error: any) {
      console.error("Failed to save thought:", error);
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('401')) {
        alert("Сессия истекла. Пожалуйста, войдите снова.");
      } else {
        alert("Не удалось сохранить изменения");
      }
      setIsSaving(false); // Разблокируем только при ошибке
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getSentimentColor = (label?: string) => {
    if (!label) return '#A4B0BE';
    const l = label.toLowerCase();
    if (l === 'positive') return '#2ECC71';
    if (l === 'negative') return '#FF4757';
    return '#A4B0BE';
  };

  const getSentimentLabel = (label?: string) => {
    if (!label) return 'Нейтральное';
    const l = label.toLowerCase();
    if (l === 'positive') return 'Позитив';
    if (l === 'negative') return 'Негатив';
    return 'Нейтральное';
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const thoughtId = thought.thought_id || thought.id;
      if (!thoughtId) {
        throw new Error('Thought ID not found');
      }
      
      await deleteThought(thoughtId);
      
      // Call onSave callback to refresh data
      if (onSave) {
        await onSave();
      }
      
      // Close modal and go back
      setShowDeleteModal(false);
      onBack();
    } catch (error: any) {
      console.error("Failed to delete thought:", error);
      alert("Не удалось удалить запись. Попробуйте еще раз.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white transition-colors duration-300 reader-surface">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-gray-100 px-8 sm:px-12 lg:px-24 xl:px-32 py-5 transition-colors duration-300 reader-surface">
        <div className="flex items-center justify-between max-w-[900px] mx-auto">
          <button
            onClick={onBack}
            className="p-2.5 -ml-2 rounded-lg hover:bg-gray-100 transition-all hover:scale-105"
          >
            <ArrowLeft size={22} className="text-gray-700 dark:glass-text-primary" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#E95D2C] text-white rounded-lg text-sm font-semibold hover:bg-[#c94d20] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Сохранение...</span>
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-8 sm:px-12 lg:px-24 xl:px-32 pt-12 pb-32">
        {/* Date and Sentiment */}
        <div className="max-w-[720px] mx-auto flex items-center justify-between mb-8">
          <span className="text-sm text-gray-400 transition-colors duration-300">
            {formatDate(thought.created_at)}
          </span>
          <span 
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ 
              color: getSentimentColor(thought.sentiment_label),
              backgroundColor: `${getSentimentColor(thought.sentiment_label)}20`
            }}
          >
            {getSentimentLabel(thought.sentiment_label)}
          </span>
        </div>

        {/* Title - Editable */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите заголовок..."
          className="reader-prose text-4xl lg:text-5xl font-black text-[#0008F9] dark:text-[#E95D2C] mb-8 w-full max-w-[720px] mx-auto block bg-transparent border-none outline-none focus:outline-none placeholder:text-gray-200 dark:placeholder:text-dark-text-muted transition-colors duration-300 leading-tight"
        />

        {/* Content Editor */}
        <div className="relative mb-12 max-w-[720px] mx-auto reader-prose">
          <textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="reader-prose w-full min-h-[500px] text-lg lg:text-xl text-gray-800 leading-[1.75] resize-none focus:outline-none bg-transparent transition-colors duration-300"
            placeholder="Введите текст..."
            style={{
              backgroundColor: highlightText && content.toLowerCase().includes(highlightText.toLowerCase()) 
                ? 'rgba(250, 204, 21, 0.2)' 
                : 'transparent'
            }}
          />
          {highlightText && content.toLowerCase().includes(highlightText.toLowerCase()) && (
            <div 
              ref={highlightRef}
              className="absolute top-2 right-2 bg-yellow-200 text-yellow-900 px-3 py-1 rounded-lg text-sm font-medium shadow-md"
            >
              Выделенный фрагмент из отчета
            </div>
          )}
        </div>

        {/* Images Container */}
        {images.length > 0 && (
          <div className="mb-12 max-w-[720px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-4">
              {images.map((imgUrl, index) => (
                <div
                  key={index}
                  className="relative group rounded-2xl overflow-hidden shadow-sm"
                >
                  <img
                    src={imgUrl}
                    alt={`Attachment ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-56 object-cover cursor-pointer rounded-lg hover:opacity-90 transition-opacity"
                    onClick={() => handleImageZoom(imgUrl)}
                    onError={(e) => {
                      // If image fails to load (e.g., invalid blob URL), remove it
                      console.error('[ThoughtView] Failed to load image:', imgUrl);
                      if (imgUrl.startsWith('blob:')) {
                        // Invalid blob URL - remove from images
                        setImages(prev => prev.filter(img => img !== imgUrl));
                      }
                      // Hide broken image
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          title="Максимальный размер файла: 6 МБ"
        />
      </div>

      {/* Zoomed Image Overlay */}
      {isZoomed && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setIsZoomed(false);
            setSelectedImage(null);
            if (onZoomChange) {
              onZoomChange(false);
            }
          }}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage || ''}
              alt="Zoomed"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                // If zoomed image fails to load, close zoom and remove from images
                console.error('[ThoughtView] Failed to load zoomed image:', selectedImage);
                if (selectedImage && selectedImage.startsWith('blob:')) {
                  setImages(prev => prev.filter(img => img !== selectedImage));
                }
                setIsZoomed(false);
                setSelectedImage(null);
                if (onZoomChange) {
                  onZoomChange(false);
                }
              }}
            />
            {/* Delete Button in top-right corner */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImageDelete(selectedImage);
                setIsZoomed(false);
                setSelectedImage(null);
                if (onZoomChange) {
                  onZoomChange(false);
                }
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              title="Удалить фотографию"
            >
              <Trash2 size={20} className="text-gray-800" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Paperclip Button - Fixed position */}
      <button
        onClick={handleImageClick}
        className="fixed bottom-28 right-8 lg:right-auto lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:translate-x-[calc(2.5rem/2+360px)] w-16 h-16 bg-[#E95D2C] rounded-2xl flex items-center justify-center shadow-xl hover:bg-[#c94d20] hover:shadow-2xl transition-all hover:scale-105 z-40"
        title="Добавить фотографию"
      >
        <Paperclip size={26} className="text-white" strokeWidth={2.5} />
      </button>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white dark:glass-modal rounded-3xl p-6 max-w-sm w-full shadow-2xl transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2 transition-colors duration-300">
              Удалить запись?
            </h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6 transition-colors duration-300">
              Это действие нельзя отменить. Запись будет удалена навсегда.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
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

