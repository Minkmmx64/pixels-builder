import { UniqueIndex } from "./UniqueIndex";

export class DoubleLinkedNode<T> extends UniqueIndex {

  next: DoubleLinkedNode<T> | null = null;
  pre: DoubleLinkedNode<T> | null = null;

  constructor(public data: T) {
    super();
    this.pre = null;
    this.next = null;
  }

  free() {
    this.next = null;
    this.pre = null;
  }
}

export class DoubleLinkedLists<T> extends UniqueIndex {

  head: DoubleLinkedNode<T> | null = null;
  tail: DoubleLinkedNode<T> | null = null;
  size: number = 0;
  no  !: number;
  constructor(no: number) {
    super();
    this.no = no;
  }

}