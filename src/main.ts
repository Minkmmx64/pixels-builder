import { createApp } from "vue";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from "./App.vue";
import router from "./router";
import { createPinia } from 'pinia';
import showElectronProp from "@/components/showElectronProp.vue";

createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus)
  .component("ElectronProp", showElectronProp)
  .mount("#app");
