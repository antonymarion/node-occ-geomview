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


require("../../../node_modules/three/examples/js/shaders/CopyShader");
require("../../../node_modules/three/examples/js/shaders/FXAAShader");

require("../../../node_modules/three/examples/js/postprocessing/EffectComposer");
require("../../../node_modules/three/examples/js/postprocessing/RenderPass");
require("../../../node_modules/three/examples/js/postprocessing/ShaderPass");
// require("../../../node_modules/three/examples/js/postprocessing/OutlinePass");


THREE.OutlinePass = function (resolution, scene, camera, selectedObjects) {

    this.renderScene = scene;
    this.renderCamera = camera;
    this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
    this.visibleEdgeColor = new THREE.Color(1, 1, 1);
    this.hiddenEdgeColor = new THREE.Color(1, 1, 1)
    this.edgeGlow = 2;
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

        const size = 200, step = 10;
        const geometry = new THREE.Geometry();
        const material = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors});

        const color1 = new THREE.Color(0x444444), color2 = new THREE.Color(0x888888);

        for (let i = -size; i <= size; i += step) {

            geometry.vertices.push(new THREE.Vector3(-size, i, 0));
            geometry.vertices.push(new THREE.Vector3(size, i, 0));

            geometry.vertices.push(new THREE.Vector3(i, -size, 0));
            geometry.vertices.push(new THREE.Vector3(i, size, 0));

            const color = i === 0 ? color1 : color2;

            geometry.colors.push(color, color, color, color);

        }

        const grid = new THREE.LineSegments(geometry, material);

        return grid;
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


function GeomView(container, width, height) {

    width = width || container.offsetWidth;
    height = height || container.offsetHeight;

    const me = this;
    me.container = container;
    me.selectedObjectName = [];
    me.scene = new THREE.Scene();

    // var canvas = document.getElementById("graphical_view");
    var canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    console.log('canvas ', canvas);

    var ctx = canvas.getContext("2d");
    var grd = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    grd.addColorStop(0, "lightblue");
    grd.addColorStop(.5, "cadetblue");
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
        antialias: true,
        alpha: false
    });

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

    me.render3D = function () {

        const me = this;
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
    };

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
    const jsonLoader = new THREE.JSONLoader();

    const model = jsonLoader.parse(jsonFace, /* texturePath */ undefined);

    const material = new THREE.MeshLambertMaterial({color: rgb2hex(color)});
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


//////////////////
// WEBPACK FOOTER
// ./node_modules/node-occ-geomview/client/geom_view.js
// module id = 219
// module chunks = 0 1