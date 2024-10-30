//鼠标样式修改事件
export enum Cursor {
  GRAB = "grab",            //手
  GRABBING = "grabbing",    //手-抓住
  DEFAULT = "default",      //默认指针
  NW_RESIZE = "nw-resize",  //左上resize
  NE_RESIZE = "ne-resize",  //右上resize
  E_RESIZE = "e-resize",    //左右
  S_RESIZE = "s-resize",    //上下
  COPY = "copy",            //复制
}

//工具栏
export enum ETools {
  TOOLS_MOVE,         //拖动画布
  TOOLS_ARROW,        //箭头
  TOOLS_WITHDRAW,     //撤回
  TOOLS_RE_WITHDRAW,  //取消撤回
  TOOLS_DELETE_AREA,  //删除区域
  TOOLS_ADD_IMAGE,    //添加图片
  TOOLS_COPY_CIRCUIT, //复制线路
}

//接线方式
export enum ELineAction {
  //单向行优先
  SINGULAR_ROW_PRIOR,
  //单向列优先
  SINGULAR_COLUMN_PRIOR,
  //折返行优先
  BACK_ROW_PRIOR,
  //折返列优先
  BACK_COLUMN_PRIOR
}

//点(A,B)相对位置
export enum ERelaPosition {
  //B在A第三项限
  B_3_QUADRANT_A = "B在A左上",
  //B在A第四象限
  B_4_QUADRANT_A = "B在A左下",
  //B在A第一象限
  B_1_QUADRANT_A = "B在A右上",
  //B在A第二象限
  B_2_QUADRANT_A = "B在A右下"
}