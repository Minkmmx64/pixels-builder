<template>
  <div v-if="electron">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { useElectron } from "@/store/index.store";
import { onMounted, ref } from "vue";
const electron = ref(false);
const env = useElectron();
onMounted(() => electron.value = env.environment === "node-electron");
</script>

<style lang="less" scoped></style>