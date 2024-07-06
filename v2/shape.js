import { Color, Line, Plane, Point, Vector, getCrossProduct, getInnerProduct, getIntersectionFromLineAndPlane, getLengthFrom2Points, getPlaneFromVectorAndPoint, getSTFrom3Vectors, getVectorFrom2Points } from "./math.js";


/**
 * 頂点のクラス
 */
export class Vertex {
    /**
     * コンストラクタ
     * @param {number} x 座標
     * @param {number} y 座標
     * @param {number} z 座標
     * @param {number} i 番号
     */
    constructor(x, y, z, i) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.i = i;
        this.point = new Point(x, y, z);
    }

    getClone() {
        return new Vertex(this.x, this.y, this.z, this.i);
    }

    /**
     * 頂点をベクトルに従って動かすメソッド
     * 自身の要素を変更し、更に新しいVertexクラスを返す
     * @param {Vector} vector 移動ベクトル
     * @returns {Vertex}
     */
    move(vector) {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
        this.point.move(vector);

        return this.getClone();
    }
}



/**
 * 辺のクラス
 */
export class Edge {
    /**
     * コンストラクタ
     * @param {Vertex} vertex1 
     * @param {Vertex} vertex2 
     */
    constructor(vertex1, vertex2) {
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
        this.vector = getVectorFrom2Points(vertex1.point, vertex2.point);
        this.line = new Line(vertex1.point, this.vector);
    }

    getClone() {
        return new Edge(this.vertex1.getClone(), this.vertex2.getClone());
    }

    /**
     * 点が辺の範囲内にあるかどうか
     * @param {Point} point 
     * @returns {boolean}
     */
    isPointInRange(point) {
        return (
            Math.min(this.vertex1.x, this.vertex2.x) <= point.x &&
            Math.max(this.vertex1.x, this.vertex2.x) >= point.x &&
            Math.min(this.vertex1.y, this.vertex2.y) <= point.y &&
            Math.max(this.vertex1.y, this.vertex2.y) >= point.y &&
            Math.min(this.vertex1.z, this.vertex2.z) <= point.z &&
            Math.max(this.vertex1.z, this.vertex2.z) >= point.z
        );
    }

    /**
     * 辺と平面の交点が辺上にあるかチェックするメソッド
     * @param {Plane} plane 
     * @returns {Point|null} 交点があれば交点を返し、なければnullを返す
     */
    getIntersectionWithPlane(plane) {
        const intersection = getIntersectionFromLineAndPlane(this.line, plane);
        if (this.isPointInRange(intersection)) {
            return intersection;
        }
        else return null;
    }

    /**
     * 辺が(カメラ)平面と交差しているとき平面の後ろの頂点を平面上に移動するメソッド
     * @param {Plane} plane
     * @returns {Edge}
     */
    setVertexInFrontOfCamera(plane) {
        const intersection = this.getIntersectionWithPlane(plane);
        if (intersection !== null) {
            if (plane.isPointInFrontOf(this.vertex1.point)) {
                // 交点が面の裏だと判断されてしまうことがあるので補正
                const fixVector = this.vector.changeLength(-0.0001);
                intersection.move(fixVector);
                this.vertex2 = new Vertex(intersection.x, intersection.y, intersection.z, this.vertex2.i);
            }
            else {
                const fixVector = this.vector.changeLength(0.0001);
                intersection.move(fixVector);
                this.vertex1 = new Vertex(intersection.x, intersection.y, intersection.z, this.vertex1.i);
            }
        }
        return new Edge(this.vertex1, this.vertex2);
    }
}



/**
 * 半直線のクラス
 */
export class HalfLine extends Line {
    /**
     * コンストラクタ
     * @param {Point} point 端の点
     * @param {Vector} vector 
     */
    constructor(point, vector) {
        super(point, vector);
        this.line = new Line(this.point, this.vector);
    }

    getClone() {
        return new HalfLine(this.point, this.vector);
    }

    /**
     * 点が半直線の範囲内にあるかどうか
     * @param {Point} point 
     * @returns {boolean}
     */
    isPointInRange(point) {
        return (
            Math.sign(this.vector.x) === Math.sign(point.x - this.point.x) &&
            Math.sign(this.vector.y) === Math.sign(point.y - this.point.y) &&
            Math.sign(this.vector.z) === Math.sign(point.z - this.point.z)
        );
    }

    /**
     * 半直線と平面の交点が辺上にあるかチェックするメソッド
     * @param {Plane} plane 
     * @returns {Point|null} 交点があれば交点を返し、なければnullを返す
     */
    getIntersectionWithPlane(plane) {
        const intersection = getIntersectionFromLineAndPlane(this.line, plane);
        if (this.isPointInRange(intersection)) {
            return intersection;
        }
        else return null;
    }

}



/**
 * 面のクラス
 */
export class Face {
    /**
     * コンストラクタ
     * @param {Vertex} vertex1 
     * @param {Vertex} vertex2 
     * @param {Vertex} vertex3 
     * @param {Color} color 
     * @param {number} roughness 
     */
    constructor(vertex1, vertex2, vertex3, color, roughness) {
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
        this.vertex3 = vertex3;

        this.color = color;
        this.roughness = roughness;

        this.vector1 = getVectorFrom2Points(this.vertex1.point, this.vertex2.point);
        this.vector2 = getVectorFrom2Points(this.vertex1.point, this.vertex3.point);

        this.normalVector = getCrossProduct(this.vector1, this.vector2);

        this.plane = getPlaneFromVectorAndPoint(this.normalVector, this.vertex1.point);
    }

    getClone() {
        return new Face(this.vertex1.getClone(), this.vertex2.getClone(), this.vertex3.getClone(), this.color);
    }

    /**
     * 頂点が面の中にあるかチェックするメソッド
     * 頂点が面を含む平面上にあることが条件
     * @param {Point} point 
     * @returns {boolean}
     */
    isPointOnFace(point) {
        const ST = getSTFrom3Vectors(getVectorFrom2Points(this.vertex1.point, point), this.vector1, this.vector2);

        const s = ST.s;
        const t = ST.t;

        return (s >= 0 && t >= 0 && s + t <= 1);
    }
}



/**
 * ライトのクラス
 */
export class Light {
    /**
     * コンストラクタ
     * @param {Point} pos 位置
     * @param {number} power 強さ
     * @param {number[]} color 色
     */
    constructor(pos, power, color) {
        this.pos = pos;
        this.power = power;
        this.color = color;
    }

    getClone() {
        return new Light(this.pos, this.power, this.color);
    }

    /**
     * 距離から明るさを取得
     * @param {number} length 
     * @returns {number}
     */
    getBrightness(length) {
        /**
         * ステロイドはやっぱだめ
         * 逆二乗からは程遠い
         * y = t^2 / (x + t)^2
         */

        const brightness = this.power ** 2 / (length + this.power) ** 2;
        return brightness;
    }

    /**
     * 点の明るさを取得
     * @param {Point} point 
     * @returns {number}
     */
    getBrightnessFromPoint(point) {
        const length = getLengthFrom2Points(this.pos, point);
        const brightness = this.getBrightness(length);
        return brightness;
    }
}



/**
 * 辺または半直線が面と交差しているかチェックする関数
 * @param {Edge|HalfLine} edgeOrHalfLine 
 * @param {Face} face 
 * @returns {Point|null}
 */
export function getIntersectionEdgeOrHalfLineAndFace(edgeOrHalfLine, face) {
    // 交点が辺or半直線上にあるかどうか
    const intersection = edgeOrHalfLine.getIntersectionWithPlane(face.plane);
    if (intersection) {
        // 交点が面上にあるかどうか
        if (face.isPointOnFace(intersection)) {
            return intersection;
        }
        else return null;
    }
    else return null;
}

/**
 * 辺または半直線との交点を面の配列から取得する
 * @param {Edge|HalfLine} edgeOrHalfLine 
 * @param {Face[]} faces 面の配列
 * @returns {{face: Face, intersection: Point, length: number}[]} vertex1から交点までの距離の昇順(小さい順)でソートされている
 */
export function getIntersectionsEdgeOrHalfLineAndFaces(edgeOrHalfLine, faces) {
    const returnsList = [];
    for (const face of faces) {
        const intersection = getIntersectionEdgeOrHalfLineAndFace(edgeOrHalfLine, face);
        // どの面とも交わらなければcontinue
        if (intersection === null) continue;
        let length;
        if (edgeOrHalfLine instanceof Edge) {
            length = getLengthFrom2Points(edgeOrHalfLine.vertex1.point, intersection);
        }
        else if (edgeOrHalfLine instanceof HalfLine) {
            length = getLengthFrom2Points(edgeOrHalfLine.point, intersection);
        }
        returnsList.push({ face, intersection, length });
    }
    // 交点までの距離をもとに昇順ソート
    returnsList.sort((a, b) => a.length - b.length);

    return returnsList;
}



/**
 * ポイントからとりあえず頂点を取得する関数
 * @param {Point} point 
 * @returns {Vertex}
 */
export function getVertexFromPoint(point) {
    return new Vertex(point.x, point.y, point.z);
}
/**
 * ポイントから辺を取得する関数
 * @param {Point} point1 
 * @param {Point} point2 
 * @returns {Edge}
 */
export function getEdgeFromPoints(point1, point2) {
    return new Edge(
        getVertexFromPoint(point1),
        getVertexFromPoint(point2),
    );
}
/**
 * ポイントから面を取得する関数
 * @param {Point} point1 
 * @param {Point} point2 
 * @param {Point} point3 
 * @returns {Face}
 */
export function getFaceFrom3Points(point1, point2, point3) {
    return new Face(
        getVertexFromPoint(point1),
        getVertexFromPoint(point2),
        getVertexFromPoint(point3),
    );
}