import { CanvasSystem } from "./CanvasSystem";
import { canvasGraphic } from "./graphics/graphics";
import { RICanvasConfig } from "./pixel.type";

export class PixelsBuilder extends CanvasSystem {


  constructor(node: HTMLCanvasElement, config: RICanvasConfig) {
    super(node, config);
  }


  removeGraphic(g: canvasGraphic) {
    const index = this.graphics.findIndex(({ graphic }) => graphic === g);
    this.graphics[index].isremoved = true;
  }
}