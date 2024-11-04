import { DoubleLinkedNode, DoubleLinkedLists } from "@/components/dataStructure/DoubleLinkedList";
import { IAreaCHoose, ICanvasPoint, Point } from "../pixel.type";
import { PixelsBuilder } from "../pixelsBuilder";
import { canvasGraphic, IExportObject } from "./graphics";
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

  //画布起点
  beginPoint !: ICanvasPoint;
  //画布配置信息
  ledLayoutSetting !: ILayoutSetting;
  //全局Layout信息
  globalConfig = {
    COVERABLE: true,  //是否可以覆盖在点上
  }
  //线路复制栈
  circuitStack: { diff: Point[], no: number }[] = [];
  //线路复制目标编号
  circuitCopyTarget: { target: number, color: string } | undefined;
  //区域复制参数
  copyPrototype: { copyAreaStack: ILedCopyArea[], copyAreaThumbnail: string, begin: Point } = {
    //区域复制
    copyAreaStack: [],
    //区域缩略图
    copyAreaThumbnail: "",
    //区域起点
    begin: { x: 0, y: 0 }
  }

  //需要维护的数据
  //控制点对应的链表
  ledLinkedListMasterCollection: Map<number, DoubleLinkedLists<Led>> = new Map();
  //当前点覆盖的led
  ledPointHashCollection: Map<string, DoubleLinkedNode<Led>[]> = new Map();
  //当前坐标是否已经有led
  ledCoordinate: Set<string> = new Set();
  //快照栈
  undoSnapShotStack: ILedLayoutSaveData[] = [];
  redoSnapShotStack: ILedLayoutSaveData[] = [];

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
      let links = this.getPointLists(start, end, ELineAction.SINGULAR_ROW_PRIOR, pos);
      //删除操作保存记录
      if (links.length) {
        this.snapShot();
      }
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

  /**
   * @param links 需要绘制的点的集合
   * @param CheckThresholdPoints 是否限制点数，false 不限制
   * @param no 当前绘制的编号，如果没有传递，用当前led配置的
   * @param setting led配置，如果没有传，用当前配置的
   * @param snapShot 是否由快照恢复
   */
  getLedLinksLists(links: Point[], CheckThresholdPoints?: boolean, no?: number, setting?: ILedSetting, snapShot?: boolean) {
    //画线操作保存记录，是否保存为快照
    if (links.length && !snapShot) {
      this.snapShot();
    }
    const controller = no ?? this.ledLayoutSetting.ledSetting.no!;
    if (this.ledLinkedListMasterCollection.get(controller)) { }
    else this.ledLinkedListMasterCollection.set(controller, new DoubleLinkedLists(no ?? this.ledLayoutSetting.ledSetting.no!));
    let doubleLinkedLists = this.ledLinkedListMasterCollection.get(controller)!;
    for (const link of links) {
      const pointHashCode = this.getPointHash(link.x, link.y);
      this.ledCoordinate.add(pointHashCode);
      let led!: Led, node !: DoubleLinkedNode<Led>;
      if (!doubleLinkedLists.size) {
        led = new Led(link, setting ?? this.ledLayoutSetting.ledSetting, 1, no ?? doubleLinkedLists.no, this.pixelsBuilder);
        node = new DoubleLinkedNode(led);
        doubleLinkedLists.head = doubleLinkedLists.tail = node;
        doubleLinkedLists.size++;
      } else {
        //是否需要判断当前有没有超出阈值
        if (!CheckThresholdPoints && doubleLinkedLists.size + 1 > this.ledLayoutSetting.thresholdPoints) {
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
          led = new Led(link, setting ?? this.ledLayoutSetting.ledSetting, no + 1, doubleLinkedLists.no, this.pixelsBuilder);
          node = new DoubleLinkedNode(led);
          doubleLinkedLists.tail!.next = node;
          node.pre = doubleLinkedLists.tail;
          doubleLinkedLists.tail = doubleLinkedLists.tail!.next;
        }
      }
      this.ledPointHashCollection.set(pointHashCode, [...this.ledPointHashCollection.get(pointHashCode) ?? [], node]);
    }
    if (links.length) {
      this.pixelsBuilder.reloadCanvas();
    }
    this.dispatch("LedSelected", null, { no: no ?? this.ledLayoutSetting.ledSetting.no!, size: doubleLinkedLists.size });
  }

  //保存快照
  snapShot() {
    const data = this.saveLedLayoutConfig();
    this.undoSnapShotStack.push(JSON.parse(JSON.stringify(data)));
  }

  //恢复
  redoSnapShot() {
    if (this.redoSnapShotStack.length) {
      const current = this.saveLedLayoutConfig();
      this.undoSnapShotStack.push(JSON.parse(JSON.stringify(current)));
      const data = this.redoSnapShotStack.pop();
      if (data) {
        this.loadLedLayoutConfig(JSON.parse(JSON.stringify(data)));
      }
    }
  }

  //撤回快照
  undoSnapShot() {
    if (this.undoSnapShotStack.length) {
      const current = this.saveLedLayoutConfig();
      this.redoSnapShotStack.push(current);
      const data = this.undoSnapShotStack.pop();
      if (data) {
        const e = JSON.parse(JSON.stringify(data));
        this.loadLedLayoutConfig(e);
      }
    }
  }

  //保存数据
  saveLedLayoutConfig(): ILedLayoutSaveData {
    const ret = {} as ILedLayoutSaveData;
    let ports = 0, lednum = 0, lines: { lednum: number, bulbs: Point[], no: number, color: string }[] = [];
    let width = this.width, height = this.height;
    const start = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const diff = { x: start.x, y: start.y };
    for (const [_, node] of this.ledLinkedListMasterCollection) {
      ports++, lednum += node.size;
      const points = this.LinkedListsToArray(node).map(p => {
        return { x: p.x - diff.x, y: p.y - diff.y }
      });
      lines.push({ lednum: node.size, bulbs: points, no: node.no, color: node.head?.data.ledSetting.color! });
    }
    ret.width = width, ret.height = height;
    ret.name = "name", ret.ports = ports;
    ret.lines = lines, ret.lednum = lednum;
    ret.type = "dn";
    return ret;
  }

  export(): IExportObject {
    return {
      type: "LedLayout",
      data: this.saveLedLayoutConfig()
    }
  }

  loadLedLayoutConfig(data: ILedLayoutSaveData) {
    this.dispatch("ClearLedSelected", null, undefined);
    this.ledLinkedListMasterCollection.clear();
    this.ledPointHashCollection.clear();
    this.ledCoordinate.clear();
    const start = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    for (const leds of data.lines) {
      const points = leds.bulbs.map(p => {
        return { x: p.x + start.x, y: p.y + start.y }
      })
      this.getLedLinksLists(points, true, leds.no, { no: leds.no, color: leds.color }, true);
    }
  }

  loadNextLedLayoutConfig() {
    const ledControllers = unref(this.LedLayoutConfigRef);
    for (const led of ledControllers) {
      if (led.pixels < this.ledLayoutSetting.thresholdPoints) {
        this.dispatch("LedSelectedNo", null, JSON.parse(JSON.stringify(led)));
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
    return ret.map(led => JSON.parse(JSON.stringify(this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.pixelsBuilder.realPoint2GridAlignCanvasFloorPoint(this.pixelsBuilder.canvasPoint2RealPoint(led.center))))));
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
      return false;
    }
    return true;
  }

  setCircuitCopyTarget(target: number, color: string) {
    this.circuitCopyTarget = { target, color };
  }

  onCurcuitCopy(param: Point | undefined) {
    if (param && this.pointInteraction(param) && this.circuitCopyTarget) {
      const data = this.circuitStack[0];
      //删除目标所有点
      this.deleteLedByNo(this.circuitCopyTarget.target);
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
        this.getLedLinksLists(points, true, this.circuitCopyTarget.target, { no: this.circuitCopyTarget.target, color: this.circuitCopyTarget.color });
        this.circuitStack = [];
      }
    }
  }

  //删除目标编号所有点
  deleteLedByNo(no: number) {
    const master = this.ledLinkedListMasterCollection.get(no);
    if (master) {
      let h: DoubleLinkedNode<Led> | null = master.head;
      while (h) {
        let start = h.data.center;
        start = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.pixelsBuilder.realPoint2GridAlignCanvasFloorPoint(this.pixelsBuilder.canvasPoint2RealPoint(start)));
        let data = this.ledPointHashCollection.get(this.getPointHash(start.x, start.y)) ?? [];
        data = data.filter(p => p.data.controller === no);
        this.ledPointHashCollection.set(this.getPointHash(start.x, start.y), data);
        if (!data.length) this.ledCoordinate.delete(this.getPointHash(start.x, start.y));
        h = h.next;
      }
    }
    this.ledLinkedListMasterCollection.delete(no);
  }

  //点是否在led内部
  pointInteraction(point: Point): boolean {
    return this.beginPoint.x <= point.x * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE &&
      (this.beginPoint.x + this.width * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE) > point.x * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE &&
      this.beginPoint.y <= point.y * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE &&
      (this.beginPoint.y + this.height * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE) > point.y * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE
  }

  //右键画线
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

  //复制led区域
  copyLedArea(areaStart: Point, areaEnd: Point) {
    const ret: ILedCopyArea[] = [];
    const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const layoutEnd = { x: layoutBegin.x + this.width, y: layoutBegin.y + this.height };
    const { start, end } = this.pixelsBuilder.mathUtils.findVerticalIntersectionArea({ start: areaStart, end: areaEnd }, { start: layoutBegin, end: layoutEnd });
    //复制起点到终点所有点
    if (start.x < end.x && start.y < end.y) {
      let links = this.getPointLists(start, end, ELineAction.SINGULAR_ROW_PRIOR, ERelaPosition.B_1_QUADRANT_A);
      links = links.filter(({ x, y }) => this.ledCoordinate.has(this.getPointHash(x, y)));
      const noSet: Set<number> = new Set();
      if (!links.length) return;
      for (let i = 0; i < links.length; i++) {
        const { x, y } = links[i];
        const doubleLinkedLists = this.ledPointHashCollection.get(this.getPointHash(x, y));
        if (doubleLinkedLists) {
          for (let j = 0; j < doubleLinkedLists.length; j++) {
            const node = doubleLinkedLists[j];
            const no = node.data.controller;
            if (!noSet.has(no)) {
              const master = this.ledLinkedListMasterCollection.get(no);
              noSet.add(no);
              if (master && master.head) {
                let nodeLists = this.LinkedListsToArray(master);
                nodeLists = nodeLists.filter(({ x, y }) => x >= start.x && y >= start.y && x < end.x && y < end.y);
                ret.push({ no, setting: JSON.parse(JSON.stringify(master.head.data.ledSetting)), points: nodeLists })
              }
            }
          }
        }
      }
      //获取当前区域的位图
      const canvasStart = this.pixelsBuilder.canvasPoint2RealPoint(this.pixelsBuilder.gridPixelsPoint2CanvasPoint(start))
      const canvasEnd = this.pixelsBuilder.canvasPoint2RealPoint(this.pixelsBuilder.gridPixelsPoint2CanvasPoint(end));
      const w = canvasEnd.x - canvasStart.x, h = canvasEnd.y - canvasStart.y;
      const imageData = this.pixelsBuilder.ctx.getImageData(canvasStart.x, canvasStart.y, w, h);
      const canvas = document.createElement("canvas");
      canvas.width = w, canvas.height = h;
      canvas.getContext("2d")!.putImageData(imageData, 0, 0);
      this.copyPrototype = {
        copyAreaStack: ret,
        copyAreaThumbnail: canvas.toDataURL(),
        begin: start
      }
      ElMessage.success(`复制(${start.x}, ${start.y}) -> (${end.x}, ${end.y})成功`);
    }
  }

  //粘贴led区域
  onCurcuitAreaPaste(point: Point | undefined) {
    if (point && this.pointInteraction(point)) {
      const diff: Point = {
        x: point.x - this.copyPrototype.begin.x,
        y: point.y - this.copyPrototype.begin.y
      }
      for (let i = 0; i < this.copyPrototype.copyAreaStack.length; i++) {
        const data = this.copyPrototype.copyAreaStack[i];
        const ledPoints = data.points.map(({ x, y }) => { return { x: x + diff.x, y: y + diff.y } }).filter(_point => this.pointInteraction(_point));
        this.getLedLinksLists(ledPoints, true, data.no, data.setting);
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
  /**
   * 清空led
   */
  ClearLedSelected: undefined;
  /**
   * 选择线路
   */
  LedSelectedNo: ILedControllers;
}

interface ILedCopyArea {
  no: number;
  setting: ILedSetting;
  points: Point[];
}

export interface ILedLayoutSaveData {
  name: string,
  description: string,
  ports: number,              //线路数
  linestyle: unknown,
  width: number,              //画布宽高
  height: number,
  lines: {                    //线路坐标数据
    lednum: number,
    bulbs: Point[],
    no: number,
    color: string,
  }[],
  type: "dn",                 //类型
  lednum: number,             //总led数,
}