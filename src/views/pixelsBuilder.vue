<template>
  <div class="box">
    <div class="left_panel">
      <ledToolsPanel ref="ledToolsPanelRef" v-model:ledControllers="ledControllers" @setLedSetting="setLedSetting"
        @createLedLayout="createLedLayout" />
    </div>
    <div class="canvas_panel">
      <canvas ref="pixels" :style="{
        cursor: cursor,
        width: '100%',
        backgroundColor: info.backGround
      }"></canvas>
      <div class="canvas_tools">
        <div @click="toggleMode(item.code)" :class="{
          'tools__item': true,
          'item__is--activity': mode == item.code
        }" v-for="(item, index) in tools" :key="index">
          <img :src="item.icon" :title="item.label">
        </div>
      </div>
      <div v-show="Area.show" ref="area" id="area" :style="{
        width: Area.w + 'px',
        height: Area.h + 'px',
        left: Area.left + 'px',
        top: Area.top + 'px',
        borderColor: Area.borderColor,
        backgroundColor: Area.bgColor,
        cursor: cursor
      }"></div>
      <div class="info">
        <div class="translate">({{ info.translate.x }}, {{ info.translate.y }})</div>
      </div>
    </div>
    <el-dialog v-model="showDialogCreateImage" title="插入图片" width="300" center>
      <el-upload class="avatar-uploader" action="" :show-file-list="false" :before-upload="beforeAvatarUpload">
        <img v-if="imageUrl" :src="imageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon">
          <Plus />
        </el-icon>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDialogCreateImage = false">取消</el-button>
          <el-button type="primary" @click="handleCreateImage">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { Cursor, ERelaPosition, ETools } from "@/components/pixelsBuilder/enum";
import { ITools, Point } from "@/components/pixelsBuilder/pixel.type";
import { PixelsBuilder } from "@/components/pixelsBuilder/pixelsBuilder";
import { computed, onMounted, reactive, Ref, ref, unref, useTemplateRef } from "vue";
import ledToolsPanel from "./component/ledToolsPanel.vue";
import { ILayoutSetting, LedLayout } from "@/components/pixelsBuilder/graphics/LedLayout";
import { ILedControllers } from "./index.type";
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, type UploadProps, type UploadRawFile } from 'element-plus'
import { ImageGraphic } from "@/components/pixelsBuilder/graphics/Image/Image";

const pixels = useTemplateRef("pixels");
const ledToolsPanelRef = useTemplateRef("ledToolsPanelRef");

const tools: Ref<ITools[]> = ref([
  { label: "箭头", code: ETools.TOOLS_ARROW, icon: require("@/assets/arrow.png") },
  { label: "移动", code: ETools.TOOLS_MOVE, icon: require("@/assets/move.png") },
  { label: "撤回", code: ETools.TOOLS_WITHDRAW, icon: require("@/assets/withdraw.png") },
  { label: "取消撤回", code: ETools.TOOLS_RE_WITHDRAW, icon: require("@/assets/re_withdraw.png") },
  { label: "添加图片", code: ETools.TOOLS_ADD_IMAGE, icon: require("@/assets/image.png") },
  { label: "复制线路", code: ETools.TOOLS_COPY_CIRCUIT, icon: require("@/assets/circuit.png") },
  { label: "刪除区域", code: ETools.TOOLS_DELETE_AREA, icon: require("@/assets/delete.png") },
]);
const mode: Ref<ETools> = ref(ETools.TOOLS_ARROW);
const cursor = ref<Cursor>(Cursor.DEFAULT);
const showDialogCreateImage = ref(false);
const imageUrl = ref("");
const info = ref({
  translate: { x: 0, y: 0 },
  backGround: "#ffffff"
});
const toggleMode = (e: ETools) => {
  switch (e) {
    case ETools.TOOLS_ARROW:
      cursor.value = Cursor.DEFAULT;
      mode.value = e;
      break;
    case ETools.TOOLS_MOVE:
      cursor.value = Cursor.GRAB;
      mode.value = e;
      break;
    case ETools.TOOLS_WITHDRAW:

      break;
    case ETools.TOOLS_RE_WITHDRAW:

      break;
    case ETools.TOOLS_ADD_IMAGE:
      if (!ledLayout.value) {
        ElMessage.error("请创建LedLayout");
        return;
      }
      showDialogCreateImage.value = true;
      break;
    case ETools.TOOLS_DELETE_AREA:
      mode.value = e;
      cursor.value = Cursor.DEFAULT;
      break;
    case ETools.TOOLS_COPY_CIRCUIT:
      if (!ledLayout.value) {
        ElMessage.error("请创建LedLayout");
      } else if (!ledLayout.value.ledLayoutSetting?.ledSetting?.no) {
        ElMessage.error("请选择一条线路");
      } else {
        ledLayout.value.copyCircuit(ledLayout.value.ledLayoutSetting.ledSetting.no);
        mode.value = e;
      }
      break;
  }
}
const Area = ref({ w: 0, h: 0, left: 0, top: 0, show: false, borderColor: "", bgColor: "" });
const pixelsBuilder = ref<PixelsBuilder>();
const ledLayout = ref<LedLayout>();
const useConfig = computed(() => reactive({ mode: unref(mode) }));
const useLedLayoutConfig = computed(() => ledControllers.value);
const setLedSetting = (setting: ILayoutSetting) => ledLayout.value && ledLayout.value.setLedSetting(setting);
const ledControllers = ref<ILedControllers[]>([]);
const createLedLayout = (param: { width: number, height: number }) => {
  ledLayout.value = new LedLayout(param.width, param.height, pixelsBuilder.value!, useLedLayoutConfig);
  pixelsBuilder.value?.addGraphic({ id: "ledPanel", graphic: ledLayout.value, priority: 999999999 });
  ledToolsPanelRef.value?.clearLedSelected();
  ledLayout.value.on("LedSelected", ({ no, size }) => {
    ledToolsPanelRef.value?.setLedSelected(no, size);
  });
}
const uploadFile = ref<UploadRawFile | null>(null);
const beforeAvatarUpload: UploadProps['beforeUpload'] = (e) => {
  imageUrl.value = URL.createObjectURL(e)
  uploadFile.value = e;
  return false;
}
const handleCreateImage = () => {
  if (!ledLayout.value) return;
  pixelsBuilder.value?.addGraphic(
    { id: "auto", graphic: new ImageGraphic(JSON.parse(JSON.stringify(ledLayout.value?.beginPoint)), 5, 5, imageUrl.value, pixelsBuilder.value!) }
  )
  showDialogCreateImage.value = false;
  imageUrl.value = "";
}
const initLedController = (leds: number, star: number) => {
  if (!leds) return;
  requestAnimationFrame(() => {
    let n = Math.min(leds, 10);
    let ret = [];
    for (let i = star; i < star + n; i++) {
      const color = ["#ff0000", "#00ff00", "#0000ff"][i % 3];
      const pixels = 0;
      const fenController = i + 1;
      const no = i + 1;
      ret.push({ color, pixels, fenController, no });
    }
    ledControllers.value.push(...ret);
    initLedController(leds - n, star + n);
  });
}
onMounted(() => {
  initLedController(512, 0);
  const canvas = unref(pixels);
  if (canvas) {
    pixelsBuilder.value = new PixelsBuilder(canvas, useConfig);
    info.value.backGround = pixelsBuilder.value.BasicAttribute.BACKGROUND;
    pixelsBuilder.value.on("ToggleCursor", ({ cursor: _cursor }) => cursor.value = _cursor);
    pixelsBuilder.value.on("ToggleArea", ({ w, h, start, end, bgColor, borderColor }) => {
      let st = pixelsBuilder.value?.mathUtils.pointRelaPos(start, end);
      switch (st) {
        case ERelaPosition.B_3_QUADRANT_A: {
          Area.value = { show: true, w: Math.abs(w), h: Math.abs(h), left: end.x, top: end.y, bgColor, borderColor }
          break;
        }
        case ERelaPosition.B_4_QUADRANT_A: {
          Area.value = { show: true, w: Math.abs(w), h: Math.abs(h), left: end.x, top: start.y, bgColor, borderColor }
          break;
        }
        case ERelaPosition.B_1_QUADRANT_A: {
          Area.value = { show: true, w: Math.abs(w), h: Math.abs(h), left: start.x, top: end.y, bgColor, borderColor }
          break;
        }
        case ERelaPosition.B_2_QUADRANT_A: {
          Area.value = { show: true, w: Math.abs(w), h: Math.abs(h), left: start.x, top: start.y, bgColor, borderColor }
          break;
        }
      }
    });
    pixelsBuilder.value.on("ToggleAreaClose", _ => {
      Area.value.show = false;
      if (mode.value === ETools.TOOLS_COPY_CIRCUIT) mode.value = ETools.TOOLS_ARROW;
    });
    pixelsBuilder.value.on("ToggleMove", translate => {
      info.value.translate = {
        x: Math.round(translate.x),
        y: Math.round(translate.y)
      };
    });
    pixelsBuilder.value.on("ToggleAreaEnd", ({ start, end }) => {
      let st = pixelsBuilder.value!.mathUtils.pointRelaPos(start, end);
      let areaBegin !: Point, areaEnd !: Point;
      switch (st) {
        case ERelaPosition.B_3_QUADRANT_A: {
          // >>
          areaBegin = { x: end.x, y: end.y }, areaEnd = { x: start.x, y: start.y }
          break;
        }
        case ERelaPosition.B_4_QUADRANT_A: {
          // ><
          areaBegin = { x: end.x, y: start.y }, areaEnd = { x: start.x, y: end.y };
          break;
        }
        case ERelaPosition.B_1_QUADRANT_A: {
          // <>
          areaBegin = { x: start.x, y: end.y }, areaEnd = { x: end.x, y: start.y };
          break;
        }
        case ERelaPosition.B_2_QUADRANT_A: {
          // <<
          areaBegin = start, areaEnd = end;
          break;
        }
      }
      const sx = Math.round(areaBegin.x / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE), sy = Math.round(areaBegin.y / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE);
      const ex = Math.round(areaEnd.x / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE), ey = Math.round(areaEnd.y / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE);
      if (mode.value === ETools.TOOLS_ARROW) {
        pixelsBuilder.value!.dispatchGraphicEvent("canvasDispatch:AreaSelect", { pos: st, areaStart: { x: sx, y: sy }, areaEnd: { x: ex, y: ey } });
      }
      else if (mode.value === ETools.TOOLS_DELETE_AREA) {
        pixelsBuilder.value!.dispatchGraphicEvent("canvasDispatch:AreaDelete", { pos: st, areaStart: { x: sx, y: sy }, areaEnd: { x: ex, y: ey } });
      }
    })
  }
})
</script>

<style scoped lang="less">
.box {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  overflow: hidden;

  .left_panel {
    height: 100vh;
    width: 200px;
    border-right: 2px solid #007aff;
    display: flex;
    flex-direction: column;
  }

  .canvas_panel {
    position: relative;
    width: 100%;
  }

  #area {
    position: absolute;
    z-index: 999;
    border-style: solid;
    border-width: 1px;
  }

  .info {
    position: absolute;
    bottom: 10px;
    left: 10px;
    color: #ffffff;
    font-size: 12px;
  }

  .canvas_tools {
    user-select: none;
    position: absolute;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    right: 100px;
    top: 20px;
    width: 600px;
    height: 40px;
    border-radius: 60px;
    z-index: 1000;
    box-shadow: 2px 2px 2px 2px rgba(200, 200, 200, 0.6),
      -2px 2px 2px 2px rgba(200, 200, 200, 0.6),
      2px -2px 2px 2px rgba(200, 200, 200, 0.6),
      -2px -2px 2px 2px rgba(200, 200, 200, 0.6);
    background-color: #fff;
    padding: 5px 10px;
    box-sizing: border-box;

    .tools__item {
      width: 30px;
      height: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: 100ms all ease;
      border-radius: 5px;

      img {
        aspect-ratio: 1/ 1;
        width: 20px;
      }

      &:hover {
        background-color: #007aff10;
      }
    }

    .item__is--activity {
      background-color: #007aff10;
    }
  }
}

.avatar-uploader {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;

  .avatar {
    width: 150px;
    height: 150px;
  }

  /deep/ .el-upload {
    width: 150px;
    height: 150px;
    border: 1px dashed #007aff1a;
    transition: 100ms all ease;

    &:hover {
      border-color: #007aff;
    }
  }
}
</style>