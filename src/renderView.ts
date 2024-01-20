/**
 * Three.jsの実装
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import Stats from 'three/examples/jsm/libs/stats.module';

let scene: THREE.Scene;
// GLB型がないのでany。より厳格に対応するなら型定義してもよさそう
let currentGLB: any;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let model: THREE.Group<THREE.Object3DEventMap>;
let animations: THREE.AnimationClip[];
let mixer: THREE.AnimationMixer;
let action: THREE.AnimationAction;
let stats: Stats;
let controls: OrbitControls;

// three.jsの描画領域の初回作成処理。後々必要なものはグローバル変数にしている
export function renderView() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvasElement = document.querySelector(
        "#myCanvas"
    ) as HTMLCanvasElement;
    renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    scene = new THREE.Scene();

    // HDR（背景）のロード（nullだと初期の背景になる）
    loadHDR(null);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 0, 2);

    controls = new OrbitControls(camera, canvasElement);
    resetCameraControlls()
    // カメラ制御をいい感じにする
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 平行光源
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    createStats()

    const clock = new THREE.Clock();

    tick();

    window.addEventListener('resize', onWindowResize, false);

    // ループ
    function tick() {
        // fps情報
        stats.begin();
        stats.end();

        controls.update();
        // レンダリング
        renderer!!.render(scene!!, camera!!);
        requestAnimationFrame(tick);

        // アニメーション
        if (mixer) {
            mixer.update(clock.getDelta());
        }
    }
}

// fps確認（なくてもいいけど一応作成）
function createStats() {
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
}

function resetCameraControlls() {
    // リサイズやモデルのリロードの際、モデルがどこかに行ってしまわないようにカメラ位置をリセットする。
    camera.position.set(0, 0, 2);
    controls.target.set(0, 0, 0);
}

function onWindowResize() {
    resetCameraControlls()
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

            // オブジェクトへの環境の映り込みを作るため、正距円筒図法屈折マッピングを行う
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
    const loader = new GLTFLoader();
    loader.load(objectUrl, (gltf) => {
        model = gltf.scene;
        animations = gltf.animations;
        currentGLB = model;
        mixer = new THREE.AnimationMixer(currentGLB);

        resetCameraControlls()
        reScaleGLTF()

        createAnimationSelector();

        scene!!.add(currentGLB);
    });
}

// 画面に合わせてモデルの位置調整＆スケール
function reScaleGLTF() {
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
}

// アニメーション選択ボタンの生成
function createAnimationSelector() {
    const animations_element = document.getElementById("animations");
    animations_element!!.innerHTML = '<div><label><input type="radio" name="animations" value="-1" checked />初期状態</label></div >';
    if (animations && animations.length) {
        for (let index = 0; index < animations.length; index++) {
            animations_element!!.innerHTML += `<div><label><input type="radio" name="animations" value="${index}"/>${animations[index].name}</label></div >`;
        }
    }
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