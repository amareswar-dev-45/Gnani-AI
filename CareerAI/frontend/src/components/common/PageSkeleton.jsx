import React from 'react';

export default function PageSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-72 bg-slate-100 rounded-md"></div>
        </div>
      </div>

      {/* Top 3-card grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-48 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border-4 border-slate-100 border-t-indigo-200 animate-spin"></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs col-span-1 md:col-span-2 space-y-4">
          <div className="h-4 w-32 bg-indigo-100 rounded-full"></div>
          <div className="h-6 w-3/4 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-full bg-slate-100 rounded-md"></div>
          <div className="h-9 w-36 bg-indigo-200 rounded-xl mt-4"></div>
        </div>
      </div>

      {/* 4 Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100"></div>
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 bg-slate-100 rounded"></div>
              <div className="h-5 w-10 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs md:col-span-2 space-y-4">
          <div className="h-4 w-40 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 border border-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="h-4 w-28 bg-slate-200 rounded"></div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

