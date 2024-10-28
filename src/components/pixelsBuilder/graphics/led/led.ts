import { ICanvasPoint, Point } from "../../pixel.type";
import { PixelsBuilder } from "../../pixelsBuilder";
import { IGraphic } from "../graphics";
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
      x: start.x + (grid / 2),
      y: start.y + (grid / 2)
    }
  }

  draw() {
    const ctx = this.pixelsBuilder.ctx;
    const start = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(this.point);
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    const space = 10;
    ctx.fillStyle = this.ledSetting.color!;
    ctx.beginPath();
    if (this.no !== 1) {
      const center = {
        x: start.x + (grid / 2),
        y: start.y + (grid / 2)
      }
      ctx.arc(center.x, center.y, (grid / 2) - space, 0, Math.PI * 2);
      ctx.fill();
    }
    else {
      const rect = grid - space * 2;
      ctx.fillRect(start.x + space, start.y + space, rect, rect);
      ctx.closePath();
    }
    //绘制文字
    ctx.beginPath();
    const text = this.no.toString() + (this.no === 1 ? '*' : '');
    ctx.font = `${Math.floor(grid * 0.66)}px serif`;
    const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(text);
    const height = actualBoundingBoxAscent + actualBoundingBoxDescent;
    ctx.fillStyle = "#000000";
    ctx.fillText(text, this.center.x - width / 2, this.center.y + height / 2);
    ctx.fill();
    ctx.closePath();
  }
}
