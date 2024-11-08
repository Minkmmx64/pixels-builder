import { throttle } from "lodash";
import { Cursor, ETools } from "./enum";
import { canvasGraphic, GraphicRect, Graphics, GraphicTools, IGraphicConfig } from "./graphics/graphics";
import { Mathematic } from "./math/Mathematic";
import { ICanvasPoint, ICanvasSystemEvent, IPixelsEventListener, IRealisticPoint, Point, RICanvasConfig, Value } from "./pixel.type";

import { Listener } from "./pixelsListener";
import { firstLetterToLower } from "./utils/utils";
import { DragItem, EGraphicMoveTools } from "./graphics/dragItem";
import { PixelsBuilder } from "./pixelsBuilder";
import { ElMessage } from "element-plus";

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
    scale: 1,
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
  //工具绘图元素
  graphicsTools: Graphics<GraphicTools>[] = [];
  //当前正在操作的图形
  currentOptionGraphic: canvasGraphic | null = null;
  //当前操作的工具图形
  currentOptionGraphicTools: GraphicTools | null = null;
  //鼠标起点，中点
  mouseData = {
    mouseDownPoint: { x: 0, y: 0 },
    mouseMovePoint: { x: 0, y: 0 }
  }
  //当前是否正在拖动工具
  currentIsMoveUtils = false;

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
    area?.addEventListener("mouseup", e => { this.canvas.dispatchEvent(new MouseEvent("mouseup", e)) });
    area?.addEventListener("mousemove", e => { this.canvas.dispatchEvent(new MouseEvent("mousemove", e)) });
    area?.addEventListener("click", e => {
      if (this.config.value.mode === ETools.TOOLS_COPY_CIRCUIT) {
        this.dispatch("ToggleAreaClose", null, null);
        this.dispatch("ToggleCursor", null, { cursor: Cursor.DEFAULT });
        const point = this.realPoint2GridAlignCanvasFloorPoint(this.getCanvasPoint(e));
        const XY = {
          x: point.x / this.BasicAttribute.GRID_STEP_SIZE,
          y: point.y / this.BasicAttribute.GRID_STEP_SIZE
        }
        this.dispatchGraphicEvent("canvasDispatch:OnCurcuitCopy", XY);
      } else if (this.config.value.mode === ETools.TOOLS_PASTE_AREA) {
        this.dispatch("ToggleAreaClose", null, null);
        this.dispatch("ToggleCursor", null, { cursor: Cursor.DEFAULT });
        const point = this.realPoint2GridAlignCanvasFloorPoint(this.getCanvasPoint(e));
        const XY = {
          x: point.x / this.BasicAttribute.GRID_STEP_SIZE,
          y: point.y / this.BasicAttribute.GRID_STEP_SIZE
        }
        this.dispatchGraphicEvent("canvasDispatch:OnCurcuitAreaPaste", XY);
        this.dispatch("ToggleAreaThumbnail", null, "");
      }
    });
    //上一次鼠标实际距离
    const preMousePoint = { x: 0, y: 0 } as Point;
    const canvasMouseDownFn = (e: MouseEvent) => {
      const { x, y } = this.getCanvasPoint(e);
      //右键移动整个画布
      if (e.button === 2 && this.config.value.mode === ETools.TOOLS_MOVE) {
        this.canvas.addEventListener("mouseup", canvasMouseUp);
        this.canvas.addEventListener("mousemove", canvasMouseMove);
        this.mouseData.mouseDownPoint = { x, y };
        this.mouseData.mouseMovePoint = { x, y };
        preMousePoint.x = x, preMousePoint.y = y;
        if (this.BasicAttribute.AREA_GRID_ALIGN) {
          const newPoint = this.realPoint2GridAlignCanvasPoint2RealPoint(this.mouseData.mouseDownPoint);
          this.mouseData.mouseDownPoint.x = newPoint.x, this.mouseData.mouseDownPoint.y = newPoint.y;
        }
        this.clearGraphicUtils();
        this.dispatch("ToggleCursor", null, { cursor: Cursor.GRABBING });
        return;
      }
      if (e.button !== 0) return;
      //左键移动图形
      if (this.config.value.mode === ETools.TOOLS_MOVE) {
        const graphic = this.findOptionGraphic(x, y);
        if (graphic) {
          this.currentOptionGraphic = graphic;
          this.dispatch("ToggleCursor", null, { cursor: Cursor.GRAB });
        } else {
          this.currentOptionGraphic = null;
        }
        this.clearGraphicUtils();
        this.dispatch("ToggleCursor", null, { cursor: Cursor.GRABBING });
      } else if (this.config.value.mode === ETools.TOOLS_ARROW) {
        //当前工具栏是TOOLS_ARROW 且 当前有可操作的图形
        if (this.currentOptionGraphicTools) {
          this.graphicToolsEventBus.graphicToolsMouseMove = this.graphicToolsMouseMove.bind(this);
          this.canvas.addEventListener("mousemove", this.graphicToolsEventBus.graphicToolsMouseMove);
          this.currentIsMoveUtils = true;
          this.currentGraphicRect = this.currentOptionGraphic?.getBoundaryRect && this.currentOptionGraphic.getBoundaryRect();
          this.canvas.addEventListener("mouseup", canvasMouseUp);
          this.mouseData.mouseDownPoint = { x, y };
          this.mouseData.mouseMovePoint = { x, y };
          preMousePoint.x = x, preMousePoint.y = y;
          if (this.BasicAttribute.AREA_GRID_ALIGN) {
            const newPoint = this.realPoint2GridAlignCanvasPoint2RealPoint(this.mouseData.mouseDownPoint);
            this.mouseData.mouseDownPoint.x = newPoint.x, this.mouseData.mouseDownPoint.y = newPoint.y;
          }
          return;
        } else {
          //删除事件监听
          if (this.graphicToolsEventBus.graphicToolsMouseMove)
            this.canvas.removeEventListener("mousemove", this.graphicToolsEventBus.graphicToolsMouseMove);
          this.graphicToolsEventBus.graphicToolsMouseMove = null;
          //获取当前点击的图形
          const graphic = this.findOptionGraphic(x, y);
          if (graphic && graphic.getBoundaryRect) {
            const graphicRect = graphic.getBoundaryRect();
            this.showGraphicUtils(graphicRect, graphic.graphicConfig);
            this.currentOptionGraphic = graphic;
          } else {
            this.currentOptionGraphic = null;
            this.clearGraphicUtils();
          }
        }
      }
      this.canvas.addEventListener("mouseup", canvasMouseUp);
      this.canvas.addEventListener("mousemove", canvasMouseMove);
      this.mouseData.mouseDownPoint = { x, y };
      this.mouseData.mouseMovePoint = { x, y };
      preMousePoint.x = x, preMousePoint.y = y;
      if (this.BasicAttribute.AREA_GRID_ALIGN) {
        const newPoint = this.realPoint2GridAlignCanvasPoint2RealPoint(this.mouseData.mouseDownPoint);
        this.mouseData.mouseDownPoint.x = newPoint.x, this.mouseData.mouseDownPoint.y = newPoint.y;
      }
    }
    const canvasMouseMoveFn = (e: MouseEvent) => {
      const { x, y } = this.getCanvasPoint(e);
      //右键移动画布
      if (e.button === 2 && this.config.value.mode === ETools.TOOLS_MOVE) {
        this.mouseData.mouseMovePoint.x = x;
        this.mouseData.mouseMovePoint.y = y;
        this.transform.translate.x += (x - this.mouseData.mouseMovePoint.x);
        this.transform.translate.y += (y - this.mouseData.mouseMovePoint.y);
        this.dispatch("ToggleMove", null, JSON.parse(JSON.stringify(this.transform.translate)));
        this.reloadCanvas();
        return;
      }
      if (e.button !== 0) return;
      switch (this.config.value.mode) {
        case ETools.TOOLS_MOVE: {
          if (this.currentOptionGraphic) {
            let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
            if (this.BasicAttribute.AREA_GRID_ALIGN) {
              endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
            }
            if (this.currentOptionGraphic.translate) {
              this.currentOptionGraphic.translate(preMousePoint, endPoint);
              if (this.graphicsTools.length && this.currentOptionGraphic.getBoundaryRect) {
                this.showGraphicUtils(this.currentOptionGraphic.getBoundaryRect(), this.currentOptionGraphic.graphicConfig);
              }
              this.reloadCanvas();
            }
          } else {
            this.transform.translate.x += (x - this.mouseData.mouseMovePoint.x);
            this.transform.translate.y += (y - this.mouseData.mouseMovePoint.y);
            this.mouseData.mouseMovePoint.x = x;
            this.mouseData.mouseMovePoint.y = y;
            this.dispatch("ToggleMove", null, JSON.parse(JSON.stringify(this.transform.translate)));
            this.reloadCanvas();
          }
          break;
        }
        case ETools.TOOLS_ARROW: {
          //判断当前有没有触碰到graphicTools
          let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
          if (this.BasicAttribute.AREA_GRID_ALIGN) {
            endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
          }
          const w = endPoint.x - this.mouseData.mouseDownPoint.x;
          const h = endPoint.y - this.mouseData.mouseDownPoint.y;
          this.dispatch("ToggleArea", 5, { w, h, start: this.mouseData.mouseDownPoint, end: endPoint, bgColor: "#007aff10", borderColor: "#007aff" });
          break;
        }
        case ETools.TOOLS_DELETE_AREA: {
          let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
          if (this.BasicAttribute.AREA_GRID_ALIGN) {
            endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
          }
          const w = endPoint.x - this.mouseData.mouseDownPoint.x;
          const h = endPoint.y - this.mouseData.mouseDownPoint.y;
          this.dispatch("ToggleArea", 5, { w, h, start: this.mouseData.mouseDownPoint, end: endPoint, bgColor: "#ff000010", borderColor: "#ff0000" });
          break;
        }
        case ETools.TOOLS_COPY_AREA: {
          let endPoint: IRealisticPoint = JSON.parse(JSON.stringify({ x, y }));
          if (this.BasicAttribute.AREA_GRID_ALIGN) {
            endPoint = this.realPoint2GridAlignCanvasPoint2RealPoint({ x, y });
          }
          const w = endPoint.x - this.mouseData.mouseDownPoint.x;
          const h = endPoint.y - this.mouseData.mouseDownPoint.y;
          this.dispatch("ToggleArea", 5, { w, h, start: this.mouseData.mouseDownPoint, end: endPoint, bgColor: "#FFCC3310", borderColor: "#FFCC33" });
          break;
        }
      }
    }
    const canvasMouseUpFn = (e: MouseEvent) => {
      if (e.button === 2 && this.config.value.mode === ETools.TOOLS_MOVE) {
        this.dispatch("ToggleCursor", null, { cursor: Cursor.GRAB });
        this.canvas.removeEventListener("mouseup", canvasMouseUp);
        this.canvas.removeEventListener("mousemove", canvasMouseMove);
        this.currentOptionGraphic = null;
        return;
      }
      if (e.button !== 0) return;
      if (this.currentIsMoveUtils) {
        this.currentIsMoveUtils = false;
        if (this.graphicToolsEventBus.graphicToolsMouseMove)
          this.canvas.removeEventListener("mousemove", this.graphicToolsEventBus.graphicToolsMouseMove);
        this.graphicToolsEventBus.graphicToolsMouseMove = null;
        return;
      }
      if (this.config.value.mode === ETools.TOOLS_MOVE) {
        this.dispatch("ToggleCursor", null, { cursor: Cursor.GRAB });
        this.currentOptionGraphic = null;
      } else if (this.config.value.mode === ETools.TOOLS_ARROW) {
        this.dispatch("ToggleCursor", null, { cursor: Cursor.DEFAULT });
      } else if (this.config.value.mode === ETools.TOOLS_COPY_AREA) {
        //this.dispatch("ToggleCursor", null, { cursor: Cursor.DEFAULT });
      }
      const point = this.getCanvasPoint(e);
      this.dispatch("ToggleAreaClose", null, void 0);
      let endPoint: IRealisticPoint = JSON.parse(JSON.stringify(point));
      if (this.BasicAttribute.AREA_GRID_ALIGN) {
        endPoint = this.realPoint2GridAlignCanvasPoint(point);
      }
      const startPoint = this.realPoint2GridAlignCanvasPoint(this.mouseData.mouseDownPoint);
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
      this.reloadCanvas("wheel");
    });

    this.canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      //获取屏幕坐标 -> 计算画布坐标 -> 派发右击事件给所有 graphic
      const point = this.cavnasPoint2GridPixelsPoint(this.realPoint2GridAlignCanvasFloorPoint(this.getCanvasPoint(e)));
      if (this.config.value.mode === ETools.TOOLS_ARROW) {
        this.dispatchGraphicEvent("canvasDispatch:OnContextMenu", point);
      }
    });

    //检测是否触碰到工具栏
    this.canvas.addEventListener("mousemove", e => {
      const { x, y } = this.getCanvasPoint(e);
      if (this.config.value.mode === ETools.TOOLS_ARROW) {
        const graphic = this.hasMoveToGraphicTools({ x, y });
        if (graphic) {
          switch (graphic.util) {
            case EGraphicMoveTools.LEFT_TOP:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.NW_RESIZE });
              break;
            case EGraphicMoveTools.TOP:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.S_RESIZE });
              break;
            case EGraphicMoveTools.RIGHT_TOP:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.NE_RESIZE });
              break;
            case EGraphicMoveTools.RIGHT:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.E_RESIZE });
              break;
            case EGraphicMoveTools.RIGHT_BOTTOM:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.NW_RESIZE });
              break;
            case EGraphicMoveTools.BOTTOM:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.S_RESIZE });
              break;
            case EGraphicMoveTools.LEFT_BOTTOM:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.NE_RESIZE });
              break;
            case EGraphicMoveTools.LEFT:
              this.dispatch("ToggleCursor", null, { cursor: Cursor.E_RESIZE });
              break;
          }
          this.currentOptionGraphicTools = graphic;
        } else {
          if (this.currentIsMoveUtils) return;
          this.currentOptionGraphicTools = null;
          this.dispatch("ToggleCursor", null, { cursor: Cursor.DEFAULT });
        }
      } else if (this.config.value.mode === ETools.TOOLS_COPY_CIRCUIT || this.config.value.mode === ETools.TOOLS_PASTE_AREA) {
        let start = this.realPoint2GridAlignCanvasFloorPoint({ x, y });
        const end = this.canvasPoint2RealPoint({
          x: start.x + this.BasicAttribute.GRID_STEP_SIZE,
          y: start.y + this.BasicAttribute.GRID_STEP_SIZE
        })
        start = this.canvasPoint2RealPoint(start);
        this.dispatch("ToggleArea", null, {
          w: end.x - start.x, h: end.y - start.y,
          start, end,
          borderColor: "#00ff00", bgColor: "#00ff0010"
        });
      }
    });

    window.addEventListener("keydown", e => {

      if (e.code === "KeyZ" && e.ctrlKey) {
        this.undo();
      } else if (e.code === "KeyY" && e.ctrlKey) {
        this.redo();
      } else if (e.code === "KeyS" && e.ctrlKey) {
        //ElMessage.success("保存成功");
      }
    })
  }

  undo() {
    this.dispatchGraphicEvent("canvasDispatch:UndoSnapShot", undefined);
    this.reloadCanvas();
  }

  redo() {
    this.dispatchGraphicEvent("canvasDispatch:RedoSnapShot", undefined);
    this.reloadCanvas();
  }

  initGraphics(type ?: Value) {
    this.graphics.sort((a, b) => ((a.priority ?? 0) - (b.priority ?? 0)));
    this.graphics = this.graphics.filter(g => !g.isremoved);
    requestAnimationFrame(() => {
      this.graphics.forEach(g => g.graphic.draw(type));
      this.graphicsTools.forEach(g => g.graphic.draw());
    });
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addGraphic({ graphic, id, priority }: Graphics) {
    if (id === "auto") {
      this.graphics.unshift({ graphic, id: this.graphicId.toString(), priority: this.graphicId++ });
    }
    else {
      if (this.graphics.find(g => g.id == id)) {
        this.graphics.splice(this.graphics.findIndex(g => g.id == id), 1);
      }
      this.graphics.unshift({ graphic, id, priority });
    }
    this.reloadCanvas();
  }

  reloadCanvas(type?: Value) {
    this.clearCanvas();
    this.initGridSystem();
    this.initGraphics(type);
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

  // 屏幕坐标 -> 画布与网格对齐的最小坐标
  realPoint2GridAlignCanvasFloorPoint(point: IRealisticPoint): ICanvasPoint {
    const canvasPoint = this.realPoint2CanvasPoint(point);
    const newPointx = Math.floor(canvasPoint.x / this.BasicAttribute.GRID_STEP_SIZE) * this.BasicAttribute.GRID_STEP_SIZE;
    const newPointy = Math.floor(canvasPoint.y / this.BasicAttribute.GRID_STEP_SIZE) * this.BasicAttribute.GRID_STEP_SIZE;
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
    this.graphics.map(({ graphic }) => {
      (graphic as any)[ev] ? ((graphic as any)[ev](param)) : null;
    });
    if (ev === "areaDelete") {
      this.reloadCanvas();
    }

  }

  //寻找第一个可操作的图形
  findOptionGraphic(x: number, y: number): canvasGraphic | null {
    const canvasPoint = this.realPoint2CanvasPoint({ x, y });
    this.graphics.sort((a, b) => ((b.priority ?? 0) - (a.priority ?? 0)));
    for (const g of this.graphics) {
      if (g.graphic.graphicConfig && g.graphic.graphicConfig.GRAPHIC_MOVE && g.graphic.pointContainer && g.graphic.pointContainer(canvasPoint.x, canvasPoint.y)) {
        return g.graphic;
      }
    }
    return null;
  }

  //显示图形编辑栏
  showGraphicUtils(rect: GraphicRect, options?: IGraphicConfig) {
    const LEFT_TOP = JSON.parse(JSON.stringify(rect.begin)) as ICanvasPoint;
    const TOP = { x: LEFT_TOP.x + rect.width / 2, y: LEFT_TOP.y };
    const RIGHT_TOP = { x: LEFT_TOP.x + rect.width, y: LEFT_TOP.y };
    const RIGHT = { x: LEFT_TOP.x + rect.width, y: LEFT_TOP.y + rect.height / 2 };
    const RIGHT_BOTTOM = { x: LEFT_TOP.x + rect.width, y: LEFT_TOP.y + rect.height };
    const BOTTOM = { x: LEFT_TOP.x + rect.width / 2, y: LEFT_TOP.y + rect.height };
    const LEFT_BOTTOM = { x: LEFT_TOP.x, y: LEFT_TOP.y + rect.height };
    const LEFT = { x: LEFT_TOP.x, y: LEFT_TOP.y + rect.height / 2 };
    const point: ICanvasPoint[] = [
      LEFT_TOP,
      TOP,
      RIGHT_TOP,
      RIGHT,
      RIGHT_BOTTOM,
      BOTTOM,
      LEFT_BOTTOM,
      LEFT
    ]
    const ret: Graphics<GraphicTools>[] = [];
    if (options?.GRAPHIC_RESIZE) {
      for (let i = 0; i < 8; i++) {
        let begin = point[i];
        const dragItem = new DragItem(i, { x: begin.x, y: begin.y }, this as unknown as PixelsBuilder);
        ret.push({ id: `drag_${i}`, graphic: dragItem, priority: i });
      }
    }
    if (options?.GRAPHIC_ROTATE) {

    }
    this.graphicsTools = ret;
    this.reloadCanvas();
  }

  clearGraphicUtils() {
    this.graphicsTools = [];
    this.reloadCanvas();
  }

  //获取当前选择的工具栏类型
  hasMoveToGraphicTools(point: Point): GraphicTools | null {
    const canvasPoint: ICanvasPoint = this.realPoint2CanvasPoint(point);
    const g = this.graphicsTools.find(g => g.graphic.pointContainer && g.graphic.pointContainer(canvasPoint.x, canvasPoint.y));
    if (g) return g.graphic;
    return null;
  }

  //工具栏绑定事件
  graphicToolsEventBus: Record<string, ((e: any) => void) | null> = {
    graphicToolsMouseMove: null,
  }
  //当前需要操作的图形数据
  currentGraphicRect: GraphicRect | undefined;

  //工具栏事件
  graphicToolsMouseMove(e: MouseEvent) {
    const { x, y } = this.getCanvasPoint(e);
    if (this.currentOptionGraphic && this.currentGraphicRect && this.currentOptionGraphicTools) {
      let { begin, width, height } = this.currentGraphicRect;
      begin = JSON.parse(JSON.stringify(begin));
      const util = this.currentOptionGraphicTools?.util;
      const E = this.realPoint2CanvasPoint({ x, y });
      const S = this.realPoint2CanvasPoint(this.mouseData.mouseDownPoint);
      const offset = { x: E.x - S.x, y: E.y - S.y };
      let size !: ICanvasPoint;
      switch (util) {
        case EGraphicMoveTools.LEFT_TOP:
          size = this.canvasPoint2GridAlign({
            x: width - offset.x,
            y: height - offset.y
          });
          begin.x += offset.x, begin.y += offset.y;
          break;
        case EGraphicMoveTools.TOP:
          size = this.canvasPoint2GridAlign({
            x: width,
            y: height - offset.y
          });
          begin.y += offset.y;
          break;
        case EGraphicMoveTools.RIGHT_TOP:
          size = this.canvasPoint2GridAlign({
            x: width + offset.x,
            y: height - offset.y
          });
          begin.y += offset.y;
          break;
        case EGraphicMoveTools.RIGHT:
          size = this.canvasPoint2GridAlign({
            x: width + offset.x,
            y: height
          })
          break;
        case EGraphicMoveTools.RIGHT_BOTTOM:
          size = this.canvasPoint2GridAlign({
            x: width + offset.x,
            y: height + offset.y
          })
          break;
        case EGraphicMoveTools.BOTTOM:
          size = this.canvasPoint2GridAlign({
            x: width,
            y: height + offset.y
          })
          break;
        case EGraphicMoveTools.LEFT_BOTTOM:
          size = this.canvasPoint2GridAlign({
            x: width - offset.x,
            y: height + offset.y
          });
          begin.x += offset.x;
          break;
        case EGraphicMoveTools.LEFT:
          size = this.canvasPoint2GridAlign({
            x: width - offset.x,
            y: height
          });
          begin.x += offset.x;
          break;
      }
      if (!size) return;
      if (this.currentOptionGraphic.setBoundaryRect) {
        this.currentOptionGraphic.setBoundaryRect({ begin: this.canvasPoint2GridAlign(JSON.parse(JSON.stringify(begin))), width: size.x, height: size.y });
        if (this.currentOptionGraphic.getBoundaryRect)
          this.showGraphicUtils(this.currentOptionGraphic.getBoundaryRect(), this.currentOptionGraphic.graphicConfig);
      }
      this.reloadCanvas();
    }
  }
}