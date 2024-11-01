<template>
  <router-view />
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useElectron } from "@/store/index.store";

const env = useElectron();
onMounted(() => {
  if (window.IPC) {
    env.environment = "node-electron";
  } else env.environment = "window";
})
</script>

<style lang="less">
* {
  padding: 0px;
  margin: 0px;
}
</style>
