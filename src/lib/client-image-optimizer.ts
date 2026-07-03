'use client';

export type ImageOptimizationResult = {
  file: File;
  originalFile: File;
  originalSize: number;
  optimizedSize: number;
  width: number | null;
  height: number | null;
  optimized: boolean;
  message: string;
};

const maxLongEdge = 2400;
const webpQuality = 0.86;
const minimumSavingsRatio = 0.08;

function createImageBitmapFromFile(file: File) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  return new Promise<ImageBitmap>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Canvas is not available.'));
        return;
      }

      context.drawImage(image, 0, 0);
      createImageBitmap(canvas).then(resolve, reject);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded.'));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getTargetDimensions(width: number, height: number) {
  const longEdge = Math.max(width, height);

  if (longEdge <= maxLongEdge) {
    return { width, height };
  }

  const ratio = maxLongEdge / longEdge;

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function getOptimizedFilename(filename: string) {
  const baseName = filename.replace(/\.[^.]+$/, '').trim() || 'optimized-image';

  return `${baseName}.webp`;
}

export async function optimizeImageBeforeUpload(file: File): Promise<ImageOptimizationResult> {
  if (typeof window === 'undefined') {
    return {
      file,
      originalFile: file,
      originalSize: file.size,
      optimizedSize: file.size,
      width: null,
      height: null,
      optimized: false,
      message: 'Browser image optimization is not available.',
    };
  }

  try {
    const bitmap = await createImageBitmapFromFile(file);
    const target = getTargetDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d', { alpha: file.type === 'image/png' });

    if (!context) {
      bitmap.close();
      throw new Error('Canvas is not available.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();

    const blob = await canvasToBlob(canvas, 'image/webp', webpQuality);
    if (!blob) {
      throw new Error('Image compression failed.');
    }

    const savingsRatio = (file.size - blob.size) / file.size;
    if (blob.size >= file.size || savingsRatio < minimumSavingsRatio) {
      return {
        file,
        originalFile: file,
        originalSize: file.size,
        optimizedSize: file.size,
        width: target.width,
        height: target.height,
        optimized: false,
        message: 'Original kept because compression did not save enough space.',
      };
    }

    const optimizedFile = new File([blob], getOptimizedFilename(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      originalFile: file,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      width: target.width,
      height: target.height,
      optimized: true,
      message: `Optimized from ${Math.round(file.size / 1024)} KB to ${Math.round(
        optimizedFile.size / 1024,
      )} KB.`,
    };
  } catch {
    return {
      file,
      originalFile: file,
      originalSize: file.size,
      optimizedSize: file.size,
      width: null,
      height: null,
      optimized: false,
      message: 'Original uploaded because optimization failed.',
    };
  }
}
