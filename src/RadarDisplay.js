// --- START OF FILE RadarDisplay.js ---

import *   as THREE from 'three';
import { Martian } from './martian.js'; // Import Martian to check instanceof
import { Ghast } from './Ghast.js';     // Import Ghast to check instanceof

// Temporary vectors for calculations
const _vector2D = new THREE.Vector2(); // For relative positions
const _tempCanvasPos = new THREE.Vector2(); // For calculating canvas positions
const _worldCorner = new THREE.Vector3(); // For world boundary corners

export class RadarDisplay {
    /**
     * Creates a Radar Display manager.
     * @param {string} canvasId The ID of the HTML canvas element.
     * @param {object} [options] Optional configuration.
     * @param {number} [options.range=50] Max world distance shown on radar radius.
     * @param {number} [options.edgeIndicatorRange=60] Max world distance to show edge indicators.
     * @param {string} [options.playerColor='cyan'] Color for the player.
     * @param {string} [options.martianColor='#ff6666'] Color for Martian dots.
     * @param {string} [options.ghastColor='#ff66ff'] Color for Ghast markers.
     * @param {number} [options.playerMarkerSize=10] Approx overall size of the player marker.
     * @param {number} [options.martianDotRadius=3.5] Pixel radius for Martian dots.
     * @param {number} [options.ghastMarkerSize=7] Side length for Ghast squares.
     * @param {number} [options.edgeMarkerSize=5] Size for edge indicators.
     //     * @param {boolean} [options.rotate=true] Whether the radar view rotates with the player. // Temporarily controlled internally
     * @param {boolean} [options.showRangeRing=true] Whether to draw a ring indicating max range.
     * @param {string} [options.rangeRingColor='rgba(50, 205, 50, 0.5)'] Color of the range ring.
     * @param {string} [options.backgroundColor='rgba(10, 30, 10, 0.5)'] Radar background.
     * @param {string} [options.worldEdgeColor='rgba(100, 100, 255, 0.5)'] Color for world edge lines.
     */
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Radar Error: Canvas element with ID "${canvasId}" not found.`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error(`Radar Error: Could not get 2D context for canvas "${canvasId}".`);
            return;
        }

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        this.range = options.range ?? 50.0;
        this.edgeIndicatorRange = options.edgeIndicatorRange ?? this.range * 1.2;
        this.playerColor = options.playerColor ?? 'cyan';
        this.martianColor = options.martianColor ?? '#ff6666';
        this.ghastColor = options.ghastColor ?? '#ff66ff';
        this.playerMarkerSize = options.playerMarkerSize ?? 12; // Adjusted for teardrop
        this.martianDotRadius = options.martianDotRadius ?? 3.5;
        this.ghastMarkerSize = options.ghastMarkerSize ?? 7;
        this.edgeMarkerSize = options.edgeMarkerSize ?? 5;

        // this.rotate = options.rotate ?? true; // Rotation mode controlled internally for diagnosis
        this.showRangeRing = options.showRangeRing ?? true;
        this.rangeRingColor = options.rangeRingColor ?? 'rgba(50, 205, 50, 0.5)';
        this.backgroundColor = options.backgroundColor ?? 'rgba(10, 30, 10, 0.5)';
        this.worldEdgeColor = options.worldEdgeColor ?? 'rgba(100, 100, 255, 0.4)';

        if (this.range <= 0) this.range = 50.0;
        this.radarCircleRadius = Math.min(this.centerX, this.centerY) * 0.95;
        this.scale = this.radarCircleRadius / this.range;

        this.isVisible = !this.canvas.classList.contains('hidden');

        this.worldExtents = null;

        console.log(`Radar initialized (DIAGNOSTIC MODE / Teardrop Player): Canvas(${this.width}x${this.height}), Range(${this.range}), Scale(${this.scale.toFixed(2)})`);
    }

    setWorldExtents(extents) {
        this.worldExtents = extents;
    }

    setVisibility(visible) {
        if (!this.canvas) return;
        if (visible) {
            this.canvas.classList.remove('hidden');
            this.isVisible = true;
        } else {
            this.canvas.classList.add('hidden');
            this.isVisible = false;
        }
    }

    // --- Drawing Helper Methods ---
    drawPlayerMarker(playerWorldYaw) {
        if (!this.ctx) return;

        const overallSize = this.playerMarkerSize; // Overall height of the teardrop
        const circleRadius = overallSize * 0.35; // Radius of the back circle part
        const circleCenterYOffset = overallSize * 0.15; // How far "down" the circle center is from radar center
        const pointYOffset = -overallSize * 0.5; // How far "up" the tip is from radar center

        // Calculate tangent points for where the triangle meets the circle
        // This requires a bit of trigonometry or geometric construction.
        // For simplicity here, we'll make the triangle base wide enough to visually connect.
        const triangleBaseWidth = circleRadius * 1.8; // Slightly less than 2*circleRadius for a smooth look

        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY); // Move canvas origin to player's screen position
        this.ctx.rotate(-playerWorldYaw - Math.PI); // Rotate the canvas for the player's orientation

        // 1. Draw the circle (back part)
        this.ctx.beginPath();
        this.ctx.arc(0, circleCenterYOffset, circleRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.playerColor;
        this.ctx.fill();

        // 2. Draw the triangle (front part)
        this.ctx.beginPath();
        this.ctx.moveTo(0, pointYOffset); // Tip of the teardrop (forward)
        this.ctx.lineTo(triangleBaseWidth / 2, circleCenterYOffset - circleRadius * 0.3); // Connect to side of circle
        this.ctx.lineTo(-triangleBaseWidth / 2, circleCenterYOffset - circleRadius * 0.3); // Connect to other side
        this.ctx.closePath();
        this.ctx.fill(); // Fill with the same color

        this.ctx.restore();

        // Optional: A static dot at the absolute center of the radar (where the player is)
        // This helps anchor the rotating teardrop.
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 1.5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }

    drawMartianDot(x, y) {
        if (!this.ctx) return;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.martianDotRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.martianColor;
        this.ctx.fill();
    }

    drawGhastMarker(x, y) {
        if (!this.ctx) return;
        const size = this.ghastMarkerSize;
        this.ctx.fillStyle = this.ghastColor;
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }

    drawEdgeIndicator(angle, color) {
        if (!this.ctx) return;
        const effectiveAngle = angle;

        const edgeX = this.centerX + Math.cos(effectiveAngle) * this.radarCircleRadius;
        const edgeY = this.centerY + Math.sin(effectiveAngle) * this.radarCircleRadius;
        const size = this.edgeMarkerSize;

        this.ctx.save();
        this.ctx.translate(edgeX, edgeY);
        this.ctx.rotate(effectiveAngle + Math.PI / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * 0.66);
        this.ctx.lineTo(size * 0.5, size * 0.33);
        this.ctx.lineTo(-size * 0.5, size * 0.33);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.restore();
    }

    drawBackgroundAndRing() {
        if (!this.ctx) return;
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radarCircleRadius, 0, Math.PI * 2);
        this.ctx.fill();

        if (this.showRangeRing) {
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radarCircleRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.rangeRingColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawWorldEdges(playerPos, viewRotationAngle) {
        if (!this.ctx || !this.worldExtents) return;

        const { minX, maxX, minZ, maxZ } = this.worldExtents;
        const worldCorners = [
            { x: minX, z: minZ }, { x: maxX, z: minZ },
            { x: maxX, z: maxZ }, { x: minX, z: maxZ },
        ];

        const canvasCorners = [];
        const cosView = Math.cos(viewRotationAngle);
        const sinView = Math.sin(viewRotationAngle);

        for (const corner of worldCorners) {
            const relX = corner.x - playerPos.x;
            const relZ = corner.z - playerPos.z;
            const rotatedX = relX * cosView - relZ * sinView;
            const rotatedZ = relX * sinView + relZ * cosView;
            canvasCorners.push({
                x: this.centerX + rotatedX * this.scale,
                y: this.centerY - rotatedZ * this.scale
            });
        }

        this.ctx.beginPath();
        this.ctx.moveTo(canvasCorners[0].x, canvasCorners[0].y);
        for (let i = 1; i < canvasCorners.length; i++) this.ctx.lineTo(canvasCorners[i].x, canvasCorners[i].y);
        this.ctx.closePath();
        this.ctx.strokeStyle = this.worldEdgeColor;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    // --- Main Update Method (DIAGNOSTIC VERSION) ---
    update(player, entities, playerWorldYaw) {
        if (!this.ctx || !this.isVisible || !player || !player.position) {
            return;
        }

        const useEgocentricRadarRotation = false; // <<<< KEEPING IN DIAGNOSTIC MODE

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackgroundAndRing();

        const viewRotationAngle = useEgocentricRadarRotation ? -playerWorldYaw : 0;

        if (this.worldExtents) {
            this.drawWorldEdges(player.position, viewRotationAngle);
        }

        if (useEgocentricRadarRotation) {
            this.drawPlayerMarker(0); // Static teardrop (points "up" on radar)
        } else {
            this.drawPlayerMarker(-playerWorldYaw + Math.PI); // Teardrop icon rotates with player on static map
        }

        const playerPos = player.position;
        const cosView = Math.cos(viewRotationAngle);
        const sinView = Math.sin(viewRotationAngle);

        for (const entity of entities) {
            if (!entity || !entity.position) continue;

            _vector2D.set(entity.position.x - playerPos.x, entity.position.z - playerPos.z);
            const distance = _vector2D.length();
            if (distance < 0.1) continue;

            let entityColor = 'gray';
            let isGhast = entity instanceof Ghast;
            let isMartian = entity instanceof Martian;
            if (isMartian) entityColor = this.martianColor;
            else if (isGhast) entityColor = this.ghastColor;

            const rotatedX = _vector2D.x * cosView - _vector2D.y * sinView;
            const rotatedZ = _vector2D.x * sinView + _vector2D.y * cosView;

            if (distance <= this.range) {
                _tempCanvasPos.set(
                    this.centerX + rotatedX * this.scale,
                    this.centerY - rotatedZ * this.scale
                );
                if (isMartian) this.drawMartianDot(_tempCanvasPos.x, _tempCanvasPos.y);
                else if (isGhast) this.drawGhastMarker(_tempCanvasPos.x, _tempCanvasPos.y);
                else { /* fallback */ }
            } else if (distance <= this.edgeIndicatorRange) {
                const angleOnRadar = Math.atan2(-rotatedZ, rotatedX);
                this.drawEdgeIndicator(angleOnRadar, entityColor);
            }
        }
    }
}
// --- END OF FILE RadarDisplay.js ---