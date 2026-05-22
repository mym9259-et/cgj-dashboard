declare module "echarts-for-react" {
  import type { CSSProperties } from "react";

  interface ReactEChartsProps {
    option: any;
    style?: CSSProperties;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    theme?: string;
    onChartReady?: (chart: any) => void;
    onEvents?: Record<string, (params: any) => void>;
    opts?: {
      devicePixelRatio?: number;
      renderer?: "canvas" | "svg";
      width?: number | "auto";
      height?: number | "auto";
    };
  }

  const ReactECharts: React.FC<ReactEChartsProps>;
  export default ReactECharts;
}
