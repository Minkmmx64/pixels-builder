import { IAreaCHoose, ICanvasPoint } from "../pixel.type";
import { PixelsBuilder } from "../pixelsBuilder";
import { canvasGraphic, GraphicTools } from "./graphics";

export class DragItem implements GraphicTools {

  util!: EGraphicMoveTools;

  static Drag_SIZE = 10;

  constructor(
    util: EGraphicMoveTools,
    public begin: ICanvasPoint,
    public pixelsBuilder: PixelsBuilder
  ) {
    this.util = util;
  }

  areaSelect(param: IAreaCHoose) { }

  areaDelete(param: IAreaCHoose) { }

  draw() {
    this.pixelsBuilder.ctx.beginPath();
    this.pixelsBuilder.ctx.fillStyle = "#007aff";
    this.pixelsBuilder.ctx.fillRect(
      this.begin.x - (DragItem.Drag_SIZE / 2) / this.pixelsBuilder.transform.scale,
      this.begin.y - DragItem.Drag_SIZE / 2 / this.pixelsBuilder.transform.scale,
      DragItem.Drag_SIZE / this.pixelsBuilder.transform.scale,
      DragItem.Drag_SIZE / this.pixelsBuilder.transform.scale);
    this.pixelsBuilder.ctx.closePath();
  }

  pointContainer(x: number, y: number): boolean {
    return x >= (this.begin.x - DragItem.Drag_SIZE / 2 / this.pixelsBuilder.transform.scale) &&
      y >= (this.begin.y - DragItem.Drag_SIZE / 2 / this.pixelsBuilder.transform.scale) &&
      x <= (this.begin.x - DragItem.Drag_SIZE / 2 / this.pixelsBuilder.transform.scale + DragItem.Drag_SIZE / this.pixelsBuilder.transform.scale) &&
      y <= (this.begin.y - DragItem.Drag_SIZE / 2 / this.pixelsBuilder.transform.scale + DragItem.Drag_SIZE / this.pixelsBuilder.transform.scale)
  }
}

export enum EGraphicMoveTools {
  LEFT_TOP,
  TOP,
  RIGHT_TOP,
  RIGHT,
  RIGHT_BOTTOM,
  BOTTOM,
  LEFT_BOTTOM,
  LEFT
}