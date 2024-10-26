import { CanvasSystem } from "./CanvasSystem";
import { RICanvasConfig } from "./pixel.type";

export class PixelsBuilder extends CanvasSystem {


  constructor(node: HTMLCanvasElement, config: RICanvasConfig) {
    super(node, config);
  }


}