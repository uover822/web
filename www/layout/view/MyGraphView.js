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
 * GraphView
 * 
 * A universal graph view that supports HTML, vector, and canvas graphics.
 * 
 * @author Kyle Scholz
  * 
 * @version 0.3.4
 * 
 * @param {HTMLElement} container
 * @param {Boolean} skewView (optional) Indicates whether we should draw on a
 *        'skewed' canvas.
 * @param {Object} properties (optional) A set of properties for this view.
  */

MyGraphView = class {

  constructor(container, properties) {
	  this.properties = properties ? properties : this.defaultProperties

	  this.container = container

	  this.frameLeft = 0
	  this.frameTop = 0

	  this.skewView = this.properties.skew ? true : false
	  this.skewBase = 0
	  this.skewX = 1
	  this.skewY = 1

	  this['nodes'] = {}
	  this['edges'] = {}

    this['is'] = []
    
	  this.container.style.position="relative"
		
	  this.supportCanvas = this.isCanvasSupported()
	  this.supportVector = true

	  if (this.properties.useCanvas && this.supportCanvas) {
		  this.node_canvas = document.createElement("canvas")
		  this.node_canvas.style.position="absolute"
		  this.node_canvas.style.left="0px"
		  this.node_canvas.style.top="0px"
		  this.node_twod = this.node_canvas.getContext('2d')
		  this.container.appendChild(this.node_canvas)	
	  }

	  // TODO(kyle) Add check for svg2vml
	  if (this.properties.useVector && this.supportVector) {
		  this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
		  this.svg.setAttribute("version", "1.1")

		  this.defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
		  this.marker = document.createElementNS("http://www.w3.org/2000/svg", "marker")
      this.marker.setAttribute("id", "head")
      this.marker.setAttribute("orient", "auto-start-reverse")
      this.marker.setAttribute("markerWidth", "300")
      this.marker.setAttribute("markerHeight", "400")
      this.marker.setAttribute("markerUnits", "strokeWidth")
      this.marker.setAttribute("refX", "20")
      this.marker.setAttribute("refY", "3.5")
		  this.poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
      this.poly.setAttribute("points", "0 0, 10 3.5, 0 7")
			this.poly.setAttribute('fill', 'green')
      this.marker.appendChild(this.poly)
      this.defs.appendChild(this.marker)
      this.svg.appendChild(this.defs)

		  this.container.appendChild(this.svg)
		  this.ng = document.createElementNS("http://www.w3.org/2000/svg", "g")
	   	this.svg.appendChild(this.ng)
	  }

	  // if this is IE, turn on caching of javascript-loaded images explicitly
	  if (document.all) {
		  document.createStyleSheet().addRule('html',
			                                    'filter:expression(document.execCommand("BackgroundImageCache", false, true))')
	  }

	  if (this.properties.edgeRenderer == "canvas" && this.supportCanvas) {
		  this.edge_canvas = document.createElement("canvas")
		  this.edge_canvas.style.position="absolute"
		  this.edge_canvas.style.zIndex=0
		  this.edge_canvas.style.left="0px"
		  this.edge_canvas.style.top="0px"
		  this.edge_twod = this.edge_canvas.getContext('2d')
		  if(this.container.hasChildNodes) {
			  this.container.insertBefore(this.edge_canvas, this.container.firstChild)
		  } else {
			  this.container.appendChild(this.edge_canvas)
		  }
		  this.addEdge = this.addCanvasEdge
		  this.drawEdge = this.drawCanvasEdge

	  } else if(this.properties.edgeRenderer == "vector" && this.supportVector) {
		  this.eg = document.createElementNS("http://www.w3.org/2000/svg", "g")
		  if(this.svg.hasChildNodes) {
			  this.svg.insertBefore(this.eg, this.svg.firstChild)
		  } else {
			  this.svg.appendChild(this.eg)
		  }
			this.svg.insertBefore(this.defs, this.svg.firstChild)
		  this.addEdge = this.addVectorEdge
		  this.drawEdge = this.drawVectorEdge

	  } else {
		  this.addEdge = this.addHTMLEdge
		  this.drawEdge = this.drawHTMLEdge
	  }

    this.defaultProperties = {
	    skew: true,
	    useCanvas: true,
	    useVector: true,
	    edgeRenderer: "canvas"
    }

    this.defaultEdgeProperties = {
	    'html_pixels': 5,
	    'stroke': "#444444",
	    'stroke-width': '2px',
	    'stroke-dasharray': '2,4'
    }
  }

  resetSVG () {
    this.ng.innerHTML = ''
    this.eg.innerHTML = ''
  }
  
  /*
   * 
   */
  isCanvasSupported () {
	  let canvas = document.createElement("canvas")
	  return canvas && canvas.getContext
  }

  /*
   * 
   */
  /*
   * @param {Number} frameLeft
   * @param {Number} frameTop
   * @param {Number} frameWidth
   * @param {Number} frameHeight
   */
  setSize (frameLeft,frameTop,frameWidth,frameHeight) {
	  this.frameLeft = frameLeft
	  this.frameTop = frameTop
	  this.frameWidth = frameWidth
	  this.frameHeight = frameHeight

	  this.centerX = parseInt(frameWidth/2)
	  this.centerY = parseInt(frameHeight/2)

	  if (this.skewView && this.skewBase) {
		  this.skewX = this.frameWidth/this.skewBase
		  this.skewY = this.frameHeight/this.skewBase
	  } else {
		  this.skewX = 1
		  this.skewY = 1
	  }

	  if (this.properties.useCanvas && this.supportCanvas) {
		  if(this.properties.edgeRenderer=="canvas") {
			  this.edge_canvas.width=frameWidth
			  this.edge_canvas.height=frameHeight
		  }

		  this.node_canvas.width=frameWidth
		  this.node_canvas.height=frameHeight
	  }

	  if (this.properties.useVector && this.supportVector) {
	   	this.svg.setAttribute("width", this.frameWidth)
	   	this.svg.setAttribute("height", this.frameHeight)
		  let dimString = parseInt(-1*this.frameWidth/2) + " " + parseInt(-1*this.frameHeight/2)
			    + " " + this.frameWidth + " " + this.frameHeight
		  this.svg.setAttribute("viewBox", dimString)
	  }
  }

  /*
   * Add a node to the view. 
   *
   * @param {Particle} particle
   * @param {DOMNode} domElement
   * @param {Number} centerOffsetX, Position of center of domNode relative to 
   * 		left. If not provided, SVG elements are assumed centered. The center of
   * 		HTML elements is set to offsetWidth/2.
   * @param {Number} centerOffsetY, Position of center of domNode relative to 
   * 		top. If not provided, SVG elements are assumed centered. The center of
   * 		HTML elements is determined by offsetHeight/2.
   */
  addNode (particle,o,cx,cy) {
	  if(typeof o == "function") {
		  this.addCanvasNode(particle, o, cx, cy)
	  } else {
		  this.addDOMNode(particle, o, cx, cy)
	  }
  }

  addCanvasNode (particle,drawFunction,
	               centerOffsetX,centerOffsetY) {

	  this.nodes[particle.id] = {
		  drawFunction: drawFunction,
		  centerX: centerOffsetX,
		  centerY: centerOffsetY			
	  }
	
	  this.drawCanvasNode(particle)
  }

  addDOMNode (particle,domElement,
		          centerOffsetX,centerOffsetY) {
	  // With an SVG View Element
	  //TODO: is this the best we can do for detecting SVG types??
	  if (domElement.localName=="g" || domElement.localName == "text") {
		  this.ng.appendChild(domElement)
		  centerOffsetX = 0
		  centerOffsetY = 0

		  // With an HTML View Element
	  } else {
		  this.container.appendChild(domElement)
		  domElement.style.zIndex=10
		  if (centerOffsetX == null) {
			  centerOffsetX = parseInt(domElement.offsetWidth/2)
		  }
		  if (centerOffsetY == null) {
			  centerOffsetY = parseInt(domElement.offsetHeight/2)
		  }
	  }

	  this.nodes[particle.id] = {
			domElement: domElement,
			centerX: centerOffsetX,
			centerY: centerOffsetY
	  }

	  if (domElement.localName=="g" || domElement.localName == "text") {
		  this.nodes[particle.id]['width'] = domElement.getAttribute("width")
		  this.nodes[particle.id]['height'] = domElement.getAttribute("height")
	  }

	  this.drawDOMNode(particle)
	  return domElement
  }

  /*
   * Drop node, eliminating dom element from document
   */
  removeNode (particle) {
	  if (particle) {
		  delete this.nodes[particle.id]
	  }
  }

  /*
   * Add an edge to the view.
   * 
   * @param {Particle} particleA
   * @param {Particle} particleB
   */
  addCanvasEdge (particleA,particleB,edgeProperties) {
	  if (!this['edges'][particleA.id]) {
		  this['edges'][particleA.id]={}
	  }

	  if (!this['edges'][particleA.id][particleB.id]) {
		  this['edges'][particleA.id][particleB.id] = {
			  source: particleA,
			  target: particleB,
			  stroke: edgeProperties.stroke,
			  'stroke-width': edgeProperties['stroke-width'],
			  'stroke-dasharray': edgeProperties['stroke-dasharray']
		  }
	  }
  }

  addHTMLEdge (particleA,particleB,edgeProperties) {
	  if (!this['edges'][particleA.id]) {
		  this['edges'][particleA.id]={}
	  }

	  if (!this['edges'][particleA.id][particleB.id]) {
		  // create the "pixels" used to draw the edge
		  let edgePixels = new Array()

		  if (!edgeProperties) {
			  edgeProperties = this.defaultEdgeProperties
		  }
	
		  let pixelCount = edgeProperties['html_pixels']
		  let pixels = []

		  for (let k = 0, l = pixelCount; k < l; k++) {
			  let pixel = document.createElement('div')
			  pixel.style.width = edgeProperties['stroke-width']
			  pixel.style.height = edgeProperties['stroke-width']
			  pixel.style.backgroundColor = edgeProperties.stroke
			  pixel.style.position = 'absolute'
			  pixel.innerHTML="<img height=1 width=1/>"
			  edgePixels.push(pixel)
			  this.container.appendChild(pixel)
		  }

		  this['edges'][particleA.id][particleB.id] = {
			  source: particleA,
			  target: particleB,
			edge: edgePixels
		  }
		  return edgePixels
	  } else {
		  return this['edges'][particleA.id][particleB.id].edge
	  }
  }

  addVectorEdge (particleA,particleB,particleC,edgeProperties) {
	  if (!this['edges'][particleA.id]) {
		  this['edges'][particleA.id]={}
	  }
	  if (!this['edges'][particleA.id][particleC.id]) {
		  this['edges'][particleA.id][particleC.id]={}
	  }

	  if (!this['edges'][particleA.id][particleC.id][particleB.id]) {
		  let gElement = document.createElementNS("http://www.w3.org/2000/svg", "g")
		  let edge = document.createElementNS("http://www.w3.org/2000/svg", "path")

		  if (!edgeProperties) {
			  edgeProperties = this.defaultEdgeProperties
		  }
		  for (let p in edgeProperties) {
			  edge.setAttribute(p, edgeProperties[p])
		  }

		  edge.id = 'edge'+particleA.id+':'+particleC.id+':'+particleB.id
      if (particleB.sid && particleB.sid == particleA.id)
			  edge.setAttribute('stroke-width', '4px')
			  edge.setAttribute('marker-start', 'url(#head)')
		  gElement.appendChild(edge)

		  if (particleA.type == 'descriptor') {
			  let arrow = document.createElementNS("http://www.w3.org/2000/svg", "circle")
			  arrow.setAttribute('stroke', '#888888')
			  arrow.setAttribute('stroke-width', '.25px')
			  arrow.setAttribute('fill', '#8888bb')
			  arrow.setAttribute('r', '0.1px')
			  gElement.appendChild(arrow)
		  }

		  this.eg.appendChild(gElement)

		  if(edgeProperties.label) {
			  edgeProperties.label.style.position = "absolute"
			  this.container.appendChild(edgeProperties.label)
			  edgeProperties.label.style.zIndex=10
		  }

		  this['edges'][particleA.id][particleC.id][particleB.id] = {
				source: particleA,
				control:particleB,
				target: particleC,
				domEdge: gElement,
				label: edgeProperties.label,
				labelCenterX: edgeProperties.label ? edgeProperties.label.offsetWidth/2 : 0,
				labelCenterY: edgeProperties.label ? edgeProperties.label.offsetHeight/2 : 0
		  }

		  return gElement
	  } else {
		  return this['edges'][particleA.id][particleC.id][particleB.id].domEdge
	  }
  }

  /*
   * Drop edge, eliminating dom element from document
   */
  removeCanvasEdge (edge) {
  }

  /*
   * Drop edge, eliminating dom element from document
   */
  removeDOMEdge (edge) {
	  let domElement = edge.domEdge
	  let particleA = edge.source
	  let particleB = edge.target
	  this.eg.removeChild(domElement)
	  delete this['edges'][particleA.id][particleB.id]
  }

  copyDOMEdge (edge) {
	  let domElement = edge.domEdge
	  let particleA = edge.source
	  let particleB = edge.target
	  this.eg.appendChild(this.layout.oldvw.eg.getChild(domElement))
	  this['edges'][particleA.id][particleB.id] = this.layout.oldvw['edges'][particleA.id][particleB.id]
  }

  /*
   * 
   */
  drawNode (particle,redraw) {
	  if(this['nodes'][particle.id] &&
	     this['nodes'][particle.id].drawFunction) {
		  this.drawCanvasNode(particle)
	  } else if(redraw) {
		this.drawDOMNode(particle)
	  } else if(this.properties.useCanvas) {
		  let e = this.edges[particle.id]
		  for (let t in e) {
			  this.drawEdge(particle, e[t]['target'])
		  }		
	  }
  }

  /*
   * Draw a node at it's current position.
   * 
   * @param {Particle} particle
   */
  drawCanvasNode (particle) {
	  let nodeProps = this['nodes'][particle.id]
	  nodeProps.drawFunction.apply(this, [particle])

	  let e = this.edges[particle.id]
	  for (let t in e) {
		  this.drawEdge(particle, e[t]['target'])
	  }
  }

  /*
   * Draw an edge at it's current position.
   * 
   * @param {Particle} particleA
   * @param {Particle} particleB
   */
  drawCanvasEdge (particleA,particleB) {
	  let edge_color = this.edges[particleA.id][particleB.id]['stroke']
	  this.edge_twod.strokeStyle = edge_color
	  this.edge_twod.lineWidth = parseInt(this.edges[particleA.id][particleB.id]['stroke-width'])

	  let dasharray = this.edges[particleA.id][particleB.id]['stroke-dasharray']
	  // lame
	  if(dasharray) dasharray = dasharray.split(",")
	  //TODO: ??assert %2==0?
	  this.edge_twod.beginPath()
	  this.edge_twod.moveTo(
		  (particleA.positionX*this.skewX) + this.centerX,
		  (particleA.positionY*this.skewY) + this.centerY
	 )

	  let dx = particleA.positionX-particleB.positionX
	  let dy = particleA.positionY-particleB.positionY
	  let d = Math.sqrt(dx*dx + dy*dy)

	  if(false && dasharray) {
		  let c=0
		  let cx = particleA.positionX
		  let cy = particleA.positionY
		  while (c<d) {
			  for (let i=0; i<dasharray.length && c<d; i++) {
				  let da = parseInt(dasharray[i])
				  c+=da
				  cx -= da*(dx/d)
				  cy -= da*(dy/d)
				  if (i%2==0) {
					  this.edge_twod.lineTo(
						  parseInt(cx)*this.skewX + this.centerX,
						  parseInt(cy)*this.skewY + this.centerY
					 )
				  } else {
					  this.edge_twod.moveTo(
						  parseInt(cx)*this.skewX + this.centerX,
						  parseInt(cy)*this.skewY + this.centerY
					 )
				  }
			  }
		  }	
	  } else {
		  this.edge_twod.lineTo(
			  (particleB.positionX*this.skewX) + this.centerX,
			  (particleB.positionY*this.skewY) + this.centerY
		 )
	  }

	  this.edge_twod.stroke()
  }

  /*
   * Draw an edge at it's current position.
   * 
   * @param {Particle} particleA
   * @param {Particle} particleB
   */
  drawHTMLEdge (nodeI,nodeJ) {
	  // get a distance vector between nodes
	  let dx = nodeI.positionX - nodeJ.positionX
	  let dy = nodeI.positionY - nodeJ.positionY
	  if (dx == 0 && dy == 0) return

	  let distance = Math.sqrt(dx*dx	+ dy*dy)
		
	  let pixels = this['edges'][nodeI.id][nodeJ.id]['edge']

	  // draw a line between particles using the "pixels"
	  for (let k = 0, l = pixels.length; k < l; k++) {
		  let p = (distance / l) * k
		  pixels[k].style.left=parseInt(nodeI.positionX +(-1)*p*(dx/distance))*this.skewX + this.centerX + 'px'
		  pixels[k].style.top=parseInt(nodeI.positionY +(-1)*p*(dy/distance))*this.skewY + this.centerY + 'px'
	  }
  }

  /*
   * Draw an edge at it's current position.
   * 
   * @param {Particle} particleA
   * @param {Particle} particleB
   */
  drawVectorEdge (particleA,particleC,particleB) {
	  let gElement = this.edges[particleA.id][particleC.id][particleB.id]['domEdge']
	  let edge = gElement.firstChild
	  edge.setAttribute('d', 'M' + particleA.positionX*this.skewX + ' ' + particleA.positionY*this.skewY +
			                 ' Q' + particleB.positionX*this.skewX + ' ' + particleB.positionY*this.skewY +
			                 ' ' + particleC.positionX*this.skewX + ' ' + particleC.positionY*this.skewY)

	  let arrow = gElement.lastChild
	  if (particleA.type == 'descriptor')
      arrow.setAttribute('transform','translate(' + (particleA.positionX - (particleA.positionX - particleC.positionX)/8)*this.skewX + ' ' +
				                 (particleA.positionY - (particleA.positionY - particleC.positionY)/8)*this.skewY + ')')

	  // TODO: presumes that label is HTML
	  let label = this.edges[particleA.id][particleC.id][particleB.id]['label']
	  if(label) {
		  label.style.left = ((particleA.positionX+particleC.positionX)/2)*this.skewX - this.edges[particleA.id][particleC.id][particleB.id].labelCenterX + this.centerX + 'px'
		  label.style.top =  ((particleA.positionY+particleC.positionY)/2)*this.skewY - this.edges[particleA.id][particleC.id][particleB.id].labelCenterY + this.centerY + 'px'
	  }
  }

  /*
   * Called at the begnning of each drawing loop. Used by views that need to clear
   * or reset at the begninning of each iteration.
   */
  set () {
	  if(this.properties.useCanvas) {
		  this.clearCanvas()
	  }
  }

  clear () {
	  if(this.properties.useCanvas)
		  this.clearCanvas()
	  else
      this.clearDOM()
  }

  /*
   * Remove everything from the view.
   */	
  clearCanvas () {
	  if(this.supportCanvas) {
		  if(this.properties.edgeRenderer == "canvas") {
			  this.edge_twod.clearRect(0,0,this.edge_canvas.width,this.edge_canvas.height)		
		  }

		  this.node_twod.clearRect(0,0,this.node_canvas.width,this.node_canvas.height)
	  }
  }

  /*
   * Remove everything from the view.
   */
  clearDOM () {
	  // first, remove all the edges
	  for (let e in this.edges)
		  for (let eb in this.edges[e])
		    for (let ec in this.edges[e][eb])
			  this.eg.removeChild(this.edges[e][eb][ec].domEdge)

	  this.edges = {}

	  // now remove the nodes
	  for (let n in this.nodes) {
		  let domElement = this.nodes[n].domElement
		  if (domElement.localName=="circle" || domElement.localName=="text") {
			  this.ng.removeChild(domElement)
		  } else {
			  document.body.removeChild(domElement)
		  }
	  }

	  this.nodes = {}
  }

  drawDOMNode (particle) {
	  let domNodeProps = this['nodes'][particle.id]
	  if (domNodeProps) {
		  let domNode = domNodeProps.domElement
		  if(domNode.localName == 'g') {
			  let node = domNode.firstChild
			  if (node.localName == 'circle') {
				  node.setAttribute('transform','translate(' + particle.positionX*this.skewX + ' ' + particle.positionY*this.skewY + ')')
				  let text = domNode.lastChild
				  text.setAttribute('transform','translate(' + (particle.positionX*this.skewX - 
						                                            domNodeProps.width) + ' ' + (particle.positionY*this.skewY - 
								                                                                     domNodeProps.height) + ')')
			  } else if (node.localName == 'text') {
				  domNode.setAttribute('transform','translate(' + (particle.positionX*this.skewX - 
						                                               domNode.getAttribute("width")) + ' ' + (particle.positionY*this.skewY - 
								                                                                                   domNode.getAttribute("height")) + ')')
			  }
		  } else if (domNode.localName == 'text') {
			  domNode.setAttribute('transform','translate(' + (particle.positionX*this.skewX - 
					                                               domNodeProps.width) + ' ' + (particle.positionY*this.skewY - 
							                                                                        domNodeProps.height) + ')')
			  domNode.myx = particle.positionX*this.skewX - domNodeProps.centerX + this.centerX
			  domNode.myy = particle.positionY*this.skewY - domNodeProps.centerY + this.centerY
		  } else {
			  domNode.style.left = (particle.positionX*this.skewX) - 
			    domNodeProps.centerX + this.centerX + 'px'
			  domNode.style.top = particle.positionY*this.skewY - 
			    domNodeProps.centerY + this.centerY + 'px'
		  }

		  let e = this.edges[particle.id]
		  for (let t in e)
			  for (let tt in e[t])
				  this.drawEdge(particle,e[t][tt]['target'],e[t][tt]['control'])
	  }
  }

  setModel (model) {
	  this.model = model
  }

  setLayout (layout) {
	  this.layout = layout
  }

  removeDOMNode (particle) {

	  if (particle) {
		  let domElement = this.nodes[particle.id].domElement
		  if (domElement.localName=="g" || domElement.localName == "text") {
			  this.ng.removeChild(domElement)
		  } else {
			  this.container.removeChild(domElement)
		  }

		  delete this.nodes[particle.id]
	  }
  }

  pushDOMNode (tvw, particle) {

	  if (particle) {
      /*
		  let domElement = this.nodes[particle.id].domElement
		  if (domElement.localName=="g" || domElement.localName == "text") {
			  tvw.ng[domElement.id] = domElement
			  //tvw.ng.appendChild(domElement)
		  } else {
			  tvw.container[domElement.id] = domElement
			  //tvw.container.appendChild(domElement)
		  }
      */

		  tvw.nodes[particle.id] = this.nodes[particle.id]
	  }
  }

  pullDOMNode (tvw, particle) {

	  if (particle && tvw.nodes[particle.id]) {
		  let domElement = tvw.nodes[particle.id].domElement
		  if (domElement.localName=="g" || domElement.localName == "text") {
			  this.ng.appendChild(domElement)
		  } else {
			  this.container.appendChild(domElement)
		  }

		  this.nodes[particle.id] = tvw.nodes[particle.id]
	  }
  }

  moveEdges (_fromId,_toParticle) {
	  if (this.edges[_toParticle.id] == null)
		  this.edges[_toParticle.id] = {}
	  let e = this.edges[_fromId]
	  for (let i in e)
		  for (let ii in e[i]) {
			  let targetId = e[i][ii].target.id
			  if (targetId == i) {
				  if (this.edges[_toParticle.id][i] == null)
					  this.edges[_toParticle.id][i] = {}
				  this.edges[_toParticle.id][i][ii] = e[i][ii]
				  delete e[i][ii]
			  }
			  else {
				  this.edges[_toParticle.id][targetId] = e[i]
				  this.edges[_toParticle.id][targetId][ii].source = _toParticle
			  }
		  }

	  delete this.edges[_fromId]
  }

  dropDOMNode (_particle) {
	  this.removeDOMNode(_particle)
  }

  dropEdges (_id) {
	  let modelNode = null
	  let domEdge = null

	  for (let i in this.edges)
		  if (this.edges[i][_id]) {
			  for (let j in this.edges[i][_id]) {
				  modelNode = this.edges[i][_id][j].control
				  this.model.dropParticleForces(modelNode.id)
				  this.layout.dropKeydownEvent(modelNode)
				  this.dropDOMNode(modelNode)
				  this.model.dropParticle(modelNode)
				  domEdge = this.edges[i][_id][j].domEdge
				  this.eg.removeChild(domEdge)
			  }

			  delete this.edges[i][_id]
		  }

	  if (this.edges[_id]) {
		  for (let i in this.edges[_id]) {
			  for (let j in this.edges[_id][i]) {
				  modelNode = this.edges[_id][i][j].control
				  this.model.dropParticleForces(modelNode.id)
				  this.layout.dropKeydownEvent(modelNode)
				  this.dropDOMNode(modelNode)
				  this.model.dropParticle(modelNode)
				  domEdge = this.edges[_id][i][j].domEdge
				  this.eg.removeChild(domEdge)
			  }

			  delete this.edges[_id][i]
		  }

		  delete this.edges[_id]
	  }
  }

  pushEdges (tvw, tml, id) {
	  let mn = null
	  let domEdge = null

	  for (let i in this.edges)
		  if (this.edges[i][id]) {
			  for (let j in this.edges[i][id]) {
				  mn = this.edges[i][id][j].control
				  //this.model.pushParticleForces(tml, mn.id)
				  this.pushDOMNode(tvw, mn)
				  this.model.pushParticle(tml, mn)
				  domEdge = this.edges[i][id][j].domEdge
				  tvw.eg[domEdge.id] = domEdge
          tvw.edges[i] = this.edges[i]
          tvw.edges[i][id] = this.edges[i][id]
				  tvw.edges[i][id][j].control = this.edges[i][id][j].control
				  tvw.edges[i][id][j].target = this.edges[i][id][j].target  
			  }

			  tvw.edges[i][id] = this.edges[i][id]
		  }

	  if (this.edges[id]) {
		  for (let i in this.edges[id]) {
			  for (let j in this.edges[id][i]) {
				  mn = this.edges[id][i][j].control
				  //this.model.pushParticleForces(tml, mn.id)
				  this.pushDOMNode(tvw, mn)
				  this.model.pushParticle(tml, mn)
				  domEdge = this.edges[id][i][j].domEdge
				  tvw.eg[domEdge.id] = domEdge
          tvw.edges[id] = this.edges[id]
          tvw.edges[id][i] = this.edges[id][i]
				  tvw.edges[id][i][j].control = this.edges[id][i][j].control
				  tvw.edges[id][i][j].target = this.edges[id][i][j].target
			  }

			  tvw.edges[id][i] = this.edges[id][i]
		  }
	  }
  }

  pullEdges (tvw, tml, id, pid) {

	  let mn = null
	  let domEdge = null

    for (let i in tvw.edges) {
	    if (tvw.edges[i][id])
	      for (let j in tvw.edges[i][id]) {
	        for (let k in tvw.edges[i][id][j].target.pid)
            if (tvw.edges[i][id][j].target.pid[k] != pid) {
              let p = tvw.edges[i][id][j].target.pid[k]
	            this.pullDOMNode(tvw, this.model.particles.get(p))
            }

          mn = tvw.edges[i][id][j].control
	        //this.model.pullParticleForces(tml, mn.id)
	        this.pullDOMNode(tvw, mn)
	        this.model.pullParticle(tml, mn)
	        domEdge = tvw.edges[i][id][j].domEdge
	        this.eg.appendChild(domEdge)
          this.edges[i] = tvw.edges[i]
          this.edges[i][id] = tvw.edges[i][id]
	        this.edges[i][id][j].control = tvw.edges[i][id][j].control
	        this.edges[i][id][j].target = tvw.edges[i][id][j].target
        }
    }

	  if (tvw.edges[id]) {
		  for (let i in tvw.edges[id]) {
        //this.edges[id] = {}
			  for (let j in tvw.edges[id][i]) {
				  mn = tvw.edges[id][i][j].control
		      //this.model.pullParticleForces(tml, mn.id)
				  this.pullDOMNode(tvw, mn)
				  this.model.pullParticle(tml, mn)
				  domEdge = tvw.edges[id][i][j].domEdge
				  this.eg.appendChild(domEdge)
          this.edges[id] = tvw.edges[id]
          this.edges[id][i] = tvw.edges[id][i]
				  this.edges[id][i][j].control =tvw.edges[id][i][j].control
				  this.edges[id][i][j].target =tvw.edges[id][i][j].target
			  }

			  this.edges[id][i] = tvw.edges[id][i]
		  }
	  }
  }

  dropEdge (_id) {
	  let modelNode = null
	  let domEdge = null

	  for (let i in this.edges) {
		  for (let j in this.edges[i]) {
			  if (this.edges[i][j][_id]) {
				  modelNode = this.edges[i][j][_id].control
				  this.model.dropParticleForces(modelNode.id)
				  if (modelNode.id != 'trid') {
            let drp = { cmd: 'de', name: 'graph', id: modelNode.id }
            let self = this
            $.ajax({
              url: "/api/relation.drp",
              type: 'POST',
              data: drp,
              success: function (obj) {
                self.dropRelation(obj)
              }
            })
				  }

				  this.layout.dropKeydownEvent(modelNode)
				  this.dropDOMNode(modelNode)
				  this.model.dropParticle(modelNode)
				  domEdge = this.edges[i][j][_id].domEdge
				  this.eg.removeChild(domEdge)
          this.layout.dropInstanceRelation(modelNode)
				  delete this.edges[i][j][_id]
          this.model.reset()
			  }
		  }
    }
  }

  dropAssociate (_id) {
    let drp = { cmd: 'da', name: 'graph', id: _id }
    $.ajax({
      url: "/api/associate.drp",
      type: 'POST',
      data: drp,
      success: function (obj) {
      }
    })
	}

  dropRelation (_modelNode) {
   /*
	  this.model.setDrag (false)
    this.model.selected = null
    */
  }
}
