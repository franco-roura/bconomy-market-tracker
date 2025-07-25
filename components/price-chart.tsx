"use client";

import { ChartContainer } from "@/components/ui/chart";
import { bcFormatter } from "@/lib/utils";
import {
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CandlestickData = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  id: number;
  item_id: number;
};

type PriceChartProps = {
  data: Array<CandlestickData>;
};

// Custom candlestick shape for Scatter
const CandlestickShape = (props: {
  cx?: number;
  cy?: number;
  payload?: any;
  yAxis?: any;
  xAxis?: any;
}) => {
  const { cx, cy, payload, yAxis } = props;
  if (!payload || !cx || !yAxis) return <g />;
  const { open, close, high, low } = payload;
  const isGrowing = open < close;
  let color;
  if (open === close) {
    color = "#6b7280";
  } else if (isGrowing) {
    color = "#22c55e";
  } else {
    color = "#ef4444";
  }

  // yAxis.scale maps value to pixel
  const yScale = yAxis?.scale;
  if (!yScale) return <g />;
  const highY = yScale(high);
  const lowY = yScale(low);
  const openY = yScale(open);
  const closeY = yScale(close);
  const candleWidth = 8;
  const candleHeight = Math.abs(closeY - openY);
  const candleY = Math.min(openY, closeY);

  return (
    <g>
      {/* Wick */}
      <line
        x1={cx}
        y1={highY}
        x2={cx}
        y2={lowY}
        stroke={color}
        strokeWidth={2}
      />
      {/* Body */}
      <rect
        x={cx - candleWidth / 2}
        y={candleY}
        width={candleWidth}
        height={Math.max(candleHeight, 1)}
        fill={isGrowing ? color : "#fff"}
        stroke={color}
        strokeWidth={2}
      />
    </g>
  );
};

export function PriceChart(props: PriceChartProps) {
  // Custom tooltip to show OHLC data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const utcString = new Date(label).toLocaleTimeString([], {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
      });
      const localString = new Date(label).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      });
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="text-sm">
            <strong>{utcString} UTC</strong>
            <br />
            <span className="text-xs text-gray-500">
              ({localString} your time)
            </span>
          </p>
          <hr className="my-2" />
          <p className="text-sm">
            <strong>Open:</strong> {bcFormatter.format(data.open)}
          </p>
          <p className="text-sm">
            <strong>High:</strong> {bcFormatter.format(data.high)}
          </p>
          <p className="text-sm">
            <strong>Low:</strong> {bcFormatter.format(data.low)}
          </p>
          <p className="text-sm">
            <strong>Close:</strong> {bcFormatter.format(data.close)}
          </p>
        </div>
      );
    }
    return null;
  };
  const verticalDomain = props.data.reduce(
    (acc, curr) => {
      return [Math.min(acc[0], curr.low), Math.max(acc[1], curr.high)];
    },
    [props.data[0]?.low ?? 0, props.data[0]?.high ?? 0],
  );
  const horizontalDomain = props.data.reduce(
    (acc, curr) => {
      return [
        Math.min(acc[0], new Date(curr.timestamp).getTime()),
        Math.max(acc[1], new Date(curr.timestamp).getTime()),
      ];
    },
    [
      new Date(props.data[0]?.timestamp).getTime(),
      new Date(props.data[0]?.timestamp).getTime(),
    ],
  );
  return (
    <ChartContainer config={{}} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={props.data}>
          <XAxis
            dataKey={(data) => new Date(data.timestamp).getTime()}
            type="number"
            domain={[
              horizontalDomain[0] - 30 * 60 * 1000,
              horizontalDomain[1] + 30 * 60 * 1000,
            ]}
            tickFormatter={(value) =>
              new Date(value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          <YAxis domain={verticalDomain} tickFormatter={bcFormatter.format} />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={props.data} dataKey="close" shape={CandlestickShape} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
