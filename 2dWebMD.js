(function() {

  var MdSystem = function() {
    this.atom_counts = 0;
    this.elasticity = 1.0;
    this.DEFAULT_BODY_SIZE = 10;
    this.HASH_TABLE_SIZE = 32;
    this.ATOM_TYPES = 
    {
        OXYGEN: {radius: 15, color: 'red', mass: 2, C6: 0.126, C12: 0.0008},
        HYDROGEN: {radius: 12, color: 'blue', mass: 1, C6: 0.0, C12: 0.0},
        THERMON: {radius: 8, color: 'heat', mass: 1, C6: 0.0, C12: 0.0}
    };
    this.partition = [];
    this.bodies = [];
    this.unit = 1;
    this.gravity = function(){
      // by default no gravity 
    }
    var screen = document.getElementById("screen").getContext('2d');
    this.box = {x: screen.canvas.width, y: screen.canvas.height};
    this.wall = this.simpleWallCollision; // default wall type

    var self = this;
    var runUserCommand = function(arg){
      splitted_args = splitByNewLine(arg);
      for ( var i = 0; i < splitted_args.length; i++){
        self.commandParser(splitted_args[i]);
      }
    }

    drawBox(screen);

/*
    document.addEventListener('keypress', function(key){
      if ( key.charCode == 13 ){
        alert('enter pressed');
        var msg = document.getElementById("user-input").value;
        runUserCommand(msg);
        document.getElementById("user-input").value = '';
        self.simpleWallCollision();
        self.draw(screen);
      }
    });*/

    document.getElementById("only_form").addEventListener('submit', function(evt){
      var msg = document.getElementById("user-input").value;
      runUserCommand(msg);
      document.getElementById("user-input").value = '';
      self.simpleWallCollision(self.elasticity);
      self.draw(screen);
      evt.preventDefault();
    });

    document.getElementById("select-example").addEventListener('change', function(evt){
      var msg = evt.srcElement.value;
      document.getElementById("user-input").value = msg;

      // Go back to selecting the first element
      evt.srcElement.selectedIndex = 0;
    });


    var tick = function() {
      self.updatePartition();
      self.update();
      self.gravity();
      self.wall(self.elasticity);
      //self.topBottomHeatBathWall(0.2, 1.5);
      //self.simpleWallCollision();
      //self.applyPBC();

      self.draw(screen);
      requestAnimationFrame(tick);
    };

    document.getElementById("button").addEventListener('click', function() {
      tick();
    });
    
  };

  MdSystem.prototype = {

    commandParser: function(arg){
      var tokens = arg.trim().split(",");
      var dic = {};
      for ( var i = 0; i < tokens.length; i++){
        var subtokens = tokens[i].trim().split(":");
        var key = subtokens[0].trim();
        var value = subtokens[1].trim();
        dic[key] = value;
      }
      if ( dic["add"] == "atom"){
        var radius_ = 12;
        var mass_ = 1;
        var color_ = "red";
        var speed = 0.0;
        var vx = 0.0;
        var vy = 0.0;
        var vel;
        var region = {topleft: {x: 0, y: 0}, 
                      bottomright: {x: this.box.x, y: this.box.y}}
        var center = genRandPosition(region);
        if ( dic["radius"] != null){
          radius_ = parseInt(dic["radius"]);
        }
        if ( dic["mass"] != null ){
          mass_ = parseInt(dic["mass"]);
        }
        if ( dic["color"] != null ){
          color_ = dic["color"];
        }
        if ( dic["speed"] != null){
          speed = parseFloat(dic["speed"]);
        }
        if ( dic["vx"] != null){
          vx = parseFloat(dic["vx"]);
        }
        if ( dic["vy"] != null){
          vy = parseFloat(dic["vy"]);
        }
        if ( vx != 0 || vy != 0 ){
          vel = new Vector(vx, vy);
        }
        else{
          vel = genRandVelocity(speed);
        }
        if ( dic["x"] != null){
          center.x = parseInt(dic["x"]);
        }
        if ( dic["y"] != null){
          center.y = parseInt(dic["y"]);
        }
        var atomType = {radius: radius_, mass: mass_, color: color_};
        var body = new Atom(atomType, center, vel);
        while (true){
          if ( !this.checkOverlap(body) ) {
            this.addAtom(body);
            break;
          }
          center = genRandPosition(region);
          body = new Atom(atomType, center, vel);
        }
      }

      if ( dic["add"] == "atoms" ){
        var numAtoms = parseInt(dic["number"]);
        var radius = 12;
        var mass = 1;
        var color = "red";
        var speed = 0.0;
        if ( dic["radius"] != null){
          radius = parseInt(dic["radius"]);
        }
        if ( dic["mass"] != null ){
          mass = parseInt(dic["mass"]);
        }
        if ( dic["color"] != null ){
          color = dic["color"];
        }
        if ( dic["speed"] != null){
          speed = parseFloat(dic["speed"]);
        }
        var region = {topleft: {x: 0, y: 0}, 
                      bottomright: {x: this.box.x, y: this.box.y}}
        if ( dic["region"] != null){
          if (dic["region"] == "upper half"){
            region = {topleft: {x: 0, y: 0}, 
                      bottomright: {x: this.box.x, y: this.box.y/2}}
          }
          else if ( dic["region"] == "bottom half"){
            region = {topleft: {x: 0, y: this.box.y/2}, 
                      bottomright: {x: this.box.x, y: this.box.y}}
          }
          else if ( dic["region"] == "left half" ){
            region = {topleft: {x: 0, y: 0}, 
                      bottomright: {x: this.box.x/2, y: this.box.y}}
          }
          else if ( dic["region"] == "right half"){
            region = {topleft: {x: this.box.x/2, y: 0}, 
                      bottomright: {x: this.box.x, y: this.box.y}}
          }
        }              
        this.addAtoms(radius, mass, color, speed, region, numAtoms );
      }
      else if ( dic["add"] == "heat bath" ){
        var topv = parseFloat(dic["topv"]);
        var bottomv = parseFloat(dic["bottomv"]);
        this.wall = function(elasticity){
          this.topBottomHeatBathWall(elasticity, topv, bottomv);
        }
      }
      else if ( dic["add"] == "pbc"){
        this.wall = this.applyPBC;
      }
      else if ( dic["add"] == "gravity"){
          var acc = 0.05; // default
          if ( dic["level"] != null ){
            acc = parseFloat(dic["level"]);
          }
          this.gravity = function(){
            this.applyGravity(acc);
          }
      }
      else if ( dic["elasticity"] != null ){
        this.elasticity = parseFloat(dic["elasticity"]);
      }

    },

    addAtoms: function(radius_, mass_, color_, initial_speed, region, number){
      var atomType = {radius: radius_, mass: mass_, color: color_};
      var addedSoFar = 0;
      while ( addedSoFar < number ){
        var vel = genRandVelocity(initial_speed);
        var center = genRandPosition(region);
        var body = new Atom(atomType, center, vel);
        if ( !this.checkOverlap(body) ) {
          this.addAtom(body);
          addedSoFar++;
        }
      }
    },

    checkOverlap: function(body){
      for ( var i = 0; i < this.bodies.length; i++){
        if ( this.bodies[i].center.sub(body.center).norm() <
             (this.bodies[i].radius + body.radius + 0.1) ){
          return true;
        }
      }
      return false;
    },

    getMinImage: function(R){
        // need to implement this
        return R;
    },

    update: function(){
      for ( var i = 0; i < this.bodies.length; i++){
        this.bodies[i].update();
      }
      reportCollisions(this);
    },

    applyPBC: function(){
      for ( var i = 0; i < this.bodies.length; i++){
        applyPBC(this, this.bodies[i]);        
      }
    },



    simpleWallCollision: function(elasticity){
      for ( var i = 0; i < this.bodies.length; i++){
        if ( this.bodies[i].center.x <= this.bodies[i].radius){
          this.bodies[i].center.x = this.bodies[i].radius;
          this.bodies[i].velocity.x = Math.abs(this.bodies[i].velocity.x)*elasticity;
        }
        else if ( this.bodies[i].center.x >= this.box.x - this.bodies[i].radius ){
          this.bodies[i].center.x = this.box.x - this.bodies[i].radius;
          this.bodies[i].velocity.x = -Math.abs(this.bodies[i].velocity.x)*elasticity;
        }

        if ( this.bodies[i].center.y <= this.bodies[i].radius ){
          this.bodies[i].center.y = this.bodies[i].radius ;
          this.bodies[i].velocity.y = Math.abs(this.bodies[i].velocity.y)*elasticity;
        }
        else if ( this.bodies[i].center.y >= this.box.y - this.bodies[i].radius ){
          this.bodies[i].center.y = this.box.y - this.bodies[i].radius;
          this.bodies[i].velocity.y = -Math.abs(this.bodies[i].velocity.y)*elasticity;
        }
      }
    },

    topBottomHeatBathWall: function(elasticity, top_vel, bottom_vel){
      for ( var i = 0; i < this.bodies.length; i++){
        if ( this.bodies[i].center.x <= this.bodies[i].radius){
          this.bodies[i].center.x = this.bodies[i].radius;
          this.bodies[i].velocity.x = Math.abs(this.bodies[i].velocity.x)*elasticity;
        }
        else if ( this.bodies[i].center.x >= this.box.x - this.bodies[i].radius ){
          this.bodies[i].center.x = this.box.x - this.bodies[i].radius;
          this.bodies[i].velocity.x = -Math.abs(this.bodies[i].velocity.x)*elasticity;
        }

        if ( this.bodies[i].center.y <= this.bodies[i].radius ){
          this.bodies[i].center.y = this.bodies[i].radius ;
          this.bodies[i].velocity.y = Math.abs(this.bodies[i].velocity.y);
          var speed = this.bodies[i].velocity.norm();
          if ( speed != 0 ){
            var scaleFactor = top_vel/speed;
            this.bodies[i].velocity = this.bodies[i].velocity.multiply(scaleFactor);
          }
        }
        else if ( this.bodies[i].center.y >= this.box.y - this.bodies[i].radius ){
          this.bodies[i].center.y = this.box.y - this.bodies[i].radius;
          this.bodies[i].velocity.y = -Math.abs(this.bodies[i].velocity.y);
          var speed = this.bodies[i].velocity.norm();
          if ( speed != 0 ){
            var scaleFactor = bottom_vel/speed;
            this.bodies[i].velocity = this.bodies[i].velocity.multiply(scaleFactor);
          }
        }
      }

    },


    draw: function(screen){
      screen.clearRect(0, 0, this.box.x, this.box.y);
      drawBox(screen);
      for (var i = 0; i < this.bodies.length; i++) {
        if (this.bodies[i].draw !== undefined) {
          this.bodies[i].draw(screen);
        }
      }
    },

    updatePartition: function(){
      this.partition = [];
      for ( var i = 0; i < this.HASH_TABLE_SIZE; i++){
        row = [];
        for ( var j = 0; j < this.HASH_TABLE_SIZE; j++){
          col = [];
          row.push(col);
        }
        this.partition.push(row);
      }
      for ( var i = 0; i < this.bodies.length; i++){
        row = hash(this.box.y, this.HASH_TABLE_SIZE, this.bodies[i].center.y);
        col = hash(this.box.x, this.HASH_TABLE_SIZE, this.bodies[i].center.x);
        this.partition[row][col].push(this.bodies[i]);
      }
    },

    addAtom: function(body){
      body.setIndex(this.atom_counts);
      this.bodies.push(body);
      this.atom_counts++;
    },

    applyGravity: function(acc){
      for ( var i = 0; i < this.bodies.length; i++){
        this.bodies[i].velocity.y += acc;
      }
    }
  };

  var hash = function(box_length, num_grid, position){
    dGrid = box_length/num_grid;
    index = Math.floor(position/dGrid);
    return index;
  };

  var Atom = function(atomtype, center, v0){
    this.atomtype = atomtype;
    this.mass = atomtype.mass;
    this.C6 = atomtype.C6;
    this.C12 = atomtype.C12;
    this.sigma = Math.pow(this.C12/this.C6, 1.0/6.0);
    this.center = new Vector(center.x, center.y);
    this.radius = atomtype.radius;
    this.velocity = new Vector(v0.x, v0.y);
    this.index = -1; // uninitialized
  };
  Atom.prototype = {
    setIndex: function(index){
      this.index = index;
    },

    update: function(){
      this.center.x += this.velocity.x;
      this.center.y += this.velocity.y;
    },

    collision: function(elasticity, body){
      var Rij = this.center.sub(body.center);

      var mi = this.mass;
      var mj = body.mass;
      var vi_old = this.velocity;
      var uij = Rij.normalize();
      var tan = new Vector(-uij.y, uij.x); // tangential unit vector to the collision surface
      var vi_tan = vi_old.dot(tan);
      var vi_perp = Math.sqrt( vi_old.normsq() - vi_tan*vi_tan);

      var vj_old = body.velocity;
      var vj_tan = vj_old.dot(tan);
      var vj_perp = Math.sqrt( vj_old.normsq() - vj_tan*vj_tan );

      var vi_delta = ((-vi_perp*(mi - mj) + 2*mj*vj_perp)/(mi + mj))*elasticity;
      var vj_delta = ((-vj_perp*(mj - mi) + 2*mi*vi_perp)/(mi + mj))*elasticity;

      var vi_new = tan.multiply(vi_tan).add( uij.multiply(vi_delta));
      var vj_new = tan.multiply(vj_tan).sub( uij.multiply(vj_delta));
      body.velocity = vj_new;
      this.velocity = vi_new;

      var distance = Rij.norm();
      var minDistance = (this.radius + body.radius);
      if ( distance <  minDistance) {
        this.center = body.center.add( Rij.multiply( minDistance/distance ));
        if ( elasticity < 1.0 ){
          this.velocity = this.velocity.add( uij.multiply( 0.04*(minDistance - distance)));
          body.velocity = body.velocity.sub( uij.multiply( 0.04*(minDistance - distance)));
        }
      }


    },

    draw: function(screen){
        drawCircle(screen, this);
    }
  };

  var Vector = function(x, y){
    this.x = x;
    this.y = y;
  };
  Vector.prototype = {
    norm: function(){
      return Math.sqrt(this.x*this.x + this.y*this.y);
    },
    normsq: function(){
      return this.x*this.x + this.y*this.y;
    },
    sub: function(v){
      return new Vector(this.x - v.x, this.y - v.y);
    },
    add: function(v){
      return new Vector(this.x + v.x, this.y + v.y);
    },
    multiply: function(scalar){
      return new Vector(this.x*scalar, this.y*scalar);
    },
    dot: function(v){
      return (this.x*v.x + this.y*v.y);
    },
    normalize: function(){
      denom = this.norm();
      return this.multiply(1/denom);
    }
  };

  var applyPBC = function(mdsystem, body){
    if ( body.center.x >= mdsystem.box.x ){
      body.center.x -= mdsystem.box.x;
    }
    else if ( body.center.x < 0 ){
      body.center.x += mdsystem.box.x;
    }
    if ( body.center.y >= mdsystem.box.y ){
      body.center.y -= mdsystem.box.y;
    }
    else if ( body.center.y < 0 ){
      body.center.y += mdsystem.box.y;
    }
  };

  var isColliding = function(b1, b2){
    distance = getDistance(b1.center, b2.center);
    return ( b1 != b2 && distance < b1.radius + b2.radius + 0.1);
  };

  var getDistance = function(v1, v2){
    return v1.sub(v2).norm();
  };

  var getLennardJonesForce = function(mdsystem, body1, body2){
    C6 = Math.sqrt(body1.C6*body2.C6);
    C12 = Math.sqrt(body1.C12*body2.C12);
    Rorg = body1.center.sub(body2.center);
    R = mdsystem.getMinImage(Rorg).multiply(mdsystem.unit);
    rsq = R.normsq();
    return R.multiply( C12/Math.pow(rsq,7) - C6/Math.pow(rsq, 4) );
  };

  var drawBox = function(screen){
    screen.beginPath();
    screen.moveTo(0,0);
    screen.lineTo(screen.canvas.width, 0);
    screen.lineTo(screen.canvas.width, screen.canvas.height);
    screen.lineTo(0, screen.canvas.height);
    screen.lineTo(0, 0);
    screen.stroke();
  };

  var drawCircle = function(screen, body){
    screen.beginPath();
    screen.arc(body.center.x, body.center.y, body.radius, 0, 2*Math.PI);
    if ( body.atomtype.color != 'heat') {
      screen.fillStyle = body.atomtype.color;
    }
    else{
/*
      var redCode = Math.floor(body.velocity.norm()/1.0 * 255);
      if ( redCode > 255 ){
        redCode = 255;
      }
      var blueCode = 255 - redCode;
      */
      rgbCode = rgb(0, 1.2, body.velocity.norm()); //redCode.toString(16);
      var redHexCode = rgbCode['r'].toString(16);
      var blueHexCode = rgbCode['b'].toString(16);
      var greenHexCode = rgbCode['g'].toString(16);
      //var blueHexCode = blueCode.toString(16);
      if (redHexCode.length == 1 ) redHexCode = "0" + redHexCode;
      if (blueHexCode.length == 1 ) blueHexCode = "0" + blueHexCode;
      if (greenHexCode.length == 1 ) greenHexCode = "0" + greenHexCode;
      screen.fillStyle = "#"+redHexCode +  greenHexCode + blueHexCode;
    }
    screen.fill();
    screen.strokeStyle = 'black';
    screen.stroke();
  };

  var rgb = function(minimum, maximum, value){
    if ( value > maximum ){
      maximum = value;
    }
    halfmax = (minimum + maximum)/2;
    b = Math.floor( Math.max(0, 255*(1 - value/halfmax)) );
    r = Math.floor( Math.max(0, 255*(value/halfmax - 1 )));
    g = 255 - b - r;
    return {'r': r, 'g':g, 'b':b};
  };

  var reportCollisions = function(mdsystem) {
    var elasticity = mdsystem.elasticity;
    var bodyPairs = [];
    var bodies = mdsystem.bodies;
    var hashsize = mdsystem.HASH_TABLE_SIZE;
    var partition = mdsystem.partition;
    for ( var i = 0; i < bodies.length; i++){
      row = hash(mdsystem.box.y, hashsize, bodies[i].center.y);
      col = hash(mdsystem.box.x, hashsize, bodies[i].center.x);
      for ( var q = -1; q < 2; q++){
        for ( var z = -1; z < 2; z++){
          rowIndex = (row+q+hashsize)%hashsize;
          colIndex = (col+z+hashsize)%hashsize;
          for ( var w = 0; w < partition[rowIndex][colIndex].length; w++){
            bodyj = partition[rowIndex][colIndex][w];
            if ( isColliding(bodies[i], bodyj) && bodies[i].index < bodyj.index){
              bodyPairs.push([bodies[i], bodyj]);
            }
          }
        }
      }
    }

    for (var i = 0; i < bodyPairs.length; i++) {
      if (bodyPairs[i][0].collision !== undefined) {
        bodyPairs[i][0].collision(elasticity, bodyPairs[i][1]);
      }
    }
  };

  var genRandPosition = function(region){
    /* input parameter region is a dictionary containing two keys
        1. topleft and 2. bottomright in which both specify area to 
        be used to generate positions */
    var width = region.bottomright.x - region.topleft.x;
    var height = region.bottomright.y - region.topleft.y;
    var left = region.topleft.x;
    var top = region.topleft.y;
    return new Vector(Math.random()*width + left,Math.random()*height + top);
  };


  var genRandVelocity = function(speed){
    var vx = Math.random();
    var vy = Math.random();
    var currSpeed = Math.sqrt(vx*vx + vy*vy);
    var scale = speed/currSpeed;
    return new Vector(scale*vx, scale*vy);
  };

  var splitByNewLine = function (text) {
    return text.match(/[^\r\n]+/g);
  };

  var removeEmptyLinesAndTabs = function(text) {
    lines = splitByNewLine(text);
    // Trim every line
    var trim = function (el) {
      return el.trim();
    };
    var notEmpty = function (el) {
      return el.length > 0;
    };

    lines = lines.map(trim).filter(notEmpty);
    
    return lines.join('\n');
  };

  var cleanUpDropdown = function() {
    console.log('clean up');
    var dropdown = document.getElementById("select-example");
    for (var i = 0; i < dropdown.length; i++){
      var betterVal = removeEmptyLinesAndTabs(dropdown.options[i].value);
      dropdown.options[i].value = betterVal;
    };
  };

  window.addEventListener('load', function() {
    new MdSystem();
    cleanUpDropdown();
  });
})();
