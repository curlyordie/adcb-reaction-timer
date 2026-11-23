export const designCanvases={
 led:{width:768,height:1024,label:'Event LED · 768 × 1024'},
 portrait:{width:1080,height:1920,label:'Portrait · 1080 × 1920'},
 landscape:{width:1920,height:1080,label:'Landscape · 1920 × 1080'},
} as const;
export type DesignFormat=keyof typeof designCanvases;
