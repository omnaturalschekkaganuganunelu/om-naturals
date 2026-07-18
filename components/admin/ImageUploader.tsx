'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';

import { useToastStore } from '@/store/toastStore';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  language?: string;
}

export default function ImageUploader({ images, onChange, maxImages = 5, label, language = 'en' }: ImageUploaderProps) {
  const showToast = useToastStore((s) => s.showToast);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check max images
    if (images.length + files.length > maxImages) {
      showToast(language === 'te' ? `మీరు గరిష్టంగా ${maxImages} చిత్రాలను మాత్రమే అప్‌లోడ్ చేయగలరు.` : `You can only upload up to ${maxImages} images.`, 'error');
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        } else {
          console.error('Failed to upload', file.name);
        }
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="w-full">
      <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase tracking-wide">
        <ImageIcon size={10} className="inline mr-1" />
        {label || (language === 'te' ? 'చిత్రాలు' : 'Images')} ({images.length}/{maxImages})
      </label>
      
      {/* Upload Zone */}
      {images.length < maxImages && (
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
            dragActive ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            {uploading ? (
              <Loader2 size={24} className="text-amber-600 animate-spin mb-2" />
            ) : (
              <UploadCloud size={24} className="text-gray-400 mb-2" />
            )}
            <p className="text-xs font-bold text-gray-600">
              {uploading 
                ? (language === 'te' ? 'అప్‌లోడ్ అవుతోంది...' : 'Uploading...') 
                : (language === 'te' ? 'చిత్రాలను ఇక్కడ డ్రాగ్ చేయండి లేదా క్లిక్ చేయండి' : 'Click or Drag images here')
              }
            </p>
            {!uploading && (
              <p className="text-[10px] font-medium text-gray-400 mt-1">
                {language === 'te' ? 'ఫోన్ కెమెరాతో ఫోటో తీయండి లేదా గ్యాలరీని ఎంచుకోండి' : 'Snap a photo on mobile or select from gallery'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm w-20 h-20 bg-gray-50 flex-shrink-0">
              <Image src={img} alt="" width={80} height={80} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
