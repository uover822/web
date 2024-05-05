/* Licensed under the Apache License, Version 2.0 (the "License")
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
 * RungeKuttaIntegrator
 * 
 * @author Kyle Scholz
 * @author Lorien Henry-Wilkins
 * 
 * @version 0.3
 * 
 * A JavaScript implementation of the Runge-Kutta integrator. This implementation
 * is optimized to reduce the number of symbol lookups.
 * 
 * @see Inspired by traer.physics: http://www.cs.princeton.edu/~traer/physics/
 * @see Algorithm: http://calculuslab.deltacollege.edu/ODE/7-C-3/7-C-3-h.html
 * 
 * @param {ParticleModel} particleModel
 */
MyRungeKuttaIntegrator = class {

  constructor(particleModel,view) {
	  this.initialize(particleModel, view)
  }

	/*
	 * @param {ParticleModel} particleModel
	 * @param {View} view
	 */
	initialize (particleModel, view) {
		this.particleModel = particleModel
		this.particles = particleModel.particles

		this.view = view
	
		this.setSize(view.frameWidth, view.frameHeight, view.skew)
	
		this.k1ForcesX = new Map()
		this.k2ForcesX = new Map()
		this.k3ForcesX = new Map()
		this.k4ForcesX = new Map()
	
		this.k1ForcesY = new Map()
		this.k2ForcesY = new Map()
		this.k3ForcesY = new Map()
		this.k4ForcesY = new Map()
	
		this.k1VelocitiesX = new Map()
		this.k2VelocitiesX = new Map()
		this.k3VelocitiesX = new Map()
		this.k4VelocitiesX = new Map()
	
		this.k1VelocitiesY = new Map()
		this.k2VelocitiesY = new Map()
		this.k3VelocitiesY = new Map()
		this.k4VelocitiesY = new Map()
	}

	/*
	 * Set boundaries.
	 * 
	 * @param {Object} frameWidth
	 * @param {Object} frameHeight
	 */
	setSize (frameWidth,frameHeight,skew) {
		this.boundsLeft = (-frameWidth/2)/skew
		this.boundsRight = (frameWidth/2)/skew
		this.boundsTop = -frameHeight/2
		this.boundsBottom = frameHeight/2
	}

	/*
	 * Set up storage for a new particle.
	 * 
	 * @param {Number} i
	 */	
	allocateParticle (id) {
		this.k1ForcesX.set(id, 0)
		this.k2ForcesX.set(id, 0)
		this.k3ForcesX.set(id, 0)
		this.k4ForcesX.set(id, 0)

		this.k1ForcesY.set(id, 0)
		this.k2ForcesY.set(id, 0)
		this.k3ForcesY.set(id, 0)
		this.k4ForcesY.set(id, 0)

		this.k1VelocitiesX.set(id, 0)
		this.k2VelocitiesX.set(id, 0)
		this.k3VelocitiesX.set(id, 0)
		this.k4VelocitiesX.set(id, 0)

		this.k1VelocitiesY.set(id, 0)
		this.k2VelocitiesY.set(id, 0)
		this.k3VelocitiesY.set(id, 0)
		this.k4VelocitiesY.set(id, 0)
	}

	/*
	 * Perform integration over x=1.
	 */
  step () {
	  let particles = this.particles

	  let k1ForcesX = this.k1ForcesX
	  let k2ForcesX = this.k2ForcesX
	  let k3ForcesX = this.k3ForcesX
	  let k4ForcesX = this.k4ForcesX

	  let k1ForcesY = this.k1ForcesY
	  let k2ForcesY = this.k2ForcesY
	  let k3ForcesY = this.k3ForcesY
	  let k4ForcesY = this.k4ForcesY

	  let k1VelocitiesX = this.k1VelocitiesX
	  let k2VelocitiesX = this.k2VelocitiesX
	  let k3VelocitiesX = this.k3VelocitiesX
	  let k4VelocitiesX = this.k4VelocitiesX

	  let k1VelocitiesY = this.k1VelocitiesY
	  let k2VelocitiesY = this.k2VelocitiesY
	  let k3VelocitiesY = this.k3VelocitiesY
	  let k4VelocitiesY = this.k4VelocitiesY

    let self = this

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  particle.originalPositionX = particle.positionX
				  particle.originalPositionY = particle.positionY
 
				  particle.originalVelocityX = particle.velocityX/2
				  particle.originalVelocityY = particle.velocityY/2
			  }
    })

	  this.particleModel.applyForces()

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  k1ForcesX.set(particle.id, particle.forceX)
				  k1ForcesY.set(particle.id, particle.forceY)

				  k1VelocitiesX.set(particle.id, particle.velocityX)
				  k1VelocitiesY.set(particle.id, particle.velocityY)
			  }
    })

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected )
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  particle.positionX = particle.originalPositionX + k1VelocitiesX.get(particle.id) * 0.5
				  particle.positionY = particle.originalPositionY + k1VelocitiesY.get(particle.id) * 0.5

				  particle.velocityX = particle.originalVelocityX + (k1ForcesX.get(particle.id) * 0.5)/particle.mass
				  particle.velocityY = particle.originalVelocityY + (k1ForcesY.get(particle.id) * 0.5)/particle.mass
			  }
    })

	  this.particleModel.applyForces()

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  k2ForcesX.set(particle.id, particle.forceX)
				  k2ForcesY.set(particle.id, particle.forceY)

				  k2VelocitiesX.set(particle.id, particle.velocityX)
				  k2VelocitiesY.set(particle.id, particle.velocityY)
			  }
    })

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  particle.positionX = particle.originalPositionX + k2VelocitiesX.get(particle.id) * 0.5
				  particle.positionY = particle.originalPositionY + k2VelocitiesY.get(particle.id) * 0.5

				  particle.velocityX = particle.originalVelocityX + (k2ForcesX.get(particle.id) * 0.5)/particle.mass
				  particle.velocityY = particle.originalVelocityY + (k2ForcesY.get(particle.id) * 0.5)/particle.mass
			  }
    })

	  this.particleModel.applyForces()

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  k3ForcesX.set(particle.id, particle.forceX)
				  k3ForcesY.set(particle.id, particle.forceY)

				  k3VelocitiesX.set(particle.id, particle.velocityX)
				  k3VelocitiesY.set(particle.id, particle.velocityY)
			  }
    })

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  particle.positionX = particle.originalPositionX + k3VelocitiesX.get(particle.id)
				  particle.positionY = particle.originalPositionY + k3VelocitiesY.get(particle.id)

				  particle.velocityX = particle.originalVelocityX + (k3ForcesX.get(particle.id))/particle.mass
				  particle.velocityY = particle.originalVelocityY + (k3ForcesY.get(particle.id))/particle.mass
			  }
    })

	  this.particleModel.applyForces()

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  k4ForcesX.set(particle.id, particle.forceX)
				  k4ForcesY.set(particle.id, particle.forceY)

				  k4VelocitiesX.set(particle.id, particle.velocityX)
				  k4VelocitiesY.set(particle.id, particle.velocityY)
			  }
    })

	  particles.forEach ((particle) => {
		  if (!particle.fixed && !particle.selected)
			  if (self.particleModel.drag == true && particle.drag == true ||
					  self.particleModel.drag == false) {
				  particle.positionX = particle.originalPositionX
				    + (1 / 12)
				    * (k1VelocitiesX.get(particle.id) + 2 * k2VelocitiesX.get(particle.id) + 2
						   * k3VelocitiesX.get(particle.id) + k4VelocitiesX.get(particle.id))
				  particle.positionY = particle.originalPositionY
				    + (1 / 12)
				    * (k1VelocitiesY.get(particle.id) + 2 * k2VelocitiesY.get(particle.id) + 2
						   * k3VelocitiesY.get(particle.id) + k4VelocitiesY.get(particle.id))
				  particle.velocityX = particle.originalVelocityX
				    + (1 / (12 * particle.mass))
				    * (k1ForcesX.get(particle.id) + 2 * k2ForcesX.get(particle.id) + 2 * k3ForcesX.get(particle.id) + k4ForcesX.get(particle.id))
				  particle.velocityY = particle.originalVelocityY
				    + (1 / (12 * particle.mass))
				    * (k1ForcesY.get(particle.id) + 2 * k2ForcesY.get(particle.id) + 2 * k3ForcesY.get(particle.id) + k4ForcesY.get(particle.id))
			  }
    })
  }
}
