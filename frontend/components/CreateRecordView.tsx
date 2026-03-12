
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Paperclip, ArrowLeft, X } from 'lucide-react';
import { saveThought, uploadVoiceThought, uploadImage } from '../services/api';
import { ML_API_BASE_URL } from '../config/api';

interface CreateRecordViewProps {
  userId: number;
  folderId?: string | null;
  folderName?: string | null;
  onClose: () => void;
  onThoughtSaved?: () => void;
  /** Called right after save; main app shows popup and polls until final status. */
  onSaveAndClose?: (payload: { thoughtId: number; folderName?: string }) => void;
  setConfirmationReq?: (req: any) => void;
}

export const CreateRecordView: React.FC<CreateRecordViewProps> = ({ 
  userId, 
  folderId, 
  folderName,
  onClose,
  onThoughtSaved,
  onSaveAndClose
}) => {
  // State
  const [title, setTitle] = useState('Untitled');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [thoughtId, setThoughtId] = useState<number | undefined>(undefined);
  
  // UI States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); // For audio visualization

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  // Clean up recording listeners and audio context on unmount
  useEffect(() => {
    return () => {
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if ((timerIntervalRef as any).autoStopTimeout) {
        clearTimeout((timerIntervalRef as any).autoStopTimeout);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- Logic ---

  const handleSave = async () => {
    if (!content.trim() && images.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      let formattedContent = content;
      if (title && title.trim() && title !== 'Untitled') {
        if (!content.includes('__TITLE__:')) {
          formattedContent = `__TITLE__:${title}\n${content}`;
        } else {
          formattedContent = content.replace(/^__TITLE__:[^\n]*\n?/, `__TITLE__:${title}\n`);
        }
      }

      const response = await saveThought({
        user_id: userId,
        thought_id: thoughtId,
        content: formattedContent,
        image_id: images.length > 0 ? images[0] : undefined,
        type_thought: folderId || undefined
      });
      const savedThoughtId = response.thought_id || thoughtId;

      if (savedThoughtId) {
        const analyzeSentimentOnly = !!folderId;
        fetch(`${ML_API_BASE_URL}/api/analyze-thought`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            thought_id: savedThoughtId,
            analyze_sentiment_only: analyzeSentimentOnly
          })
        }).catch((e) => console.warn('ML analyze-thought request failed:', e));
      }

      if (savedThoughtId && onSaveAndClose) {
        onThoughtSaved?.();
        onSaveAndClose({ thoughtId: savedThoughtId, folderName: folderName ?? undefined });
        onClose();
      } else {
        onThoughtSaved?.();
        onClose();
      }
    } catch (error) {
      console.error("Failed to save", error);
      alert("Ошибка при сохранении.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (6 MB limit)
      const maxSize = 6 * 1024 * 1024; // 6 MB in bytes
      if (file.size > maxSize) {
        alert(`Размер файла превышает 6 МБ. Текущий размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ`);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      try {
        // Upload immediately or just preview? 
        // For simplicity/mock, we upload and get a URL.
        const res = await uploadImage(file);
        setImages(prev => [...prev, res.image_url]);
      } catch (err) {
        alert("Не удалось загрузить изображение");
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Voice Recording ---

  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Setup Web Audio API for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      source.connect(analyser);

      // Start audio visualization
      const visualize = () => {
        if (!analyserRef.current || !isRecordingRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
        setAudioLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(visualize);
      };
      
      isRecordingRef.current = true;
      visualize();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        processVoice(audioBlob);
      };

      // Start recording
      mediaRecorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      setAudioLevel(0);

      // Start timer (45 seconds max)
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 0.1;
        });
      }, 100);

      // Auto-stop after 45 seconds
      const autoStopTimeout = setTimeout(() => {
        if (isRecordingRef.current) {
          stopRecording();
        }
      }, 45000);
      
      // Store timeout for cleanup
      (timerIntervalRef as any).autoStopTimeout = autoStopTimeout;

    } catch (err) {
      console.error("Mic error:", err);
      alert("Нет доступа к микрофону");
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if ((timerIntervalRef as any).autoStopTimeout) {
      clearTimeout((timerIntervalRef as any).autoStopTimeout);
      (timerIntervalRef as any).autoStopTimeout = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    isRecordingRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setAudioLevel(0);
  };

  const cancelRecording = () => {
    // Stop recording without processing
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if ((timerIntervalRef as any).autoStopTimeout) {
      clearTimeout((timerIntervalRef as any).autoStopTimeout);
      (timerIntervalRef as any).autoStopTimeout = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    isRecordingRef.current = false;
    
    // Stop media recorder without triggering onstop
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // Clear the onstop handler to prevent processing
      mediaRecorderRef.current.onstop = null;
    }
    
    // Clear audio chunks
    audioChunksRef.current = [];
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    
    // Close the view
    onClose();
  };

  const processVoice = async (blob: Blob) => {
    setIsProcessingVoice(true);
    try {
      const res = await uploadVoiceThought(userId, blob);
      const text = (res.transcribed_text || '').trim();
      if (!text) {
        alert("Не удалось распознать речь. Попробуйте говорить ближе к микрофону и записывать чуть дольше.");
        return;
      }
      setContent(prev => (prev ? prev + ' ' + text : text));
      // Store the ID so subsequent edits update this thought
      setThoughtId(res.thought_id);
    } catch (error) {
      alert("Ошибка обработки голоса");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // --- Render ---

  // 1. Recording Overlay (Full screen with purple gradient background)
  if (isRecording) {
    const progress = (recordingTime / 45) * 100;
    const remainingSeconds = Math.ceil(45 - recordingTime);
    
    // Calculate cloud animation based on audio level
    // More responsive to voice - react to frequency changes
    const cloudScale = 1 + audioLevel * 0.4; // Scale from 1.0 to 1.4
    const cloudBlur = 50 + audioLevel * 40; // Blur from 50px to 90px
    const cloudOpacity = 0.7 + audioLevel * 0.25; // Opacity from 0.7 to 0.95
    
    // Add slight rotation based on audio level for more dynamic effect
    const cloudRotation = audioLevel * 10; // Rotate up to 10 degrees
    
    // Calculate stroke-dashoffset for circular progress (45 seconds = 100%)
    const circumference = 2 * Math.PI * 100; // radius = 100
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="fixed inset-0 z-[60] bg-gradient-to-b from-[#E95D2C]/40 via-[#E95D2C]/30 to-white flex flex-col items-center justify-center select-none transition-colors duration-300">
        {/* Central Container - positioned slightly above center */}
        <div className="relative flex flex-col items-center justify-center -mt-16">
          
          {/* Circular Progress Bar - around the cloud */}
          <div className="absolute">
            <svg className="w-[240px] h-[240px] transform -rotate-90" viewBox="0 0 240 240">
              {/* Background circle - light purple */}
              <circle
                cx="120"
                cy="120"
                r="100"
                fill="none"
                stroke="#E9D5FF"
                strokeWidth="3"
                className="dark:stroke-[#E95D2C]"
              />
              {/* Progress circle - purple */}
              <circle
                cx="120"
                cy="120"
                r="100"
                fill="none"
                stroke="#9333EA"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-100 ease-linear"
              />
            </svg>
          </div>
          
          {/* Animated Color Cloud */}
          <div className="relative w-[200px] h-[200px] flex items-center justify-center" style={{ 
            transform: `scale(${cloudScale}) rotate(${cloudRotation}deg)`,
            transition: 'transform 0.05s ease-out'
          }}>
            {/* Outer glowing ring with gradient - reacts to voice */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, 
                  rgba(59, 130, 246, ${cloudOpacity}) 0%, 
                  rgba(147, 51, 234, ${cloudOpacity * 0.8}) 40%,
                  rgba(59, 130, 246, ${cloudOpacity * 0.6}) 70%,
                  rgba(147, 51, 234, ${cloudOpacity * 0.4}) 100%)`,
                filter: `blur(${cloudBlur}px)`,
                transform: 'scale(1.5)',
                transition: 'all 0.05s ease-out'
              }}
            />
            
            {/* Inner white circle */}
            <div className="w-[200px] h-[200px] rounded-full bg-white relative z-10 flex items-center justify-center shadow-lg transition-colors duration-300">
              <div className="w-[180px] h-[180px] rounded-full bg-gradient-to-b from-[#E95D2C]/50 to-white" />
            </div>
          </div>
          
          {/* Text Container - positioned inside/under the cloud */}
          <div className="absolute top-[220px] flex flex-col items-center">
            {/* "Говорите..." Text */}
            <h2 className="text-2xl font-semibold text-[#E95D2C] mb-1 transition-colors duration-300">Говорите...</h2>
            
            {/* Time remaining indicator */}
            <div className="text-sm text-gray-500 dark:text-dark-text-muted">
              {remainingSeconds > 0 ? `Осталось: ${remainingSeconds}с` : 'Время истекло'}
            </div>
          </div>
        </div>
        
        {/* Action Buttons - bottom right */}
        <div className="absolute bottom-6 right-6 flex gap-3">
          <button
            onClick={cancelRecording}
            className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors shadow-sm"
          >
            Прервать
          </button>
          <button
            onClick={stopRecording}
            className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors shadow-sm"
          >
            Остановить
          </button>
        </div>
      </div>
    );
  }

  // 2. Processing Voice State
  if (isProcessingVoice) {
     return (
        <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
           <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#E95D2C] mb-4"></div>
           <p className="text-gray-600 dark:text-dark-text-secondary font-medium">Обработка голоса...</p>
        </div>
     );
  }

  // 3. Editor View
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col transition-colors duration-300">
      {/* Top Header / Nav */}
      <div className="w-full max-w-[900px] mx-auto px-8 sm:px-12 lg:px-24 xl:px-32 pt-12 pb-5 flex justify-between items-center border-b border-gray-100">
         {/* Could have a back button here if needed, but the main interaction is bottom controls */}
         <div onClick={onClose} className="p-2.5 -ml-2 text-gray-400 dark:text-dark-text-muted cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-all hover:scale-105">
            <ArrowLeft size={22} /> 
         </div>
         <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#E95D2C] text-white rounded-lg text-sm font-semibold hover:bg-[#c94d20] transition-all hover:shadow-lg disabled:opacity-50"
         >
           {isSaving ? '...' : 'Готово'}
         </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[900px] mx-auto px-8 sm:px-12 lg:px-24 xl:px-32 overflow-y-auto no-scrollbar pt-12 pb-32">
        
        {/* Title Input */}
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full max-w-[720px] mx-auto block text-4xl lg:text-5xl font-black text-[#E95D2C] placeholder-gray-200 dark:placeholder-[#E95D2C]/60 outline-none bg-transparent mb-8 transition-colors duration-300 leading-tight"
          placeholder="Заголовок"
        />

        {/* Content Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Внести запись..."
          className="w-full max-w-[720px] mx-auto block text-lg lg:text-xl text-gray-800 placeholder-gray-300 dark:placeholder-dark-text-muted outline-none bg-transparent resize-none leading-[1.75] min-h-[500px] transition-colors duration-300"
        />

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="max-w-[720px] mx-auto grid grid-cols-2 md:grid-cols-3 gap-6 mt-12 pb-24">
            {images.map((img, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden shadow-sm">
                <img src={img} alt="attachment" className="w-full h-56 object-cover hover:opacity-90 transition-opacity" />
                {/* Minimal Delete Button */}
                <button
                  onClick={() => {
                    setImages(prev => prev.filter((_, i) => i !== idx));
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-28 right-8 lg:right-auto lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:translate-x-[calc(2.5rem/2+360px)] z-20 flex justify-end">
        <div className="flex items-center gap-0 bg-gradient-to-r from-[#E95D2C] to-[#c94d20] rounded-full p-1 shadow-xl hover:shadow-2xl transition-shadow pl-4 pr-1 h-16">
            
            {/* Paperclip */}
            <button 
              onClick={handleImageClick}
              className="mr-4 text-white/90 hover:text-white transition-colors"
            >
              <Paperclip size={24} />
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              title="Максимальный размер файла: 6 МБ"
            />

            {/* Separator */}
            <div className="w-[1px] h-8 bg-white/20 mr-1"></div>

            {/* Mic (Click to Record) */}
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white active:bg-white/10 transition-all hover:scale-105 select-none touch-none disabled:opacity-50"
            >
              <Mic size={26} />
            </button>
        </div>
      </div>

      {/* Fake Bottom Nav Bar (Visual only, to match screenshot context) */}
      {/* ... (Kept empty as per previous implementation logic) ... */}
      
    </div>
  );
};
