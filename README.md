# CFL Logistics - Automated Quoter

## 📦 Cómo usar

1. **Abrir la aplicación**: Haz doble clic en `index.html` o ábrelo en cualquier navegador (Chrome, Edge, Firefox).
2. **No se necesita instalación**: Todo funciona 100% offline. No requiere servidor, Node.js, ni conexión a internet.

---

## 📂 Estructura de Archivos

```
Cotizador/
├── index.html          → Página principal de la aplicación
├── app.js              → Lógica de la aplicación (parsers, PDF, estado)
├── styles.css          → Estilos visuales (tema oscuro, glassmorphism)
├── logo.js             → Logos CFL pre-compilados en base64
├── README.md           → Este archivo
├── libs/               → Librerías JavaScript (offline)
│   ├── jspdf.umd.min.js
│   ├── jspdf.plugin.autotable.min.js
│   ├── papaparse.min.js
│   ├── chart.min.js
│   ├── html2pdf.bundle.min.js
│   └── inter-font.css
└── Logotipo/           → Archivos PNG originales de los logos CFL
    ├── CFL_Azul_Celeste.png
    ├── CFL_Azul_Oscuro.png
    ├── CFL_Blanco.png
    ├── CFL_Negro.png
    ├── CFL_Rojo.png
    ├── Icono_CFL_Azul_Celeste.png
    ├── Icono_CFL_Azul_Oscuro.png
    ├── Icono_CFL_Blanco.png
    ├── Icono_CFL_Negro.png
    └── Icono_CFL_Rojo.png
```

---

## ⚡ Funcionalidades

### Smart Parser (Carga Automática)
- Pega el texto del email del cliente → extrae automáticamente pallets, dimensiones, peso, clase, origen, destino, commodity y accessorials.

### Carrier Parser
- Pega el texto del portal de cotización (TForce, ABF, Daylight, etc.) → extrae carriers, precios, tránsito y los organiza en Standard vs Guaranteed.

### Generador de PDF
- Genera cotizaciones profesionales en PDF con logo, colores corporativos y disclaimer legal.
- **Template Editor**: Personaliza logo, colores, tamaños de fuente, márgenes y disclaimer con vista previa en tiempo real.

### Gestión de Clientes
- Crea clientes manualmente o importa desde CSV (compatible con HubSpot).
- Los clientes se guardan en el navegador (localStorage).

### Dashboard
- KPIs: Total de cotizaciones y clientes registrados.
- Gráfica de cotizaciones por cliente.

---

## ⚠️ Notas Importantes

- **Los datos se guardan en el navegador** (localStorage). Si cambias de navegador o limpias los datos del navegador, perderás las cotizaciones y clientes guardados.
- **Para compartir con otro equipo**: Copia toda la carpeta `Cotizador/` tal cual. La otra persona solo necesita abrir `index.html` en su navegador.
- **Funciona sin internet**: Todas las librerías están incluidas localmente en la carpeta `libs/`.

---

## 🎨 Personalización del PDF

Ve a **Template Editor** en el menú lateral para ajustar:
- Logo (seleccionar de la biblioteca CFL o subir uno propio)
- Tamaño del logo (ancho × alto en mm)
- Posición del logo
- Colores primario y secundario
- Tamaños de fuente (título y cuerpo)
- Márgenes izquierdo y derecho
- Texto legal / disclaimer

Todos los cambios se ven en **tiempo real** en la vista previa.

---

*Desarrollado para CFL Logistics © 2026*
