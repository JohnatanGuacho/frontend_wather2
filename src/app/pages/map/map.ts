import { Component, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import * as Cesium from 'cesium';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.html',
  styleUrls: ['./map.css', './map-fix.css'],
  imports: [RouterLink, RouterLinkActive],
})
export class Map implements AfterViewInit {
  private viewer: Cesium.Viewer | undefined;
  private locationMarker: Cesium.Entity | undefined;

  /* === NAV INDICATOR === */
  @ViewChild('indicator', { static: true }) indicator!: ElementRef<HTMLElement>;
  @ViewChild('nav', { static: true }) nav!: ElementRef<HTMLElement>;

  @HostListener('window:resize')
  onResize() { this.snapToActive(); }

  moveIndicator(ev: MouseEvent | FocusEvent) {
    const target = ev.currentTarget as HTMLElement;
    this.positionIndicator(target);
  }
  onLeaveNav() { this.snapToActive(); }

  private positionIndicator(target: HTMLElement) {
    if (!this.indicator || !this.nav) return;
    const navRect = this.nav.nativeElement.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const left = rect.left - navRect.left;

    const el = this.indicator.nativeElement;
    el.style.width = `${rect.width}px`;
    el.style.transform = `translateX(${left}px)`;
    el.style.opacity = '1';
  }

  private snapToActive() {
    if (!this.nav) return;
    const active = this.nav.nativeElement.querySelector('.nav-item.active, .links a.active') as HTMLElement | null;
    const el = this.indicator?.nativeElement;
    if (active && el) {
      this.positionIndicator(active);
    } else if (el) {
      el.style.opacity = '0';
    }
  }

  private deferSnapToActive() {
    setTimeout(() => this.snapToActive(), 0);
    setTimeout(() => this.snapToActive(), 300);
  }

  async ngAfterViewInit(): Promise<void> {
    this.deferSnapToActive(); // coloca el indicador al cargar

    const container = document.getElementById('cesiumContainer');
    if (!container) return;

    try {
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

      // 🌍 Fondo
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

      // 📍 Ubicación inicial del usuario
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, altitude } = pos.coords;

            this.viewer!.scene.postProcessStages.fxaa.enabled = true;
            this.viewer!.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500000),
              duration: 3,
              easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            });

            this.updateLocation(latitude, longitude, altitude, 'Tu ubicación');
          },
          (err) => {
            console.warn('⚠️ No se pudo obtener la ubicación:', err);
            document.getElementById('city')!.textContent = 'Ubicación no detectada';
          }
        );
      }

      this.setupMapClickHandling();
      this.cleanupCesiumUI(this.viewer);
      this.setupResizeLogic(container, this.viewer);

      console.log('✅ CesiumJS inicializado correctamente');
      this.deferSnapToActive(); // recoloca tras render
    } catch (error) {
      console.error('🚨 Error al inicializar Cesium:', error);
    }
  }

  // ----------------------------------------------------------------------------------
  // 🌍 FUNCIÓN: GEOCODIFICACIÓN INVERSA + ISO3 + Bandera
  // ----------------------------------------------------------------------------------
  private async fetchCityName(latitude: number, longitude: number): Promise<{ name: string; iso3: string; flag: string }> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

    // 🔹 Diccionario ISO2 → ISO3
    const iso2to3: Record<string, string> = {
      EC: 'ECU', CO: 'COL', PE: 'PER', BR: 'BRA', AR: 'ARG', CL: 'CHL',
      MX: 'MEX', US: 'USA', CA: 'CAN', ES: 'ESP', FR: 'FRA', DE: 'DEU',
      IT: 'ITA', GB: 'GBR', AU: 'AUS', NZ: 'NZL', JP: 'JPN', CN: 'CHN',
      IN: 'IND', RU: 'RUS', VE: 'VEN', CR: 'CRI', PA: 'PAN', UY: 'URY'
    };

    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'HydroUrban-App/1.0' } });
      const data = await response.json();

      const iso2 = data?.address?.country_code?.toUpperCase() || '—';
      const iso3 = iso2to3[iso2] || iso2;
      const flag = iso2 !== '—' ? this.countryCodeToFlag(iso2) : '🏳️';

      let name = 'Ubicación Desconocida';
      if (data?.address) {
        const a = data.address;
        name = a.city || a.town || a.village || a.state || data.display_name.split(',')[0];
      }

      return { name, iso3, flag };
    } catch (e) {
      console.warn('Error al obtener nombre de ciudad:', e);
      return { name: 'Geocodificación no disponible', iso3: '—', flag: '🏳️' };
    }
  }

  // 🔠 Convierte código ISO2 a bandera emoji
  private countryCodeToFlag(iso2: string): string {
    return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
  }

  // ----------------------------------------------------------------------------------
  // 📸 FUNCIÓN: CAPTURA DE PANTALLA
  // ----------------------------------------------------------------------------------
  public takeSnapshotAndDownload(): void {
    if (!this.viewer) return;
    (this.viewer.scene as any).renderWhenIdle = true;

    setTimeout(() => {
      try {
        const canvas = this.viewer!.scene.canvas;
        const imageURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = `plano_urban_hydro_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ Plano descargado.');
      } catch (error) {
        console.error('🚨 Error al capturar imagen:', error);
        alert('Error al descargar el plano.');
      }
    }, 100);
  }

  // ----------------------------------------------------------------------------------
  // 📡 ACTUALIZAR INFORMACIÓN EN PANEL
  // ----------------------------------------------------------------------------------
  private async updateLocation(latitude: number, longitude: number, altitude: number | null, labelText: string): Promise<void> {
    if (!this.viewer) return;

    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude);
    document.getElementById('city')!.textContent = 'Buscando ubicación...';
    document.getElementById('country')!.textContent = 'Buscando país...';

    const { name: city, iso3, flag } = await this.fetchCityName(latitude, longitude);
    let cityDisplay = city || 'Área desconocida';

    let realAltitude = altitude ?? 0;
    try {
      const positions = [Cesium.Cartographic.fromDegrees(longitude, latitude)];
      const updated = await Cesium.sampleTerrainMostDetailed(this.viewer.terrainProvider, positions);
      if (updated[0].height) realAltitude = updated[0].height;
    } catch { }

    if (this.locationMarker) this.viewer.entities.remove(this.locationMarker);
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

    document.getElementById('lat')!.textContent = latitude.toFixed(4);
    document.getElementById('lon')!.textContent = longitude.toFixed(4);
    document.getElementById('alt')!.textContent = `${realAltitude.toFixed(2)} m`;
    document.getElementById('city')!.textContent = `${cityDisplay} 🌎`;
    document.getElementById('country')!.innerHTML = `${flag} ${iso3}`;
    document.getElementById('pop')!.textContent = 'Consultando...';

    // ✅ Nueva consulta solo por país
    fetch(`http://localhost:3000/api/population/country?iso3=${iso3}&year=2011`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.country && d.popyear) {
          document.getElementById('pop')!.innerHTML = `
            ${d.country} (${d.popyear})<br>
            <a href="${d.url_summary}" target="_blank" style="color:#00bfff;">Ver detalles</a>
          `;
        } else {
          document.getElementById('pop')!.textContent = 'Sin datos';
        }
      })
      .catch(() => {
        document.getElementById('pop')!.textContent = 'No disponible';
      });
  }

  private setupMapClickHandling(): void {
    if (!this.viewer) return;
    const ALTITUDE_METERS = 500;
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const ray = this.viewer!.camera.getPickRay(click.position);
      const hit = ray ? this.viewer!.scene.globe.pick(ray, this.viewer!.scene) : null;
      if (hit) {
        const c = Cesium.Cartographic.fromCartesian(hit);
        const lon = Cesium.Math.toDegrees(c.longitude);
        const lat = Cesium.Math.toDegrees(c.latitude);
        const alt = c.height;
        const flyTo = Cesium.Cartesian3.fromDegrees(lon, lat, alt + ALTITUDE_METERS);

        this.viewer!.camera.flyTo({
          destination: flyTo,
          duration: 1.0,
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90.0), roll: 0.0 },
        });

        this.updateLocation(lat, lon, alt, 'Clic en el mapa');
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

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
    const resizeObserver = new ResizeObserver(() => fixCanvasSize());
    resizeObserver.observe(container);
  }

  // ----------------------------------------------------------------------------------
  // 🧠 FUNCIÓN: Analizar zona
  // ----------------------------------------------------------------------------------
  public async analyzeCurrentLocation(): Promise<void> {
    try {
      const latText = document.getElementById('lat')?.textContent;
      const lonText = document.getElementById('lon')?.textContent;
      const countryText = document.getElementById('country')?.textContent;

      if (!latText || !lonText || !countryText) {
        alert('Selecciona primero una ubicación en el mapa.');
        return;
      }

      const lat = parseFloat(latText);
      const lon = parseFloat(lonText);
      const iso3 = countryText.split(' ').pop()?.trim() || 'ECU';

      console.log('🛰️ Enviando análisis:', { lat, lon, iso3 });

      const response = await fetch(
        `http://localhost:3000/api/analyze?lat=${lat}&lon=${lon}&iso3=${iso3}`,
      );
      const result = await response.json();

      localStorage.setItem('analyzeResult', JSON.stringify(result));
      window.location.href = '/analyze-report';
    } catch (err) {
      console.error('🚨 Error al analizar la zona:', err);
      alert('No se pudo completar el análisis. Revisa la consola para más detalles.');
    }
  }
}
