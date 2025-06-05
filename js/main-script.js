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
let shadingMode = 0;
let previous_shadingMode = 0;

//Object vars
let terrain;
let sky_dome;
let moon;
let corkOaks = [];
let house;

let ufo, main, cockpit, bulb_group, base_cylinder;
let bulb1, bulb2, bulb3, bulb4, bulb5, bulb6, bulb7, bulb8;
let bulbs = [bulb1, bulb2, bulb3, bulb4, bulb5, bulb6, bulb7, bulb8];

//Light vars
let lightingEnabled = true;
let directional_light, spot_light;

let ufo_spotlight;
let spotlightOn = true;

let pointLightOn = true;
let point_light1, point_light2, point_light3, point_light4,
point_light5, point_light6, point_light7, point_light8;
let ufo_pointlights = [point_light1, point_light2, point_light3, point_light4, point_light5, point_light6, point_light7, point_light8];

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    scene = new THREE.Scene();
    //scene.add(new THREE.AxesHelper(10));
    scene.background = new THREE.Color(0x0); 

}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createcamPersp() {
    camPersp = new THREE.PerspectiveCamera(70, aspect, 1, 1000);
    camPersp.position.set(200, 200, 200);
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
        if (mesh.material) {
            mesh.material.dispose(); //clean up old material
        }
        
        //select material based on current shading mode
        mesh.material = materials[shadingMode];
        mesh.material.needsUpdate = true;
        
        //force lighting recalculation
        if (mesh.material.lights !== undefined) {
            mesh.material.lights = lightingEnabled;
        }
        
    }
}

//function to create material variants for any color
function createMaterialVariants(color, options = {}) {
    const lambert = new THREE.MeshLambertMaterial({color, ...options});
    const phong = new THREE.MeshPhongMaterial({color, ...options});
    const toon = new THREE.MeshToonMaterial({color, ...options});
    const basic = new THREE.MeshBasicMaterial({color, ...options});
    return [lambert, phong, toon, basic];
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////


function createDirectionalLight(c, inten){
    const light = new THREE.DirectionalLight(c, inten);
    return light;
}

function createPointLight(c, inten){
    const light = new THREE.PointLight(c, inten);
    return light;
}

function createSpotLight(c, inten, dist, angle, penumbra){
    const light = new THREE.SpotLight(c, inten, dist,angle, penumbra);
    return light;
}

function toggleLighting(enabled) {
    directional_light.visible = enabled;
    //spot_light.visible = enabled;

    updateMaterials();
}

/////////////////////////////
/* PROCEDURAL TEXTURE FIELD*/
/////////////////////////////
function generateFlowerFieldTexture(width, height){
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#006400';
    ctx.fillRect(0, 0, width, height);

    const flowerColors = ['white', 'yellow', 'violet', 'lightblue'];

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

function generateBasicTerrainMaterial(fieldTexture) {

    return new THREE.MeshBasicMaterial({
        map: fieldTexture
    });
}

function generateTerrainField(){
    const flowerFieldTexture = generateFlowerFieldTexture(2048, 2048);
    const heightMapPath = '/textures/heightmap2.png';
    const displaceMultiplier = 15;

    const lambert = generateLambertTerrainMaterial(flowerFieldTexture, heightMapPath, displaceMultiplier);
    const phong   = generatePhongTerrainMaterial(flowerFieldTexture, heightMapPath, displaceMultiplier);
    const toon    = generateToonTerrainMaterial(flowerFieldTexture, heightMapPath, displaceMultiplier);
    const basic    = generateBasicTerrainMaterial(flowerFieldTexture);

    const matList = [lambert, phong, toon, basic];

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

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#000033');
  gradient.addColorStop(1, '#330033');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * width;
    const bias = Math.pow(Math.random(), 1.5);
    const y = bias * height;
    const radius = Math.sin(y /height * Math.PI/2);
    const alpha = Math.random() * 0.5 + 0.5; 

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

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

    const matList = [lambert, phong, toon, skyMaterial];

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

    main = createSphere(10, 15, 5, main_mat);
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
    ufo_pointlights = [];

    for(let i = 0; i < 8; i++){
        const angle = i * (Math.PI * 2 / 8);
        const x = 5 * Math.cos(angle);
        const z = 5 * Math.sin(angle);

        bulbs[i] = createSphere(0.4, 8, 8, bulb_mat);
        bulbs[i].position.set(x, -1.8, z);
        bulb_group.add(bulbs[i]);

        ufo_pointlights[i] = createPointLight(0xffffff, 1000);
        ufo_pointlights[i].position.set(x, -3, z);
        ufo_pointlights[i].visible = pointLightOn;
        bulb_group.add(ufo_pointlights[i]);
    }
    ufo.add(bulb_group);
    
    ufo_spotlight = createSpotLight(0xfffff, 20000, 200, Math.PI/5, 0);
    ufo_spotlight.position.set(0,-2.5,0);
    ufo_spotlight.target.position.set(0,-50,0);
    ufo_spotlight.visible = spotlightOn;

    ufo.add(ufo_spotlight);
    ufo.add(ufo_spotlight.target);

    ufo.scale.set(2,2,2);
}

function InitUFO(){
    const mainLambert = new THREE.MeshLambertMaterial(color_main); // light blue
    const mainPhong   = new THREE.MeshPhongMaterial(color_main);
    const mainToon    = new THREE.MeshToonMaterial(color_main);
    const mainBasic    = new THREE.MeshBasicMaterial(color_main);

    const cockpitLambert = new THREE.MeshLambertMaterial(color_cockpit); // cyan
    const cockpitPhong   = new THREE.MeshPhongMaterial(color_cockpit);
    const cockpitToon    = new THREE.MeshToonMaterial(color_cockpit);
    const cockpitBasic    = new THREE.MeshBasicMaterial(color_cockpit);

    const bulbLambert = new THREE.MeshLambertMaterial(color_bulb_light); // cyan
    const bulbPhong   = new THREE.MeshPhongMaterial(color_bulb_light);
    const bulbToon    = new THREE.MeshToonMaterial(color_bulb_light);
    const bulbBasic    = new THREE.MeshBasicMaterial(color_bulb_light);

    const baseLambert = new THREE.MeshLambertMaterial(color_base_cylinder); // cyan
    const basePhong   = new THREE.MeshPhongMaterial(color_base_cylinder);
    const baseToon    = new THREE.MeshToonMaterial(color_base_cylinder);
    const baseBasic    = new THREE.MeshBasicMaterial(color_base_cylinder);

    const mainMatList = [mainLambert, mainPhong, mainToon, mainBasic];
    const cockpitMatList = [cockpitLambert, cockpitPhong, cockpitToon, cockpitBasic];
    const bulbMatList = [bulbLambert, bulbPhong, bulbToon, bulbBasic];
    const baseMatList = [baseLambert, basePhong, baseToon, baseBasic];

    createUFO(mainMatList[shadingMode], cockpitMatList[shadingMode], bulbMatList[shadingMode], baseMatList[shadingMode]);

    materialVariants.set(main, mainMatList);
    materialVariants.set(cockpit, cockpitMatList);
    
    for(let i = 0; i<8; i++){
        materialVariants.set(bulbs[i], bulbMatList);
    }

    materialVariants.set(base_cylinder, baseMatList);
}

function toggleUFOPointLights() {
    pointLightOn = !pointLightOn;
    
    for(let light of ufo_pointlights){
        light.visible = pointLightOn;
    }
}

function toggleUFOSpotlight() {
    spotlightOn = !spotlightOn;
    
    if (ufo_spotlight) {
        ufo_spotlight.visible = spotlightOn;
    }
}

const ufo_rotation_spped = 0.02; // radians per frame
const ufo_move_speed = 0.5; // units per frame
let ufoVelocity = new THREE.Vector3(0, 0, 0);
function updateUFOMovement() {
    if (!ufo) return;
    
    // Reset velocity
    ufoVelocity.set(0, 0, 0);
    
    // Check arrow keys and accumulate velocity
    if (keysHeld['ArrowUp']) {
        ufoVelocity.z -= ufo_move_speed;
    }
    if (keysHeld['ArrowDown']) {
        ufoVelocity.z += ufo_move_speed;
    }
    if (keysHeld['ArrowLeft']) {
        ufoVelocity.x -= ufo_move_speed;
    }
    if (keysHeld['ArrowRight']) {
        ufoVelocity.x += ufo_move_speed;
    }
    
    // Normalize diagonal movement to maintain constant speed
    if (ufoVelocity.length() > 0) {
        if (ufoVelocity.length() > ufo_move_speed) {
            ufoVelocity.normalize().multiplyScalar(ufo_move_speed);
        }
        
        ufo.position.add(ufoVelocity);
    }
}

/////////////////
/* CREATE MOON */
/////////////////
function createMoon() {
    const moonGeo = new THREE.SphereGeometry(20, 32, 32);
    
    //Create material variants for the moon
    const lambert = new THREE.MeshLambertMaterial({emissive: 0xc9c9c9, emissiveIntensity: 10});
    const phong = new THREE.MeshPhongMaterial({emissive: 0xc9c9c9, emissiveIntensity: 10});
    const toon = new THREE.MeshToonMaterial({emissive: 0xc9c9c9, emissiveIntensity: 10});
    const basic = new THREE.MeshBasicMaterial({color:0xc9c9c9});

    const moonMatList = [lambert, phong, toon, basic];
    
    moon = new THREE.Mesh(moonGeo, moonMatList[shadingMode]);
    moon.position.set(0, 150, -250);
    materialVariants.set(moon, moonMatList);
    scene.add(moon);
}

/////////////////////////////
/* CREATE AND SCATTER OAKS */
/////////////////////////////
function createCorkOak(scale) {
    const group = new THREE.Group();

    const barkMatList = createMaterialVariants(0xd47d30);
    
    const canopyMatList = createMaterialVariants(0x085a12);

    const trunkGeo = new THREE.CylinderGeometry(1.6 * scale, 2 * scale, 10 * scale, 16);
    const trunk = new THREE.Mesh(trunkGeo, barkMatList[shadingMode]);
    trunk.position.y = 5 * scale;
    trunk.rotation.z = THREE.MathUtils.degToRad(8);
    group.add(trunk);
    materialVariants.set(trunk, barkMatList);

    const branchGeo = new THREE.CylinderGeometry(0.8 * scale, 1 * scale, 6 * scale, 12);
    const branch = new THREE.Mesh(branchGeo, barkMatList[shadingMode]);
    branch.position.set(0, 8 * scale, 0);
    branch.rotation.z = THREE.MathUtils.degToRad(-25);
    branch.position.x = Math.sin(branch.rotation.z) * 3 * scale;
    group.add(branch);
    materialVariants.set(branch, barkMatList);

    const blobs = THREE.MathUtils.randInt(2, 3);
    for (let i = 0; i < blobs; i++) {
        const blobGeo = new THREE.SphereGeometry(4 * scale, 24, 24);
        const blob = new THREE.Mesh(blobGeo, canopyMatList[shadingMode]);
        blob.scale.y = 0.7 + Math.random() * 0.3;                 // ellipsoid
        blob.position.set(
            THREE.MathUtils.randFloatSpread(2 * scale),
            10 * scale + THREE.MathUtils.randFloat(1, 3) * scale,
            THREE.MathUtils.randFloatSpread(2 * scale)
        );
        group.add(blob);
        materialVariants.set(blob, canopyMatList);
    }
    return group;
}

function scatterCorkOaks(n) {
    const ray  = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);


    const tBox  = new THREE.Box3().setFromObject(terrain);
    const width = tBox.max.x - tBox.min.x + 300;
    const depth = tBox.max.z - tBox.min.z + 300;

    const minX = tBox.min.x + width  * 0.10;
    const maxX = tBox.max.x - width  * 0.10;
    const minZ = tBox.min.z + depth  * 0.10;
    const maxZ = tBox.max.z - depth  * 0.10;

    for (let i = 0; i < n; i++) {
        const scale = THREE.MathUtils.randFloat(0.8, 1.4);
        const oak   = createCorkOak(scale);

        const x = THREE.MathUtils.randFloat(minX, maxX);
        const z = THREE.MathUtils.randFloat(minZ, maxZ);

        ray.set(new THREE.Vector3(x, tBox.max.y + 10, z), down);
        
        const intersections = ray.intersectObject(terrain, true);

        let groundY = tBox.min.y;
        
        if (intersections.length > 0) {
            groundY = intersections[0].point.y;
        }

        oak.position.set(x, groundY, z);
        oak.rotation.y = THREE.MathUtils.randFloat(0, Math.PI * 2);
        scene.add(oak);


        oak.updateWorldMatrix(true, false);                 
        const oBox = new THREE.Box3().setFromObject(oak);   
        const bury = groundY - oBox.min.y;                  
        if (bury > 0) oak.position.y += bury;

        corkOaks.push(oak);
    }
}

//////////////////
/* CREATE HOUSE */
//////////////////
function createCasaAlentejana() {
    const g = new THREE.Group();

    const W = 70, D = 40, H = 25, roofH = 14, over = 1.5; 

    const wallMatList = createMaterialVariants(0xffffff);
    const stripeMatList = createMaterialVariants(0x0060ff);
    const roofMatList = createMaterialVariants(0x8b4a2d);
    const doorWinMatList = createMaterialVariants(0x0060ff);


    function wallPlane(w, h, px, py, pz, ry = 0, materialList = wallMatList) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), materialList[shadingMode]);
        m.position.set(px, py, pz);
        m.rotation.y = ry;
        m.castShadow = m.receiveShadow = true;
        g.add(m);
        
        materialVariants.set(m, materialList);
        
        return m;
    }

    //front & back
    wallPlane(W, H, 0, H * 0.5,  D * 0.5);
    wallPlane(W, H, 0, H * 0.5, -D * 0.5, Math.PI);
    //sides
    wallPlane(D, H, -W * 0.5, H * 0.5, 0, -Math.PI * 0.5);
    wallPlane(D, H,  W * 0.5, H * 0.5, 0,  Math.PI * 0.5);

    wallPlane(W, H * 0.15, 0, H * 0.15 * 0.5,  D * 0.5 + 0.01, 0, stripeMatList);
    wallPlane(W, H * 0.15, 0, H * 0.15 * 0.5, -D * 0.5 - 0.01, Math.PI, stripeMatList);
    wallPlane(D, H * 0.15, -W * 0.5 - 0.01, H * 0.15 * 0.5, 0, -Math.PI * 0.5, stripeMatList);
    wallPlane(D, H * 0.15,  W * 0.5 + 0.01, H * 0.15 * 0.5, 0,  Math.PI * 0.5, stripeMatList);
 
    const doorW = W * 0.15, doorH = H * 0.67;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), doorWinMatList[shadingMode]);
    door.position.set(0, doorH * 0.5, D * 0.5 + 0.02);
    g.add(door);
    materialVariants.set(door, doorWinMatList);

    const winSize = W * 0.10;                
    const winGeo = new THREE.PlaneGeometry(winSize, winSize);
    const winY = H * 0.70;               
    const w1 = new THREE.Mesh(winGeo, doorWinMatList[shadingMode]);
    w1.position.set(-W * 0.35, winY, D * 0.5 + 0.02);   
    materialVariants.set(w1, doorWinMatList);
    
    const w2 = new THREE.Mesh(winGeo, doorWinMatList[shadingMode]);
    w2.position.set(W * 0.35, winY, D * 0.5 + 0.02);
    materialVariants.set(w2, doorWinMatList);
    
    g.add(w1, w2);

    const roofGeom = new THREE.BufferGeometry();
    const hw = W * 0.5 + over, hd = D * 0.5 + over;
    const verts = new Float32Array([
        -hw, H,  hd,   hw, H,  hd,    0, H + roofH,  hd,   //front triangle
        -hw, H, -hd,   hw, H, -hd,    0, H + roofH, -hd   //back triangle
    ]);
    const idx = [
        0,1,2,   3,5,4,    //front and back
        0,2,3,   3,2,5,    //left roof face
        1,4,2,   2,4,5     //right roof face
    ];
    roofGeom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    roofGeom.setIndex(idx);
    roofGeom.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeom, roofMatList[shadingMode]);
    g.add(roof);
    materialVariants.set(roof, roofMatList);

    // 5. tidy up 
    return g;
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

    //controls.update();

    if (ufo) {
        ufo.rotation.y += ufo_rotation_spped;
    }
    
    updateUFOMovement();
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

    // left eye
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(scene, stereoCamera.cameraL);

    // right eye
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
    ufo.position.set(0,60,0);
    scene.add(ufo);

    
    
    createMoon();
    scatterCorkOaks(60);

    house = createCasaAlentejana();
    const hx = 0,  hz = -80;
    const ray = new THREE.Raycaster(new THREE.Vector3(hx, 500, hz), new THREE.Vector3(0, -1, 0));
    const hit      = ray.intersectObject(terrain, true);
    const groundY  = hit.length ? hit[0].point.y : 0;
    house.position.set(hx, groundY, hz);
    const hBox = new THREE.Box3().setFromObject(house);
    house.position.y += (groundY - hBox.min.y);
    scene.add(house);


    directional_light = createDirectionalLight(0xffffff, 1.5);
    directional_light.position.set(0, 150, -250);
    directional_light.target.position.set(5,0,-5);


    scene.add(directional_light);
    scene.add(directional_light.target);
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
    //controls = new OrbitControls(camPersp, renderer.domElement);
    //controls.target.set(0, 0, 0);  // Point camera toward the origin
    
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
        case '7': 
            activeCamera = camPersp; //controls.target.set(0, 0, 0); 
            break;

        case 'D':
        case 'd':
            if (directional_light) directional_light.visible = !directional_light.visible; break;
        
        case 'q':
        case 'Q':
            if(lightingEnabled == true){
                shadingMode = 0; // Gouraud
                previous_shadingMode = 0;
                updateMaterials();
            }else{
                shadingMode = 0;
                previous_shadingMode = 0;
            }
            break;

        case 'w':
        case 'W':
            if(lightingEnabled == true){
                shadingMode = 1; // Phong
                previous_shadingMode = 1;
                updateMaterials();
            }else{
                shadingMode = 1;
                previous_shadingMode = 1;
            }
            break;

        case 'e':
        case 'E':
            if(lightingEnabled == true){
                shadingMode = 2; // Toon
                previous_shadingMode = 2;
                updateMaterials();
            }else{
                shadingMode = 2;
                previous_shadingMode = 2;
            }
            break;

        case 'r':
        case 'R':
            lightingEnabled = !lightingEnabled;
            if(lightingEnabled == false){
                shadingMode = 3; //basic shading
                updateMaterials();
            }else{
                shadingMode = previous_shadingMode;
            }
            toggleLighting(lightingEnabled);
            break;
        case 's':
        case 'S':
            toggleUFOSpotlight();
            break;
        case 'p':
        case 'P':
            toggleUFOPointLights();
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