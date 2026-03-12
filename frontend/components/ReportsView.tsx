import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ChevronLeft, Download, HelpCircle, Share2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import { deleteReport, refreshAccessToken, isTokenExpiredOrExpiring } from '../services/api';
import { API_BASE_URL } from '../config/api';

const GLASS_STYLES = {
  backdropFilter: 'blur(24px) saturate(150%)',
  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow:
    '0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 8px 24px -4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
} as const;

const SPRING = { type: 'spring' as const, stiffness: 160, damping: 18, mass: 0.8 };
const SHIMMER = { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const };

const REPORT_METHODOLOGIES = [
  { id: 'soap', label: 'SOAP' },
  { id: 'dap', label: 'DAP' },
  { id: 'basic_id', label: 'BASIC ID' },
  { id: 'pie', label: 'PIE' },
] as const;

interface ReportsViewProps {
  userId: number;
  onBack?: () => void;
}

type ReportPanelRecord = {
  report_id: number;
  user_id: number;
  date_range_start: string; // YYYY-MM-DD
  date_range_end?: string | null;
  generated_at?: string | null;
  created_at?: string | null;
  full_text: string; // markdown / rich text stored in DB — render verbatim
  methodology: string; // verbatim
  attachments: any[];
  reviewed?: boolean;
  status?: 'pending' | 'completed' | 'failed';
};

const SAFE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ['target'], ['rel']],
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    span: [...(defaultSchema.attributes?.span || []), ['className']],
    p: [...(defaultSchema.attributes?.p || []), ['className']],
  },
};

function toISODateOnly(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMaybeDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function formatHeaderDate(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function weekdayUpper(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

function clampExcerpt(text: string, maxChars = 180) {
  const clean = (text || '').replace(/\r\n/g, '\n').trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars).replace(/\s+\S*$/, '').trimEnd() + '…';
}

function normalizeReportRecord(r: any, fallbackUserId: number): ReportPanelRecord | null {
  const dateStart =
    r.date_range_start ||
    (r.date_from ? new Date(r.date_from).toISOString().slice(0, 10) : null) ||
    (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null) ||
    null;
  if (!dateStart) return null;

  const dateEnd =
    r.date_range_end || (r.date_to ? new Date(r.date_to).toISOString().slice(0, 10) : null) || null;

  const fullText =
    typeof r.full_text === 'string' ? r.full_text : typeof r.report === 'string' ? r.report : '';

  const methodology =
    typeof r.methodology === 'string'
      ? r.methodology
      : typeof r.methodology_type === 'string'
        ? r.methodology_type
        : '';

  return {
    report_id: r.report_id,
    user_id: r.user_id ?? fallbackUserId,
    date_range_start: dateStart,
    date_range_end: dateEnd,
    generated_at: r.generated_at || r.created_at || r.log_datetime || null,
    created_at: r.created_at || r.log_datetime || null,
    full_text: fullText,
    methodology,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    reviewed: typeof r.reviewed === 'boolean' ? r.reviewed : false,
    status: r.status,
  };
}

export const ReportsView: React.FC<ReportsViewProps> = ({ userId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportPanelRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [openReportId, setOpenReportId] = useState<number | null>(null);
  const [openReport, setOpenReport] = useState<ReportPanelRecord | null>(null);
  const [openMethodology, setOpenMethodology] = useState<string | null>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [showMethodologiesMenu, setShowMethodologiesMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMethodology, setSelectedMethodology] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  // parallax sheen motion values
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pX = useSpring(pointerX, { stiffness: 120, damping: 18 });
  const pY = useSpring(pointerY, { stiffness: 120, damping: 18 });
  const sheenX = useTransform(pX, [-0.5, 0.5], ['-20%', '120%']);
  const sheenY = useTransform(pY, [-0.5, 0.5], ['-10%', '110%']);

  const fetchReports = async (opts?: { month?: string; date?: string; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      let token = localStorage.getItem('authToken');
      if (token && isTokenExpiredOrExpiring(token)) {
        await refreshAccessToken();
        token = localStorage.getItem('authToken');
      }

      const params = new URLSearchParams();
      params.set('user_id', String(userId));
      if (opts?.month) params.set('month', opts.month);
      if (opts?.date) params.set('date', opts.date);
      if (opts?.from) params.set('from', opts.from);
      if (opts?.to) params.set('to', opts.to);
      params.set('limit', '200');

      const response = await fetch(`${API_BASE_URL}/api/reports?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Failed to fetch reports (${response.status})`);
      }

      const data = await response.json().catch(() => null);
      const rawList = Array.isArray(data) ? data : [];
      const normalizedAll = rawList
        .map((r: any) => normalizeReportRecord(r, userId))
        .filter(Boolean) as ReportPanelRecord[];
      // Показываем только реальные отчёты с содержимым (без заглушек/пустых)
      const normalized = normalizedAll.filter((r) => (r.status ? r.status === 'completed' : true) && (r.full_text || '').trim().length > 0);
      setReports(normalized);
    } catch (e: any) {
      setReports([]);
      setError(e?.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports({ month: monthKey(activeMonth) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeMonth.getFullYear(), activeMonth.getMonth()]);

  // Показываем каждый отчёт отдельной карточкой (без группировки по дате)
  const visibleReports = useMemo(() => {
    const mk = monthKey(activeMonth);
    return reports
      .filter((r) => (r.date_range_start || '').slice(0, 7) === mk)
      .slice()
      .sort((a, b) => {
        const da = parseMaybeDate(a.generated_at)?.getTime() ?? 0;
        const db = parseMaybeDate(b.generated_at)?.getTime() ?? 0;
        if (da !== db) return db - da;
        return b.report_id - a.report_id;
      });
  }, [reports, activeMonth]);

  const handleGenerateReport = async () => {
    if (!selectedMethodology) {
      setError('Выберите методику');
      return;
    }
    if (!startDate || !endDate) {
      setError('Выберите диапазон дат');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Дата начала должна быть раньше даты окончания');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let token = localStorage.getItem('authToken');
      if (token && isTokenExpiredOrExpiring(token)) {
        await refreshAccessToken();
        token = localStorage.getItem('authToken');
      }

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_from: startDate,
          date_to: endDate,
          methodology_type: selectedMethodology,
        }),
      });

      if (response.status === 429) {
        let message = 'Слишком много запросов отчёта';
        try {
          const data = await response.json();
          if (data.error) message = data.error;
        } catch {}
        setError(message);
        setGenerating(false);
        return;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Ошибка создания отчета: ${response.status}`);
      }

      setShowDatePicker(false);
      setStartDate('');
      setEndDate('');
      setSelectedMethodology(null);
      setShowSuccessPopup(true);
      setGenerating(false);

      await fetchReports({ month: monthKey(activeMonth) });
      setTimeout(() => setShowSuccessPopup(false), 3500);
    } catch (e: any) {
      setError(e?.message || 'Ошибка при создании запроса на отчет');
      setGenerating(false);
    }
  };

  const openFullReport = async (reportId: number, fallbackDate?: string) => {
    setOpenReportId(reportId);
    setOpenReport(null);
    try {
      let token = localStorage.getItem('authToken');
      if (token && isTokenExpiredOrExpiring(token)) {
        await refreshAccessToken();
        token = localStorage.getItem('authToken');
      }
      const resp = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`Failed to fetch report (${resp.status})`);
      const r = await resp.json();
      const normalized = normalizeReportRecord(r, userId);
      if (normalized) {
        setOpenReport(normalized);
      } else {
        setOpenReport({
          report_id: reportId,
          user_id: userId,
          date_range_start: fallbackDate || toISODateOnly(new Date()),
          date_range_end: null,
          generated_at: null,
          created_at: null,
          full_text: '',
          methodology: '',
          attachments: [],
          reviewed: false,
        });
      }
    } catch {
      setOpenReport({
        report_id: reportId,
        user_id: userId,
        date_range_start: fallbackDate || toISODateOnly(new Date()),
        date_range_end: null,
        generated_at: null,
        created_at: null,
        full_text: '',
        methodology: '',
        attachments: [],
        reviewed: false,
      });
    }
  };

  const buildSharePayload = (report: ReportPanelRecord) => {
    const meta = [
      `report_id: ${report.report_id}`,
      `date_range_start: ${report.date_range_start}`,
      report.date_range_end ? `date_range_end: ${report.date_range_end}` : null,
      report.generated_at ? `generated_at: ${report.generated_at}` : null,
      report.methodology ? `methodology: ${report.methodology}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    return `${meta}\n\n${report.full_text || ''}`;
  };

  const makeReportFilename = (report: ReportPanelRecord) => {
    const safeDate = String(report.date_range_start || '').replace(/:/g, '-');
    return `aura-report-${safeDate || report.report_id}.txt`;
  };

  const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleAction = async (report: ReportPanelRecord, action: 'share' | 'download') => {
    const payload = buildSharePayload(report);
    const filename = makeReportFilename(report);

    if (action === 'download') {
      downloadText(filename, payload);
      return;
    }

    // Share: prefer real file share if supported; otherwise fall back to text share/copy.
    try {
      if ('share' in navigator && typeof navigator.share === 'function') {
        const file = new File([payload], filename, { type: 'text/plain;charset=utf-8' });
        const nav = navigator as unknown as { canShare?: (d: any) => boolean; share: (d: any) => Promise<void> };
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({
            files: [file],
            title: `Отчёт ${report.date_range_start}`,
            text: 'Отчёт Aura (файл)',
          });
          return;
        }
        await nav.share({ text: payload, title: `Отчёт ${report.date_range_start}` });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(payload);
      return;
    } catch {}

    // Last resort: download
    downloadText(filename, payload);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  };

  const onPointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      className="min-h-screen pb-28 pt-10 px-4 sm:px-8 max-w-[900px] mx-auto bg-white text-gray-900 transition-colors duration-300 reader-surface"
    >
      <style>{`
        :root{
          --glass-blur: 22px;
          --glass-tint: rgba(255,255,255,0.10);
          --glass-rim: rgba(255,255,255,0.22);
          --glass-shadow: 0 20px 50px -12px rgba(0,0,0,0.55), 0 8px 24px -4px rgba(0,0,0,0.28);
          --glass-accent: #E95D2C;
          --anim-fast: 180ms;
          --anim-med: 260ms;
        }
        @media (prefers-reduced-motion: reduce){
          .rg-motion { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft />
            </button>
          )}
          <div className="text-3xl font-black text-black">Отчеты</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C] focus-visible:ring-offset-1 hover:opacity-90 transition-opacity"
            style={GLASS_STYLES}
            aria-label="Справка по отчётам"
            onClick={() => setShowHelp(true)}
          >
            <HelpCircle size={16} strokeWidth={2.5} className="text-[#E95D2C]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMethodologiesMenu(true);
              setError(null);
              setSuccessMessage(null);
            }}
            className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C] focus-visible:ring-offset-2 hover:opacity-90 transition-opacity"
            style={GLASS_STYLES}
            aria-label="Получить отчёт"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0a0a0a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

        </div>
      </div>

      <div ref={listRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className="relative">
        {/* background weekday stripes */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-[28px]">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/15 via-pink-500/10 to-orange-500/10" />
          <div className="absolute inset-0 opacity-70 mix-blend-overlay">
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.12),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.10),transparent_60%)]" />
          </div>
        </div>

        <div
          className="reports-glass-container rounded-[28px] p-3"
          style={{
            backdropFilter: `blur(var(--glass-blur)) saturate(150%)`,
            WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(150%)`,
            background: 'var(--glass-tint)',
            border: `1px solid var(--glass-rim)`,
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Success Message */}
          {successMessage && (
            <div className="mb-3 p-3 bg-green-100 rounded-lg">
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          )}
          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 bg-red-100 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center text-sm text-gray-600 dark:text-gray-300"
              >
                Loading…
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 text-center text-sm text-red-600"
              >
                {error}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {visibleReports.map((report, idx) => {
                  const dateOnly = report.date_range_start;
                  const excerpt = clampExcerpt(report.full_text);
                  const methodology = report.methodology || '';

                  return (
                    <motion.div
                      key={report.report_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: Math.min(0.2, idx * 0.01) }}
                      className="relative overflow-hidden rounded-2xl border border-white/15"
                      style={{
                        ...GLASS_STYLES,
                        backdropFilter: `blur(var(--glass-blur)) saturate(150%)`,
                        WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(150%)`,
                        background: 'rgba(255,255,255,0.10)',
                      }}
                    >
                      {/* shimmer sheen */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(120deg, rgba(255,255,255,0.00), rgba(255,255,255,0.10), rgba(255,255,255,0.00))',
                          opacity: 0.35,
                          transform: 'translate3d(-30%, -30%, 0) rotate(8deg)',
                          left: sheenX as any,
                          top: sheenY as any,
                          width: '70%',
                          height: '180%',
                          filter: 'blur(2px)',
                        }}
                        animate={{ opacity: [0.08, 0.35, 0.1] }}
                        transition={{ ...SHIMMER, repeat: Infinity, repeatDelay: 2.0 }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          openFullReport(report.report_id, dateOnly);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const choice = window.prompt('Actions: share | download | delete', 'share');
                          if (choice === 'share') handleAction(report, 'share');
                          if (choice === 'download') handleAction(report, 'download');
                          if (choice === 'delete') {
                            deleteReport(report.report_id).then(() => fetchReports({ month: monthKey(activeMonth) }));
                          }
                        }}
                        className="w-full text-left px-4 py-4"
                        aria-label={`Report card for ${dateOnly}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div
                              className="text-[12px] tracking-[0.22em] font-black text-gray-900"
                            >
                              {weekdayUpper(dateOnly)}
                            </div>
                            <div className="text-gray-700 text-sm mt-1">
                              {formatHeaderDate(dateOnly)}
                            </div>
                          </div>

                          <div className="text-[11px] text-gray-500">#{report.report_id}</div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">excerpt of stored report</div>
                        <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-gray-900 reader-prose">
                          {excerpt}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // В модалке показываем только строку методики (без описаний/генерации)
                              if (methodology) setOpenMethodology(methodology);
                            }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-full border border-[#E95D2C]/40 text-[#E95D2C] bg-[#E95D2C]/10 hover:bg-[#E95D2C]/15 transition-colors"
                            aria-label="Open methodology modal"
                          >
                            {methodology || 'Methodology'}
                          </button>

                          {report?.date_range_end ? (
                            <div className="text-xs text-gray-500">
                              {report.date_range_start} → {report.date_range_end}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">{dateOnly}</div>
                          )}
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full report panel (bottom sheet) */}
      <AnimatePresence>
        {openReportId !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/35"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => {
                setOpenReportId(null);
                setOpenReport(null);
              }}
              aria-hidden
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 right-0 bottom-0 z-[160] mx-auto max-w-[900px] px-4 pb-[calc(96px+16px)]"
              role="dialog"
              aria-modal
              aria-label="Full report panel"
            >
              <div
                className="rounded-[26px] overflow-hidden"
                style={{
                  backdropFilter: 'blur(28px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(160%)',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 30px 90px -30px rgba(0,0,0,0.75)',
                }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div>
                    <div
                      className="text-[12px] tracking-[0.22em] font-black text-gray-900"
                    >
                      {openReport?.date_range_start ? weekdayUpper(openReport.date_range_start) : 'REPORT'}
                    </div>
                    <div className="text-gray-700 text-sm mt-1">
                      {openReport?.date_range_start ? formatHeaderDate(openReport.date_range_start) : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                      onClick={() => openReport && handleAction(openReport, 'share')}
                      aria-label="Share"
                      title="Share"
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      type="button"
                      className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                      onClick={() => openReport && handleAction(openReport, 'download')}
                      aria-label="Download report"
                      title="Download report"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      type="button"
                      className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                      onClick={() => {
                        setOpenReportId(null);
                        setOpenReport(null);
                      }}
                      aria-label="Close"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openReport?.methodology && setOpenMethodology(openReport.methodology)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-full border border-[#E95D2C]/40 text-[#E95D2C] bg-[#E95D2C]/10 hover:bg-[#E95D2C]/15 transition-colors"
                  >
                    {/* показываем методику именно загруженного отчёта */}
                    {openReport?.methodology || 'Methodology'}
                  </button>
                  <div className="text-xs text-gray-500">
                    {openReport?.date_range_end ? `${openReport.date_range_start} → ${openReport.date_range_end}` : openReport?.date_range_start}
                  </div>
                </div>

                <div className="px-4 pb-5 max-h-[70vh] overflow-y-auto">
                  {!openReport ? (
                    <div className="py-16 text-center text-sm text-gray-700">
                      Loading report…
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none reader-prose">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, [rehypeSanitize, SAFE_SCHEMA]]}
                        components={{
                          a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
                        }}
                      >
                        {openReport.full_text || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Methodology modal (string only + actions) */}
      <AnimatePresence>
        {openMethodology && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] bg-black/35"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setOpenMethodology(null)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[131] flex items-center justify-center px-4"
              role="dialog"
              aria-modal
              aria-label="Methodology"
            >
              <div
                className="w-full max-w-[520px] rounded-[24px] overflow-hidden"
                style={{
                  ...GLASS_STYLES,
                  backdropFilter: 'blur(26px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(26px) saturate(160%)',
                  background: 'rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="text-sm font-semibold text-[#E95D2C]">Methodology</div>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    onClick={() => setOpenMethodology(null)}
                    aria-label="Close methodology modal"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="px-4 py-4">
                  <div className="text-gray-900 font-semibold">
                    {openMethodology}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full border border-white/15 hover:bg-white/10 transition-colors text-sm"
                      onClick={() => {
                        setReports((prev) => prev.filter((r) => r.methodology === openMethodology));
                        setOpenMethodology(null);
                      }}
                    >
                      Filter
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full bg-[#E95D2C] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                      onClick={() => setOpenMethodology(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Методики отчёта — панель выбора */}
      <AnimatePresence>
        {showMethodologiesMenu && (
          <motion.div
            key="methodologies-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100]"
            aria-hidden
          >
            <div
              className="absolute inset-0 bg-black/25"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setShowMethodologiesMenu(false)}
            />
            <div className="absolute right-4 top-20 w-[280px] max-w-[calc(100vw-24px)]" style={{ pointerEvents: 'auto' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: '100%',
                  minHeight: 280,
                  borderRadius: '24px',
                  overflow: 'hidden',
                  ...GLASS_STYLES,
                }}
                role="dialog"
                aria-modal
                aria-label="Методики отчёта"
              >
                <button
                  type="button"
                  onClick={() => setShowMethodologiesMenu(false)}
                  className="z-10 w-9 h-9 rounded-full flex items-center justify-center text-gray-800 hover:bg-white/10 transition-colors absolute top-2 right-2"
                  aria-label="Закрыть"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
                <nav className="px-4 pb-5 pt-12 pr-12 overflow-y-auto">
                  <ul className="space-y-0">
                    {REPORT_METHODOLOGIES.map((item, index) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...SPRING, delay: 0.1 + index * 0.05 }}
                        className="border-b border-white/10 last:border-0"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMethodology(item.label);
                            setShowMethodologiesMenu(false);
                            setShowDatePicker(true);
                            setError(null);
                            setSuccessMessage(null);
                          }}
                          className="w-full flex items-center gap-2 py-3 px-2 rounded-lg text-left transition-colors text-gray-800 hover:bg-black/5 font-medium"
                        >
                          {item.label}
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                </nav>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Picker Modal — Liquid Glass */}
      <AnimatePresence>
        {showDatePicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] bg-black/35"
              style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              onClick={() => {
                setShowDatePicker(false);
                setError(null);
                setSuccessMessage(null);
              }}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[131] flex items-center justify-center p-4"
              role="dialog"
              aria-modal
              aria-label="Выберите диапазон дат"
            >
              <div
                className="max-w-md w-full rounded-[24px] overflow-hidden"
                style={GLASS_STYLES}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Выберите диапазон дат</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDatePicker(false);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-200"
                    aria-label="Закрыть"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  {selectedMethodology && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Методика: {selectedMethodology}</p>}

                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30">
                      <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Дата начала</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E95D2C]/60 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Дата окончания</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white/20 dark:bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E95D2C]/60 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={generating || !startDate || !endDate}
                    onClick={!generating && startDate && endDate ? handleGenerateReport : undefined}
                    className={`w-full h-14 rounded-xl flex items-center justify-center font-semibold transition-all ${
                      generating || !startDate || !endDate
                        ? 'opacity-50 cursor-not-allowed bg-gray-400/30 text-gray-600'
                        : 'bg-[#E95D2C] text-white hover:opacity-95 active:scale-[0.98]'
                    }`}
                  >
                    {generating ? 'Отправка...' : 'Далее'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Всплывающее окно: "Уже готовим ваш отчёт" */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowSuccessPopup(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xl font-bold text-black mb-2">Уже готовим ваш отчёт</p>
            <p className="text-sm text-gray-500">Он появится в течение 24 часов</p>
          </div>
        </div>
      )}

      {/* Help modal */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-black/35"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setShowHelp(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[141] flex items-center justify-center px-4"
              role="dialog"
              aria-modal
              aria-label="Справка по отчётам"
            >
              <div
                className="w-full max-w-[520px] rounded-[24px] overflow-hidden"
                style={{
                  ...GLASS_STYLES,
                  backdropFilter: 'blur(26px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(26px) saturate(160%)',
                  background: 'rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="text-sm font-semibold text-[#E95D2C]">Справка</div>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    onClick={() => setShowHelp(false)}
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="px-4 py-4 text-sm text-gray-800">
                  Здесь отображаются ваши сгенерированные отчёты. Нажмите на отчёт, чтобы открыть полный текст. Кнопка «+» позволяет запросить новый отчёт.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

