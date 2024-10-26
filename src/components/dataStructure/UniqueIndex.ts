import { v4 } from "uuid";
export class UniqueIndex {

  ObjectId !: string;
  constructor(){
    this.ObjectId = v4();
  }

}