/**
 * Three.jsのcanvasの実装
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import Stats from 'three/examples/jsm/libs/stats.module';

let scene: THREE.Scene | null = null;
let currentGLB: any;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let model: THREE.Group<THREE.Object3DEventMap> | null = null;
let animations: THREE.AnimationClip[];
let mixer: THREE.AnimationMixer;
let action: THREE.AnimationAction;

export function renderView() {
    // サイズを指定
    const width = window.innerWidth;
    const height = window.innerHeight;

    // レンダラーを作成
    const canvasElement = document.querySelector(
        "#myCanvas"
    ) as HTMLCanvasElement;
    renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // シーンを作成
    scene = new THREE.Scene();

    loadHDR(null);

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

    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    const clock = new THREE.Clock();


    tick();

    // 画面のリサイズに合わせてキャンバスをリサイズ
    window.addEventListener('resize', onWindowResize, false);

    // 毎フレーム時に実行されるループイベントです
    function tick() {
        // fps情報
        stats.begin();
        stats.end();
        // レンダリング
        renderer!!.render(scene!!, camera!!);
        requestAnimationFrame(tick);

        // アニメーション
        if (mixer) {
            mixer.update(clock.getDelta());
        }
    }
}

function onWindowResize() {
    camera!!.aspect = window.innerWidth / window.innerHeight;
    camera!!.updateProjectionMatrix();

    renderer!!.setSize(window.innerWidth, window.innerHeight);
}

export function loadHDR(value: number | null) {
    let hdrPath = "";
    switch (value) {
        case 0:
            hdrPath = 'empty_workshop_4k.hdr';
            break;
        case 1:
            hdrPath = 'lilienstein_4k.hdr';
            break;
        default:
            hdrPath = 'empty_workshop_4k.hdr';
            break;
    }
    new RGBELoader()
        .setPath('hdr/')
        .load(hdrPath, function (texture) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene!!.background = texture;
            scene!!.environment = texture;
            texture.dispose();

        });
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
        model = gltf.scene;
        animations = gltf.animations;
        currentGLB = model;
        mixer = new THREE.AnimationMixer(currentGLB);

        // 画面に合わせて位置調整＆スケール
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

        const animations_element = document.getElementById("animations");
        animations_element!!.innerHTML = '<div><label><input type="radio" name="animations" value="-1" checked />初期状態</label></div >';
        if (animations && animations.length) {
            for (let index = 0; index < animations.length; index++) {
                animations_element!!.innerHTML += `<div><label><input type="radio" name="animations" value="${index}"/>${animations[index].name}</label></div >`;
            }
        }

        scene!!.add(currentGLB);
    });
}

export function loadAnimation(value: number) {
    if (action) {
        action.stop();
    }

    if (value == -1 || value >= animations.length) {
        return
    }


    //Animation Actionを生成
    action = mixer.clipAction(animations[value]);

    action.setLoop(THREE.LoopRepeat, Infinity);

    //アニメーションを再生
    action.play();
}