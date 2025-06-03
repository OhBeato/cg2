import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import * as Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let scene, renderer;
let controls;

let camPersp;
let activeCamera;

const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 100;

const keysHeld = Object.create(null);

//Texture vars
const test_loader = new THREE.TextureLoader();
const test_texture = test_loader.load('/textures/wall.jpg');
test_texture.colorSpace = THREE.SRGBColorSpace;

//Material vars
let materials_in_scene = [];
const m1 = new THREE.MeshBasicMaterial({color: 0xff0000});
const m2 = new THREE.MeshPhongMaterial({color: 0xff0000, flatShading: false});
const m3 = new THREE.MeshPhongMaterial({color: 0x000fff, flatShading: false});

const m1_test_texture = new THREE.MeshLambertMaterial({color:0xffffff, displacementMap: test_texture, displacementScale: 10, map:test_texture});

//Object vars
let plane_ground;
let test_cube, test_sphere;

let terrain;
let sky_dome;

//Light vars
let ambient_light, hemisphere_light, directional_light, point_light, spot_light;

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    scene = new THREE.Scene();
    //scene.add(new THREE.AxesHelper(10));
    scene.background = new THREE.Color(0x0); 

    /*const size = 100;
    const divisions = 100;
    const gridHelper = new THREE.GridHelper(size, divisions);
    scene.add(gridHelper);

    const gridHelper2 = new THREE.GridHelper(size, divisions);
    gridHelper2.rotation.x = Math.PI / 2;
    scene.add(gridHelper2);

    const gridHelper3 = new THREE.GridHelper(size, divisions);
    gridHelper3.rotation.x = Math.PI / 2;
    gridHelper3.rotation.z = Math.PI / 2;
    scene.add(gridHelper3);*/
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createcamPersp() {
    camPersp = new THREE.PerspectiveCamera(70, aspect, 1, 1000);
    camPersp.position.set(40, 40, 40);
    camPersp.lookAt(scene.position);
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////
function createAmbientLight(c, inten){
    const color = c;
    const intensity = inten;
    const light = new THREE.AmbientLight(color, intensity);
    return light;
}

function createHemisphereLight(sky, ground, inten){
    const skycolor = sky;
    const groundcolor = ground;
    const intensity = inten;
    const light = new THREE.HemisphereLight(skycolor, groundcolor, intensity);
    return light;
}

function createDirectionalLight(c, inten){
    const light = new THREE.DirectionalLight(c, inten);
    return light;
}

function createPointLight(c, inten){
    const light = new THREE.PointLight(c, inten);
    return light;
}

function createSpotLight(c, inten){
    const light = new THREE.SpotLight(c, inten);
    return light;
}

/////////////////////////////
/* PROCEDURAL TEXTURE FIELD*/
/////////////////////////////
function generateFlowerFieldTexture(width, height){
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fundo verde-claro
    ctx.fillStyle = '#a8d5a2';
    ctx.fillRect(0, 0, width, height);

    // Cores possíveis das flores
    const flowerColors = ['white', 'yellow', 'violet', 'lightblue'];

    // Desenha 500 flores (pequenos círculos)
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 2 + 1; // raio entre 1 e 3 px
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Cria a textura
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function generateHeightMapMaterial(fieldTexture, heightMapTexture_path, displace_multiplier){
    const test_loader = new THREE.TextureLoader();
    const texture = test_loader.load(heightMapTexture_path);
    texture.colorSpace = THREE.SRGBColorSpace;
    const heightmapMaterial = new THREE.MeshLambertMaterial({map:fieldTexture, displacementMap:texture, displacementScale:displace_multiplier});
    return heightmapMaterial;
}

function generateTerrainField(){
    const flowerFieldTexture = generateFlowerFieldTexture(2048, 2048);
    const terrainMaterial = generateHeightMapMaterial(flowerFieldTexture, '/textures/wall.jpg', 10);

    const terrain_res = createPlane(800, 800, 20, 20, terrainMaterial);
    terrain_res.rotateX(-Math.PI /2);
    return terrain_res;
}

/////////////////////////////
/* PROCEDURAL TEXTURE SKY  */
/////////////////////////////
function generateSkyTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Gradiente vertical: azul escuro -> violeta escuro
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#000033'); // topo: azul escuro
  gradient.addColorStop(1, '#330033'); // base: violeta escuro
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Adiciona centenas de estrelas brancas (círculos pequenos)
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * width;
    const bias = Math.pow(Math.random(), 1.5); // bias toward bottom (closer to 0)
    const y = bias * height;
    const radius = Math.sin(y /height * Math.PI/2);
    const alpha = Math.random() * 0.5 + 0.5; // brilho variado

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  // Cria a textura a partir do canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function generateSkyDome(){
    const skyTexture = generateSkyTexture(2048, 2048);
    const skyMaterial = new THREE.MeshBasicMaterial({map:skyTexture, side:THREE.BackSide});

    const skydome_res = createDome(300, 30, 30, skyMaterial);
    return skydome_res;
}


////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createPlane(width, height, wSegments, hSegments, mat){
    const geometry = new THREE.PlaneGeometry(width, height, wSegments, hSegments);
    const material = mat;
    const primitive_plane = new THREE.Mesh(geometry, material);
    return primitive_plane;
}

function createCube(width, height, depth, mat){
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = mat;
    const primitive_cube = new THREE.Mesh(geometry, material);
    
    return primitive_cube;
}

function createSphere(r, wSegments, hSegments, mat){
    const geometry = new THREE.SphereGeometry(r, wSegments, hSegments);
    const material = mat;
    const primitive_sphere = new THREE.Mesh(geometry, material);
    return primitive_sphere;
}

function createDome(r, wSegments, hSegments, mat){
    const geometry = new THREE.SphereGeometry(r, wSegments, hSegments ,0, 2*Math.PI, 0, Math.PI/2);
    const material = mat;
    const primitive_dome = new THREE.Mesh(geometry, material);
    return primitive_dome;
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {}

////////////
/* UPDATE */
////////////
function update() {

    controls.update();
}

/////////////
/* DISPLAY */
/////////////
function render() {
    renderer.render(scene, activeCamera);
}


function initObjects(){
    //initiliaze objects
    terrain = generateTerrainField();
    scene.add(terrain);

    sky_dome = generateSkyDome();
    scene.add(sky_dome);


    test_cube = createCube(10, 10, 10, m3);
    test_cube.position.set(10, 25, -30);
    scene.add(test_cube);

    test_sphere = createSphere(5, 20, 20, m1);
    test_sphere.position.set(-30, 10, 0);
    scene.add(test_sphere);

    //ambient_light = createAmbientLight(0xffffff, 2);
    //scene.add(ambient_light);
    
    //hemisphere_light = createHemisphereLight(0xB1E1FF, 0xB97A20, 6);
    //scene.add(hemisphere_light);

    directional_light = createDirectionalLight(0xffffff, 1.5);
    directional_light.position.set(0,10,0);
    directional_light.target.position.set(5,0,-5);

    scene.add(directional_light);
    scene.add(directional_light.target);

    point_light = createPointLight(0xB97A20, 800);
    point_light.position.set(10,15,-30);
    scene.add(point_light);

    spot_light = createSpotLight(0xB97A20, 800);
    spot_light.position.set(0, 20, 10);
    spot_light.target.position.set(-10,0, 20);
    scene.add(spot_light);
    scene.add(spot_light.target);


    const helperDir = new THREE.DirectionalLightHelper(directional_light);
    scene.add(helperDir);

    const helperPoi = new THREE.PointLightHelper(point_light);
    scene.add(helperPoi);

    const helperSpot = new THREE.SpotLightHelper(spot_light);
    scene.add(helperSpot);
    
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {

    //initialize scene and camera
    createScene();
    createcamPersp();

    //initialize renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add OrbitControls
    controls = new OrbitControls(camPersp, renderer.domElement);
    controls.target.set(0, 0, 0);  // Point camera toward the origin
    
    //initialize camera
    activeCamera = camPersp;

    initObjects();
    

    //event listenners
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup',   onKeyUp,   false);
    window.addEventListener('resize',  onResize,  false);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
    requestAnimationFrame(animate);
    update();
    render();
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
  
    const newAspect = w / h;

    [camFront, camSide, camTop].forEach(cam => {
      cam.left   =  frustumSize * newAspect / -2;
      cam.right  =  frustumSize * newAspect /  2;
      cam.top    =  frustumSize / 2;
      cam.bottom = -frustumSize / 2;
      cam.updateProjectionMatrix();
    });
  
    camPersp.aspect = newAspect;
    camPersp.updateProjectionMatrix();
}
///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
    
    keysHeld[e.key] = true;

    switch (e.key) {
        case '1': 
            if(terrain){
                if(terrain.material)
                    terrain.material.dispose();
                const flowerFieldTexture = generateFlowerFieldTexture(2048, 2048);
                const terrainMaterial = generateHeightMapMaterial(flowerFieldTexture, '/textures/wall.jpg', 10);

                terrain.material = terrainMaterial;
                sky_dome.material.needsUpdate = true;
            }
            break;
        case '2': 
            if(sky_dome){
                if(sky_dome.material)
                    sky_dome.material.dispose();
                const skyTexture = generateSkyTexture(2048, 2048);

                sky_dome.material.map = skyTexture;
                sky_dome.material.needsUpdate = true;
            }
            break;
        case '7': activeCamera = camPersp; controls.target.set(0, 0, 0); break;
      
        default: break;
    }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
    keysHeld[e.key] = false;

}

init();
animate();