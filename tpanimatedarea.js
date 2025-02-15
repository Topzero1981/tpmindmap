AFRAME.registerComponent('animatedarea', {
  schema: {
    color: { type: 'string', default: '0xff0000' },
    myarray: { type: 'array', default: [3, 2, 3] },
    duration: { type: 'number', default: 50 } // Animation interval in ms
  },

  init: function () {
    this.currentIndex = 0;
    this.crosszero = [];
    this.crossz = [];
    this.heartShape = new THREE.Shape();
    this.updateCrossZ();
    this.createInitialMesh();
    this.addNextPoint();
  },

  updateCrossZ: function () {
    const mydata = this.data;
    this.crosszero = mydata.myarray.map((num) => parseFloat(num));
    this.crossz = mydata.myarray.map((num) => parseFloat(num));
    
    const mylength = mydata.myarray.length;
    for (let i = 0; i < mylength; i++) {
      if (i < mylength - 1) {
        this.crossz[i] =
          this.crosszero[i] * this.crosszero[i + 1] < 0
            ? Math.abs(this.crosszero[i]) /
              (Math.abs(this.crosszero[i]) + Math.abs(this.crosszero[i + 1]))
            : 0;
      }
    }
    this.crossz[mylength - 1] = 0;
  },

  createInitialMesh: function () {
    // Define extrude settings
    this.extrudeSettings = {
      depth: 2,
      bevelEnabled: false,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 1,
      bevelThickness: 1
    };

    // Initial empty geometry and material
    this.geometry = new THREE.ExtrudeGeometry(this.heartShape, this.extrudeSettings);
    this.material = new THREE.MeshStandardMaterial({
      color: this.data.color,
      roughness: 0.5,
      opacity: 0.6,
      transparent: true,
      vertexColors: true,
      side: THREE.DoubleSide
    });

    // Create mesh and add to the scene
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.el.object3D.add(this.mesh);

    // Set initial rotation
    this.el.object3D.rotation.set(
      THREE.MathUtils.degToRad(15),
      THREE.MathUtils.degToRad(30),
      THREE.MathUtils.degToRad(90)
    );
  },

  addNextPoint: function () {
    if (this.currentIndex >= this.data.myarray.length) return;

    const x = this.currentIndex + 1;
    const y = this.data.myarray[this.currentIndex] > 0 ? this.data.myarray[this.currentIndex] : 0;

    // Add the new point to the shape
    this.heartShape.lineTo(x, y);

    if (this.crosszero[this.currentIndex] > 0 && this.crossz[this.currentIndex] > 0) {
      this.heartShape.lineTo(x + this.crossz[this.currentIndex], 0);
    }
    if (this.currentIndex === this.data.myarray.length - 1) {
      this.heartShape.lineTo(x, 0);
    }

    // Update the geometry
    this.updateGeometry();

    // Move to the next point
    this.currentIndex++;
    setTimeout(() => this.addNextPoint(), this.data.duration);
  },

  updateGeometry: function () {
    // Dispose of the existing geometry properly to free memory
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }

    // Redefine geometry with the updated shape
    this.geometry = new THREE.ExtrudeGeometry(this.heartShape, this.extrudeSettings);
    this.mesh.geometry = this.geometry;
  },

  remove: function () {
    // Dispose of geometry and material on removal
    if (this.mesh) {
      this.el.object3D.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
});
