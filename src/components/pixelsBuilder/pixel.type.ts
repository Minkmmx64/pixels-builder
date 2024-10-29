import { ComputedRef } from "vue";
import { Cursor, ERelaPosition, ETools } from "./enum";

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
   * 箭头选择区域边框背景颜色，边框颜色
   */
  ToggleArea: { w: number, h: number, start: IRealisticPoint, end: IRealisticPoint, borderColor: string, bgColor: string; }
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

//宿主派发事件
export interface IGraphicPatch {
  //graphic区域选择
  areaSelect: IAreaCHoose;
  //graphic区域删除
  areaDelete: IAreaCHoose;
  //mouseup
  mouseup?: Point;
}

export type IFunctionInterFace<T> = {
  [K in keyof T]: (param: T[K]) => void;
}

export type ICanvasSystemEvent<T = IGraphicPatch> = {
  [K in keyof T as `canvasDispatch:${Capitalize<K & string>}`]: T[K]
}

//区域选择数据
export interface IAreaCHoose {
  areaStart: Point;
  areaEnd: Point;
  pos: ERelaPosition;
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