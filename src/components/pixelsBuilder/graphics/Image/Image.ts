import { UploadRawFile } from "element-plus";
import { IAreaCHoose, ICanvasPoint, IRealisticPoint } from "../../pixel.type";
import { PixelsBuilder } from "../../pixelsBuilder";
import { canvasGraphic, GraphicRect, IExportObject, IGraphicConfig } from "../graphics";

export class ImageGraphic implements canvasGraphic {

  graphicConfig: IGraphicConfig = {
    GRAPHIC_MOVE: true,
    GRAPHIC_RESIZE: true
  };

  onloaded = false;
  image !: HTMLImageElement;

  constructor(
    //图片起点
    public begin: ICanvasPoint,
    //图片宽高 网格像素
    public width: number, public height: number,
    //图片数据源
    public src: UploadRawFile | Blob,
    public pixelsBuilder: PixelsBuilder
  ) {
    const image = new Image();
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    image.width = this.width * grid;
    image.height = this.height * grid;
    image.src = URL.createObjectURL(this.src);
    image.onload = () => {
      this.onloaded = true;
      this.draw();
    }
    this.image = image;
  }
  offset = { x: 0, y: 0 }

  areaSelect(param: IAreaCHoose) {

  }

  areaDelete(param: IAreaCHoose) {
    const begin = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(param.areaStart);
    const end = this.pixelsBuilder.gridPixelsPoint2CanvasPoint(param.areaEnd);
    const { begin: S, width, height } = this.getBoundaryRect();
    if (begin.x <= S.x && begin.y <= S.y && (end.x >= (S.x + width) && end.y >= (S.y + height))) {
      this.pixelsBuilder.removeGraphic(this);
    }
  };

  async export(): Promise<IExportObject> {
    return {
      type: "Image",
      data: {
        begin: JSON.parse(JSON.stringify(this.pixelsBuilder.cavnasPoint2GridPixelsPoint(this.begin))),  //像素坐标
        width: this.width,
        height: this.height,
        src: await new Blob([this.src]).arrayBuffer()
      }
    }
  }

  setBoundaryRect(rect: GraphicRect) {
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    this.begin = rect.begin;
    this.width = Math.floor(rect.width / grid);
    this.height = Math.floor(rect.height / grid);
  }

  getBoundaryRect() {
    const begin: ICanvasPoint = this.pixelsBuilder.canvasPoint2GridAlign({ x: this.begin.x + this.offset.x, y: this.begin.y + this.offset.y });
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    return {
      begin,
      width: this.width * grid,
      height: this.height * grid
    }
  }

  draw() {
    if (!this.onloaded) return;
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    const begin = this.pixelsBuilder.canvasPoint2GridAlign({ x: this.begin.x + this.offset.x, y: this.begin.y + this.offset.y });
    this.pixelsBuilder.ctx.drawImage(this.image, begin.x, begin.y, this.width * grid, this.height * grid);
  }

  translate(start: IRealisticPoint, end: IRealisticPoint) {
    const S = this.pixelsBuilder.realPoint2CanvasPoint(start);
    const E = this.pixelsBuilder.realPoint2CanvasPoint(end);
    this.offset = {
      x: E.x - S.x,
      y: E.y - S.y
    };
  }

  //屏幕坐标
  pointContainer(x: number, y: number): boolean {
    const grid = this.pixelsBuilder.BasicAttribute.GRID_STEP_SIZE;
    return x >= (this.begin.x + this.offset.x) && y >= (this.begin.y + this.offset.y) && x <= (this.begin.x + grid * this.width + this.offset.x) && y <= (this.begin.y + grid * this.height + this.offset.y);
  }

  mouseup() {
    this.begin.x += this.offset.x;
    this.begin.y += this.offset.y;
    this.offset = { x: 0, y: 0 };
  }
} 