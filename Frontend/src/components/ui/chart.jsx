import * as React from 'react';
import { Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

// ─── Theme ───────────────────────────────────────────────────────────────────
// Maps config keys to CSS variables so recharts components can reference
// var(--color-<key>) in stroke/fill props.

const THEMES = { light: '', dark: '.dark' };

function ChartStyle({ id, config }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color);
  if (!colorConfig.length) return null;

  return (
    <style>{`
      ${Object.entries(THEMES).map(([theme, prefix]) =>
        `${prefix} [data-chart="${id}"] {
          ${colorConfig.map(([key, cfg]) => {
            const color = cfg.theme?.[theme] ?? cfg.color;
            return color ? `--color-${key}: ${color};` : '';
          }).join('\n')}
        }`
      ).join('\n')}
    `}</style>
  );
}

const ChartContext = React.createContext(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used inside ChartContainer');
  return ctx;
}

// ─── ChartContainer ──────────────────────────────────────────────────────────

const ChartContainer = React.forwardRef(function ChartContainer(
  { id, className, children, config, ...props },
  ref
) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          'tw-flex tw-aspect-video tw-justify-center',
          '[&_.recharts-cartesian-axis-tick_text]:tw-fill-[#71717a]',
          '[&_.recharts-cartesian-grid_line[stroke=\'#ccc\']]:tw-stroke-[#e4e4e7]',
          '[&_.recharts-curve.recharts-tooltip-cursor]:tw-stroke-[#e4e4e7]',
          '[&_.recharts-polar-grid_[stroke=\'#ccc\']]:tw-stroke-[#e4e4e7]',
          '[&_.recharts-radial-bar-background-sector]:tw-fill-[#f4f4f5]',
          '[&_.recharts-rectangle.recharts-tooltip-cursor]:tw-fill-[#f4f4f5]',
          '[&_.recharts-reference-line_[stroke=\'#ccc\']]:tw-stroke-[#e4e4e7]',
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

// ─── ChartTooltip ────────────────────────────────────────────────────────────

const ChartTooltip = Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div className={cn(
      'tw-grid tw-min-w-[8rem] tw-items-start tw-gap-1.5 tw-rounded-lg tw-border tw-border-[#e4e4e7] tw-bg-white tw-px-2.5 tw-py-1.5 tw-text-xs tw-shadow-xl',
      className
    )}>
      {!nestLabel && !hideLabel && (
        <div className={cn('tw-font-medium', labelClassName)}>
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}
      <div className="tw-grid tw-gap-1.5">
        {payload.map((item, index) => {
          const key = nameKey || item.name || item.dataKey || 'value';
          const itemConfig = config[key] || {};
          const indicatorColor = color || item.payload?.fill || item.color;

          return (
            <div
              key={item.dataKey}
              className={cn(
                'tw-flex tw-w-full tw-flex-wrap tw-items-stretch tw-gap-2',
                indicator === 'dot' && 'tw-items-center'
              )}
            >
              {formatter && item.value !== undefined && item.name
                ? formatter(item.value, item.name, item, index, item.payload)
                : (
                  <>
                    {itemConfig.icon ? (
                      <itemConfig.icon />
                    ) : !hideIndicator && (
                      <div
                        className={cn(
                          'tw-shrink-0 tw-rounded-[2px] tw-border-[--color-border] tw-bg-[--color-bg]',
                          indicator === 'dot' && 'tw-size-2.5 tw-translate-y-[1px] tw-rounded-full tw-border-none tw-bg-[--color-bg]',
                          indicator === 'line' && 'tw-w-1',
                          indicator === 'dashed' && 'tw-w-0 tw-border-[1.5px] tw-border-dashed tw-bg-transparent'
                        )}
                        style={{
                          '--color-bg': indicatorColor,
                          '--color-border': indicatorColor,
                        }}
                      />
                    )}
                    <div className={cn(
                      'tw-flex tw-flex-1 tw-justify-between tw-leading-none',
                      nestLabel && 'tw-items-end'
                    )}>
                      <div className="tw-grid tw-gap-1.5">
                        {nestLabel && !hideLabel && (
                          <span className={cn('tw-text-[#71717a]', labelClassName)}>
                            {labelFormatter ? labelFormatter(label, payload) : label}
                          </span>
                        )}
                        <span className="tw-text-[#71717a]">
                          {itemConfig.label || item.name}
                        </span>
                      </div>
                      {item.value !== undefined && (
                        <span className="tw-font-mono tw-font-medium tw-tabular-nums tw-text-[#09090b]">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ChartLegend ─────────────────────────────────────────────────────────────

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn(
      'tw-flex tw-items-center tw-justify-center tw-gap-4',
      verticalAlign === 'top' ? 'tw-pb-3' : 'tw-pt-3',
      className
    )}>
      {payload.map((item) => {
        const key = nameKey || item.dataKey || 'value';
        const itemConfig = config[key] || {};
        return (
          <div key={item.value} className="tw-flex tw-items-center tw-gap-1.5">
            {itemConfig.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="tw-size-2 tw-shrink-0 tw-rounded-full"
                style={{ background: item.color }}
              />
            )}
            <span className="tw-text-xs tw-text-[#71717a]" style={{ fontFamily: "'Switzer', sans-serif" }}>
              {itemConfig.label || item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ChartLegend = ({ content, ...props }) => content;

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
