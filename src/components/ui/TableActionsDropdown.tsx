import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { useLocale } from '../../localization/useLocale';
import { pickDirectionalValue } from '../../localization/direction';
import { cn } from '../../utils/cn';

export interface ActionItem {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'danger';
  hidden?: boolean;
}

interface TableActionsDropdownProps {
  actions: ActionItem[];
  triggerClassName?: string;
  triggerIconClassName?: string;
}

export const TableActionsDropdown: React.FC<TableActionsDropdownProps> = ({ actions, triggerClassName, triggerIconClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { direction } = useLocale();
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, openUpwards: false });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      timeoutId = setTimeout(() => {
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
      }, 100);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;

      setCoords({
        top: openUpwards ? rect.top + window.scrollY : rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        openUpwards,
      });
    }
  }, [isOpen]);

  const visibleActions = actions.filter(a => !a.hidden);
  if (visibleActions.length === 0) return null;

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${coords.top}px`,
    marginTop: coords.openUpwards ? '-4px' : '4px',
    transform: coords.openUpwards ? 'translateY(-100%)' : 'none',
    zIndex: 9999,
  };

  if (direction === 'rtl') {
    dropdownStyle.left = `${coords.left}px`;
  } else {
    // 192px is w-48. Align right edge of dropdown with right edge of button.
    dropdownStyle.left = `${coords.right - 192}px`;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          triggerClassName
        )}
      >
        <MoreHorizontal className={cn("h-5 w-5", triggerIconClassName)} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="w-48 rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black ring-opacity-5 dark:ring-white/10 focus:outline-none py-1 overflow-hidden"
        >
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            const isDanger = action.variant === 'danger';
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  action.onClick(e);
                }}
                className={cn(
                  "w-full flex items-center px-4 py-2.5 text-sm transition-colors",
                  isDanger
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
                  pickDirectionalValue(direction, 'text-left', 'text-right flex-row-reverse')
                )}
              >
                <Icon className={cn("h-4 w-4", pickDirectionalValue(direction, 'mr-3', 'ml-3'))} />
                <span className="font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
