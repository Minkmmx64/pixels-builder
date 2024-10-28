import { IFunctionInterFace, IGraphicPatch } from "../pixel.type";

// 图形一般方法
export interface IGraphic {
  draw: () => void;
  snapShot?: () => void;    //保存版本快照
  snapShotStack?: [];       //快照栈
  undoSnapShot?: () => void; //恢复快照
}

export interface canvasGraphics {
  id: string;
  graphic: canvasGraphic;
  children?: canvasGraphics[]
}

export type canvasGraphic = IGraphic & IFunctionInterFace<IGraphicPatch>;