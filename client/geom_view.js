/* global: THREE,assert */
// GeomView.js

// Author: {AMA,ER}
// released under MIT license

/*

		<script src="js/shaders/CopyShader.js"></script>
		<script src="js/shaders/FXAAShader.js"></script>
		<script src="js/postprocessing/EffectComposer.js"></script>
		<script src="js/postprocessing/RenderPass.js"></script>
		<script src="js/postprocessing/ShaderPass.js"></script>
		<script src="js/postprocessing/OutlinePass.js"></script>

 */

let THREE = global.THREE;

// Source: https://github.com/usco/glView-helpers/blob/master/src/grids/LabeledGrid.js

class LabeledGrid extends THREE.Object3D{
    constructor( width = 200, length = 200, step = 100, upVector = [0,1,0], color = 0x00baff, opacity = 0.2, text = true, textColor = "#000000", textLocation = "center") {
        super();

        this.width        = width;
        this.length       = length;
        this.step         = step;
        this.color        = color;
        this.opacity      = opacity;
        this.text         = text;
        this.textColor    = textColor;
        this.textLocation = textLocation;
        this.upVector     = new THREE.Vector3().fromArray(upVector);

        this.name = "grid";

        //TODO: clean this up
        this.marginSize =10;
        this.stepSubDivisions = 10;


        this._drawGrid();

        //default grid orientation is z up, rotate if not the case
        var upVector = this.upVector;
        this.up = upVector;
        this.lookAt(upVector);
    }

    _drawGrid() {
        var gridGeometry, gridMaterial, mainGridZ, planeFragmentShader, planeGeometry, planeMaterial, subGridGeometry, subGridMaterial, subGridZ;

        //offset to avoid z fighting
        mainGridZ = -0.05;
        gridGeometry = new THREE.Geometry();
        gridMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHex(this.color),
            opacity: this.opacity,
            linewidth: 2,
            transparent: true
        });

        subGridZ = -0.05;
        subGridGeometry = new THREE.Geometry();
        subGridMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHex(this.color),
            opacity: this.opacity / 2,
            transparent: true
        });

        var step = this.step;
        var stepSubDivisions = this.stepSubDivisions;
        var width = this.width;
        var length = this.length;

        var centerBased = true;

        if(centerBased)
        {
            for (var i = 0; i <= width/2; i += step/stepSubDivisions)
            {
                subGridGeometry.vertices.push( new THREE.Vector3(-length / 2, i, subGridZ) );
                subGridGeometry.vertices.push( new THREE.Vector3(length / 2, i, subGridZ) );

                subGridGeometry.vertices.push( new THREE.Vector3(-length / 2, -i, subGridZ) );
                subGridGeometry.vertices.push( new THREE.Vector3(length / 2, -i, subGridZ) );

                if( i%step == 0 )
                {
                    gridGeometry.vertices.push( new THREE.Vector3(-length / 2, i, mainGridZ) );
                    gridGeometry.vertices.push( new THREE.Vector3(length / 2, i, mainGridZ) );

                    gridGeometry.vertices.push( new THREE.Vector3(-length / 2, -i, mainGridZ) );
                    gridGeometry.vertices.push( new THREE.Vector3(length / 2, -i, mainGridZ) );
                }
            }
            for (var i = 0; i <= length/2; i += step/stepSubDivisions)
            {
                subGridGeometry.vertices.push( new THREE.Vector3(i, -width / 2, subGridZ) );
                subGridGeometry.vertices.push( new THREE.Vector3(i, width / 2, subGridZ) );

                subGridGeometry.vertices.push( new THREE.Vector3(-i, -width / 2, subGridZ) );
                subGridGeometry.vertices.push( new THREE.Vector3(-i, width / 2, subGridZ) );

                if( i%step == 0 )
                {
                    gridGeometry.vertices.push( new THREE.Vector3(i, -width / 2, mainGridZ) );
                    gridGeometry.vertices.push( new THREE.Vector3(i, width / 2, mainGridZ) );

                    gridGeometry.vertices.push( new THREE.Vector3(-i, -width / 2, mainGridZ) );
                    gridGeometry.vertices.push( new THREE.Vector3(-i, width / 2, mainGridZ) );
                }
            }
        }
        else{
            for (var i = -width/2; i <= width/2; i += step/stepSubDivisions)
            {
                subGridGeometry.vertices.push( new THREE.Vector3(-length / 2, i, subGridZ));
                subGridGeometry.vertices.push( new THREE.Vector3(length / 2, i, subGridZ));

                if( i%step == 0 )
                {
                    gridGeometry.vertices.push( new THREE.Vector3(-length / 2, i, mainGridZ));
                    gridGeometry.vertices.push( new THREE.Vector3(length / 2, i, mainGridZ));
                }
            }
            for (var i = -length/2; i <= length/2; i += step/stepSubDivisions)
            {
                subGridGeometry.vertices.push( new THREE.Vector3(i, -width / 2, subGridZ));
                subGridGeometry.vertices.push( new THREE.Vector3(i, width / 2, subGridZ));

                if( i%step == 0 )
                {
                    gridGeometry.vertices.push( new THREE.Vector3(i, -width / 2, mainGridZ));
                    gridGeometry.vertices.push( new THREE.Vector3(i, width / 2, mainGridZ));
                }
            }
        }

        this.mainGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
        //create sub grid geometry object
        this.subGrid = new THREE.LineSegments(subGridGeometry, subGridMaterial);

        //create margin
        var offsetWidth  = width + this.marginSize;
        var offsetLength = length + this.marginSize;

        var marginGeometry = new THREE.Geometry();
        marginGeometry.vertices.push( new THREE.Vector3(-length / 2, -width/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(length / 2, -width/2, subGridZ));

        marginGeometry.vertices.push( new THREE.Vector3(length / 2, -width/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(length / 2, width/2, subGridZ));

        marginGeometry.vertices.push( new THREE.Vector3(length / 2, width/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(-length / 2, width/2, subGridZ));

        marginGeometry.vertices.push( new THREE.Vector3(-length / 2, width/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(-length / 2, -width/2, subGridZ));


        marginGeometry.vertices.push( new THREE.Vector3(-offsetLength / 2, -offsetWidth/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(offsetLength / 2, -offsetWidth/2, subGridZ));

        marginGeometry.vertices.push( new THREE.Vector3(offsetLength / 2, -offsetWidth/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(offsetLength / 2, offsetWidth/2, subGridZ));

        marginGeometry.vertices.push( new THREE.Vector3(offsetLength / 2, offsetWidth/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(-offsetLength / 2, offsetWidth/2, subGridZ));

        marginGeometry.vertices.push( new THREE.Vector3(-offsetLength / 2, offsetWidth/2, subGridZ));
        marginGeometry.vertices.push( new THREE.Vector3(-offsetLength / 2, -offsetWidth/2, subGridZ));


        var  strongGridMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHex(this.color),
            opacity: this.opacity*2,
            linewidth: 2,
            transparent: true
        });
        this.margin = new THREE.LineSegments(marginGeometry, strongGridMaterial);

        //add all grids, subgrids, margins etc
        this.add( this.mainGrid );
        this.add( this.subGrid );
        this.add( this.margin );

        this._drawNumbering();
    }

    toggle(toggle) {
        //apply visibility settings to all children
        this.traverse( function( child ) {
            child.visible = toggle;
        });
    }

    setOpacity(opacity) {
        this.opacity = opacity;
        this.mainGrid.material.opacity = opacity;
        this.subGrid.material.opacity = opacity/2;
        this.margin.material.opacity = opacity*2;
    }

    setColor(color) {
        this.color = color;
        this.mainGrid.material.color = new THREE.Color().setHex(this.color);
        this.subGrid.material.color = new THREE.Color().setHex(this.color);
        this.margin.material.color = new THREE.Color().setHex(this.color);
    }

    toggleText(toggle) {
        this.text = toggle;
        var labels = this.labels.children;
        for (var i = 0; i < this.labels.children.length; i++) {
            var label = labels[i];
            label.visible = toggle;
        }
    }

    setTextColor(color) {
        this.textColor = color;
        this._drawNumbering();
    }

    setTextLocation(location) {
        this.textLocation = location;
        return this._drawNumbering();
    }

    setUp(upVector) {
        this.upVector = upVector;
        this.up = upVector;
        this.lookAt(upVector);
    }

    resize( width, length ) {
        if (width && length ) {
            var width = Math.max(width,10);
            this.width = width;

            var length = Math.max(length,10);
            this.length = length;

            this.step = Math.max(this.step,5);

            this.remove(this.mainGrid);
            this.remove(this.subGrid);
            this.remove( this.margin );
            //this.remove(this.plane);
            return this._drawGrid();
        }
    }

    _drawNumbering() {
        var label, sizeLabel, sizeLabel2, xLabelsLeft, xLabelsRight, yLabelsBack, yLabelsFront;
        var step = this.step;

        this._labelStore = {};

        if (this.labels != null) {
            this.mainGrid.remove(this.labels);
        }
        this.labels = new THREE.Object3D();


        var width = this.width;
        var length = this.length;
        var numbering = this.numbering = "centerBased";

        var labelsFront = new THREE.Object3D();
        var labelsSideRight = new THREE.Object3D();

        if(numbering == "centerBased" )
        {
            for (var i = 0 ; i <= width/2; i += step)
            {
                var sizeLabel = this.drawTextOnPlane("" + i, 32);
                var sizeLabel2 = sizeLabel.clone();

                sizeLabel.position.set(length/2, -i, 0.1);
                sizeLabel.rotation.z = -Math.PI / 2;
                labelsFront.add( sizeLabel );

                sizeLabel2.position.set(length/2, i, 0.1);
                sizeLabel2.rotation.z = -Math.PI / 2;
                labelsFront.add( sizeLabel2 );
            }

            for (var i = 0 ; i <= length/2; i += step)
            {
                var sizeLabel = this.drawTextOnPlane("" + i, 32);
                var sizeLabel2 = sizeLabel.clone();

                sizeLabel.position.set(-i, width/2, 0.1);
                //sizeLabel.rotation.z = -Math.PI / 2;
                labelsSideRight.add( sizeLabel );

                sizeLabel2.position.set(i, width/2, 0.1);
                //sizeLabel2.rotation.z = -Math.PI / 2;
                labelsSideRight.add( sizeLabel2 );
            }

            var labelsSideLeft = labelsSideRight.clone();
            labelsSideLeft.rotation.z = -Math.PI ;
            //labelsSideLeft = labelsSideRight.clone().translateY(- width );

            var labelsBack = labelsFront.clone();
            labelsBack.rotation.z = -Math.PI ;
        }



        /*if (this.textLocation === "center") {
          yLabelsRight.translateY(- length/ 2);
          xLabelsFront.translateX(- width / 2);
        } else {
          yLabelsLeft = yLabelsRight.clone().translateY( -width );
          xLabelsBack = xLabelsFront.clone().translateX( -length );

          this.labels.add( yLabelsLeft );
          this.labels.add( xLabelsBack) ;
        }*/
        //this.labels.add( yLabelsRight );
        this.labels.add( labelsFront );
        this.labels.add( labelsBack );

        this.labels.add( labelsSideRight );
        this.labels.add( labelsSideLeft );


        //apply visibility settings to all labels
        var textVisible = this.text;
        this.labels.traverse( function( child  ) {
            child.visible = textVisible;
        });


        this.mainGrid.add(this.labels);
    }

    drawTextOnPlane(text, size) {
        var canvas, context, material, plane, texture;

        if (size == null) {
            size = 256;
        }

        canvas = document.createElement('canvas');
        var size = 128;
        canvas.width = size;
        canvas.height = size;
        context = canvas.getContext('2d');
        context.font = "18px sans-serif";
        context.textAlign = 'center';
        context.fillStyle = this.textColor;
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        context.strokeStyle = this.textColor;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);

        texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.generateMipmaps = true;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;

        material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            color: 0xffffff,
            alphaTest: 0.3
        });
        plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(size / 8, size / 8), material);
        plane.doubleSided = true
        plane.overdraw = true

        return plane;

    }


    //autoresize, disabled for now
    updateGridSize() {
        var max, maxX, maxY, min, minX, minY, size, subchild, _getBounds, _i, _len, _ref,
            _this = this;
        minX = 99999;
        maxX = -99999;
        minY = 99999;
        maxY = -99999;
        _getBounds = function(mesh) {
            var bBox, subchild, _i, _len, _ref, _results;
            if (mesh instanceof THREE.Mesh) {
                mesh.geometry.computeBoundingBox();
                bBox = mesh.geometry.boundingBox;
                minX = Math.min(minX, bBox.min.x);
                maxX = Math.max(maxX, bBox.max.x);
                minY = Math.min(minY, bBox.min.y);
                maxY = Math.max(maxY, bBox.max.y);
                _ref = mesh.children;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    subchild = _ref[_i];
                    _results.push(_getBounds(subchild));
                }
                return _results;
            }
        };
        if (this.rootAssembly != null) {
            _ref = this.rootAssembly.children;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                subchild = _ref[_i];
                if (subchild.name !== "renderSubs" && subchild.name !== "connectors") {
                    _getBounds(subchild);
                }
            }
        }
        max = Math.max(Math.max(maxX, maxY), 100);
        min = Math.min(Math.min(minX, minY), -100);
        size = (Math.max(max, Math.abs(min))) * 2;
        size = Math.ceil(size / 10) * 5;
        if (size >= 200) {
            return this.resize(size,size);
        }
    }


}




// sets this vector to the coordinates of a mouse event, uses touch event if applicable
THREE.Vector2.prototype.setFromEvent = function (event) {

    this.x = (event.clientX !== undefined) ? event.clientX : (event.touches && event.touches[0].clientX);
    this.y = (event.clientY !== undefined) ? event.clientY : (event.touches && event.touches[0].clientY);
    return this;

};

// calculate mouse position in normalized device coordinates
THREE.Vector2.prototype.setToNormalizedDeviceCoordinates = function (event, window) {

    this.setFromEvent(event);
    this.x = (this.x / window.innerWidth) * 2 - 1;
    this.y = -(this.y / window.innerHeight) * 2 + 1;
    return this;

};

require("../../../node_modules/three/examples/js/loaders/deprecated/LegacyJSONLoader.js");
require("../../../node_modules/three/examples/js/shaders/CopyShader");
require("../../../node_modules/three/examples/js/shaders/FXAAShader");

require("../../../node_modules/three/examples/js/postprocessing/EffectComposer");
require("../../../node_modules/three/examples/js/postprocessing/RenderPass");
require("../../../node_modules/three/examples/js/postprocessing/ShaderPass");
// require("../../../node_modules/three/examples/js/postprocessing/OutlinePass");


// var CAPS = {};
//
// CAPS.UNIFORMS = {
//
//     clipping: {
//         color:        { type: "c",  value: new THREE.Color( 0x3d9ecb ) },
//         clippingLow:  { type: "v3", value: new THREE.Vector3( 0, 0, 0 ) },
//         clippingHigh: { type: "v3", value: new THREE.Vector3( 0, 0, 0 ) }
//     },
//
//     caps: {
//         color: { type: "c", value: new THREE.Color( 0xf83610 ) }
//     }
//
// };
// CAPS.SHADER = {
//
//     vertex: '\
// 		uniform vec3 color;\
// 		varying vec3 pixelNormal;\
// 		\
// 		void main() {\
// 			\
// 			pixelNormal = normal;\
// 			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
// 			\
// 		}',
//
//     vertexClipping: '\
// 		uniform vec3 color;\
// 		uniform vec3 clippingLow;\
// 		uniform vec3 clippingHigh;\
// 		\
// 		varying vec3 pixelNormal;\
// 		varying vec4 worldPosition;\
// 		varying vec3 camPosition;\
// 		\
// 		void main() {\
// 			\
// 			pixelNormal = normal;\
// 			worldPosition = modelMatrix * vec4( position, 1.0 );\
// 			camPosition = cameraPosition;\
// 			\
// 			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
// 			\
// 		}',
//
//     fragment: '\
// 		uniform vec3 color;\
// 		varying vec3 pixelNormal;\
// 		\
// 		void main( void ) {\
// 			\
// 			float shade = (\
// 				  3.0 * pow ( abs ( pixelNormal.y ), 2.0 )\
// 				+ 2.0 * pow ( abs ( pixelNormal.z ), 2.0 )\
// 				+ 1.0 * pow ( abs ( pixelNormal.x ), 2.0 )\
// 			) / 3.0;\
// 			\
// 			gl_FragColor = vec4( color * shade, 1.0 );\
// 			\
// 		}',
//
//     fragmentClipping: '\
// 		uniform vec3 color;\
// 		uniform vec3 clippingLow;\
// 		uniform vec3 clippingHigh;\
// 		\
// 		varying vec3 pixelNormal;\
// 		varying vec4 worldPosition;\
// 		\
// 		void main( void ) {\
// 			\
// 			float shade = (\
// 				  3.0 * pow ( abs ( pixelNormal.y ), 2.0 )\
// 				+ 2.0 * pow ( abs ( pixelNormal.z ), 2.0 )\
// 				+ 1.0 * pow ( abs ( pixelNormal.x ), 2.0 )\
// 			) / 3.0;\
// 			\
// 			if (\
// 				   worldPosition.x < clippingLow.x\
// 				|| worldPosition.x > clippingHigh.x\
// 				|| worldPosition.y < clippingLow.y\
// 				|| worldPosition.y > clippingHigh.y\
// 				|| worldPosition.z < clippingLow.z\
// 				|| worldPosition.z > clippingHigh.z\
// 			) {\
// 				\
// 				discard;\
// 				\
// 			} else {\
// 				\
// 				gl_FragColor = vec4( color * shade, 1.0 );\
// 				\
// 			}\
// 			\
// 		}',
//
//     fragmentClippingFront: '\
// 		uniform vec3 color;\
// 		uniform vec3 clippingLow;\
// 		uniform vec3 clippingHigh;\
// 		\
// 		varying vec3 pixelNormal;\
// 		varying vec4 worldPosition;\
// 		varying vec3 camPosition;\
// 		\
// 		void main( void ) {\
// 			\
// 			float shade = (\
// 				  3.0 * pow ( abs ( pixelNormal.y ), 2.0 )\
// 				+ 2.0 * pow ( abs ( pixelNormal.z ), 2.0 )\
// 				+ 1.0 * pow ( abs ( pixelNormal.x ), 2.0 )\
// 			) / 3.0;\
// 			\
// 			if (\
// 				   worldPosition.x < clippingLow.x  && camPosition.x < clippingLow.x\
// 				|| worldPosition.x > clippingHigh.x && camPosition.x > clippingHigh.x\
// 				|| worldPosition.y < clippingLow.y  && camPosition.y < clippingLow.y\
// 				|| worldPosition.y > clippingHigh.y && camPosition.y > clippingHigh.y\
// 				|| worldPosition.z < clippingLow.z  && camPosition.z < clippingLow.z\
// 				|| worldPosition.z > clippingHigh.z && camPosition.z > clippingHigh.z\
// 			) {\
// 				\
// 				discard;\
// 				\
// 			} else {\
// 				\
// 				gl_FragColor = vec4( color * shade, 1.0 );\
// 				\
// 			}\
// 			\
// 		}',
//
//     invisibleVertexShader: '\
// 		void main() {\
// 			vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\
// 			gl_Position = projectionMatrix * mvPosition;\
// 		}',
//
//     invisibleFragmentShader: '\
// 		void main( void ) {\
// 			gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );\
// 			discard;\
// 		}'
//
// };
//
// CAPS.MATERIAL = {
//
//     sheet: new THREE.ShaderMaterial( {
//         uniforms:       CAPS.UNIFORMS.clipping,
//         vertexShader:   CAPS.SHADER.vertexClipping,
//         fragmentShader: CAPS.SHADER.fragmentClipping
//     } ),
//
//     cap: new THREE.ShaderMaterial( {
//         uniforms:       CAPS.UNIFORMS.caps,
//         vertexShader:   CAPS.SHADER.vertex,
//         fragmentShader: CAPS.SHADER.fragment
//     } ),
//
//     backStencil: new THREE.ShaderMaterial( {
//         uniforms:       CAPS.UNIFORMS.clipping,
//         vertexShader:   CAPS.SHADER.vertexClipping,
//         fragmentShader: CAPS.SHADER.fragmentClippingFront,
//         colorWrite: false,
//         depthWrite: false,
//         side: THREE.BackSide
//     } ),
//
//     frontStencil: new THREE.ShaderMaterial( {
//         uniforms:       CAPS.UNIFORMS.clipping,
//         vertexShader:   CAPS.SHADER.vertexClipping,
//         fragmentShader: CAPS.SHADER.fragmentClippingFront,
//         colorWrite: false,
//         depthWrite: false,
//     } ),
//
//     BoxBackFace:   new THREE.MeshBasicMaterial( { color: 0xEEDDCC, transparent: true } ),
//     BoxWireframe:  new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 2 } ),
//     BoxWireActive: new THREE.LineBasicMaterial( { color: 0xf83610, linewidth: 4 } ),
//
//     Invisible: new THREE.ShaderMaterial( {
//         vertexShader:   CAPS.SHADER.invisibleVertexShader,
//         fragmentShader: CAPS.SHADER.invisibleFragmentShader
//     } )
//
// };
// CAPS.picking = function ( simulation ) {
//
//     var intersected = null;
//     var mouse = new THREE.Vector2();
//     var ray = new THREE.Raycaster();
//
//     var normals = {
//         x1: new THREE.Vector3( -1,  0,  0 ),
//         x2: new THREE.Vector3(  1,  0,  0 ),
//         y1: new THREE.Vector3(  0, -1,  0 ),
//         y2: new THREE.Vector3(  0,  1,  0 ),
//         z1: new THREE.Vector3(  0,  0, -1 ),
//         z2: new THREE.Vector3(  0,  0,  1 )
//     };
//
//     var plane = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100, 4, 4 ), CAPS.MATERIAL.Invisible );
//     simulation.scene.add( plane );
//
//     var targeting = function ( event ) {
//
//         mouse.setToNormalizedDeviceCoordinates( event, window );
//
//         ray.setFromCamera( mouse, simulation.camera );
//
//         var intersects = ray.intersectObjects( simulation.selection.selectables );
//
//         if ( intersects.length > 0 ) {
//
//             var candidate = intersects[ 0 ].object;
//
//             if ( intersected !== candidate ) {
//
//                 if ( intersected !== null ) {
//                     intersected.guardian.rayOut();
//                 }
//
//                 candidate.guardian.rayOver();
//
//                 intersected = candidate;
//
//                 simulation.renderer.domElement.style.cursor = 'pointer';
//                 simulation.throttledRender();
//
//             }
//
//         } else if ( intersected !== null ) {
//
//             intersected.guardian.rayOut();
//             intersected = null;
//
//             simulation.renderer.domElement.style.cursor = 'auto';
//             simulation.throttledRender();
//
//         }
//
//     };
//
//     var beginDrag = function ( event ) {
//
//         mouse.setToNormalizedDeviceCoordinates( event, window );
//
//         ray.setFromCamera( mouse, simulation.camera );
//
//         var intersects = ray.intersectObjects( simulation.selection.selectables );
//
//         if ( intersects.length > 0 ) {
//
//             event.preventDefault();
//             event.stopPropagation();
//
//             simulation.controls.enabled = false;
//
//             var intersectionPoint = intersects[ 0 ].point;
//
//             var axis = intersects[ 0 ].object.axis;
//
//             if ( axis === 'x1' || axis === 'x2' ) {
//                 intersectionPoint.setX( 0 );
//             } else if ( axis === 'y1' || axis === 'y2' ) {
//                 intersectionPoint.setY( 0 );
//             } else if ( axis === 'z1' || axis === 'z2' ) {
//                 intersectionPoint.setZ( 0 );
//             }
//             plane.position.copy( intersectionPoint );
//
//             var newNormal = simulation.camera.position.clone().sub(
//                 simulation.camera.position.clone().projectOnVector( normals[ axis ] )
//             );
//             plane.lookAt( newNormal.add( intersectionPoint ) );
//
//             simulation.renderer.domElement.style.cursor = 'move';
//             simulation.throttledRender();
//
//             var continueDrag = function ( event ) {
//
//                 event.preventDefault();
//                 event.stopPropagation();
//
//                 mouse.setToNormalizedDeviceCoordinates( event, window );
//
//                 ray.setFromCamera( mouse, simulation.camera );
//
//                 var intersects = ray.intersectObject( plane );
//
//                 if ( intersects.length > 0 ) {
//
//                     if ( axis === 'x1' || axis === 'x2' ) {
//                         value = intersects[ 0 ].point.x;
//                     } else if ( axis === 'y1' || axis === 'y2' ) {
//                         value = intersects[ 0 ].point.y;
//                     } else if ( axis === 'z1' || axis === 'z2' ) {
//                         value = intersects[ 0 ].point.z;
//                     }
//
//                     simulation.selection.setValue( axis, value );
//                     simulation.throttledRender();
//
//                 }
//
//             };
//
//             var endDrag = function ( event ) {
//
//                 simulation.controls.enabled = true;
//
//                 simulation.renderer.domElement.style.cursor = 'pointer';
//
//                 document.removeEventListener( 'mousemove',   continueDrag, true );
//                 document.removeEventListener( 'touchmove',   continueDrag, true );
//
//                 document.removeEventListener( 'mouseup',     endDrag, false );
//                 document.removeEventListener( 'touchend',    endDrag, false );
//                 document.removeEventListener( 'touchcancel', endDrag, false );
//                 document.removeEventListener( 'touchleave',  endDrag, false );
//
//             };
//
//             document.addEventListener( 'mousemove', continueDrag, true );
//             document.addEventListener( 'touchmove', continueDrag, true );
//
//             document.addEventListener( 'mouseup',     endDrag, false );
//             document.addEventListener( 'touchend',    endDrag, false );
//             document.addEventListener( 'touchcancel', endDrag, false );
//             document.addEventListener( 'touchleave',  endDrag, false );
//
//         }
//
//     };
//
//     simulation.renderer.domElement.addEventListener( 'mousemove',  targeting, true );
//     simulation.renderer.domElement.addEventListener( 'mousedown',  beginDrag, false );
//     simulation.renderer.domElement.addEventListener( 'touchstart', beginDrag, false );
//
// };
// CAPS.PlaneGeometry = function ( v0, v1, v2, v3 ) {
//
//     THREE.Geometry.call( this );
//
//     this.vertices.push( v0, v1, v2, v3 );
//     this.faces.push( new THREE.Face3( 0, 1, 2 ) );
//     this.faces.push( new THREE.Face3( 0, 2, 3 ) );
//
//     this.computeFaceNormals();
//     this.computeVertexNormals();
//
// };
//
// CAPS.PlaneGeometry.prototype = new THREE.Geometry();
// CAPS.PlaneGeometry.prototype.constructor = CAPS.PlaneGeometry;
// CAPS.SCHEDULE = {
//
//     postpone: function ( callback, context, wait ) {
//
//         return function () {
//             setTimeout( function () {
//                 callback.apply( context, arguments );
//             }, wait );
//         };
//
//     },
//
//     deferringThrottle: function ( callback, context, wait ) { // wait 60 = 16fps // wait 40 = 25fps // wait 20 = 50fps
//
//         var execute = function ( arguments ) {
//             callback.apply( context, arguments );
//             setTimeout( function () {
//                 if ( deferredCalls ) {
//                     deferredCalls = false;
//                     execute( args );
//                 } else {
//                     blocked = false;
//                 }
//             }, wait );
//         };
//
//         var blocked = false;
//         var deferredCalls = false;
//         var args = undefined;
//
//         return function () {
//             if ( blocked ) {
//                 args = arguments;
//                 deferredCalls = true;
//                 return;
//             } else {
//                 blocked = true;
//                 deferredCalls = false;
//                 execute( arguments );
//             }
//         };
//
//     }
//
// };
// CAPS.Selection = function ( low, high ) {
//
//     this.limitLow = low;
//     this.limitHigh = high;
//
//     this.box = new THREE.BoxGeometry( 1, 1, 1 );
//     this.boxMesh = new THREE.Mesh( this.box, CAPS.MATERIAL.cap );
//
//     this.vertices = [
//         new THREE.Vector3(), new THREE.Vector3(),
//         new THREE.Vector3(), new THREE.Vector3(),
//         new THREE.Vector3(), new THREE.Vector3(),
//         new THREE.Vector3(), new THREE.Vector3()
//     ];
//     this.updateVertices();
//
//     var v = this.vertices;
//
//     this.touchMeshes = new THREE.Object3D();
//     this.displayMeshes = new THREE.Object3D();
//     this.meshGeometries = [];
//     this.lineGeometries = [];
//     this.selectables = [];
//
//     this.faces = [];
//     var f = this.faces;
//     this.faces.push( new CAPS.SelectionBoxFace( 'y1', v[ 0 ], v[ 1 ], v[ 5 ], v[ 4 ], this ) );
//     this.faces.push( new CAPS.SelectionBoxFace( 'z1', v[ 0 ], v[ 2 ], v[ 3 ], v[ 1 ], this ) );
//     this.faces.push( new CAPS.SelectionBoxFace( 'x1', v[ 0 ], v[ 4 ], v[ 6 ], v[ 2 ], this ) );
//     this.faces.push( new CAPS.SelectionBoxFace( 'x2', v[ 7 ], v[ 5 ], v[ 1 ], v[ 3 ], this ) );
//     this.faces.push( new CAPS.SelectionBoxFace( 'y2', v[ 7 ], v[ 3 ], v[ 2 ], v[ 6 ], this ) );
//     this.faces.push( new CAPS.SelectionBoxFace( 'z2', v[ 7 ], v[ 6 ], v[ 4 ], v[ 5 ], this ) );
//
//     var l0  = new CAPS.SelectionBoxLine( v[ 0 ], v[ 1 ], f[ 0 ], f[ 1 ], this );
//     var l1  = new CAPS.SelectionBoxLine( v[ 0 ], v[ 2 ], f[ 1 ], f[ 2 ], this );
//     var l2  = new CAPS.SelectionBoxLine( v[ 0 ], v[ 4 ], f[ 0 ], f[ 2 ], this );
//     var l3  = new CAPS.SelectionBoxLine( v[ 1 ], v[ 3 ], f[ 1 ], f[ 3 ], this );
//     var l4  = new CAPS.SelectionBoxLine( v[ 1 ], v[ 5 ], f[ 0 ], f[ 3 ], this );
//     var l5  = new CAPS.SelectionBoxLine( v[ 2 ], v[ 3 ], f[ 1 ], f[ 4 ], this );
//     var l6  = new CAPS.SelectionBoxLine( v[ 2 ], v[ 6 ], f[ 2 ], f[ 4 ], this );
//     var l7  = new CAPS.SelectionBoxLine( v[ 3 ], v[ 7 ], f[ 3 ], f[ 4 ], this );
//     var l8  = new CAPS.SelectionBoxLine( v[ 4 ], v[ 5 ], f[ 0 ], f[ 5 ], this );
//     var l9  = new CAPS.SelectionBoxLine( v[ 4 ], v[ 6 ], f[ 2 ], f[ 5 ], this );
//     var l10 = new CAPS.SelectionBoxLine( v[ 5 ], v[ 7 ], f[ 3 ], f[ 5 ], this );
//     var l11 = new CAPS.SelectionBoxLine( v[ 6 ], v[ 7 ], f[ 4 ], f[ 5 ], this );
//
//     this.setBox();
//     this.setUniforms();
//
// };
//
// CAPS.Selection.prototype = {
//
//     constructor: CAPS.Selection,
//
//     updateVertices: function () {
//
//         this.vertices[ 0 ].set( this.limitLow.x,  this.limitLow.y,  this.limitLow.z );
//         this.vertices[ 1 ].set( this.limitHigh.x, this.limitLow.y,  this.limitLow.z );
//         this.vertices[ 2 ].set( this.limitLow.x,  this.limitHigh.y, this.limitLow.z );
//         this.vertices[ 3 ].set( this.limitHigh.x, this.limitHigh.y, this.limitLow.z );
//         this.vertices[ 4 ].set( this.limitLow.x,  this.limitLow.y,  this.limitHigh.z );
//         this.vertices[ 5 ].set( this.limitHigh.x, this.limitLow.y,  this.limitHigh.z );
//         this.vertices[ 6 ].set( this.limitLow.x,  this.limitHigh.y, this.limitHigh.z );
//         this.vertices[ 7 ].set( this.limitHigh.x, this.limitHigh.y, this.limitHigh.z );
//
//     },
//
//     updateGeometries: function () {
//
//         for ( var i = 0; i < this.meshGeometries.length; i++ ) {
//             this.meshGeometries[ i ].verticesNeedUpdate = true;
//             this.meshGeometries[ i ].computeBoundingSphere();
//             this.meshGeometries[ i ].computeBoundingBox();
//         }
//         for ( var i = 0; i < this.lineGeometries.length; i++ ) {
//             this.lineGeometries[ i ].verticesNeedUpdate = true;
//         }
//
//     },
//
//     setBox: function () {
//
//         var width = new THREE.Vector3();
//         width.subVectors( this.limitHigh, this.limitLow );
//
//         this.boxMesh.scale.copy( width );
//         width.multiplyScalar( 0.5 ).add( this.limitLow );
//         this.boxMesh.position.copy( width );
//
//     },
//
//     setUniforms: function () {
//
//         var uniforms = CAPS.UNIFORMS.clipping;
//         uniforms.clippingLow.value.copy(  this.limitLow );
//         uniforms.clippingHigh.value.copy( this.limitHigh );
//
//     },
//
//     setValue: function ( axis, value ) {
//
//         var buffer = 0.4;
//         var limit = 14;
//
//         if ( axis === 'x1' ) {
//             this.limitLow.x = Math.max( -limit, Math.min( this.limitHigh.x-buffer, value ) );
//         } else if ( axis === 'x2' ) {
//             this.limitHigh.x = Math.max( this.limitLow.x+buffer, Math.min( limit, value ) );
//         } else if ( axis === 'y1' ) {
//             this.limitLow.y = Math.max( -limit, Math.min( this.limitHigh.y-buffer, value ) );
//         } else if ( axis === 'y2' ) {
//             this.limitHigh.y = Math.max( this.limitLow.y+buffer, Math.min( limit, value ) );
//         } else if ( axis === 'z1' ) {
//             this.limitLow.z = Math.max( -limit, Math.min( this.limitHigh.z-buffer, value ) );
//         } else if ( axis === 'z2' ) {
//             this.limitHigh.z = Math.max( this.limitLow.z+buffer, Math.min( limit, value ) );
//         }
//
//         this.setBox();
//         this.setUniforms();
//
//         this.updateVertices();
//         this.updateGeometries();
//
//     }
//
// };
// CAPS.SelectionBoxFace = function ( axis, v0, v1, v2, v3, selection ) {
//
//     var frontFaceGeometry = new CAPS.PlaneGeometry( v0, v1, v2, v3 );
//     frontFaceGeometry.dynamic = true;
//     selection.meshGeometries.push( frontFaceGeometry );
//
//     var frontFaceMesh = new THREE.Mesh( frontFaceGeometry, CAPS.MATERIAL.Invisible );
//     frontFaceMesh.axis = axis;
//     frontFaceMesh.guardian = this;
//     selection.touchMeshes.add( frontFaceMesh );
//     selection.selectables.push( frontFaceMesh );
//
//     var backFaceGeometry = new CAPS.PlaneGeometry( v3, v2, v1, v0 );
//     backFaceGeometry.dynamic = true;
//     selection.meshGeometries.push( backFaceGeometry );
//
//     var backFaceMesh = new THREE.Mesh( backFaceGeometry, CAPS.MATERIAL.BoxBackFace );
//     selection.displayMeshes.add( backFaceMesh );
//
//     this.lines = new Array();
//
// };
//
// CAPS.SelectionBoxFace.prototype = {
//
//     constructor: CAPS.SelectionBoxFace,
//
//     rayOver: function () {
//         this.highlightLines( true );
//     },
//
//     rayOut: function () {
//         this.highlightLines( false );
//     },
//
//     highlightLines: function ( b ) {
//         for ( var i = 0; i < this.lines.length; i++ ) {
//             this.lines[ i ].setHighlight( b );
//         }
//     }
//
// };
//
// CAPS.SelectionBoxLine = function ( v0, v1, f0, f1, selection ) {
//
//     var lineGeometry = new THREE.Geometry();
//     lineGeometry.vertices.push( v0, v1 );
//     lineGeometry = new THREE.Line(lineGeometry).computeLineDistances();
//     // lineGeometry.Line.computeLineDistances();
//     lineGeometry.dynamic = true;
//     selection.lineGeometries.push( lineGeometry );
//
//     this.line = new THREE.LineSegments( lineGeometry, CAPS.MATERIAL.BoxWireframe );
//     selection.displayMeshes.add( this.line );
//
//     f0.lines.push( this );
//     f1.lines.push( this );
//
// };
//
// CAPS.SelectionBoxLine.prototype = {
//
//     constructor: CAPS.SelectionBoxLine,
//
//     setHighlight: function ( b ) {
//         this.line.material = b ? CAPS.MATERIAL.BoxWireActive : CAPS.MATERIAL.BoxWireframe;
//     }
//
// };


THREE.OutlinePass = function (resolution, scene, camera, selectedObjects) {

    this.renderScene = scene;
    this.renderCamera = camera;
    this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
    this.visibleEdgeColor = new THREE.Color(1, 1, 1);
    this.hiddenEdgeColor = new THREE.Color(1, 1, 1)
    this.edgeGlow = 1;
    this.usePatternTexture = true;
    this.edgeThickness = 1.5;
    this.edgeStrength = 1;
    this.downSampleRatio = 2;
    this.pulsePeriod = 2;

    THREE.Pass.call(this);

    this.resolution = (resolution !== undefined) ? new THREE.Vector2(resolution.x,
        resolution.y) : new THREE.Vector2(256, 256);

    var pars = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    };

    var resx = Math.round(this.resolution.x / this.downSampleRatio);
    var resy = Math.round(this.resolution.y / this.downSampleRatio);

    this.maskBufferMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    this.maskBufferMaterial.side = THREE.DoubleSide;
    this.renderTargetMaskBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution
        .y, pars);
    this.renderTargetMaskBuffer.texture.name = "OutlinePass.mask";
    this.renderTargetMaskBuffer.texture.generateMipmaps = false;

    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.side = THREE.DoubleSide;
    this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
    this.depthMaterial.blending = THREE.NoBlending;

    this.prepareMaskMaterial = this.getPrepareMaskMaterial();
    this.prepareMaskMaterial.side = THREE.DoubleSide;

    this.renderTargetDepthBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution
        .y, pars);
    this.renderTargetDepthBuffer.texture.name = "OutlinePass.depth";
    this.renderTargetDepthBuffer.texture.generateMipmaps = false;

    this.renderTargetMaskDownSampleBuffer = new THREE.WebGLRenderTarget(resx, resy, pars);
    this.renderTargetMaskDownSampleBuffer.texture.name = "OutlinePass.depthDownSample";
    this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps = false;

    this.renderTargetBlurBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
    this.renderTargetBlurBuffer1.texture.name = "OutlinePass.blur1";
    this.renderTargetBlurBuffer1.texture.generateMipmaps = false;
    this.renderTargetBlurBuffer2 = new THREE.WebGLRenderTarget(Math.round(resx / 2), Math.round(
        resy / 2), pars);
    this.renderTargetBlurBuffer2.texture.name = "OutlinePass.blur2";
    this.renderTargetBlurBuffer2.texture.generateMipmaps = false;

    this.edgeDetectionMaterial = this.getEdgeDetectionMaterial();
    this.renderTargetEdgeBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
    this.renderTargetEdgeBuffer1.texture.name = "OutlinePass.edge1";
    this.renderTargetEdgeBuffer1.texture.generateMipmaps = false;
    this.renderTargetEdgeBuffer2 = new THREE.WebGLRenderTarget(Math.round(resx / 2), Math.round(
        resy / 2), pars);
    this.renderTargetEdgeBuffer2.texture.name = "OutlinePass.edge2";
    this.renderTargetEdgeBuffer2.texture.generateMipmaps = false;

    var MAX_EDGE_THICKNESS = 4;
    var MAX_EDGE_GLOW = 4;

    this.separableBlurMaterial1 = this.getSeperableBlurMaterial(MAX_EDGE_THICKNESS);
    this.separableBlurMaterial1.uniforms["texSize"].value = new THREE.Vector2(resx, resy);
    this.separableBlurMaterial1.uniforms["kernelRadius"].value = 1;
    this.separableBlurMaterial2 = this.getSeperableBlurMaterial(MAX_EDGE_GLOW);
    this.separableBlurMaterial2.uniforms["texSize"].value = new THREE.Vector2(Math.round(
        resx / 2), Math.round(resy / 2));
    this.separableBlurMaterial2.uniforms["kernelRadius"].value = MAX_EDGE_GLOW;

    // Overlay material
    this.overlayMaterial = this.getOverlayMaterial();

    // copy material
    if (THREE.CopyShader === undefined)
        console.error("THREE.OutlinePass relies on THREE.CopyShader");

    var copyShader = THREE.CopyShader;

    this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
    this.copyUniforms["opacity"].value = 1.0;

    this.materialCopy = new THREE.ShaderMaterial({
        uniforms: this.copyUniforms,
        vertexShader: copyShader.vertexShader,
        fragmentShader: copyShader.fragmentShader,
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true
    });

    this.enabled = true;
    this.needsSwap = false;

    this.oldClearColor = new THREE.Color();
    this.oldClearAlpha = 1;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
    this.quad.frustumCulled = false; // Avoid getting clipped
    this.scene.add(this.quad);

    this.pulseWeight = 1.0;
    //this.tempPulseColor1 = new THREE.Color();
    //this.tempPulseColor2 = new THREE.Color();
    this.textureMatrix = new THREE.Matrix4();

};

THREE.OutlinePass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

    constructor: THREE.OutlinePass,

    dispose: function () {

        this.renderTargetMaskBuffer.dispose();
        this.renderTargetDepthBuffer.dispose();
        this.renderTargetMaskDownSampleBuffer.dispose();
        this.renderTargetBlurBuffer1.dispose();
        this.renderTargetBlurBuffer2.dispose();
        this.renderTargetEdgeBuffer1.dispose();
        this.renderTargetEdgeBuffer2.dispose();

    },

    setSize: function (width, height) {

        this.renderTargetMaskBuffer.setSize(width, height);

        var resx = Math.round(width / this.downSampleRatio);
        var resy = Math.round(height / this.downSampleRatio);
        this.renderTargetMaskDownSampleBuffer.setSize(resx, resy);
        this.renderTargetBlurBuffer1.setSize(resx, resy);
        this.renderTargetEdgeBuffer1.setSize(resx, resy);
        this.separableBlurMaterial1.uniforms["texSize"].value = new THREE.Vector2(
            resx, resy);

        resx = Math.round(resx / 2);
        resy = Math.round(resy / 2);

        this.renderTargetBlurBuffer2.setSize(resx, resy);
        this.renderTargetEdgeBuffer2.setSize(resx, resy);

        this.separableBlurMaterial2.uniforms["texSize"].value = new THREE.Vector2(
            resx, resy);

    },

    changeVisibilityOfSelectedObjects: function (bVisible) {

        function gatherSelectedMeshesCallBack(object) {

            if (object instanceof THREE.Mesh) object.visible = bVisible;

        }

        for (var i = 0; i < this.selectedObjects.length; i++) {

            var selectedObject = this.selectedObjects[i];
            selectedObject.traverse(gatherSelectedMeshesCallBack);

        }

    },

    changeVisibilityOfNonSelectedObjects: function (bVisible) {

        var selectedMeshes = [];

        function gatherSelectedMeshesCallBack(object) {

            if (object instanceof THREE.Mesh) selectedMeshes.push(object);

        }

        for (var i = 0; i < this.selectedObjects.length; i++) {

            var selectedObject = this.selectedObjects[i];
            selectedObject.traverse(gatherSelectedMeshesCallBack);

        }

        function VisibilityChangeCallBack(object) {

            if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE
                .Sprite) {

                var bFound = false;

                for (var i = 0; i < selectedMeshes.length; i++) {

                    var selectedObjectId = selectedMeshes[i].id;

                    if (selectedObjectId === object.id) {

                        bFound = true;
                        break;

                    }

                }

                if (!bFound) {

                    var visibility = object.visible;

                    if (!bVisible || object.bVisible) object.visible = bVisible;

                    object.bVisible = visibility;

                }

            }

        }

        this.renderScene.traverse(VisibilityChangeCallBack);

    },

    updateTextureMatrix: function () {

        this.textureMatrix.set(0.5, 0.0, 0.0, 0.5,
            0.0, 0.5, 0.0, 0.5,
            0.0, 0.0, 0.5, 0.5,
            0.0, 0.0, 0.0, 1.0);
        this.textureMatrix.multiply(this.renderCamera.projectionMatrix);
        this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse);

    },

    render: function (renderer, writeBuffer, readBuffer, delta, maskActive) {

        if (this.selectedObjects.length === 0) return;

        this.oldClearColor.copy(renderer.getClearColor());
        this.oldClearAlpha = renderer.getClearAlpha();
        var oldAutoClear = renderer.autoClear;

        renderer.autoClear = false;

        if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);

        renderer.setClearColor(0xffffff, 1);


        // Make selected objects invisible
        this.changeVisibilityOfSelectedObjects(false);

        var currentBackground = this.renderScene.background;
        this.renderScene.background = null;


        // 1. Draw Non Selected objects in the depth buffer
        this.renderScene.overrideMaterial = this.depthMaterial;
        renderer.render(this.renderScene, this.renderCamera, this.renderTargetDepthBuffer,
            true);

        // Make selected objects visible
        this.changeVisibilityOfSelectedObjects(true);

        // Update Texture Matrix for Depth compare
        this.updateTextureMatrix();

        // Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects
        this.changeVisibilityOfNonSelectedObjects(false);
        this.renderScene.overrideMaterial = this.prepareMaskMaterial;
        this.prepareMaskMaterial.uniforms["cameraNearFar"].value = new THREE.Vector2(
            this.renderCamera.near, this.renderCamera.far);
        this.prepareMaskMaterial.uniforms["depthTexture"].value = this.renderTargetDepthBuffer
            .texture;
        this.prepareMaskMaterial.uniforms["textureMatrix"].value = this.textureMatrix;
        renderer.render(this.renderScene, this.renderCamera, this.renderTargetMaskBuffer,
            true);
        this.renderScene.overrideMaterial = null;
        this.changeVisibilityOfNonSelectedObjects(true);

        this.renderScene.background = currentBackground;

        // 2. Downsample to Half resolution
        this.quad.material = this.materialCopy;
        this.copyUniforms["tDiffuse"].value = this.renderTargetMaskBuffer.texture;


        renderer.render(this.scene, this.camera, this.renderTargetMaskDownSampleBuffer,
            true);

        //this.tempPulseColor1.copy( this.visibleEdgeColor );
        //this.tempPulseColor2.copy( this.hiddenEdgeColor );

        if (this.pulsePeriod > 0) {

            var scalar = (1 + 0.25) / 2 + Math.cos(performance.now() * 0.01 / this.pulsePeriod) *
                (1.0 - 0.25) / 2;
            this.pulseWeight = scalar;
            //this.tempPulseColor1.multiplyScalar( scalar );
            //this.tempPulseColor2.multiplyScalar( scalar );

        }

        // 3. Apply Edge Detection Pass
        this.quad.material = this.edgeDetectionMaterial;
        this.edgeDetectionMaterial.uniforms["maskTexture"].value = this.renderTargetMaskDownSampleBuffer
            .texture;
        this.edgeDetectionMaterial.uniforms["texSize"].value = new THREE.Vector2(
            this.renderTargetMaskDownSampleBuffer.width, this.renderTargetMaskDownSampleBuffer
                .height);
        this.edgeDetectionMaterial.uniforms["visibleEdgeColor"].value = this.visibleEdgeColor;
        this.edgeDetectionMaterial.uniforms["hiddenEdgeColor"].value = this.hiddenEdgeColor;
        renderer.render(this.scene, this.camera, this.renderTargetEdgeBuffer1, true);

        // 4. Apply Blur on Half res
        this.quad.material = this.separableBlurMaterial1;
        this.separableBlurMaterial1.uniforms["colorTexture"].value = this.renderTargetEdgeBuffer1
            .texture;
        this.separableBlurMaterial1.uniforms["direction"].value = THREE.OutlinePass.BlurDirectionX;
        this.separableBlurMaterial1.uniforms["kernelRadius"].value = this.edgeThickness;
        renderer.render(this.scene, this.camera, this.renderTargetBlurBuffer1, true);
        this.separableBlurMaterial1.uniforms["colorTexture"].value = this.renderTargetBlurBuffer1
            .texture;
        this.separableBlurMaterial1.uniforms["direction"].value = THREE.OutlinePass.BlurDirectionY;
        renderer.render(this.scene, this.camera, this.renderTargetEdgeBuffer1, true);

        // Apply Blur on quarter res
        this.quad.material = this.separableBlurMaterial2;
        this.separableBlurMaterial2.uniforms["colorTexture"].value = this.renderTargetEdgeBuffer1
            .texture;
        this.separableBlurMaterial2.uniforms["direction"].value = THREE.OutlinePass.BlurDirectionX;
        renderer.render(this.scene, this.camera, this.renderTargetBlurBuffer2, true);
        this.separableBlurMaterial2.uniforms["colorTexture"].value = this.renderTargetBlurBuffer2
            .texture;
        this.separableBlurMaterial2.uniforms["direction"].value = THREE.OutlinePass.BlurDirectionY;
        renderer.render(this.scene, this.camera, this.renderTargetEdgeBuffer2, true);

        // Blend it additively over the input texture
        this.quad.material = this.overlayMaterial;
        this.overlayMaterial.uniforms["maskTexture"].value = this.renderTargetMaskBuffer
            .texture;
        this.overlayMaterial.uniforms["edgeTexture1"].value = this.renderTargetEdgeBuffer1
            .texture;
        this.overlayMaterial.uniforms["edgeTexture2"].value = this.renderTargetEdgeBuffer2
            .texture;
        this.overlayMaterial.uniforms["patternTexture"].value = this.patternTexture;
        this.overlayMaterial.uniforms["edgeStrength"].value = this.edgeStrength;// 3;
        this.overlayMaterial.uniforms["edgeGlow"].value = this.edgeGlow; // 1;
        this.overlayMaterial.uniforms["usePatternTexture"].value = true;
        this.overlayMaterial.uniforms["visibleEdgeColor"].value = this.visibleEdgeColor;
        this.overlayMaterial.uniforms["hiddenEdgeColor"].value = this.hiddenEdgeColor;
        this.overlayMaterial.uniforms["pulseWeight"].value = this.pulseWeight;


        if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);

        renderer.render(this.scene, this.camera, readBuffer, false);

        renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
        renderer.autoClear = oldAutoClear;

    },

    getPrepareMaskMaterial: function () {

        return new THREE.ShaderMaterial({

            uniforms: {
                "depthTexture": {
                    value: null
                },
                "cameraNearFar": {
                    value: new THREE.Vector2(0.5, 0.5)
                },
                "textureMatrix": {
                    value: new THREE.Matrix4()
                }
            },

            vertexShader: "varying vec2 vUv;\
				varying vec4 projTexCoord;\
				varying vec4 vPosition;\
				uniform mat4 textureMatrix;\
				void main() {\
					vUv = uv;\
					vPosition = modelViewMatrix * vec4( position, 1.0 );\
					vec4 worldPosition = modelMatrix * vec4( position, 1.0 );\
					projTexCoord = textureMatrix * worldPosition;\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",

            fragmentShader: "#include <packing>\
				varying vec2 vUv;\
				varying vec4 vPosition;\
				varying vec4 projTexCoord;\
				uniform sampler2D depthTexture;\
				uniform vec2 cameraNearFar;\
				\
				void main() {\
					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));\
					float viewZ = -perspectiveDepthToViewZ( depth, cameraNearFar.x, cameraNearFar.y );\
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;\
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);\
				}"
        });

    },

    getEdgeDetectionMaterial: function () {

        return new THREE.ShaderMaterial({

            uniforms: {
                "maskTexture": {
                    value: null
                },
                "texSize": {
                    value: new THREE.Vector2(0.5, 0.5)
                },
                "visibleEdgeColor": {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
                "hiddenEdgeColor": {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
            },

            vertexShader: "varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",

            fragmentShader: "varying vec2 vUv;\
				uniform sampler2D maskTexture;\
				uniform vec2 texSize;\
				uniform vec3 visibleEdgeColor;\
				uniform vec3 hiddenEdgeColor;\
				\
				void main() {\n\
					vec2 invSize = 1.0 / texSize;\
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);\
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);\
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);\
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);\
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);\
					float diff1 = (c1.r - c2.r)*0.5;\
					float diff2 = (c3.r - c4.r)*0.5;\
					float d = length( vec2(diff1, diff2) );\
					float a1 = min(c1.g, c2.g);\
					float a2 = min(c3.g, c4.g);\
					float visibilityFactor = min(a1, a2);\
					vec3 visible = vec3(1.0, 0.0, 0.0);\
					vec3 hidden = vec3(0.0, 1.0, 0.0);\
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visible : hidden;\
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);\
				}"
        });

    },

    getSeperableBlurMaterial: function (maxRadius) {

        return new THREE.ShaderMaterial({

            defines: {
                "MAX_RADIUS": maxRadius,
            },

            uniforms: {
                "colorTexture": {
                    value: null
                },
                "texSize": {
                    value: new THREE.Vector2(0.5, 0.5)
                },
                "direction": {
                    value: new THREE.Vector2(0.5, 0.5)
                },
                "kernelRadius": {
                    value: 1.0
                }
            },

            vertexShader: "varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",

            fragmentShader: "#include <common>\
				varying vec2 vUv;\
				uniform sampler2D colorTexture;\
				uniform vec2 texSize;\
				uniform vec2 direction;\
				uniform float kernelRadius;\
				\
				float gaussianPdf(in float x, in float sigma) {\
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\
				}\
				void main() {\
					vec2 invSize = 1.0 / texSize;\
					float weightSum = gaussianPdf(0.0, kernelRadius);\
					vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;\
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);\
					vec2 uvOffset = delta;\
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {\
						float w = gaussianPdf(uvOffset.x, kernelRadius);\
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;\
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;\
						diffuseSum += ((sample1 + sample2) * w);\
						weightSum += (2.0 * w);\
						uvOffset += delta;\
					}\
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);\
				}"
        });

    },

    getOverlayMaterial: function () {

        return new THREE.ShaderMaterial({

            uniforms: {
                "maskTexture": {
                    value: null
                },
                "edgeTexture1": {
                    value: null
                },
                "edgeTexture2": {
                    value: null
                },
                "patternTexture": {
                    value: null
                },
                "edgeStrength": {
                    value: 1.0
                },
                "edgeGlow": {
                    value: 1.0
                },
                "usePatternTexture": {
                    value: 1.0
                },
                "visibleEdgeColor": {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
                "hiddenEdgeColor": {
                    value: new THREE.Vector3(1.0, 1.0, 1.0)
                },
                "pulseWeight": {
                    value: 1.0
                }
            },

            vertexShader: "varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",

            fragmentShader: "varying vec2 vUv;\
				uniform sampler2D maskTexture;\
				uniform sampler2D edgeTexture1;\
				uniform sampler2D edgeTexture2;\
				uniform sampler2D patternTexture;\
				uniform float edgeStrength;\
				uniform float edgeGlow;\
				uniform bool usePatternTexture;\
				uniform vec3 visibleEdgeColor;\
				uniform vec3 hiddenEdgeColor;\
        uniform float pulseWeight;\
				\
				void main() {\
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);\
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);\
					vec4 maskColor = texture2D(maskTexture, vUv);\
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);\
          float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;\
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;\
					vec4 colorWeights = edgeStrength * maskColor.r * edgeValue;\
					float alpha = (colorWeights.r + colorWeights.g) * pulseWeight;\
          float norm = 0.0;\
					if (alpha!=0.0)\
						norm = 1.0 / alpha;\
					vec3 visiblePart = visibleEdgeColor * norm * colorWeights.r;\
					vec3 hiddenPart = hiddenEdgeColor * norm * colorWeights.g;\
					vec4 finalColor = vec4(visiblePart+hiddenPart, alpha);\
          if(usePatternTexture)\
						finalColor +=  (1.0 - maskColor.r) * (1.0 - patternColor.r);\
					gl_FragColor = finalColor;\
				}",
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            transparent: true
        });

    }

});

THREE.OutlinePass.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
THREE.OutlinePass.BlurDirectionY = new THREE.Vector2(0.0, 1.0);


// function outlineObject(object, view){
//
//
//     const geometry = object.geometry;
//     const position = object.position;
//
//     const outlineMaterial1 = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.BackSide } );
//     const outlineMesh1 = new THREE.Mesh( geometry, outlineMaterial1 );
//
//     outlineMesh1.position = position;
//     outlineMesh1.scale.multiplyScalar(1.05);
//
//     view.scene.add( outlineMesh1 );
//
// }


let assert = global.assert || function (condition, message) {
    if (!condition) {
        throw new Error(message);
    }
};

const GeomTools = {

    boundingBox: function (obj) {
        let me = this;
        if (obj instanceof THREE.Mesh) {

            const geometry = obj.geometry;
            geometry.computeBoundingBox();
            return geometry.boundingBox;
        }

        if (obj instanceof THREE.Object3D) {

            const bb = new THREE.Box3();
            for (let i = 0; i < obj.children.length; i++) {
                bb.union(me.boundingBox(obj.children[i]));
            }
            return bb;
        }
    },
    shapeCenterOfGravity: function (obj) {
        const me = this;
        return me.boundingBox(obj).getCenter();
    },

    makeGrid: function () {

        return new LabeledGrid(100, 100, 10,[0,0,1], 0x000055, 0.2,  true, "#000000", "left");

    },


    setVertices: function (bbox, vertices) {

        vertices[0].x = bbox.max.x;
        vertices[0].y = bbox.max.y;
        vertices[0].z = bbox.max.z;

        vertices[1].x = bbox.max.x;
        vertices[1].y = bbox.max.y;
        vertices[1].z = bbox.min.z;

        vertices[2].x = bbox.max.x;
        vertices[2].y = bbox.min.y;
        vertices[2].z = bbox.max.z;

        vertices[3].x = bbox.max.x;
        vertices[3].y = bbox.min.y;
        vertices[3].z = bbox.min.z;

        vertices[4].x = bbox.min.x;
        vertices[4].y = bbox.max.y;
        vertices[4].z = bbox.min.z;

        vertices[5].x = bbox.min.x;
        vertices[5].y = bbox.max.y;
        vertices[5].z = bbox.max.z;

        vertices[6].x = bbox.min.x;
        vertices[6].y = bbox.min.y;
        vertices[6].z = bbox.min.z;

        vertices[7].x = bbox.min.x;
        vertices[7].y = bbox.min.y;
        vertices[7].z = bbox.max.z;
    }
};


let use_CombinedCamera = false;
let selectedObjects = [];


// function checkIntersection() {
//     const raycaster = new THREE.Raycaster();
//     const mouse = new THREE.Vector2();
//     raycaster.setFromCamera(mouse, this.camera);
//     var intersects = raycaster.intersectObjects([this.scene], true);
//     if (intersects.length > 0) {
//         var selectedObject = intersects[0].object;
//         addSelectedObject(selectedObject);
//         this.outlinePass.selectedObjects = selectedObjects;
//     } else {
//         // outlinePass.selectedObjects = [];
//     }
// }


function setObjectsToCut(me, objectIds, clippingPlanes) {
    const self = me;

    me.scene.getObjectByName("SOLIDS").children.forEach(geom => {
        geom.children.forEach(c => c.children.forEach(cc => cc.material.clippingPlanes = []));
    });

    if (clippingPlanes.length !== 0) {
        objectIds.forEach(objectId => {
            self.scene.getObjectByName("SOLIDS").children.forEach(geom => {
                if (!geom.getObjectByName("id_" + objectId)) {
                    return;
                }
                geom.getObjectByName("id_" + objectId).children.forEach(c => c.material.clippingPlanes = clippingPlanes);
            });
        });
    }

}

function GeomView(container, width, height) {

    width = width || container.offsetWidth;
    height = height || container.offsetHeight;

    const me = this;
    me.container = container;
    me.selectedObjectName = [];
    me.scene = new THREE.Scene();


    // this.capsScene    = undefined;
    // this.backStencil  = undefined;
    // this.frontStencil = undefined;

    this.camera = undefined;
    this.renderer = undefined;
    this.controls = undefined;

    // this.showCaps = true;
    //
    // var throttledRender = CAPS.SCHEDULE.deferringThrottle( this.render3D, this, 40 );
    // this.throttledRender = throttledRender;


    // var canvas = document.getElementById("graphical_view");
    var canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    console.log('canvas ', canvas);

    var ctx = canvas.getContext("2d");
    var grd = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    grd.addColorStop(0, "lightblue");
    grd.addColorStop(.5, "white");
    grd.addColorStop(1, "lightblue");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    var texture = new THREE.CanvasTexture(canvas);

    me.scene.background = texture;


    const ratio = width / height;

    if (use_CombinedCamera) {
        me.camera = new THREE.CombinedCamera(width, height, 70, 1, 10000, -500, 1000);
        me.camera.toOrthographic();
    } else {
        me.camera = new THREE.PerspectiveCamera(35, ratio, 1, 100000);

        me.camera.toXXXView = function (dirView, up) {

            const target = me.getObjectCenter();

            // preserve existing distance
            const dist = target.distanceTo(me.camera.position) || 100;

            const eye = new THREE.Vector3(0, 0, 0);
            eye.copy(dirView);
            eye.multiplyScalar(dist); // distance
            eye.addVectors(target, eye);

            console.log("eye", eye);
            console.log("up", up);
            console.log("dirView", dirView);
            me.camera.position.copy(eye);
            me.camera.up.copy(up);

            // look at is a vector
            me.camera.lookAt(dirView);

        };
        me.camera.toTopView = function () {
            this.toXXXView(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
        };
        me.camera.toBottomView = function () {
            this.toXXXView(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
        };
        me.camera.toFrontView = function () {
            this.toXXXView(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1));
        };
        me.camera.toBackView = function () {
            this.toXXXView(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
        };
        me.camera.toLeftView = function () {
            this.toXXXView(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
        };
        me.camera.toRightView = function () {
            this.toXXXView(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1));
        };
    }

    me.camera.name = "Camera";
    me.camera.position.z = 100;


    me.renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: false
    });

    // TEST clipping plane
    // var globalPlane = new THREE.Plane( new THREE.Vector3( 1, 0, 0 ), 1 );


    me.renderer.gammaInput = true;
    me.renderer.gammaOutput = true;


    me.composer = new THREE.EffectComposer(me.renderer);
    me.renderPass = new THREE.RenderPass(me.scene, me.camera);
    me.composer.addPass(me.renderPass);

    me.outlinePass = new THREE.OutlinePass(new THREE.Vector2(width, height), me.scene, me.camera, selectedObjects);
    me.composer.addPass(me.outlinePass);

    var onLoad = function (texture) {

        me.outlinePass.patternTexture = texture;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

    };
    var loader = new THREE.TextureLoader();
    // loader.load('https://cdn.rawgit.com/mrdoob/three.js/master/examples/textures/tri_pattern.jpg', onLoad);
    loader.load('/images/tri_pattern.jpg', onLoad);

    me.effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    me.effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
    me.effectFXAA.renderToScreen = true;
    me.composer.addPass(me.effectFXAA);


    me.renderer.autoClear = false;
    me.renderer.clear();

    me.renderer.domElement.setAttribute("tabindex", "0");

    container.appendChild(me.renderer.domElement);

    if (use_CombinedCamera) {
        me.controls = new THREE.OrthographicTrackballControls(me.camera, container);
    } else {
        me.controls = new THREE.TrackballControls(me.camera, container);

        me.controls.rotateSpeed = 1.0;
        me.controls.zoomSpeed = 1.2;
        me.controls.panSpeed = 0.8;

        me.controls.noZoom = false;
        me.controls.noPan = false;

        me.controls.staticMoving = true;
        me.controls.dynamicDampingFactor = 0.3;
    }

    me.cameraChanged = false;
    me.controls.addEventListener("change", function () {
        me.cameraChanged = true;
        me.render3D();
    });

    const radius = 1.0;
    me.controls.minDistance = radius * 1.1;
    me.controls.maxDistance = radius * 10000;

    me.controls.keys = [/*A*/65, /*S*/ 83, /*D*/68];


    me.lightContainer = new THREE.Object3D();
    me.lightContainer.matrixWorld = me.camera.matrix;
    me.lightContainer.matrixAutoUpdate = false;

    me.scene.add(me.lightContainer);


    for (let x = -1; x < 2; x = x + 2) {
        for (let y = -1; y < 2; y = y + 2) {
            for (let z = -1; z < 2; z = z + 2) {

                let pointLight = new THREE.PointLight(0xFFFFFF, 0.2);
                pointLight.position.x = 200 * x;
                pointLight.position.y = 200 * y;
                pointLight.position.z = 200 * z;
                pointLight.matrixAutoUpdate = true;

                me.lightContainer.add(pointLight);
                me.lightContainer.add(new THREE.PointLightHelper(pointLight, 1));
            }
        }
    }


    light = new THREE.AmbientLight(0x222222);
    me.lightContainer.add(light);

    let axis = new THREE.AxisHelper(100);
    // note : changing linewidth seems to have no effect ( bug in threejs ?)
    axis.material.linewidth = 15;
    me.scene.add(axis);


    me.intersectionPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(10000, 10000, 8, 8));
    me.ray = new THREE.Raycaster();
    me.offset = new THREE.Vector3();

    me.grid = GeomTools.makeGrid();
    me.scene.add(me.grid);


    me.selectionBox = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: true,
            fog: false
        }));
    me.selectionBox.matrixAutoUpdate = false;
    me.selectionBox.visible = false;
    me.scene.add(me.selectionBox);

    me.selectionAxis = new THREE.AxisHelper(100);
    me.selectionAxis.material.depthTest = false;
    me.selectionAxis.material.transparent = true;
    me.selectionAxis.matrixAutoUpdate = false;
    me.selectionAxis.visible = false;

    me.scene.add(me.selectionAxis);


    let private_bgScene;
    let private_bgCam;
    /**
     *
     */

    // me.capsScene    = new THREE.Scene();
    // me.backStencil  = new THREE.Scene();
    // me.frontStencil = new THREE.Scene();

    // me.selection = new CAPS.Selection(
    //     new THREE.Vector3( -7, -14, -14 ),
    //     new THREE.Vector3( 14,   9,   3 )
    // );
    // me.capsScene.add( me.selection.boxMesh );
    // me.scene.add( me.selection.touchMeshes );
    // me.scene.add( me.selection.displayMeshes );

    me.render3D = function () {

        const me = this;

        me.renderer.localClippingEnabled =
            typeof me.renderer.localClippingEnabled === "boolean"
                ?
                me.renderer.localClippingEnabled : true;

        if (me.renderer.localClippingEnabled) {


            var normal = null;
            me.renderer.clippingAxis = me.renderer.clippingAxis || "Ox";
            if (me.renderer.clippingAxis === "Ox") {

                normal = new THREE.Vector3(1, 0, 0);
            }

            if (me.renderer.clippingAxis === "Oy") {

                normal = new THREE.Vector3(0, 1, 0);
            }

            if (me.renderer.clippingAxis === "Oz") {

                normal = new THREE.Vector3(0, 0, 1);

            }

            if (me.renderer.clippingAxis === "Custom") {

                normal = new THREE.Vector3(me.renderer.xValue, me.renderer.yValue, me.renderer.zValue);

            }

            me.renderer.clippingValue = me.renderer.clippingValue || 0;

            var globalPlane = new THREE.Plane(normal, me.renderer.clippingValue);
            // var globalPlane2 = new THREE.Plane(normal, me.renderer.clippingValue + 2);
            // me.renderer.clippingPlanes = [globalPlane, globalPlane2];
            me.renderer.clipShadows = false;
            if (me.selectedObjectsForCut.length === 0) {
                me.renderer.clippingPlanes = [globalPlane];
                if (me.cartoObjects) {
                    setObjectsToCut(me, me.cartoObjects, []);
                }
            } else {
                me.renderer.clippingPlanes = [];
                setObjectsToCut(me, me.selectedObjectsForCut, [globalPlane]);
            }

        } else {
            me.renderer.clippingPlanes = [];
            if (me.cartoObjects) {
                setObjectsToCut(me, me.cartoObjects, []);
            }
        }

        // this.selection = new CAPS.Selection(
        //     new THREE.Vector3( -7, -14, -14 ),
        //     new THREE.Vector3( 14,   9,   3 )
        // );
        //
        // CAPS.picking( this ); // must come before OrbitControls, so it can cancel them
        //
        // // var showCapsInput = document.getElementById( 'showCaps' );
        // // this.showCaps = showCapsInput.checked;
        // this.showCaps = true;
        // var onShowCaps = function () {
        //     self.showCaps = showCapsInput.checked;
        //     throttledRender();
        // };
        // // showCapsInput.addEventListener( 'change', onShowCaps, false );
        //
        //
        // if ( this.showCaps ) {
        //
        //     var context = this.renderer.context;
        //
        //     context.enable(context.STENCIL_TEST);
        //     // context.stencilFunc(context.ALWAYS, 0, 0xffffffff);
        //     // context.stencilOp(context.REPLACE, context.REPLACE, context.REPLACE);
        //     // context.clearStencil(0);
        //     // context.clear(context.COLOR_BUFFER_BIT, context.DEPTH_BUFFER_BIT, context.STENCIL_BUFFER_BIT);
        //
        //
        //     // this.renderer.state.setStencilTest( true );
        //
        //     context.stencilFunc( context.ALWAYS, 1, 0xff );
        //     context.stencilOp( context.KEEP, context.KEEP, context.INCR );
        //     this.renderer.render( this.backStencil, this.camera );
        //
        //     context.stencilFunc( context.ALWAYS, 1, 0xff );
        //     context.stencilOp( context.KEEP, context.KEEP, context.DECR );
        //     this.renderer.render(this.frontStencil, this.camera );
        //
        //     context.stencilFunc( context.EQUAL, 1, 0xff );
        //     context.stencilOp( context.KEEP, context.KEEP, context.KEEP );
        //     this.renderer.render( this.capsScene, this.camera );
        //     context.disable(context.STENCIL_TEST);
        //     // this.renderer.state.setStencilTest( false );
        //
        // }


        // renderbackground();

        me.scene.updateMatrixWorld();


        me.renderer.render(me.scene, me.camera);


    };

    me.resizeRenderer = function () {
        const me = this;

        const width = me.container.offsetParent ? me.container.offsetParent.offsetWidth : me.container.offsetWidth;
        const height = me.container.offsetParent ? me.container.offsetParent.offsetHeight : me.container.offsetHeight;

        //xx const width = me.container.offsetWidth + me.container.offsetLeft;
        //xx const height = me.container.offsetHeight  + me.container.offsetTop;

        me.camera.updateProjectionMatrix();

        me.renderer.shadowMap.enabled = true;
        me.renderer.setSize(width, height);
        me.composer.setSize(width, height);


        me.width = width;
        me.height = height;

        if (me.camera.setSize) {
            // combined ?
            me.camera.setSize(width, height);
        }
        me.camera.aspect = width / height;
        me.effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
        me.render3D();

    };
    me.resizeRenderer();


    function MyAnimate() {
        "use strict";
        requestAnimationFrame(MyAnimate);

        me.controls.update();

        me.composer.render();

    }

    MyAnimate();

    me.render3D();

    function getOffsetLeft(element) {
        let offsetLeft = 0;
        do {
            if (!isNaN(element.offsetLeft)) {
                offsetLeft += element.offsetLeft;
            }
        } while (null !== (element = element.offsetParent));
        return offsetLeft;
    }

    function getOffsetTop(element) {
        let offsetTop = 0;
        do {
            if (!isNaN(element.offsetTop)) {
                offsetTop += element.offsetTop;
            }
        } while (null !== (element = element.offsetParent));
        return offsetTop;
    }

    /**
     * converts mouse event into frustumCoordinate
     */
    function frustumCoord(event) {

        let el = event.currentTarget; // me.renderer.domElement;
        let dx = getOffsetLeft(el);
        let dy = getOffsetTop(el);

        let vector = new THREE.Vector3(
            ((event.clientX - dx) / el.offsetWidth) * 2 - 1,
            -((event.clientY - dy) / el.offsetHeight) * 2 + 1,
            me.camera.near
        );
        console.log(" click at :" + event.clientX + " " + event.clientY + " ", vector, " dx= ", dx, " dy=", dy);
        return vector;
    }

    function buildIntersectPlane(event) {

        let vector = frustumCoord(event);
        vector.unproject(me.camera);

        me.ray.set(me.camera.position, vector.sub(me.camera.position).normalize());
        return me.ray.intersectObject(me.intersectionPlane);
    }

    function buildIntersectScene(event) {

        let vector = frustumCoord(event);
        vector.unproject(me.camera);
        me.ray.set(me.camera.position, vector.sub(me.camera.position).normalize());
        let results = me.ray.intersectObjects([me.scene], true);
        results = results.filter(function (o) {
            return findSelectedObject(o.object).visible;
        });
        return results;


    }

    let SelectObjectManipulator = function () {

    };

    SelectObjectManipulator.prototype.onMoveDown = function (event) {
        /*
         console.log(" onMouseDown ",event);

         var picked ;

         event.preventDefault();

         if ( event.button === 0 ) {

         var intersects =buildIntersectScene(event);

         if ( intersects.length > 0 ) {

         picked = findSelectedObject(intersects[ 0 ].object);
         }

         if ( picked ) {

         me.controls.enabled = false;


         function startDraging(root,point) {

         me.intersectionPlane.position.copy( root.position );

         me.intersectionPlane.lookAt( me.camera.position );

         var intersects = me.ray.intersectObject( me.intersectionPlane );

         me.offset.copy(point  ).sub( me.intersectionPlane.position );

         document.addEventListener( "mousemove", onMouseMove, false );
         document.addEventListener( "mouseup", onMouseUp, false );
         }

         startDraging(picked, intersects[ 0 ].point);


         } else {
         me.controls.enabled = true;
         }

         me.cameraChanged = false;
         */

    };

    SelectObjectManipulator.prototype.onClick = function (event) {

        console.log(" onClick ", event);
        let objects = [me.scene];

        if (event.button === 0) {

            let intersects = buildIntersectScene(event);

            let picked = null;
            if (intersects.length > 0) {
                picked = findSelectedObject(intersects[0].object);
            }

            if (picked && picked.properties) {
                console.log(" clicked on ", picked.properties.OCCType, " name = ", picked.properties.OCCName);
                // me.checkIntersection()
            }

            me.selectObject(picked);
            event.preventDefault();

        }

        me.controls.enabled = true;

    };

    let DragObjectManipulator = function () {

    };
    DragObjectManipulator.prototype.onMouseMove = function (event) {

        const intersects = buildIntersectPlane(event);

        if (intersects.length > 0) {

            intersects[0].point.sub(me.offset);

            if (me.selected) {
                // move the selection on the screen
                me.selected.position.copy(intersects[0].point);
            }
            me.render3D();
        }
    };

    me.manipulator = new SelectObjectManipulator();

    const onMouseMove = function onMouseMove(event) {
        if (me.manipulator && me.manipulator.onMouseMove) {
            me.manipulator.onMouseMove(event);
            event.preventDefault();
        }
    };

    const onMouseDown = function onMouseDown(event) {

        if (me.manipulator && me.manipulator.onMoveDown) {
            me.manipulator.onMoveDown(event);
            event.preventDefault();
        }
    };


    const onMouseUp = function onMouseUp(event) {
        if (me.manipulator && me.manipulator.onMouseUp) {
            me.manipulator.onMouseUp(event);
            event.preventDefault();
        }
    };

    const onClick = function onClick(event) {
        if (me.manipulator && me.manipulator.onClick) {
            me.manipulator.onClick(event);
            event.preventDefault();
        }
    };

    function findSelectedObject(pickedObject) {
        let parent = pickedObject.parent;
        while (parent && parent.properties && parent.properties.OCCType !== "Solid") {
            parent = parent.parent;
        }
        return parent;
    }

    me.renderer.domElement.addEventListener("mousemove", onMouseMove, false);
    me.renderer.domElement.addEventListener("mouseup", onMouseUp, false);
    me.renderer.domElement.addEventListener("mousedown", onMouseDown, false);
    me.renderer.domElement.addEventListener("click", onClick, false);
}


GeomView.prototype.__solidObjectsNode = function (json) {
    const me = this;
    let rootNode = me.scene.getObjectByName("SOLIDS");
    if (!rootNode) {
        rootNode = new THREE.Object3D();
        rootNode.name = "SOLIDS";
        me.scene.add(rootNode);
    }
    return rootNode;
};


GeomView.prototype.__measurePointsNode = function (json) {
    const me = this;
    let rootNode = me.scene.getObjectByName("MEASUREPOINTS");
    if (!rootNode) {
        rootNode = new THREE.Object3D();
        rootNode.name = "MEASUREPOINTS";
        me.scene.add(rootNode);
    }
    return rootNode;
};


GeomView.prototype.selectObject = function (object) {

    const me = this;

    assert(typeof me.selectionBox === "object");

    if (object === me.selected) {
        return;
    }

    if (object !== null) {

        me.selected = object;

        const hasRotation = true;

        const bbox = GeomTools.boundingBox(object);

        const vertices = me.selectionBox.geometry.vertices;
        GeomTools.setVertices(bbox, vertices);

        me.selectionBox.geometry.computeBoundingSphere();
        me.selectionBox.geometry.verticesNeedUpdate = true;

        me.selectionBox.matrixWorld = object.matrixWorld;
        me.selectionAxis.matrixWorld = object.matrixWorld;
        me.selectionBox.visible = true;


    } else {
        me.selectionBox.visible = false;
        me.selected = null;
    }

    // me.emit("selectObject",me.selected);

    me.render3D();
};


GeomView.prototype.getDefaultColor = function () {

    const color = [Math.random(), Math.random(), Math.random()];
//   var color = [ 249.0/ 255.0, 195.0/ 255.0, 61.0/ 255.0];
    return color;
};

GeomView.prototype.highlightObject = function (obj3D) {
    // TODO:
    // me.selection =
};


GeomView.prototype.getSolidByName = function (objName) {
    const me = this;
    const rootNode = me.__solidObjectsNode();
    return rootNode.getObjectByName(objName);
};

/*
 *  json = { solids: [ id: "ID" , { faces: [], edges: [] }, ...]}
 *
 *
 */
GeomView.prototype.updateShapeObject = function (json) {

    const me = this;
    const rootNode = me.__solidObjectsNode();
    me.updateGeomObject(rootNode, json);
};


// GeomView.prototype.checkIntersection = checkIntersection;

GeomView.prototype.addSelectedObject = function (object) {

    const me = this;
    selectedObjects = [];
    me.scene.remove(me.scene.getObjectByName("lines_for_outlined_objects"));
    var group = new THREE.Group();
    group.name = "lines_for_outlined_objects";

    if (selectedObjects.filter(function (x) {
        return x.id === object.id
    }).length === 0) {

        for (var i in object.children[0].children) {

            const childGeometry = object.children[0].children[i].geometry;
            var edges = new THREE.EdgesGeometry(childGeometry);
            var line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));
            line.position = object.position;
            group.add(line);

            selectedObjects.push(object.children[0].children[i]);
        }
    }
    ;

    me.scene.add(group);
    return selectedObjects;
}


GeomView.prototype.removeSelectedObject = function () {
    const me = this;
    const group = me.scene.remove(me.scene.getObjectByName("lines_for_outlined_objects"));
    me.outlinePass.selectedObjects = me.selectedObjects = selectedObjects = [];

}

/**
 *  Convert a rgb color to hex,
 *  each Red Green Blue component of RGB shall be in the range [0,1]
 *
 */
function rgb2hex(rgb) {
    /* jshint ignore bitwise */
    return (rgb[0] * 255 << 16) + (rgb[1] * 255 << 8) + rgb[2] * 255;
}

function process_face_mesh(rootNode, jsonEntry, color) {

    const jsonFace = jsonEntry.mesh;

    jsonFace.scale = 1.0;
    const jsonLoader = new THREE.LegacyJSONLoader();

    const model = jsonLoader.parse(jsonFace, /* texturePath */ undefined);

    const material = new THREE.MeshLambertMaterial({color: rgb2hex(color), side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(model.geometry, material);
    mesh.properties = mesh.properties || {};
    mesh.properties.OCCType = "face";
    mesh.properties.OCCName = jsonFace.name;
    rootNode.add(mesh);
}

function process_edge_mesh(rootNode, jsonEdge) {
    const v = jsonEdge.mesh;
    const geometry = new THREE.Geometry();
    let i = 0;
    while (i < v.length) {
        geometry.vertices.push(new THREE.Vector3(v[i], v[i + 1], v[i + 2]));
        i += 3;
    }
    const material = new THREE.LineDashedMaterial({linewidth: 4, color: 0xffffff});
    const polyline = new THREE.Line(geometry, material);
    polyline.properties = polyline.properties || {};
    polyline.properties.OCCType = "edge";
    polyline.properties.OCCName = jsonEdge.name;
    rootNode.add(polyline);
}

/**
 *
 * @param node
 * @param solidMesh
 * @param solidMesh.name
 * @param solidMesh.id
 * @param solidMesh.faces [Array]
 * @param solidMesh.edges [Array]
 */
GeomView.prototype.updateNodeSolidMesh = function (node, solidMesh) {

    const color = [Math.random(), Math.random(), Math.random()];

    const group = new THREE.Object3D();
    node.add(group);
    group.name = solidMesh.name;
    group.properties = group.properties || {};
    group.properties.OCCType = "Solid";
    group.properties.OCCName = solidMesh.name;
    group.properties.OCCID = solidMesh.id;
    group.properties.OCCColor = color.slice(0);

    // one object
    solidMesh.faces.forEach(function (face) {
        // one face
        process_face_mesh(group, face, color);
    });
    solidMesh.edges.forEach(function (edge) {
        // one face
        process_edge_mesh(group, edge);
    });

};

function getFreshChildObject(rootNode, name) {
    const oldObj = rootNode.getObjectByName(name);
    if (oldObj) {
        rootNode.remove(oldObj);
    }
    const node = new THREE.Object3D();
    node.name = name;
    rootNode.add(node);
    return node;
}

GeomView.prototype.getFreshChildObject = getFreshChildObject;
/**
 * @param json        {Object}
 * @param json.name   {String}
 * @param json.solids {Object};
 */
GeomView.prototype.updateGeomObject = function (rootNode, json) {

    const self = this;
    let node = rootNode;
    if (json.name) {
        node = getFreshChildObject(rootNode, json.name);
    }

    // read solids
    const jsonSolids = json.solids;

    jsonSolids.forEach(function (solidMesh) {
        self.updateNodeSolidMesh(node, solidMesh);
    });
};


/**
 * remove all objects from the graphical view
 */
GeomView.prototype.clearAll = function () {
    const me = this;
    const rootNode = me.__solidObjectsNode();
    if (rootNode) {
        me.scene.remove(rootNode);
    }
};


/**
 * point the current camera to the center
 * of the graphical object (zoom factor is not affected)
 *
 * the camera is moved in its  x,z plane so that the orientation
 * is not affected either
 */
GeomView.prototype.pointCameraTo = function (node) {
    const me = this;

    // Refocus camera to the center of the new object
    let COG;
    if (node instanceof THREE.Vector3) {
        COG = node;
    } else {
        // Refocus camera to the center of the new object
        COG = GeomTools.shapeCenterOfGravity(node);
    }
    const v = new THREE.Vector3();
    v.subVectors(COG, me.controls.target);
    me.camera.position.addVectors(me.camera.position, v);

    // retrieve camera orientation

    me.controls.target.set(COG.x, COG.y, COG.z);
    me.camera.lookAt(COG);
    me.camera.updateProjectionMatrix();

    me.render3D();
};

/**
 * Zoom All
 */
GeomView.prototype.zoomAll = function () {

    const me = this;

    let node = me.selected;

    if (!node) {
        node = me.__solidObjectsNode();
    }

    me.zoomObject(node);
};


GeomView.prototype.showGrid = function (flag) {
    const me = this;
    if (me.grid.visible !== flag) {

        me.grid.visible = flag;
        me.render3D();
    }
};

GeomView.prototype.getObjectBox = function (node) {
    const me = this;
    if (!node) {
        node = me.__solidObjectsNode();
    }
    const bbox = GeomTools.boundingBox(node);
    return bbox;
};

GeomView.prototype.getObjectCenter = function (node) {
    const me = this;
    const bbox = me.getObjectBox(node);
    if (bbox.isEmpty()) {
        return new THREE.Vector3(0, 0, 0);
    }
    const COG = bbox.getCenter();
    return COG;
};


/**
 * Zoom on Object
 */
GeomView.prototype.zoomObject = function (node) {

    const me = this;

    const bbox = me.getObjectBox(node);
    if (bbox.isEmpty()) {
        return;
    }
    const COG = bbox.getCenter();

    me.pointCameraTo(COG);

    const sphereSize = bbox.getSize().length() * 0.5;
    const distToCenter = sphereSize / Math.sin(Math.PI / 180.0 * me.camera.fov * 0.5);
    // move the camera backward
    const target = me.controls.target;
    const vec = new THREE.Vector3();
    vec.subVectors(me.camera.position, target);
    vec.setLength(distToCenter);
    me.camera.position.addVectors(vec, target);
    me.camera.updateProjectionMatrix();
    me.render3D();
};

/**
 * Zoom on Object
 */
GeomView.prototype.onChangeView = function (viewName) {

    const me = this;
    switch (viewName.toUpperCase()) {
        case "Z+":
        case "TOP":
            me.camera.toTopView();
            break;
        case "Z-":
        case "BOTTOM":
            me.camera.toBottomView();
            break;
        case "RIGHT":
            me.camera.toRightView();
            break;
        case "LEFT":
            me.camera.toLeftView();
            break;
        case "FRONT":
            me.camera.toFrontView();
            break;
        case "BACK":
            me.camera.toBackView();
            break;
    }
    me.camera.updateProjectionMatrix();
    me.resizeRenderer();
    me.render3D();
};


exports.GeomView = GeomView;
exports.GeomTools = GeomTools;

