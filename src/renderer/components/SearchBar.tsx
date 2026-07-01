import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PhotoFile } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, SHADOW, TRANSITION, Z_INDEX } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';
import { cleanCameraModel } from '../../shared/constants';

interface SearchBarProps {
  photos: PhotoFile[];
  onSearch: (query: string) => void;
  onSelectPhoto: (id: string) => void;
  theme: Theme;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ photos, onSearch, onSelectPhoto, theme: t, placeholder }) => {
  const { t: tr } = useI18n();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search across multiple fields
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return photos.filter(p =>
      p.fileName.toLowerCase().includes(q) ||
      p.cameraModel?.toLowerCase().includes(q) ||
      p.lensModel?.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.toLowerCase().includes(q)) ||
      p.fileFormat.toLowerCase().includes(q) ||
      p.colorLabel.toLowerCase().includes(q) ||
      (p.dateTaken && new Date(p.dateTaken).toLocaleDateString().includes(q))
    ).slice(0, 15);
  }, [photos, query]);

  const addRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentSearches(prev => {
      const next = [q, ...prev.filter(s => s !== q)].slice(0, 8);
      return next;
    });
  }, []);

  const updateDropdownPos = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + SPACING.xs, left: rect.left, width: rect.width });
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length > 0 || (value === '' && recentSearches.length > 0));
    setSelectedIndex(-1);
    onSearch(value);
  }, [onSearch, recentSearches]);

  const handleSelect = useCallback((id: string) => {
    if (query.trim()) addRecentSearch(query);
    onSelectPhoto(id);
    setQuery('');
    setIsOpen(false);
  }, [onSelectPhoto, query, addRecentSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    }
  }, [results, selectedIndex, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + F to focus
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(query.trim().length > 0);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [query]);

  // Update dropdown position on open and on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPos();
      window.addEventListener('scroll', updateDropdownPos, true);
      window.addEventListener('resize', updateDropdownPos);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true);
      window.removeEventListener('resize', updateDropdownPos);
    };
  }, [isOpen, updateDropdownPos]);

  const dropdownBaseStyle: React.CSSProperties = {
    position: 'fixed',
    top: dropdownPos.top,
    left: dropdownPos.left,
    width: dropdownPos.width,
    maxHeight: 400,
    overflowY: 'auto',
    zIndex: Z_INDEX.dropdown,
    animation: `fadeInUp ${DURATION.fast}ms ${EASING.out}`,
    borderRadius: RADIUS.md,
    boxShadow: SHADOW.lg,
    background: t.dropdownBg,
    padding: SPACING.xs,
  };

  return (
    <div ref={containerRef} style={{ flex: 1, maxWidth: 400 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: t.bgSecondary,
        borderRadius: RADIUS.sm,
        transition: `background ${DURATION.fast}ms ${EASING.out}, box-shadow ${DURATION.fast}ms ${EASING.out}`,
        boxShadow: isOpen ? (t.isDark ? SHADOW.focusDark : SHADOW.focus) : 'none',
        padding: `0 ${SPACING.md}px`,
        height: 32,
      }}>
        <span style={{ color: t.textTertiary, marginRight: SPACING.sm, userSelect: 'none', display: 'flex', alignItems: 'center' }}><AppIcon name="search" size={14} color={t.textTertiary} /></span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder || tr('search.placeholder')}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: t.textPrimary,
            fontSize: TYPO.body.size,
            outline: 'none',
            lineHeight: '32px',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); onSearch(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: t.textTertiary,
              cursor: 'pointer',
              padding: 2,
              fontSize: 14,
              transition: TRANSITION.all,
              borderRadius: RADIUS.sm,
            }}
          ><AppIcon name="close" size={12} color={t.textTertiary} /></button>
        )}
        <span style={{ color: t.textTertiary, fontSize: 11, marginLeft: SPACING.sm, userSelect: 'none', whiteSpace: 'nowrap' }}>
          {navigator.platform?.includes('Mac') ? '⌘F' : 'Ctrl+F'}
        </span>
      </div>

      {/* Recent searches (when input empty and focused) */}
      {isOpen && !query.trim() && recentSearches.length > 0 && (
        <div style={dropdownBaseStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.xs}px ${SPACING.sm}px` }}>
            <span style={{ fontSize: TYPO.caption.size, color: t.textTertiary }}>{tr('search.recent')}</span>
            <button style={{ fontSize: TYPO.tiny.size, color: t.textTertiary, background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => { setRecentSearches([]); setIsOpen(false); }}
            >{tr('search.clearRecent')}</button>
          </div>
          {recentSearches.map((s, idx) => (
            <button key={idx} style={{
              display: 'block', width: '100%', padding: `${SPACING.sm}px ${SPACING.md}px`,
              border: 'none', borderRadius: RADIUS.sm, background: 'transparent',
              color: t.textPrimary, cursor: 'pointer', fontSize: TYPO.small.size, textAlign: 'left',
              transition: TRANSITION.all,
            }}
              onClick={() => { setQuery(s); onSearch(s); setIsOpen(false); addRecentSearch(s); }}
              onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            ><span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}><AppIcon name="clock" size={12} color={t.textTertiary} />{s}</span></button>
          ))}
        </div>
      )}

      {/* Search results dropdown */}
      {isOpen && query.trim() && results.length > 0 && (
        <div style={dropdownBaseStyle}>
          <div style={{ padding: `${SPACING.sm}px ${SPACING.md}px`, fontSize: TYPO.caption.size, color: t.textTertiary }}>
            {results.length} {tr('search.results')}
          </div>
          {results.map((photo, idx) => (
            <div
              key={photo.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.md,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: RADIUS.sm,
                cursor: 'pointer',
                background: idx === selectedIndex ? t.accentLight : 'transparent',
                transition: TRANSITION.bg,
              }}
              onClick={() => handleSelect(photo.id)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div style={{
                width: 40,
                height: 30,
                borderRadius: 4,
                overflow: 'hidden',
                background: t.bgSecondary,
                flexShrink: 0,
              }}>
                <img
                  src={photo.displayUrl || (photo.thumbnailPath ? `file://${photo.thumbnailPath}` : null) || `photoforge://raw/${encodeURIComponent(photo.filePath)}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt=""
                />
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                  fontSize: TYPO.small.size,
                  color: idx === selectedIndex ? t.accent : t.textPrimary,
                  fontWeight: idx === selectedIndex ? 500 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{highlightMatch(photo.fileName, query)}</div>
                <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, display: 'flex', gap: SPACING.sm }}>
                  <span>{photo.fileFormat}</span>
                  {photo.cameraModel && <span>· {cleanCameraModel(photo.cameraModel)}</span>}
                  {photo.dateTaken && <span>· {new Date(photo.dateTaken).toLocaleDateString()}</span>}
                </div>
              </div>
              {photo.isFavorite && <AppIcon name="star" size={12} color={t.favStar} />}
              {photo.rating > 0 && <span style={{ fontSize: 10, color: t.ratingStar }}>{photo.rating}/5</span>}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim() && results.length === 0 && (
        <div style={{
          ...dropdownBaseStyle,
          maxHeight: 'none',
          overflowY: 'visible',
          padding: `${SPACING.xl}px`,
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SPACING.sm }}><AppIcon name="search" size={24} color={t.textTertiary} /></div>
          <div style={{ fontSize: TYPO.body.size, color: t.textTertiary }}>{tr('search.noResults')}</div>
          <div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginTop: SPACING.xs }}>{tr('search.tryOther')}</div>
        </div>
      )}
    </div>
  );
};

/** Highlight matching text in search results */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ fontWeight: 600 }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}
