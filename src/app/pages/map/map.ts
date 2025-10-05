import { Component, AfterViewInit } from '@angular/core';
import * as Cesium from 'cesium';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.html',
  styleUrls: ['./map.css', './map-fix.css'],
})
export class Map implements AfterViewInit {
  private viewer: Cesium.Viewer | undefined;
  private locationMarker: Cesium.Entity | undefined;

  async ngAfterViewInit(): Promise<void> {
    const container = document.getElementById('cesiumContainer');
    if (!container) return;

    try {
      // Configuración de Cesium (mantenida)
      const ION_TOKEN =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MGYwYmViNi01MzhlLTRmMDAtOTM3Yi01ZDkxN2IyMzgzODEiLCJpZCI6MzQ3MzQ1LCJpYXQiOjE3NTk2NDA4MjN9.jHPz1YcVMgmvWr_9dYJNOwL-u1QszOw_eS1tzkUNcUw';
      Cesium.Ion.defaultAccessToken = ION_TOKEN;

      let terrainProvider: Cesium.TerrainProvider = new Cesium.EllipsoidTerrainProvider();
      try {
        terrainProvider = await Cesium.createWorldTerrainAsync();
      } catch {
        console.warn('🟡 Terreno Ion no disponible, usando elipsoide base.');
      }

      this.viewer = new Cesium.Viewer(container, {
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
      // Fin Configuración de Cesium

      // 🛰️ Capa base (mantenida)
      try {
        const imagery = await Cesium.IonImageryProvider.fromAssetId(2);
        this.viewer.imageryLayers.removeAll();
        this.viewer.imageryLayers.addImageryProvider(imagery);
      } catch {
        console.warn('🟡 Usando OpenStreetMap como fondo.');
        const osm = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
        this.viewer.imageryLayers.removeAll();
        this.viewer.imageryLayers.addImageryProvider(osm);
      }

      // 1. Manejar la ubicación inicial del usuario
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, altitude } = pos.coords;

            // Animación de cámara
            this.viewer!.scene.postProcessStages.fxaa.enabled = true;
            this.viewer!.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500000),
              duration: 3,
              easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            });

            // Llama a updateLocation
            this.updateLocation(latitude, longitude, altitude, 'Tu ubicación');
          },
          (err) => {
            console.warn('⚠️ No se pudo obtener la ubicación:', err);
            document.getElementById('city')!.textContent = 'Ubicación no detectada';
          }
        );
      }

      // 2. Manejar la selección del usuario (CLIC)
      this.setupMapClickHandling();

      // 🔧 Ocultar y redimensionar (mantenido)
      this.cleanupCesiumUI(this.viewer);
      this.setupResizeLogic(container, this.viewer);
      console.log('✅ CesiumJS inicializado correctamente');

    } catch (error) {
      console.error('🚨 Error al inicializar Cesium:', error);
    }
  }

// ----------------------------------------------------------------------------------
// FUNCIÓN: GEODOCIFICACIÓN INVERSA (Mantenida)
// ----------------------------------------------------------------------------------

  private async fetchCityName(latitude: number, longitude: number): Promise<string> {
    // Usamos Nominatim (OpenStreetMap) para Geocodificación Inversa
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;

    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'HydroUrban-App/1.0' } });
      const data = await response.json();

      if (data && data.address) {
        const address = data.address;
        
        // Prioridad: Calle, ciudad/pueblo, o nombre de lugar completo
        if (address.road && address.house_number) return `${address.road} ${address.house_number}, ${address.city || address.town || address.village || address.county || address.state || ''}`;
        if (address.road) return `${address.road}, ${address.city || address.town || address.village || address.county || address.state || ''}`;
        if (address.city) return address.city;
        if (address.town) return address.town;
        if (address.village) return address.village;
        if (address.county) return address.county;
        if (address.state) return address.state;

        // Si es una zona remota, devolvemos un nombre de lugar conocido (país o región)
        return data.display_name.split(',').slice(0, 3).join(', ');
      }
      return 'Ubicación Desconocida';
    } catch (e) {
      console.warn('Error al obtener nombre de ciudad:', e);
      return 'Geocodificación no disponible';
    }
  }

  /**
   * Actualiza el marcador en el mapa y la información en el panel lateral.
   * Se convierte en async para llamar a fetchCityName.
   */
  private async updateLocation(latitude: number, longitude: number, altitude: number | null, labelText: string): Promise<void> {
    if (!this.viewer) return;

    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude);
    
    // 1. Obtener y mostrar el nombre de la ciudad
    document.getElementById('city')!.textContent = 'Buscando ubicación...';
    
    const fetchedCity = await this.fetchCityName(latitude, longitude);
    let cityDisplay = fetchedCity;

    // MEJORA: Solo mostramos un mensaje por defecto si la geocodificación falló
    if (fetchedCity === 'Ubicación Desconocida' || fetchedCity === 'Geocodificación no disponible') {
        cityDisplay = (labelText === 'Tu ubicación') ? 'Ubicación inicial, área remota' : 'Área Remota o Desconocida';
    }


    // Eliminar el marcador anterior si existe
    if (this.locationMarker) {
      this.viewer.entities.remove(this.locationMarker);
    }

    // Crear y añadir el nuevo marcador (mantenido)
    this.locationMarker = this.viewer.entities.add({
      position: position,
      point: {
        pixelSize: 12,
        color: Cesium.Color.CYAN.withAlpha(0.9),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: labelText,
        font: '16px "Poppins", sans-serif',
        fillColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.BLACK,
        pixelOffset: new Cesium.Cartesian2(0, -25),
      },
    });

    // Actualizar datos en el panel
    document.getElementById('lat')!.textContent = latitude.toFixed(4);
    document.getElementById('lon')!.textContent = longitude.toFixed(4);
    document.getElementById('city')!.textContent = `${cityDisplay} 🌎`;

    document.getElementById('pop')!.textContent = 'Consultando...';
    
    // Altitud (mantenido):
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    // El requestTileGeometry es redundante para el cálculo de altitud de la UI, pero se mantiene para evitar romper algo si lo usas
    const promise = this.viewer.terrainProvider.requestTileGeometry( 
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    );
    document.getElementById('alt')!.textContent = (cartographic.height ?? altitude ?? 0).toFixed(2) + ' m';


    // ⚙️ Fetch de datos de población (mantenido)
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
  }

  /**
   * Configura el manejador de eventos de clic en el mapa.
    * CAMBIO CLAVE: Implementa el control de zoom (altitud de vuelo).
   */
  private setupMapClickHandling(): void {
    if (!this.viewer) return;

    // Altitud de vuelo deseada (en metros) para controlar el zoom al hacer clic
    const ALTITUDE_METERS = 5000; 

    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const ray = this.viewer!.camera.getPickRay(click.position);
      if (ray) {
        const hit = this.viewer!.scene.globe.pick(ray, this.viewer!.scene);

        if (hit) {
          const cartographic = Cesium.Cartographic.fromCartesian(hit);
          const longitude = Cesium.Math.toDegrees(cartographic.longitude);
          const latitude = Cesium.Math.toDegrees(cartographic.latitude);
          const altitude_terreno = cartographic.height; // Altura real del terreno

            // Crear el destino de la cámara con la altitud de vuelo deseada
            const flyToDestination = Cesium.Cartesian3.fromDegrees(
                longitude, 
                latitude, 
                // Sumamos la altitud deseada a la altura del terreno
                altitude_terreno + ALTITUDE_METERS 
            );

          // Mover la cámara a la nueva ubicación seleccionada
          this.viewer!.camera.flyTo({
            destination: flyToDestination, // Usa el destino con la altitud controlada
            duration: 1.5, // Vuelo un poco más suave
          });

          // Actualizar el marcador y los datos con la nueva ubicación
          this.updateLocation(latitude, longitude, altitude_terreno, 'Clic en el mapa');
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  // --- Funciones de utilidad (Mantenidas) ---

  private cleanupCesiumUI(viewer: Cesium.Viewer): void {
    const anyViewer = viewer as any;
    if (anyViewer.bottomContainer) (anyViewer.bottomContainer as HTMLElement).style.display = 'none';
    if (anyViewer.animation?.container)
      (anyViewer.animation.container as HTMLElement).style.display = 'none';
    if (anyViewer.timeline?.container)
      (anyViewer.timeline.container as HTMLElement).style.display = 'none';
  }

  private setupResizeLogic(container: HTMLElement, viewer: Cesium.Viewer): void {
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
  }
}