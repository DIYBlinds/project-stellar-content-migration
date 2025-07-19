export const bundle = async (name: string): Promise<any> => {
  switch (name) {
    case 'blinds--double-linked--20250716': return await import('../bundles/blinds--double-linked--20250716.js');
    case 'blinds--doubleroller--20250716': return await import('../bundles/blinds--doubleroller--20250716.js');
    case 'blinds--linked--20150716': return await import('../bundles/blinds--linked--20150716.js');
    case 'blinds--panel-glide--20250618': return await import ('./blinds--panel-glide--20250618.js');
    case 'blinds--roller--20250716': return await import('../bundles/blinds--roller--20250716.js');
    case 'blinds--venetian-aluminium--20250716': return await import('../bundles/blinds--venetian-aluminium--20250716.js');
    case 'blinds--venetian-purewood--20250716': return await import('../bundles/blinds--venetian-purewood--20250716.js');
    case 'blinds--venetian-visionwood--20250716': return await import('../bundles/blinds--venetian-visionwood--20250716.js');
    case 'blinds--vertical--20250716': return await import('../bundles/blinds--vertical--20250716.js');
    case 'curtains--boxandbay--20250717': return await import('../bundles/curtains--boxandbay--20250717.js');
    case 'curtains--curved--20250717': return await import('../bundles/curtains--curved--20250717.js');
    case 'curtains--designer--20250717': return await import('../bundles/curtains--designer--20250717.js');
    case 'curtains--dimout--20250717': return await import('../bundles/curtains--dimout--20250717.js');
    case 'curtains--double--20250717': return await import('../bundles/curtains--double--20250717.js');
    case 'curtains--lined--20250624': return await import('../bundles/curtains--lined--20250624.js');
    case 'curtains--lined--20250718': return await import('../bundles/curtains--lined--20250718.js');
    default: throw new Error(`Bundle ${name} not found`);
  }
};