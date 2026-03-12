import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, Share2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WeeklyReportMetadata, WeeklyReportData } from '../types';
import { fetchWeeklyReportDetails } from '../services/api';

interface ReportDetailsProps {
  report: WeeklyReportMetadata;
  onBack: () => void;
}

export const ReportDetails: React.FC<ReportDetailsProps> = ({ report, onBack }) => {
  const [data, setData] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const reportData = await fetchWeeklyReportDetails(report.report_id);
        setData(reportData);
      } catch (error) {
        console.error("Failed to load report details", error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [report.report_id]);

  const handleCopyToClipboard = async () => {
    if (!data?.content) return;
    
    try {
      // Формируем текст для копирования
      const textToCopy = `${data.title || report.title}\n\n${data.period_string || report.created_at}\n\n${data.content}`;
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Не удалось скопировать отчет');
    }
  };

  const buildPayload = () => {
    if (!data?.content) return '';
    return `${data.title || report.title}\n\n${data.period_string || report.created_at}\n\n${data.content}`;
  };

  const makeFilename = () => {
    const date = String(data?.period_string || report.created_at || '').slice(0, 24).replaceAll(':', '-');
    return `aura-report-${date || report.report_id}.txt`;
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

  const handleShare = async () => {
    const payload = buildPayload();
    if (!payload) return;
    const filename = makeFilename();

    try {
      if (navigator.share) {
        const file = new File([payload], filename, { type: 'text/plain;charset=utf-8' });
        const nav = navigator as unknown as { canShare?: (d: any) => boolean; share: (d: any) => Promise<void> };
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: data?.title || report.title, text: 'Отчёт Aura (файл)' });
        } else {
          await nav.share({ text: payload, title: data?.title || report.title });
        }
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(payload);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      return;
    } catch {}

    downloadText(filename, payload);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleDownload = () => {
    const payload = buildPayload();
    if (!payload) return;
    downloadText(makeFilename(), payload);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-32 pt-12 px-8 sm:px-12 lg:px-16 xl:px-24 max-w-[900px] mx-auto animate-fade-in relative z-20 transition-colors duration-300 reader-surface">
      {/* Header with Back Button */}
      <div className="flex items-center mb-8 lg:mb-12">
        <button 
          onClick={onBack}
          className="p-2.5 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg-hover transition-all hover:scale-105 mr-2"
        >
          <ArrowLeft size={28} className="text-black dark:text-dark-text-primary" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 dark:border-blue-400"></div>
        </div>
      ) : data ? (
        <div className="animate-fade-in-up max-w-[720px] mx-auto">
          {/* Main Title */}
          <h1 className="text-4xl lg:text-5xl font-bold leading-[1.1] text-blue-700 dark:text-blue-400 mb-6 tracking-tight transition-colors duration-300">
            {data.title || report.title}
          </h1>

          {/* Date Range */}
          <p className="text-gray-600 dark:text-dark-text-secondary text-base lg:text-lg font-medium mb-10 lg:mb-12 transition-colors duration-300">
            {data.period_string || report.created_at}
          </p>

          {/* Content Body — улучшенная типографика и отступы для отчёта */}
          <div className="report-prose prose prose-lg lg:prose-xl max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-[1.7] reader-prose">
            {data.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: (props) => <h1 className="text-3xl font-bold mt-10 mb-5 text-blue-700 dark:text-blue-400 first:mt-0 scroll-mt-4" {...props} />,
                  h2: (props) => (
                    <h2
                      className="text-xl lg:text-2xl font-bold mt-10 mb-4 pt-6 pb-2 border-b border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 first:mt-0 first:pt-0 scroll-mt-4"
                      {...props}
                    />
                  ),
                  h3: (props) => (
                    <h3
                      className="text-lg font-semibold mt-6 mb-3 text-blue-600 dark:text-blue-300 scroll-mt-4"
                      {...props}
                    />
                  ),
                  h4: (props) => <h4 className="text-base font-semibold mt-4 mb-2 text-blue-500 dark:text-blue-200" {...props} />,
                  p: (props) => <p className="text-base leading-[1.75] mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap" {...props} />,
                  ul: (props) => (
                    <ul
                      className="list-disc list-outside mb-5 ml-5 space-y-2 text-gray-800 dark:text-gray-200 marker:text-blue-500 dark:marker:text-blue-400"
                      {...props}
                    />
                  ),
                  ol: (props) => (
                    <ol
                      className="list-decimal list-outside mb-5 ml-5 space-y-2 text-gray-800 dark:text-gray-200 marker:font-medium marker:text-blue-600 dark:marker:text-blue-400"
                      {...props}
                    />
                  ),
                  li: (props) => <li className="text-base leading-relaxed mb-1.5 pl-1" {...props} />,
                  strong: (props) => <strong className="font-semibold text-blue-700 dark:text-blue-400" {...props} />,
                  em: (props) => <em className="italic text-gray-700 dark:text-gray-300" {...props} />,
                  blockquote: (props) => (
                    <blockquote
                      className="border-l-4 border-blue-500 pl-5 pr-3 py-3 my-5 text-gray-700 dark:text-gray-300 bg-blue-50/80 dark:bg-blue-900/25 rounded-r-lg italic"
                      {...props}
                    />
                  ),
                  code: (props) => {
                    if (props.className) {
                      return <code className="block bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg text-sm overflow-x-auto mb-4 font-mono" {...props} />;
                    }
                    return <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm font-mono" {...props} />;
                  },
                  pre: (props) => <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                  hr: (props) => <hr className="my-8 border-gray-200 dark:border-gray-600" {...props} />,
                  table: (props) => <div className="overflow-x-auto mb-5 rounded-lg border border-gray-200 dark:border-gray-600"><table className="min-w-full border-collapse" {...props} /></div>,
                  thead: (props) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
                  tbody: (props) => <tbody className="divide-y divide-gray-200 dark:divide-gray-600" {...props} />,
                  tr: (props) => <tr className="border-b border-gray-200 dark:border-gray-600 last:border-0" {...props} />,
                  th: (props) => <th className="border-b border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-gray-200" {...props} />,
                  td: (props) => <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200" {...props} />,
                }}
              >
                {String(data.content)}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Содержимое отчета недоступно</p>
            )}
          </div>

          {/* Actions at the End */}
          {data?.content && (
            <div className="mt-4 flex justify-start">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="group p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg-hover transition-all duration-200"
                  title={shared ? 'Готово' : 'Поделиться'}
                  aria-label="Поделиться"
                >
                  {shared ? (
                    <Check size={24} className="text-green-500 transition-colors" />
                  ) : (
                    <Share2 size={24} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="group p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg-hover transition-all duration-200"
                  title={downloaded ? 'Скачано' : 'Скачать'}
                  aria-label="Скачать"
                >
                  {downloaded ? (
                    <Check size={24} className="text-green-500 transition-colors" />
                  ) : (
                    <Download size={24} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
                  )}
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  disabled={copied}
                  className="group p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg-hover transition-all duration-200 disabled:cursor-not-allowed"
                  title={copied ? 'Скопировано!' : 'Копировать'}
                  aria-label="Копировать"
                >
                  {copied ? (
                    <Check size={24} className="text-green-500 transition-colors" />
                  ) : (
                    <Copy size={24} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400 dark:text-dark-text-muted transition-colors duration-300">
          <p>Не удалось загрузить отчет.</p>
        </div>
      )}
    </div>
  );
};