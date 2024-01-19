import { Line, Point, Vector, abs, cos, getCrossProduct, getIntersectionFromLineAndPlane, getPlaneFromVectorAndPoint, sin, sqrt } from "./math.js";
import { Edge, Face, Vertex } from "./shape.js";

const CAMERA_W = 3.2;
const CAMERA_H = 1.8;

const expandingRatio = 64;

const CAN_W = CAMERA_W * expandingRatio;
const CAN_H = CAMERA_H * expandingRatio;

const can = document.getElementById("canvas");
can.width = CAN_W;
can.height = CAN_H;
can.style.background = "#888";

const con = can.getContext("2d");

const can2 = document.getElementById("canvas2");
const con2 = can2.getContext("2d");


const key = {};
document.onkeydown = e => {
    key[e.key] = true;
    // console.log(e.key);
}
document.onkeyup = e => {
    key[e.key] = false;
}


function drawCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#000";
    ctx.fill();
}

function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.lineWIdth = 1;
    ctx.strokeStyle = "#000";
    ctx.stroke();
}


/**
 * カメラのクラス
 */
class Camera {
    /**
     * コンストラクタ
     * @param {Point} pos カメラの位置
     * @param {number} rx x軸回転の角度
     * @param {number} rz z軸回転の角度
     * @param {number} focalLength 焦点距離
     * @param {number} width カメラの横幅
     * @param {number} height カメラの縦幅
     */
    constructor(pos, rx, rz, focalLength, width, height) {
        this.pos = pos;
        this.rx = rx;
        this.rz = rz;
        this.focalLength = focalLength;
        this.width = width;
        this.height = height;

        this.update();
    }


    updateNormalVector() {
        this.normalVector = new Vector(0, this.focalLength, 0);
        this.normalVector.rotate(this.rx, this.rz);
    }

    updateFocusPoint() {
        this.focus = new Point(
            this.pos.x - this.normalVector.x,
            this.pos.y - this.normalVector.y,
            this.pos.z - this.normalVector.z,
        );
    }


    updatePlane() {
        this.plane = getPlaneFromVectorAndPoint(this.normalVector, this.pos);
    }

    updateCornerVectors() {
        this.cornerVectors = {
            topLeft: new Vector(-this.width / 2, 0, this.height / 2),
            topRight: new Vector(this.width / 2, 0, this.height / 2),
            bottomLeft: new Vector(-this.width / 2, 0, -this.height / 2),
            bottomRight: new Vector(this.width / 2, 0, -this.height / 2),
        }
        this.cornerVectors.topLeft.rotate(this.rx, this.rz);
        this.cornerVectors.topRight.rotate(this.rx, this.rz);
        this.cornerVectors.bottomLeft.rotate(this.rx, this.rz);
        this.cornerVectors.bottomRight.rotate(this.rx, this.rz);
        // console.log(this.cornerVectors.topLeft);
    }

    updateCornerPoints() {
        this.cornerPoints = {
            topLeft: this.pos.getClone(),
            topRight: this.pos.getClone(),
            bottomLeft: this.pos.getClone(),
            bottomRight: this.pos.getClone(),
        }
        this.cornerPoints.topLeft.move(this.cornerVectors.topLeft);
        this.cornerPoints.topRight.move(this.cornerVectors.topRight);
        this.cornerPoints.bottomLeft.move(this.cornerVectors.bottomLeft);
        this.cornerPoints.bottomRight.move(this.cornerVectors.bottomRight);
    }


    importShapes() {
        this.importedVertexes = vertexesList.map(vertex => vertex.getClone());
        this.importedEdges = edges.map(edge => edge.getClone());
    }


    /**
     * 点をカメラ平面に投影
     * @param {Vertex} vertex ポイント
     * @returns {Vertex} カメラ平面上の点
     */
    getProjectedVertex(vertex) {
        const rayVector = new Vector(this.focus.x - vertex.x, this.focus.y - vertex.y, this.focus.z - vertex.z);
        const rayLine = new Line(this.focus, rayVector);
        const intersection = getIntersectionFromLineAndPlane(rayLine, this.plane);

        return new Vertex(intersection.x, intersection.y, intersection.z, vertex.i);
    }

    getProjectedVertex2(vertex) {
        /*
        点と平面の距離を求める方程式
        平面 ax + by + cz + d = 0
        点 (x0, y0, z0)
        距離 |ax0 + by0 + cz0 + d| / √(a^2 + b^2 + c^2)
        */

        const { a, b, c, d } = this.plane;
        const { x: x0, y: y0, z: z0 } = vertex;

        const lengthFromPointToPlane = abs(a * x0 + b * y0 + c * z0 + d) / sqrt(a ** 2 + b ** 2 + c ** 2);
        const ratio = this.normalVector.length / (this.normalVector.length + lengthFromPointToPlane);
        const vectorFromFocusToVertex = new Vector(
            vertex.x - this.focus.x,
            vertex.y - this.focus.y,
            vertex.z - this.focus.z,
        );
        // const vectorFromFocusToProjectedVertex = vectorFromFocusToVertex.multiplication(ratio);
        vectorFromFocusToVertex.multiplication(ratio);
        const projectedVertex = new Vertex(
            this.focus.x + vectorFromFocusToVertex.x,
            this.focus.y + vectorFromFocusToVertex.y,
            this.focus.z + vectorFromFocusToVertex.z,
            vertex.i
        );

        return projectedVertex;
    }


    /**
     * カメラ平面の点の座標変換をするメソッド
     * @param {Vertex} vertex 変換前の座標
     * @returns {Vertex} 座標変換後の座標
     */
    getConvertedVertex(vertex) {
        const vectorFromCamPos = new Vector(vertex.x - this.pos.x, vertex.y - this.pos.y, vertex.z - this.pos.z);

        /*
        X = xcosθ - ysinθ
        Y = xsinθ + ycosθ

        Y = ycosθ - zsinθ
        Z = ysinθ + zcosθ
        */

        const { x, y, z } = vectorFromCamPos;

        const sinRZ = sin(this.rz);
        const cosRZ = cos(this.rz);
        const sinRX = sin(-this.rx);
        const cosRX = cos(-this.rx);

        const x1 = cosRZ * x - sinRZ * y;
        const y1 = sinRZ * x + cosRZ * y;
        const z1 = z;

        const x2 = x1;
        const y2 = cosRX * y1 - sinRX * z1;
        const z2 = sinRX * y1 + cosRX * z1;

        const x3 = x2 + this.pos.x;
        const y3 = y2 + this.pos.y;
        const z3 = z2 + this.pos.z;

        return new Vertex(x3, y3, z3, vertex.i);
    }


    getOnScreenVertex(vertex) {
        const projectedVertex = this.getProjectedVertex(vertex);
        const convertedVertex = this.getConvertedVertex(projectedVertex);
        return convertedVertex;
    }


    /**
     * 座標変換した頂点の描画位置を取得するメソッド
     * @param {Vertex} convertedVertex 座標変換済みの頂点
     * @returns {Object} x,y座標のみ
     */
    getToDrawVertex(convertedVertex) {
        const x = (convertedVertex.x - this.pos.x) * expandingRatio + CAN_W / 2;
        const y = (convertedVertex.z - this.pos.z) * -expandingRatio + CAN_H / 2;
        return { x, y };
    }


    draw() {
        const toDrawVertexes = [];
        for (const vertex of this.importedVertexes) {
            if (this.plane.isPointInFrontOf(vertex) === false) continue;
            const onScreenVertex1 = this.getOnScreenVertex(vertex);

            const toDrawVertex = this.getToDrawVertex(onScreenVertex1);
            toDrawVertexes[vertex.i] = toDrawVertex;

            const dx = toDrawVertex.x;
            const dy = toDrawVertex.y;

            drawCircle(con, dx, dy, 2.5);
            con.fillStyle = "#fff";
            con.fillText(onScreenVertex1.i, dx, dy);
        }

        for (const edge of this.importedEdges) {
            edge.setVertexInFrontOfCamera(this.plane);
            if (!this.plane.isPointInFrontOf(edge.vertex1) && !this.plane.isPointInFrontOf(edge.vertex2)) continue;
            const vertex1 = edge.vertex1.getClone();
            const vertex2 = edge.vertex2.getClone();

            const onScreenVertex1 = this.getOnScreenVertex(vertex1);
            const onScreenVertex2 = this.getOnScreenVertex(vertex2);

            const toDrawVertex1 = this.getToDrawVertex(onScreenVertex1);
            const toDrawVertex2 = this.getToDrawVertex(onScreenVertex2);

            const dx1 = toDrawVertex1.x;
            const dy1 = toDrawVertex1.y;
            const dx2 = toDrawVertex2.x;
            const dy2 = toDrawVertex2.y;

            drawLine(con, dx1, dy1, dx2, dy2);
        }


        // can2ExpandingRatio
        const can2ER = 10;
        // can2Half
        const can2Half = can2.width / 2;

        const pdx = this.pos.x * can2ER + can2Half;
        const pdy = this.pos.y * -can2ER + can2Half;
        drawCircle(con2, pdx, pdy, 3);

        const fdx = this.focus.x * can2ER + can2Half;
        const fdy = this.focus.y * -can2ER + can2Half;
        drawCircle(con2, fdx, fdy, 2)
        // drawLine(con2, this.pos)

        for (const vertex of vertexesList) {
            const dx = vertex.x * can2ER + can2Half;
            const dy = vertex.y * -can2ER + can2Half;
            drawCircle(con2, dx, dy, 2.5);
        }

        for (const edge of edges) {
            const dx1 = edge.vertex1.x * can2ER + can2Half;
            const dy1 = edge.vertex1.y * -can2ER + can2Half;
            const dx2 = edge.vertex2.x * can2ER + can2Half;
            const dy2 = edge.vertex2.y * -can2ER + can2Half;
            drawLine(con2, dx1, dy1, dx2, dy2);
        }

        // console.log(this.cornerPoints.topLeft);
    }


    move() {
        const v = 0.1;
        if (key["a"]) {
            this.pos.x -= cos(this.rz) * v;
            this.pos.y += sin(this.rz) * v;
        }
        if (key["d"]) {
            this.pos.x += cos(this.rz) * v;
            this.pos.y -= sin(this.rz) * v
        }
        if (key["w"]) {
            this.pos.x += sin(this.rz) * v;
            this.pos.y += cos(this.rz) * v;
        }
        if (key["s"]) {
            this.pos.x -= sin(this.rz) * v;
            this.pos.y -= cos(this.rz) * v;
        }

        if (key[" "]) this.pos.z += v;
        if (key["Shift"]) this.pos.z -= v;

        const rv = 2;
        if (key["ArrowLeft"]) this.rz -= rv;
        if (key["ArrowRight"]) this.rz += rv;
        if (key["ArrowUp"]) this.rx += rv;
        if (key["ArrowDown"]) this.rx -= rv;
    }


    update() {
        this.move();
        this.updateNormalVector();
        this.updateCornerVectors();
        this.updateCornerPoints();
        this.updateFocusPoint();
        this.updatePlane();
        this.importShapes();
        this.draw();
    }
}


const vertexesList = [
    new Vertex(0, 3, 0),
    new Vertex(1, 2, 1),
    new Vertex(1, 2, -1),
    new Vertex(-1, 2, -1),
    new Vertex(-1, 2, 1),
    new Vertex(1, 4, 1),
    new Vertex(1, 4, -1),
    new Vertex(-1, 4, -1),
    new Vertex(-1, 4, 1),
];

// for (let i = 0; i < 10; i++) {
//     for (let j = 0; j < 10; j++) {
//         for (let k = 0; k < 1; k++) {
//             vertexesList.push(new Vertex(i, j, k));
//         }
//     }
// }

for (let i = 0; i < vertexesList.length; i++) {
    vertexesList[i].i = i;
}


const edgeIndexesList = [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 5],
    [1, 5],
    [2, 6],
    [3, 7],
    [4, 8],
];
// for (let i = 19; i < 109; i++) {
//     edgeIndexesList.push([9, i]);
// }

const edges = [];
for (const v of edgeIndexesList) {
    const v1 = v[0];
    const v2 = v[1];
    edges.push(new Edge(vertexesList[v1], vertexesList[v2]));
}
console.log(edges);
console.log(getCrossProduct(edges[0].vector, edges[1].vector));
console.log(getCrossProduct(edges[1].vector, edges[0].vector));


const faceIndexesList = [
    [1, 2, 3],
    [1, 5, 6],
    [6, 7, 8],
    [3, 4, 5],
    [1, 4, 5],
    [3, 6, 7],
];

const faces = [];
for (const v of faceIndexesList) {
    const v1 = v[0];
    const v2 = v[1];
    const v3 = v[2];
    faces.push(new Face(vertexesList[v1], vertexesList[v2], vertexesList[v3],));
}


const camera = new Camera(new Point(0, -1, 0), 0, 0, 3, CAMERA_W, CAMERA_H);

console.log(camera);

function mainLoop() {
    const st = performance.now();

    con.clearRect(0, 0, CAN_W, CAN_H);
    con2.clearRect(0, 0, 100, 100);

    camera.update();

    const et = performance.now();
    con.fillStyle = "#fff";
    con.fillText(`${((et - st) * 100 | 0) / 100}ms`, 10, 10);
}

// mainLoop();

setInterval(mainLoop, 1000 / 60);