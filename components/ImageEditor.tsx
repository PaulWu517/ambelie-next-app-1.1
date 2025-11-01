'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ImageEditorProps {
  imageBase64: string;
  mimeType: string;
  onSave?: (editedImageBase64: string) => void;
}

interface Transform {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  opacity: number;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageBase64, mimeType, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [transform, setTransform] = useState<Transform>({
    scale: 1.0,
    rotation: 0,
    translateX: 0,
    translateY: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    opacity: 100
  });

  // 加载原始图片
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      originalImageRef.current = img;
      setIsLoaded(true);
      redrawCanvas();
    };
    img.src = `data:${mimeType};base64,${imageBase64}`;
  }, [imageBase64, mimeType]);

  // 重绘画布
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    canvas.width = 400;
    canvas.height = 500;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 保存当前状态
    ctx.save();

    // 移动到画布中心
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // 应用变换
    ctx.translate(transform.translateX, transform.translateY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);

    // 应用滤镜效果
    const filters = [];
    if (transform.brightness !== 100) filters.push(`brightness(${transform.brightness}%)`);
    if (transform.contrast !== 100) filters.push(`contrast(${transform.contrast}%)`);
    if (transform.saturation !== 100) filters.push(`saturate(${transform.saturation}%)`);
    if (transform.blur > 0) filters.push(`blur(${transform.blur}px)`);
    if (transform.opacity !== 100) filters.push(`opacity(${transform.opacity}%)`);
    
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // 绘制图片（居中）
    const aspectRatio = img.width / img.height;
    let drawWidth = 300;
    let drawHeight = 300 / aspectRatio;
    
    if (drawHeight > 400) {
      drawHeight = 400;
      drawWidth = 400 * aspectRatio;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // 恢复状态
    ctx.restore();
  }, [transform]);

  // 当变换参数改变时重绘
  useEffect(() => {
    if (isLoaded) {
      redrawCanvas();
    }
  }, [transform, isLoaded, redrawCanvas]);

  // 更新变换参数
  const updateTransform = (key: keyof Transform, value: number) => {
    setTransform(prev => ({ ...prev, [key]: value }));
  };

  // 重置所有参数
  const resetTransform = () => {
    setTransform({
      scale: 1.0,
      rotation: 0,
      translateX: 0,
      translateY: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      opacity: 100
    });
  };

  // 保存编辑后的图片
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSave) return;

    const editedBase64 = canvas.toDataURL('image/png').split(',')[1];
    onSave(editedBase64);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-white rounded-lg shadow-lg">
      {/* 画布区域 */}
      <div className="flex-1">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">实时预览</h3>
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto border border-gray-300 rounded bg-white"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetTransform}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            重置
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            保存编辑
          </button>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="w-full lg:w-80">
        <h3 className="text-lg font-semibold mb-4">细调控制</h3>
        
        <div className="space-y-4">
          {/* 几何变换 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-700">几何变换</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  缩放: {transform.scale.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={transform.scale}
                  onChange={(e) => updateTransform('scale', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  旋转: {transform.rotation}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={transform.rotation}
                  onChange={(e) => updateTransform('rotation', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  水平位移: {transform.translateX}px
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={transform.translateX}
                  onChange={(e) => updateTransform('translateX', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  垂直位移: {transform.translateY}px
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={transform.translateY}
                  onChange={(e) => updateTransform('translateY', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 颜色调整 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-700">颜色调整</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  亮度: {transform.brightness}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={transform.brightness}
                  onChange={(e) => updateTransform('brightness', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  对比度: {transform.contrast}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={transform.contrast}
                  onChange={(e) => updateTransform('contrast', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  饱和度: {transform.saturation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="1"
                  value={transform.saturation}
                  onChange={(e) => updateTransform('saturation', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 效果调整 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-700">效果调整</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  模糊: {transform.blur}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={transform.blur}
                  onChange={(e) => updateTransform('blur', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  透明度: {transform.opacity}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={transform.opacity}
                  onChange={(e) => updateTransform('opacity', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;