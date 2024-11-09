import { ComputedRef } from "vue";
import { PixelsBuilder } from "../pixelsBuilder";
import { LedLayout } from "./LedLayout";
import { ILedControllers } from "@/views/index.type";
import { IAreaCHoose, Point, Value } from "../pixel.type";
import { LedCanvas } from "./LedCanvas";
import { ELineAction } from "../enum";
import { ElMessage } from "element-plus";
import { canvasGraphic } from "./graphics";

export class LedLayoutV2 extends LedLayout implements canvasGraphic {

  //每条线路创建一个画布
  ledCanvasSets = new Map<number, LedCanvas>();
  //ledLayout每个点被覆盖的点数
  ledCoverMap: Record<string, number> = {}

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
          links = links.filter(({ x, y }) => !this.ledCoverMap[this.getPointHash(x, y)]);
        }
        this.getLedLinksLists(links);
      }
    }
  }

  //判断当前点是否被覆盖
  hasPoint({ x, y }: Point): boolean {
    return !!this.ledCoverMap[this.getPointHash(x, y)];
  }

  getLedLinksLists(links: Point[]) {
    let canvas = this.getCanvas();
    const ids: number[] = [this.ledLayoutSetting.ledSetting.no!];
    for (let i = 0; i < links.length; i++) {
      const pointHashCode = this.getPointHash(links[i].x, links[i].y);
      this.ledCoverMap[pointHashCode] = (this.ledCoverMap[pointHashCode] ?? 0) + 1;
      if (canvas.ledsize < this.ledLayoutSetting.thresholdPoints) {
        canvas.appendPoint(links[i]);
      } else {
        //画满了，加载下一个led配置
        this.dispatch("LedSelected", null, { no: canvas.ledNo, size: canvas.ledsize });
        const nextLedConfig = this.loadNextLedLayoutConfig();
        if (nextLedConfig) {
          ids.push(nextLedConfig.no);
          this.ledLayoutSetting.ledSetting = { color: nextLedConfig.color, no: nextLedConfig.no }
          canvas = this.getCanvas();
          canvas.appendPoint(links[i]);
        }
      }
    }
    canvas.draw();
    ids.map(i => {
      this.dispatch("LedSelected", null, { no: canvas.ledNo, size: canvas.ledsize });
      this.ledCanvasSets.get(i)?.draw();
    })
  }

  getCanvas(): LedCanvas {
    //获取当前的线路编号
    let circuitNo = this.ledLayoutSetting.ledSetting.no!;
    let circuitColor = this.ledLayoutSetting.ledSetting.color!;
    if (!this.ledCanvasSets.get(circuitNo)) this.ledCanvasSets.set(
      circuitNo,
      new LedCanvas(
        this.pixelsBuilder,
        this,
        circuitNo,
        circuitColor
      )
    );
    return this.ledCanvasSets.get(circuitNo)!;
  }

  draw(type?: Value) {
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
    /**
     *  let step = 3;
    const _ = (i: number) => {
      for (let j = i; j < i + step; j++) {
        if (j >= data.length) return;
        if (type) data[j][1].draw();
        else data[j][1].transform();
      }
      requestAnimationFrame(() => _(i + step));
    }
    _(0);
     */
    for (const [_, node] of this.ledCanvasSets) {
      ((n) => {
        setTimeout(() => {
          if (type) n.draw();
          else n.transform();
        });
      })(node);
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
            points = points.filter(({ x, y }) => !this.ledCoverMap[this.getPointHash(x, y)]);
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
      links.forEach(point => this.ledCoverMap[this.getPointHash(point.x, point.y)] = 0);
      for (const [_, node] of this.ledCanvasSets) {
        if (node.deletePoints(links)) {
          node.draw();
          this.dispatch("LedSelected", null, { no: node.ledNo, size: node.ledsize });
        }
      }
    }
  }

  //删除之前的数据
  clear() {
    const main = document.querySelector("#pixelsBuilderCanvas");
    for (const [_, node] of this.ledCanvasSets) main?.removeChild(node.canvas);
  }

  copyLedArea(areaStart: Point, areaEnd: Point) {
    const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const layoutEnd = { x: layoutBegin.x + this.width, y: layoutBegin.y + this.height };
    const { start, end } = this.pixelsBuilder.mathUtils.findVerticalIntersectionArea({ start: areaStart, end: areaEnd }, { start: layoutBegin, end: layoutEnd });
    if (start.x < end.x && start.y < end.y) {
      const canvas: copyAreaCanvasResult[] = [...this.ledCanvasSets.entries()].map(([_, canvas]) => canvas.getAreaContainerPoints(start, end)).filter(_ => _.points.length);
      this.copyPrototype = { canvas, begin: start, copyAreaThumbnail: "Thumbnail" }
      ElMessage.success(`复制(${start.x}, ${start.y}) -> (${end.x}, ${end.y})成功`);
    }
  }

  //粘贴led区域
  onCurcuitAreaPaste() {
    const point = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const diff: Point = {
      x: point.x - this.copyPrototype.begin.x,
      y: point.y - this.copyPrototype.begin.y
    }
    if (this.copyPrototype.canvas) {
      for (let i = 0; i < this.copyPrototype.canvas.length; i++) {
        const leds = this.copyPrototype.canvas[i].points;
        const config = this.loadNextLedLayoutConfig(1);
        if (config) {
          const canvas = new LedCanvas(this.pixelsBuilder, this, config.no, config.color);
          this.ledCanvasSets.set(config.no, canvas);
          this.dispatch("LedSelected", null, { no: config.no, size: leds.length });
          leds.map(_ => {
            const point = this.pixelsBuilder.mathUtils.add(_, diff);
            const id = this.getPointHash(point.x, point.y);
            this.ledCoverMap[id] = (this.ledCoverMap[id] ?? 0) + 1;
            canvas.appendPoint(point)
          });
        } else {
          ElMessage.error("可用的线路不够!!!");
        }
      }
      this.pixelsBuilder.reloadCanvas("draw");
    }
  }

  circuitCopyLeds: Point[] = [];
  //复制线路
  copyCircuit(no: number) {
    if (this.ledCanvasSets.get(no)) {
      const canvas = this.ledCanvasSets.get(no)!;
      let leds = canvas.linkedToArray();
      const { begin } = this.pixelsBuilder.mathUtils.EncloseMiniPointsRect(leds);
      const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
      leds = leds.map(_ => this.pixelsBuilder.mathUtils.add(this.pixelsBuilder.mathUtils.div(_, begin), layoutBegin));
      this.circuitCopyLeds = leds;
    } else {
      ElMessage.error("该线路暂无数据");
      return false;
    }
    return true;
  }

  onCurcuitCopy() {
    if (this.circuitCopyTarget) {
      const no = this.circuitCopyTarget.target;
      if (this.ledCanvasSets.get(no)) {
        const main = document.querySelector("#pixelsBuilderCanvas");
        main?.removeChild(this.ledCanvasSets.get(no)!.canvas);
        this.ledCanvasSets.delete(no);
      }
      const canvas = new LedCanvas(this.pixelsBuilder, this, no, this.circuitCopyTarget.color);
      for (let i = 0; i < this.circuitCopyLeds.length; i++) {
        canvas.appendPoint(this.circuitCopyLeds[i]);
      }
      this.ledCanvasSets.set(no, canvas);
      this.dispatch("LedSelected", null, { no: no, size: this.circuitCopyLeds.length });
      this.pixelsBuilder.reloadCanvas("draw");
    }
  }

  ledCanvasHighLight(no: number) {
    this.ledCanvasSets.forEach(_ => {
      _.disableHighlight();
      _.ledNo === no && _.highlight();
    });
  }

  ledCanvasDrag(e: MouseEvent | undefined) {
    const data = [...this.ledCanvasSets.entries()].find(([_, canvas]) => canvas.draggable && canvas.leave);
    if (data) {
      data[1].canvas.dispatchEvent(new MouseEvent("mousemove", e));
    }
  }

  deleteCanvasLayout(no: number) {
    const main = document.querySelector("#pixelsBuilderCanvas");
    const canvas = this.ledCanvasSets.get(no);
    if (canvas) {
      const leds = canvas.linkedToArray();
      for (let i = 0; i < leds.length; i++) {
        this.ledCoverMap[this.getPointHash(leds[i].x, leds[i].y)]--;
      }
      main?.removeChild(canvas.canvas);
      this.ledCanvasSets.delete(no);
      this.dispatch("LedSelected", null, { no: no, size: 0 });
      ElMessage.warning("删除线路" + no + "成功!");
    }
  }
}

export interface copyAreaCanvasResult {
  ledNo: number;
  points: Point[];
}