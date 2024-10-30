import { ICanvasPoint, Point } from "../../pixel.type";
import { PixelsBuilder } from "../../pixelsBuilder";
import { canvasGraphic, IGraphic } from "../graphics";
import { ILedSetting } from "../LedLayout";

/**
 * ledLayout 中的 Led 元素
 */
export class Led implements IGraphic {

  ledSetting !: ILedSetting;
  no !: number; //当前led编号
  center !: ICanvasPoint;  //led中心坐标
  //当led风控编号
  controller !: number;

  constructor(public point: Point, setting: ILedSetting, no: number, controller: number, public pixelsBuilder: PixelsBuilder) {
    this.ledSetting = setting;
    this.no = no;
    this.controller = controller;
    const start = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(this.point);
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    this.center = {
      x: start.x + Math.floor((grid / 2)),
      y: start.y + Math.floor((grid / 2))
    }
  }

  draw() {
    const ctx = this.pixelsBuilder.ctx;
    const start = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(this.point);
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    const space = 0.8;
    ctx.fillStyle = this.ledSetting.color!;

    if (this.no !== 1) {
      const center = {
        x: start.x + Math.floor((grid / 2)),
        y: start.y + Math.floor((grid / 2))
      }
      ctx.arc(center.x, center.y, Math.floor((grid / 2.6)), 0, Math.PI * 2);
      ctx.fill();
    }
    else {
      const rect = grid - 2 * grid * (1 - space);
      ctx.fillRect(start.x + grid * (1 - space), start.y + grid * (1 - space), rect, rect);
    }

    //绘制文字

    const text = '' + this.no;
    ctx.font = `${Math.floor(grid * 0.66)}px serif`;
    const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(text);
    const height = Math.floor(actualBoundingBoxAscent + actualBoundingBoxDescent);
    ctx.fillStyle = "#000000";
    ctx.fillText(text, Math.floor(this.center.x - width / 2), Math.floor(this.center.y + height / 2));

  }

}
