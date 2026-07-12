import React from 'react';

export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 w-full">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-6 sm:mb-8"></div>
      
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-12 lg:gap-16">
        {/* Image Skeleton */}
        <div className="w-full lg:w-1/2 flex flex-col space-y-4">
          <div className="w-full aspect-square bg-gray-200 rounded-2xl"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-16 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
        
        {/* Details Skeleton */}
        <div className="w-full lg:w-1/2 space-y-6 mt-4 lg:mt-0">
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded w-full"></div>
            <div className="h-12 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="h-20 bg-gray-200 rounded w-full mt-8"></div>
          <div className="h-32 bg-gray-200 rounded w-full mt-4"></div>
        </div>
      </div>
    </div>
  );
}
