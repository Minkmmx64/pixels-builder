import { ELineAction } from "@/components/pixelsBuilder/enum";

export interface ILineAction {
  label: string;
  code: ELineAction;
}

//led属性
export interface ILedControllers {
  color: string;
  pixels: number;
  no: number;
  fenController: number;
}
