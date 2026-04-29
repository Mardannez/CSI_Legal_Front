'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface AppImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  onClick?: () => void;
  fallbackSrc?: string;
  [key: string]: any;
}

function AppImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  onClick,
  fallbackSrc = '/assets/images/no_image.png',
  ...props
}: AppImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isExternal =
    imageSrc.startsWith('http://') || imageSrc.startsWith('https://');

  const isLocal =
    imageSrc.startsWith('/') ||
    imageSrc.startsWith('./') ||
    imageSrc.startsWith('data:');

  const handleError = () => {
    if (!hasError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    }
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const imageClassName = `${className} ${
    isLoading ? 'bg-gray-200' : ''
  } ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`;

  if (isExternal && !isLocal) {
    const imgStyle: React.CSSProperties = {};

    if (width) imgStyle.width = width;
    if (height) imgStyle.height = height;

    if (fill) {
      return (
        <div className="relative w-full h-full">
          <img
            src={imageSrc}
            alt={alt}
            className={`${imageClassName} absolute inset-0 w-full h-full`}
            onError={handleError}
            onLoad={handleLoad}
            onClick={onClick}
            style={imgStyle}
            {...props}
          />
        </div>
      );
    }

    return (
      <img
        src={imageSrc}
        alt={alt}
        className={imageClassName}
        onError={handleError}
        onLoad={handleLoad}
        onClick={onClick}
        style={imgStyle}
        {...props}
      />
    );
  }

  const imageProps = {
    src: imageSrc,
    alt,
    className: imageClassName,
    priority,
    quality,
    placeholder,
    blurDataURL,
    unoptimized: true,
    onError: handleError,
    onLoad: handleLoad,
    onClick,
    ...props,
  };

  if (fill) {
    return (
      <div className="relative w-full h-full">
        <Image
          {...imageProps}
          fill
          sizes={sizes || '100vw'}
        />
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      width={width || 400}
      height={height || 300}
    />
  );
}

export default AppImage;