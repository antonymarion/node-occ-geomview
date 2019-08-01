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



THREE.OrthographicTrackballControls = function ( object, domElement ) {

    var _this = this;
    var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };

    this.radius = 0;

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;
    this.noRoll = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;

    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

    // internals

    this.target = new THREE.Vector3();

    var EPS = 0.000001;

    var _changed = true;

    var _state = STATE.NONE,
        _prevState = STATE.NONE,

        _eye = new THREE.Vector3(),

        _rotateStart = new THREE.Vector3(),
        _rotateEnd = new THREE.Vector3(),

        _zoomStart = new THREE.Vector2(),
        _zoomEnd = new THREE.Vector2(),

        _touchZoomDistanceStart = 0,
        _touchZoomDistanceEnd = 0,

        _panStart = new THREE.Vector2(),
        _panEnd = new THREE.Vector2();

    // for reset

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();

    this.left0 = this.object.left;
    this.right0 = this.object.right;
    this.top0 = this.object.top;
    this.bottom0 = this.object.bottom;

    // events

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start' };
    var endEvent = { type: 'end' };


    // methods

    this.handleResize = function () {

        if ( this.domElement === document ) {

            this.screen.left = 0;
            this.screen.top = 0;
            this.screen.width = window.innerWidth;
            this.screen.height = window.innerHeight;

        } else {

            var box = this.domElement.getBoundingClientRect();
            // adjustments come from similar code in the jquery offset() function
            var d = this.domElement.ownerDocument.documentElement;
            this.screen.left = box.left + window.pageXOffset - d.clientLeft;
            this.screen.top = box.top + window.pageYOffset - d.clientTop;
            this.screen.width = box.width;
            this.screen.height = box.height;

        }

        this.radius = 0.5 * Math.min( this.screen.width, this.screen.height );

        this.left0 = this.object.left;
        this.right0 = this.object.right;
        this.top0 = this.object.top;
        this.bottom0 = this.object.bottom;

    };

    this.handleEvent = function ( event ) {

        if ( typeof this[ event.type ] == 'function' ) {

            this[ event.type ]( event );

        }

    };

    var getMouseOnScreen = ( function () {

        var vector = new THREE.Vector2();

        return function getMouseOnScreen( pageX, pageY ) {

            vector.set(
                ( pageX - _this.screen.left ) / _this.screen.width,
                ( pageY - _this.screen.top ) / _this.screen.height
            );

            return vector;

        };

    }() );

    var getMouseProjectionOnBall = ( function () {

        var vector = new THREE.Vector3();
        var objectUp = new THREE.Vector3();
        var mouseOnBall = new THREE.Vector3();

        return function getMouseProjectionOnBall( pageX, pageY ) {

            mouseOnBall.set(
                ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / _this.radius,
                ( _this.screen.height * 0.5 + _this.screen.top - pageY ) / _this.radius,
                0.0
            );

            var length = mouseOnBall.length();

            if ( _this.noRoll ) {

                if ( length < Math.SQRT1_2 ) {

                    mouseOnBall.z = Math.sqrt( 1.0 - length * length );

                } else {

                    mouseOnBall.z = .5 / length;

                }

            } else if ( length > 1.0 ) {

                mouseOnBall.normalize();

            } else {

                mouseOnBall.z = Math.sqrt( 1.0 - length * length );

            }

            _eye.copy( _this.object.position ).sub( _this.target );

            vector.copy( _this.object.up ).setLength( mouseOnBall.y );
            vector.add( objectUp.copy( _this.object.up ).cross( _eye ).setLength( mouseOnBall.x ) );
            vector.add( _eye.setLength( mouseOnBall.z ) );

            return vector;

        };

    }() );

    this.rotateCamera = ( function() {

        var axis = new THREE.Vector3(),
            quaternion = new THREE.Quaternion();


        return function rotateCamera() {

            var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

            if ( angle ) {

                axis.crossVectors( _rotateStart, _rotateEnd ).normalize();

                angle *= _this.rotateSpeed;

                quaternion.setFromAxisAngle( axis, - angle );

                _eye.applyQuaternion( quaternion );
                _this.object.up.applyQuaternion( quaternion );

                _rotateEnd.applyQuaternion( quaternion );

                if ( _this.staticMoving ) {

                    _rotateStart.copy( _rotateEnd );

                } else {

                    quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
                    _rotateStart.applyQuaternion( quaternion );

                }

                _changed = true;

            }

        }

    }() );

    this.zoomCamera = function () {

        if ( _state === STATE.TOUCH_ZOOM_PAN ) {

            var factor = _touchZoomDistanceEnd / _touchZoomDistanceStart;
            _touchZoomDistanceStart = _touchZoomDistanceEnd;

            _this.object.zoom *= factor;

            _changed = true;

        } else {

            var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

            if ( Math.abs( factor - 1.0 ) > EPS && factor > 0.0 ) {

                _this.object.zoom /= factor;

                if ( _this.staticMoving ) {

                    _zoomStart.copy( _zoomEnd );

                } else {

                    _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

                }

                _changed = true;

            }

        }

    };

    this.panCamera = ( function() {

        var mouseChange = new THREE.Vector2(),
            objectUp = new THREE.Vector3(),
            pan = new THREE.Vector3();

        return function panCamera() {

            mouseChange.copy( _panEnd ).sub( _panStart );

            if ( mouseChange.lengthSq() ) {

                // Scale movement to keep clicked/dragged position under cursor
                var scale_x = ( _this.object.right - _this.object.left ) / _this.object.zoom;
                var scale_y = ( _this.object.top - _this.object.bottom ) / _this.object.zoom;
                mouseChange.x *= scale_x;
                mouseChange.y *= scale_y;

                pan.copy( _eye ).cross( _this.object.up ).setLength( mouseChange.x );
                pan.add( objectUp.copy( _this.object.up ).setLength( mouseChange.y ) );

                _this.object.position.add( pan );
                _this.target.add( pan );

                if ( _this.staticMoving ) {

                    _panStart.copy( _panEnd );

                } else {

                    _panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

                }

                _changed = true;

            }

        }

    }() );

    this.update = function () {

        _eye.subVectors( _this.object.position, _this.target );

        if ( ! _this.noRotate ) {

            _this.rotateCamera();

        }

        if ( ! _this.noZoom ) {

            _this.zoomCamera();

            if ( _changed ) {

                _this.object.updateProjectionMatrix();

            }

        }

        if ( ! _this.noPan ) {

            _this.panCamera();

        }

        _this.object.position.addVectors( _this.target, _eye );

        _this.object.lookAt( _this.target );

        if ( _changed ) {

            _this.dispatchEvent( changeEvent );

            _changed = false;

        }

    };

    this.reset = function () {

        _state = STATE.NONE;
        _prevState = STATE.NONE;

        _this.target.copy( _this.target0 );
        _this.object.position.copy( _this.position0 );
        _this.object.up.copy( _this.up0 );

        _eye.subVectors( _this.object.position, _this.target );

        _this.object.left = _this.left0;
        _this.object.right = _this.right0;
        _this.object.top = _this.top0;
        _this.object.bottom = _this.bottom0;

        _this.object.lookAt( _this.target );

        _this.dispatchEvent( changeEvent );

        _changed = false;

    };

    // listeners

    function keydown( event ) {

        if ( _this.enabled === false ) return;

        window.removeEventListener( 'keydown', keydown );

        _prevState = _state;

        if ( _state !== STATE.NONE ) {

            return;

        } else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && ! _this.noRotate ) {

            _state = STATE.ROTATE;

        } else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && ! _this.noZoom ) {

            _state = STATE.ZOOM;

        } else if ( event.keyCode === _this.keys[ STATE.PAN ] && ! _this.noPan ) {

            _state = STATE.PAN;

        }

    }

    function keyup( event ) {

        if ( _this.enabled === false ) return;

        _state = _prevState;

        window.addEventListener( 'keydown', keydown, false );

    }

    function mousedown( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.NONE ) {

            _state = event.button;

        }

        if ( _state === STATE.ROTATE && ! _this.noRotate ) {

            _rotateStart.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );
            _rotateEnd.copy( _rotateStart );

        } else if ( _state === STATE.ZOOM && ! _this.noZoom ) {

            _zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _zoomEnd.copy( _zoomStart );

        } else if ( _state === STATE.PAN && ! _this.noPan ) {

            _panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _panEnd.copy( _panStart )

        }

        document.addEventListener( 'mousemove', mousemove, false );
        document.addEventListener( 'mouseup', mouseup, false );

        _this.dispatchEvent( startEvent );

    }

    function mousemove( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.ROTATE && ! _this.noRotate ) {

            _rotateEnd.copy( getMouseProjectionOnBall( event.pageX, event.pageY ) );

        } else if ( _state === STATE.ZOOM && ! _this.noZoom ) {

            _zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

        } else if ( _state === STATE.PAN && ! _this.noPan ) {

            _panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

        }

    }

    function mouseup( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        _state = STATE.NONE;

        document.removeEventListener( 'mousemove', mousemove );
        document.removeEventListener( 'mouseup', mouseup );
        _this.dispatchEvent( endEvent );

    }

    function mousewheel( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if ( event.wheelDelta ) {

            // WebKit / Opera / Explorer 9

            delta = event.wheelDelta / 40;

        } else if ( event.detail ) {

            // Firefox

            delta = - event.detail / 3;

        }

        _zoomStart.y += delta * 0.01;
        _this.dispatchEvent( startEvent );
        _this.dispatchEvent( endEvent );

    }

    function touchstart( event ) {

        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1:
                _state = STATE.TOUCH_ROTATE;
                _rotateStart.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _rotateEnd.copy( _rotateStart );
                break;

            case 2:
                _state = STATE.TOUCH_ZOOM_PAN;
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panStart.copy( getMouseOnScreen( x, y ) );
                _panEnd.copy( _panStart );
                break;

            default:
                _state = STATE.NONE;

        }
        _this.dispatchEvent( startEvent );

    }

    function touchmove( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        switch ( event.touches.length ) {

            case 1:
                _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                break;

            case 2:
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                break;

            default:
                _state = STATE.NONE;

        }

    }

    function touchend( event ) {

        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1:
                _rotateEnd.copy( getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _rotateStart.copy( _rotateEnd );
                break;

            case 2:
                _touchZoomDistanceStart = _touchZoomDistanceEnd = 0;

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                _panStart.copy( _panEnd );
                break;

        }

        _state = STATE.NONE;
        _this.dispatchEvent( endEvent );

    }

    function contextmenu( event ) {

        event.preventDefault();

    }

    this.disableEvents = function() {

        this.domElement.removeEventListener( 'contextmenu', contextmenu, false );
        this.domElement.removeEventListener( 'mousedown', mousedown, false );
        this.domElement.removeEventListener( 'mousewheel', mousewheel, false );
        this.domElement.removeEventListener( 'MozMousePixelScroll', mousewheel, false ); // firefox

        this.domElement.removeEventListener( 'touchstart', touchstart, false );
        this.domElement.removeEventListener( 'touchend', touchend, false );
        this.domElement.removeEventListener( 'touchmove', touchmove, false );

        document.removeEventListener( 'mousemove', mousemove, false );
        document.removeEventListener( 'mouseup', mouseup, false );

        window.removeEventListener( 'keydown', keydown, false );
        window.removeEventListener( 'keyup', keyup, false );

    }
    this.dispose = this.disableEvents

    this.enableEvents = function() {
        this.domElement.addEventListener( 'contextmenu', contextmenu, false );
        this.domElement.addEventListener( 'mousedown', mousedown, false );
        this.domElement.addEventListener( 'mousewheel', mousewheel, false );
        this.domElement.addEventListener( 'MozMousePixelScroll', mousewheel, false ); // firefox

        this.domElement.addEventListener( 'touchstart', touchstart, false );
        this.domElement.addEventListener( 'touchend', touchend, false );
        this.domElement.addEventListener( 'touchmove', touchmove, false );

        window.addEventListener( 'keydown', keydown, false );
        window.addEventListener( 'keyup', keyup, false );

    }

    // Enable events at start
    this.enableEvents()

    this.handleResize();

    // force an update at start
    this.update();

};

THREE.OrthographicTrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrthographicTrackballControls.prototype.constructor = THREE.OrthographicTrackballControls;

THREE.CombinedCamera = function ( width, height, fov, near, far, orthoNear, orthoFar ) {

    THREE.Camera.call( this );

    this.fov = fov;

    this.left = -width / 2;
    this.right = width / 2
    this.top = height / 2;
    this.bottom = -height / 2;

    // We could also handle the projectionMatrix internally, but just wanted to test nested camera objects

    this.cameraO = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 	orthoNear, orthoFar );
    this.cameraP = new THREE.PerspectiveCamera( fov, width / height, near, far );

    this.zoom = 1;

    this.toPerspective();

    var aspect = width/height;

};

THREE.CombinedCamera.prototype = Object.create( THREE.Camera.prototype );

THREE.CombinedCamera.prototype.toPerspective = function () {

    // Switches to the Perspective Camera

    this.near = this.cameraP.near;
    this.far = this.cameraP.far;

    this.cameraP.fov =  this.fov / this.zoom ;

    this.cameraP.updateProjectionMatrix();

    this.projectionMatrix = this.cameraP.projectionMatrix;

    this.inPerspectiveMode = true;
    this.inOrthographicMode = false;

};

THREE.CombinedCamera.prototype.toOrthographic = function () {

    // Switches to the Orthographic camera estimating viewport from Perspective

    var fov = this.fov;
    var aspect = this.cameraP.aspect;
    var near = this.cameraP.near;
    var far = this.cameraP.far;

    // The size that we set is the mid plane of the viewing frustum

    var hyperfocus = ( near + far ) / 2;

    var halfHeight = Math.tan( fov / 2 ) * hyperfocus;
    var planeHeight = 2 * halfHeight;
    var planeWidth = planeHeight * aspect;
    var halfWidth = planeWidth / 2;

    halfHeight /= this.zoom;
    halfWidth /= this.zoom;

    this.cameraO.left = -halfWidth;
    this.cameraO.right = halfWidth;
    this.cameraO.top = halfHeight;
    this.cameraO.bottom = -halfHeight;

    // this.cameraO.left = -farHalfWidth;
    // this.cameraO.right = farHalfWidth;
    // this.cameraO.top = farHalfHeight;
    // this.cameraO.bottom = -farHalfHeight;

    // this.cameraO.left = this.left / this.zoom;
    // this.cameraO.right = this.right / this.zoom;
    // this.cameraO.top = this.top / this.zoom;
    // this.cameraO.bottom = this.bottom / this.zoom;

    this.cameraO.updateProjectionMatrix();

    this.near = this.cameraO.near;
    this.far = this.cameraO.far;
    this.projectionMatrix = this.cameraO.projectionMatrix;

    this.inPerspectiveMode = false;
    this.inOrthographicMode = true;

};


THREE.CombinedCamera.prototype.setSize = function( width, height ) {

    this.cameraP.aspect = width / height;
    this.left = -width / 2;
    this.right = width / 2
    this.top = height / 2;
    this.bottom = -height / 2;

};


THREE.CombinedCamera.prototype.setFov = function( fov ) {

    this.fov = fov;

    if ( this.inPerspectiveMode ) {

        this.toPerspective();

    } else {

        this.toOrthographic();

    }

};

// For mantaining similar API with PerspectiveCamera

THREE.CombinedCamera.prototype.updateProjectionMatrix = function() {

    if ( this.inPerspectiveMode ) {

        this.toPerspective();

    } else {

        this.toPerspective();
        this.toOrthographic();

    }

};

/*
* Uses Focal Length (in mm) to estimate and set FOV
* 35mm (fullframe) camera is used if frame size is not specified;
* Formula based on http://www.bobatkins.com/photography/technical/field_of_view.html
*/
THREE.CombinedCamera.prototype.setLens = function ( focalLength, frameHeight ) {

    if ( frameHeight === undefined ) frameHeight = 24;

    var fov = 2 * THREE.Math.radToDeg( Math.atan( frameHeight / ( focalLength * 2 ) ) );

    this.setFov( fov );

    return fov;
};


THREE.CombinedCamera.prototype.setZoom = function( zoom ) {

    this.zoom = zoom;

    if ( this.inPerspectiveMode ) {

        this.toPerspective();

    } else {

        this.toOrthographic();

    }

};

THREE.CombinedCamera.prototype.toFrontView = function() {

    this.rotation.x = 0;
    this.rotation.y = 0;
    this.rotation.z = 0;

    // should we be modifing the matrix instead?

    this.rotationAutoUpdate = false;

};

THREE.CombinedCamera.prototype.toBackView = function() {

    this.rotation.x = 0;
    this.rotation.y = Math.PI;
    this.rotation.z = 0;
    this.rotationAutoUpdate = false;

};

THREE.CombinedCamera.prototype.toLeftView = function() {

    this.rotation.x = 0;
    this.rotation.y = - Math.PI / 2;
    this.rotation.z = 0;
    this.rotationAutoUpdate = false;

};

THREE.CombinedCamera.prototype.toRightView = function() {

    this.rotation.x = 0;
    this.rotation.y = Math.PI / 2;
    this.rotation.z = 0;
    this.rotationAutoUpdate = false;

};

THREE.CombinedCamera.prototype.toTopView = function() {

    this.rotation.x = - Math.PI / 2;
    this.rotation.y = 0;
    this.rotation.z = 0;
    this.rotationAutoUpdate = false;

};

THREE.CombinedCamera.prototype.toBottomView = function() {

    this.rotation.x = Math.PI / 2;
    this.rotation.y = 0;
    this.rotation.z = 0;
    this.rotationAutoUpdate = false;

};
// Source: https://github.com/usco/glView-helpers/blob/master/src/grids/LabeledGrid.js
//import THREE from 'three';


/*TODO:
 - refactor
 - use label helper
*/

class LabeledGrid extends THREE.Object3D {
    constructor(width = 200, length = 200, step = 100, upVector = [0, 1, 0], color = 0x00baff, opacity = 0.2, text = true, textColor = "#000000", textLocation = "center") {
        super();

        this.width = width;
        this.length = length;
        this.step = step;
        this.color = color;
        this.opacity = opacity;
        this.text = text;
        this.textColor = textColor;
        this.textLocation = textLocation;
        this.upVector = new THREE.Vector3().fromArray(upVector);

        this.name = "grid";

        //TODO: clean this up
        this.marginSize = 10;
        this.stepSubDivisions = 10;


        this._drawGrid();

        //default grid orientation is z up, rotate if not the case
        var upVector = this.upVector;
        this.up = upVector;
        this.lookAt(upVector);
    }

    _drawGrid() {
        var gridGeometry, gridMaterial, mainGridZ, planeFragmentShader, planeGeometry, planeMaterial, subGridGeometry,
            subGridMaterial, subGridZ;

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

        if (centerBased) {
            for (var i = 0; i <= width / 2; i += step / stepSubDivisions) {
                subGridGeometry.vertices.push(new THREE.Vector3(-length / 2, i, subGridZ));
                subGridGeometry.vertices.push(new THREE.Vector3(length / 2, i, subGridZ));

                subGridGeometry.vertices.push(new THREE.Vector3(-length / 2, -i, subGridZ));
                subGridGeometry.vertices.push(new THREE.Vector3(length / 2, -i, subGridZ));

                if (i % step == 0) {
                    gridGeometry.vertices.push(new THREE.Vector3(-length / 2, i, mainGridZ));
                    gridGeometry.vertices.push(new THREE.Vector3(length / 2, i, mainGridZ));

                    gridGeometry.vertices.push(new THREE.Vector3(-length / 2, -i, mainGridZ));
                    gridGeometry.vertices.push(new THREE.Vector3(length / 2, -i, mainGridZ));
                }
            }
            for (var i = 0; i <= length / 2; i += step / stepSubDivisions) {
                subGridGeometry.vertices.push(new THREE.Vector3(i, -width / 2, subGridZ));
                subGridGeometry.vertices.push(new THREE.Vector3(i, width / 2, subGridZ));

                subGridGeometry.vertices.push(new THREE.Vector3(-i, -width / 2, subGridZ));
                subGridGeometry.vertices.push(new THREE.Vector3(-i, width / 2, subGridZ));

                if (i % step == 0) {
                    gridGeometry.vertices.push(new THREE.Vector3(i, -width / 2, mainGridZ));
                    gridGeometry.vertices.push(new THREE.Vector3(i, width / 2, mainGridZ));

                    gridGeometry.vertices.push(new THREE.Vector3(-i, -width / 2, mainGridZ));
                    gridGeometry.vertices.push(new THREE.Vector3(-i, width / 2, mainGridZ));
                }
            }
        } else {
            for (var i = -width / 2; i <= width / 2; i += step / stepSubDivisions) {
                subGridGeometry.vertices.push(new THREE.Vector3(-length / 2, i, subGridZ));
                subGridGeometry.vertices.push(new THREE.Vector3(length / 2, i, subGridZ));

                if (i % step == 0) {
                    gridGeometry.vertices.push(new THREE.Vector3(-length / 2, i, mainGridZ));
                    gridGeometry.vertices.push(new THREE.Vector3(length / 2, i, mainGridZ));
                }
            }
            for (var i = -length / 2; i <= length / 2; i += step / stepSubDivisions) {
                subGridGeometry.vertices.push(new THREE.Vector3(i, -width / 2, subGridZ));
                subGridGeometry.vertices.push(new THREE.Vector3(i, width / 2, subGridZ));

                if (i % step == 0) {
                    gridGeometry.vertices.push(new THREE.Vector3(i, -width / 2, mainGridZ));
                    gridGeometry.vertices.push(new THREE.Vector3(i, width / 2, mainGridZ));
                }
            }
        }

        this.mainGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
        //create sub grid geometry object
        this.subGrid = new THREE.LineSegments(subGridGeometry, subGridMaterial);

        //create margin
        var offsetWidth = width + this.marginSize;
        var offsetLength = length + this.marginSize;

        var marginGeometry = new THREE.Geometry();
        marginGeometry.vertices.push(new THREE.Vector3(-length / 2, -width / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(length / 2, -width / 2, subGridZ));

        marginGeometry.vertices.push(new THREE.Vector3(length / 2, -width / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(length / 2, width / 2, subGridZ));

        marginGeometry.vertices.push(new THREE.Vector3(length / 2, width / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(-length / 2, width / 2, subGridZ));

        marginGeometry.vertices.push(new THREE.Vector3(-length / 2, width / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(-length / 2, -width / 2, subGridZ));


        marginGeometry.vertices.push(new THREE.Vector3(-offsetLength / 2, -offsetWidth / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(offsetLength / 2, -offsetWidth / 2, subGridZ));

        marginGeometry.vertices.push(new THREE.Vector3(offsetLength / 2, -offsetWidth / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(offsetLength / 2, offsetWidth / 2, subGridZ));

        marginGeometry.vertices.push(new THREE.Vector3(offsetLength / 2, offsetWidth / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(-offsetLength / 2, offsetWidth / 2, subGridZ));

        marginGeometry.vertices.push(new THREE.Vector3(-offsetLength / 2, offsetWidth / 2, subGridZ));
        marginGeometry.vertices.push(new THREE.Vector3(-offsetLength / 2, -offsetWidth / 2, subGridZ));


        var strongGridMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHex(this.color),
            opacity: this.opacity * 2,
            linewidth: 2,
            transparent: true
        });
        this.margin = new THREE.LineSegments(marginGeometry, strongGridMaterial);

        //add all grids, subgrids, margins etc
        this.add(this.mainGrid);
        this.add(this.subGrid);
        this.add(this.margin);

        this._drawNumbering();
    }

    toggle(toggle) {
        //apply visibility settings to all children
        this.traverse(function (child) {
            child.visible = toggle;
        });
    }

    setOpacity(opacity) {
        this.opacity = opacity;
        this.mainGrid.material.opacity = opacity;
        this.subGrid.material.opacity = opacity / 2;
        this.margin.material.opacity = opacity * 2;
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

    resize(width, length) {
        if (width && length) {
            var width = Math.max(width, 10);
            this.width = width;

            var length = Math.max(length, 10);
            this.length = length;

            this.step = Math.max(this.step, 5);

            this.remove(this.mainGrid);
            this.remove(this.subGrid);
            this.remove(this.margin);
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

        if (numbering == "centerBased") {
            for (var i = 0; i <= width / 2; i += step) {
                var sizeLabel = this.drawTextOnPlane("" + i, 32);
                var sizeLabel2 = sizeLabel.clone();

                sizeLabel.position.set(length / 2, -i, 0.1);
                sizeLabel.rotation.z = -Math.PI / 2;
                labelsFront.add(sizeLabel);

                sizeLabel2.position.set(length / 2, i, 0.1);
                sizeLabel2.rotation.z = -Math.PI / 2;
                labelsFront.add(sizeLabel2);
            }

            for (var i = 0; i <= length / 2; i += step) {
                var sizeLabel = this.drawTextOnPlane("" + i, 32);
                var sizeLabel2 = sizeLabel.clone();

                sizeLabel.position.set(-i, width / 2, 0.1);
                //sizeLabel.rotation.z = -Math.PI / 2;
                labelsSideRight.add(sizeLabel);

                sizeLabel2.position.set(i, width / 2, 0.1);
                //sizeLabel2.rotation.z = -Math.PI / 2;
                labelsSideRight.add(sizeLabel2);
            }

            var labelsSideLeft = labelsSideRight.clone();
            labelsSideLeft.rotation.z = -Math.PI;
            //labelsSideLeft = labelsSideRight.clone().translateY(- width );

            var labelsBack = labelsFront.clone();
            labelsBack.rotation.z = -Math.PI;
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
        this.labels.add(labelsFront);
        this.labels.add(labelsBack);

        this.labels.add(labelsSideRight);
        this.labels.add(labelsSideLeft);


        //apply visibility settings to all labels
        var textVisible = this.text;
        this.labels.traverse(function (child) {
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


    updateGridSize() {
        var max, maxX, maxY, min, minX, minY, size, subchild, _getBounds, _i, _len, _ref,
            _this = this;
        minX = 99999;
        maxX = -99999;
        minY = 99999;
        maxY = -99999;
        _getBounds = function (mesh) {
            var bBox, subchild, _i, _len, _ref, _results;
            if (mesh instanceof THREE.Object3D) {
                bBox = new THREE.Box3().setFromObject(mesh);
                minX = Math.min(minX, bBox.min.x + mesh.position.x);
                maxX = Math.max(maxX, bBox.max.x + mesh.position.x);
                minY = Math.min(minY, bBox.min.y + mesh.position.y);
                maxY = Math.max(maxY, bBox.max.y + mesh.position.y);
            }
        };
        const solids = this.rootAssembly.getObjectByName("SOLIDS").children;
        if (solids != null) {
            _ref = solids;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                subchild = _ref[_i];
                if (subchild.name !== "renderSubs" && subchild.name !== "connectors") {
                    _getBounds(subchild);
                }
            }
        }
        max = Math.max(Math.max(maxX, maxY), 50);
        min = Math.min(Math.min(minX, minY), -50);
        size = (Math.max(max, Math.abs(min))) * 2;
        size = Math.ceil(size / 10) * 10;
        // if (size >= 200) {
        return this.resize(size, size);
        // }
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

    makeGrid: function (root) {

        const labelgrid = new LabeledGrid(100, 100, 10, [0, 0, 1], 0x000055, 0.2, true, "#000000", "left");
        labelgrid.rootAssembly = root;
        return labelgrid;
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

    if (!me.scene.getObjectByName("SOLIDS")) {
        console.info("solids still loading or missing");
        return;
    }

    if (me.scene.getObjectByName("SOLIDS").children.length == 0) {
        return;
    }


    me.scene.getObjectByName("SOLIDS").children.forEach(geom => {
        geom.children.forEach(c => c.children.forEach(cc => cc.material.clippingPlanes = []));
        geom.children.forEach(c => {
            if (!c.material) {
                return;
            }
            c.material.clippingPlanes = []
        });
    });

    if (clippingPlanes.length !== 0) {
        objectIds.forEach(objectId => {
            self.scene.getObjectByName("SOLIDS").children.forEach(geom => {
                const isUUID = objectId.toUpperCase() == objectId;
                if (!isUUID && !geom.getObjectByName("id_" + objectId)) {
                    return;
                }
                const searchedID = isUUID ? objectId : "id_" + objectId;
                const myGeom = isUUID ? geom.getObjectByProperty("uuid", searchedID) : geom.getObjectByName(searchedID);
                if (!myGeom) {
                    return;
                }
                myGeom.children.forEach(c => c.material.clippingPlanes = clippingPlanes)
            });
        });
    }

}

function GeomView(container, width, height) {


    width = width || container.offsetWidth;
    height = height || container.offsetHeight;

    const me = this;

    me.insetWidth = 150;
    me.insetHeight = 150;

    me.camera2 = new THREE.PerspectiveCamera(50, me.insetWidth / me.insetHeight, 1, 1000);
    me.scene2 = new THREE.Scene();

    me.canvas = document.getElementById("canvas3D");

    const webgl2Context = me.canvas.getContext('webgl2');
    webgl2Context.viewportWidth = me.canvas.width;
    webgl2Context.viewportHeight = me.canvas.height;
    me.renderer2 = new THREE.WebGLRenderer(
        {
            alpha: true
        }
    );

    me.XAxisLabel = null;
    me.YAxisLabel = null;
    me.ZAxisLabel = null;

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


    const ratio = width / height;

    if (use_CombinedCamera) {
        me.camera = new THREE.CombinedCamera(width, height, 35, 1, 10000, -500, 1000);
        //  width, height, fov, near, far, orthoNear, orthoFar
        me.camera.toOrthographic();
    } else {
        me.camera = new THREE.PerspectiveCamera(35, ratio, 1, 100000); // fov, aspect, near, far

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
        alpha: false,
        canvas: me.canvas,
        context: webgl2Context
    });

    var canvas2D = document.createElement("canvas");

    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;


    var ctx = canvas2D.getContext("2d");
    var grd = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    grd.addColorStop(0, "lightblue");
    grd.addColorStop(.5, "white");
    grd.addColorStop(1, "lightblue");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    var texture = new THREE.CanvasTexture(canvas2D);

    me.scene.background = texture;

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
        // me.controls = new THREE.OrbitControls(me.camera, container);

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

    me.grid = GeomTools.makeGrid(me.scene);
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
            if (me.selectedObjectsForCut.indexOf("Tout") > -1) {
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


        // Always look camera for measurements && Axis inset

        if (!!me.ZAxisLabel) {
            me.XAxisLabel.quaternion.copy(me.camera.quaternion);
            me.YAxisLabel.quaternion.copy(me.camera.quaternion);
            me.ZAxisLabel.quaternion.copy(me.camera.quaternion);
        }

        // if (me.mesaurementsMeshes) {
        //     me.mesaurementsMeshes.forEach(mesh => {
        //         mesh.quaternion.copy(me.camera.quaternion);
        //     });
        //
        // }

        me.scene.updateMatrixWorld();

        me.camera2.position.copy(me.camera.position);
        me.camera2.position.setLength(300);
        me.camera2.lookAt(me.scene2.position);
        me.renderer2.render(me.scene2, me.camera2);
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

        if (!!me.facingCamera) {
            me.facingCamera.check(me.camera);
            if (!!me.facingCamera.bestFacingDir) {
                if (!!me.dim0.extrude) {
                    me.dim0.update(me.camera);
                }
                if (!!me.dim1.extrude) {
                    me.dim1.update(me.camera);
                }
                if (!!me.dim2.extrude) {
                    me.dim2.update(me.camera);
                }
            }
        }

    }


    MyAnimate();
    me.MyAnimate = MyAnimate;
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


GeomView.prototype.__arrowHelperNode = function (geomID) {
    const me = this;
    let rootNode = me.scene.getObjectByName("ARROWHELPER");
    if (!rootNode) {
        rootNode = new THREE.Object3D();
        rootNode.name = "ARROWHELPER";
        me.scene.add(rootNode);
    }

    if (!geomID) {
        return rootNode;
    }

    const objName = "ARROWHELPER_" + geomID;
    const objNode = rootNode.getChildByName(objName);
    if (!!objNode) {
        return objNode;
    }
    const obj = new THREE.Object3D();
    obj.name = objName;
    rootNode.add(obj);
    return obj;


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

        me.selectionBox.visible = false;

        if (me.selected.name !== "grid"
            && me.selected.name !== "KARTOBOX"
            && !(me.selected.parent instanceof THREE.TransformGizmoTranslate)
            && me.selected.type !== "Scene") {
            me.selectionBox.visible = true;
        }


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

