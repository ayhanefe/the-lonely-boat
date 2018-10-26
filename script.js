// Colors to use in the game
var Colors = {
	red:0xf25346,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
	fogBlue:0x4277a6
};

// Variables for the scene
var scene,
		camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
		renderer, container;

// Light variables
var hemisphereLight, shadowLight;

// Object variables
var sea;
var sky;
var boat;

var mousePos={x:0, y:0};

var waveUp = 77.5;
var waveDown = 73.5;
var boatUp = true;
var boatRotUp = true;


// Wait until window loads to run init
window.addEventListener('load', init, false);

function init() {
	// Set up the scene, the camera and the renderer
	createScene();

	// Add the lights
	createLights();

	// Add the objects
	createBoat();
	createSea();
	createSky();

  // Add listener for mouse movements
  document.addEventListener('mousemove', handleMouseMove, false);

	// Start a loop that will update the objects' positions
	// and render the scene on each frame
	loop();
}

// Initialize the scene
function createScene() {
	// Get the width and the height of the screen,
	// use them to set up the aspect ratio of the camera
	// and the size of the renderer.
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	// Create the scene
	scene = new THREE.Scene();

	// Add a fog effect to the scene; same color as the
	// background color used in the style sheet
	scene.fog = new THREE.Fog(Colors['white'], 100, 950);

	// Create the camera
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	// Set the position of the camera
	camera.position.x = 0;
	camera.position.z = 200;
	camera.position.y = 100;

	// Create the renderer
	renderer = new THREE.WebGLRenderer({
		// Allow transparency to show the gradient background
		// we defined in the CSS
		alpha: true,

		// Activate the anti-aliasing; this is less performant,
		// but, as our project is low-poly based, it should be fine :)
		antialias: true
	});

	// Define the size of the renderer; in this case,
	// it will fill the entire screen
	renderer.setSize(WIDTH, HEIGHT);

	// Enable shadow rendering
	renderer.shadowMap.enabled = true;

	// Add the DOM element of the renderer to the
	// container we created in the HTML
	container = document.getElementById('GraphicsContainer');
	container.appendChild(renderer.domElement);

	// Listen to the screen: if the user resizes it
	// we have to update the camera and the renderer size
	window.addEventListener('resize', handleWindowResize, false);
}

// Handle resizing of the window
function handleWindowResize() {
	// update height and width of the renderer and the camera
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

// Initialize the lighting
function createLights() {
	// A hemisphere light is a gradient colored light;
	// the first parameter is the sky color, the second parameter is the ground color,
	// the third parameter is the intensity of the light
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)

	// A directional light shines from a specific direction.
	// It acts like the sun, that means that all the rays produced are parallel.
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);

	// Set the direction of the light
	shadowLight.position.set(150, 350, 350);

	// Allow shadow casting
	shadowLight.castShadow = true;

	// define the visible area of the projected shadow
	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// define the resolution of the shadow; the higher the better,
	// but also the more expensive and less performant
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	// to activate the lights, just add them to the scene
	scene.add(hemisphereLight);
	scene.add(shadowLight);
}

// First let's define a Sea object :
Sea = function(){
	var geom = new THREE.CylinderGeometry(1000,950,750,300,300);
	geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

	// important: by merging vertices we ensure the continuity of the waves
	geom.mergeVertices();

	// get the vertices
	var l = geom.vertices.length;

	// create an array to store new data associated to each vertex
	this.waves = [];

	for (var i=0; i<l; i++){
		// get each vertex
		var v = geom.vertices[i];

		// store some data associated to it
		this.waves.push({y:v.y,
										 x:v.x,
										 z:v.z,
										 // a random angle
										 ang:Math.random()*Math.PI*2,
										 // a random distance
										 amp:Math.random() * 3,
										 // a random speed between 0.016 and 0.048 radians / frame
										 speed:0.001
										});
	};
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.blue,
		transparent:true,
		opacity:.9,
		shading:THREE.FlatShading,
	});

	this.mesh = new THREE.Mesh(geom, mat);
	this.mesh.receiveShadow = true;

}

// now we create the function that will be called in each frame
// to update the position of the vertices to simulate the waves

Sea.prototype.moveWaves = function (){

	// get the vertices
	var verts = this.mesh.geometry.vertices;
	var l = verts.length;

	for (var i=0; i<l; i++){
		var v = verts[i];

		// get the data associated to it
		var vprops = this.waves[i];

		// update the position of the vertex
		v.x = vprops.x + Math.cos(vprops.ang)*vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;

		// increment the angle for the next frame
		vprops.ang += vprops.speed;

	}

	// Tell the renderer that the geometry of the sea has changed.
	// In fact, in order to maintain the best level of performance,
	// three.js caches the geometries and ignores any changes
	// unless we add this line
	this.mesh.geometry.verticesNeedUpdate=true;

	sea.mesh.rotation.z += .0001;
}

// Instantiate the sea and add it to the scene:

Cloud = function(){
	// Create an empty container that will hold the different parts of the cloud
	this.mesh = new THREE.Object3D();

	// create a cube geometry;
	// this shape will be duplicated to create the cloud
	var geom = new THREE.BoxGeometry(20,20,20);

	// create a material; a simple white material will do the trick
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.white,
	});

	// duplicate the geometry a random number of times
	var nBlocs = 3+Math.floor(Math.random()*3);
	for (var i=0; i<nBlocs; i++ ){

		// create the mesh by cloning the geometry
		var m = new THREE.Mesh(geom, mat);

		// set the position and the rotation of each cube randomly
		m.position.x = i*15;
		m.position.y = Math.random()*10;
		m.position.z = Math.random()*10;
		m.rotation.z = Math.random()*Math.PI*2;
		m.rotation.y = Math.random()*Math.PI*2;

		// set the size of the cube randomly
		var s = .1 + Math.random()*.9;
		m.scale.set(s,s,s);

		// allow each cube to cast and to receive shadows
		m.castShadow = true;
		m.receiveShadow = true;

		// add the cube to the container we first created
		this.mesh.add(m);
	}
}

// Define a Sky Object
Sky = function(){
	// Create an empty container
	this.mesh = new THREE.Object3D();

	// choose a number of clouds to be scattered in the sky
	this.nClouds = 10;

	// To distribute the clouds consistently,
	// we need to place them according to a uniform angle
	var stepAngle = Math.PI*2 / this.nClouds;

	// create the clouds
	for(var i=0; i<this.nClouds; i++){
		var c = new Cloud();

		// set the rotation and the position of each cloud;
		// for that we use a bit of trigonometry
		var a = stepAngle*i; // this is the final angle of the cloud
		var h = 750 + Math.random()*200; // this is the distance between the center of the axis and the cloud itself

		// Trigonometry!!! I hope you remember what you've learned in Math :)
		// in case you don't:
		// we are simply converting polar coordinates (angle, distance) into Cartesian coordinates (x, y)
		c.mesh.position.y = Math.sin(a)*h;
		c.mesh.position.x = Math.cos(a)*h;

		// rotate the cloud according to its position
		c.mesh.rotation.z = a + Math.PI/2;

		// for a better result, we position the clouds
		// at random depths inside of the scene
		c.mesh.position.z = -400-Math.random()*400;

		// we also set a random scale for each cloud
		var s = 5+Math.random()*2;
		c.mesh.scale.set(s,s,s);

		// do not forget to add the mesh of each cloud in the scene
		this.mesh.add(c.mesh);
	}
}

Boat = function () {
  this.mesh = new THREE.Object3D();

  // Hull of the boat
  var geomHull = new THREE.BoxGeometry(80,40,50,1,1,1);
  var matHull = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
  var hull = new THREE.Mesh(geomHull, matHull);
  hull.castShadow = true;
  hull.receiveShadow = true;

  // Stern
  var geomStern = new THREE.BoxGeometry(80, 40, 50, 1, 1, 1);
  var matStern = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
  var stern = new THREE.Mesh(geomStern, matStern);
  stern.position.set(-30,30,0);
  stern.castShadow = true;
  stern.receiveShadow = true;

  // Bow
  var geomBow = new THREE.BoxGeometry(80, 40, 50, 1, 1, 1);
  var matBow = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
  var bow = new THREE.Mesh(geomBow, matBow);
  bow.position.set(30,40,0);
  bow.castShadow = true;
  bow.receiveShadow = true;

  // Mast
  var geomMast = new THREE.BoxGeometry(10, 100, 10, 1, 1, 1);
  var matMast= new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
  var mast = new THREE.Mesh(geomMast, matMast);
  mast.position.set(5,100,0);
  mast.castShadow = true;
  mast.receiveShadow = true;

  // Add the parts to the boat
  this.mesh.add(hull);
  this.mesh.add(stern);
  this.mesh.add(bow);
  this.mesh.add(mast);
}

function createBoat () {
  boat = new Boat();
  boat.mesh.scale.set(0.25, 0.25, 0.25);
  boat.mesh.position.y = 75;
  scene.add(boat.mesh);
}

function createSky(){
	sky = new Sky();
	sky.mesh.position.y = -450;
	scene.add(sky.mesh);
}

function createSea(){
	sea = new Sea();

	// push it a little bit at the bottom of the scene
	sea.mesh.position.y = -900;
	// add the mesh of the sea to the scene
	scene.add(sea.mesh);
}

function loop(){
	// Rotate the propeller, the sea and the sky
	sea.mesh.rotation.z += .0001;
	sky.mesh.rotation.z += .0001;

  // Update boat location
  updateBoat();
  sea.moveWaves();
	// render the scene
	renderer.render(scene, camera);

	// call the loop function again
	requestAnimationFrame(loop);
}

function updateBoat() {

	// let's move the airplane between -100 and 100 on the horizontal axis,
	// and between 25 and 175 on the vertical axis,
	// depending on the mouse position which ranges between -1 and 1 on both axes;
	// to achieve that we use a normalize function (see below)

	var targetX = normalize(mousePos.x, -1, 1, -50, 50);
	var targetZ = normalize(mousePos.y, -1, 1, -50, 50);

		// update the boat's position
	boat.mesh.position.z += (targetZ - boat.mesh.position.z)*0.01;
	boat.mesh.position.x += (targetX - boat.mesh.position.x)*0.01;

	//if (boat.mesh.position.y >= waveUp) { waveTarget = waveDown; }
	//else if (boat.mesh.position.y <= waveDown) { waveTarget = waveUp; }

	if (boatUp) {
		boat.mesh.position.y += 0.015;
		if (boatRotUp) { boat.mesh.rotation.z = (waveUp - boat.mesh.position.y)*0.007; }
		else {boat.mesh.rotation.z = (boat.mesh.position.y - waveUp)*0.007}
	} else {
		boat.mesh.position.y -= 0.015;
		if (boatRotUp) { boat.mesh.rotation.z = (waveUp - boat.mesh.position.y)*-0.007; }
		else {boat.mesh.rotation.z = (boat.mesh.position.y - waveUp)*-0.007}
	}

	if (boat.mesh.position.y > waveUp) { boatUp = false; }
	if (boat.mesh.position.y < waveDown) {boatUp = true; boatRotUp = !boatRotUp; }
	//boat.mesh.position.y += (waveTarget - boat.mesh.position.y)*0.01;


}

function normalize(v,vmin,vmax,tmin, tmax){

	var nv = Math.max(Math.min(v,vmax), vmin);
	var dv = vmax-vmin;
	var pc = (nv-vmin)/dv;
	var dt = tmax-tmin;
	var tv = tmin + (pc*dt);
	return tv;

}

function handleMouseMove(event) {

	// here we are converting the mouse position value received
	// to a normalized value varying between -1 and 1;
	// this is the formula for the horizontal axis:
	var tx = -1 + (event.clientX / WIDTH)*2;

	// for the vertical axis, we need to inverse the formula
	// because the 2D y-axis goes the opposite direction of the 3D y-axis
	var ty = -1 + (event.clientY / HEIGHT)*2;
	mousePos = {x:tx, y:ty};
}
