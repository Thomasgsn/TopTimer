import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n";
import { appPersistence } from "./persistence";
import "./assets/styles/main.scss";

async function bootstrap(): Promise<void> {
  const initialData = await appPersistence.load();
  if (initialData.settings) i18n.global.locale.value = initialData.settings.locale;

  createApp(App, { initialData }).use(i18n).mount("#app");
}

function showLoadError(error: unknown): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) return;
  const { t } = i18n.global;
  const panel = document.createElement("section");
  panel.className = "load-error";
  panel.setAttribute("role", "alert");
  const title = document.createElement("h1");
  title.className = "load-error__title";
  title.textContent = t("app.loadFailedTitle");
  const help = document.createElement("p");
  help.className = "load-error__help";
  help.textContent = t("app.loadFailedHelp");
  const details = document.createElement("pre");
  details.className = "load-error__details";
  details.textContent = error instanceof Error ? error.message : String(error);
  panel.append(title, help, details);
  root.replaceChildren(panel);
}

void bootstrap().catch((error: unknown) => {
  console.error("TopTimer could not load its local data.", error);
  showLoadError(error);
});
