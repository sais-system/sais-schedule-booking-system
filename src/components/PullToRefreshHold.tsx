import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';

interface PullToRefreshHoldProps {
  onRefresh: () => Promise<void> | void;
  scrollRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

export const PullToRefreshHold: React.FC<PullToRefreshHoldProps> = ({
  onRefresh,
  scrollRef,
  children,
}) => {
  const [pullProgress, setPullProgress] = useState(0); // 0 to 100
  const [isPulling, setIsPulling] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const holdTimerRef = useRef<any>(null);
  const holdStartTimeRef = useRef(0);
  const progressAnimRef = useRef<any>(null);

  const HOLD_DURATION_MS = 2000;
  const PULL_THRESHOLD = 50; // Pixels needed to pull down to engage hold

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const target = scrollRef.current;
    if (target && target.scrollTop > 5) return;

    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const target = scrollRef.current;
    if (target && target.scrollTop > 5) {
      if (isHolding) cancelHold();
      return;
    }

    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;

    if (diff > 15) {
      setIsPulling(true);
    }

    if (diff >= PULL_THRESHOLD && !isHolding) {
      // Start 2-second hold
      startHold();
    } else if (diff < PULL_THRESHOLD && isHolding) {
      cancelHold();
    }
  };

  const startHold = () => {
    setIsHolding(true);
    holdStartTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setPullProgress(progress);

      if (progress < 100) {
        progressAnimRef.current = requestAnimationFrame(updateProgress);
      } else {
        triggerRefresh();
      }
    };

    progressAnimRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = () => {
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setIsHolding(false);
    setIsPulling(false);
    setPullProgress(0);
  };

  const handleTouchEnd = () => {
    if (isRefreshing) return;
    if (!isSuccess) {
      cancelHold();
    }
  };

  const triggerRefresh = async () => {
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    setIsHolding(false);
    setIsRefreshing(true);
    setIsSuccess(false);

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate?.([40, 30, 40]);
      }
    } catch (_) {}

    try {
      await onRefresh();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsRefreshing(false);
        setIsPulling(false);
        setPullProgress(0);
      }, 1500);
    } catch (err) {
      setIsRefreshing(false);
      setIsPulling(false);
      setPullProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full flex flex-col min-h-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Floating Pull-to-Refresh Hold HUD */}
      {(isPulling || isHolding || isRefreshing || isSuccess) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-pop">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3">
            {isSuccess ? (
              <>
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Icons.Check size={18} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-emerald-400">
                    รีเฟรช Firebase เรียบร้อยแล้ว 100%
                  </div>
                  <div className="text-[10px] text-slate-300">
                    ข้อมูลตารางและสถานะอัปเดตเป็นปัจจุบัน
                  </div>
                </div>
              </>
            ) : isRefreshing ? (
              <>
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-spin">
                  <Icons.RefreshCw size={16} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-blue-400">
                    กำลังดึงข้อมูลจาก Firebase...
                  </div>
                  <div className="text-[10px] text-slate-300">กรุณารอสักครู่</div>
                </div>
              </>
            ) : (
              <>
                {/* Progress Ring */}
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-700"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-amber-400 transition-all duration-75"
                      strokeDasharray={`${pullProgress}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-bold text-amber-300">
                    {Math.round(pullProgress / 50)}s
                  </span>
                </div>

                <div className="text-left">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Icons.Flame size={12} className="text-amber-400" />
                    ลากลงค้างไว้ 2 วินาทีเพื่อรีเฟรช Firebase
                  </div>
                  <div className="text-[10px] text-slate-300">
                    ความคืบหน้า: {Math.round(pullProgress)}% (อย่าเพิ่งปล่อยนิ้ว)
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
