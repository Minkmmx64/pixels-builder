import { ComputedRef } from "vue";
import { PixelsBuilder } from "../pixelsBuilder";
import { LedLayout } from "./LedLayout";
import { ILedControllers } from "@/views/index.type";
import { IAreaCHoose, Point, Value } from "../pixel.type";
import { LedCanvas } from "./LedCanvas";
import { ELineAction } from "../enum";

export class LedLayoutV2 extends LedLayout {

  //每条线路创建一个画布
  ledCanvasSets = new Map<number, LedCanvas>();

  constructor(public width: number,
    public height: number,
    public pixelsBuilder: PixelsBuilder,
    public LedLayoutConfigRef: ComputedRef<ILedControllers[]>) {
    super(width, height, pixelsBuilder, LedLayoutConfigRef);
  }

  //当前选择的区域坐标
  areaSelect({ areaStart, areaEnd, pos }: IAreaCHoose) {
    const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const layoutEnd = { x: layoutBegin.x + this.width, y: layoutBegin.y + this.height };
    const { start, end } = this.pixelsBuilder.mathUtils.findVerticalIntersectionArea({ start: areaStart, end: areaEnd }, { start: layoutBegin, end: layoutEnd });
    if (start.x < end.x && start.y < end.y) {
      if (this.ledLayoutSetting) {
        let links = this.getPointLists(start, end, this.ledLayoutSetting.lineAction, pos);
        if (!this.ledLayoutSetting.overlap) {
          links = links.filter(({ x, y }) => !this.ledCoordinate.has(this.getPointHash(x, y)));
        }
        this.getLedLinksLists(links);
      }
    }
  }

  //判断当前点是否被覆盖
  hasPoint(point: Point): boolean {
    return this.ledCoordinate.has(this.getPointHash(point.x, point.y));
  }

  getLedLinksLists(links: Point[]) {
    let isFindNext = false;
    let canvas = this.getCanvas();
    for (let i = 0; i < links.length; i++) {
      const pointHashCode = this.getPointHash(links[i].x, links[i].y);
      this.ledCoordinate.add(pointHashCode);
      if (canvas.ledsize < this.ledLayoutSetting.thresholdPoints) {
        canvas.appendPoint(links[i]);
      } else {
        canvas.draw();
        //画满了，加载下一个led配置
        const nextLedConfig = this.loadNextLedLayoutConfig();
        if (nextLedConfig) {
          isFindNext = true;
          this.ledLayoutSetting.ledSetting = { color: nextLedConfig.color, no: nextLedConfig.no }
          canvas = this.getCanvas();
          canvas.appendPoint(links[i]);
        }
      }
      canvas.draw();
      this.dispatch("LedSelected", null, { no: canvas.ledNo, size: canvas.ledsize });
    }
  }

  getCanvas(): LedCanvas {
    //获取当前的线路编号
    let circuitNo = this.ledLayoutSetting.ledSetting.no!;
    let circuitColor = this.ledLayoutSetting.ledSetting.color!;
    if (!this.ledCanvasSets.get(circuitNo)) this.ledCanvasSets.set(
      circuitNo,
      new LedCanvas(
        this.pixelsBuilder,
        circuitNo,
        circuitColor
      )
    );
    return this.ledCanvasSets.get(circuitNo)!;
  }

  draw(type ?: Value) {
    const ctx = this.pixelsBuilder.ctx;
    ctx.beginPath();
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.rect(
      this.beginPoint.x,
      this.beginPoint.y,
      this.width * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE,
      this.height * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE);
    ctx.stroke();
    ctx.closePath();
    for (const [_, node] of this.ledCanvasSets) {
      setTimeout(() => {
        if(type) node.draw();
        else node.transform();
      }, 10);
    }
  }

  //右键画线
  onContextMenu(point: Point | undefined) {
    const no = this.ledLayoutSetting?.ledSetting?.no;
    if (point && no && this.pointInteraction(point)) {
      const node = this.ledCanvasSets.get(no);
      if (node && node.ledsize) {
        let start = node.ledPoints.tail?.data;
        if (start) {
          const end = point;
          let points = this.pixelsBuilder.mathUtils.Bresenham(start, end);
          if (!this.ledLayoutSetting.overlap) {
            points = points.filter(({ x, y }) => !this.ledCoordinate.has(this.getPointHash(x, y)));
          }
          this.getLedLinksLists(points);
        }
      }
    }
  }

  areaDelete({ areaStart, areaEnd, pos }: IAreaCHoose): void {
    const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const layoutEnd = { x: layoutBegin.x + this.width, y: layoutBegin.y + this.height };
    const { start, end } = this.pixelsBuilder.mathUtils.findVerticalIntersectionArea(
      { start: areaStart, end: areaEnd },
      { start: layoutBegin, end: layoutEnd }
    );
    if (start.x < end.x && start.y < end.y) {
      let links = this.getPointLists(start, end, ELineAction.SINGULAR_ROW_PRIOR, pos);
      links.forEach(point => this.ledCoordinate.delete(this.getPointHash(point.x, point.y)));
      for (const [_, node] of this.ledCanvasSets) {
        node.deletePoints(links);
        this.dispatch("LedSelected", null, { no: node.ledNo, size: node.ledsize });
        node.draw();
      }
    }
  }


  //删除之前的数据
  clear() {
    const main = document.querySelector("#pixelsBuilderCanvas");
    for (const [_, node] of this.ledCanvasSets) main?.removeChild(node.canvas);
  }
}