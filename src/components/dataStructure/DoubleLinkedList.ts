import { UniqueIndex } from "./UniqueIndex";

export class DoubleLinkedList<T> extends UniqueIndex {

  next: DoubleLinkedList<T> | null = null;
  pre: DoubleLinkedList<T> | null = null;

  constructor(public data: T) {
    super();
    this.pre = null;
    this.next = null;
  }
}