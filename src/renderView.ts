/**
 * Three.jsのcanvasの実装
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

let scene: THREE.Scene | null = null;
let currentGLB: any;
let camera: THREE.PerspectiveCamera | null = null;

export function renderView() {
    // サイズを指定
    const width = window.innerWidth;
    const height = window.innerHeight;

    // レンダラーを作成
    const canvasElement = document.querySelector(
        "#myCanvas"
    ) as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // シーンを作成
    scene = new THREE.Scene();

    new RGBELoader()
        .setPath('hdr/')
        .load('lilienstein_4k.hdr', function (texture) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene!!.background = texture;
            scene!!.environment = texture;

        });


    // カメラを作成
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    // カメラの初期座標を設定
    camera.position.set(0, 0, 2);

    // カメラコントローラーを作成
    const controls = new OrbitControls(camera, canvasElement);
    controls.target.set(0, 0, 0);
    controls.update();

    // 平行光源を作成
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    // 環境光を追加
    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);



    tick();

    // 毎フレーム時に実行されるループイベントです
    function tick() {
        // レンダリング
        renderer.render(scene!!, camera!!);
        requestAnimationFrame(tick);
    }
}

export function loadGLB(objectUrl: string) {
    if (currentGLB) {
        scene!!.remove(currentGLB);
    }
    // GLTF形式のモデルデータを読み込む
    const loader = new GLTFLoader();
    // GLTFファイルのパスを指定
    loader.load(objectUrl, (gltf) => {
        // 読み込み後に3D空間に追加
        const model = gltf.scene;
        currentGLB = model;

        currentGLB.updateMatrixWorld();

        const box = new THREE.Box3().setFromObject(currentGLB);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());

        currentGLB.position.x += (currentGLB.position.x - center.x) / 2;
        currentGLB.position.y += (currentGLB.position.y - center.y) / 2;
        currentGLB.position.z += (currentGLB.position.z - center.z) / 2;

        const modelScale = 1 / size;

        camera!!.updateProjectionMatrix();

        currentGLB.scale.set(modelScale, modelScale, modelScale);

        scene!!.add(currentGLB);
    });
}