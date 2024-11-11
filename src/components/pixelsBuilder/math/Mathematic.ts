import { ERelaPosition } from "../enum";
import { Point } from "../pixel.type";


export class Mathematic {
  constructor() { }

  //点放缩
  scale(point: Point, scale: number): Point {
    return {
      x: point.x * scale,
      y: point.y * scale
    }
  }

  //获取2点相对位置
  pointRelaPos(A: Point, B: Point): ERelaPosition {
    let st = (Number((A.x < B.x)) << 1) | Number((A.y < B.y));
    const data = [ERelaPosition.B_3_QUADRANT_A, ERelaPosition.B_4_QUADRANT_A, ERelaPosition.B_1_QUADRANT_A, ERelaPosition.B_2_QUADRANT_A]
    return data[st];
  }

  //(A, B)2个区域，返回A在区域B中的顶点
  findVerticalIntersectionPoints(areaA: { lt: Point, rb: Point }, areaB: { lt: Point, rb: Point }) {
    const areaBVerticals = {
      lt: areaB.lt,
      rb: areaB.rb,
      rt: { x: areaB.rb.x, y: areaB.lt.y },
      lb: { x: areaB.lt.x, y: areaB.rb.y }
    }
    const areaAVerticals: Point[] = [
      areaA.lt,
      areaA.rb,
      { x: areaA.rb.x, y: areaA.lt.y },
      { x: areaA.lt.x, y: areaA.rb.y }
    ];
    return areaAVerticals.filter(({ x, y }) => {
      return x >= areaBVerticals.lt.x && x <= areaBVerticals.rt.x && y >= areaBVerticals.lt.y && y <= areaBVerticals.rb.y
    });
  }

  //(A,B)2个区域求交集
  findVerticalIntersectionArea(areaA: { start: Point, end: Point }, areaB: { start: Point, end: Point }): { start: Point, end: Point } {
    const sx = Math.max(areaA.start.x, areaB.start.x);
    const sy = Math.max(areaA.start.y, areaB.start.y);
    const ex = Math.min(areaA.end.x, areaB.end.x);
    const ey = Math.min(areaA.end.y, areaB.end.y);
    return {
      start: { x: sx, y: sy },
      end: { x: ex, y: ey }
    }
  }

  //行优先矩阵
  rowPriorMatrix(start: Point, end: Point, pos: ERelaPosition): Point[] {
    const ret: Point[] = [];
    switch (pos) {
      case ERelaPosition.B_1_QUADRANT_A: {
        //从左下往右上遍历
        for (let y = end.y - 1; y >= start.y; y--) {
          for (let x = start.x; x <= end.x - 1; x++)
            ret.push({ x, y })
        }
        break;
      }
      case ERelaPosition.B_2_QUADRANT_A: {
        //从左上往右下
        for (let y = start.y; y <= end.y - 1; y++) {
          for (let x = start.x; x <= end.x - 1; x++)
            ret.push({ x, y });
        }
        break;
      }
      case ERelaPosition.B_3_QUADRANT_A: {
        //右下->左上
        for (let y = end.y - 1; y >= start.y; y--) {
          for (let x = end.x - 1; x >= start.x; x--)
            ret.push({ x, y });
        }
        break;
      }
      case ERelaPosition.B_4_QUADRANT_A: {
        //右上->左下
        for (let y = start.y; y <= end.y - 1; y++) {
          for (let x = end.x - 1; x >= start.x; x--)
            ret.push({ x, y });
        }
        break;
      }
    }
    return ret;
  }
  //列优先矩阵
  columnPriorMatrix(start: Point, end: Point, pos: ERelaPosition): Point[] {
    const ret: Point[] = [];
    switch (pos) {
      case ERelaPosition.B_1_QUADRANT_A: {
        //从左下往右上遍历
        for (let x = start.x; x <= end.x - 1; x++) {
          for (let y = end.y - 1; y >= start.y; y--)
            ret.push({ x, y });
        }
        break;
      }
      case ERelaPosition.B_2_QUADRANT_A: {
        //从左上往右下
        for (let x = start.x; x <= end.x - 1; x++) {
          for (let y = start.y; y <= end.y - 1; y++)
            ret.push({ x, y });
        }
        break;
      }
      case ERelaPosition.B_3_QUADRANT_A: {
        //右下->左上
        for (let x = end.x - 1; x >= start.x; x--) {
          for (let y = end.y - 1; y >= start.y; y--)
            ret.push({ x, y });
        }
        break;
      }
      case ERelaPosition.B_4_QUADRANT_A: {
        //右上->左下
        for (let x = end.x - 1; x >= start.x; x--) {
          for (let y = start.y; y <= end.y - 1; y++)
            ret.push({ x, y });
        }
        break;
      }
    }
    return ret;
  }

  backRowPriorMatrix(start: Point, end: Point, pos: ERelaPosition): Point[] {
    const ret: Point[] = [];
    let b = 0;
    switch (pos) {
      case ERelaPosition.B_1_QUADRANT_A: {
        //从左下往右上遍历
        for (let y = end.y - 1; y >= start.y; y--) {
          let s = [];
          for (let x = start.x; x <= end.x - 1; x++) {
            s.push({ x, y })
          }
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
      case ERelaPosition.B_2_QUADRANT_A: {
        //从左上往右下
        for (let y = start.y; y <= end.y - 1; y++) {
          let s = [];
          for (let x = start.x; x <= end.x - 1; x++) {
            s.push({ x, y })
          }
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
      case ERelaPosition.B_3_QUADRANT_A: {
        //右下->左上
        for (let y = end.y - 1; y >= start.y; y--) {
          let s = [];
          for (let x = end.x - 1; x >= start.x; x--) {
            s.push({ x, y });
          }
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
      case ERelaPosition.B_4_QUADRANT_A: {
        //右上->左下
        for (let y = start.y; y <= end.y - 1; y++) {
          let s = [];
          for (let x = end.x - 1; x >= start.x; x--) {
            s.push({ x, y });
          }
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
    }
    return ret;
  }

  backColumnPriorMatrix(start: Point, end: Point, pos: ERelaPosition): Point[] {
    const ret: Point[] = [];
    let b = 0;
    switch (pos) {
      case ERelaPosition.B_1_QUADRANT_A: {
        //从左下往右上遍历
        for (let x = start.x; x <= end.x - 1; x++) {
          let s = [];
          for (let y = end.y - 1; y >= start.y; y--)
            s.push({ x, y });
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
      case ERelaPosition.B_2_QUADRANT_A: {
        //从左上往右下
        for (let x = start.x; x <= end.x - 1; x++) {
          let s = [];
          for (let y = start.y; y <= end.y - 1; y++)
            s.push({ x, y });
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
      case ERelaPosition.B_3_QUADRANT_A: {
        //右下->左上
        for (let x = end.x - 1; x >= start.x; x--) {
          let s = [];
          for (let y = end.y - 1; y >= start.y; y--)
            s.push({ x, y });
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
      case ERelaPosition.B_4_QUADRANT_A: {
        //右上->左下
        for (let x = end.x - 1; x >= start.x; x--) {
          let s = [];
          for (let y = start.y; y <= end.y - 1; y++)
            s.push({ x, y });
          if (b & 1) s = s.reverse();
          b++;
          ret.push(...s);
        }
        break;
      }
    }
    return ret;
  }

  //Bresenham 直线算法
  Bresenham({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): Point[] {
    const ret: Point[] = [];
    let dx = x2 - x1;
    let dy = y2 - y1;
    let stepX = dx >= 0 ? 1 : -1;
    let stepY = dy >= 0 ? 1 : -1;
    dx = Math.abs(dx);
    dy = Math.abs(dy);
    if (dx > dy) {
      let p = 2 * dy - dx;
      let y = y1;
      for (let x = x1; x - stepX != x2; x += stepX) {
        ret.push({ x, y });
        if (p > 0) {
          y += stepY;
          p -= 2 * dx;
        }
        p += 2 * dy;
      }
    }
    else {
      let p = 2 * dx - dy;
      let x = x1;
      for (let y = y1; y - stepY != y2; y += stepY) {
        ret.push({ x, y });
        if (p > 0) {
          x += stepX;
          p -= 2 * dy;
        }
        p += 2 * dx;
      }
    }
    return ret;
  }


  //包围所有点的最小矩形
  EncloseMiniPointsRect(points: Point[]): { begin: Point, end: Point } {
    let sx = 0x3f3f3f3f, sy = 0x3f3f3f3f, ex = 0, ey = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      sx = Math.min(sx, p.x);
      sy = Math.min(sy, p.y);
      ex = Math.max(ex, p.x);
      ey = Math.max(ey, p.y);
    }
    return { begin: { x: sx, y: sy }, end: { x: ex, y: ey } };
  }

  //点相减
  div(X: Point, Y: Point): Point {
    return {
      x: X.x - Y.x,
      y: X.y - Y.y
    }
  }
  //相加
  add(X: Point, Y: Point): Point {
    return {
      x: X.x + Y.x,
      y: X.y + Y.y
    }
  }
  //Manhattan距离
  Manhattan(X: Point, Y: Point): number {
    return Math.abs(X.x - Y.x) + Math.abs(X.y - Y.y)
  }
}