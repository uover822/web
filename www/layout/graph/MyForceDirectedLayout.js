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
 * ForceDirectedLayout
 *  
 * @author Kyle Scholz
 * 
 * @version 0.3.3
 * 
 * @param {DOMElement} container
 */

let labeldown = false

let drag = false
let mouseDown = false
let mouseOver = false
let relation = null

let instances
let keydownEvents = new Object()
let toggle = false
let dbl = false

MyForceDirectedLayout = class {

  constructor (container, viewProperties) {

    this.container = container
    this.viewProperties = viewProperties
      this.containerLeft=0; this.containerTop=0
    this.containerWidth=0; this.containerHeight=0

    this.view = new MyGraphView(container, viewProperties)

    // Create the model that we'll use to represent the nodes and relationships 
    // in our graph.
    this.model = new MyParticleModel(this.view)
    this.model.start()

    this.view.setModel(this.model)
    this.view.setLayout(this)

    this.setSize
	
    // for queueing loaders
    this.dataNodeQueue = new Array()
    this.relationshipQueue = new Array()

    // the data graph defines the nodes and edges
    this.dataGraph = new DataGraph()
    this.dataGraph.subscribe(this)
				
    this.instances = new Array()

    this.keydownEvents = new Object()

    // if this is IE, turn on caching of javascript-loaded images explicitly
    if (document.all) {
      document.createStyleSheet().addRule('html', 
			                  'filter:expression(document.execCommand("BackgroundImageCache", false, true))')
    }

    // attach an onresize event
    let resizeEvent = new EventHandler(this, this.setSize)
    if (window.addEventListener) {
      window.addEventListener("resize", resizeEvent.bind(this), false)
    } else {
      window.attachEvent("onresize", resizeEvent)
    }

    // attach an onmousemove event
    // if (window.Event) {document.captureEvents(Event.MOUSEMOVE)}
    let mouseMoveEvent = new EventHandler(this, this.handleMouseMoveEvent)
    if (document.addEventListener) {
      document.addEventListener("mousemove", mouseMoveEvent.bind(this), false)
    } else {
      document.attachEvent("onmousemove", mouseMoveEvent)
    }

    // attach an onmouseup event
    let mouseUpEvent = new EventHandler(this, this.handleMouseUpEvent)
    if (document.addEventListener) {
      document.addEventListener("mouseup", mouseUpEvent.bind(this), false)
    } else {
      document.attachEvent("onmouseup", mouseUpEvent)
    }

    this.forces = {
      spring: {
        _default: (nodeA,nodeB, isParentChild) => {
	        if (isParentChild) {
	          return {
	            springConstant: 0.5,
	            dampingConstant: 0.2,
	            restLength: 20
	          }
	        }
          else {
	          return {
	            springConstant: 0.2,
	            dampingConstant: 0.2,
	            restLength: 20
	          }
	        }
        }
      },
      magnet: () => {
        return {
	        magnetConstant: -2000,
	        minimumDistance: 10
        }
      }
    }

    let viewEdgeBuilder = this.makeEdgeView

    this.oldvw = {}
    this.oldml = {}
    this.mroot = null
    this.px = null
    this.py = null
  }

  /*
   * A default mousemove handler. Moves the selected node and updates child
   * positions according to geometric model.
   * 
   * @param {Object} e
   */
  handleMouseMoveEvent () {

    if (this.model.selected && this.model.particles.get(this.model.selected) &&
         !this.model.particles.get(this.model.selected).fixed) {
    //if (this.model.selected && !this.model.particles.get(this.model.selected).fixed) {

      // TODO: This is a very temporary fix. In Firefox 2, our EventHandler
      // factory piles mouse events onto the arguments list.
      let e = arguments[arguments.length-1]
      let mouseX = e.pageX ? e.pageX : e.clientX
      let mouseY = e.pageY ? e.pageY : e.clientY

      mouseX -= this.view.centerX
      mouseY -= this.view.centerY

      // set the node position (offsets)
      this.model.particles.get(this.model.selected).positionX=mouseX/this.view.skewX-5
      this.model.particles.get(this.model.selected).positionY=mouseY/this.view.skewY+5
      this.model.tick()
    }
  }

  /*
   * A default mouseup handler. Resets the selected node's position
   * and clears the selection.
   */	
  handleMouseUpEvent () {

    if (this.model.selected) {
      if (this.model.particles.has(this.model.selected))
        this.model.particles.get(this.model.selected).selected = false
      this.model.reset()
      this.model.selected = null
    }
  }

  /*
   * A default mousedown handler. Sets the selected node.
   * 
   * @param {Number} id
   */
  handleMouseDownEvent (id) {

    this.model.selected = id
    this.model.particles.get(id).selected = true
  }

  /*
   * Respond to a resize event in the browser.
   */
  setSize () {

    if (this.container.tagName == "BODY") {
      // Get the size of our window. 
      if (document.all) {
	      this.containerWidth = document.body.offsetWidth - 5
	      this.containerHeight = document.documentElement.offsetHeight - 5
      } else {
	      this.containerWidth = window.innerWidth - 5
	      this.containerHeight = window.innerHeight - 5
      }
      this.containerLeft = 0
      this.containerTop = 0
    } else {
      this.containerWidth = this.container.offsetWidth
      this.containerHeight = this.container.offsetHeight

      this.containerLeft = this.container.offsetLeft
      this.containerTop = this.container.offsetTop
    }

    this.view.setSize(this.containerLeft, this.containerTop,
		                   this.containerWidth, this.containerHeight)
    this.model.setSize(this.containerWidth, this.containerHeight)

    this.model.draw(true)
  }

  setApp (app) {
    this.app = app
  }

  /*
   * Handle a new node.
   *  
   * @param {DataGraphNode} dataNode
   */
  newDataGraphNode (dataNode) {

    this.enqueueNode(dataNode)
  }

  /*
   * Enqueue a node for modeling later.
   * 
   * @param {DataGraphNode} dataNode
   */
  enqueueNode (dataNode) {

    this.dataNodeQueue.push(dataNode)
  }

  /*
   * Dequeue a node and create a particle representation in the model.
   * 
   * @param {DataGraphNode} dataNode
   */
  dequeueNode () {

    let node = this.dataNodeQueue.shift()
    if (node) {
      this.addParticle(node)
      if (node.drag == true && node.type == 'descriptor') {
        let model = this.model
	      model.particles.forEach ((particle) => {
	        //for (let id in this.model.particles.keys())
	        if (particle.id == 'td' ||
	             particle.id == 'trid') {
	          if (model.selected && particle.id == 'td')
	            model.particles.get(model.selected).selected = false
	          model.selected = particle.id
	          node.particle.selected = true
	          node.particle.tid = node.tid
            return true
	          //break
	        }
        })
      }

      return true
    }

    return false
  }

  /*
   * Enqueue a relationship for modeling later.
   * 
   * @param {DataGraphNode} nodeA
   * @param {DataGraphNode} nodeB
   */
  enqueueRelationship(nodeA, nodeB, nodeC) {

    this.relationshipQueue.push({'nodeA':nodeA, 'nodeB':nodeB, 'nodeC':nodeC})
  }

  /*
   * Dequeue a relationship and add to the model.
   */
  dequeueRelationship () {

    let edge = this.relationshipQueue[0]
    if (edge && edge.nodeA.particle && edge.nodeC.particle) {
      this.relationshipQueue.shift()
      this.addSimilarity(edge.nodeA, edge.nodeB, edge.nodeC)
    }
  }

  /*
   * Manage/Simulate a SVG keydown event.
   */
  getKeydownEvent (modelNode) {

    if (this.keydownEvents[modelNode.id])
      return this.keydownEvents[modelNode.id]

    return null
  }

  setKeydownEvent (modelNode, onkeydown) {

    this.keydownEvents[modelNode.id] = onkeydown
  }

  /*
   * Recursively delete a graph node and descendents..
   */
  dropNodeAndDescendents (modelNodes) {

    let child
    let idx = modelNodes.length-1
    let modelNode = modelNodes[idx]
    let i = this.instances.length
    let j, lnkd

    while (i-- && !lnkd)
      if (this.instances[i] && modelNode.id == this.instances[i].descriptors[0].particle.id) {
	      child = this.instances[i].descriptors[1].particle
        lnkd = false
        for (j = i-1; j > 0 && !lnkd; j--)
          if (this.instances[j].descriptors[1].particle.id == child.id)
            lnkd = true
	      if (!lnkd && !this.inmodelNodes(modelNodes, child)) {
	        modelNodes.push(child)
	        this.dropNodeAndDescendents(modelNodes)
	      }
      }

    this.view.dropEdges(modelNode.id)
    this.model.dropParticleForces(modelNode.id)
    let drp = {cmd:'dd', name:'graph', id:modelNode.id }
    let self = this
    $.ajax({
      url: "/api/descriptor.drp",
      type: 'POST',
      data: drp,
      success: (obj) => {
        self.dropDescriptor(obj)
      }
    })

    this.dropKeydownEvent(modelNode)
    this.view.dropDOMNode(modelNode)
    this.model.dropParticle(modelNode)
    this.dropInstance(modelNode)
    this.model.reset()
    /*
	  this.model.setDrag (false)
    this.model.setSelected(null)
    */
  }

  /*
   * Recursively reason a graph node and descendents/ ascendents..
   */
  reasonNodeAndDescendents (modelNodes) {

    let idx = modelNodes.length-1
    let child
    let parent
    let modelNode = modelNodes[idx]
    let i = this.instances.length
    let self = this

    while (i--)
      if (this.instances[i] && modelNode.id == this.instances[i].descriptors[0].particle.id) {
	      child = this.instances[i].descriptors[1].particle
	      if (!this.inmodelNodes(modelNodes,child)) {
	        modelNodes.push(child)
          self.reasonNodeAndDescendents(modelNodes)
          /*
          setTimeout(() => {
            self.reasonNodeAndDescendents(modelNodes)
          }, 50)
          */
	      }
      }

    let rsn = {cmd:'dr', name:'graph', id:modelNode.id}
    $.ajax({
      url: "/api/descriptor.rsn",
      type: 'POST',
      data: rsn,
      success: (obj) => {
        self.reasonContext(obj)
      }
    })
  }

  /*
   * Recursively pull a graph node and descendents..
   */
  pullNodeAndDescendents (tvw, tml, modelNodes) {

    let child
    let idx = modelNodes.length-1
    let modelNode = modelNodes[idx]
    let ctr = 0

    for (let i = 0; i < this.instances.length; i++) {
      this.view.pullDOMNode(tvw, modelNode)
      if (this.instances[i] && modelNode.id == this.instances[i].descriptors[0].particle.id) {
	      child = this.instances[i].descriptors[1].particle
	      if (!this.inmodelNodes(modelNodes, child)) {
	        modelNodes.push(child)
          this.view.pullEdges(tvw, tml, child.id, modelNode.id)
          this.model.pullParticleForces(tml, child.id)
          this.model.pullParticle(tml, child)
          this.pullNodeAndDescendents(tvw, tml, modelNodes)
	      }
      }
    }
  }

  inmodelNodes (modelNodes,child) {

    for (let i = 0; i < modelNodes.length; i++) {
      if (child.id == modelNodes[i].id)
	      return true
    }

    return false
  }

  dropInstance (modelNode) {

    let i = this.instances.length
    while (i--) {
      if (this.instances[i].descriptors[1].particle.id == modelNode.id) {
	      this.instances.splice(i,1)
        //return
      }
    }
  }
  
  dropInstanceRelation (modelNode) {

    let i = this.instances.length
    let j
    while (i--) {
      j = this.instances[i].relations.length
      while (j--)
        if (typeof this.instances[i] != 'undefined' &&
            this.instances[i].relations[j].particle.id == modelNode.id) {
	        this.instances.splice(i, 1)
          //return
        }
    }
  }
  
  dropNode (modelNode) {

    let parent, child
    let count
    let i = this.instances.length
    let j, k, l
    while (i--) {
      j = this.instances[i].relations.length
      while (j--)
        if (modelNode.id == this.instances[i].relations[j].particle.id) {
	        parent = this.instances[i].descriptors[0].particle
	        child = this.instances[i].descriptors[1].particle
          count = 0
          k = this.instances.length
          while (k--)
            if (parent.id == this.instances[k].descriptors[0].particle.id &&
                child.id == this.instances[k].descriptors[1].particle.id &&
                ((l = this.instances[k].relations.length)))
              while (l--)
                count++
          else
            if (child.id == this.instances[k].descriptors[1].particle.id)
              count++

	        if (count > 1) {
            this.view.dropEdge(modelNode.id)
            //this.view.dropAssociate(modelNode.aid)
            break
            break
          }
        }
    }
  }

  dropKeydownEvent (modelNode) {

    delete this.keydownEvents[modelNode.id]
  }

  dropDescriptor (modelNode) {
    /*
	  this.model.setDrag (false)
    this.model.selected = null
    */
  }

  reasonContext (modelNode) {
  }

  /*
   * Called by timer to control dequeuing of nodes into addNode.
   */
  /*
  update () {

    this.dequeueNode()
    this.dequeueRelationship()
  }
  */

  /*
   * Clear all nodes and edges connected to the root.
   */
  clear (modelNode) {

    this.model.clear()
  }

  /*
   * Recenter the graph on the specified node.
   */
  recenter (modelNode) {

    // todo
  }

  /*
   * Create a default configuration object with a reference to our layout.
   * 
   * @param {Particle} layout
   */
  config (layout) {

    // A default configuration class. This is used if a
    // className was not indicated in your dataNode or if the
    // indicated class was not found.
    this._default={
      model: (dataNode) => {
	      return {
	        mass: 1
	      }
      },
      view: (dataNode, modelNode) => {
	      return layout.defaultNodeView(dataNode, modelNode)
      }
    }
  }

  /*
   * Default forces configuration
   */
  /*   * Add a particle to the model and view.
   * 
   * @param {DataGraphNode} node
   */
  addParticle (dataNode) {

    // Create a particle to represent this data node in our model.
    let particle = this.makeNodeModel(dataNode)
    let domElement = this.makeNodeView(dataNode, particle)

    this.view.addNode(particle, domElement)

    // Determine if this particle's position should be fixed.
    if (dataNode.fixed) {particle.fixed = true}

    // Assign a random position to the particle.
    let rx = Math.random()*2-1
    let ry = Math.random()*2-1
    particle.positionX = rx
    particle.positionY = ry

    // Add a Spring Force between child and parent
    if (dataNode.parent) {
      particle.positionX = dataNode.parent.particle.positionX + rx
      particle.positionY = dataNode.parent.particle.positionY + ry
      let configNode = (dataNode.type in this.forces.spring &&
			                  dataNode.parent.type in this.forces.spring[dataNode.type]) ? 
	        this.forces.spring[dataNode.type][dataNode.parent.type](dataNode, dataNode.parent, true) : 
	        this.forces.spring['_default'](dataNode, dataNode.parent, true)

      this.model.makeSpring(particle, dataNode.parent.particle, 
			                 configNode.springConstant, configNode.dampingConstant, configNode.restLength)

      let props = this.viewEdgeBuilder(dataNode.parent, dataNode)
      this.view.addEdge(particle, dataNode.parent.particle, props)
    }

    // Add repulsive force between this particle and all other particle.
    if (particle.id != 'td') {
      let self = this
      this.model.particles.forEach ((part) => {
	      if (part != particle) {
	        let magnetConstant = self.forces.magnet()['magnetConstant']
	        let minimumDistance = self.forces.magnet()['minimumDistance']
	        this.model.makeMagnet(particle,part, magnetConstant, minimumDistance)
	      }
      })
    }

    dataNode.particle = particle
    dataNode.viewNode = domElement
    return dataNode
  }

  /*
   * Add a spring force between two edges + corresponding edge in the view.
   * 
   * @param {Number} springConstant
   * @param {DataGraphNode} nodeA
   * @param {DataGraphNode} nodeB
   */
  /*
   * Add a graph edge.
   */
  addSimilarity (nodeA, nodeB, nodeC) {

    this.addParticle(nodeB)

    let configNode = (nodeA.type in this.forces.spring &&
		                  nodeB.type in this.forces.spring[nodeA.type]) ? 
	      this.forces.spring[nodeA.type][nodeB.parent.type](nodeA, nodeB, false) : 
	      this.forces.spring['_default'](nodeA, nodeB, false)

    this.model.makeSpring(nodeA.particle, nodeB.particle, configNode.springConstant,
			                    configNode.dampingConstant, configNode.restLength)

    configNode = (nodeB.type in this.forces.spring &&
		              nodeC.type in this.forces.spring[nodeB.type]) ? 
	    this.forces.spring[nodeB.type][nodeC.parent.type](nodeB, nodeC, false) : 
	    this.forces.spring['_default'](nodeB, nodeC, false)

    this.model.makeSpring(nodeB.particle, nodeC.particle, configNode.springConstant,
			                    configNode.dampingConstant, configNode.restLength)

    let props = this.viewEdgeBuilder(nodeA, nodeB, nodeC)
    this.view.addEdge(nodeA.particle, nodeB.particle, nodeC.particle, props)
  }

  newDataGraphEdge (nodeA, nodeB, nodeC) {

    this.enqueueRelationship(nodeA, nodeB, nodeC)
  }

  /* Build node views from configuration
   * 
   * @param {DataGraphNode} dataNode
   * @param {SnowflakeNode} modelNode
   */
  makeNodeView (dataNode,modelNode) {

    let configNode = (dataNode.type in this.config) ? this.config[dataNode.type] : this.config['_default']
    return configNode.view(dataNode, modelNode)
  }

  /* Build model nodes from configuration
   * 
   * @param {DataGraphNode} dataNode
   */
  makeNodeModel (dataNode) {

    let configNode = (dataNode.type in this.config) ? this.config[dataNode.type] : this.config['_default']
    for(let attribute in configNode.model(dataNode)) {
      dataNode[attribute] = configNode.model(dataNode)[attribute]
    }

    let modelNode = this.model.makeParticle(dataNode, 0, 0)
    return modelNode
  }

  /* Default node view builder
   * 
   * @param {SnowflakeNode} modelNode
   * @param {DataNode} dataNode
   */
  defaultNodeView (dataNode,modelNode) {

    let nodeElement
    // TODO:
    if (this.svg) {
      nodeElement = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      nodeElement.setAttribute('stroke', '#444444')
      nodeElement.setAttribute('stroke-width', '.25px')
      nodeElement.setAttribute('fill', "#aaaaaa")
		  nodeElement.setAttribute('r', 6 + 'px')
      nodeElement.onmousedown =  new EventHandler(this, this.handleMouseDownEvent, modelNode.id)
    }
    else {
      nodeElement = document.createElement('div')
      nodeElement.style.position = "absolute"
      nodeElement.style.width = "12px"
      nodeElement.style.height = "12px"
      nodeElement.style.backgroundImage = "url(http://kylescholz.com/cgi-bin/bubble.pl?title=&r=12&pt=8&b=444444&c=aaaaaa)"
      nodeElement.innerHTML = '<img width="1" height="1">'
      nodeElement.onmousedown =  new EventHandler(this, this.handleMouseDownEvent, modelNode.id)
    }

    return nodeElement
  }

  /* Default edge view builder 
   * 
   * @param {DataNode} dataNodeSrc
   * @param {DataNode} dataNodeDest
   */
  makeEdgeView (dataNodeSrc,dataNodeDest) {

    let props
    if (this.svg) {
      props = {
	      'stroke': '#888888',
	      'stroke-width': '2px',
	      'stroke-dasharray': '2,4'
      }
    }
    else {
      props = {
	      'pixelColor': '#888888',
	      'pixelWidth': '2px',
	      'pixelHeight': '2px',
	      'pixels': 5
      }
    }

    return props
  }

  /*
   * Sets up Description options in response to a doubleclick.
   */
  handleOptionClick (id, selectObj, x, y) {

    let options = document.getElementById('options')
    options.setAttribute('style','position:absolute;display:none')

    let idx = selectObj.selectedIndex
    selectObj.selectedIndex = -1

    if (idx == 0) {
      // add descriptor
      let parent = id
      // send the descriptor to the server
      let add = {cmd:'ad', name:'graph', pid:parent, x:x, y:y }
      let self = this
      $.ajax({
        url: "/api/descriptor.add",
        type: 'POST',
        data: add,
        success: (obj) => {
          self.addDescriptor(obj)
        }
      })
    }
    else
    if (idx == 1) {
      // instantiate context
      let modelNode = window.findDataNode(id)
      let parent = id
      // send the descriptor to the server
      let instantiate = {cmd:'id', name:'graph', pid:parent, x:x, y:y}
      let self = this
      $.ajax({
        url: "/api/descriptor.instantiate",
        type: 'POST',
        data: instantiate,
        success: (objs) => {
          if (objs.length > 0)
            self.instantiateContext(objs)
        }
      })
    }
    else
    if (idx == 2) {
      // reason context
      let modelNode = window.findDataNode(id)
      let self = this

	    if (modelNode.type == "descriptor") {
	      let modelNodes = []
	      modelNodes.push(modelNode)
	      this.reasonNodeAndDescendents(modelNodes)
      }
    }

    dbl = false
  }

  swapVwMl (hvw, hml, tvw, tml) {

    let edgeProps = {skew: true,
		                 useCanvas: false,
		                 useVector: true,
		                 edgeRenderer: 'vector'
			              }

    tvw = {}
    tvw.nodes = []
    tvw.edges = []
    tvw.skewBase = 575

    for (const key of Object.keys(hvw.nodes)) {
      tvw.nodes[key] = hvw.nodes[key]
      tvw.nodes[key].domElement = hvw.nodes[key].domElement
      tvw.nodes[key].fixed = false
    }

    let props = this.makeEdgeView()
    for (const pky of Object.keys(hvw.edges))
      for (const cky of Object.keys(hvw.edges[pky]))
        for (const rky of Object.keys(hvw.edges[pky][cky])) {
          tvw.edges[pky] = hvw.edges[pky]
          tvw.edges[pky][cky] = hvw.edges[pky][cky]
          tvw.edges[pky][cky][rky] = hvw.edges[pky][cky][rky]
          tvw.edges[pky][cky][rky].control = hvw.edges[pky][cky][rky].control
          tvw.edges[pky][cky][rky].domEdge = hvw.edges[pky][cky][rky].domEdge
          tvw.edges[pky][cky][rky].source = hvw.edges[pky][cky][rky].source
          tvw.edges[pky][cky][rky].target = hvw.edges[pky][cky][rky].target
          tvw.nodes[pky] = hvw.nodes[pky]
          tvw.nodes[cky] = hvw.nodes[cky]
          tvw.nodes[rky] = hvw.nodes[rky]
        }

    tml = {}
    tml.particles = new Object(hml.particles)

    tml.magnets = new Object(hml.magnets)
    tml.springs = new Object(hml.springs)
    tml.activeSprings = new Object(hml.activeSprings)

    let particle
    for (const key of hml.particles.keys()) {
      particle = hml.particles.get(key)
      tml.particles.set(particle.id, particle)
    }

    hml.particles = new Object(tml.particles)

    if (this.px && this.py)
    for (const key of hml.particles.keys()) {
      particle = hml.particles.get(key)
      particle.positionX -= this.px
      particle.positionY -= this.py
      particle.fixed = false
      hml.particles.set(particle.id, particle)
    }

    hml.magnets = new Object(tml.magnets)
    hml.springs = new Object(tml.springs)
 
    return {hvw,hml,tvw,tml}
  }

  handleClickDescriptorEvent (modelNode) {
    let self = this, test
    setTimeout (() => {
      if (!dbl) {
        self.view.svg.style.visibility = 'hidden'
        self.view.resetSVG()
        self.setSize()

	      let modelNodes = []

        if (!toggle) {
          // copy view, model to oldvw, oldml
	        modelNodes.push(modelNode)
          self.px = modelNode.positionX
          self.py = modelNode.positionY
          toggle = true
        }
        else {
          // copy tmpvw, tmpmdl to oldvw, oldml
	        modelNodes.push(self.mroot)
          self.px = -self.px
          self.py = -self.py
	        toggle = false
        }

        test = self.swapVwMl(self.view, self.model, self.oldvw, self.oldml)

        self.view = test.hvw
        self.model = test.hml
        self.oldvw = test.tvw
        self.oldml = test.tml
        modelNode.fixed = true
	      self.pullNodeAndDescendents(self.oldvw, self.oldml, modelNodes)
        self.model.reset()
        self.view.svg.style.visibility = 'visible'
      }
    }, 200)
  }

  handleDblClickDescriptorEvent (modelNode) {

    dbl = true
    let e = arguments[arguments.length-1]
    let options = document.getElementById('options')
    let style = options.attributes.style
    if (style.value.indexOf('inline') > 0) {
      options.setAttribute('style','position:absolute;display:none;left:'+e.clientX+'px;top:'+e.clientY+'px')
      setTimeout (() => {
        dbl = false
      },200)
    }
    else
      options.setAttribute('style','position:absolute;display:inline;left:'+e.clientX+'px;top:'+e.clientY+'px')
    let optionsSelect = document.getElementById('optionsSelect')
    let self = this
    optionsSelect.onchange = () => {self.handleOptionClick(modelNode.id, optionsSelect, e.clientX, e.clientY)}
  }

  handleDblClickDescriptorLabelEvent (modelNode) {

    let e = arguments[arguments.length-1]
    let descriptor = {cmd:'hdcdle', name:'graph', id:modelNode.id}
    let self = this
    $.ajax({
      url: "/api/descriptor.get",
      type: 'POST',
      data: descriptor,
      success: (obj) => {
        if (typeof obj != 'undefined') {
          obj.x = e.clientX
          obj.y = e.clientY
          self.receiveDescriptor(obj)
        }
      }
    })
  }

  receiveDescriptor (obj) {

    this.fillTable('properties', 'mytable', obj)
  }

  addDescriptor (obj) {

    if (obj) {
      this.fillTable('properties', 'mytable', obj)

      let node = this.newDescriptor(obj.id, null, false, false)
	
      let parent = obj.pid
      let relation = null
      let instance = null

      if (nodes.has(parent)) {
	      instance = new Instance()
	      instance.aid = obj.aid
	      instance.descriptors = new Array()
	      instance.relations = new Array()
	      relation = this.newRelation(obj.rid[0], obj.aid, 'describes', nodes.get(parent),node, false)
	      nodes.set(relation.id, relation)
	      instance.relations.push(relation)
	      instance.descriptors.push(nodes.get(parent))
	      instance.descriptors.push(node)
	      this.newDataGraphInstance(instance)
      }

      nodes.set(node.id, node)
      this.model.reset()
    }
  }

  instantiateContext (objs) {

    let obj = objs[0]
    let name = obj.properties[0].value
    let node = this.newDescriptor(obj.id, name, false, false)

    let parent = obj.pid
    let relation = null
    let instance = null

    if (nodes.has(parent)) {
	    instance = new Instance()
	    instance.aid = obj.aid
	    instance.descriptors = new Array()
	    instance.relations = new Array()
	    relation = this.newRelation(obj.rid[0], obj.aid, 'describes', nodes.get(parent), node, false)
	    nodes.set(relation.id, relation)
	    instance.relations.push(relation)
	    instance.descriptors.push(nodes.get(parent))
	    instance.descriptors.push(node)
	    this.newDataGraphInstance(instance)
    }

    nodes.set(node.id, node)
    this.model.reset()

    let oa = objs[1]

    oa.forEach(obj => {
      name = obj.properties[0].value
      node = this.newDescriptor(obj.id, name, false, false)
      nodes.set(node.id, node)
    })

    oa.forEach(obj => {

      parent = obj.pid
      relation = null
      instance = null

      if (nodes.has(parent)) {
	      instance = new Instance()
	      instance.aid = obj.aid
	      instance.descriptors = new Array()
	      instance.relations = new Array()
        node = nodes.get(obj.id)
        obj.relations.forEach(rel => {
	        relation = this.newRelation(rel.id, obj.aid, rel.type, nodes.get(rel.sid), node, false)
	        nodes.set(relation.id, relation)
	        instance.relations.push(relation)
        })

	      instance.descriptors.push(nodes.get(parent))
	      instance.descriptors.push(node)
	      this.newDataGraphInstance(instance)
      }
    })

    this.model.reset()
  }

  pushDescriptor (objs) {

    let oa = objs
    let node, name, properties, done

    oa.forEach(obj => {
      properties = obj.properties
      done = false
      for (let i = 0; i < properties.length && !done; i++)
        if (properties[i].name == 'ts' ||
            properties[i].name == 'name') {
          name = properties[i].value
          done = true
        }
      if (!done)
        name = obj.id
      node = this.newDescriptor(obj.id, name, false, false)
      nodes.set(node.id, node)
    })

    let parent, relation, instance, rtype, ss, s

    oa.forEach(obj => {
      parent = obj.pid
      if (nodes.has(parent)) {
	      instance = new Instance()
	      instance.aid = obj.aid
	      instance.descriptors = new Array()
	      instance.relations = new Array()
        node = nodes.get(obj.id)
        rtype = obj.rtype
        rtype.forEach((rt, i) => {
          if (obj.associate != null) {
            if (i > 0)
	            relation = this.newRelation(obj.rid[i], obj.aid, rtype[i], nodes.get(obj.associate.sid), node, false)
            else
	            relation = this.newRelation(obj.rid[i], obj.aid, rtype[i], nodes.get(parent), node, false)
	          nodes.set(relation.id, relation)
	          instance.relations.push(relation)
          } else {
	          relation = this.newRelation(obj.rid[i], obj.aid, rtype[i], nodes.get(parent), node, false)
	          nodes.set(relation.id, relation)
	          instance.relations.push(relation)
          }
        })

	      instance.descriptors.push(nodes.get(parent))
	      instance.descriptors.push(node)
	      this.newDataGraphInstance(instance)
      }
    })

    this.model.reset()
  }

  clrscr () {
    resultNode.value = ""
  }

  print (s) {

    resultNode.value += "" + s
    resultNode.scrollTop = resultNode.scrollHeight
  }

  fillTable (div_id, table_id, obj) {

    let tbl = document.getElementById(table_id)

    for (let i = tbl.rows.length; i > 1; i--) {
      tbl.deleteRow(i-1)
    }
    
    let id = '<input type="hidden" id="id" value="'+obj.id+'"/>'
    let row = tbl.insertRow(1)
    let cell = row.insertCell(0)
    cell.innerHTML = id
    let remove = '<input type="button" value="X" onclick="removeRow(\''+table_id+'\',this.parentNode.parentNode)" style="width:100%;"/>'
    let properties = obj.properties

    let name = null
    let value = null
    let select = null
    let option = null
    let div = null

    for (let i = 0; i < properties.length; i++) {
      name = '<input type="text" name="name" value="'+properties[i].name+'" style="width:100%;height:25;"/>'
      value = '<input type="text" name="value" value="'+properties[i].value+'" style="width:100%;height:25;"/>'

      try {
        row = tbl.insertRow(i+2) //i++
        cell = row.insertCell(0)
        select = document.createElement("select")
        select.setAttribute("size", "1")
        select.setAttribute("name", "type")
        for (let j = 0; j < options.length; j++) {
	        option = document.createElement("option")
	        option.text = options[j]
	        if (properties[i].type==j) {option.selected = true} else {option.selected = false}
	        select.appendChild(option)
        }

        cell.appendChild(select)
        cell = row.insertCell(1)
        cell.innerHTML = name
        cell = row.insertCell(2)
        cell.innerHTML = value
        cell = row.insertCell(3)
        cell.innerHTML = remove
        cell = row.insertCell(4)
      } catch (ex) {
        //if exception occurs
        alert(ex)
      }
 
      div = document.getElementById(div_id)
      div.setAttribute('style', 'position:absolute;display:inline;left:'+obj.x+'px;top:'+obj.y+'px')
    }
  }

  handleDblClickRelationEvent (modelNode) {

    let e = arguments[arguments.length-1]
    let relation = {cmd:'hdcre', name:'graph', id:modelNode.id}
    let self = this
    $.ajax({
      url: "/api/relation.get",
      type: 'POST',
        data: relation,
      success: (obj) => {
        if (typeof obj != 'undefined') {
          obj.x = e.clientX
          obj.y = e.clientY
          self.receiveRelation(obj)
        }
      }
    })
  }

  receiveRelation (obj) {

		let textElement = document.getElementById(obj.id)
		textElement.setAttribute('style', 'display:none')
		let edit = document.getElementById('blogText')
		edit.setAttribute('style', 'position:absolute;fill:green;display:inline;left:'+(textElement.myx+8)+'px;top:'+(textElement.myy-25)+'px')
		edit.setAttribute('sid', textElement.id)
		edit.textContent = textElement.textContent
		let evt = document.createEvent('MouseEvents')
		evt.initEvent('click', true, true)
		edit.dispatchEvent(evt)
  }

  handleMyMouseOutEvent (node) {

    let properties = {'id':new String (node.id), 'type':new String (node.text)}
    // send the relation to the server
    let upd = {cmd:'sr', name:'graph', properties: JSON.stringify(properties)}
    let self = this
    $.ajax({
      url: "/api/relation.upd",
      type: 'POST',
        data: upd,
      success: (obj) => {
        self.updateRelation(obj)
      }
    })
  }

  updateRelation (obj) {
	  let textElement = document.getElementById('blogText')
    let properties = JSON.parse(JSON.stringify(obj))
	  textElement.textContent = properties.type
  }

  /*
   * Dequeues parent/child instance relationships.
   */
  dequeueInstance () {

    let instance = this.instanceQueue[0]
    let relations = null
    if (instance && this.relationsParticled(instance.relations)) {
      instance = this.instanceQueue.shift()
      relations = instance.relations

      this.instances.push(instance)

      let magnetConstant = this.forces.magnet()['magnetConstant']
      let minimumDistance = this.forces.magnet()['minimumDistance']

      let nodeA = instance.descriptors[0]
      let nodeB = instance.descriptors[1]

      /*
      if (nodeA.type == 'descriptor' && !nodeA.particle.cid.includes(nodeB.id))
        nodeA.particle.cid.push(nodeB.id)
      */
      if (nodeA.type == 'descriptor' && !nodeB.particle.pid.includes(nodeA.id))
        nodeB.particle.pid.push(nodeA.id)

      this.model.makeMagnet(nodeA.particle, nodeB.particle, magnetConstant, minimumDistance)
    }
  }

  /*
   * Called by timer to control dequeuing of nodes into addNode.
   */
  update () {

    this.dequeueNode()
    this.dequeueRelationship()
    this.dequeueInstance()
  }

  /*
   * Check if the relation is associated with a particle.
   */
  relationsParticled (relations) {

    for (let i = 0; i < relations.length; i++)
      if (!relations[i].particle)
	      return false

    return true
  }

  handleMyMouseDownEvent (modelNode) {

    let e = arguments[arguments.length-1]
    e.preventDefault()
    this.model.selected = modelNode.id
    if (this.model.particles.has(modelNode.id))
      this.model.particles.get(modelNode.id).selected = true
    this.mouseDown = true
  }

  handleMyMouseDownLabelEvent (modelNode) {

    let e = arguments[arguments.length-1]
    e.preventDefault()
    this.model.selected = modelNode.id
    this.model.particles.get(modelNode.id).selected = true
  }

  handleMyKeydownEvent (modelNode) {

    let e = arguments[arguments.length-1]
    if (this.mouseOver) {
      if (e.which == 8 || e.keycode == 8) {
	      if (modelNode.type == "descriptor") {
	        let modelNodes = []
	        modelNodes.push(modelNode)
	        this.dropNodeAndDescendents(modelNodes)
        }
	      else
	        this.dropNode(modelNode)
	      this.model.setDrag(false)
        this.model.setSelected(null)
        this.model.reset()
      }
      this.mouseOver = false
    }
  }

  handleMyMouseOverLabelEvent (modelNode) {

    if (!this.mouseOver) {
      document.onkeydown = this.getKeydownEvent(modelNode)
      this.mouseOver = true
    }
  }

  handleMyMouseOutLabelEvent () {

    this.mouseOver = false
  }

  handleMyMouseUpEvent (modelNode, dataNode) {

    if (this.model.selected) {
      if (this.drag == true) {
	      let myd = this.model.particles.get(this.model.selected)
	      //let properties = {'sid':new String(modelNode.id), 'tid':new String(myd.tid), 'type':new String('describes')}
	      this.view.moveEdges(myd.id, modelNode)
	      this.dropKeydownEvent (myd)
	      this.view.dropDOMNode(myd)
	      this.swapParticlesForces(modelNode)
	      this.model.dropParticle(myd)
        
	      let instance = null
	      for (let i = 0; i < this.instances.length; i++)
	        if (this.instances[i] && this.instances[i].descriptors[0].id == modelNode.id &&
	             this.instances[i].descriptors[1].id == myd.tid) {
	          instance = this.instances[i]
	        }

	      if (instance == null) {
	        instance = new Instance()
	        this.instances.push(instance)
	        instance.descriptors.push(dataNode)
	        instance.descriptors.push(window.findDataNode(myd.tid))
	        instance.relations.push(this.relation)
          //console.dir('myd::'+JSON.stringify(myd, null, 2))
          let add = {cmd:'aa', name:'graph', sid:modelNode.id, tid:myd.tid}
          //let add = {cmd:'aa', name:'graph', properties:"+JSON.stringify(properties)+"}
          let self = this
          $.ajax({
            url: "/api/associate.add",
            type: 'POST',
            data: add,
            success: (obj) => {
              self.addAssociate(obj)
            }
          })
	      }

	      instance.aid = this.relation.aid

	      //properties.aid = instance.aid
        let add = {cmd:'ar', name:'graph', aid:instance.aid, sid:modelNode.id, tid:myd.tid}
        //let add = {cmd:'ar', name:'graph', properties:"+JSON.stringify(properties)+"}
        let self = this
        $.ajax({
          url: "/api/relation.add",
          type: 'POST',
        data: add,
          success: (obj) => {
            self.updateRelationNode(obj)
          }
        })

	      let magnetConstant = this.forces.magnet()['magnetConstant']
	      let minimumDistance = this.forces.magnet()['minimumDistance']
        let descendent = this.model.particles.get(myd.tid)
	      //let descendent = this.model.findParticle(myd.tid)
	      this.model.makeMagnet(modelNode, descendent, magnetConstant, minimumDistance)
        this.model.reset()
	      this.drag = false
	      this.model.setDrag (false)
	      this.model.setSelected (modelNode.id)
      }
    }

    this.mouseDown = false
  }

  /*
   * Move particle forces from dropped to target particle.
   */
  swapParticlesForces (modelNode) {

    this.swapParticleForces(this.model.activeSprings, modelNode)
    this.swapParticleForces(this.model.springs, modelNode)
    this.swapParticleForces(this.model.magnets, modelNode)
  }

  swapParticleForces (elements, modelNode) {

    for(let i in elements) {
      if (elements[i].a.id == 'td')
	      elements[i].a = modelNode
      else
	    if (elements[i].b.id == 'td')
	      elements[i].b = modelNode
    }
  }

  addAssociate (obj) {

    if (this.relation)
      this.relation.aid = obj.id
  }

  updateRelationNode (obj) {
    if (typeof obj != 'undefined' && 'id' in obj) {
      let tid = obj.id
	    let particles = this.model.particles
	    if (particles.get('trid')) {
		    particles.get('trid').id = tid
		    particles.get('trid').nodeId = tid
		    particles.get('trid').sid = obj.sid
		    particles.set(tid, particles.get('trid'))
		    particles.delete('trid')
	    }

	    let nodes = this.view.nodes
	    if (nodes['trid']) {
		    nodes[tid] = nodes['trid']
		    delete nodes['trid']
	    }

	    let e = this.view.edges
	    for (let i in e)
		    for (let ii in e[i])
			    if (e[i][ii]['trid']) {
				    e[i][ii][tid] = e[i][ii]['trid']
				    delete e[i][ii]['trid']
				    break
          }
 
	    if (document.getElementById('trid')) {
		    let textElement = document.getElementById('trid')
		    textElement.id = tid
	    }

	    if (this.keydownEvents['trid']) {
		    this.keydownEvents[tid] = this.keydownEvents['trid']
		    delete this.keydownEvents['trid']
	    }

	    if (this.relation) {
		    this.relation.id = tid
      }
    }
  }

  handleMyMouseMoveEvent (modelNode, dataNode) {

    if (this.mouseDown && modelNode.type == 'descriptor' && !this.drag) {
      this.drag = true
      this.model.setDrag (this.drag)
      let myd = this.newDescriptor('td', '', this.drag, false)
      this.relation = this.newRelation('trid', 'taid', 'describes', myd, dataNode, true)
      myd.tid = dataNode.id
      this.model.particles.get(dataNode.id).selected = false
      this.model.selected = myd.id
      //console.dir('myd:'+JSON.stringify(myd, null, 2))
      //this.model.particles.get(myd.id).selected = true
    }
  }

  newRelation (id, aid, name, source, target, drag) {

    let relation = new DataGraphNode()
    relation.id = id
    relation.aid = aid
    relation.name = name
    relation.type = 'relation'
    if (drag == true)
      relation.drag = true
    else
      relation.drag = false
    this.newDataGraphEdge(source, relation, target)
    return relation
  }

  newDescriptor (id, name, drag, fixed) {

    let node = new DataGraphNode()
    node.id = id
    node.name = name
    node.type = 'descriptor'
    node.tid = null
    if (drag == true)
      node.drag = true
    else
      node.drag = false
    if (fixed == true)
      node.fixed = true
    else
      node.fixed = false
    this.newDataGraphNode(node)
    return node
  }

  newDataGraphInstance (instance) {

    this.enqueueInstance(instance)
  }

  enqueueInstance (instance) {

   this.instanceQueue.push(instance)
  }
}
