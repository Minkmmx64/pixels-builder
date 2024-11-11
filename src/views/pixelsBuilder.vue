<template>
  <div class="box">
    <div class="left_panel">
      <ledToolsPanel ref="ledToolsPanelRef" v-model:ledControllers="ledControllers" @ledImport="ledImport"
        @highLight="ledCanvasHighLight" @ledExport="ledExport" @setLedSetting="setLedSetting"
        @deleteCircuit="deleteCircuit" @createLedLayout="createLedLayout" />
    </div>
    <div id="pixelsBuilderCanvas" class="canvas_panel" v-loading="canvasLoading">
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
      <el-image v-show="ledPasteImageUrl" :src="ledPasteImageUrl" :style="{
        width: '100px',
        height: '100px',
        left: Area.left + 'px',
        top: Area.top + 100 + 'px',
        position: 'absolute'
      }" />
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
    <el-dialog v-model="showDialogCopyCircuit" title="选择需要覆盖的线路" width="300" center>
      <el-select v-model="currentSelectCopyCircuit" class="m-2" placeholder="Select" size="small" style="width: 240px">
        <el-option v-for="item in ledControllers" :key="item.fenController" :label="item.fenController"
          :value="item.fenController">
          <div class="circuit-option">
            <div :style="{ backgroundColor: item.color }"></div>
            <span>{{ item.fenController }}</span>
          </div>
        </el-option>
      </el-select>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDialogCopyCircuit = false">取消</el-button>
          <el-button type="primary" @click="handleCopyCorcuit">确定</el-button>
        </span>
      </template>
    </el-dialog>
    <el-dialog v-model="showExportConfig" title="导出配置" width="500" center>
      <el-form ref="ruleFormRef" :model="exportForm" :rules="exportRules" label-width="120px" class="demo-ruleForm"
        status-icon>
        <el-form-item label="名称" prop="name">
          <el-input v-model="exportForm.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="exportForm.description" />
        </el-form-item>
        <el-form-item label="保存文件名称" prop="filename">
          <el-input v-model="exportForm.filename">
            <template #append>.tar</template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <div>
            <el-button @click="chooseExportDest" type="primary">保存目录</el-button>
            <div>{{ exportDest }}</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showExportConfig = false">取消</el-button>
          <el-button type="primary" @click="handleExportConfig">确定</el-button>
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
import { ILayoutSetting, ILedLayoutSaveData } from "@/components/pixelsBuilder/graphics/LedLayout";
import { ILedControllers } from "./index.type";
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, FormInstance, FormRules, type UploadProps, type UploadRawFile } from 'element-plus'
import { ImageGraphic } from "@/components/pixelsBuilder/graphics/Image/Image";
import { IExportObject } from "@/components/pixelsBuilder/graphics/graphics";
import { LedLayoutV2 } from "@/components/pixelsBuilder/graphics/LedLayoutV2";
interface IExportForm {
  name: string;
  description: string;
  filename: string;
}

const pixels = useTemplateRef("pixels");
const ledToolsPanelRef = useTemplateRef("ledToolsPanelRef");
const canvasLoading = ref(false);
const tools: Ref<ITools[]> = ref([
  { label: "箭头", code: ETools.TOOLS_ARROW, icon: require("@/assets/arrow.png") },
  { label: "移动", code: ETools.TOOLS_MOVE, icon: require("@/assets/move.png") },
  { label: "复制线路", code: ETools.TOOLS_COPY_CIRCUIT, icon: require("@/assets/circuit.png") },
  { label: "添加图片", code: ETools.TOOLS_ADD_IMAGE, icon: require("@/assets/image.png") },
  { label: "复制led选区", code: ETools.TOOLS_COPY_AREA, icon: require("@/assets/copy_area.png") },
  { label: "粘贴led选区", code: ETools.TOOLS_PASTE_AREA, icon: require("@/assets/paste.png") },
  { label: "撤回", code: ETools.TOOLS_WITHDRAW, icon: require("@/assets/withdraw.png") },
  // { label: "取消撤回", code: ETools.TOOLS_RE_WITHDRAW, icon: require("@/assets/re_withdraw.png") },
  { label: "刪除区域", code: ETools.TOOLS_DELETE_AREA, icon: require("@/assets/delete.png") },
]);
const mode: Ref<ETools> = ref(ETools.TOOLS_ARROW);
const cursor = ref<Cursor>(Cursor.DEFAULT);
const showDialogCreateImage = ref(false);
const showExportConfig = ref(false);
const imageUrl = ref("");
const info = ref({ translate: { x: 0, y: 0 }, backGround: "#ffffff" });
const ledPasteImageUrl = ref("");
const toggleMode = (e: ETools) => {
  Area.value.show = false;
  ledPasteImageUrl.value = "";
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
      pixelsBuilder.value?.undo();
      break;
    case ETools.TOOLS_RE_WITHDRAW:
      //pixelsBuilder.value?.redo();
      ElMessage.error("暂无此功能");
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
    case ETools.TOOLS_COPY_AREA:
      mode.value = e;
      cursor.value = Cursor.COPY;
      break;
    case ETools.TOOLS_PASTE_AREA:
      if (!ledLayout.value?.copyPrototype.copyAreaThumbnail) {
        ElMessage.error("请复制一条区域");
        return;
      }
      //mode.value = e;
      //cursor.value = Cursor.COPY;
      ledLayout.value.onCurcuitAreaPaste();
      break;
    case ETools.TOOLS_COPY_CIRCUIT:
      if (!ledLayout.value) {
        ElMessage.error("请创建LedLayout");
      } else if (!ledLayout.value.ledLayoutSetting?.ledSetting?.no) {
        ElMessage.error("请选择一条线路");
      } else {
        //弹窗选择线路框
        if (ledLayout.value.copyCircuit(ledLayout.value.ledLayoutSetting.ledSetting.no)) {
          showDialogCopyCircuit.value = true;
        }
      }
      break;
  }
}
const currentSelectCopyCircuit = ref<number>(1);
const showDialogCopyCircuit = ref(false);
const Area = ref({ w: 0, h: 0, left: 0, top: 0, show: false, borderColor: "", bgColor: "" });
const pixelsBuilder = ref<PixelsBuilder>();
const ledLayout = ref<LedLayoutV2>();
const useConfig = computed(() => reactive({ mode: unref(mode) }));
const useLedLayoutConfig = computed(() => ledControllers.value);
const setLedSetting = (setting: ILayoutSetting) => ledLayout.value && ledLayout.value.setLedSetting(setting);
const ledControllers = ref<ILedControllers[]>([]);
const handleCopyCorcuit = () => {
  //mode.value = ETools.TOOLS_COPY_CIRCUIT;
  showDialogCopyCircuit.value = false;
  ledLayout.value?.setCircuitCopyTarget(currentSelectCopyCircuit.value, ledControllers.value[currentSelectCopyCircuit.value - 1].color);
  ledLayout.value?.onCurcuitCopy();
}
const createLedLayout = (param: { width: number, height: number }) => {
  if (pixelsBuilder.value) {
    pixelsBuilder.value.graphics = [];
    pixelsBuilder.value.reloadCanvas();
    pixelsBuilder.value.transform = {
      scale: 1,
      translate: { x: 0, y: 0 }
    }
  }
  if (ledLayout.value) {
    ledLayout.value.clear();
  }
  ledLayout.value = new LedLayoutV2(param.width, param.height, pixelsBuilder.value!, useLedLayoutConfig);
  pixelsBuilder.value?.addGraphic({ id: "ledPanel", graphic: ledLayout.value, priority: 999999999 });
  ledToolsPanelRef.value?.clearLedSelected();
  ledLayout.value.on("LedSelected", ({ no, size }) => ledToolsPanelRef.value?.setLedSelected(no, size));
  ledLayout.value.on("ClearLedSelected", () => ledToolsPanelRef.value?.clearLedSelected());
  ledLayout.value.on("LedSelectedNo", led => ledToolsPanelRef.value?.handleSelectLedController(led)
  );
}
const uploadFile = ref<UploadRawFile | null>(null);
const beforeAvatarUpload: UploadProps['beforeUpload'] = (e) => {
  imageUrl.value = URL.createObjectURL(e)
  uploadFile.value = e;
  return false;
}
const handleCreateImage = () => {
  if (!ledLayout.value || !uploadFile.value) return;
  pixelsBuilder.value?.addGraphic(
    { id: "auto", graphic: new ImageGraphic(JSON.parse(JSON.stringify(ledLayout.value?.beginPoint)), 5, 5, uploadFile.value, pixelsBuilder.value!) }
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
      const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#FFEB3B", "#E040FB", "#F97F51", "#00cec9", "#00d8d6"]
      const color = colors[i % colors.length];
      const pixels = 0;
      const fenController = i + 1;
      const no = i + 1;
      ret.push({ color, pixels, fenController, no });
    }
    ledControllers.value.push(...ret);
    initLedController(leds - n, star + n);
  });
}
//导入
const ledImport = () => {
  let options: Electron.OpenDialogOptions = {
    filters: [{ extensions: ["tar"], name: ".tar" }]
  }
  window.IPC.send("fileSelectExt", { title: "选择导入文件", filter: options.filters });
  window.IPC.once("fileSelectExt", async (_, res) => {
    if (res[0]) {
      try {
        pixelsBuilder.value!.graphics = [];
        const { data, transform } = (await window.IPC.invoke("ledImport", res[0]));
        const ledLayoutData = (data as IExportObject[]).find(_ => _.type === "LedLayout");
        if (ledLayoutData) {
          createLedLayout({ width: ledLayoutData.data.width, height: ledLayoutData.data.height });
          pixelsBuilder.value!.transform = transform
          ledLayout.value?.loadLedLayoutConfig(ledLayoutData.data as ILedLayoutSaveData);
          pixelsBuilder.value?.import((data as IExportObject[]).filter(_ => _.type !== "LedLayout"));
        }
        pixelsBuilder.value?.reloadCanvas();
      } catch (error) {
        console.log(error);
        ElMessage.error("文件格式错误");
      }
    }
  });
}
const exportForm = ref<IExportForm>({
  name: "",
  description: "",
  filename: ""
});
const exportFormRef = useTemplateRef<FormInstance>("ruleFormRef");
const exportRules = reactive<FormRules<IExportForm>>({
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  description: [{ required: true, message: "请输入描述" }],
  filename: [{ required: true, message: "请输入文件名称" }]
});
const exportDest = ref("");
const chooseExportDest = () => window.IPC.send("dirSelect", { title: "选择导出目录", eventReg: "selectExportDir" });
window.IPC?.on("selectExportDir", async (_, dirPath) => exportDest.value = dirPath);
const ledExport = async () => {
  canvasLoading.value = true;
  const data = await pixelsBuilder.value?.export();
  canvasLoading.value = false;
  if (!data?.length) {
    ElMessage.error("请创建ledLayout");
    return;
  }
  showExportConfig.value = true;
}
const handleExportConfig = async () => {
  const data = await pixelsBuilder.value?.export();
  if (!data?.length) {
    ElMessage.error("请创建ledLayout");
    return;
  }
  await exportFormRef.value?.validate(async (valid, fields) => {
    if (valid && exportDest.value) {
      const ledLayoutData = data.find(_ => _.type === "LedLayout");
      if (ledLayoutData?.data) {
        ledLayoutData.data.name = exportForm.value.name;
        ledLayoutData.data.description = exportForm.value.description;
      }
      await window.IPC.invoke("ledExport", { dest: exportDest.value, data, filename: exportForm.value.filename, transform: JSON.parse(JSON.stringify(pixelsBuilder.value!.transform)) });
      showExportConfig.value = false;
      ElMessage.success("导出成功");
    }
  })
}
const ledCanvasHighLight = (led: ILedControllers) => {
  ledLayout.value?.ledCanvasHighLight(led.no);
}
const deleteCircuit = (led: ILedControllers) => {
  ledLayout.value?.deleteCanvasLayout(led.no);
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
      if (mode.value === ETools.TOOLS_PASTE_AREA) {
        if (!ledPasteImageUrl.value) ledPasteImageUrl.value = ledLayout.value?.copyPrototype.copyAreaThumbnail ?? "";
      }
    });
    pixelsBuilder.value.on("ToggleAreaClose", _ => {
      Area.value.show = false;
      if (mode.value === ETools.TOOLS_COPY_CIRCUIT) mode.value = ETools.TOOLS_ARROW;
      if (mode.value === ETools.TOOLS_PASTE_AREA) mode.value = ETools.TOOLS_ARROW;
    });
    pixelsBuilder.value.on("ToggleMove", translate => {
      info.value.translate = { x: Math.round(translate.x), y: Math.round(translate.y) };
    });
    pixelsBuilder.value.on("ToggleAreaEnd", ({ start, end, originEnd, originStart }) => {
      let st = pixelsBuilder.value!.mathUtils.pointRelaPos(start, end);
      let areaBegin !: Point, areaEnd !: Point;
      switch (st) {
        case ERelaPosition.B_3_QUADRANT_A: { // >>
          areaBegin = { x: end.x, y: end.y }, areaEnd = { x: start.x, y: start.y }
          break;
        }
        case ERelaPosition.B_4_QUADRANT_A: { // ><
          areaBegin = { x: end.x, y: start.y }, areaEnd = { x: start.x, y: end.y };
          break;
        }
        case ERelaPosition.B_1_QUADRANT_A: { // <>
          areaBegin = { x: start.x, y: end.y }, areaEnd = { x: end.x, y: start.y };
          break;
        }
        case ERelaPosition.B_2_QUADRANT_A: { // <<
          areaBegin = start, areaEnd = end;
          break;
        }
      }
      let sx = Math.round(areaBegin.x / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE), sy = Math.round(areaBegin.y / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE);
      let ex = Math.round(areaEnd.x / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE), ey = Math.round(areaEnd.y / pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE);
      if (mode.value === ETools.TOOLS_ARROW) {
        if (pixelsBuilder.value!.mathUtils.Manhattan(originStart, originEnd) < pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE) {
          const d = pixelsBuilder.value!.cavnasPoint2GridPixelsPoint(pixelsBuilder.value!.realPoint2GridAlignCanvasFloorPoint(originEnd));
          sx = d.x, sy = d.y;
          ex = sx + 1, ey = sy + 1;
          pixelsBuilder.value!.dispatchGraphicEvent("canvasDispatch:AreaSelect", { pos: st, areaStart: { x: sx, y: sy }, areaEnd: { x: ex, y: ey } });
        }
        else pixelsBuilder.value!.dispatchGraphicEvent("canvasDispatch:AreaSelect", { pos: st, areaStart: { x: sx, y: sy }, areaEnd: { x: ex, y: ey } });
      }
      else if (mode.value === ETools.TOOLS_DELETE_AREA) {
        if (pixelsBuilder.value!.mathUtils.Manhattan(originStart, originEnd) < pixelsBuilder.value!.BasicAttribute.GRID_STEP_SIZE) {
          const d = pixelsBuilder.value!.cavnasPoint2GridPixelsPoint(pixelsBuilder.value!.realPoint2GridAlignCanvasFloorPoint(originEnd));
          sx = d.x, sy = d.y;
          ex = sx + 1, ey = sy + 1;
          pixelsBuilder.value!.dispatchGraphicEvent("canvasDispatch:AreaDelete", { pos: st, areaStart: { x: sx, y: sy }, areaEnd: { x: ex, y: ey } });
        }
        else pixelsBuilder.value!.dispatchGraphicEvent("canvasDispatch:AreaDelete", { pos: st, areaStart: { x: sx, y: sy }, areaEnd: { x: ex, y: ey } });
      }
      else if (mode.value === ETools.TOOLS_COPY_AREA) {
        ledLayout.value?.copyLedArea({ x: sx, y: sy }, { x: ex, y: ey });
      }
    });
    pixelsBuilder.value.on("ToggleAreaThumbnail", _ => ledPasteImageUrl.value = "");
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

  .circuit-option {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;

    div {
      width: 20px;
      height: 20px;
    }
  }

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
    overflow: hidden;
  }

  #area {
    position: absolute;
    z-index: 999;
    border-style: solid;
    border-width: 1px;
  }

  .info {
    user-select: none;
    position: absolute;
    bottom: 10px;
    left: 10px;
    color: #ffffff;
    font-size: 12px;
  }

  .canvas_tools {
    overflow: hidden;
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
    z-index: 3000;
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