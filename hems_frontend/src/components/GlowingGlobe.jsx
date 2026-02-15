import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { useSpring } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const GlowingGlobe = ({ className, onMarkerClick }) => {
    const canvasRef = useRef();
    const pointerInteracting = useRef(null);
    const pointerInteractionMovement = useRef(0);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        let phi = 0;
        let width = 0;

        const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
        window.addEventListener('resize', onResize);
        onResize();

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.05, 0.2, 0.05], // Dark green base
            markerColor: [0.1, 0.8, 0.1], // Bright green markers
            glowColor: [0.2, 1, 0.2], // Glowing green aura
            markers: [
                { location: [37.7595, -122.4367], size: 0.05 },
                { location: [40.7128, -74.0060], size: 0.05 },
                { location: [51.5074, -0.1278], size: 0.05 },
                { location: [35.6895, 139.6917], size: 0.05 },
                { location: [-33.8688, 151.2093], size: 0.05 },
            ],
            onRender: (state) => {
                if (!pointerInteracting.current) {
                    phi += 0.005;
                }
                state.phi = phi + rotation;
                state.width = width * 2;
                state.height = width * 2;
            },
        });

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, [rotation]);

    return (
        <div className={`relative flex flex-col items-center justify-center ${className}`}>
            <div className="absolute inset-0 bg-green-500/10 blur-[100px] rounded-full" />
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', maxWidth: 600, aspectRatio: 1 }}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
                    canvasRef.current.style.cursor = 'grabbing';
                }}
                onPointerUp={() => {
                    pointerInteracting.current = null;
                    canvasRef.current.style.cursor = 'grab';
                }}
                onPointerOut={() => {
                    pointerInteracting.current = null;
                    canvasRef.current.style.cursor = 'grab';
                }}
                onMouseMove={(e) => {
                    if (pointerInteracting.current !== null) {
                        const delta = e.clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        setRotation(delta / 200);
                    }
                }}
            />

            {/* Manual Controls */}
            <div className="absolute bottom-4 flex gap-4 z-10">
                <button
                    onClick={() => setRotation(r => r - 0.5)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all"
                >
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={() => setRotation(r => r + 0.5)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all"
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
    );
};

export default GlowingGlobe;
