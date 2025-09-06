// Lightweight helpers to compute net volumes using web-ifc, if available in the browser

export type ExpressId = number;

export interface VolumeMap {
  [expressId: string]: number;
}

export const computeNetVolumes = async (file: File): Promise<VolumeMap> => {
  try {
    const mod: any = await import('web-ifc');
    const { IfcAPI } = mod;
    const IFCRELDEFINESBYPROPERTIES = mod.IFCRELDEFINESBYPROPERTIES;
    const IFCELEMENTQUANTITY = mod.IFCELEMENTQUANTITY;
    const IFCRELVOIDSELEMENT = mod.IFCRELVOIDSELEMENT;
    const IFCQUANTITYVOLUME = mod.IFCQUANTITYVOLUME;

    const api = new IfcAPI();
    await api.Init();

    const buffer = await file.arrayBuffer();
    const modelID = api.OpenModel(new Uint8Array(buffer));

    const volumes: Map<ExpressId, number> = new Map();

    // Helper to add volume to element id
    const addVol = (id: ExpressId, vol: number) => {
      if (!isFinite(vol)) return;
      volumes.set(id, (volumes.get(id) || 0) + vol);
    };

    // 1) Collect volumes from Element Quantities (IfcRelDefinesByProperties -> IfcElementQuantity -> IfcQuantityVolume)
    const relIds = api.GetLineIDsWithType(modelID, IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relIds.size(); i++) {
      const relId = relIds.get(i);
      const rel: any = api.GetLine(modelID, relId);
      if (!rel || !rel.RelatingPropertyDefinition) continue;
      const propId = rel.RelatingPropertyDefinition.value;
      const propDef: any = api.GetLine(modelID, propId);
      if (!propDef || propDef.type !== IFCELEMENTQUANTITY) continue;
      const quantities = propDef.Quantities || [];
      let volSum = 0;
      for (const q of quantities) {
        const qId = q.value;
        const qLine: any = api.GetLine(modelID, qId);
        if (qLine && qLine.type === IFCQUANTITYVOLUME) {
          const v = Number(qLine.VolumeValue?.value ?? qLine.VolumeValue);
          if (isFinite(v)) volSum += v;
        }
      }
      if (volSum > 0 && Array.isArray(rel.RelatedObjects)) {
        for (const ref of rel.RelatedObjects) {
          const elId = ref.value;
          addVol(elId, volSum);
        }
      }
    }

    // 2) Subtract opening volumes where defined (IfcRelVoidsElement)
    const voidIds = api.GetLineIDsWithType(modelID, IFCRELVOIDSELEMENT);
    for (let i = 0; i < voidIds.size(); i++) {
      const relId = voidIds.get(i);
      const rel: any = api.GetLine(modelID, relId);
      if (!rel) continue;
      const hostId: ExpressId | undefined = rel.RelatingBuildingElement?.value;
      const openingId: ExpressId | undefined = rel.RelatedOpeningElement?.value;
      if (!hostId || !openingId) continue;
      // Opening volume via its ElementQuantity if available
      // Search IfcRelDefinesByProperties that target this opening
      let openingVol = 0;
      for (let j = 0; j < relIds.size() && openingVol === 0; j++) {
        const rId = relIds.get(j);
        const r: any = api.GetLine(modelID, rId);
        if (!r || !Array.isArray(r.RelatedObjects)) continue;
        const isTarget = r.RelatedObjects.some((o: any) => o?.value === openingId);
        if (!isTarget) continue;
        const pId = r.RelatingPropertyDefinition?.value;
        if (!pId) continue;
        const pDef: any = api.GetLine(modelID, pId);
        if (!pDef || pDef.type !== IFCELEMENTQUANTITY) continue;
        const qs = pDef.Quantities || [];
        for (const q of qs) {
          const qL: any = api.GetLine(modelID, q.value);
          if (qL && qL.type === IFCQUANTITYVOLUME) {
            const v = Number(qL.VolumeValue?.value ?? qL.VolumeValue);
            if (isFinite(v)) openingVol += v;
          }
        }
      }
      if (openingVol > 0) addVol(hostId, -openingVol);
    }

    api.CloseModel(modelID);

    // Convert to plain object with string keys (matching our element ids)
    const out: VolumeMap = {};
    volumes.forEach((v, k) => {
      out[String(k)] = v;
    });
    return out;
  } catch (err) {
    // If anything fails, return empty map (fallback to previous approach)
    return {};
  }
};

