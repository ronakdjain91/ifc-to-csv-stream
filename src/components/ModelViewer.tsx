import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Suspense, useMemo, useMemo as ReactUseMemo } from 'react';
import * as THREE from 'three';
import { IFCElement } from '../utils/ifcParser3D';

interface ModelViewerProps {
  elements: IFCElement[];
  selectedElement?: IFCElement | null;
  onElementClick: (element: IFCElement) => void;
}

interface ElementMeshProps {
  element: IFCElement;
  isSelected: boolean;
  onClick: (element: IFCElement) => void;
}

const ElementMesh = ({ element, isSelected, onClick }: ElementMeshProps) => {
  const material = useMemo(() => {
    const base = (element.material as THREE.MeshBasicMaterial) || new THREE.MeshBasicMaterial({ color: 0x888888 });
    if (isSelected) {
      return new THREE.MeshBasicMaterial({ color: 0xff6b35 });
    }
    return base;
  }, [element.material, isSelected]);

  return (
    <mesh
      geometry={element.geometry}
      material={material}
      position={element.position}
      rotation={element.rotation}
      onClick={() => onClick(element)}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    />
  );
};

const Scene = ({ elements, selectedElement, onElementClick }: ModelViewerProps) => {
  const limited = useMemo(() => elements.slice(0, 200), [elements]);
  return (
    <>
      {/* MeshBasicMaterial does not require lighting */}
      
      {limited.map((element) => (
        <ElementMesh
          key={element.id}
          element={element}
          isSelected={selectedElement?.id === element.id}
          onClick={onElementClick}
        />
      ))}
      
      <Grid args={[20, 20]} cellSize={1} cellThickness={0.3} cellColor="#666666" sectionSize={5} sectionThickness={0.5} sectionColor="#444444" position={[0, -0.1, 0]} />
    </>
  );
};

export const ModelViewer = ({ elements, selectedElement, onElementClick }: ModelViewerProps) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-background to-muted rounded-lg overflow-hidden touch-none">
      <Canvas
        camera={{ position: [6, 6, 6], fov: 60, near: 0.1, far: 200 }}
        dpr={[1, 1]}
        performance={{ min: 0.6 }}
        frameloop="demand"
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false }}
      >
        <Suspense fallback={null}>
          <Scene elements={elements} selectedElement={selectedElement} onElementClick={onElementClick} />
          <OrbitControls enablePan enableZoom enableRotate enableDamping dampingFactor={0.08} minDistance={3} maxDistance={20} />
        </Suspense>
      </Canvas>
    </div>
  );
};