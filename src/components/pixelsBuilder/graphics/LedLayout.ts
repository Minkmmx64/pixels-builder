import { DoubleLinkedList } from "@/components/dataStructure/DoubleLinkedList";
import { ICanvasPoint, Point } from "../pixel.type";
import { PixelsBuilder } from "../pixelsBuilder";
import { IGraphic } from "./graphics";
import { Led } from "./led/led";
import { ELineAction, ERelaPosition } from "../enum";
import { Listener } from "../pixelsListener";

/**
 * 绘制led 面板
 * 每种型号led
 */
export class LedLayout extends Listener<ILayoutListener> implements IGraphic {

  //单位 画布像素
  constructor(public width: number, public height: number, public pixelsBuilder: PixelsBuilder) {
    super();
    const leftTop = { x: 0, y: 0 };
    const rightBottom = { x: pixelsBuilder.canvas.width, y: pixelsBuilder.canvas.height };
    const ledPoint = {
      x: (leftTop.x + rightBottom.x) / 2,
      y: (leftTop.y + rightBottom.y) / 2
    };
    this.beginPoint = pixelsBuilder.realPoint2GridAlignCanvasPoint(ledPoint);
  }

  //led 面板左上角画布坐标
  beginPoint !: ICanvasPoint;
  //led 面板右下角画布坐标
  endPoint !: ICanvasPoint;
  //led集合，根据 no 进行分类，每个map记录一个双向链表的头、尾结点,便于后续删除，添加
  ledCollection: Map<number, { h: DoubleLinkedList<Led>, t: DoubleLinkedList<Led>, nodeSize: number }> = new Map();
  //判断该坐标是否已经有led
  ledCoordinate: Set<string> = new Set();
  //当前layout配置信息
  ledLayoutSetting !: ILayoutSetting | undefined;
  //全局Layout信息
  globalConfig = {
    COVERABLE: false,  //是否可以覆盖在点上
  }

  draw() {
    const ctx = this.pixelsBuilder.ctx;
    ctx.beginPath();
    ctx.strokeStyle = "yellow";
    ctx.rect(
      this.beginPoint.x,
      this.beginPoint.y,
      this.width * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE,
      this.height * this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE);
    ctx.stroke();
    ctx.closePath();
    // 遍历所有led集合，绘制
    for (const [no, nodes] of this.ledCollection) {
      console.log(nodes);
      if (nodes)
        this.drawLinkedLeds(nodes.h);
    }
  }

  //监测选择区域和ledLayout的交集
  detectAreaIntersection(areaStart: Point, areaEnd: Point, pos: ERelaPosition) {
    const layoutBegin = this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.beginPoint);
    const layoutEnd = { x: layoutBegin.x + this.width, y: layoutBegin.y + this.height };
    const { start, end } = this.pixelsBuilder.mathUtils.findVerticalIntersectionArea({ start: areaStart, end: areaEnd }, { start: layoutBegin, end: layoutEnd });
    // 从lt -> rb 绘制led [sx,sy] -> (sx,sy)
    if (start.x < end.x && start.y < end.y) {
      if (this.ledLayoutSetting) {
        console.log("限制:", this.ledLayoutSetting.thresholdPoints);
        const links = this.getPointLists(start, end, this.ledLayoutSetting.lineAction, pos);
        let doubleLinkedNode = this.ledCollection.get(this.ledLayoutSetting.ledSetting.no!);
        let head!: DoubleLinkedList<Led>, tail!: DoubleLinkedList<Led>;
        if (doubleLinkedNode) head = doubleLinkedNode.h, tail = doubleLinkedNode.t;
        for (const link of links) {
          if (!this.globalConfig.COVERABLE) {
            const id = this.getPointHash(link.x, link.y);
            if (this.ledCoordinate.has(id)) continue;
            else this.ledCoordinate.add(id);
          }
          let led!: Led;
          if (!head && !tail) {
            led = new Led(link, this.ledLayoutSetting!.ledSetting, 1, this.pixelsBuilder);
            const node = new DoubleLinkedList(led);
            head = tail = node;
          } else {
            const no = tail.data.no;
            led = new Led(link, this.ledLayoutSetting!.ledSetting, no + 1, this.pixelsBuilder);
            const node = new DoubleLinkedList(led);
            tail.next = node;
            node.pre = tail;
            tail = tail.next;
          }
        }
        this.ledCollection.set(this.ledLayoutSetting.ledSetting.no!, { h: head, t: tail, nodeSize: links.length + (doubleLinkedNode?.nodeSize ?? 0) });
        this.dispatch("LedSelected", null, { no: this.ledLayoutSetting.ledSetting.no!, size: links.length });
        this.pixelsBuilder.reloadCanvas();
      }
    }
  }

  setLedSetting(setting?: ILayoutSetting) {
    this.ledLayoutSetting = setting;
  }

  getPointHash(x: number, y: number) {
    return JSON.stringify({ x, y });
  }

  //根据lineAction和区域选择相对位置返回需要绘制的点的坐标
  getPointLists(start: Point, end: Point, lineAction: ELineAction, pos: ERelaPosition): Point[] {
    //默认左上 -> 右下 -> 行优先
    const ret: Point[] = [];

    //行优先
    if (ELineAction.SINGULAR_ROW_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.rowPriorMatrix(start, end, pos);
    }
    //列优先 
    else if (ELineAction.SINGULAR_COLUMN_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.columnPriorMatrix(start, end, pos);
    }
    //折返行优先
    else if (ELineAction.BACK_ROW_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.backRowPriorMatrix(start, end, pos);
    }
    //折返列优先
    else if (ELineAction.BACK_COLUMN_PRIOR === lineAction) {
      return this.pixelsBuilder.mathUtils.backColumnPriorMatrix(start, end, pos);
    }

    return ret;
  }

  drawLinkedLeds(headLed: DoubleLinkedList<Led>) {
    let p: DoubleLinkedList<Led> | null = headLed;
    let pre !: Point | null;
    const ctx = this.pixelsBuilder.ctx;
    while (p) {
      const data = p.data;
      if (p.pre) data.no = p.pre.data.no + 1;
      const center = data.center;
      if (pre) {
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.strokeStyle = data.ledSetting.color!;
        ctx.moveTo(pre.x, pre.y);
        ctx.lineTo(center.x, center.y);
        ctx.stroke();
        ctx.closePath();
      }
      data.draw();
      pre = center;
      p = p.next;
    }
  }


  //保存当前快照
  snapShot() {

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
}

export interface ILayoutListener {

  /**
  * 当前选中编号为no的led个数
  */
  LedSelected: { no: number, size: number }
}