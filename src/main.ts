import { createApp } from "vue";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from "./App.vue";
import router from "./router";
import { createPinia } from 'pinia';
import showElectronProp from "@/components/showElectronProp.vue";
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'

   
createApp(App)
  .use(createPinia())
  .use(router)
  .use(ContextMenu)
  .use(ElementPlus)
  .component("ElectronProp", showElectronProp)
  .mount("#app");
