export interface ToolRegistryItem {
  id: string;
  nameKey: string;
  defaultName: string;
  defaultSize: { width: number, height: number };
  minSize: { width: number, height: number };
  isUtility?: boolean;
}

export const TOOLS_REGISTRY: ToolRegistryItem[] = [
  { id: 'stopwatch', nameKey: 'stopwatch', defaultName: 'Stopwatch', defaultSize: { width: 380, height: 450 }, minSize: { width: 300, height: 400 } },
  { id: 'minitimer', nameKey: 'minitimer', defaultName: 'Mini Timer', defaultSize: { width: 380, height: 450 }, minSize: { width: 300, height: 400 } },
  { id: 'reminders', nameKey: 'reminders', defaultName: 'Reminders', defaultSize: { width: 400, height: 550 }, minSize: { width: 400, height: 400 } },
  { id: 'calc', nameKey: 'calc', defaultName: 'Calculator', defaultSize: { width: 380, height: 450 }, minSize: { width: 350, height: 450 } },
  { id: 'tasks', nameKey: 'tasks', defaultName: 'Tasks', defaultSize: { width: 400, height: 550 }, minSize: { width: 400, height: 400 } },
  { id: 'notes', nameKey: 'notes', defaultName: 'Notes', defaultSize: { width: 400, height: 550 }, minSize: { width: 400, height: 300 } },
  
  { id: 'periodicTable', nameKey: 'periodicTable', defaultName: 'Periodic Table', defaultSize: { width: 1000, height: 700 }, minSize: { width: 1000, height: 700 } },
  { id: 'desmos', nameKey: 'desmos', defaultName: 'Graphs', defaultSize: { width: 900, height: 650 }, minSize: { width: 600, height: 500 } },
  { id: 'formulas', nameKey: 'formulas', defaultName: 'Formulas', defaultSize: { width: 600, height: 600 }, minSize: { width: 600, height: 500 } },
  { id: 'integrals', nameKey: 'integrals', defaultName: 'Integrals', defaultSize: { width: 600, height: 500 }, minSize: { width: 600, height: 500 } },
  { id: 'converter', nameKey: 'converter', defaultName: 'Converter', defaultSize: { width: 400, height: 500 }, minSize: { width: 400, height: 500 } },
  
  { id: 'worldClock', nameKey: 'dlc_worldClock_name', defaultName: 'World Clock', defaultSize: { width: 500, height: 450 }, minSize: { width: 500, height: 400 } },
  { id: 'devTools', nameKey: 'dlc_devTools_name', defaultName: 'Dev Tools', defaultSize: { width: 1000, height: 700 }, minSize: { width: 1000, height: 700 } },
  { id: 'autoclicker', nameKey: 'autoclicker', defaultName: 'Auto Clicker', defaultSize: { width: 400, height: 500 }, minSize: { width: 400, height: 500 } },
  { id: 'numismatics', nameKey: 'numismatics_title', defaultName: 'Numismatics', defaultSize: { width: 600, height: 500 }, minSize: { width: 600, height: 500 } },
  { id: 'humanTyper', nameKey: 'humanTyper', defaultName: 'Human Typer', defaultSize: { width: 500, height: 450 }, minSize: { width: 500, height: 400 } },
  { id: 'superHumanizer', nameKey: 'superHumanizer', defaultName: 'Super Humanizer', defaultSize: { width: 1300, height: 850 }, minSize: { width: 800, height: 500 } },
  { id: 'creatorStudio', nameKey: 'creatorStudio', defaultName: 'Creator Studio', defaultSize: { width: 800, height: 600 }, minSize: { width: 800, height: 600 } },
  
  { id: 'screenshot', nameKey: 'screenshot', defaultName: 'Screenshot', defaultSize: { width: 0, height: 0 }, minSize: { width: 0, height: 0 }, isUtility: true },
  { id: 'paint', nameKey: 'paint', defaultName: 'Paint', defaultSize: { width: 800, height: 600 }, minSize: { width: 800, height: 600 }, isUtility: true },
  { id: 'image-editor', nameKey: 'image-editor', defaultName: 'Image Editor', defaultSize: { width: 1200, height: 800 }, minSize: { width: 800, height: 600 }, isUtility: true },
  
  { id: 'library', nameKey: 'library', defaultName: 'Library', defaultSize: { width: 600, height: 500 }, minSize: { width: 600, height: 500 }, isUtility: true },
  { id: 'settings', nameKey: 'settings', defaultName: 'Settings', defaultSize: { width: 500, height: 500 }, minSize: { width: 500, height: 500 }, isUtility: true }
];

export function getToolConfig(id: string): ToolRegistryItem | undefined {
  return TOOLS_REGISTRY.find(t => t.id === id);
}
