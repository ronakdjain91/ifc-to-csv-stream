import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
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
    if (!element.material) return new THREE.MeshPhongMaterial({ color: 0x888888 });
    
    const mat = element.material.clone() as THREE.MeshPhongMaterial;
    if (isSelected) {
      mat.color.setHex(0xff6b35);
      mat.emissive.setHex(0x442211);
    }
    return mat;
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
  // Limit elements for performance
  const limitedElements = elements.slice(0, 50);
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {limitedElements.map((element) => (
        <ElementMesh
          key={element.id}
          element={element}
          isSelected={selectedElement?.id === element.id}
          onClick={onElementClick}
        />
      ))}
      
      <Grid 
        args={[10, 10]} 
        cellSize={1} 
        cellThickness={0.3} 
        cellColor="#666666" 
        sectionSize={5} 
        sectionThickness={0.5} 
        sectionColor="#444444"
        position={[0, -0.1, 0]}
      />
    </>
  );
};

export const ModelViewer = ({ elements, selectedElement, onElementClick }: ModelViewerProps) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-background to-muted rounded-lg overflow-hidden touch-none">
      <Canvas
        camera={{ 
          position: [5, 5, 5], 
          fov: 60,
          near: 0.1,
          far: 100
        }}
        dpr={[1, 1.5]}
        performance={{ min: 0.8 }}
        gl={{ 
          antialias: false,
          alpha: false,
          powerPreference: "default"
        }}
      >
        <Suspense fallback={null}>
          <Scene 
            elements={elements} 
            selectedElement={selectedElement} 
            onElementClick={onElementClick} 
          />
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={20}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN
            }}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};