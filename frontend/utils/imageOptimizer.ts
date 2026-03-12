/**
 * Утилиты для оптимизации изображений
 */

/**
 * Ленивая загрузка изображений с fallback
 */
export function createLazyImage(src: string, alt: string = ''): HTMLImageElement {
  const img = document.createElement('img');
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  
  // Добавляем обработчик ошибок
  img.onerror = () => {
    // Можно добавить placeholder изображение
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" x="50%25" y="50%25" text-anchor="middle"%3EИзображение не загружено%3C/text%3E%3C/svg%3E';
  };
  
  img.src = src;
  return img;
}

/**
 * Проверяет, загружено ли изображение
 */
export function isImageLoaded(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Оптимизирует размер изображения для base64
 */
export async function optimizeImageForBase64(file: File, maxSize: number = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
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

        // Используем более низкое качество для уменьшения размера
        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(optimizedBase64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

