import * as THREE from '../build/three.module.js';
import Stats from './jsm/libs/stats.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { ConvexObjectBreaker } from './jsm/misc/ConvexObjectBreaker.js';

// Графічні змінні
var controls, renderer, camera, container, stats, scene, textureLoader;

var cannonballMaterial = new THREE.MeshPhongMaterial({color: 0x800000});
var clock = new THREE.Clock();
var raycaster = new THREE.Raycaster();
var mouseCoords = new THREE.Vector2();

// Фізичні змінні
var dispatcher, physicsWorld, gravity, broadphase, collisionConfiguration, solver;
var margin = 0.05;

var convexBreaker = new ConvexObjectBreaker();

// Масив rigidBodies містить всі рухомі об'єкти
var rigidBodies = [];

var pos = new THREE.Vector3();
var quat = new THREE.Quaternion();
var transformAux1, tempBtVec3_1;

var objectsToRemove = [];
for (var i = 0; i < 500; i++) {
    objectsToRemove[i] = null;
}
var numObjectsToRemove = 0;

var impactPoint = new THREE.Vector3();
var impactNormal = new THREE.Vector3();

// Веб сокет
var webSocket = new WebSocket("ws://localhost:9000/cannonball");

var weight, tick, radius, speed;

webSocket.onopen = function(){
    webSocket.send(JSON.stringify({
        'command': 200,
        'preSharedKey': "gdjhd234erw"
    }));
};

webSocket.onmessage = function(e) {
    var message = JSON.parse(e.data);
    if (message.command === 50){
        console.log('Starting...');
        startApp(message.content);
    } else {
        console.log('Invalid init response');
    }
};

function sendStats() {
    var obj = {
        command: 100,
        content: {
            width : window.innerWidth,
            height : window.innerHeight,
            fps : 60
        }
    };

    webSocket.send(JSON.stringify(obj));
}

// Запуск застосунку
function startApp(message) {
    radius = message['cannonballRadius'];
    weight = message['cannonballWeight'];
    speed = message['cannonballSpeed'];
    tick = message['tick'];
    gravity = message['gravitationalConstant'];

    Ammo().then(function(AmmoLib){
        Ammo = AmmoLib;
        init();
        animate();
    });
}

function init() {
    initGraphics();
    initPhysics();
    createObjects();
    initInput();
}

function initGraphics() {
    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
    camera.position.set(-14, 8, 16);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x85c1e9);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.update();

    textureLoader = new THREE.TextureLoader();

    var ambientLight = new THREE.AmbientLight(0x707070);
    scene.add(ambientLight);

    var light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set(-10, 18, 5);
    light.castShadow = true;
    var koef = 12;
    light.shadow.camera.left = -koef;
    light.shadow.camera.right = koef;
    light.shadow.camera.top = koef;
    light.shadow.camera.bottom = -koef;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;

    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;

    scene.add( light );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
}

function initPhysics() {
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -gravity, 0));

    transformAux1 = new Ammo.btTransform();
    tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);
}

function createObjects() {
    // основа
    pos.set(0, - 0.5, 0);
    quat.set(0, 0, 0, 1);
    var ground = createParallelepipedWithPhysics(40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial({color: 0x7dcea0}));
    ground.receiveShadow = true;
    textureLoader.load( "textures/floor.jpg", function (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);
        ground.material.map = texture;
        ground.material.needsUpdate = true;
    });
}

function createParallelepipedWithPhysics(sx, sy, sz, weight, position, quaternion, material) {
    var parallelepiped = new THREE.Mesh(new THREE.BoxBufferGeometry(sx, sy, sz, 1, 1, 1 ), material);
    var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ));
    shape.setMargin(margin);

    createRigidBody(parallelepiped, shape, weight, position, quaternion);

    return parallelepiped;
}

function createDebrisFromBreakableObject(object) {
    object.castShadow = true;
    object.receiveShadow = true;

    var convexHull = createConvexHullPhysicsShape(object.geometry.attributes.position.array);
    convexHull.setMargin(margin);

    var body = createRigidBody(object, convexHull, object.userData.weight, null, null, object.userData.velocity, object.userData.angularVelocity);

    var btVecUserData = new Ammo.btVector3(0, 0, 0);
    btVecUserData.threeObject = object;
    body.setUserPointer(btVecUserData);
}

function removeDebris(object) {
    scene.remove(object);
    physicsWorld.removeRigidBody(object.userData.physicsBody);
}

function createConvexHullPhysicsShape(coords) {
    var convexHull = new Ammo.btConvexHullShape();

    for (var i = 0, il = coords.length; i < il; i += 3) {
        tempBtVec3_1.setValue(coords[i], coords[i + 1], coords[i + 2]);
        var lastOne = (i >= (il - 3));
        convexHull.addPoint(tempBtVec3_1, lastOne);
    }

    return convexHull;
}

function createRigidBody(object, physicsShape, weight, position, quaternion, velocity, angVel) {
    if (position) object.position.copy(position);
    else position = object.position;

    if (quaternion) object.quaternion.copy(quaternion);
    else quaternion = object.quaternion;

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(weight, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(weight, motionState, physicsShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);

    body.setFriction(0.5);

    if (velocity) body.setLinearVelocity(new Ammo.btVector3(velocity.x, velocity.y, velocity.z));
    if (angVel) body.setAngularVelocity( new Ammo.btVector3(angVel.x, angVel.y, angVel.z));

    object.userData.physicsBody = body;
    object.userData.collided = false;

    scene.add(object);

    if (weight > 0) {
        rigidBodies.push(object);
        body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);

    return body;
}

function initInput() {
    window.addEventListener('mousedown', function (event) {
        mouseCoords.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

        raycaster.setFromCamera(mouseCoords, camera);

        // Створює ядро та стріляє ним

        var cannonball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius, 14, 10 ), cannonballMaterial);
        cannonball.castShadow = true;
        cannonball.receiveShadow = true;
        var cannonballShape = new Ammo.btSphereShape(radius);
        cannonballShape.setMargin(margin);
        pos.copy(raycaster.ray.direction);
        pos.add(raycaster.ray.origin);
        quat.set(0, 0, 0, 1);
        var cannonballBody = createRigidBody(cannonball, cannonballShape, weight, pos, quat);

        pos.copy(raycaster.ray.direction);
        pos.multiplyScalar(speed);
        cannonballBody.setLinearVelocity(new Ammo.btVector3( pos.x, pos.y, pos.z));
    }, false );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update();
    sendStats();
}

function render() {
    var deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    renderer.render(scene, camera);
}

function updatePhysics(deltaTime) {
    physicsWorld.stepSimulation(deltaTime, tick);

    // оновлення наявних об'єктів
    for (var bodyNumber = 0, bodyLength = rigidBodies.length; bodyNumber < bodyLength; bodyNumber++) {

        var objThree = rigidBodies[bodyNumber];
        var objPhys = objThree.userData.physicsBody;
        var motionState = objPhys.getMotionState();

        if (motionState) {
            motionState.getWorldTransform(transformAux1);
            var p = transformAux1.getOrigin();
            var q = transformAux1.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

            objThree.userData.collided = false;
        }
    }

    for (var n = 0, nNum = dispatcher.getNumManifolds(); n < nNum; n++) {
        var contactManifold = dispatcher.getManifoldByIndexInternal(n);
        var rb0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
        var rb1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);
        var threeObject0 = Ammo.castObject(rb0.getUserPointer(), Ammo.btVector3).threeObject;
        var threeObject1 = Ammo.castObject(rb1.getUserPointer(), Ammo.btVector3).threeObject;

        if (!threeObject0 && !threeObject1) continue;

        var userData0 = threeObject0 ? threeObject0.userData : null;
        var userData1 = threeObject1 ? threeObject1.userData : null;
        var breakable0 = userData0 ? userData0.breakable : false;
        var breakable1 = userData1 ? userData1.breakable : false;
        var collided0 = userData0 ? userData0.collided : false;
        var collided1 = userData1 ? userData1.collided : false;

        if ((!breakable0 && !breakable1) || (collided0 && collided1)) continue;

        var contact = false;
        var maxImpulse = 0;
        for (var m = 0, mNum = contactManifold.getNumContacts(); m < mNum; j++) {
            var contactPoint = contactManifold.getContactPoint(j);

            if (contactPoint.getDistance() < 0) {
                contact = true;
                var impulse = contactPoint.getAppliedImpulse();

                if (impulse > maxImpulse) {
                    maxImpulse = impulse;
                    var pos = contactPoint.get_m_positionWorldOnB();
                    var normal = contactPoint.get_m_normalWorldOnB();
                    impactPoint.set(pos.x(), pos.y(), pos.z());
                    impactNormal.set(normal.x(), normal.y(), normal.z());
                }
                break;
            }
        }

        // Якщо жодна точка не мала зіткнень, продовжуємо
        if (!contact) continue;

        // Розбиття
        var fractureImpulse = 250;
        if (breakable0 && !collided0 && maxImpulse > fractureImpulse) {
            var debris = convexBreaker.subdivideByImpact(threeObject0, impactPoint, impactNormal, 1, 2, 1.5);

            var numObjects = debris.length;
            for (var l = 0; l < numObjects; l++) {
                var vel = rb0.getLinearVelocity();
                var angVel = rb0.getAngularVelocity();
                var fragment = debris[l];
                fragment.userData.velocity.set(vel.x(), vel.y(), vel.z());
                fragment.userData.angularVelocity.set(angVel.x(), angVel.y(), angVel.z());

                createDebrisFromBreakableObject(fragment);
            }

            objectsToRemove[numObjectsToRemove++] = threeObject0;
            userData0.collided = true;
        }

        if (breakable1 && ! collided1 && maxImpulse > fractureImpulse) {
            var debris = convexBreaker.subdivideByImpact(threeObject1, impactPoint, impactNormal, 1, 2, 1.5);

            var numObjects = debris.length;
            for (var j = 0; j < numObjects; j++) {
                var vel = rb1.getLinearVelocity();
                var angVel = rb1.getAngularVelocity();
                var fragment = debris[j];
                fragment.userData.velocity.set( vel.x(), vel.y(), vel.z() );
                fragment.userData.angularVelocity.set(angVel.x(), angVel.y(), angVel.z());

                createDebrisFromBreakableObject(fragment);
            }
            objectsToRemove[numObjectsToRemove++] = threeObject1;
            userData1.collided = true;
        }
    }

    for (var i = 0; i < numObjectsToRemove; i++) {
        removeDebris(objectsToRemove[i]);
    }
    numObjectsToRemove = 0;
}