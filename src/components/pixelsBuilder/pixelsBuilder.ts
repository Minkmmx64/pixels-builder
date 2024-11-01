import { CanvasSystem } from "./CanvasSystem";
import { canvasGraphic, IExportObject } from "./graphics/graphics";
import { ImageGraphic } from "./graphics/Image/Image";
import { RICanvasConfig } from "./pixel.type";

export class PixelsBuilder extends CanvasSystem {


  constructor(node: HTMLCanvasElement, config: RICanvasConfig) {
    super(node, config);
  }


  removeGraphic(g: canvasGraphic) {
    const index = this.graphics.findIndex(({ graphic }) => graphic === g);
    this.graphics[index].isremoved = true;
  }


  //导出
  async export(): Promise<IExportObject[]> {
    const ret = await Promise.all(this.graphics.map(g => g.graphic.export && g.graphic.export()).filter(g => g) as IExportObject[]);
    return ret;
  }

  //导入
  import(objects: IExportObject[]) {
    for (let i = 0; i < objects.length; i++) {
      const { data, type } = objects[i];
      if (type === "Image") {
        this.graphics.push({ id: "auto", graphic: new ImageGraphic(this.gridPixelsPoint2CanvasPoint(data.begin), data.width, data.height, new Blob([data.src]), this) });
      }
    }
  }
}