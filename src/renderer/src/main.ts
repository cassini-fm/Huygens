import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/main.scss";
import "@fontsource-variable/inter";

const app = createApp(App);

app.use(router);

if (new URLSearchParams(location.search).has("material")) document.documentElement.dataset.material = "";

app.mount("#app");
