import { DoubleLinkedLists, DoubleLinkedNode } from "@/components/dataStructure/DoubleLinkedList";
import { Point } from "../pixel.type";
import { PixelsBuilder } from "../pixelsBuilder";
import { canvasGraphic } from "./graphics";
import { copyAreaCanvasResult, LedLayoutV2 } from "./LedLayoutV2";
import { ETools } from "../enum";
import { unref } from "vue";

export class LedCanvas implements canvasGraphic {

  canvas !: HTMLCanvasElement;
  //这个点是画布网格坐标点，需要转化
  ledPoints !: DoubleLinkedLists<Point>;
  //led数量
  ledsize: number = 0;
  //led线路编号
  ledNo !: number;
  //led线路颜色
  ledColor !: string;
  //画笔
  ctx !: CanvasRenderingContext2D;
  //相对于ledLayout坐标偏移量
  offset !: Point;
  //当前是否被选中，选中可以拖动
  draggable = false; leave = false;
  //移动数据
  move = {
    start: { x: 0, y: 0 },
    leftTop: { x: 0, y: 0 },
    diff: { x: 0, y: 0 }
  }
  prePoints: Point[] = [];

  constructor(public pixelsBuilder: PixelsBuilder, public LedLayoutV2: LedLayoutV2, no: number, color: string) {
    this.ledNo = no;
    this.ledPoints = new DoubleLinkedLists(no);
    this.ledColor = color;
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.boxSizing = "border-box";
    this.canvas.style.left = "0px", this.canvas.style.right = "0px";
    this.ctx = this.canvas.getContext("2d")!;
    const main = document.querySelector("#pixelsBuilderCanvas");
    main?.appendChild(this.canvas);

    const moveCancvas = this.moveCanvas.bind(this);
    this.canvas.addEventListener("mousedown", e => {
      //记录当前移动的点
      this.move.start = this.pixelsBuilder.getCanvasPoint(e);
      this.prePoints = this.linkedToArray();
      const leftTop = this.getCanvasLeftTop();
      this.move.leftTop = { x: leftTop.left, y: leftTop.top };
      if (this.draggable && unref(this.pixelsBuilder.config).mode === ETools.TOOLS_MOVE) {
        this.canvas.addEventListener("mousemove", moveCancvas);
        this.pixelsBuilder.currentIsDragLedCanvas = true;
        return;
      } else {
        this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("mousedown", e))
      }
    });
    this.canvas.addEventListener("mouseenter", e => this.leave = false);
    this.canvas.addEventListener("mouseleave", e => this.leave = true);
    this.canvas.addEventListener("mousemove", e => this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("mousemove", e)));
    this.canvas.addEventListener("mouseup", e => {
      if (this.draggable && unref(this.pixelsBuilder.config).mode === ETools.TOOLS_MOVE) {
        this.canvas.removeEventListener("mousemove", moveCancvas);
        this.moveCanvasEnd(e);
        this.pixelsBuilder.currentIsDragLedCanvas = false;
        return;
      }
      this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("mouseup", e))
    });
    this.canvas.addEventListener("wheel", e => { this.pixelsBuilder.canvas.dispatchEvent(new WheelEvent("wheel", e)) });
    this.canvas.addEventListener("contextmenu", e => { e.preventDefault(); this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("contextmenu", e)) });
  }

  draw() {
    this.toLocalCanvas();
    const ctx = this.ctx;
    ctx.scale(this.pixelsBuilder.transform.scale, this.pixelsBuilder.transform.scale);
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    const space = 0.8;
    ctx.beginPath();
    const ledPoints = this.linkedToArray();
    for (let i = 0; i < ledPoints.length; i++) {
      const X = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(ledPoints[i]);
      const Y = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(this.offset);
      const begin = this.pixelsBuilder.mathUtils.div(X, Y);
      const rect = grid - 2 * grid * (1 - space);
      ctx.fillStyle = this.ledColor;
      ctx.fillRect(begin.x + grid * (1 - space), begin.y + grid * (1 - space), rect, rect);
      ctx.fill();
      // const text = '' + (i + 1);
      // ctx.font = `${Math.floor(grid * 0.66)}px serif`;
      // const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(text);
      // const height = Math.floor(actualBoundingBoxAscent + actualBoundingBoxDescent);
      // ctx.fillStyle = "#000000";
      // ctx.fillText(text, Math.floor(begin.x + width / 2), Math.floor(begin.y + height * 1.5 + 2));
    }
    ctx.closePath();
  }

  linkedToArray() {
    const ret: Point[] = [];
    let p: DoubleLinkedNode<Point> | null = this.ledPoints.head;
    while (p) {
      ret.push(p.data);
      p = p.next;
    }
    return ret;
  }

  appendPoint(point: Point) {
    if (!this.ledPoints.tail) {
      this.ledPoints.head = this.ledPoints.tail = new DoubleLinkedNode(point);
    } else {
      this.ledPoints.tail.next = new DoubleLinkedNode(point);
      this.ledPoints.tail = this.ledPoints.tail.next;
    }
    this.ledsize++;
  }

  transform() {
    const { begin, end } = this.pixelsBuilder.mathUtils.EncloseMiniPointsRect(this.linkedToArray());
    const leftTop = this.pixelsBuilder.canvasPoint2RealPoint(this.pixelsBuilder.gridPixelsPoint2CanvasPoint(begin));
    this.canvas.style.left = leftTop.x + "px", this.canvas.style.top = leftTop.y + "px";
  }

  toLocalCanvas() {
    //需要计算围成点的最小矩形的网格坐标
    const { begin, end } = this.pixelsBuilder.mathUtils.EncloseMiniPointsRect(this.linkedToArray());
    const leftTop = this.pixelsBuilder.canvasPoint2RealPoint(this.pixelsBuilder.gridPixelsPoint2CanvasPoint(begin));
    const rightBottom = this.pixelsBuilder.canvasPoint2RealPoint(this.pixelsBuilder.gridPixelsPoint2CanvasPoint({ x: end.x + 1, y: end.y + 1 }));
    this.canvas.width = rightBottom.x - leftTop.x;
    this.canvas.height = rightBottom.y - leftTop.y;
    this.canvas.style.left = leftTop.x + "px", this.canvas.style.top = leftTop.y + "px";
    this.offset = begin;
  }

  areaSelect() { }
  areaDelete() { }

  deletePoints(points: Point[]) {
    const ledSet = new Set<string>();
    points.forEach(_ => ledSet.add(JSON.stringify(_)));
    let ledPoints = this.linkedToArray();
    const size = ledPoints.filter(_ => ledSet.has(JSON.stringify(_))).length;
    ledPoints = ledPoints.filter(_ => !ledSet.has(JSON.stringify(_)));
    let p = new DoubleLinkedLists<Point>(this.ledNo);
    for (let i = 0; i < ledPoints.length; i++) {
      if (!p.tail) {
        p.tail = p.head = new DoubleLinkedNode(ledPoints[i]);
      } else {
        p.tail.next = new DoubleLinkedNode(ledPoints[i]);
        p.tail = p.tail.next;
      }
    }
    this.ledPoints = p;
    this.ledsize -= size;
    return size;
  }


  getAreaContainerPoints(areaStart: Point, areaEnd: Point): copyAreaCanvasResult {
    return {
      ledNo: this.ledNo,
      points: this.linkedToArray().filter(_ => _.x >= areaStart.x && _.x < areaEnd.x && _.y >= areaStart.y && _.y < areaEnd.y),
    }
  }

  //高亮该画布
  highlight() {
    this.canvas.style.border = "1px solid #007aff";
    this.canvas.style.zIndex = "2000"
    this.draggable = true;
  }

  disableHighlight() {
    this.canvas.style.border = "none";
    this.canvas.style.zIndex = "1000"
    this.draggable = false;
  }

  moveCanvas(point: MouseEvent) {
    const begin = this.move.start;
    const end = this.pixelsBuilder.getCanvasPoint(point);
    const diff = this.pixelsBuilder.mathUtils.div(end, begin);
    const ret = this.pixelsBuilder.realPoint2GridAlignCanvasPoint2RealPoint({ x: diff.x + this.move.leftTop.x, y: diff.y + this.move.leftTop.y });
    this.canvas.style.left = `${ret.x}px`;
    this.canvas.style.top = `${ret.y}px`;
    const { left: x, top: y } = this.getCanvasLeftTop();
    const _diff = this.pixelsBuilder.mathUtils.div(this.pixelsBuilder.realPoint2GridPixelsPoint({ x, y }), this.pixelsBuilder.realPoint2GridPixelsPoint(this.move.leftTop));
    this.move.diff = _diff;
  }

  moveCanvasEnd(point: MouseEvent) {
    let p: DoubleLinkedNode<Point> | null = this.ledPoints.head;
    //之前的点覆盖数-1
    this.prePoints.map(_ => this.LedLayoutV2.ledCoverMap[this.LedLayoutV2.getPointHash(_.x, _.y)]--);
    while (p) {
      p.data = this.pixelsBuilder.mathUtils.add(p.data, this.move.diff);
      const id = this.LedLayoutV2.getPointHash(p.data.x, p.data.y);
      this.LedLayoutV2.ledCoverMap[id] = (this.LedLayoutV2.ledCoverMap[id] ?? 0) + 1;
      p = p.next;
    }
  }

  getCanvasLeftTop() {
    const left = parseFloat(this.canvas.style.left.replace("px", ""));
    const top = parseFloat(this.canvas.style.top.replace("px", ""));
    return { left, top };
  }
}