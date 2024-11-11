import { ICanvasPoint, IFunctionInterFace, IGraphicPatch, IRealisticPoint, Value } from "../pixel.type";
import { EGraphicMoveTools } from "./dragItem";

export type IGraphicSets = "LedLayout" | "Image";

// 图形一般方法
export interface IGraphic {
  draw: (type?: Value) => void;
  graphicConfig?: IGraphicConfig;                     //图形配置
  pointContainer?: (x: number, y: number) => boolean;                             //判断点是否在图形内部
  translate?: (start: IRealisticPoint, end: IRealisticPoint) => void;             //图形位移
  getBoundaryRect?: () => GraphicRect,            //图形外接矩形
  setBoundaryRect?: (rect: GraphicRect) => void,   //设置图形外接矩形
  clone?: () => canvasGraphic;
  snapShot?: () => void;                         //保存快照
  undoSnapShotStack?: any[];                          //撤销栈
  redoSnapShotStack?: any[];                          //恢复栈
  //导入,导出
  import?: () => void;
  export?: () => Promise<IExportObject> | IExportObject;
}

export interface IGraphicTools {
  util: EGraphicMoveTools
}

//图形配置
export interface IGraphicConfig {
  GRAPHIC_MOVE?: boolean;    //是否可拖动
  GRAPHIC_RESIZE?: boolean;    //是否可缩放
  GRAPHIC_ROTATE?: boolean;  //是否可旋转
}

export interface Graphics<T = canvasGraphic> {
  id: string;
  graphic: T;
  children?: Graphics[],
  priority?: number;
  isremoved?: boolean;
}

export type GraphicRect = { width: number, height: number, begin: ICanvasPoint };

export type canvasGraphic = IGraphic & IFunctionInterFace<IGraphicPatch>;

export type GraphicTools = IGraphic & IFunctionInterFace<IGraphicPatch> & IGraphicTools;

export interface IExportObject {
  type: IGraphicSets,
  data: Record<string, Value>;
  [key: string]: Value;
}