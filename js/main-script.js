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

//Colors
//UFO
const color_main = {color:0x5555f};
const color_cockpit = {color:0xf};
const color_bulb_light = {color:0x111f};
const color_base_cylinder = {color:0xeeef};

//Material vars
const materialVariants = new Map();
let meshes_in_scene = [];
let shadingMode = 0;
const m1 = new THREE.MeshBasicMaterial({color: 0xff0000});
const m2 = new THREE.MeshPhongMaterial({color: 0xff0000, flatShading: false});
const m3 = new THREE.MeshPhongMaterial({color: 0x000fff, flatShading: false});

const m1_test_texture = new THREE.MeshLambertMaterial({color:0xffffff, displacementMap: test_texture, displacementScale: 10, map:test_texture});

//Object vars
let plane_ground;
let test_cube, test_sphere;


let terrain;
let sky_dome;

let ufo, main, cockpit, bulb_group, base_cylinder;
let bulb1, bulb2, bulb3, bulb4, bulb5, bulb6, bulb7, bulb8;
let bulbs = [bulb1, bulb2, bulb3, bulb4, bulb5, bulb6, bulb7, bulb8];

//Light vars
let lightingEnabled = true;
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

//VR CAMERA
const stereoCamera = new THREE.StereoCamera();
stereoCamera.eyeSep = 0.064;

/////////////////////
/* MATERIALS UPDATE */
/////////////////////
function updateMaterials() {
  for (const [mesh, materials] of materialVariants.entries()) {
    mesh.material.dispose(); // remove old material
    mesh.material = materials[shadingMode];
    mesh.material.needsUpdate = true;
  }
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

function toggleLighting(enabled) {
    directional_light.visible = enabled;
    point_light.visible = enabled;
    spot_light.visible = enabled;

    updateMaterials(); // Reaplica material para forçar atualização
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


function generateLambertTerrainMaterial(fieldTexture, heightMapPath, displaceMultiplier) {
    const heightMap = new THREE.TextureLoader().load(heightMapPath);
    heightMap.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshLambertMaterial({
        map: fieldTexture,
        displacementMap: heightMap,
        displacementScale: displaceMultiplier
    });
}

function generatePhongTerrainMaterial(fieldTexture, heightMapPath, displaceMultiplier) {
    const heightMap = new THREE.TextureLoader().load(heightMapPath);
    heightMap.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshPhongMaterial({
        map: fieldTexture,
        displacementMap: heightMap,
        displacementScale: displaceMultiplier
    });
}

function generateToonTerrainMaterial(fieldTexture, heightMapPath, displaceMultiplier) {
    const heightMap = new THREE.TextureLoader().load(heightMapPath);
    heightMap.colorSpace = THREE.SRGBColorSpace;

    return new THREE.MeshToonMaterial({
        map: fieldTexture,
        displacementMap: heightMap,
        displacementScale: displaceMultiplier
    });
}


function generateTerrainField(){
    const flowerFieldTexture = generateFlowerFieldTexture(2048, 2048);
    const heightMapPath = '/textures/heightmap2.png';
    const displaceMultiplier = 40;

    const lambert = generateLambertTerrainMaterial(flowerFieldTexture, heightMapPath, displaceMultiplier);
    const phong   = generatePhongTerrainMaterial(flowerFieldTexture, heightMapPath, displaceMultiplier);
    const toon    = generateToonTerrainMaterial(flowerFieldTexture, heightMapPath, displaceMultiplier);

    const matList = [lambert, phong, toon];

    const terrainMesh = createPlane(700, 700, 50, 50, matList[shadingMode]);
    terrainMesh.rotateX(-Math.PI / 2);
    materialVariants.set(terrainMesh, matList);

    return terrainMesh;
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

    const lambert = new THREE.MeshLambertMaterial({map:skyTexture, side:THREE.BackSide});
    const phong   = new THREE.MeshPhongMaterial({map:skyTexture, side:THREE.BackSide});
    const toon    = new THREE.MeshToonMaterial({map:skyTexture, side:THREE.BackSide});

    const matList = [lambert, phong, toon];

    const skydome_res = createDome(300, 30, 30, skyMaterial);
    materialVariants.set(skydome_res, matList);
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

function createCylinder(r, height, rSegs, mat){
    const geometry = new THREE.CylinderGeometry(r,r,height, rSegs, height);
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

function createUFO(main_mat, cockpit_mat, bulb_mat, base_mat){
    ufo = new THREE.Group();

    main = createSphere(10, 32, 16, main_mat);
    main.scale.y = 0.2;
    ufo.add(main);

    cockpit = createDome(3, 32, 16, cockpit_mat);
    cockpit.position.y = 1;
    ufo.add(cockpit);

    base_cylinder = createCylinder(3, 1, 16, base_mat);
    base_cylinder.position.y = -2;
    ufo.add(base_cylinder);

    //bulbs creation
    bulb_group = new THREE.Group();
    for(let i = 0; i < 8; i++){
        const angle = i * (Math.PI * 2 / 8);
        const x = 5 * Math.cos(angle);
        const z = 5 * Math.sin(angle);

        bulbs[i] = createSphere(0.4, 8, 8, bulb_mat);
        bulbs[i].position.set(x, -1.8, z);
        bulb_group.add(bulbs[i]);
    }
    ufo.add(bulb_group);
    

}

function InitUFO(){
    const mainLambert = new THREE.MeshLambertMaterial(color_main); // light blue
    const mainPhong   = new THREE.MeshPhongMaterial(color_main);
    const mainToon    = new THREE.MeshToonMaterial(color_main);

    const cockpitLambert = new THREE.MeshLambertMaterial(color_cockpit); // cyan
    const cockpitPhong   = new THREE.MeshPhongMaterial(color_cockpit);
    const cockpitToon    = new THREE.MeshToonMaterial(color_cockpit);

    const bulbLambert = new THREE.MeshLambertMaterial(color_bulb_light); // cyan
    const bulbPhong   = new THREE.MeshPhongMaterial(color_bulb_light);
    const bulbToon    = new THREE.MeshToonMaterial(color_bulb_light);

    const baseLambert = new THREE.MeshLambertMaterial(color_base_cylinder); // cyan
    const basePhong   = new THREE.MeshPhongMaterial(color_base_cylinder);
    const baseToon    = new THREE.MeshToonMaterial(color_base_cylinder);

    const mainMatList = [mainLambert, mainPhong, mainToon];
    const cockpitMatList = [cockpitLambert, cockpitPhong, cockpitToon];
    const bulbMatList = [bulbLambert, bulbPhong, bulbToon];
    const baseMatList = [baseLambert, basePhong, baseToon];

    createUFO(mainMatList[shadingMode], cockpitMatList[shadingMode], bulbMatList[shadingMode], baseMatList[shadingMode]);

    materialVariants.set(main, mainMatList);
    materialVariants.set(cockpit, cockpitMatList);
    
    for(let i = 0; i<8; i++){
        materialVariants.set(bulbs[i], bulbMatList);
    }

    materialVariants.set(base_cylinder, baseMatList);
    
    
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
    //renderStereo();  //For test purposes when not in VR
    renderer.render(scene, activeCamera);
}

//VR DISPLAY
function renderStereo() {
    stereoCamera.update(camPersp);

    renderer.setScissorTest(true);

    // LEFT EYE
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(scene, stereoCamera.cameraL);

    // RIGHT EYE
    renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(scene, stereoCamera.cameraR);

    renderer.setScissorTest(false);
}

function initObjects(){
    //initiliaze objects
    terrain = generateTerrainField();
    scene.add(terrain);

    sky_dome = generateSkyDome();
    scene.add(sky_dome);

    InitUFO();
    ufo.position.set(0,30,0);
    scene.add(ufo);


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

    
    //Add all meshes materials to a set to be updated
    const cubeMaterials = [
    new THREE.MeshLambertMaterial({ color: 0x00ff00 }),  // Gouraud
    new THREE.MeshPhongMaterial({ color: 0x00ff00 }),    // Phong
    new THREE.MeshToonMaterial({ color: 0x00ff00 })      // Cartoon
    ];
    test_cube.material = cubeMaterials[0];
    materialVariants.set(test_cube, cubeMaterials);

    const sphereMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xff0000 }),
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
    new THREE.MeshToonMaterial({ color: 0xff0000 })
    ];
    test_sphere.material = sphereMaterials[0];
    materialVariants.set(test_sphere, sphereMaterials);
    ////

    //Initialize meshes materials mode
    shadingMode = 2;
    updateMaterials();

    //Light helpers
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

    renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(renderer));

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

function animateVR(){
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

                terrain.material.map = flowerFieldTexture;
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
        case 'q':
        case 'Q':
            shadingMode = 0; // Gouraud
            updateMaterials();
            break;

        case 'w':
        case 'W':
            shadingMode = 1; // Phong
            updateMaterials();
            break;

        case 'e':
        case 'E':
            shadingMode = 2; // Toon
            updateMaterials();
            break;

        case 'r':
        case 'R':
            lightingEnabled = !lightingEnabled;
            toggleLighting(lightingEnabled);
            break;
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
renderer.setAnimationLoop(animateVR);