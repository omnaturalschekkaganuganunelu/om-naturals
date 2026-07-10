import React from 'react';

export default function Loading() {
  return (
    <>
      {/* Static Skeleton Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-amber-50 h-16 flex items-center px-4 sm:px-8 justify-between animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100"></div>
          <div className="h-4 bg-amber-100 rounded w-24"></div>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-8 h-10 bg-amber-50 rounded-full"></div>
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-amber-50"></div>
          <div className="w-16 h-8 rounded-lg bg-amber-800/10"></div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-3 sm:px-8 lg:px-12 py-8 flex-1 w-full min-w-0 overflow-x-hidden">
        <div className="animate-pulse space-y-6">
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
      </main>

      {/* Static Skeleton Footer */}
      <footer className="w-full bg-[#1c0d02] h-48 mt-auto flex items-center justify-center animate-pulse">
        <div className="max-w-screen-2xl w-full px-4 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-4 bg-amber-950 rounded w-2/3"></div>
            <div className="h-3 bg-amber-950/40 rounded w-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-amber-950 rounded w-1/2"></div>
            <div className="h-3 bg-amber-950/40 rounded w-2/3"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-amber-950 rounded w-2/3"></div>
            <div className="h-3 bg-amber-950/40 rounded w-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-amber-950 rounded w-1/3"></div>
            <div className="h-3 bg-amber-950/40 rounded w-1/2"></div>
          </div>
        </div>
      </footer>
    </>
  );
}
