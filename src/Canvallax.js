(function() {

  var W = window,
      D = document,
      R = D.documentElement,
      B = D.body,
      requestAnimationFrame = W.requestAnimationFrame || W.mozRequestAnimationFrame || W.webkitRequestAnimationFrame || W.msRequestAnimationFrame || W.oRequestAnimationFrame || function(callback){ W.setTimeout(callback, 20); },

      noop = function(){},

      // Default options
      defaults = {

        scroll: true, // (Boolean||'invert'||'invertx'||'inverty') If true, the X and Y of the scene are tied to document's scroll for a typical parallax experience. Set to false if you want to control the scene's X and Y manually.

        x: 0, // (Number) Starting x position. If tied to scroll, this will be overridden on render.

        y: 0, // (Number) Starting y position. If tied to scroll, this will be overridden on render.

        damping: 1, // (Number) the 'easing' of the x & y position when updated. 1 = none, higher is longer. If you're syncing parallax items to regular items in the scroll, then you'll probably want a low damping.

        parent: document.body, // (Node) Canvas is prepended to document.body by default. Override with your own node if you want it within a certain container.

        canvas: undefined, // (Node) Use Canvallax on an existing canvas node, otherwise one is created.

        elements: undefined, // (Array) Array of elements to render on the Canvallax instance

        animating: true, // (Boolean) Update canvas every requestAnimationFrame call.

        fullscreen: true, // (Boolean) Set the canvas width and height to the size of the window, and update on window resize. Otherwise, the provided with and height will be used.

        preRender: noop, // (Function) called before elements are rendered.

        postRender: noop // (Function) called after elements are rendered.

      },

      // Only one scroll tracker that works for every Canvallax instance
      watchingScroll = false,
      Wscrollx = 0,
      Wscrolly = 0,
      onScroll = function(){
        Wscrollx = R.scrollLeft || B.scrollLeft;
        Wscrolly = R.scrollTop || B.scrollTop;
      };


  // Check for canvas support, exit out if no supprt
  if ( !W.CanvasRenderingContext2D ) { return W.Canvallax = function(){ return false; }; }


  function Canvallax(options) {
    // Make new instance if not called with `new Canvallax`
    if ( !(this instanceof Canvallax) ) { return new Canvallax(options); }

    var C = this;

    Canvallax.extend(this,defaults,options);

    C.canvas = C.canvas || D.createElement('canvas');
    C.canvas.className = 'canvallax ' + C.className;
    C.parent.insertBefore(C.canvas, C.parent.firstChild);

    if ( C.fullscreen ) {
      C.resizeFullscreen();
      W.addEventListener('resize', C.resizeFullscreen.bind(C));
    } else {
      C.resize(C.width,C.height);
    }

    C.ctx = C.canvas.getContext('2d');

    C.elements = [];
    if ( options && options.elements ) { C.addElements(options.elements); }

    C.damping = ( !C.damping || C.damping < 1 ? 1 : C.damping );

    if ( !watchingScroll ) {
      watchingScroll = true;
      onScroll();
      W.addEventListener('scroll', onScroll);
      W.addEventListener('touchmove', onScroll);
    }

    C.render();

    return C;
  }


  ////////////////////////////////////////


  function zIndexSort(a,b){
    return (a.zIndex === b.zIndex ? 0 : a.zIndex < b.zIndex ? -1 : 1 );
  }

  function stop(){
    this.animating = false;
    return this;
  }

  Canvallax.prototype = {

    _x: 0,
    _y: 0,

    add: function(elements){
      elements = elements.length ? elements : [elements];

      var i = 0,
          len = elements.length;

      for ( ; i < len; i++ ) {
        this.elements.push(elements[i]);
      }

      this.elements.sort(zIndexSort);
      return this;
    },

    remove: function(element){
      var index = this.elements.indexOf(element);

      if ( index > -1 ) {
        this.elements.splice(index, 1);
      }
      return this;
    },

    render: function() {
      var C = this,
          i = 0,
          len = C.elements.length;

      if ( C.animating ) { C.animating = requestAnimationFrame(C.render.bind(C)); }

      if ( C.scroll ) {
        C.x = ( C.scroll === 'invert' || C.scroll === 'invertx' ? -Wscrollx : Wscrollx );
        C.y = ( C.scroll === 'invert' || C.scroll === 'inverty' ? -Wscrolly : Wscrolly );
      }

      C._x += ( -C.x - C._x ) / C.damping;
      C._y += ( -C.y - C._y ) / C.damping;

      C.ctx.clearRect(0, 0, C.width, C.height);
      //C.ctx.scale(C.zoom,C.zoom);

      C.preRender(C.ctx,C);
      C.ctx.save();

      for ( ; i < len; i++ ){
        C.elements[i]._render(C.ctx,C);
        C.ctx.setTransform(1, 0, 0, 1, 0, 0);
        C.ctx.globalAlpha = 1;
      }

      C.ctx.restore();
      C.postRender(C.ctx,C);

      return this;
    },

    resize: function(width,height){
      this.width = this.canvas.width = width;
      this.height = this.canvas.height = height;
      return this;
    },

    resizeFullscreen: function() {
      return this.resize(W.innerWidth,W.innerHeight);
    },

    play: function(){
      this.animating = true;
      this.render();
      return this;
    },

    stop: stop,
    pause: stop
  };


  ////////////////////////////////////////


  Canvallax.extend = function(target) {
    target = target || {};

    var length = arguments.length,
        i = 1;

    if ( arguments.length === 1 ) {
      target = this;
      i = 0;
    }

    for ( ; i < length; i++ ) {
      if ( !arguments[i] ) { continue; }
      for ( var key in arguments[i] ) {
        if ( arguments[i].hasOwnProperty(key) ) { target[key] = arguments[i][key]; }
      }
    }

    return target;
  };


  ////////////////////////////////////////


  var elementPrototype = {
    x: 0,
    y: 0,
    opacity: 1,
    distance: 1,
    scale: true,
    fixed: false,

    preRender: noop,
    postRender: noop,
    render: noop,
    init: noop,

    _render: function(ctx,C) {
      var el = this,
          distance = el.distance || 1,
          x = C._x,
          y = C._y;

      el.preRender.call(el,ctx,C);

      C.ctx.globalAlpha = el.opacity;

      if ( el.scale ) {
        C.ctx.scale(distance,distance);
      } else {
        x *= distance;
        y *= distance;
      }

      if ( !el.fixed ) { C.ctx.translate(x, y); }

      el.render.call(el,ctx,C);
      el.postRender.call(el,ctx,C);
    },

    clone: function(props){

      var props = Canvallax.extend({}, this, props);

      return new this.constructor(props);
    }

  };

  Canvallax.createElement = function(defaults){

    function El(options) {
      if ( !(this instanceof El) ) { return new El(options); }

      Canvallax.extend(this,options);
      this.init.apply(this,arguments);
    }

    El.prototype = Canvallax.extend({},elementPrototype,defaults);
    El.prototype.constructor = El;

    return El;
  };

  Canvallax.Element = Canvallax.createElement();

  ////////////////////////////////////////

  W.Canvallax = Canvallax;

})();