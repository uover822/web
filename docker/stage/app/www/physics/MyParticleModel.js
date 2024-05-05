/* Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 *     
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Author: Kyle Scholz      http://kylescholz.com/
 * Author: Lorien Henry-Wilkins
 * Copyright: 2006-2007
 */

/**
 * ParticleModel
 * 
 * @author Kyle Scholz
 * @author Lorien Henry-Wilkins
 * 
 * @version 0.3
 * 
 * The ParticleModel drives our graph. It applies the forces that dictate the
 * position of nodes.
 * 
 * This implementation is optimized to:
 * - Draw nodes only when visible changes have occured.
 * - Recompute forces on older particles at lower frequency
 *   - Can be further optimized to adjust frequency based on a force's volatility
 *     or the volatility in it's constituent particles' positions.
 */
let self

MyParticleModel = class {

  constructor (view) {
	  this.init( view )
    self = this
  }

	/*
	 * Initialize the ParticleModel
	 */
	init (view) {
		this.ENTROPY_THROTTLE=true

		this.view = view

		this.particles = new Map()

		this.nextParticleId = 0

		this.springs = new Array()

		this.activeSprings = new Array()

		this.springLast = 0

		this.magnets = new Array()

		this.activeMagnets = new Array()

		this.magLast = 0

		this.integrator = new MyRungeKuttaIntegrator(this, view)

		this.timer = new MyTimer(1)
		
		this.timer.subscribe(this)

		this.setSize(this.view.frameWidth,this.view.frameHeight,this.view.skewX,this.view.skewY)

    this.drag = false
	}
	
	/*
	 * Perform a timestep.
	 */
	tick () {
		this.integrator.step(1)
		return this.draw()
	}

	/*
	 * Set boundaries.
	 * 
	 * @param {Object} frameWidth
	 * @param {Object} frameHeight
	 */
	setSize (frameWidth,frameHeight) {
		this.boundsLeft = (-frameWidth/this.view.skewX)/2
		this.boundsRight = (frameWidth/this.view.skewX)/2
		this.boundsTop = (-frameHeight/this.view.skewY)/2
		this.boundsBottom = (frameHeight/this.view.skewY)/2
	}

  setDrag (_drag) {
	  this.drag = _drag
  }

  setSelected (_id) {
    this.selected = _id
  }

	/*
	 * Draw all particles
	 */
  draw (force) {
	  let view = this.view
	  view.set()

	  let particles = this.particles
	  let moved = 0

	  let skewX = this.view.skewX
	  let skewY = this.view.skewY
	  particles.forEach ((particle) => {
		  //bounds checking
      if (particle) {
		    if(self.boundsLeft) { //only check if the bounds have been set
			    if (particle.positionX < self.boundsLeft+(particle.width/2)/skewX) {
				    particle.positionX = self.boundsLeft+(particle.width/2)/skewX
			    } else if ( particle.positionX > (self.boundsRight-(particle.width/2)/skewX) ) {
				    particle.positionX = self.boundsRight-(particle.width/2)/skewX
			    }

			    if (particle.positionY < self.boundsTop+(particle.height/2/skewY)) {
				    particle.positionY = self.boundsTop+(particle.height/2/skewY)
			    } else if (particle.positionY > (self.boundsBottom-(particle.height/2/skewY)) ) {
				    particle.positionY = self.boundsBottom-(particle.height/2/skewY)
			    }
		    }

		    let newDrawPositionX = Math.round(particle.positionX*2)/2
		    let newDrawPositionY = Math.round(particle.positionY*2)/2
		    let redraw = ( force || newDrawPositionX != particle.lastDrawPositionX || newDrawPositionY != particle.lastDrawPositionY ) ? true : false
			  view.drawNode( particle,true )
		    if (redraw){
			  view.drawNode(particle,redraw) 
			    moved++
			    particle.lastDrawPositionX = newDrawPositionX
			    particle.lastDrawPositionY = newDrawPositionY
		    }
	    }
    })

	  return moved
  }

	/*
	 * Add all view nodes
	 */
  addElements () {
	  let view = this.view
	  view.set()

	  let particles = this.particles
	  let moved = 0

	  let skewX = this.view.skewX
	  let skewY = this.view.skewY
	  particles.forEach ((particle) => {
		  //bounds checking
      if (particle) {
		    if(self.boundsLeft) { //only check if the bounds have been set
			    if (particle.positionX < self.boundsLeft+(particle.width/2)/skewX) {
				    particle.positionX = self.boundsLeft+(particle.width/2)/skewX
			    } else if ( particle.positionX > (self.boundsRight-(particle.width/2)/skewX) ) {
				    particle.positionX = self.boundsRight-(particle.width/2)/skewX
			    }

			    if (particle.positionY < self.boundsTop+(particle.height/2/skewY)) {
				    particle.positionY = self.boundsTop+(particle.height/2/skewY)
			    } else if (particle.positionY > (self.boundsBottom-(particle.height/2/skewY)) ) {
				    particle.positionY = self.boundsBottom-(particle.height/2/skewY)
			    }
		    }

		    let newDrawPositionX = Math.round(particle.positionX*2)/2
		    let newDrawPositionY = Math.round(particle.positionY*2)/2
	    }
    })

	  return moved
  }

	/*
	 * Create and add a new particle to the system.
	 *  
	 * @param {Number} mass
	 * @param {Number} x
	 * @param {Number} y
	 */
  makeParticle (dataNode,x,y) {
	  let particle = new MyParticle(dataNode.mass,x,y)
	  particle.nodeId = null
	  particle.id = dataNode.id
	  particle.nodeId = dataNode.id
	  particle.type = dataNode.type
	  particle.drag = dataNode.drag
	  this.particles.set(particle.id, particle)
	  this['integrator'].allocateParticle(particle.id)

	  if (this.timer.interupt) {
		  this.timer.start()
	  }

	  return particle
  }

	/*
	 * Create a Spring between 2 nodes
	 * 
	 * @param {Particle} a  - A Particle.
	 * @param {Particle} b  - The other Partilce.
	 * @param {Number} springConstant - The Spring constant.
	 * @param {Number} dampingConstant  - The damping constant.
	 * @param {Number} restLength  - The length of the Spring at rest.
	 */	
  makeSpring (a,b,springConstant,dampingConstant,restLength) {

	  let spring = null

	  for (let i in this.springs)
		  if (this.springs[i].a.id == a.id && this.springs[i].b.id == b.id) {
			  spring = this.springs[i]
			  break
		  }

	  if (spring == null)
		  if (a.id != b.id) {
			  spring = new MySpring(a, b, springConstant, dampingConstant, restLength)
			  this.springs.push(spring)
			  this.activeSprings.push(spring)
		  }

	  return(spring)
  }

  findParticle (_id) {

	  this.particles.forEach ((particle) => {
      if (particle.id === _id)
	      return particle
    })

	  return null
  }

  dropParticle (_modelNode) {
	  delete this.particles.get(_modelNode.id)
  }

  pushParticle (tml, mn) {
	  tml.particles.set(mn.id, this.particles.get(mn.id))
  }

  pullParticle (tml, mn) {
	  this.particles.set(mn.id, tml.particles.get(mn.id))
  }

  dropParticleForces (_id) {
    for (let i=0,l=this.activeSprings.length;i<l;i++)
	    if (this.activeSprings[i].a.id == _id ||
	        this.activeSprings[i].b.id == _id) {
	      this.activeSprings.splice(i,1)
	      i--; l--
	    }

    for (let i=0,l=this.springs.length;i<l;i++)
	    if (this.springs[i].a.id == _id ||
	        this.springs[i].b.id == _id) {
	      this.springs.splice(i,1)
	      i--; l--
	    }

    for (let i=0,l=this.magnets.length;i<l;i++)
	    if (this.magnets[i].a.id == _id ||
	        this.magnets[i].b.id == _id) {
	      this.magnets.splice(i,1)
	      i--; l--
	    }
  }

  pushNew (t, h) {
    let done = false
    for (let i=0,l=t.length; i<l&&!done; i++)
      if (t[i].a.id == h.a.id &&
          t[i].b.id == h.b.id) {
        t[i] = h
        done = true
      }
    if (!done)
      t.push(h)
  }
  
  pullNew (h, t) {
    let done = false
    for (let i=0, l=h.length; i<l && !done; i++)
      if (h[i].a.id == t.a.id &&
          h[i].b.id == t.b.id) {
        h[i] = t

        done = true
      }
    if (!done)
      h.push(t)
  }

  pushParticleForces (tml, _id) {

    for (let i=0,l=this.activeSprings.length,done=false; i<l&&!done; i++)
	    if (this.activeSprings[i].a.id == _id ||
	        this.activeSprings[i].b.id == _id) {
	      this.pushNew(tml.activeSprings, this.activeSprings[i])
        done = true
	      //this.activeSprings.push(tml.activeSprings[i])
	    }

    for (let i=0,l=this.springs.length,done=false; i<l&&!done; i++)
	    if (this.springs[i].a.id == _id ||
	        this.springs[i].b.id == _id) {
	      this.pushNew(tml.springs, this.springs[i])
        done = true
	      //this.springs.push(tml.springs[i])
	    }

    for (let i=0,l=this.magnets.length,done=false; i<l&&!done; i++)
	    if (this.magnets[i].a.id == _id ||
	        this.magnets[i].b.id == _id) {
	      this.pushNew(tml.magnets, this.magnets[i])
	      //this.magnets.push(tml.magnets[i])
	    }
  }

  pullParticleForces (tml, _id) {

    for (let i=0,l=tml.activeSprings.length,done=false; i<l&&!done; i++)
	    if (tml.activeSprings[i].a.id == _id ||
	        tml.activeSprings[i].b.id == _id) {
	      this.pullNew(this.activeSprings, tml.activeSprings[i])
        done = true
	      //this.activeSprings.push(tml.activeSprings[i])
	    }

    for (let i=0,l=tml.springs.length,done=false; i<l&&!done; i++)
	    if (tml.springs[i].a.id == _id ||
	        tml.springs[i].b.id == _id) {
	      this.pullNew(this.springs, tml.springs[i])
        done = true
	      //this.springs.push(tml.springs[i])
	    }

    for (let i=0,l=tml.magnets.length,done=false; i<l&&!done; i++)
	    if (tml.magnets[i].a.id == _id ||
	        tml.magnets[i].b.id == _id) {
	      this.pullNew(this.magnets, tml.magnets[i])
        done = true
	      //this.magnets.push(tml.magnets[i])
	    }
  }

	/*
	 * Create a magnetic force between nodes
	 * 
	 * @param {Particle} a  - A Particle.
	 * @param {Particle} b  - The other Particle.
	 * @param {Number} g - A gravitational constant (that's right)
	 * @param {Number} distanceMin
	 */
  makeMagnet (a,b,g,distanceMin) {

	  let magnet = null

	  for (let i in this.magnets)
		  if (this.magnets[i].a.id == a.id && this.magnets[i].b.id == b.id) {
			  magnet = this.magnets[i]
			  break
		  }

	  if (magnet == null)
		  if (a !== null && b !== null && a.id != b.id) {
			  magnet = new MyMagnet(a,b,g,distanceMin)
			  this.magnets.push(magnet)
			  this.activeMagnets.push(magnet)
			  if (this.activeMagnets.length > 50)
				  this.activeMagnets.shift()
		  }

	  return magnet
  }

	/*
	 * Calculate and aggregate all forces for each particle
	 */
  applyForces () {

    /* Spring Forces */

    let activeSprings = this.activeSprings
    let springs = this.springs

    // Active Springs
    for (let i=0,l=activeSprings.length;i<l;i++) {
	    activeSprings[i].apply()
	    activeSprings[i].age++
    }

    // todo: I'm only pulling one node from the active collection per iteration		
    let springLen = this.activeSprings.length
    if (springLen > 0 && this.activeSprings[0].age > 20)
	    this.activeSprings.shift()

    // Calculate forces from Springs in window
    for (let i=0,l=springs.length;i<l;i++)
	    springs[i].apply()

    /* Magnetic Forces */

    let activeMagnets = this.activeMagnets
    let magnets = this.magnets

    // Active Magnets
    for (let i=0,l=activeMagnets.length;i<l;i++) {
	    activeMagnets[i].apply()
	    activeMagnets[i].age++
    }

    // todo: I'm only pulling one node from the active collection per iteration
    let magLen = this.activeMagnets.length
    if (magLen > 0 && this.activeMagnets[0].age > 50)
	    this.activeMagnets.shift()

    // Calculate forces from Magnets in window
    for (let i=0,l=magnets.length;i<l;i++)
	    magnets[i].apply()
  }
  
	/*
	 * Reset all of the stored forces in the model. 
	 */	
  reset () {

	  let springs = this.springs
	  for (let i=0, l=springs.length; i<l; i++) {
		  springs[i].forceX = 0
		  springs[i].forceY = 0
	  }

	  let magnets = this.magnets
	  for (let i=0, l=magnets.length; i<l; i++) {
		  magnets[i].forceX = 0
		  magnets[i].forceY = 0
	  }

	  let particles = this.particles
	  particles.forEach ((particle) => {
      if (particle) {
		    particle.forceX = 0
		    particle.forceY = 0
        self.integrator.allocateParticle(particle.id)
	    }
    })

	  if (this.timer.interupt)
		  this.timer.start()
  }

	/*
	 * Call animation timer update. Instruct the timer slow down if the
	 * graph is settling.
	 */
	update () {
		let moved = this.tick()
		let result = 1
		if (this.ENTROPY_THROTTLE && this.particles.size > 25) {
			let e = (moved/(this.particles.size))
			if (e < .01) {
				this.stop()
			} else if (e < .05) {
				return(50)
			} else if (e < .1) {
			  return(5)
			}
			return(1)
		}
		return result
	}

	/*
	 * Start animation timer.
	 */
	start () {
		this.timer.start()
	}

	/*
	 * Stop animation timer.
	 */	
	stop () {
		this.timer.stop()
	}

	/*
	 * Clear particles and forces. Wipe out intermediate data from view and integrator. 
	 */
	clear () {
		this.particles = new Map()

		this.nextParticleId = 0

		this.springs = new Array()

		this.activeSprings = new Array()

		this.springLast = 0

		this.magnets = new Array()

		this.activeMagnets = new Array()

		this.magLast = 0
		
		this.view.clear()
		
		this.integrator.initialize(this, this.view)
	}
}
