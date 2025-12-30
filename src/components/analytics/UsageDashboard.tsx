import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DailyUsage {
  date: string;
  sessions: number;
  messages: number;
  estimated_tokens: number;
  active_minutes: number;
  tools_used: number;
}

interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  total_minutes: number;
  total_tools: number;
  daily_breakdown: DailyUsage[];
}

interface MonthlySummary {
  month: string;
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  total_minutes: number;
}

interface UsageDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'week' | 'month';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatMinutes(mins: number): string {
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours}h ${remaining}m`;
  }
  return `${mins}m`;
}

export function UsageDashboard({ isOpen, onClose }: UsageDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weeklyData, setWeeklyData] = useState<WeeklySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [weekly, monthly] = await Promise.all([
        invoke<WeeklySummary>('get_weekly_summary'),
        invoke<MonthlySummary>('get_monthly_summary'),
      ]);
      setWeeklyData(weekly);
      setMonthlyData(monthly);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculate max value for chart scaling
  const maxMessages = useMemo(() => {
    if (!weeklyData?.daily_breakdown) return 1;
    return Math.max(...weeklyData.daily_breakdown.map((d) => d.messages), 1);
  }, [weeklyData]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '3px solid var(--accent)',
          boxShadow: '0 0 24px rgba(201, 162, 39, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(180deg, rgba(201, 162, 39, 0.15) 0%, transparent 100%)',
            borderBottom: '2px solid rgba(201, 162, 39, 0.4)',
          }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{
                color: 'var(--accent)',
                fontFamily: "'Cinzel', serif",
              }}
            >
              Usage Analytics
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Track your Claude Code usage
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="px-4 pt-3 flex gap-2" style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
          <button
            onClick={() => setViewMode('week')}
            className="px-4 py-2 rounded-t text-sm font-medium transition-all"
            style={{
              background: viewMode === 'week' ? 'var(--bg-primary)' : 'transparent',
              color: viewMode === 'week' ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: viewMode === 'week' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className="px-4 py-2 rounded-t text-sm font-medium transition-all"
            style={{
              background: viewMode === 'month' ? 'var(--bg-primary)' : 'transparent',
              color: viewMode === 'month' ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: viewMode === 'month' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            This Month
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-2xl mb-2 animate-pulse">...</div>
                <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
              </div>
            </div>
          ) : viewMode === 'week' && weeklyData ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  label="Sessions"
                  value={weeklyData.total_sessions}
                  icon="S"
                />
                <StatCard
                  label="Messages"
                  value={weeklyData.total_messages}
                  icon="M"
                />
                <StatCard
                  label="Tokens"
                  value={formatNumber(weeklyData.total_tokens)}
                  icon="T"
                />
                <StatCard
                  label="Time"
                  value={formatMinutes(weeklyData.total_minutes)}
                  icon="H"
                />
              </div>

              {/* Daily Chart */}
              <div>
                <h3
                  className="text-sm font-medium mb-3"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Daily Activity
                </h3>
                <div className="flex items-end gap-2 h-32">
                  {weeklyData.daily_breakdown.map((day, i) => {
                    const height = maxMessages > 0 ? (day.messages / maxMessages) * 100 : 0;
                    const isToday = i === weeklyData.daily_breakdown.length - 1;

                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t transition-all"
                          style={{
                            height: `${Math.max(height, 4)}%`,
                            background: isToday
                              ? 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)'
                              : 'linear-gradient(180deg, #4a3f32 0%, #3d3328 100%)',
                            border: isToday ? '1px solid var(--accent)' : '1px solid #524738',
                          }}
                          title={`${day.messages} messages`}
                        />
                        <span
                          className="text-[10px]"
                          style={{ color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}
                        >
                          {DAY_NAMES[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div>
                <h3
                  className="text-sm font-medium mb-3"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Daily Breakdown
                </h3>
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid var(--bg-tertiary)' }}
                >
                  {weeklyData.daily_breakdown.map((day, i) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                      style={{
                        background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{day.date}</span>
                      <div className="flex items-center gap-4">
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {day.sessions} session{day.sessions !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {day.messages} msg{day.messages !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: 'var(--accent)' }}>
                          {formatNumber(day.estimated_tokens)} tokens
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : monthlyData ? (
            <div className="space-y-6">
              {/* Monthly Summary */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  label="Sessions"
                  value={monthlyData.total_sessions}
                  icon="S"
                />
                <StatCard
                  label="Messages"
                  value={monthlyData.total_messages}
                  icon="M"
                />
                <StatCard
                  label="Tokens"
                  value={formatNumber(monthlyData.total_tokens)}
                  icon="T"
                />
                <StatCard
                  label="Time"
                  value={formatMinutes(monthlyData.total_minutes)}
                  icon="H"
                />
              </div>

              <div
                className="p-4 rounded text-center"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <p className="text-sm">Monthly view shows aggregate stats.</p>
                <p className="text-xs mt-1">Switch to weekly view for daily breakdown.</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <p>No usage data available yet.</p>
              <p className="text-xs mt-1">Start using Claude Code to track your activity.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--bg-tertiary)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Data stored locally in ~/.claude/arcade_analytics.json
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div
      className="p-3 rounded"
      style={{
        background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
        border: '1px solid var(--bg-tertiary)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--accent)',
          }}
        >
          {icon}
        </span>
        <span className="text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div
        className="text-lg font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
    </div>
  );
}
