import { DoubleLinkedLists, DoubleLinkedNode } from "@/components/dataStructure/DoubleLinkedList";
import { IAreaCHoose, Point } from "../pixel.type";
import { PixelsBuilder } from "../pixelsBuilder";
import { canvasGraphic } from "./graphics";

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

  constructor(public pixelsBuilder: PixelsBuilder, no: number, color: string) {
    this.ledNo = no;
    this.ledPoints = new DoubleLinkedLists(no);
    this.ledColor = color;
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0px", this.canvas.style.right = "0px";
    this.ctx = this.canvas.getContext("2d")!;
    const main = document.querySelector("#pixelsBuilderCanvas");
    main?.appendChild(this.canvas);
    this.canvas.addEventListener("mousedown", e => { this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("mousedown", e)) });
    this.canvas.addEventListener("mouseup", e => { this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("mouseup", e)) });
    this.canvas.addEventListener("mousemove", e => { this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("mousemove", e)) });
    this.canvas.addEventListener("wheel", e => this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("wheel", e)));
    this.canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      this.pixelsBuilder.canvas.dispatchEvent(new MouseEvent("contextmenu", e));
    });
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
    //this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
    this.ledsize -= size;
  }
}