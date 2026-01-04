import React, { useEffect, useRef } from 'react';

class LightRays {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            raysOrigin: options.raysOrigin || 'top-center',
            raysColor: options.raysColor || '#06B6D4',
            raysSpeed: options.raysSpeed || 1,
            lightSpread: options.lightSpread || 1,
            rayLength: options.rayLength || 2,
            pulsating: options.pulsating || false,
            fadeDistance: options.fadeDistance || 1.0,
            saturation: options.saturation || 1.0,
            followMouse: options.followMouse || true,
            mouseInfluence: options.mouseInfluence || 0.1,
            noiseAmount: options.noiseAmount || 0.0,
            distortion: options.distortion || 0.0
        };

        this.mouse = { x: 0.5, y: 0.5 };
        this.smoothMouse = { x: 0.5, y: 0.5 };
        this.animationId = null;
        this.isVisible = false;

        this.init();
    }

    hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
    }

    getAnchorAndDir(origin, w, h) {
        const outside = 0.2;
        switch (origin) {
            case 'top-left': return { anchor: [0, -outside * h], dir: [0, 1] };
            case 'top-right': return { anchor: [w, -outside * h], dir: [0, 1] };
            case 'left': return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
            case 'right': return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
            case 'bottom-left': return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
            case 'bottom-center': return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
            case 'bottom-right': return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
            default: return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
        }
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.container.appendChild(this.canvas);

        this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: false });
        if (!this.gl) return;

        const vertexShader = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;
            uniform float iTime;
            uniform vec2 iResolution;
            uniform vec2 rayPos;
            uniform vec2 rayDir;
            uniform vec3 raysColor;
            uniform float raysSpeed;
            uniform float lightSpread;
            uniform float rayLength;
            uniform float pulsating;
            uniform float fadeDistance;
            uniform float saturation;
            uniform vec2 mousePos;
            uniform float mouseInfluence;
            uniform float noiseAmount;
            uniform float distortion;

            float noise(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
                vec2 sourceToCoord = coord - raySource;
                vec2 dirNorm = normalize(sourceToCoord);
                float cosAngle = dot(dirNorm, rayRefDirection);

                float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
                float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

                float distance = length(sourceToCoord);
                float maxDistance = iResolution.x * rayLength;
                float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
                float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
                float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

                float baseStrength = clamp(
                    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
                    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
                    0.0, 1.0
                );

                return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
            }

            void main() {
                vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);

                vec2 finalRayDir = rayDir;
                if (mouseInfluence > 0.0) {
                    vec2 mouseScreenPos = mousePos * iResolution.xy;
                    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
                    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
                }

                vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
                vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);

                vec4 fragColor = rays1 * 0.5 + rays2 * 0.4;

                if (noiseAmount > 0.0) {
                    float n = noise(coord * 0.01 + iTime * 0.1);
                    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
                }

                float brightness = 1.0 - (coord.y / iResolution.y);
                fragColor.x *= 0.1 + brightness * 0.8;
                fragColor.y *= 0.3 + brightness * 0.6;
                fragColor.z *= 0.5 + brightness * 0.5;

                if (saturation != 1.0) {
                    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
                    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
                }

                fragColor.rgb *= raysColor;
                gl_FragColor = fragColor;
            }
        `;

        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vs, vertexShader);
        this.gl.compileShader(vs);

        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fs, fragmentShader);
        this.gl.compileShader(fs);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLoc = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

        this.uniforms = {
            iTime: this.gl.getUniformLocation(this.program, 'iTime'),
            iResolution: this.gl.getUniformLocation(this.program, 'iResolution'),
            rayPos: this.gl.getUniformLocation(this.program, 'rayPos'),
            rayDir: this.gl.getUniformLocation(this.program, 'rayDir'),
            raysColor: this.gl.getUniformLocation(this.program, 'raysColor'),
            raysSpeed: this.gl.getUniformLocation(this.program, 'raysSpeed'),
            lightSpread: this.gl.getUniformLocation(this.program, 'lightSpread'),
            rayLength: this.gl.getUniformLocation(this.program, 'rayLength'),
            pulsating: this.gl.getUniformLocation(this.program, 'pulsating'),
            fadeDistance: this.gl.getUniformLocation(this.program, 'fadeDistance'),
            saturation: this.gl.getUniformLocation(this.program, 'saturation'),
            mousePos: this.gl.getUniformLocation(this.program, 'mousePos'),
            mouseInfluence: this.gl.getUniformLocation(this.program, 'mouseInfluence'),
            noiseAmount: this.gl.getUniformLocation(this.program, 'noiseAmount'),
            distortion: this.gl.getUniformLocation(this.program, 'distortion')
        };

        const rgb = this.hexToRgb(this.options.raysColor);
        this.gl.uniform3f(this.uniforms.raysColor, rgb[0], rgb[1], rgb[2]);
        this.gl.uniform1f(this.uniforms.raysSpeed, this.options.raysSpeed);
        this.gl.uniform1f(this.uniforms.lightSpread, this.options.lightSpread);
        this.gl.uniform1f(this.uniforms.rayLength, this.options.rayLength);
        this.gl.uniform1f(this.uniforms.pulsating, this.options.pulsating ? 1.0 : 0.0);
        this.gl.uniform1f(this.uniforms.fadeDistance, this.options.fadeDistance);
        this.gl.uniform1f(this.uniforms.saturation, this.options.saturation);
        this.gl.uniform1f(this.uniforms.mouseInfluence, this.options.mouseInfluence);
        this.gl.uniform1f(this.uniforms.noiseAmount, this.options.noiseAmount);
        this.gl.uniform1f(this.uniforms.distortion, this.options.distortion);

        this.handleResize = this.handleResize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        window.addEventListener('resize', this.handleResize);
        if (this.options.followMouse) {
            window.addEventListener('mousemove', this.handleMouseMove);
        }

        this.handleResize();
        this.start();
    }

    handleResize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio, 2);

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);

        const { anchor, dir } = this.getAnchorAndDir(this.options.optionsRaysOrigin || 'top-center', this.canvas.width, this.canvas.height);
        this.gl.uniform2f(this.uniforms.rayPos, anchor[0], anchor[1]);
        this.gl.uniform2f(this.uniforms.rayDir, dir[0], dir[1]);
    }

    handleMouseMove(e) {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) / rect.width;
        this.mouse.y = (e.clientY - rect.top) / rect.height;
    }

    render(time) {
        if (!this.gl) return;
        this.gl.uniform1f(this.uniforms.iTime, time * 0.001);

        if (this.options.followMouse && this.options.mouseInfluence > 0) {
            const smoothing = 0.92;
            this.smoothMouse.x = this.smoothMouse.x * smoothing + this.mouse.x * (1 - smoothing);
            this.smoothMouse.y = this.smoothMouse.y * smoothing + this.mouse.y * (1 - smoothing);
            this.gl.uniform2f(this.uniforms.mousePos, this.smoothMouse.x, this.smoothMouse.y);
        }

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.animationId = requestAnimationFrame(t => this.render(t));
    }

    start() {
        if (!this.animationId) {
            this.animationId = requestAnimationFrame(t => this.render(t));
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

const LightRaysCanvas = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const rays = new LightRays(containerRef.current, {
            raysOrigin: 'top-center',
            raysColor: '#ffffff',
            raysSpeed: 0.8,
            lightSpread: 0.2,
            rayLength: 1.5,
            pulsating: true,
            fadeDistance: 1.0,
            saturation: 1.0,
            followMouse: true,
            mouseInfluence: 0.1,
            noiseAmount: 0.0,
            distortion: 0.0
        });

        return () => {
            rays.destroy();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            id="light-rays-container"
            className="absolute inset-0 opacity-20 pointer-events-none parallax-bg mix-blend-screen"
            data-speed="0.3"
        />
    );
};

export default LightRaysCanvas;
