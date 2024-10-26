import { ComputedRef, Reactive } from "vue";
import { Cursor, ETools } from "./enum";
import { ILedControllers } from "@/views/index.type";

export type Value = any;

export interface ITools {
  label: string;
  code: ETools;
  icon: string;
}

// key 监听事件 value 事件参数
export interface IPixelsEventListener {
  /**
   * 鼠标样式切换
   */
  ToggleCursor: { cursor: Cursor; }

  /**
   * 箭头选择区域
   */
  ToggleArea: { w: number, h: number, start: IRealisticPoint, end: IRealisticPoint }

  /**
   * 关闭区域
   */
  ToggleAreaClose: unknown;
  /**
   * 区域结束，返回区域坐标
   */
  ToggleAreaEnd: { start: IRealisticPoint, end: IRealisticPoint }

  /**
  * 画布移动
  */
  ToggleMove: IRealisticPoint;
}

//屏幕真实坐标
export interface IRealisticPoint {
  x: number;
  y: number;
}

//画布坐标
export interface ICanvasPoint {
  x: number;
  y: number;
}

//二维坐标
export interface Point {
  x: number;
  y: number;
}

export interface ICanvasConfig {
  mode: ETools;
}

export type RICanvasConfig = ComputedRef<ICanvasConfig>;