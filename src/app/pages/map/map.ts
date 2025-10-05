import { Component, AfterViewInit } from '@angular/core';
import * as Cesium from 'cesium';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.html',
  styleUrls: ['./map.css', './map-fix.css'],
})
export class Map implements AfterViewInit {
  async ngAfterViewInit(): Promise<void> {
    try {
      // 🔑 Token Cesium Ion
      const ION_TOKEN =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MGYwYmViNi01MzhlLTRmMDAtOTM3Yi01ZDkxN2IyMzgzODEiLCJpZCI6MzQ3MzQ1LCJpYXQiOjE3NTk2NDA4MjN9.jHPz1YcVMgmvWr_9dYJNOwL-u1QszOw_eS1tzkUNcUw';
      Cesium.Ion.defaultAccessToken = ION_TOKEN;

      // 🌍 Terreno global
      let terrainProvider: Cesium.TerrainProvider = new Cesium.EllipsoidTerrainProvider();
      try {
        terrainProvider = await Cesium.createWorldTerrainAsync();
      } catch {
        console.warn('🟡 Terreno Ion no disponible, usando elipsoide base.');
      }

      // 🎥 Crear el visor Cesium
      const container = document.getElementById('cesiumContainer');
      if (!container) throw new Error('Contenedor Cesium no encontrado');

      container.style.width = '100%';
      container.style.height = '100%';
      container.style.display = 'block';
      container.style.overflow = 'hidden';

      const viewer = new Cesium.Viewer(container, {
        terrainProvider,
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        homeButton: false,
        sceneModePicker: false,
        geocoder: false,
        navigationHelpButton: false,
        infoBox: false,
        scene3DOnly: true,
        skyAtmosphere: new Cesium.SkyAtmosphere(),
      });

      // 🛰️ Capa base: OpenStreetMap si falla Ion
      try {
        const imagery = await Cesium.IonImageryProvider.fromAssetId(2);
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(imagery);
      } catch {
        console.warn('🟡 Usando OpenStreetMap como fondo.');
        const osm = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(osm);
      }

      // 📍 Geolocalización del usuario
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, altitude } = pos.coords;

            // ✨ Animación de cámara con suavizado y glow
            viewer.scene.postProcessStages.fxaa.enabled = true;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500000),
              duration: 3,
              easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            });

            // 📍 Marcador
            viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
              point: {
                pixelSize: 12,
                color: Cesium.Color.CYAN.withAlpha(0.9),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
              },
              label: {
                text: 'Tu ubicación',
                font: '16px "Poppins", sans-serif',
                fillColor: Cesium.Color.WHITE,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineColor: Cesium.Color.BLACK,
                pixelOffset: new Cesium.Cartesian2(0, -25),
              },
            });

            // Actualizar datos
            document.getElementById('lat')!.textContent = latitude.toFixed(4);
            document.getElementById('lon')!.textContent = longitude.toFixed(4);
            document.getElementById('alt')!.textContent = altitude ? altitude.toFixed(2) + ' m' : '—';
            document.getElementById('city')!.textContent = 'Cerca de Quito, Ecuador 🌎';
            document.getElementById('pop')!.textContent = 'Consultando...';

            // ⚙️ Simulación: fetch de datos de población
            fetch(`http://localhost:3000/api/population/point?iso3=ECU&lat=${latitude}&lon=${longitude}&year=2020`)
              .then((r) => r.json())
              .then((d) => {
                if (d.population_density) {
                  document.getElementById('pop')!.textContent = `${d.population_density.toFixed(2)} hab/px`;
                } else {
                  document.getElementById('pop')!.textContent = 'Sin datos';
                }
              })
              .catch(() => {
                document.getElementById('pop')!.textContent = 'No disponible';
              });
          },
          (err) => {
            console.warn('⚠️ No se pudo obtener la ubicación:', err);
            document.getElementById('city')!.textContent = 'Ubicación no detectada';
          }
        );
      }

      // 🔧 Ocultar elementos innecesarios
      const anyViewer = viewer as any;
      if (anyViewer.bottomContainer) (anyViewer.bottomContainer as HTMLElement).style.display = 'none';
      if (anyViewer.animation?.container)
        (anyViewer.animation.container as HTMLElement).style.display = 'none';
      if (anyViewer.timeline?.container)
        (anyViewer.timeline.container as HTMLElement).style.display = 'none';

      // 🧭 Forzar canvas a tamaño completo
      const fixCanvasSize = () => {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
        viewer.resize();
      };
      
      setTimeout(fixCanvasSize, 100);
      setTimeout(fixCanvasSize, 500);

      // Observar cambios de tamaño del contenedor
      const resizeObserver = new ResizeObserver(() => {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
        viewer.resize();
      });
      resizeObserver.observe(container);

      console.log('✅ CesiumJS inicializado correctamente');
    } catch (error) {
      console.error('🚨 Error al inicializar Cesium:', error);
    }
  }
}
