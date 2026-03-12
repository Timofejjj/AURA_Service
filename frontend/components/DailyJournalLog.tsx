import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Block {
  id: number;
  text: string;
}

const MONTHS = [
  'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
  'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ',
];
const DAYS = ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА'];

function formatDateHeader(date: Date): string {
  const month = MONTHS[date.getMonth()];
  const dayName = DAYS[date.getDay()];
  const dayNum = date.getDate();
  return `${month} / ${dayName}, ${dayNum}`;
}

const PLACEHOLDER = 'Пишите здесь...';

interface DailyJournalLogProps {
  /** Initial date for the header; defaults to today */
  date?: Date;
  /** Optional initial blocks (e.g. from saved state) */
  initialBlocks?: Block[];
  /** Callback when blocks change (e.g. for persistence) */
  onBlocksChange?: (blocks: Block[]) => void;
  /** Dark theme for dotted background */
  dark?: boolean;
}

export const DailyJournalLog: React.FC<DailyJournalLogProps> = ({
  date = new Date(),
  initialBlocks,
  onBlocksChange,
  dark = true,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks?.length ? initialBlocks : [{ id: 1, text: '' }]
  );
  const nextIdRef = useRef(initialBlocks?.length ? Math.max(...initialBlocks.map((b) => b.id)) + 1 : 2);
  const inputRefsMap = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const focusBlockIdRef = useRef<number | null>(null);
  const focusPositionRef = useRef<number | null>(null);

  useEffect(() => {
    onBlocksChange?.(blocks);
  }, [blocks, onBlocksChange]);

  // Auto-resize textareas so long thoughts wrap (second line aligns under first)
  useEffect(() => {
    blocks.forEach((block) => {
      const el = inputRefsMap.current[block.id];
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.max(24, el.scrollHeight)}px`;
      }
    });
  }, [blocks]);

  const focusBlock = useCallback((id: number, position?: number) => {
    const el = inputRefsMap.current[id];
    if (el) {
      el.focus();
      if (typeof position === 'number') {
        el.setSelectionRange(position, position);
      }
    }
  }, []);

  useEffect(() => {
    const id = focusBlockIdRef.current;
    const pos = focusPositionRef.current;
    if (id != null) {
      focusBlock(id, pos ?? undefined);
      focusBlockIdRef.current = null;
      focusPositionRef.current = null;
    }
  }, [blocks, focusBlock]);

  const setBlockText = useCallback((id: number, text: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, text } : b))
    );
  }, []);

  const handleKeyDown = useCallback(
    (blockId: number, index: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const block = blocks[index];
      if (!block) return;
      const input = e.currentTarget;
      const { value, selectionStart, selectionEnd } = input;

      if (e.key === 'Enter') {
        e.preventDefault();
        const newId = nextIdRef.current++;
        const newBlocks = [
          ...blocks.slice(0, index + 1),
          { id: newId, text: '' },
          ...blocks.slice(index + 1),
        ];
        setBlocks(newBlocks);
        focusBlockIdRef.current = newId;
        return;
      }

      if (e.key === 'Backspace') {
        if (value.length === 0) {
          e.preventDefault();
          if (index === 0) return;
          const prevBlock = blocks[index - 1];
          const prevLen = prevBlock.text.length;
          setBlocks((prev) => prev.filter((_, i) => i !== index));
          focusBlockIdRef.current = prevBlock.id;
          focusPositionRef.current = prevLen;
          return;
        }
        if (selectionStart === 0 && selectionEnd === 0) {
          e.preventDefault();
          const prevBlock = blocks[index - 1];
          const prevLen = prevBlock.text.length;
          const mergedText = prevBlock.text + value;
          setBlocks((prev) => {
            const next = prev.map((b, i) => {
              if (i === index - 1) return { ...b, text: mergedText };
              if (i === index) return null;
              return b;
            });
            return next.filter(Boolean) as Block[];
          });
          focusBlockIdRef.current = prevBlock.id;
          focusPositionRef.current = prevLen;
        }
      }
    },
    [blocks]
  );

  return (
    <div
      className={`min-h-screen bg-dot-pattern ${dark ? 'dark-theme' : 'light-theme'} text-gray-900 dark:text-gray-100 transition-colors duration-300`}
    >
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-32">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-wide text-gray-700 dark:text-gray-300 tabular-nums">
            {formatDateHeader(date)}
          </h1>
        </header>

        <ul className="space-y-1 list-none">
          <AnimatePresence initial={false}>
            {blocks.map((block, index) => (
              <motion.li
                key={block.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-3"
              >
                <span
                  className="flex-shrink-0 w-5 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 text-lg leading-none select-none"
                  aria-hidden
                >
                  •
                </span>
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={(el) => {
                      inputRefsMap.current[block.id] = el;
                    }}
                    value={block.text}
                    onChange={(e) => setBlockText(block.id, e.target.value)}
                    onKeyDown={handleKeyDown(block.id, index)}
                    placeholder={PLACEHOLDER}
                    rows={1}
                    className="w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base leading-relaxed outline-none border-none py-1 resize-none overflow-hidden min-h-[1.5rem]"
                    aria-label={`Блок ${index + 1}`}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
};
