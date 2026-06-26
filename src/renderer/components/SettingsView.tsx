import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppSettings, ExportFormat } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, SHADOW, TRANSITION } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface SettingsViewProps {
 onBack: () => void;
 onSettingsChange: (updates: Partial<AppSettings>) => void;
 settings: AppSettings;
 theme: Theme;
}

type SettingsSection = 'general' | 'import' | 'export' | 'display' | 'shortcuts' | 'advanced' | 'logs' | 'about';

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
 { value: 'jpg', label: 'JPEG' },
 { value: 'png', label: 'PNG' },
 { value: 'webp', label: 'WebP' },
 { value: 'tiff', label: 'TIFF' },
 { value: 'bmp', label: 'BMP' },
 { value: 'avif', label: 'AVIF' },
];

const fieldLabelStyle = (t: Theme): React.CSSProperties => ({
 display: 'block',
 fontSize: TYPO.small.size,
 fontWeight: 600,
 color: t.textPrimary,
 marginBottom: SPACING.sm,
});

const keycapStyle = (t: Theme): React.CSSProperties => ({
 padding: `${SPACING.xs}px ${SPACING.md}px`,
 background: t.bgSecondary,
 borderRadius: RADIUS.sm,
 fontSize: TYPO.small.size,
 fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
 color: t.textSecondary,
 minWidth: 58,
 textAlign: 'center',
 boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.2)',
});

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onSettingsChange, settings, theme: t }) => {
 const { t: tr } = useI18n();
 const [saved, setSaved] = useState(false);
 const [clearing, setClearing] = useState(false);
 const [activeSection, setActiveSection] = useState<SettingsSection>('general');
 const saveTimerRef = useRef<number | null>(null);

 const sections: { key: SettingsSection; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'general', labelKey: 'settings.general', icon: <AppIcon name="settings" size={15} /> },
  { key: 'import', labelKey: 'settings.import', icon: <AppIcon name="import" size={15} /> },
  { key: 'export', labelKey: 'settings.export', icon: <AppIcon name="export" size={15} /> },
  { key: 'display', labelKey: 'settings.display', icon: <AppIcon name="display" size={15} /> },
  { key: 'shortcuts', labelKey: 'shortcuts.title', icon: <AppIcon name="keyboard" size={15} /> },
  { key: 'advanced', labelKey: 'settings.advanced', icon: <AppIcon name="wrench" size={15} /> },
  { key: 'logs', labelKey: 'settings.logs', icon: <AppIcon name="logs" size={15} /> },
  { key: 'about', labelKey: 'settings.about', icon: <AppIcon name="info" size={15} /> },
 ];


 const update = (partial: Partial<AppSettings>) => {
  onSettingsChange(partial);
  setSaved(true);
  if (saveTimerRef.current) {
   window.clearTimeout(saveTimerRef.current);
  }
  saveTimerRef.current = window.setTimeout(() => setSaved(false), 1600);
 };

 useEffect(() => () => {
  if (saveTimerRef.current) {
   window.clearTimeout(saveTimerRef.current);
  }
 }, []);

 const handleClearLibrary = async () => {
  if (!confirm(tr('settings.clearLibraryConfirm'))) return;
  setClearing(true);
  try {
   const allPhotos = await window.photoForge.getAllPhotos();
   if (allPhotos.length > 0) {
    await window.photoForge.deletePhotos(allPhotos.map((photo: any) => photo.id));
   }
  } catch {
   // ignore
  }
  setClearing(false);
 };

 const handleBrowseLibraryPath = async () => {
  const result = await window.photoForge.openFileDialog({
   title: tr('settings.browseLibraryPath'),
   properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths.length) {
   update({ libraryPath: result.filePaths[0] });
  }
 };

 const namingPreview = settings.namingTemplate
  .replace('{filename}', 'DSC_0001')
  .replace('{date}', '2025-01-15')
  .replace('{year}', '2025')
  .replace('{month}', '01')
  .replace('{day}', '15')
  .replace('{camera}', 'Canon_EOS_R5')
  .replace('{preset}', 'Cinematic Amber')
  .replace('{index}', '001')
  .replace('{rating}', '4')
  .replace('{width}', '8192')
  .replace('{height}', '5464');

  const heroKeyMap: Record<string, string> = {
    general: 'settings.heroGeneral', import: 'settings.heroImport',
    export: 'settings.heroExport', display: 'settings.heroDisplay',
    shortcuts: 'settings.heroShortcuts', advanced: 'settings.heroAdvanced',
    logs: 'settings.heroLogs', about: 'settings.heroAbout',
  };
  const sectionHeroTitle: string = tr(heroKeyMap[activeSection] ?? 'settings.heroAbout');

 return (
  <div style={styles.container(t)}>
   <div style={styles.header(t)}>
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
     <button style={styles.backBtn(t)} onClick={onBack}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>
       <AppIcon name="back" size={14} color={t.textPrimary} />
       {tr('settings.back')}
      </span>
     </button>
     <div>
      <div style={styles.headerEyebrow(t)}>{tr("settings.headerEyebrow")}</div>
      <div style={styles.headerTitle(t)}>{tr('settings.title')}</div>
     </div>
    </div>
    <div style={styles.saveState(t, saved)}>
     <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>
      <AppIcon name={saved ? 'check' : 'dot'} size={12} color={saved ? t.success : t.textTertiary} />
      {saved ? tr('settings.saved') : tr('settings.ready')}
     </span>
    </div>
   </div>

   <div style={styles.body}>
    <aside style={styles.sidebar(t)}>
     <div style={styles.sidebarTop(t)}>
      <div style={styles.sidebarBadge(t)}>{tr("settings.sidebarBadge")}</div>
      <div style={styles.sidebarHeading(t)}>{tr("settings.sidebarHeading")}</div>

     </div>


     <div style={styles.sectionList}>
      {sections.map(section => {
       const selected = section.key === activeSection;
       return (
        <button
         key={section.key}
         style={styles.sideItem(t, selected)}
         onClick={() => setActiveSection(section.key)}
         aria-label={tr(section.labelKey)}
        >
         <span style={styles.sideIcon(t, selected)}>{section.icon}</span>
         <span style={{ flex: 1, minWidth: 0 }}>
          <span style={styles.sideLabel(t, selected)}>{tr(section.labelKey)}</span>
          
         </span>
        </button>
       );
      })}
     </div>
    </aside>

    <main style={styles.content(t)}>
     <section style={styles.hero(t)}>
      
      <h2 style={styles.heroTitle(t)}>{sectionHeroTitle}</h2>
      
     </section>

     {activeSection === 'general' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('settings.general')}
       >
        <SettingsFieldGroup theme={t} columns={3}>
         <FieldCard theme={t} label={tr('settings.language')} >
          <select style={styles.selectInput(t)} value={settings.language} onChange={e => update({ language: e.target.value as any })}>
           <option value="zh-CN">简体中文</option>
           <option value="en-US">English</option>
          </select>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.theme')} >
          <select style={styles.selectInput(t)} value={settings.theme} onChange={e => update({ theme: e.target.value as any })}>
           <option value="light">{tr('settings.themeLight')}</option>
           <option value="dark">{tr('settings.themeDark')}</option>
           <option value="system">{tr('settings.themeSystem')}</option>
           <option value="vintage">{tr('settings.themeVintage')}</option>
           <option value="graphite-gold">{tr('settings.themeGraphiteGold')}</option>
           <option value="slate-blue">{tr('settings.themeSlateBlue')}</option>
           <option value="merlot">{tr('settings.themeMerlot')}</option>
          </select>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.colorSpace')} >
          <select style={styles.selectInput(t)} value={settings.colorSpace} onChange={e => update({ colorSpace: e.target.value as any })}>
           <option value="srgb">{tr('colorSpace.srgb')}</option>
           <option value="adobe-rgb">{tr('colorSpace.adobe-rgb')}</option>
           <option value="prophoto">{tr('colorSpace.prophoto')}</option>
          </select>
         </FieldCard>
        </SettingsFieldGroup>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'import' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('settings.import')}
       >
        <SettingsFieldGroup theme={t} columns={2}>
         <FieldCard theme={t} label={tr('settings.importMode')} hint={settings.importMode === 'copy' ? tr('settings.copyHint') : tr('settings.referenceHint')}>
          <select style={styles.selectInput(t)} value={settings.importMode} onChange={e => update({ importMode: e.target.value as any })}>
           <option value="copy">{tr('settings.importCopy')}</option>
           <option value="reference">{tr('settings.importReference')}</option>
          </select>
         </FieldCard>
         <FieldCard
          theme={t}
          label={tr("settings.libraryBehavior")}
                   >
          <div style={styles.metricRow(t)}>
           <div style={styles.metricPill(t)}>
            <span style={styles.metricNumber(t)}>{settings.importMode === 'copy' ? 'Managed' : tr('settings.linked')}</span>
            <span style={styles.metricLabel(t)}>{settings.importMode === 'copy' ? 'Originals duplicated into the library.' : tr('settings.linkedDesc')}</span>
           </div>
          </div>
         </FieldCard>
        </SettingsFieldGroup>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'export' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('settings.export')}
       >
        <SettingsFieldGroup theme={t} columns={2}>
         <FieldCard theme={t} label={tr('settings.exportFormat')} >
          <select style={styles.selectInput(t)} value={settings.exportFormat} onChange={e => update({ exportFormat: e.target.value as ExportFormat })}>
           {EXPORT_FORMATS.map(format => (
            <option key={format.value} value={format.value}>{format.label}</option>
           ))}
          </select>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.exportQuality')} >
          <div style={styles.sliderRow}>
           <input
            type="range"
            min={1}
            max={100}
            value={settings.exportQuality}
            onChange={e => update({ exportQuality: Number(e.target.value) })}
            style={{ flex: 1 }}
           />
           <span style={styles.sliderValue(t)}>{settings.exportQuality}%</span>
          </div>
         </FieldCard>
        </SettingsFieldGroup>

        <SettingsFieldGroup theme={t} columns={2}>
         <FieldCard theme={t} label={tr('settings.defaultNamingTemplate')} hint={tr('settings.namingTemplateHint')}>
          <input
           style={styles.textInput(t)}
           value={settings.namingTemplate}
           onChange={e => update({ namingTemplate: e.target.value })}
           placeholder="{{filename}}"
          />
          <div style={styles.previewChip(t)}>
           <span style={styles.previewLabel(t)}>{tr('export.namingPreview')}</span>
           <span style={styles.previewValue(t)}>{namingPreview}.jpg</span>
          </div>
         </FieldCard>
         <FieldCard theme={t} label={tr("settings.exportBehavior")}>
          <ToggleRow theme={t} label={tr('settings.preserveExif')} hint={tr('settings.preserveExifHint')}>
           <input type="checkbox" checked={settings.preserveExif} onChange={e => update({ preserveExif: e.target.checked })} />
          </ToggleRow>
          <ToggleRow theme={t} label={tr('export.openFolderAfter')} hint={tr('settings.openFolderAfterExportHint')}>
           <input type="checkbox" checked={settings.openFolderAfterExport} onChange={e => update({ openFolderAfterExport: e.target.checked })} />
          </ToggleRow>
         </FieldCard>
        </SettingsFieldGroup>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'display' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('settings.display')}
       >
        <SettingsFieldGroup theme={t} columns={3}>
         <FieldCard theme={t} label={tr('settings.thumbnailSize')} hint={tr('settings.thumbnailSizeHint')}>
          <select style={styles.selectInput(t)} value={settings.thumbnailSize} onChange={e => update({ thumbnailSize: Number(e.target.value) })}>
           <option value={200}>{tr('settings.thumbnailSmall')}</option>
           <option value={400}>{tr('settings.thumbnailMedium')}</option>
           <option value={800}>{tr('settings.thumbnailLarge')}</option>
          </select>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.showFileExtensions')} >
          <ToggleRow theme={t} label={tr('settings.showFileExtensions')} >
           <input type="checkbox" checked={settings.showFileExtensions} onChange={e => update({ showFileExtensions: e.target.checked })} />
          </ToggleRow>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.showGridInfo')} hint={tr('settings.showGridInfoHint')}>
          <ToggleRow theme={t} label={tr('settings.showGridInfo')} >
           <input type="checkbox" checked={settings.showGridInfo} onChange={e => update({ showGridInfo: e.target.checked })} />
          </ToggleRow>
         </FieldCard>
        </SettingsFieldGroup>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'shortcuts' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('shortcuts.title')}
       >
        <div style={styles.shortcutsPanel(t)}>
         {[
          ['⌘I', tr('shortcuts.import')],
          ['⌘E', tr('shortcuts.export')],
          ['⌘1~4', tr('shortcuts.switchView')],
          ['⌘\\', tr('shortcuts.toggleSidebar')],
          ['⌘P', tr('shortcuts.presets')],
          ['⌘L', tr('shortcuts.favorite')],
          ['⌘A', tr('shortcuts.selectAll')],
          ['⌘Z', tr('shortcuts.undo')],
          ['⌘⇧Z', tr('shortcuts.redo')],
          ['⌘F', tr('shortcuts.search')],
          ['⌫', tr('shortcuts.delete')],
          ['← / →', tr('shortcuts.navigate')],
         ].map(([key, desc]) => (
          <div key={key} style={styles.shortcutRow(t)}>
           <span style={styles.shortcutText(t)}>{desc}</span>
           <kbd style={keycapStyle(t)}>{key}</kbd>
          </div>
         ))}
        </div>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'advanced' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('settings.advanced')}
       >
        <SettingsFieldGroup theme={t} columns={2}>
         <FieldCard theme={t} label={tr('settings.libraryPath')} hint={tr('settings.libraryPathHint')}>
          <div style={styles.inlineActionRow}>
           <input
            style={{ ...styles.textInput(t), flex: 1 }}
            value={settings.libraryPath || ''}
            readOnly
            placeholder={tr('settings.libraryPathNone')}
           />
           <button style={styles.actionBtn(t)} onClick={handleBrowseLibraryPath}>{tr('settings.browse')}</button>
          </div>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.maxProcessMemory')} hint={tr('settings.maxMemoryHint')}>
          <select style={styles.selectInput(t)} value={settings.maxProcessMemory} onChange={e => update({ maxProcessMemory: Number(e.target.value) })}>
           <option value={256}>256 MB</option>
           <option value={512}>512 MB</option>
           <option value={1024}>1 GB</option>
           <option value={2048}>2 GB</option>
          </select>
         </FieldCard>
        </SettingsFieldGroup>

        <SettingsFieldGroup theme={t} columns={2}>
         <FieldCard theme={t} label={tr('settings.checkMissingFiles')} hint={tr('settings.checkMissingFilesHint')}>
          <ToggleRow theme={t} label={tr('settings.checkMissingFiles')} >
           <input type="checkbox" checked={settings.checkMissingFiles} onChange={e => update({ checkMissingFiles: e.target.checked })} />
          </ToggleRow>
         </FieldCard>
         <FieldCard theme={t} label={tr('settings.dangerZone')} >
          <div style={styles.dangerPanel(t)}>
           <div>
            <div style={styles.dangerTitle(t)}>{tr('settings.dangerZone')}</div>
            <div style={styles.dangerCopy(t)}>Deletes all managed photos from the current library index.</div>
           </div>
           <button
            style={{ ...styles.dangerBtn(t), opacity: clearing ? 0.55 : 1 }}
            disabled={clearing}
            onClick={handleClearLibrary}
           >
            {clearing ? tr('settings.clearing') : tr('settings.clearLibrary')}
           </button>
          </div>
         </FieldCard>
        </SettingsFieldGroup>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'about' && (
      <div style={styles.panelStack}>
       <SettingsPanel
        theme={t}
        title={tr('settings.about')}
       >
        <div style={styles.aboutPanel(t)}>
         <div style={styles.aboutMark(t)}>
          <AppIcon name="camera" size={36} color={t.accent} />
         </div>
         <div style={styles.aboutTitle(t)}>PhotoForge</div>
         <div style={styles.aboutVersion(t)}>v1.0.0</div>
         <p style={styles.aboutCopy(t)}>{tr('settings.aboutDesc')}</p>
         <div style={styles.aboutDetails(t)}>
          {tr('settings.aboutFeatures')}<br />
          {tr('settings.aboutFeatures2')}<br /><br />
          {tr('settings.aboutLicense')}<br />
          {tr('settings.aboutTech')}
         </div>
         <button style={styles.aboutBtn(t)} onClick={() => window.photoForge.openExternal('https://github.com/photoforge')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>
           <AppIcon name="globe" size={14} color={t.accent} />
           GitHub
          </span>
         </button>
        </div>
       </SettingsPanel>
      </div>
     )}

     {activeSection === 'logs' && <LogViewer theme={t} />}
    </main>
   </div>
  </div>
 );
};

const SettingsPanel: React.FC<{
 theme: Theme;
 title: string;
 children: React.ReactNode;
}> = ({ theme: t, title, children }) => (
 <section style={styles.panel(t)}>
  <div style={styles.panelHeader(t)}>
   <h3 style={styles.panelTitle(t)}>{title}</h3>
  </div>
  <div style={styles.panelBody}>{children}</div>
 </section>
);

const SettingsFieldGroup: React.FC<{
 theme: Theme;
 columns: 1 | 2 | 3;
 children: React.ReactNode;
}> = ({ theme: t, columns, children }) => (
 <div
  style={{
   display: 'grid',
   gap: SPACING.lg,
   gridTemplateColumns: columns === 1 ? '1fr' : columns === 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
  }}
 >
  {children}
 </div>
);

const FieldCard: React.FC<{
 theme: Theme;
 label: string;
 hint?: string;
 children: React.ReactNode;
}> = ({ theme: t, label, hint, children }) => (
 <div style={styles.fieldCard(t)}>
  <label style={fieldLabelStyle(t)}>{label}</label>
  <div style={styles.fieldBody}>{children}</div>
  {hint ? <div style={styles.fieldHint(t)}>{hint}</div> : null}
 </div>
);

const ToggleRow: React.FC<{
 theme: Theme;
 label: string;
 hint?: string;
 children: React.ReactNode;
}> = ({ theme: t, label, hint, children }) => (
 <div style={styles.toggleRow(t)}>
  <div style={{ flex: 1 }}>
   <div style={styles.toggleLabel(t)}>{label}</div>
   {hint ? <div style={styles.toggleHint(t)}>{hint}</div> : null}
  </div>
  <div style={styles.toggleControl(t)}>{children}</div>
 </div>
);

const styles = {
 container: (t: Theme): React.CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: t.bgPhotoStage,
  boxShadow: 'none',
 }),
 header: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 12px 16px',
  background: t.bgPrimary,
  boxShadow: 'none',
  gap: SPACING.md,
 }),
 headerEyebrow: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.tiny.size,
  color: t.textTertiary,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  marginBottom: 2,
 }),
 headerTitle: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.large.size,
  fontWeight: 700,
  color: t.textPrimary,
 }),
 saveState: (t: Theme, saved: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: `${SPACING.xs}px ${SPACING.md}px`,
  borderRadius: RADIUS.pill,
  background: saved ? t.successLight : t.bgSecondary,
  color: saved ? t.success : t.textSecondary,
  border: 'none',
  fontSize: TYPO.small.size,
  transition: TRANSITION.all,
 }),
 backBtn: (t: Theme): React.CSSProperties => ({
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  border: 'none',
  borderRadius: 12,
  background: t.bgSecondary,
  color: t.textPrimary,
  cursor: 'pointer',
  fontSize: TYPO.body.size,
  boxShadow: 'none',
  transition: TRANSITION.all,
 }),
 body: {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
  minHeight: 0,
 } as React.CSSProperties,
 sidebar: (t: Theme): React.CSSProperties => ({
  width: 278,
  minWidth: 278,
  background: t.sidebarBg,
  padding: `${SPACING.xl}px ${SPACING.md}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  boxShadow: 'none',
 }),
 sidebarTop: (t: Theme): React.CSSProperties => ({
  padding: `${SPACING.lg}px`,
  borderRadius: RADIUS.lg,
  background: t.bgSecondary,
  boxShadow: 'none',
  flexShrink: 0,
 }),
 sidebarBadge: (t: Theme): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: `${SPACING.xs}px ${SPACING.sm}px`,
  borderRadius: RADIUS.pill,
  background: t.accentBg,
  color: t.accent,
  fontSize: TYPO.tiny.size,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: SPACING.md,
 }),
 sidebarHeading: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.subheading.size,
  fontWeight: 700,
  color: t.textPrimary,
  marginBottom: SPACING.xs,
 }),
 sidebarCopy: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.small.size,
  color: t.textTertiary,
  lineHeight: 1.6,
 }),
 sectionList: {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
 } as React.CSSProperties,
 sideItem: (t: Theme, selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
  width: '100%',
  padding: `${SPACING.md}px ${SPACING.lg}px`,
  border: 'none',
  borderRadius: 14,
  background: selected
   ? t.accentBg
   : t.bgSecondary,
  boxShadow: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: TRANSITION.all,
 }),
 sideIcon: (t: Theme, selected: boolean): React.CSSProperties => ({
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  background: selected ? t.bgPrimary : t.bgSecondary,
  color: selected ? t.accent : t.textSecondary,
  flexShrink: 0,
 }),
 sideLabel: (t: Theme, selected: boolean): React.CSSProperties => ({
  display: 'block',
  fontSize: TYPO.body.size,
  fontWeight: 600,
  color: selected ? t.textPrimary : t.textSecondary,
  marginBottom: 2,
 }),
 sideSubtitle: (t: Theme): React.CSSProperties => ({
  display: 'block',
  fontSize: TYPO.tiny.size,
  color: t.textTertiary,
  lineHeight: 1.45,
 }),
 content: (t: Theme): React.CSSProperties => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: `${SPACING.xl}px ${SPACING.xxl}px ${SPACING.xxl}px`,
  background: t.bgPhotoStage,
 }),
 hero: (t: Theme): React.CSSProperties => ({
  padding: `${SPACING.xl}px ${SPACING.xxl}px`,
  marginBottom: SPACING.xl,
  borderRadius: RADIUS.xl,
  background: t.bgPrimary,
  boxShadow: 'none',
 }),
 heroBadge: (t: Theme): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: `${SPACING.xs}px ${SPACING.md}px`,
  borderRadius: RADIUS.pill,
  background: t.bgPrimary,
  color: t.accent,
  fontSize: TYPO.tiny.size,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: SPACING.md,
 }),
 heroTitle: (t: Theme): React.CSSProperties => ({
  margin: 0,
  fontSize: 30,
  fontWeight: 700,
  color: t.textPrimary,
  lineHeight: 1.18,
  maxWidth: 720,
 }),
 heroBody: (t: Theme): React.CSSProperties => ({
  margin: `${SPACING.md}px 0 0`,
  fontSize: TYPO.body.size,
  lineHeight: 1.7,
  color: t.textSecondary,
  maxWidth: 720,
 }),
 panelStack: {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xl,
 } as React.CSSProperties,
 panel: (t: Theme): React.CSSProperties => ({
  borderRadius: RADIUS.xl,
  background: t.panelBg,
  boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
  overflow: 'hidden',
 }),
 panelHeader: (t: Theme): React.CSSProperties => ({
  padding: `${SPACING.xl}px ${SPACING.xxl}px ${SPACING.lg}px`,
  background: t.panelBg,
 }),
 panelEyebrow: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.tiny.size,
  color: t.accent,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: SPACING.sm,
 }),
 panelTitle: (t: Theme): React.CSSProperties => ({
  margin: 0,
  fontSize: TYPO.heading.size,
  fontWeight: 700,
  color: t.textPrimary,
 }),
 panelDescription: (t: Theme): React.CSSProperties => ({
  margin: `${SPACING.sm}px 0 0`,
  fontSize: TYPO.body.size,
  lineHeight: 1.65,
  color: t.textSecondary,
  maxWidth: 760,
 }),
 panelBody: {
  padding: `${SPACING.xl}px ${SPACING.xxl}px ${SPACING.xxl}px`,
 } as React.CSSProperties,
 fieldCard: (t: Theme): React.CSSProperties => ({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
  padding: `${SPACING.lg}px`,
  borderRadius: RADIUS.lg,
  background: t.bgSecondary,
  boxShadow: 'none',
 }),
 fieldBody: {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
 } as React.CSSProperties,
 fieldHint: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.caption.size,
  color: t.textTertiary,
  lineHeight: 1.5,
 }),
 selectInput: (t: Theme): React.CSSProperties => ({
  width: '100%',
  minHeight: 40,
  padding: '10px 14px',
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  background: t.bgInput,
  color: t.textPrimary,
  fontSize: TYPO.body.size,
  boxShadow: 'none',
  outline: 'none',
 }),
 textInput: (t: Theme): React.CSSProperties => ({
  width: '100%',
  minHeight: 40,
  padding: '10px 14px',
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  background: t.bgInput,
  color: t.textPrimary,
  fontSize: TYPO.body.size,
  boxShadow: 'none',
  outline: 'none',
 }),
 previewChip: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xs,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  borderRadius: 12,
  background: t.bgSecondary,
 }),
 previewLabel: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.tiny.size,
  color: t.textTertiary,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
 }),
 previewValue: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.small.size,
  color: t.textPrimary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  wordBreak: 'break-all',
 }),
 sliderRow: {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
 } as React.CSSProperties,
 sliderValue: (t: Theme): React.CSSProperties => ({
  minWidth: 42,
  textAlign: 'right',
  fontSize: TYPO.body.size,
  color: t.textPrimary,
  fontWeight: 600,
 }),
 metricRow: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
 }),
 metricPill: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xs,
  padding: `${SPACING.md}px ${SPACING.lg}px`,
  borderRadius: 14,
  background: t.bgSecondary,
 }),
 metricNumber: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.subheading.size,
  fontWeight: 700,
  color: t.textPrimary,
 }),
 metricLabel: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.caption.size,
  color: t.textSecondary,
  lineHeight: 1.5,
 }),
 toggleRow: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
  padding: `${SPACING.md}px ${SPACING.lg}px`,
  borderRadius: 14,
  background: t.bgSecondary,
 }),
 toggleLabel: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.body.size,
  fontWeight: 600,
  color: t.textPrimary,
  marginBottom: 2,
 }),
 toggleHint: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.caption.size,
  color: t.textTertiary,
  lineHeight: 1.45,
 }),
 toggleControl: (t: Theme): React.CSSProperties => ({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
 }),
 shortcutsPanel: (t: Theme): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: SPACING.md,
 }),
 shortcutRow: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: SPACING.lg,
  padding: `${SPACING.md}px ${SPACING.lg}px`,
  borderRadius: 14,
  background: t.bgSecondary,
  border: `1px solid ${t.border}`,
 }),
 shortcutText: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.body.size,
  color: t.textPrimary,
 }),
 inlineActionRow: {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
 } as React.CSSProperties,
 actionBtn: (t: Theme): React.CSSProperties => ({
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  borderRadius: 12,
  background: t.bgSecondary,
  color: t.textPrimary,
  cursor: 'pointer',
  fontSize: TYPO.body.size,
  boxShadow: 'none',
  whiteSpace: 'nowrap',
 }),
 dangerPanel: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: SPACING.lg,
  padding: `${SPACING.lg}px`,
  borderRadius: 16,
  background: t.dangerLight,
  border: `1px solid ${t.danger}`,
 }),
 dangerTitle: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.body.size,
  fontWeight: 700,
  color: t.danger,
  marginBottom: 2,
 }),
 dangerCopy: (t: Theme): React.CSSProperties => ({
  fontSize: TYPO.caption.size,
  color: t.textSecondary,
  lineHeight: 1.5,
 }),
 dangerBtn: (t: Theme): React.CSSProperties => ({
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  border: 'none',
  borderRadius: 12,
  background: t.danger,
  color: t.textInverse,
  cursor: 'pointer',
  fontSize: TYPO.body.size,
  fontWeight: 600,
  whiteSpace: 'nowrap',
 }),
 aboutPanel: (t: Theme): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: `${SPACING.xxl}px`,
  borderRadius: RADIUS.xl,
  background: t.bgSecondary,
 }),
 aboutMark: (t: Theme): React.CSSProperties => ({
  width: 84,
  height: 84,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 24,
  background: t.bgPrimary,
  boxShadow: 'none',
  marginBottom: SPACING.lg,
 }),
 aboutTitle: (t: Theme): React.CSSProperties => ({
  fontSize: 28,
  fontWeight: 700,
  color: t.textPrimary,
 }),
 aboutVersion: (t: Theme): React.CSSProperties => ({
  marginTop: SPACING.xs,
  fontSize: TYPO.small.size,
  color: t.textTertiary,
  marginBottom: SPACING.lg,
 }),
 aboutCopy: (t: Theme): React.CSSProperties => ({
  maxWidth: 520,
  margin: 0,
  fontSize: TYPO.body.size,
  color: t.textSecondary,
  lineHeight: 1.7,
 }),
 aboutDetails: (t: Theme): React.CSSProperties => ({
  marginTop: SPACING.lg,
  fontSize: TYPO.caption.size,
  color: t.textTertiary,
  lineHeight: 1.8,
 }),
 aboutBtn: (t: Theme): React.CSSProperties => ({
  marginTop: SPACING.xl,
  padding: `${SPACING.sm}px ${SPACING.xl}px`,
  borderRadius: 12,
  background: t.accentLight,
  color: t.accent,
  cursor: 'pointer',
  fontSize: TYPO.body.size,
  boxShadow: 'none',
 }),
 logsToolbar: {
  display: 'flex',
  gap: SPACING.sm,
  marginBottom: SPACING.lg,
  flexWrap: 'wrap',
  alignItems: 'center',
 } as React.CSSProperties,
 logActionBtn: (t: Theme): React.CSSProperties => ({
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  background: t.bgSecondary,
  color: t.textPrimary,
  cursor: 'pointer',
  boxShadow: 'none',
 }),
 logPanel: (t: Theme): React.CSSProperties => ({
  background: t.bgSecondary,
  borderRadius: RADIUS.lg,
  height: 420,
  overflowY: 'auto',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: TYPO.caption.size,
  boxShadow: 'none',
 }),
 logEmpty: (t: Theme): React.CSSProperties => ({
  padding: SPACING.xl,
  textAlign: 'center',
  color: t.textTertiary,
 }),
 logRow: (t: Theme, background: string): React.CSSProperties => ({
  display: 'flex',
  gap: SPACING.sm,
  alignItems: 'flex-start',
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  background,
  lineHeight: 1.5,
 }),
 logMeta: (t: Theme): React.CSSProperties => ({
  color: t.textTertiary,
  minWidth: 60,
  flexShrink: 0,
 }),
 logCount: (t: Theme): React.CSSProperties => ({
  marginTop: SPACING.sm,
  fontSize: TYPO.tiny.size,
  color: t.textTertiary,
 }),
};

interface LogEntry {
 ts: string;
 level: string;
 module: string;
 msg: string;
 data?: any;
}

const LogViewer: React.FC<{ theme: Theme }> = ({ theme: t }) => {
 const { t: tr } = useI18n();
 const [dates, setDates] = useState<string[]>([]);
 const [selectedDate, setSelectedDate] = useState<string>('');
 const [entries, setEntries] = useState<LogEntry[]>([]);
 const [levelFilter, setLevelFilter] = useState<string>('');
 const [moduleFilter, setModuleFilter] = useState<string>('');
 const [searchQuery, setSearchQuery] = useState('');
 const [autoScroll, setAutoScroll] = useState(true);
 const logEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  window.photoForge.logDates().then(logDates => {
   setDates(logDates);
   if (logDates.length > 0) setSelectedDate(logDates[0]);
  });
 }, []);

 useEffect(() => {
  if (!selectedDate) return;
  const filter: any = {};
  if (levelFilter) filter.level = levelFilter;
  if (moduleFilter) filter.module = moduleFilter;
  if (searchQuery) filter.search = searchQuery;
  window.photoForge.logRead(selectedDate, Object.keys(filter).length > 0 ? filter : undefined, 1000).then(setEntries);
 }, [selectedDate, levelFilter, moduleFilter, searchQuery]);

 useEffect(() => {
  if (autoScroll && logEndRef.current) {
   logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
 }, [entries, autoScroll]);

 const handleRefresh = () => {
  if (!selectedDate) return;
  const filter: any = {};
  if (levelFilter) filter.level = levelFilter;
  if (moduleFilter) filter.module = moduleFilter;
  if (searchQuery) filter.search = searchQuery;
  window.photoForge.logRead(selectedDate, Object.keys(filter).length > 0 ? filter : undefined, 1000).then(setEntries);
 };

 const handleClear = async () => {
  if (!confirm(tr('settings.clearLogsConfirm'))) return;
  await window.photoForge.logClear();
  setEntries([]);
  setDates([]);
 };

 const handleOpenDir = async () => {
  const dir = await window.photoForge.logDir();
  if (dir) window.photoForge.openFolder(dir);
 };

 const levelColor = (level: string) => {
  switch (level) {
   case 'error':
    return t.danger;
   case 'warn':
    return t.warning;
   case 'info':
    return t.accent;
   case 'debug':
    return t.textTertiary;
   default:
    return t.textSecondary;
  }
 };

 const levelBg = (level: string) => {
  switch (level) {
   case 'error':
    return t.dangerLight;
   case 'warn':
    return t.warningLight;
   default:
    return 'transparent';
  }
 };

 return (
  <div style={styles.panelStack}>
   <SettingsPanel
    theme={t}
    title={tr('settings.logsTitle')}
   >
    <div style={styles.logsToolbar}>
     <select style={{ ...styles.selectInput(t), maxWidth: 180 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
      {dates.map(date => <option key={date} value={date}>{date}</option>)}
     </select>
     <select style={{ ...styles.selectInput(t), maxWidth: 120 }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
      <option value="">{tr('settings.allLevels')}</option>
      <option value="error">Error</option>
      <option value="warn">Warn</option>
      <option value="info">Info</option>
      <option value="debug">Debug</option>
     </select>
     <input
      style={{ ...styles.textInput(t), maxWidth: 150 }}
      placeholder={tr('settings.modulePlaceholder')}
      value={moduleFilter}
      onChange={e => setModuleFilter(e.target.value)}
     />
     <input
      style={{ ...styles.textInput(t), flex: 1, minWidth: 140 }}
      placeholder={tr('settings.searchPlaceholder')}
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
     />
     <button style={styles.logActionBtn(t)} onClick={handleRefresh} aria-label={tr("settings.refreshLogs")}>
      <AppIcon name="refresh" size={14} color={t.textPrimary} />
     </button>
     <button style={styles.logActionBtn(t)} onClick={handleOpenDir} aria-label={tr("settings.openLogsFolder")}>
      <AppIcon name="folder" size={14} color={t.textPrimary} />
     </button>
     <button style={{ ...styles.logActionBtn(t), background: t.dangerLight, borderColor: t.danger }} onClick={handleClear} aria-label={tr("settings.clearLogs")}>
      <AppIcon name="trash" size={14} color={t.danger} />
     </button>
    </div>

    <div style={styles.logPanel(t)}>
     {entries.length === 0 && (
      <div style={styles.logEmpty(t)}>{tr('settings.noLogs')}</div>
     )}
     {entries.map((entry, index) => (
      <div key={`${entry.ts}-${index}`} style={styles.logRow(t, levelBg(entry.level))}>
       <span style={styles.logMeta(t)}>{entry.ts.slice(11, 19)}</span>
       <span style={{ color: levelColor(entry.level), minWidth: 48, fontWeight: 700, flexShrink: 0 }}>
        [{entry.level.toUpperCase()}]
       </span>
       <span style={{ color: t.accent, minWidth: 110, fontWeight: 600, flexShrink: 0 }}>
        [{entry.module}]
       </span>
       <span style={{ color: t.textPrimary, flex: 1, minWidth: 0 }}>
        {entry.msg}
        {entry.data && (
         <span style={{ color: t.textTertiary, marginLeft: SPACING.sm }}>
          {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)}
         </span>
        )}
       </span>
      </div>
     ))}
     <div ref={logEndRef} />
    </div>

    <div style={styles.logCount(t)}>
     {tr('settings.logCount').replace('{count}', String(entries.length))} · {tr('settings.logSaveLocation')}
    </div>
   </SettingsPanel>
  </div>
 );
};
