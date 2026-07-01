import React, { useMemo } from 'react';
import { PhotoFile } from '../../shared/types';
import { Theme, SPACING, RADIUS, TYPO, SHADOW, TRANSITION, DURATION, EASING } from '../styles/theme';
import { useI18n } from '../i18n';
import { AppIcon } from './AppIcon';

interface StatisticsViewProps {
  photos: PhotoFile[];
  onBack: () => void;
  theme: Theme;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ photos, onBack, theme: t }) => {
  const { t: tr } = useI18n();

  const stats = useMemo(() => {
    const totalSize = photos.reduce((sum, photo) => sum + photo.fileSize, 0);
    const formatCounts: Record<string, number> = {};
    const cameraCounts: Record<string, number> = {};
    const ratingCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const labelCounts: Record<string, number> = { none: 0, red: 0, yellow: 0, green: 0, blue: 0, purple: 0 };
    const monthCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let favoriteCount = 0;
    let presetCount = 0;
    let referencedCount = 0;

    for (const photo of photos) {
      formatCounts[photo.fileFormat] = (formatCounts[photo.fileFormat] || 0) + 1;
      if (photo.cameraModel) {
        const cmStat = photo.cameraModel || '';
        if (cmStat) cameraCounts[cmStat] = (cameraCounts[cmStat] || 0) + 1;
      }
      ratingCounts[photo.rating] = (ratingCounts[photo.rating] || 0) + 1;
      labelCounts[photo.colorLabel] = (labelCounts[photo.colorLabel] || 0) + 1;
      if (photo.isFavorite) favoriteCount++;
      if (photo.presetApplied) presetCount++;
      if (photo.isReferenced) referencedCount++;
      for (const tag of photo.tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      if (photo.dateTaken) {
        const month = photo.dateTaken.slice(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    }

    return {
      totalSize,
      favoriteCount,
      presetCount,
      referencedCount,
      topFormats: Object.entries(formatCounts).sort((a, b) => b[1] - a[1]),
      topCameras: Object.entries(cameraCounts).sort((a, b) => b[1] - a[1]).slice(0, 6),
      topTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      ratingCounts,
      labelCounts,
      monthlyTimeline: Object.entries(monthCounts).sort((a, b) => a[0].localeCompare(b[0])).slice(-12),
    };
  }, [photos]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  const maxMonthly = Math.max(...stats.monthlyTimeline.map(([, count]) => count), 1);
  const maxRating = Math.max(...Object.values(stats.ratingCounts), 1);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${t.bgPhotoStage}, ${t.bgPrimary})` }}>
      {/* Sticky header */}
      <div style={{ ...styles.header(t), flexShrink: 0, padding: `${SPACING.xl}px ${SPACING.md}px ${SPACING.sm}px`, background: t.bgPhotoStage, borderBottom: `1px solid ${t.borderLight}` }}>
        <button style={styles.backBtn(t)} onClick={onBack}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACING.xs }}>
            <AppIcon name="back" size={14} color={t.textPrimary} />
            {tr('stats.back')}
          </span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.eyebrow(t)}>{tr('stats.eyebrow')}</div>
          <h2 style={styles.pageTitle(t)}>{tr('stats.title')}</h2>
        </div>
      </div>


      {/* Scrollable analytics */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${SPACING.sm}px ${SPACING.md}px ${SPACING.md}px 0`, minHeight: 0 }}>
      <section style={styles.metricsGrid}>
        <MetricCard theme={t} icon="camera" label={tr('stats.totalPhotos')} value={String(photos.length)} />
        <MetricCard theme={t} icon="folder" label={tr('stats.totalSize')} value={formatBytes(stats.totalSize)} />
        <MetricCard theme={t} icon="star" label={tr('stats.favorites')} value={String(stats.favoriteCount)} accent="favorite" />
        <MetricCard theme={t} icon="sparkles" label={tr('stats.withPreset')} value={String(stats.presetCount)} />
        <MetricCard theme={t} icon="link" label={tr('stats.referenced')} value={String(stats.referencedCount)} />
        <MetricCard theme={t} icon="filter" label={tr('stats.formats')} value={String(stats.topFormats.length)} />
      </section>

      <section style={styles.analyticsGrid}>
        {stats.monthlyTimeline.length > 0 && (
          <Panel theme={t} title={tr('stats.monthlyTimeline')}>
            <div style={styles.timelineWrap}>
              {stats.monthlyTimeline.map(([month, count]) => (
                <div key={month} style={styles.timelineColumn}>
                  <div style={styles.timelineCount(t)}>{count}</div>
                  <div style={styles.timelineTrack(t)}>
                    <div
                      style={{
                        ...styles.timelineBar(t),
                        height: `${Math.max(8, (count / maxMonthly) * 94)}px`,
                      }}
                    />
                  </div>
                  <div style={styles.timelineLabel(t)}>{month.slice(5)}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel theme={t} title={tr('stats.ratingDistribution')}>
          <div style={styles.ratingStack}>
            {[5, 4, 3, 2, 1, 0].map(rating => (
              <div key={rating} style={styles.ratingRow}>
                <div style={styles.ratingLabel(t)}>{rating === 0 ? tr('stats.unrated') : `${rating}/5`}</div>
                <div style={styles.ratingTrack(t)}>
                  <div
                    style={{
                      ...styles.ratingBar(t, rating === 0),
                      width: `${Math.max(stats.ratingCounts[rating] > 0 ? 6 : 0, (stats.ratingCounts[rating] / maxRating) * 100)}%`,
                    }}
                  />
                </div>
                <div style={styles.ratingValue(t)}>{stats.ratingCounts[rating]}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel theme={t} title={tr('stats.formatDistribution')}>
          <div style={styles.pillWrap}>
            {stats.topFormats.map(([format, count]) => (
              <div key={format} style={styles.dataPill(t)}>
                <span style={styles.pillKey(t)}>{format}</span>
                <span style={styles.pillValue(t)}>{count}</span>
                <span style={styles.pillMeta(t)}>{((count / Math.max(photos.length, 1)) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {stats.topCameras.length > 0 && (
          <Panel theme={t} title={tr('stats.topCameras')}>
            <div style={styles.listStack}>
              {stats.topCameras.map(([camera, count], index) => (
                <div key={camera} style={styles.listRow(t)}>
                  <span style={styles.indexBadge(t)}>{index + 1}</span>
                  <span style={{ ...styles.listText(t), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camera}</span>
                  <span style={styles.listMeta(t)}>{count}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {stats.topTags.length > 0 && (
          <Panel theme={t} title={tr('stats.topTags')}>
            <div style={styles.tagWrap}>
              {stats.topTags.map(([tag, count]) => (
                <span key={tag} style={styles.tagChip(t)}>{tag} ({count})</span>
              ))}
            </div>
          </Panel>
        )}

        <Panel theme={t} title={tr('stats.colorLabels')}>
          <div style={styles.labelGrid}>
            {Object.entries(stats.labelCounts).filter(([label]) => label !== 'none').map(([label, count]) => (
              <div key={label} style={styles.labelCard(t)}>
                <div
                  style={{
                    ...styles.labelDot(t),
                    background: t[`colorLabel${label.charAt(0).toUpperCase() + label.slice(1)}` as keyof Theme] as string || t.textTertiary,
                  }}
                />
                <div style={styles.labelName(t)}>{label}</div>
                <div style={styles.labelCount(t)}>{count}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      </div>
    </div>
  );
};

const Panel: React.FC<{ theme: Theme; title: string; subtitle?: string; children: React.ReactNode }> = ({ theme: t, title, subtitle, children }) => (
  <section style={styles.panel(t)}>
    <div style={styles.panelHeader(t)}>
      <div style={styles.panelTitle(t)}>{title}</div>
      {subtitle ? <div style={styles.panelSubtitle(t)}>{subtitle}</div> : null}
    </div>
    {children}
  </section>
);

const MetricCard: React.FC<{
  theme: Theme;
  icon: 'camera' | 'folder' | 'star' | 'sparkles' | 'link' | 'filter';
  label: string;
  value: string;
  accent?: 'favorite';
}> = ({ theme: t, icon, label, value, accent }) => (
  <div style={styles.metricCard(t)}>
    <div style={styles.metricIconWrap(t, accent === 'favorite')}>
      <AppIcon name={icon} size={20} color={accent === 'favorite' ? t.favStar : t.accent} filled={accent === 'favorite'} />
    </div>
    <div style={styles.metricValue(t)}>{value}</div>
    <div style={styles.metricLabel(t)}>{label}</div>
  </div>
);

const styles = {
  shell: (t: Theme): React.CSSProperties => ({
    flex: 1,
    overflowY: 'auto',
    background: `linear-gradient(180deg, ${t.bgPhotoStage}, ${t.bgPrimary})`,
    padding: `${SPACING.xl}px ${SPACING.md}px ${SPACING.md}px`,
  }),
  header: (t: Theme): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  }),
  eyebrow: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.tiny.size,
    color: t.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  }),
  pageTitle: (t: Theme): React.CSSProperties => ({
    margin: 0,
    fontSize: TYPO.heading.size,
    fontWeight: 700,
    color: t.textPrimary,
  }),
  backBtn: (t: Theme): React.CSSProperties => ({
    padding: `${SPACING.sm}px ${SPACING.lg}px`,
    borderRadius: 12,
    background: `linear-gradient(180deg, ${t.bgSecondary}, ${t.bgSecondary})`,
    color: t.textPrimary,
    cursor: 'pointer',
    fontSize: TYPO.body.size,
    boxShadow: SHADOW.sm,
    transition: TRANSITION.all,
  }),
  hero: (t: Theme): React.CSSProperties => ({
    padding: `${SPACING.xl}px ${SPACING.xxl}px`,
    borderRadius: RADIUS.xl,
    background: `linear-gradient(135deg, rgba(201,146,81,0.18), rgba(201,146,81,0.05) 48%, rgba(21,17,15,0.92) 100%)`,
    boxShadow: SHADOW.lg,
    marginBottom: SPACING.xl,
  }),
  heroBadge: (t: Theme): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${SPACING.xs}px ${SPACING.md}px`,
    borderRadius: RADIUS.pill,
    background: t.bgPrimary,
    color: t.accent,
    fontSize: TYPO.tiny.size,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  }),
  heroTitle: (t: Theme): React.CSSProperties => ({
    fontSize: 30,
    fontWeight: 700,
    color: t.textPrimary,
    lineHeight: 1.16,
    maxWidth: 760,
  }),
  heroBody: (t: Theme): React.CSSProperties => ({
    margin: `${SPACING.md}px 0 0`,
    fontSize: TYPO.body.size,
    lineHeight: 1.7,
    color: t.textSecondary,
    maxWidth: 760,
  }),
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  } as React.CSSProperties,
  metricCard: (t: Theme): React.CSSProperties => ({
    padding: `${SPACING.lg}px`,
    borderRadius: RADIUS.lg,
    background: `linear-gradient(180deg, ${t.bgCard}, ${t.bgSecondary})`,
    boxShadow: SHADOW.md,
    transition: TRANSITION.all,
  }),
  metricIconWrap: (t: Theme, favorite = false): React.CSSProperties => ({
    width: 44,
    height: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    background: favorite ? t.warningLight : t.accentBg,
    marginBottom: SPACING.sm,
  }),
  metricValue: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.display.size,
    fontWeight: TYPO.display.weight,
    color: t.textPrimary,
    lineHeight: 1.15,
  }),
  metricLabel: (t: Theme): React.CSSProperties => ({
    marginTop: SPACING.xs,
    fontSize: TYPO.small.size,
    color: t.textSecondary,
  }),
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: SPACING.xl,
  } as React.CSSProperties,
  panel: (t: Theme): React.CSSProperties => ({
    padding: `${SPACING.xl}px`,
    borderRadius: RADIUS.xl,
    background: `linear-gradient(180deg, ${t.bgCard}, ${t.bgSecondary})`,
    boxShadow: SHADOW.lg,
  }),
  panelHeader: (t: Theme): React.CSSProperties => ({
    marginBottom: SPACING.lg,
  }),
  panelTitle: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.subheading.size,
    fontWeight: 700,
    color: t.textPrimary,
    marginBottom: 2,
  }),
  panelSubtitle: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.caption.size,
    color: t.textTertiary,
  }),
  timelineWrap: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    minHeight: 148,
  } as React.CSSProperties,
  timelineColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.xs,
  } as React.CSSProperties,
  timelineCount: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.caption.size,
    color: t.textSecondary,
  }),
  timelineTrack: (t: Theme): React.CSSProperties => ({
    width: '100%',
    height: 104,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    background: t.bgSecondary,
    borderRadius: 14,
    padding: `0 ${SPACING.xs}px ${SPACING.xs}px`,
  }),
  timelineBar: (t: Theme): React.CSSProperties => ({
    width: '100%',
    background: `linear-gradient(180deg, ${t.accentHover}, ${t.accent})`,
    borderRadius: 10,
    transition: `height ${DURATION.normal}ms ${EASING.out}`,
  }),
  timelineLabel: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.tiny.size,
    color: t.textTertiary,
  }),
  ratingStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  } as React.CSSProperties,
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  } as React.CSSProperties,
  ratingLabel: (t: Theme): React.CSSProperties => ({
    width: 54,
    fontSize: TYPO.small.size,
    color: t.textSecondary,
    textAlign: 'right',
    flexShrink: 0,
  }),
  ratingTrack: (t: Theme): React.CSSProperties => ({
    flex: 1,
    height: 16,
    background: t.bgSecondary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  }),
  ratingBar: (t: Theme, unrated = false): React.CSSProperties => ({
    height: '100%',
    background: unrated ? t.textTertiary : `linear-gradient(180deg, ${t.warning}, ${t.accent})`,
    borderRadius: RADIUS.sm,
    transition: `width ${DURATION.slow}ms ${EASING.out}`,
  }),
  ratingValue: (t: Theme): React.CSSProperties => ({
    width: 28,
    textAlign: 'right',
    fontSize: TYPO.caption.size,
    color: t.textTertiary,
    flexShrink: 0,
  }),
  pillWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  } as React.CSSProperties,
  dataPill: (t: Theme): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    borderRadius: 14,
    background: t.bgSecondary,
  }),
  pillKey: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.small.size,
    fontWeight: 700,
    color: t.accent,
    textTransform: 'uppercase',
  }),
  pillValue: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.small.size,
    color: t.textPrimary,
  }),
  pillMeta: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.tiny.size,
    color: t.textTertiary,
  }),
  listStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  } as React.CSSProperties,
  listRow: (t: Theme): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    borderRadius: 14,
    background: t.bgSecondary,
  }),
  indexBadge: (t: Theme): React.CSSProperties => ({
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    background: t.accentBg,
    color: t.accent,
    fontSize: TYPO.caption.size,
    fontWeight: 700,
    flexShrink: 0,
  }),
  listText: (t: Theme): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    fontSize: TYPO.small.size,
    color: t.textPrimary,
  }),
  listMeta: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.caption.size,
    color: t.textTertiary,
    flexShrink: 0,
  }),
  tagWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  } as React.CSSProperties,
  tagChip: (t: Theme): React.CSSProperties => ({
    padding: `${SPACING.xs}px ${SPACING.md}px`,
    borderRadius: RADIUS.pill,
    background: t.accentBg,
    color: t.accent,
    fontSize: TYPO.small.size,
    fontWeight: 600,
  }),
  labelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
    gap: SPACING.md,
  } as React.CSSProperties,
  labelCard: (t: Theme): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.md}px`,
    borderRadius: 16,
    background: t.bgSecondary,
  }),
  labelDot: (t: Theme): React.CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    boxShadow: '0 0 0 4px rgba(0,0,0,0.16)',
  }),
  labelName: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.caption.size,
    color: t.textTertiary,
    textTransform: 'capitalize',
  }),
  labelCount: (t: Theme): React.CSSProperties => ({
    fontSize: TYPO.subheading.size,
    fontWeight: 700,
    color: t.textPrimary,
  }),
};
