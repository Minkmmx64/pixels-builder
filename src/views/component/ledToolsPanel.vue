<template>
  <div class="ledToolsPanel">
    <div @click="showDialogCreate = true" class="create_led">新建</div>
    <div class="led_setting">
      <div class="line-action">
        <fieldset>
          <legend>接线方式:</legend>
          <div class="action__item" v-for="(item, index) in lineActionData" :key="index">
            <input type="radio" :id="item.label" name="lineAction" v-model="lineAction" :value="item.code"
              :checked="lineAction === item.code" />
            <label :for="item.label">{{ item.label }}</label>
          </div>
        </fieldset>
      </div>
      <div class="line-points">
        <span>线路限定点数:</span>
        <input type="number" v-model="thresholdPoints" min="10" max="4096" />
      </div>
      <div class="line-points">
        <span>点重叠:</span>
        <input type="checkbox" v-model="overlap" />
      </div>
      <div class="led_table">
        <table style="width: 100%;">
          <tr class="led_table_column">
            <th style="background-color: #ffffff;">No.</th>
            <th style="background-color: #ffffff;">点数</th>
            <th style="background-color: #ffffff;">分控</th>
          </tr>
          <tr :class="{
            'table-row-data-is--activity': selectLedController?.no === item.no
          }" @click="handleSelectLedController(item)" v-for="(item, index) in ledControllers" :key="index">
            <td align="left">
              <div class="led_color" :style="{
                backgroundColor: item.color
              }"></div>
              <span>{{ item.no }}</span>
            </td>
            <td>{{ item.pixels }}</td>
            <td>{{ item.fenController }}</td>
          </tr>
        </table>
      </div>
    </div>
    <el-dialog v-model="showDialogCreate" title="新建" width="300" center>
      <div class="create-dialog">
        <el-row :gutter="20">
          <el-col :span="6">宽度:</el-col>
          <el-col :span="12">
            <el-input v-model="ledLayoutSize.w" placeholder="Please input" />
          </el-col>
          <el-col :span="6">像素</el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="6">高度:</el-col>
          <el-col :span="12">
            <el-input v-model="ledLayoutSize.h" placeholder="Please input" />
          </el-col>
          <el-col :span="6">像素</el-col>
        </el-row>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDialogCreate = false">取消</el-button>
          <el-button type="primary" @click="handleCreateLedLayout">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ELineAction } from '@/components/pixelsBuilder/enum';
import { computed, ref, watch } from 'vue';
import { ILedControllers, ILineAction } from "../index.type";
import { ILayoutSetting } from '@/components/pixelsBuilder/graphics/LedLayout';

interface IEmit {
  (event: 'createLedLayout', param: { width: number, height: number }): void;
  (event: 'setLedSetting', param: ILayoutSetting): void;
}

const Emit = defineEmits<IEmit>();

const overlap = ref(false);
const showDialogCreate = ref(false);
const lineActionData = ref<ILineAction[]>([
  { label: "单向行优先", code: ELineAction.SINGULAR_ROW_PRIOR },
  { label: "单向列优先", code: ELineAction.SINGULAR_COLUMN_PRIOR },
  { label: "折返行优先", code: ELineAction.BACK_ROW_PRIOR },
  { label: "折返列优先", code: ELineAction.BACK_COLUMN_PRIOR }
])
const lineAction = ref<ELineAction>(ELineAction.SINGULAR_ROW_PRIOR);
const ledLayoutSize = ref({ w: "25", h: "25" });
const thresholdPoints = ref(1024);
const handleCreateLedLayout = () => {
  Emit("createLedLayout", { width: parseInt(ledLayoutSize.value.w), height: parseInt(ledLayoutSize.value.h) });
  showDialogCreate.value = false;
}
const setLedSelected = (no: number, size: number) => ledControllers.value[no - 1].pixels = size;
const selectLedController = ref<ILedControllers>();
const handleSelectLedController = (led: ILedControllers) => selectLedController.value = led;
const clearLedSelected = () => ledControllers.value.forEach(v => v.pixels = 0);

const ledLayoutSetting = computed<ILayoutSetting>(() => {
  return {
    lineAction: lineAction.value,
    ledSetting: {
      color: selectLedController.value?.color,
      no: selectLedController.value?.no
    },
    thresholdPoints: Math.max(10, Math.min(thresholdPoints.value, 4096)),
    overlap: overlap.value
  }
});

watch(() => [ledLayoutSetting.value], () => Emit("setLedSetting", ledLayoutSetting.value));

const ledControllers = defineModel<ILedControllers[]>("ledControllers", { required: true });

defineExpose({
  setLedSelected: setLedSelected,
  clearLedSelected: clearLedSelected,
  handleSelectLedController: handleSelectLedController
})
</script>

<style scoped lang="less">
.ledToolsPanel {
  display: flex;
  flex-shrink: 0;
  flex: 1;
  box-sizing: border-box;
  padding: 5px;
  flex-direction: column;
  gap: 10px;

  .create-dialog {
    gap: 10px;
    display: flex;
    flex-direction: column;
  }

  .create_led {
    width: fit-content;
    padding: 5px 10px;
    background-color: #007aff;
    border-radius: 10px;
    font-size: 16px;
    color: #ffffff;
    cursor: pointer;
  }

  .led_setting {
    display: flex;
    flex-direction: column;
    flex: 1;
    flex-shrink: 0;

    .line-action {
      width: 100%;

      .action__item {
        margin-top: 10px;
        margin-left: 5px;

        &:last-child {
          margin-bottom: 10px;
        }
      }
    }

    .led_table {
      margin-top: 10px;
      overflow-y: scroll;
      position: relative;
      height: 500px;
      display: flex;
      border: 1px solid rgba(140, 140, 140, 0.6);

      table {
        border-collapse: collapse;
        border: 1px solid rgba(140, 140, 140, 0.6);
        font-size: 12px;
        font-weight: 100;
        letter-spacing: 1px;
        background: #fff;
      }

      th {
        position: sticky;
        top: 0;
      }

      th,
      td {
        border: 1px solid rgba(140, 140, 140, 0.6);
      }

      user-select: none;
      text-align: center;

      .led_table_column {
        width: 100%;
        background-color: #fff;
      }

      .led_color {
        display: inline-block;
        width: 10px;
        height: 10px;
        margin-left: 5px;
        margin-right: 5px;
      }

      .table-row-data-is--activity {
        background-color: rgba(200, 200, 200, 0.6);
      }
    }

    .line-points {
      display: flex;
      font-size: 14px;
      margin-top: 10px;
      gap: 10px;
      align-items: center;

      input {
        width: 50px;
      }
    }

  }
}
</style>