import * as React from 'react';
import { parsePrometheusDuration } from '@openshift-console/plugin-shared/src/datetime/prometheus';
import {
  ChartLineProps,
  ChartProps,
  Chart,
  ChartAxis,
  ChartBar,
  ChartGroup,
  ChartLine,
  ChartScatter,
  ChartThemeColor,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import * as _ from 'lodash';
import { DomainPropType, DomainTuple } from 'victory-core';
import { DEFAULT_CHART_HEIGHT } from '../../const';
import { formatDate, formatValue, getXaxisValues } from '../pipeline-metrics-utils';

type TimeSeriesChart = {
  timespan: number;
  bar?: boolean;
  yTickFormatter?: (v: number) => string;
};

type DomainType = { x?: DomainTuple; y?: DomainTuple };

export const TimeSeriesChart: React.FC<TimeSeriesChart & ChartProps & ChartLineProps> = ({
  data = null,
  timespan,
  bar = true,
  width,
  themeColor,
  ariaDesc,
  ariaTitle,
  domain,
  yTickFormatter,
  containerComponent,
}) => {
  const startTimespan = timespan - parsePrometheusDuration('1d');
  const endDate = new Date(Date.now()).setHours(0, 0, 0, 0);
  const startDate = new Date(Date.now() - startTimespan).setHours(0, 0, 0, 0);
  const { x: domainX, y: domainY } = (domain as DomainType) || {};
  const domainValue: DomainPropType = {
    x: domainX || [startDate, endDate],
    y: domainY || undefined,
  };
  let yTickFormat = formatValue;
  const tickValues = getXaxisValues(timespan);
  const gData: { [x: string]: any }[] = data.filter((values) => !!values);

  if (!domainY) {
    let minY: number = _.minBy(gData, 'y')?.y ?? 0;
    let maxY: number = _.maxBy(gData, 'y')?.y ?? 0;
    if (minY === 0 && maxY === 0) {
      minY = -1;
      maxY = 1;
    } else if (minY > 0 && maxY > 0) {
      minY = 0;
    } else if (minY < 0 && maxY < 0) {
      maxY = 0;
    }
    domainValue.y = [minY, maxY];
    if (Math.abs(maxY - minY) < 0.005) {
      yTickFormat = (v: number) => (v === 0 ? '0' : v.toExponential(1));
    }
  }

  const xTickFormat = (d) => formatDate(d);
  let xAxisStyle: any = {
    tickLabels: {
      fill: 'var(--pf-t--global--text--color--regular)',
    },
  };
  if (tickValues.length > 7 || width < 225) {
    xAxisStyle = {
      tickLabels: {
        fill: 'var(--pf-t--global--text--color--regular)',
        angle: 320,
        fontSize: 10,
        textAnchor: 'end',
        verticalAnchor: 'end',
      },
    };
  }
  const OVERLAP = 20;
  const chart = (
    <Chart
      ariaDesc={ariaDesc}
      ariaTitle={ariaTitle}
      containerComponent={
        containerComponent || (
          <ChartVoronoiContainer
            labels={({ datum }) =>
              datum.name.includes('scatter-') ? `${formatDate(datum.x)}: ${datum.y}` : null
            }
            constrainToVisibleArea
          />
        )
      }
      domain={domainValue}
      domainPadding={{ x: 10, y: 10 }}
      scale={{ x: 'time', y: 'linear' }}
      legendPosition="bottom"
      height={DEFAULT_CHART_HEIGHT}
      padding={{
        bottom: 50,
        left: 50,
        right: 20,
        top: 30 + OVERLAP,
      }}
      themeColor={themeColor || ChartThemeColor.blue}
      width={width}
    >
      <ChartAxis style={xAxisStyle} tickValues={tickValues} tickFormat={xTickFormat} />
      <ChartAxis
        dependentAxis
        showGrid
        tickFormat={yTickFormatter || yTickFormat}
        style={{
          tickLabels: {
            fill: 'var(--pf-t--global--text--color--regular)',
          },
        }}
      />
      <ChartGroup>
        {!bar &&
          Object.values(gData).map((d, index) => (
            <ChartScatter
              groupComponent={<g />}
              key={`scatter-${index}`} // eslint-disable-line react/no-array-index-key
              name={`scatter-${index}`}
              data={[d]}
            />
          ))}
      </ChartGroup>
      <ChartGroup>
        {bar ? (
          <ChartBar alignment="middle" key="bar" data={gData} />
        ) : (
          gData.map((line, index) => (
            <ChartLine
              groupComponent={<g />}
              key={`line-${index}`} // eslint-disable-line react/no-array-index-key
              name={`line-${index}`}
              data={[line]}
            />
          ))
        )}
      </ChartGroup>
    </Chart>
  );

  return <div style={{ marginTop: OVERLAP * -1 }}>{chart}</div>;
};
