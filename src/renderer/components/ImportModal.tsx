import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImportProgress } from '../../shared/types';
import { Theme, SPACING, RADIUS, SHADOW, TYPO, TRANSITION, DURATION, EASING } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface ImportModalProps {
  onImport: (sourcePaths: string[], importMode: 'copy' | 'reference') => void;
  onClose: () => void;
  progress: ImportProgress | null;
  defaultImportMode: 'copy' | 'reference';
  theme: Theme;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose, progress, defaultImportMode, theme: t }) => {
  const { t: tr } = useI18n();
  const [paths, setPaths] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importMode, setImportMode] = useState<'copy' | 'reference'>(defaultImportMode);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [exiting, setExiting] = useState(false);

  const stageLabels: Record<string, string> = {
    scanning: tr('import.stage.scanning'), copying: tr('import.stage.copying'),
    thumbnailing: tr('import.stage.thumbnailing'), metadata: tr('import.stage.metadata'),
    complete: tr('import.stage.complete'),
  };
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  useEffect(() => { setImportMode(defaultImportMode); }, [defaultImportMode]);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(onClose, DURATION.normal);
  }, [onClose]);

  const handleOverlayClick = () => {
    if (!progress) onClose();
  };

  const isComplete = progress?.stage === 'complete';

  return (
    <div style={{
      ...s(t).overlay,
      animation: exiting ? `scaleOut ${DURATION.normal}ms ${EASING.out} forwards` : 'none',
    }} onClick={() => { if (isComplete) handleClose(); }}>
      <div style={{
        ...s(t).modal,
        animation: exiting ? `scaleOut ${DURATION.normal}ms ${EASING.out} forwards` : 'none',
      }} onClick={e => e.stopPropagation()}>
        {/* Fixed header */}
        <div style={s(t).header}>
          <h2 style={s(t).title}>{tr('import.title')}</h2>
          <button style={s(t).closeBtn} onClick={handleClose}
            onMouseEnter={e => { e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.bgSecondary; }}>
            <AppIcon name="close" size={14} color={t.textSecondary} />
          </button>
        </div>
        {/* Fixed mode selector */}
        <div style={s(t).modeSection}>
          <label style={s(t).modeLabel}>{tr('import.mode')}</label>
          <div style={s(t).modeButtons}>
            <button style={{ ...s(t).modeBtn, background: importMode === 'copy' ? t.accentLight : t.bgSecondary, color: importMode === 'copy' ? t.accent : t.textPrimary, border: importMode === 'copy' ? `2px solid ${t.accent}` : `1px solid ${t.border}` }}
              onMouseEnter={e => { if (importMode !== 'copy') { e.currentTarget.style.background = t.bgHover; e.currentTarget.style.borderColor = t.accent; } }}
              onMouseLeave={e => { if (importMode !== 'copy') { e.currentTarget.style.background = t.bgSecondary; e.currentTarget.style.borderColor = t.border; } }} onClick={() => setImportMode('copy')}>
              {tr('import.copyToLibrary')}<span style={s(t).modeBtnDesc}>{tr('import.copyDesc')}</span>
            </button>
            <button style={{ ...s(t).modeBtn, background: importMode === 'reference' ? t.accentLight : t.bgSecondary, color: importMode === 'reference' ? t.accent : t.textPrimary, border: importMode === 'reference' ? `2px solid ${t.accent}` : `1px solid ${t.border}` }}
              onMouseEnter={e => { if (importMode !== 'reference') { e.currentTarget.style.background = t.bgHover; e.currentTarget.style.borderColor = t.accent; } }}
              onMouseLeave={e => { if (importMode !== 'reference') { e.currentTarget.style.background = t.bgSecondary; e.currentTarget.style.borderColor = t.border; } }} onClick={() => setImportMode('reference')}>
              {tr('import.reference')}<span style={s(t).modeBtnDesc}>{tr('import.refDesc')}</span>
            </button>
          </div>
        </div>
        {/* Scrollable body: drop zone + path list + progress + formats */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${SPACING.xl}px`, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg, minHeight: 0 }}>
          <div style={{ ...s(t).dropZone, borderColor: dragging ? t.accent : t.border, background: dragging ? t.accentBg : t.bgSecondary }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const files = Array.from(e.dataTransfer.files).map((f: any) => f.path); if (files.length) setPaths(prev => [...new Set([...prev, ...files])]); }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, marginBottom: SPACING.sm, borderRadius: RADIUS.pill, background: t.bgPhotoSurface }}><AppIcon name="folder" size={26} color={t.accent} /></div>
            <div style={{ color: t.textSecondary, marginBottom: SPACING.md }}>{tr('import.dropZone')}</div>
            <button style={s(t).selectBtn} onClick={async () => {
              const result = await window.photoForge.openFileDialog({ title: tr('import.selectDialogTitle'), properties: ['openDirectory', 'openFile', 'multiSelections'], filters: [{ name: 'Images & RAW', extensions: ['jpg','jpeg','png','gif','bmp','tiff','tif','webp','heic','heif','avif','cr2','cr3','nef','nrw','arw','srf','sr2','raf','orf','rw2','raw','dng','pef','ptx','iiq','3fr','fff','x3f','mef','srw','rwl'] }] });
              if (!result.canceled && result.filePaths.length) setPaths(prev => [...new Set([...prev, ...result.filePaths])]);
            }}>{tr('import.selectFiles')}</button>
          </div>
          {paths.length > 0 && (<div style={s(t).pathList}>{paths.map((p, i) => (<div key={i} style={s(t).pathItem}><span style={s(t).pathText}>{p}</span><button style={s(t).removeBtn} onClick={() => setPaths(prev => prev.filter((_, idx) => idx !== i))}><AppIcon name="close" size={12} color={t.textTertiary} /></button></div>))}</div>)}
          {progress && (<div style={s(t).progressArea}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACING.xs }}><span style={{ fontSize: TYPO.small.size, color: t.textSecondary }}>{stageLabels[progress.stage] || progress.stage}</span><span style={{ fontSize: TYPO.small.size, color: t.textSecondary }}>{pct}%</span></div><div style={s(t).progressBar}><div style={{ ...s(t).progressFill, width: `${pct}%`, background: progress.stage === 'complete' ? t.success : t.accent }} /></div>{progress.currentFile && (<div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progress.currentFile}</div>)}</div>)}
          <div style={s(t).formats}><div style={{ fontSize: TYPO.caption.size, color: t.textTertiary, marginBottom: SPACING.xs }}>{tr('import.supportedFormats')}</div><div style={{ fontSize: TYPO.tiny.size, color: t.textTertiary, lineHeight: 1.5 }}>JPEG · PNG · GIF · BMP · TIFF · WebP · HEIC/HEIF · AVIF<br/>Canon CR2/CR3 · Nikon NEF/NRW · Sony ARW · Fujifilm RAF · Olympus ORF · Panasonic RW2 · Adobe DNG · Pentax PEF · Samsung SRW · PhaseOne IIQ · Hasselblad 3FR/FFF · Sigma X3F</div></div>
          </div>
        </div>
        {/* Fixed footer actions */}
        <div style={s(t).actions}>
          <label style={{ fontSize: TYPO.caption.size, color: t.textTertiary, display: 'flex', alignItems: 'center', gap: SPACING.xs, marginRight: 'auto' }}><input type="checkbox" checked={rememberChoice} onChange={e => setRememberChoice(e.target.checked)} />{tr('import.remember')}</label>
          {isComplete ? (
            <button style={{ ...s(t).importBtn, background: '#fff', color: t.accent, border: `1.5px solid ${t.accent}` }}
              onClick={handleClose}>
              {tr('import.done')}
            </button>
          ) : (
            <>
              <button style={s(t).cancelBtn} onClick={handleClose}
                onMouseEnter={e => { if (!progress) { e.currentTarget.style.background = t.bgHover; } }}
                onMouseLeave={e => { if (!progress) { e.currentTarget.style.background = t.bgSecondary; } }} disabled={!!progress}>{tr('import.cancel')}</button>
              <button style={{ ...s(t).importBtn, opacity: paths.length === 0 || !!progress ? 0.5 : 1 }} onClick={() => onImport(paths, importMode)} disabled={paths.length === 0 || !!progress}>
                {progress ? tr('import.importing') : tr('import.start')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const s = (t: Theme): Record<string, React.CSSProperties> => ({
  overlay: { position: 'fixed', inset: 0, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { width: 560, maxHeight: '90vh', background: `linear-gradient(180deg, ${t.modalBg}, ${t.bgSecondary})`, borderRadius: RADIUS.xl, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 72px rgba(0,0,0,0.34)', outline: 'none', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, paddingBottom: 0, flexShrink: 0 },
  title: { fontSize: TYPO.heading.size, color: t.textPrimary, fontWeight: 600 },
  closeBtn: { width: 28, height: 28, border: `1px solid ${t.border}`, borderRadius: RADIUS.pill, transition: TRANSITION.all, background: t.bgSecondary, color: t.textSecondary, cursor: 'pointer', fontSize: TYPO.subheading.size, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modeSection: { padding: `${SPACING.lg}px ${SPACING.xl}px`, flexShrink: 0 }, modeLabel: { display: 'block', fontSize: TYPO.body.size, fontWeight: 500, color: t.textPrimary, marginBottom: SPACING.sm },
  modeButtons: { display: 'flex', gap: SPACING.sm }, modeBtn: { flex: 1, padding: `${SPACING.md}px ${SPACING.lg}px`, border: `1.5px solid transparent`, borderRadius: RADIUS.lg, cursor: 'pointer', fontSize: TYPO.body.size, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: SPACING.xs, boxShadow: 'none' }, modeBtnDesc: { fontSize: TYPO.tiny.size, color: t.textTertiary, fontWeight: 400 },
  dropZone: { border: '2px dashed', borderRadius: RADIUS.lg, padding: `${SPACING.xxl}px ${SPACING.lg}px`, textAlign: 'center', boxShadow: SHADOW.sm },
  selectBtn: { padding: `${SPACING.sm}px ${SPACING.xl}px`, border: 'none', borderRadius: RADIUS.md, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: TYPO.body.size },
  pathList: { maxHeight: 120, overflowY: 'auto' }, pathItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SPACING.xs}px ${SPACING.md}px`, background: `linear-gradient(180deg, ${t.bgSecondary}, ${t.bgPrimary})`, borderRadius: RADIUS.lg, marginBottom: SPACING.xs }, pathText: { fontSize: TYPO.small.size, color: t.textSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, removeBtn: { border: 'none', background: 'transparent', color: t.textTertiary, cursor: 'pointer', fontSize: 14, marginLeft: 8 },
  progressArea: {}, progressBar: { height: 6, background: t.bgSecondary, borderRadius: 999, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 999, transition: 'width 0.3s ease' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: SPACING.sm, alignItems: 'center', padding: `${SPACING.md}px ${SPACING.xl}px ${SPACING.xl}px`, flexShrink: 0 }, cancelBtn: { padding: `${SPACING.sm}px ${SPACING.xl}px`, border: `1px solid ${t.border}`, borderRadius: RADIUS.md, transition: TRANSITION.all, background: t.bgSecondary, color: t.textSecondary, cursor: 'pointer', fontSize: TYPO.body.size }, importBtn: { padding: `${SPACING.sm}px ${SPACING.xl}px`, border: 'none', borderRadius: RADIUS.md, background: t.accent, color: t.textInverse, cursor: 'pointer', fontSize: TYPO.body.size, fontWeight: 600 },
  formats: { padding: `${SPACING.md}px ${SPACING.lg}px`, background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: RADIUS.lg },
});
