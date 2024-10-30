import { DoubleLinkedNode, DoubleLinkedLists } from "@/components/dataStructure/DoubleLinkedList";
import { IAreaCHoose, ICanvasPoint, Point } from "../pixel.type";
import { PixelsBuilder } from "../pixelsBuilder";
import { canvasGraphic } from "./graphics";
import { Led } from "./led/led";
import { Cursor, ELineAction, ERelaPosition } from "../enum";
import { Listener } from "../pixelsListener";
import { ILedControllers } from "@/views/index.type";
import { ComputedRef, unref } from "vue";
import { ElMessage } from "element-plus";

/**
 * 绘制led 面板
 * 每种型号led
*/
export class LedLayout extends Listener<ILayoutListener> implements canvasGraphic {

  //单位 画布像素
  constructor(
    public width: number,
    public height: number,
    public pixelsBuilder: PixelsBuilder,
    public LedLayoutConfigRef: ComputedRef<ILedControllers[]>) {
    super();
    const leftTop = { x: 0, y: 0 };
    const rightBottom = { x: pixelsBuilder.canvas.width, y: pixelsBuilder.canvas.height };
    const ledPoint = {
      x: (leftTop.x + rightBottom.x) / 2,
      y: (leftTop.y + rightBottom.y) / 2
    };
    this.beginPoint = pixelsBuilder.realPoint2GridAlignCanvasPoint(ledPoint);
  }

  beginPoint !: ICanvasPoint;
  ledLinkedListMasterCollection: Map<number, DoubleLinkedLists<Led>> = new Map();
  ledPointHashCollection: Map<string, DoubleLinkedNode<Led>[]> = new Map();
  ledCoordinate: Set<string> = new Set();
  ledLayoutSetting !: ILayoutSetting;
  //全局Layout信息
  globalConfig = {
    COVERABLE: true,  //是否可以覆盖在点上
  }
  //线路复制栈
  circuitStack: { diff: Point[], no: number }[] = [];

  draw() {
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
    for (const [no, nodes] of this.ledLinkedListMasterCollection) {
      if (nodes) {
        this.drawLinkedLeds(nodes.head!)
      }
    }
  }

  detectAreaIntersection(areaStart: Point, areaEnd: Point, pos: ERelaPosition) {
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

  deleteAreaIntersection(areaStart: Point, areaEnd: Point, pos: ERelaPosition) {
    const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const layoutEnd = { x: layoutBegin.x + this.width, y: layoutBegin.y + this.height };
    const { start, end } = this.pixelsBuilder.mathUtils.findVerticalIntersectionArea({ start: areaStart, end: areaEnd }, { start: layoutBegin, end: layoutEnd });
    if (start.x < end.x && start.y < end.y) {
      if (this.ledLayoutSetting) {
        let links = this.getPointLists(start, end, this.ledLayoutSetting.lineAction, pos);
        links.forEach(link => {
          const pointHashCode = this.getPointHash(link.x, link.y);
          const nodes = this.ledPointHashCollection.get(pointHashCode) ?? [];
          for (const node of nodes) {
            const doubleLinkedList = this.ledLinkedListMasterCollection.get(node.data.controller)!;
            if (node.next == null) {
              if (doubleLinkedList.tail)
                doubleLinkedList.tail = doubleLinkedList.tail.pre;
              if (doubleLinkedList.tail)
                doubleLinkedList.tail.next = null;
              else doubleLinkedList.head = doubleLinkedList.tail = null;
            } else if (node.pre == null) {
              if (doubleLinkedList.head)
                doubleLinkedList.head = doubleLinkedList.head.next;
              if (doubleLinkedList.head)
                doubleLinkedList.head.pre = null;
              else doubleLinkedList.head = doubleLinkedList.tail = null;
            } else {
              node.pre.next = node.next;
              node.next.pre = node.pre;
            }
            doubleLinkedList.size--;
            this.dispatch("LedSelected", null, { no: node.data.controller, size: doubleLinkedList.size });
          }
          this.ledPointHashCollection.delete(pointHashCode);
          this.ledCoordinate.delete(pointHashCode);
        });
        if (links.length) {
          this.pixelsBuilder.reloadCanvas();
        }
      }
    }
  }

  getLedLinksLists(links: Point[], CheckThresholdPoints?: boolean, no?: number) {
    const controller = no ?? this.ledLayoutSetting.ledSetting.no!;
    if (this.ledLinkedListMasterCollection.get(controller)) { }
    else this.ledLinkedListMasterCollection.set(controller, new DoubleLinkedLists(this.ledLayoutSetting.ledSetting.no!));
    let doubleLinkedLists = this.ledLinkedListMasterCollection.get(controller)!;
    for (const link of links) {
      const pointHashCode = this.getPointHash(link.x, link.y);
      this.ledCoordinate.add(pointHashCode);
      let led!: Led, node !: DoubleLinkedNode<Led>;
      if (!doubleLinkedLists.size) {
        led = new Led(link, this.ledLayoutSetting.ledSetting, 1, doubleLinkedLists.no, this.pixelsBuilder);
        node = new DoubleLinkedNode(led);
        doubleLinkedLists.head = doubleLinkedLists.tail = node;
        doubleLinkedLists.size++;
      } else {
        //是否需要判断当前有没有超出阈值
        if (doubleLinkedLists.size + 1 > this.ledLayoutSetting.thresholdPoints && !CheckThresholdPoints) {
          this.dispatch("LedSelected", null, { no: doubleLinkedLists.no, size: doubleLinkedLists.size });
          //寻找下一个配置
          const ledConfig = this.loadNextLedLayoutConfig();
          if (ledConfig) {
            this.ledLayoutSetting.ledSetting = { color: ledConfig.color, no: ledConfig.no }
            if (this.ledLinkedListMasterCollection.get(ledConfig.no)) { }
            else this.ledLinkedListMasterCollection.set(ledConfig.no, new DoubleLinkedLists(ledConfig.no));
            doubleLinkedLists = this.ledLinkedListMasterCollection.get(ledConfig.no)!;
            if (doubleLinkedLists.size) {
              const no = doubleLinkedLists.tail!.data.no;
              led = new Led(link, this.ledLayoutSetting.ledSetting, no + 1, doubleLinkedLists.no, this.pixelsBuilder);
              node = new DoubleLinkedNode(led);
              doubleLinkedLists.tail!.next = node;
              node.pre = doubleLinkedLists.tail;
              doubleLinkedLists.tail = doubleLinkedLists.tail!.next;
              doubleLinkedLists.size++;
            }
            else {
              led = new Led(link, this.ledLayoutSetting.ledSetting, 1, doubleLinkedLists.no, this.pixelsBuilder);
              node = new DoubleLinkedNode(led);
              doubleLinkedLists.head = doubleLinkedLists.tail = node;
              doubleLinkedLists.size++;
            }
          }
        } else {
          doubleLinkedLists.size++;
          const no = doubleLinkedLists.tail!.data.no;
          led = new Led(link, this.ledLayoutSetting.ledSetting, no + 1, doubleLinkedLists.no, this.pixelsBuilder);
          node = new DoubleLinkedNode(led);
          doubleLinkedLists.tail!.next = node;
          node.pre = doubleLinkedLists.tail;
          doubleLinkedLists.tail = doubleLinkedLists.tail!.next;
        }
      }
      this.ledPointHashCollection.set(pointHashCode, [...this.ledPointHashCollection.get(pointHashCode) ?? [], node]);
    }
    if (links.length) {
      this.dispatch("LedSelected", null, { no: this.ledLayoutSetting.ledSetting.no!, size: doubleLinkedLists.size });
      this.pixelsBuilder.reloadCanvas();
    }
  }

  loadNextLedLayoutConfig() {
    const ledControllers = unref(this.LedLayoutConfigRef);
    for (const led of ledControllers) {
      if (led.pixels < this.ledLayoutSetting.thresholdPoints) {
        return led;
      }
    }
    return null;
  }

  setLedSetting(setting?: ILayoutSetting) {
    this.ledLayoutSetting = setting!;
  }

  getPointHash(x: number, y: number) {
    return JSON.stringify({ x, y });
  }

  //根据lineAction和区域选择相对位置返回需要绘制的点的坐标
  getPointLists(start: Point, end: Point, lineAction: ELineAction, pos: ERelaPosition): Point[] {
    const ret: Point[] = [];
    if (ELineAction.SINGULAR_ROW_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.rowPriorMatrix(start, end, pos);
    }
    else if (ELineAction.SINGULAR_COLUMN_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.columnPriorMatrix(start, end, pos);
    }
    else if (ELineAction.BACK_ROW_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.backRowPriorMatrix(start, end, pos);
    }
    else if (ELineAction.BACK_COLUMN_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.backColumnPriorMatrix(start, end, pos);
    }
    return ret;
  }

  drawLinkedLeds(headLed: DoubleLinkedNode<Led>) {
    let p: DoubleLinkedNode<Led> | null = headLed;
    let pre !: Point | null;
    const ctx = this.pixelsBuilder.ctx;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    let no = 1;
    while (p) {
      const data = p.data;
      data.no = no++;
      const center = data.center;
      //if (pre) {
      // ctx.strokeStyle = data.ledSetting.color!;
      // ctx.moveTo(pre.x, pre.y);
      // ctx.lineTo(center.x, center.y);
      // ctx.stroke();
      //}
      ctx.beginPath();
      data.draw();
      ctx.closePath();
      pre = center;
      p = p.next;
    }
    ctx.closePath();
  }

  areaSelect({ areaStart, areaEnd, pos }: IAreaCHoose) {
    this.detectAreaIntersection(areaStart, areaEnd, pos);
  }

  areaDelete({ areaStart, areaEnd, pos }: IAreaCHoose) {
    this.deleteAreaIntersection(areaStart, areaEnd, pos);
  }

  LinkedListsToArray(headLed: DoubleLinkedLists<Led>): Point[] {
    const ret: Led[] = [];
    let p: DoubleLinkedNode<Led> | null = headLed.head;
    while (p) {
      ret.push(p.data);
      p = p.next;
    }
    return ret.map(led => JSON.parse(JSON.stringify(this.pixelsBuilder.cavnasPoint2GridPixelsPoint(led.center))));
  }

  copyCircuit(no: number) {
    const LinkedList = this.ledLinkedListMasterCollection.get(no);
    if (LinkedList && LinkedList.head) {
      const data = this.LinkedListsToArray(LinkedList);
      const diff: Point[] = [{ x: 0, y: 0 }];
      for (let i = 1; i < data.length; i++) {
        diff[i] = {
          x: data[i].x - data[i - 1].x,
          y: data[i].y - data[i - 1].y
        }
      }
      this.circuitStack = [{ diff, no }];
      this.pixelsBuilder.dispatch("ToggleCursor", null, { cursor: Cursor.COPY });
    } else {
      ElMessage.error("该线路暂无数据");
    }
  }

  onCurcuitCopy(param: Point | undefined) {
    if (param) {
      const data = this.circuitStack[0];
      if (data) {
        const ret: Point[] = [];
        let d = { x: 0, y: 0 };
        let point = param;
        ret.push(point);
        for (let i = 1; i < data.diff.length; i++) {
          d.x += data.diff[i].x, d.y += data.diff[i].y;
          ret.push({ x: point.x + d.x, y: point.y + d.y });
        }
        const points = ret.filter(point => this.pointInteraction(point));
        this.getLedLinksLists(points, true, data.no);
      }
    }
  }

  //点是否在led内部
  pointInteraction(point: Point): boolean {
    return this.beginPoint.x <= point.x * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE &&
      (this.beginPoint.x + this.width * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE) > point.x * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE &&
      this.beginPoint.y <= point.y * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE &&
      (this.beginPoint.y + this.height * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE) > point.y * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE
  }

  onContextMenu(point: Point | undefined) {
    const no = this.ledLayoutSetting?.ledSetting?.no;
    if (point && no && this.pointInteraction(point)) {
      const node = this.ledLinkedListMasterCollection.get(no);
      if (node?.size) {
        let start = node.tail?.data.center;
        if (start) {
          start = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.pixelsBuilder.realPoint2GridAlignCanvasFloorPoint(this.pixelsBuilder.canvasPoint2RealPoint(start)));
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
}

//led配置信息
export interface ILedSetting {
  color?: string;
  no?: number;
}

//ledLayout属性
export interface ILayoutSetting {
  //排列模式
  lineAction: ELineAction;
  //led配置
  ledSetting: ILedSetting;
  //线路点数限制
  thresholdPoints: number;
  //循序重叠
  overlap: boolean;
}

export interface ILayoutListener {

  /**
  * 当前选中编号为no的led个数
  */
  LedSelected: { no: number, size: number }
}