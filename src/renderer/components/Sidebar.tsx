import React, { useMemo, useState } from 'react';
import { FilterCriteria, PhotoFile, ImportBatch } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, DURATION, EASING, TRANSITION, SHADOW } from '../styles/theme';
import { COLOR_LABEL_COLORS } from '../../shared/constants';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface SidebarProps {
  collapsed: boolean;
  filter: FilterCriteria;
  photos: PhotoFile[];
  onFilterChange: (filter: FilterCriteria) => void;
  theme: Theme;
  recentImports?: ImportBatch[];
  onSelectBatch?: (photoIds: string[]) => void;
}

type ExpandKey = 'recentImports' | 'formats' | 'labels' | 'cameras';
export const SIDEBAR_WIDTH = 272;

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, filter, photos, onFilterChange, theme: t, recentImports = [], onSelectBatch }) => {
  const { t: tr, lang } = useI18n();
  const [expanded, setExpanded] = useState<Record<ExpandKey, boolean>>({
    recentImports: true,
    formats: true,
    labels: true,
    cameras: true,
  });
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const formatCounts: Record<string, number> = {};
    const cameraCounts: Record<string, number> = {};
    for (const photo of photos) {
      formatCounts[photo.fileFormat] = (formatCounts[photo.fileFormat] || 0) + 1;
      if (photo.cameraModel) {
        const cm = photo.cameraModel || '';
        if (cm) cameraCounts[cm] = (cameraCounts[cm] || 0) + 1;
      }
    }
    return {
      formatCounts,
      cameraCounts,
      favoriteCount: photos.filter(photo => photo.isFavorite).length,
      labelCounts: Object.fromEntries(
        Object.keys(COLOR_LABEL_COLORS)
          .filter(key => key !== 'none')
          .map(key => [key, photos.filter(photo => photo.colorLabel === key).length])
      ) as Record<string, number>,
    };
  }, [photos]);

  const labelNames: Record<string, string> = {
    red: tr('sidebar.labelRed'),
    yellow: tr('sidebar.labelYellow'),
    green: tr('sidebar.labelGreen'),
    blue: tr('sidebar.labelBlue'),
    purple: tr('sidebar.labelPurple'),
  };

  if (collapsed) {
    const compactItems = [
      { icon: 'filter' as const, title: tr('sidebar.format') },
      { icon: 'tag' as const, title: tr('sidebar.colorLabel') },
      { icon: 'camera' as const, title: tr('sidebar.camera') },
      { icon: 'star' as const, title: tr('sidebar.favorites'), active: filter.onlyFavorites, onClick: () => onFilterChange({ ...filter, onlyFavorites: !filter.onlyFavorites }) },
    ];

    return (
      <aside style={styles.collapsedShell(t)}>
        {compactItems.map((item, index) => (
          <button
            key={`${item.title}-${index}`}
            title={item.title}
            style={styles.compactBtn(t, Boolean(item.active))}
            onClick={item.onClick}
          >
            <AppIcon name={item.icon} size={16} color={item.active ? t.accent : t.textSecondary} />
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside style={styles.sidebar(t)}>
      {/* Fixed: hero + favorites always visible at top */}
      <div style={styles.fixedHeader(t)}>
        <div style={styles.heroTitle(t)}>{tr('sidebar.filter')}</div>

        <div style={styles.favoritesWrap(t)}>
          <button
            style={styles.favoriteBtn(t, filter.onlyFavorites)}
            onClick={() => onFilterChange({ ...filter, onlyFavorites: !filter.onlyFavorites })}
          >
            <span style={styles.favoriteIcon(t, filter.onlyFavorites)}>
              <AppIcon name="star" size={14} color={filter.onlyFavorites ? t.favStar : t.textSecondary} />
            </span>
            <span style={{ flex: 1 }}>
              <span style={styles.favoriteLabel(t, filter.onlyFavorites)}>{tr('sidebar.favorites')}</span>

            </span>
            <span style={styles.countPill(t, filter.onlyFavorites)}>{stats.favoriteCount}</span>
          </button>
        </div>
      </div>

      {/* Scrollable: filter sections */}
      <div style={styles.scrollArea(t)}>
        <Section
          theme={t}
          title={tr('sidebar.recentImports')}
          icon="clock"
          expanded={expanded.recentImports}
          onToggle={() => setExpanded(prev => ({ ...prev, recentImports: !prev.recentImports }))}
        >
          {recentImports.filter(batch => batch.photoIds.some(id => photos.some(p => p.id === id))).slice(0, 5).map(batch => {
            const validPhotoIds = batch.photoIds.filter(id => photos.some(p => p.id === id));
            const date = new Date(batch.timestamp);
            const dateStr = date.toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const label = tr("sidebar.importBatch").replace("{date}", dateStr).replace("{count}", String(validPhotoIds.length));
            const activeBatch = selectedBatchId === batch.id;
            return (
              <button key={batch.id} style={styles.rowBtn(t, activeBatch)} onClick={() => { setSelectedBatchId(batch.id); onSelectBatch?.(validPhotoIds); }}>
                <span style={styles.rowLabel(t)}>{label}</span>
                <span style={styles.rowCount(t, activeBatch)}>{validPhotoIds.length}</span>
              </button>
            );
          })}
        </Section>

        <Section
          theme={t}
          title={tr('sidebar.format')}
          icon="filter"
          expanded={expanded.formats}
          onToggle={() => setExpanded(prev => ({ ...prev, formats: !prev.formats }))}
        >
          {Object.entries(stats.formatCounts).sort((a, b) => b[1] - a[1]).map(([format, count]) => {
            const active = filter.formats.includes(format);
            return (
              <button
                key={format}
                style={styles.rowBtn(t, active)}
                onClick={() => {
                  const formats = active ? filter.formats.filter(item => item !== format) : [...filter.formats, format];
                  onFilterChange({ ...filter, formats });
                }}
              >
                <span style={styles.rowLabel(t, active)}>{format}</span>
                <span style={styles.rowCount(t, active)}>{count}</span>
              </button>
            );
          })}
        </Section>

        <Section
          theme={t}
          title={tr('sidebar.colorLabel')}
          icon="tag"
          expanded={expanded.labels}
          onToggle={() => setExpanded(prev => ({ ...prev, labels: !prev.labels }))}
        >
          {Object.entries(COLOR_LABEL_COLORS).filter(([key]) => key !== 'none').map(([label, color]) => {
            const active = filter.colorLabels.includes(label);
            return (
              <button
                key={label}
                style={styles.rowBtn(t, active)}
                onClick={() => {
                  const labels = active ? filter.colorLabels.filter(item => item !== label) : [...filter.colorLabels, label];
                  onFilterChange({ ...filter, colorLabels: labels });
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: RADIUS.pill, background: color, display: 'inline-block', flexShrink: 0 }} />
                <span style={styles.rowLabel(t, active)}>{labelNames[label] || label}</span>
                <span style={styles.rowCount(t, active)}>{stats.labelCounts[label] || 0}</span>
              </button>
            );
          })}
        </Section>

        <Section
          theme={t}
          title={tr('sidebar.camera')}
          icon="camera"
          expanded={expanded.cameras}
          onToggle={() => setExpanded(prev => ({ ...prev, cameras: !prev.cameras }))}
        >
          {Object.entries(stats.cameraCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([model, count]) => {
            const active = filter.cameraModels.includes(model);
            return (
              <button
                key={model}
                style={styles.rowBtn(t, active)}
                onClick={() => {
                  const models = active ? filter.cameraModels.filter(item => item !== model) : [...filter.cameraModels, model];
                  onFilterChange({ ...filter, cameraModels: models });
                }}
              >
                <span style={{ ...styles.rowLabel(t, active), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model}</span>
                <span style={styles.rowCount(t, active)}>{count}</span>
              </button>
            );
          })}
        </Section>
      </div>
    </aside>
  );
};

const Section: React.FC<{
  theme: Theme;
  title: string;
  icon: 'clock' | 'filter' | 'tag' | 'camera';
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ theme: t, title, icon, expanded, onToggle, children }) => (
  <section style={styles.section(t)}>
    <button style={styles.sectionHeader(t)} onClick={onToggle}>
      <span style={styles.sectionHeaderLeft(t)}>
        <span style={styles.sectionHeaderIcon(t)}>
          <AppIcon name={icon} size={13} color={t.textSecondary} />
        </span>
        <span style={styles.sectionTitle(t)}>{title}</span>
      </span>
      <span style={{ ...styles.sectionChevron(t), transform: expanded ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
        <AppIcon name="back" size={10} color={t.textTertiary} />
      </span>
    </button>
    <div
      style={{
        maxHeight: expanded ? 900 : 0,
        overflow: 'hidden',
        transition: `max-height ${DURATION.normal}ms ${EASING.inOut}`,
      }}
    >
      <div style={styles.sectionBody}>{children}</div>
    </div>
  </section>
);

const styles = {
  collapsedShell: (t: Theme): React.CSSProperties => ({
    width: 60,
    minWidth: 60,
    background: t.sidebarBg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.md,
    padding: `${SPACING.lg}px ${SPACING.xs}`,
    boxShadow: 'none',
  }),
  compactBtn: (t: Theme, active = false): React.CSSProperties => ({
    width: 40,
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    border: 'none',
    background: active ? t.accentBg : t.bgSecondary,
    cursor: 'pointer',
    boxShadow: 'none',
    transition: TRANSITION.all,
  }),
  sidebar: (t: Theme): React.CSSProperties => ({
    width: SIDEBAR_WIDTH,
    minWidth: SIDEBAR_WIDTH,
    height: '100%',
    background: t.sidebarBg,
    padding: `${SPACING.md}px 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
    overflow: 'hidden',
    boxShadow: 'none',
  }),
  fixedHeader: (t: Theme): React.CSSProperties => ({
    flexShrink: 0,
  }),
  heroTitle: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.subheading.size,
    fontWeight: 700,
    color: t.textPrimary,
    padding: `0 ${SPACING.lg}px`,
    marginBottom: SPACING.md,
  }),
  scrollArea: (t: Theme): React.CSSProperties => ({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  }),

  favoritesWrap: (t: Theme): React.CSSProperties => ({
    marginTop: 2,
  }),
  favoriteBtn: (t: Theme, active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    padding: `${SPACING.md}px ${SPACING.lg}px`,
    borderRadius: 16,
    border: 'none',
    background: active ? t.accentBg : t.bgSecondary,
    cursor: 'pointer',
    boxShadow: 'none',
    transition: TRANSITION.all,
    textAlign: 'left',
  }),
  favoriteIcon: (t: Theme, active: boolean): React.CSSProperties => ({
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    background: active ? t.bgPrimary : t.bgSecondary,
    flexShrink: 0,
  }),
  favoriteLabel: (t: Theme, active: boolean): React.CSSProperties => ({
    display: 'block',
    fontSize: TYPO.body.size,
    lineHeight: 1.3,
    fontWeight: 600,
    color: active ? t.textPrimary : t.textSecondary,
    marginBottom: 2,
  }),
  countPill: (t: Theme, active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 28,
    padding: `0 ${SPACING.sm}px`,
    borderRadius: RADIUS.pill,
    background: active ? t.bgPrimary : t.bgSecondary,
    color: active ? t.accent : t.textSecondary,
    fontSize: TYPO.caption.size,
    lineHeight: 1.3,
    fontWeight: 600,
    flexShrink: 0,
  }),
  section: (t: Theme): React.CSSProperties => ({
    borderRadius: RADIUS.lg,
    background: t.bgSecondary,
    overflow: 'hidden',
  }),
  sectionHeader: (t: Theme): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: `${SPACING.md}px ${SPACING.lg}px`,
    background: 'transparent',
    border: 'none',
    color: t.textSecondary,
    cursor: 'pointer',
    textAlign: 'left',
  }),
  sectionHeaderLeft: (t: Theme): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'space-between',  }),
  sectionHeaderIcon: (t: Theme): React.CSSProperties => ({
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    background: t.bgSecondary,
  }),
  sectionTitle: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.small.size,
    color: t.textTertiary,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  }),
  sectionChevron: (t: Theme): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `transform ${DURATION.fast}ms ${EASING.out}`,
  }),
  sectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    padding: '10px ' + SPACING.md + "px 12px " + SPACING.md + "px",
  } as React.CSSProperties,
  rowBtn: (t: Theme, active = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px ' + SPACING.md + "px 10px " + SPACING.md + "px",
    borderRadius: 12,
    border: "1px solid " + (active ? t.accent : 'transparent'),
    background: active ? t.accentBg : 'transparent',
    color: active ? t.accent : t.textSecondary,
    cursor: 'pointer',
    textAlign: 'left',
    transition: TRANSITION.all,
    minHeight: 36,
  }),
  rowLabel: (t: Theme, active = false): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    fontSize: TYPO.body.size,
    lineHeight: 1.3,
    fontWeight: active ? 600 : 400,
    color: active ? t.textPrimary : t.textSecondary,
  }),
  rowCount: (t: Theme, active = false): React.CSSProperties => ({
    flexShrink: 0,
    minWidth: 24,
    textAlign: 'right',
    fontSize: TYPO.caption.size,
    lineHeight: 1.3,
    color: active ? t.accent : t.textTertiary,
  }),
};
