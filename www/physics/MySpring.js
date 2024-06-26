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
 * Copyright: 2006-2007
 */

/**
 * Spring
 * 
 * @author Kyle Scholz
 * 
 * @version 0.3
 * 
 * A Spring Force between two Particle.
 * 
 * @param {Particle} a  - A Particle.
 * @param {Particle} b  - The other Partilce.
 * @param {Number} springConstant - The Spring constant.
 * @param {Number} dampingConstant  - The damping constant.
 * @param {Number} r  - The rest length of the Spring.
 */

MySpring = class {

	/*
	 * Initialize the Spring Force.
	 *  
	 * @param {Particle} a  - A Particle.
	 * @param {Particle} b  - The other Partilce.
	 * @param {Number} springConstant - The Spring constant.
	 * @param {Number} dampingConstant  - The damping constant.
	 * @param {Number} restLength  - The length of the Spring at rest.
	 */

	constructor (a, b, springConstant, dampingConstant, restLength) {
		this['springConstant'] = springConstant
		this['damping'] = dampingConstant
		this['restLength'] = restLength
		this['a'] = a
		this['b'] = b
    this['age'] = 0
		// The force exerted by the Spring on the X axis.
		this.forceX = 0
		// The force exerted by the Spring on the Y axis.
		this.forceY = 0
	}
	
	/*
	 * Apply a spring force based on distance between particles.
	 */
	apply () {

		// Determine the current length of the spring
		let dx = this.a.positionX - this.b.positionX
		let dy = this.a.positionY - this.b.positionY
		let springLength = Math.sqrt( dx*dx + dy*dy )

		if ( springLength == 0 ) {
			dx = 0
			dy = 0
		} else {
			dx *= (1/springLength)
			dy *= (1/springLength)
		}

		// Determine the spring force
		let springForce = -(springLength - this.restLength) * this.springConstant

		// Determine the damping force
		let vx = this.a.velocityX - this.b.velocityX
		let vy = this.a.velocityY - this.b.velocityY
		let dampingForce = -this.damping * (dx * vx + dy * vy)

		// Determine the sum force
		let force = springForce + dampingForce

		// Apply force to vectors
		dx *= force
		dy *= force

		// Get the difference since last application 
		let dfx = dx - this.forceX
		let dfy = dy - this.forceY
		
		if (!this.a.fixed && !this.a.selected) {
			this.a.forceX += dfx
			this.a.forceY += dfy
		}

		if (!this.b.fixed && !this.b.selected) {
			this.b.forceX -= dfx
			this.b.forceY -= dfy
		}

		// Update the spring force
		this.forceX = dx
		this.forceY = dy
	}
}
