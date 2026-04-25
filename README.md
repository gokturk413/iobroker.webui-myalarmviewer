# @gokturk413/iobroker.webui-myalarmviewer

MyAlarm Viewer Web Components for ioBroker WebUI - Real-time and historical alarm viewing with export functionality.

## Features

- ✅ **Real-time Alarm Viewer** - Live alarm monitoring with sound notification
- ✅ **Historical Alarm Viewer** - View past alarms with date range selection
- ✅ **Export Functionality** - Export to PDF, Excel (XLSX), or CSV
- ✅ **Tabulator.js** - Advanced table with sorting, filtering, pagination
- ✅ **Flatpickr** - Modern date range picker (replaces Syncfusion)
- ✅ **Web Components** - Custom elements for easy integration
- ✅ **TypeScript** - Type-safe development
- ✅ **Themeable** - Light, Dark, Midnight themes

## Installation

```bash
npm install @gokturk413/iobroker.webui-myalarmviewer
```

## Usage in ioBroker WebUI

### 1. Install Package

```bash
cd /opt/iobroker/iobroker-data/files/webui.0/
npm install @gokturk413/iobroker.webui-myalarmviewer
```

### 2. Import in WebUI

Create a custom control or add to your project:

```typescript
import '@gokturk413/iobroker.webui-myalarmviewer';
```

### 3. Use Components in HTML

**Real-time Alarm Viewer:**
```html
<alarm-viewer
  oid-json="myalarm.0.alarms"
  oid-is-alarm="myalarm.0.isAlarmActive"
  oid-sound="myalarm.0.soundEnabled"
  oid-ack="myalarm.0.acknowledge"
  theme="midnight"
  auto-scroll="true"
  max-rows="100">
</alarm-viewer>
```

**Historical Alarm Viewer:**
```html
<historical-alarm-viewer
  oid-json="myalarm.0.historicalAlarms"
  theme="midnight"
  default-days="7">
</historical-alarm-viewer>
```

## Properties

### AlarmViewer Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `oid-json` | string | "" | State ID for alarm JSON data |
| `oid-is-alarm` | string | "" | State ID for alarm status |
| `oid-sound` | string | "" | State ID for sound control |
| `oid-ack` | string | "" | State ID for acknowledge |
| `sound-file` | string | "sounds/alarm.mp3" | Custom sound file path |
| `theme` | string | "midnight" | Theme: light, dark, midnight |
| `auto-scroll` | boolean | true | Auto-scroll to new alarms |
| `max-rows` | number | 100 | Maximum rows to display |

### HistoricalAlarmViewer Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `oid-json` | string | "" | State ID for historical alarm data |
| `theme` | string | "midnight" | Theme: light, dark, midnight |
| `default-days` | number | 7 | Default days range |

## Alarm Data Format

```typescript
interface AlarmData {
  id: string;
  timestamp: number | string;  // ISO date string or Unix timestamp
  message: string;
  type: 'alarm' | 'warning' | 'info';
  acknowledged: boolean;
  source?: string;
  priority?: number;
}
```

Example:
```json
[
  {
    "id": "alarm-001",
    "timestamp": "2026-03-08T10:00:00Z",
    "message": "High temperature detected",
    "type": "alarm",
    "acknowledged": false,
    "source": "Sensor-A1",
    "priority": 1
  }
]
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Dev Server

```bash
npm run dev
```

## Dependencies

- **@node-projects/base-custom-webcomponent** - Base for web components
- **tabulator-tables** - Advanced table (replaces jQuery)
- **flatpickr** - Date picker (replaces Syncfusion)
- **jspdf** + **jspdf-autotable** - PDF export
- **xlsx** - Excel export

## Differences from VIS Widget

| Feature | VIS Widget | WebUI Component |
|---------|------------|-----------------|
| Framework | jQuery + EJS | Web Components + TypeScript |
| Date Picker | Syncfusion (paid) | Flatpickr (free) |
| Build | Manual files | npm package with Vite |
| Distribution | Local files | npm registry |
| Theming | CSS classes | Dynamic theming |
| Reusability | VIS only | Any web project |

## License

MIT © gokturk413

## Author

Kamran Mustafayev (gokturk413@gmail.com)
