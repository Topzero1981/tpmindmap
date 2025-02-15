AFRAME.registerComponent('foo', {
schema: {
   color: {type: 'string', default: '0xff0000'},
   myarray: {type: 'array', default: [3, 2, 3]}
 },
update: function() {
const x = 0, y = 0;
var mydata = this.data;

console.log(this.data.color);
const heartShape = new THREE.Shape();
console.log(this.data.myarray);
console.log(this.data.myarray[0]);
const crosszero = mydata.myarray.map((num) => (parseFloat(num)));
const crossz = mydata.myarray.map((num) => (parseFloat(num)));
console.log(y + parseFloat(this.data.myarray[0]));
console.log(this.data.myarray.length);

console.log(["1", "2", "3"].map((str) => parseInt(str)));

var mylength = this.data.myarray.length;
for (let i = 0; i < mylength; i++) {
if(i < (mylength-1)){
(crosszero[i]*crosszero[i+1]<0)?crossz[i]=Math.abs
(crosszero[i])/(Math.abs(crosszero[i])+Math.abs(crosszero[i+1])):crossz[i]=0;
}
}
crossz[mylength-1] = 0;
console.log("subzero");

console.log(crossz);

for (let i = 0; i < mylength; i++) {
heartShape.lineTo( x + 1 + i, y + ((parseFloat(this.data.myarray[i])>0)?parseFloat(this.data.myarray[i]):0));
if(crosszero[i]>0 && crossz[i]>0)
heartShape.lineTo( x + i + 1 + crossz[i], y);
if(crosszero[i]<0 && crossz[i]>0)
heartShape.lineTo( x + i + 1 + crossz[i]);
if(i === (mylength-1))
heartShape.lineTo( x + i + 1, y);
};
for (let i = 0; i < mylength; i++) {
heartShape.lineTo( x + mylength - i, y + ((parseFloat(this.data.myarray[mylength-1-i])<0)?parseFloat(this.data.myarray[mylength-1-i]):-0.001));
if(crosszero[mylength-1-i]<0 && crossz[mylength-2-i]>0)
heartShape.lineTo( x + mylength - i - 1 + crossz[mylength-i-2], y-0.001);
if(crosszero[mylength-1-i]>0 && crossz[mylength-2-i]>0)
heartShape.lineTo( x + mylength - i - 1 + crossz[mylength-i-2], y-0.001);

if(i === (mylength-1))
heartShape.lineTo(x, y);
}


const extrudeSettings = { depth: 2, bevelEnabled: false, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };

const geometry2 = new THREE.ExtrudeGeometry( heartShape, extrudeSettings );


const material2 = new THREE.MeshStandardMaterial({
   color: this.data.color,
   roughness: 0.5,
   opacity:0.6,
   transparent:true,
   vertexColors:true
 })
const mesh2 = new THREE.Mesh( geometry2, material2);




this.el.object3D.add(mesh2);


this.el.object3D.rotation.set(
 THREE.MathUtils.degToRad(15),
 THREE.MathUtils.degToRad(30),
 THREE.MathUtils.degToRad(90)
);


},


remove: function () {
   this.el.removeObject3D('mesh');
 }
       });
