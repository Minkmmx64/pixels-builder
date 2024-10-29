import { throttle } from "lodash";
import { Cursor, ETools } from "./enum";
import { canvasGraphic, GraphicRect, Graphics, IGraphicConfig } from "./graphics/graphics";
import { Mathematic } from "./math/Mathematic";
import { ICanvasPoint, ICanvasSystemEvent, IPixelsEventListener, IRealisticPoint, Point, RICanvasConfig, Value } from "./pixel.type";

import { Listener } from "./pixelsListener";
import { firstLetterToLower, getRandomColor } from "./utils/utils";

// <typename T = 宿主容器事件 & graphic 图形派发事件 />
export class CanvasSystem extends Listener<IPixelsEventListener> {

  graphicId: number = 0;
  //画布元素
  canvas !: HTMLCanvasElement;
  //画笔上下文
  ctx !: CanvasRenderingContext2D;
  //数学方法
  mathUtils !: Mathematic;
  //画布2d变换
  transform = {
    scale: 4,
    translate: { x: 0, y: 0 }
  }
  //画布基础属性
  BasicAttribute = {
    //是否绘制网格线
    GRID_INITIALIZATION: true,
    //网格步长
    GRID_STEP_SIZE: 30,
    //网格颜色
    GRID_COLOR: "rgba(200,200,200,0.3)",
    //网格宽度
    GRID_WIDTH: 0.5,
    MAX_SCALE_SIZE: 8,
    MIN_SCALE_SIZE: 0.1,
    //区域选择与网格对齐
    AREA_GRID_ALIGN: true,
    BACKGROUND: "#000000"
  }
  //画布绘图元素集合
  graphics: Graphics[] = [];
  //撤回栈
  withDrawStack: ImageData[] = [];
  //取消撤回栈
  reWithDrawStack: ImageData[] = [];
  //当前正在操作的图形
  graphic: canvasGraphic | null = null;

  constructor(node: HTMLCanvasElement, public config: RICanvasConfig) {
    super();
    this.canvas = node;
    this.ctx = node.getContext("2d", { alpha: false })!;
    this.mathUtils = new Mathematic();
    this.ctx.save();
    this.initGridSystem();
    this.initEventListener();
    this.initGraphics();
  }

  //绘制网格
  initGridSystem() {
    const { width } = this.canvas.getBoundingClientRect();
    this.canvas.width = width;
    this.canvas.height = window.innerHeight;
    this.ctx.translate(this.transform.translate.x, this.transform.translate.y);
    this.ctx.scale(this.transform.scale, this.transform.scale);
    if (!this.BasicAttribute.GRID_INITIALIZATION) return;
    //vertical
    for (let i = -Math.ceil(this.transform.translate.x / this.BasicAttribute.GRID_STEP_SIZE) / this.transform.scale; i <= Math.ceil((- this.transform.translate.x + this.canvas.width) / this.BasicAttribute.GRID_STEP_SIZE) / this.transform.scale; i++) {
      this.ctx.lineWidth = this.BasicAttribute.GRID_WIDTH;
      this.ctx.strokeStyle = this.BasicAttribute.GRID_COLOR;
      this.ctx.beginPath();
      let u = Math.round(i);
      const x = Math.floor(u * this.BasicAttribute.GRID_STEP_SIZE + this.BasicAttribute.GRID_WIDTH / 2);
      const beginPoint: IRealisticPoint = { x: x, y: Math.floor(-this.transform.translate.y / this.transform.scale) };
      const endPoint: IRealisticPoint = { x: x, y: Math.floor((this.canvas.height + - this.transform.translate.y) / this.transform.scale) };
      this.ctx.moveTo(beginPoint.x, beginPoint.y);
      this.ctx.lineTo(endPoint.x, endPoint.y);
      this.ctx.stroke();
    }
    //horizon
    for (let i = -Math.ceil(this.transform.translate.y / this.BasicAttribute.GRID_STEP_SIZE) / this.transform.scale; i <= Math.ceil((-this.transform.translate.y + this.canvas.height) / this.BasicAttribute.GRID_STEP_SIZE) / this.transform.scale; i++) {
      this.ctx.lineWidth = this.BasicAttribute.GRID_WIDTH;
      this.ctx.strokeStyle = this.BasicAttribute.GRID_COLOR;
      this.ctx.beginPath();
      let u = Math.round(i);
      const y = Math.floor((u * this.BasicAttribute.GRID_STEP_SIZE + this.BasicAttribute.GRID_WIDTH / 2));
      const beginPoint: IRealisticPoint = { x: Math.floor(- this.transform.translate.x / this.transform.scale), y: y };
      const endPoint: IRealisticPoint = { x: Math.floor((this.canvas.width + - this.transform.translate.x) / this.transform.scale), y: y };
      this.ctx.moveTo(beginPoint.x, beginPoint.y);
      this.ctx.lineTo(endPoint.x, endPoint.y);
      this.ctx.stroke();
    }
  }

  //获取画布坐标
  getCanvasPoint(e: MouseEvent): IRealisticPoint {
    const { left, top } = this.canvas.getBoundingClientRect();
    return {
      x: e.x - left,
      y: e.y - top
    }
  }

  initEventListener() {
    //区域选择mouseup事件
    const area = document.getElementById("area");
    area?.addEventListener("mouseup", e => {
      this.canvas.dispatchEvent(new MouseEvent("mouseup", e));
    });
    area?.addEventListener("mousemove", e => {
      this.canvas.dispatchEvent(new MouseEvent("mousemove", e));
    });
    //上一次鼠标距离
    const screenPoint: IRealisticPoint = { x: 0, y: 0 };
    const preMousePoint = { x: 0, y: 0 } as Point;
    const canvasMouseDownFn = (e: MouseEvent) => {
      if (e.button !== 0) return;
      //移动画布
      if (this.config.value.mode === ETools.TOOLS_MOVE) {
        //寻找当前按下的点有没有可移动可缩放的图形
        const { x, y } = this.getCanvasPoint(e);
        const graphic = this.findOptionGraphic(x, y);
        if (graphic) {
          this.graphic = graphic;
          this.dispatch("ToggleCursor", null, { cursor: Cursor.GRAB });
        } else {
          this.graphic = null;
        }
        this.dispatch("ToggleCursor", null, { cursor: Cursor.GRABBING });
      } else if (this.config.value.mode === ETools.TOOLS_ARROW) {
        //判断点击的点是否有可伸缩的图形
        const { x, y } = this.getCanvasPoint(e);
        const graphic = this.findOptionGraphic(x, y);
        if (graphic && graphic.getBoundaryRect) {
          const graphicRect = graphic.getBoundaryRect();
          if (graphic.graphicConfig?.GRAPHIC_RESIZE) {
            console.log("显示伸缩");
          }
          if (graphic.graphicConfig?.GRAPHIC_ROTATE) {
            console.log("显示旋转");
          }
          this.showGraphicUtils(graphicRect, graphic.graphicConfig);
        } else {
          console.log("隐藏");
        }
      }
      this.canvas.addEventListener("mouseup", canvasMouseUp);
      this.canvas.addEventListener("mousemove", canvasMouseMove);
      const { x, y } = this.getCanvasPoint(e);
      screenPoint.x = x, screenPoint.y = y;
      preMousePoint.x = x, preMousePoint.y = y;
      if (this.BasicAttribute.AREA_GRID_ALIGN) {
        const newPoint = this.realPoint2GridAlignCanvasPoint2RealPoint(screenPoint);
        screenPoint.x = newPoint.x, screenPoint.y = newPoint.y;
      }
    }
    const canvasMouseMoveFn = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const { x, y } = this.getCanvasPoint(e);
      switch (this.config.value.mode) {
        case ETools.TOOLS_MOVE: {
          if (this.graphic) {
            let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
            if (this.BasicAttribute.AREA_GRID_ALIGN) {
              endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
            }
            if (this.graphic.translate) {
              this.graphic.translate(preMousePoint, endPoint);
              this.reloadCanvas();
            }
          } else {
            this.transform.translate.x += (x - screenPoint.x);
            this.transform.translate.y += (y - screenPoint.y);
            screenPoint.x = x;
            screenPoint.y = y;
            this.dispatch("ToggleMove", null, JSON.parse(JSON.stringify(this.transform.translate)));
            this.reloadCanvas();
          }
          break;
        }
        case ETools.TOOLS_ARROW: {
          let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
          if (this.BasicAttribute.AREA_GRID_ALIGN) {
            endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
          }
          const w = endPoint.x - screenPoint.x;
          const h = endPoint.y - screenPoint.y;
          this.dispatch("ToggleArea", 5, { w, h, start: screenPoint, end: endPoint, bgColor: "#007aff10", borderColor: "#007aff" });
          break;
        }
        case ETools.TOOLS_DELETE_AREA: {
          let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
          if (this.BasicAttribute.AREA_GRID_ALIGN) {
            endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
          }
          const w = endPoint.x - screenPoint.x;
          const h = endPoint.y - screenPoint.y;
          this.dispatch("ToggleArea", 5, { w, h, start: screenPoint, end: endPoint, bgColor: "#ff000010", borderColor: "#ff0000" });
          break;
        }
      }
    }
    const canvasMouseUpFn = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (this.config.value.mode === ETools.TOOLS_MOVE) {
        this.dispatch("ToggleCursor", null, { cursor: Cursor.GRAB });
      } else if (this.config.value.mode === ETools.TOOLS_ARROW) {
        this.dispatch("ToggleCursor", null, { cursor: Cursor.DEFAULT });
      }
      const point = this.getCanvasPoint(e);
      this.dispatch("ToggleAreaClose", null, void 0);
      let endPoint: IRealisticPoint = JSON.parse(JSON.stringify(point));
      if (this.BasicAttribute.AREA_GRID_ALIGN) {
        endPoint = this.realPoint2GridAlignCanvasPoint(point);
      }
      const startPoint = this.realPoint2GridAlignCanvasPoint(screenPoint);
      //获取画布坐标
      this.dispatch("ToggleAreaEnd", null, { start: startPoint, end: endPoint })
      this.canvas.removeEventListener("mouseup", canvasMouseUp);
      this.canvas.removeEventListener("mousemove", canvasMouseMove);
      this.dispatchGraphicEvent("canvasDispatch:Mouseup", point);
    }
    const canvasMouseUp = canvasMouseUpFn.bind(this);
    const canvasMouseMove = throttle(canvasMouseMoveFn.bind(this), 0);
    const canvasMouseDown = canvasMouseDownFn.bind(this);
    this.canvas.addEventListener("mousedown", canvasMouseDown);
    window.addEventListener("resize", this.reloadCanvas.bind(this));
    this.canvas.addEventListener("wheel", e => {
      const direct = (e as Value).wheelDelta;
      const { left, right, top, bottom } = this.canvas.getBoundingClientRect();
      /**
       * 添加滚轮调整位移参数......
       */
      if (direct > 0) this.transform.scale = Math.min(this.BasicAttribute.MAX_SCALE_SIZE, this.transform.scale + 0.1);
      else this.transform.scale = Math.max(this.transform.scale - 0.1, this.BasicAttribute.MIN_SCALE_SIZE);
      this.reloadCanvas();
    });

    this.canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      //获取屏幕坐标 -> 计算画布坐标 -> 派发右击事件给所有 graphic
    })
  }

  initGraphics() {
    requestAnimationFrame(() => {
      this.graphics.forEach(g => g.graphic.draw());
    })
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addGraphic({ graphic, id }: Graphics) {
    if (id === "auto") {
      this.graphics.unshift({ graphic, id: (this.graphicId++).toString() });
    }
    else {
      if (this.graphics.find(g => g.id == id)) {
        this.graphics.splice(this.graphics.findIndex(g => g.id == id), 1);
      }
      this.graphics.unshift({ graphic, id });
    }
    this.reloadCanvas();
  }

  reloadCanvas() {
    this.clearCanvas();
    this.initGridSystem();
    this.initGraphics();
  }

  //屏幕坐标 -> 画布坐标
  realPoint2CanvasPoint(point: IRealisticPoint): ICanvasPoint {
    return {
      x: (point.x - this.transform.translate.x) / this.transform.scale,
      y: (point.y - this.transform.translate.y) / this.transform.scale
    }
  }

  //画布坐标 -> 屏幕坐标
  canvasPoint2RealPoint(point: ICanvasPoint): IRealisticPoint {
    return {
      x: (point.x) * this.transform.scale + this.transform.translate.x,
      y: (point.y) * this.transform.scale + this.transform.translate.y,
    }
  }

  //屏幕坐标 -> 画布与网格对齐的最近坐标 -> 转屏幕坐标
  realPoint2GridAlignCanvasPoint2RealPoint(point: IRealisticPoint): IRealisticPoint {
    const newCanvasPoint = this.realPoint2GridAlignCanvasPoint(point);
    return this.canvasPoint2RealPoint(newCanvasPoint);
  }

  // 屏幕坐标 -> 画布与网格对齐的最近坐标
  realPoint2GridAlignCanvasPoint(point: IRealisticPoint): ICanvasPoint {
    const canvasPoint = this.realPoint2CanvasPoint(point);
    const newPointx = Math.round(canvasPoint.x / this.BasicAttribute.GRID_STEP_SIZE) * this.BasicAttribute.GRID_STEP_SIZE;
    const newPointy = Math.round(canvasPoint.y / this.BasicAttribute.GRID_STEP_SIZE) * this.BasicAttribute.GRID_STEP_SIZE;
    const newCanvasPoint: ICanvasPoint = { x: newPointx, y: newPointy };
    return newCanvasPoint;
  }

  //屏幕坐标 -> grid 像素坐标
  realPoint2GridPixelsPoint(point: IRealisticPoint): Point {
    const canvasPoint = this.realPoint2GridAlignCanvasPoint(point);
    return this.cavnasPoint2GridPixelsPoint(canvasPoint);
  }

  //画布坐标 -> grid 像素坐标
  cavnasPoint2GridPixelsPoint(canvasPoint: ICanvasPoint): Point {
    const newPointx = Math.round(canvasPoint.x / this.BasicAttribute.GRID_STEP_SIZE);
    const newPointy = Math.round(canvasPoint.y / this.BasicAttribute.GRID_STEP_SIZE);
    return { x: newPointx, y: newPointy }
  }

  //画布坐标 -> grid 像素坐标 -> 最近的网格坐标
  canvasPoint2GridAlign(point: ICanvasPoint): ICanvasPoint {
    const grid = this.cavnasPoint2GridPixelsPoint(point);
    return {
      x: grid.x * this.BasicAttribute.GRID_STEP_SIZE,
      y: grid.y * this.BasicAttribute.GRID_STEP_SIZE
    }
  }

  //grid像素坐标 -> 画布坐标
  gridPixelsPoint2CanvasPoint(point: Point): ICanvasPoint {
    return this.mathUtils.scale(point, this.BasicAttribute.GRID_STEP_SIZE);
  }

  dispatchGraphicEvent<T extends keyof ICanvasSystemEvent>(event: T, param: ICanvasSystemEvent[T]) {
    let ev = event as string;
    if (event.startsWith("canvasDispatch:")) ev = event.replaceAll("canvasDispatch:", "");
    ev = firstLetterToLower(ev);
    this.graphics.forEach(({ graphic }) => {
      (graphic as any)[ev] ? ((graphic as any)[ev](param)) : null;
    });
  }

  //寻找第一个可操作的图形
  findOptionGraphic(x: number, y: number): canvasGraphic | null {
    const canvasPoint = this.realPoint2CanvasPoint({ x, y });
    for (const g of this.graphics) {
      if (g.graphic.graphicConfig && g.graphic.graphicConfig.GRAPHIC_MOVE && g.graphic.pointContainer && g.graphic.pointContainer(canvasPoint.x, canvasPoint.y)) {
        return g.graphic;
      }
    }
    return null;
  }

  //显示图形编辑栏
  showGraphicUtils(rect: GraphicRect, options?: IGraphicConfig) {
    console.log(rect, options);
  }
}