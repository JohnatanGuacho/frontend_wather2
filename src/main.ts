import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// 🔹 Cesium necesita saber dónde están sus recursos (en assets/cesium)
(window as any).CESIUM_BASE_URL = '/assets/cesium';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
