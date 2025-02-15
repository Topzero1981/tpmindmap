AFRAME.registerComponent('foo', {
  schema: {
    color: { type: 'string', default: '#ff0000' },
    myarray: { type: 'array', default: [3, 2, 3] }
  },

  update() {
    const data = this.data;
    const x = 0, y = 0;
    const values = data.myarray.map(n => parseFloat(n));
    const numPoints = values.length;

    // Compute cross offsets for smoothing zero crossings.
    const crossz = new Array(numPoints).fill(0);
    for (let i = 0; i < numPoints - 1; i++) {
      if (values[i] * values[i + 1] < 0) {
        crossz[i] = Math.abs(values[i]) / (Math.abs(values[i]) + Math.abs(values[i + 1]));
      }
    }

    // Build the area shape.
    const shape = new THREE.Shape();

    // Top boundary.
    for (let i = 0; i < numPoints; i++) {
      const val = values[i] > 0 ? values[i] : 0;
      shape.lineTo(x + 1 + i, y + val);
      if (values[i] > 0 && crossz[i] > 0) {
        shape.lineTo(x + i + 1 + crossz[i], y);
      }
      if (values[i] < 0 && crossz[i] > 0) {
        shape.lineTo(x + i + 1 + crossz[i], y);
      }
      if (i === numPoints - 1) {
        shape.lineTo(x + i + 1, y);
      }
    }

    // Bottom boundary (drawn in reverse order).
    for (let i = 0; i < numPoints; i++) {
      const idx = numPoints - 1 - i;
      const val = values[idx] < 0 ? values[idx] : -0.001;
      shape.lineTo(x + numPoints - i, y + val);
      if (idx > 0 && values[idx] < 0 && crossz[idx - 1] > 0) {
        shape.lineTo(x + numPoints - i - 1 + crossz[idx - 1], y - 0.001);
      }
      if (idx > 0 && values[idx] > 0 && crossz[idx - 1] > 0) {
        shape.lineTo(x + numPoints - i - 1 + crossz[idx - 1], y - 0.001);
      }
      if (i === numPoints - 1) {
        shape.lineTo(x, y);
      }
    }

    const extrudeSettings = {
      depth: 2,
      bevelEnabled: false,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 1,
      bevelThickness: 1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.5,
      opacity: 0.6,
      transparent: true,
      vertexColors: true
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Remove previous mesh if it exists.
    if (this.mesh) {
      this.el.object3D.remove(this.mesh);
    }
    this.mesh = mesh;
    this.el.object3D.add(mesh);

    // Apply a fixed rotation.
    this.el.object3D.rotation.set(
      THREE.MathUtils.degToRad(15),
      THREE.MathUtils.degToRad(30),
      THREE.MathUtils.degToRad(90)
    );
  },

  remove() {
    if (this.mesh) {
      this.el.object3D.remove(this.mesh);
    }
  }
});
