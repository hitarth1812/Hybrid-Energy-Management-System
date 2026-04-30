import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * GlowingGlobe — renders a full, unclipped cobe globe.
 *
 * Pass `globeSize` (number, default 500) to control the pixel dimensions.
 * The canvas is given explicit pixel width/height so cobe always renders
 * a perfect sphere regardless of parent container constraints.
 */
const GlowingGlobe = ({ className = '', onMarkerClick, globeSize = 500 }) => {
    const canvasRef = useRef();
    const pointerInteracting = useRef(null);
    const pointerInteractionMovement = useRef(0);
    const [rotation, setRotation] = useState(0);

    // [L2] Respect prefers-reduced-motion
    const prefersReduced =
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;

    useEffect(() => {
        if (!canvasRef.current) return;
        let phi = Math.PI;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: window.devicePixelRatio || 2,
            width: globeSize,
            height: globeSize,
            phi: Math.PI,
            theta: 0.3,
            scale: 1.15,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.05, 0.2, 0.05],
            markerColor: [0.1, 0.8, 0.1],
            glowColor: [0.2, 1, 0.2],
            markers: [
                { location: [37.7595, -122.4367], size: 0.05 },
                { location: [40.7128, -74.0060],  size: 0.05 },
                { location: [51.5074, -0.1278],   size: 0.05 },
                { location: [35.6895, 139.6917],  size: 0.05 },
                { location: [-33.8688, 151.2093], size: 0.05 },
            ],
            onRender: (state) => {
                if (!pointerInteracting.current && !prefersReduced) {
                    phi += 0.005;
                }
                state.phi = phi + rotation;
            },
        });

        return () => { globe.destroy(); };
    }, [rotation, globeSize]);

    return (
        // Wrapper is exactly globeSize × globeSize — no percentage widths,
        // no aspect-ratio tricks, no ResizeObserver. Just a fixed square.
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={{
                width:    globeSize,
                height:   globeSize,
                flexShrink: 0,
                overflow: 'visible',
            }}
        >
            {/* Glow halo */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
            />

            {/* Globe canvas — explicit pixel size, never percentage */}
            <canvas
                ref={canvasRef}
                style={{
                    width:   globeSize,
                    height:  globeSize,
                    display: 'block',
                    cursor:  'grab',
                }}
                className="active:cursor-grabbing relative z-10"
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

            {/* Manual rotation controls */}
            <div className="absolute bottom-4 flex gap-4 z-20">
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
