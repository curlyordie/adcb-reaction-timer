export const designCanvases={
 portrait:{width:1080,height:1920,label:'Portrait · 1080 × 1920'},
 landscape:{width:1920,height:1080,label:'Landscape · 1920 × 1080'},
} as const;
export type DesignFormat=keyof typeof designCanvases;
