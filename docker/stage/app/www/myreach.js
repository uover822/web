let layout = null
let nodes = new Map()
let instance = null
let rows_limit = 0 // Set to 0 to disable limitation
let initial_count = new Array()

options = new Array("boolean", "byte", "char", "double", "drl", "dsl", "float", "int", "long", "short", "string", "ts", "void")

initDescriptor = (obj) => {

  let node = {}
  let idx = -1
  if (nodes.has(obj.id))
    idx = obj.id
  let nodename = null
  if (idx == -1) {
    let properties = obj.properties
    for (let i = 0; properties && i < properties.length; i++) {
      if (properties[i].name == 'ts') {
        nodename = properties[i].value
        break
      }
    }

    if (!nodename)
      for (let i = 0; properties && i < properties.length; i++) {
        if (properties[i].name == 'name') {
          nodename = properties[i].value
          break
        } else
            nodename = obj.id
      }

    let fixed = null
    if (nodename == 'metaroot') {
      fixed = true
      /*
      let psh = new EventSource('http://localhost:4567/push')
      psh.addEventListener('push', es => {
        let sse = JSON.parse(es.data)
        console.dir('push:'+JSON.stringify(sse))
        // send the descriptor to the server
        let sidx = sse.value.indexOf('_')
        let id = sse.value.substring(0,sidx)
        let value = sse.value.substring(sidx+1)
        let push = { cmd: 'pd', name: 'graph', pid: id, type: 'instance', x: 0, y: 0, value:value }
        $.ajax({
          url: "/api/descriptor.push",
          type: 'POST',
          data: push,
          success: function (objs) {
            layout.pushDescriptor(objs)
          }
        })
      })
      psh.addEventListener("close", es => {
        console.dir('** psh closed ***')
      })
      let iot = new EventSource('http://localhost:4567/iot')
      iot.addEventListener('iot', es => {
        let sse = JSON.parse(es.data)
        console.dir('iot:'+JSON.stringify(sse))
        // send the descriptor to the server
        let sidx = sse.value.indexOf('_')
        let id = sse.value.substring(0,sidx)
        let value = sse.value.substring(sidx+1)
        let push = { cmd: 'pd', name: 'graph', pid: id, type: 'instance', x: 0, y: 0, value:value }
        $.ajax({
          url: "/api/descriptor.push",
          type: 'POST',
          data: push,
          success: function (objs) {
            layout.pushDescriptor(objs)
          }
        })
      })
      iot.addEventListener("close", es => {
        console.dir('** iot closed ***')
      })
      */
      let psh = new WebSocket("ws://localhost:4567/push")
      psh.addEventListener("message", es => {
        let sse = JSON.parse(es.data)
        // send the descriptor to the server
        let sidx = sse.value.indexOf('_')
        let id = sse.value.substring(0,sidx)
        let value = sse.value.substring(sidx+1)
        let push = { cmd: 'pd', name: 'graph', pid: id, type: 'derived', x: 0, y: 0, value:value }
        $.ajax({
          url: "/api/descriptor.push",
          type: 'POST',
          data: push,
          success: function (objs) {
            layout.pushDescriptor(objs)
          }
        })
      })
      psh.addEventListener("close", es => {
        console.dir('** psh closed ***')
      })
      let iot = new WebSocket("ws://localhost:4567/iot")
      iot.addEventListener("message", es => {
        let sse = JSON.parse(es.data)
        // send the descriptor to the server
        let sidx = sse.value.indexOf('_')
        let id = sse.value.substring(0,sidx)
        let value = sse.value.substring(sidx+1)
        let push = { cmd: 'pd', name: 'graph', pid: id, type: 'instance', x: 0, y: 0, value:value }
        $.ajax({
          url: "/api/descriptor.push",
          type: 'POST',
          data: push,
          success: function (objs) {
            layout.pushDescriptor(objs)
          }
        })
      })
      iot.addEventListener("close", es => {
        console.dir('** iot closed ***')
      })
      /**/
    }
    else
      fixed = false
    if ('id' in obj) {
      node = layout.newDescriptor(obj.id,nodename,false,fixed)
      if (fixed)
        layout.mroot = node
    }
  } else
    node = nodes.get(idx)

  let parent = obj.pid
  let targets = obj.targets
  let source = node.id
  let relation = null

  if (parent != null) {
    let prelations = obj.prelations
    let rlist = null
    if (nodes.has(parent))
	    for (let j = 0; j < prelations.length; j++) {
	      instance = new Instance()
	      instance.descriptors = new Array()
	      instance.relations = new Array()
	      instance.aid = prelations[j].aid
	      rlist = prelations[j].rlist
	      for (let k = 0; k < rlist.length; k++) {
	        relation = layout.newRelation(rlist[k].id,rlist[k].aid,rlist[k].type,nodes.get(parent),node,false)
	        nodes.set(relation.id,relation)
	        instance.relations.push(relation)
	      }
      }

    if (instance != null) {
	    instance.descriptors.push(nodes.get(parent))
	    instance.descriptors.push(node)
	    layout.newDataGraphInstance(instance)
    }
  }

  if (!nodes.has(node.id)) {
    nodes.set(node.id,node)
    let ctx
    for (let i = 0; targets && i < targets.length; i++) {
      //let ctx = "<message>{ cmd: 'rd', wid: "+window.id+", name: 'graph', pid: "+source+", id: "+targets[i]+" }</message>"
      let descriptor = {cmd:'rd',pid:source,did:targets[i]}
      $.ajax({
        url: "/api/descriptor.rcv",
        type: 'POST',
        data: descriptor,
        success: function (obj) {
          initDescriptor(obj)
        }
      })
    }
  }
}
updateProperties = function (obj) {
  let textElement = document.getElementById(obj[0].id)
  textElement.textContent = null  
  let properties = obj[0].properties
  for (let i = 0; i <  properties.length; i++)
    if (properties[i].name == 'ts') {
      textElement.textContent = properties[i].value
      node = nodes.get(obj[0].id)
	    node.name = properties[i].value
      nodes.set(obj[0].id,node)
      break
    }
  if (!textElement.textContent)
    for (let i = 0; i <  properties.length; i++)
      if (properties[i].name == 'name') {
        textElement.textContent = properties[i].value
        node = nodes.get(obj[0].id)
	      node.name = properties[i].value
        nodes.set(obj[0].id,node)
        break
      } else
        textElement.textContent = obj[0].id
}
init = function () {

  let metaroot = null
  let renderNodes = "vector"
  let renderEdges = "vector"

  window.id = Date.now()

  layout = new MyForceDirectedLayout(document.body,
			                               {skew: true,
		                                  useCanvas: false,
		                                  useVector: true,
		                                  edgeRenderer: renderEdges
			                               })
  layout.view.skewBase=575
  layout.setSize()
  layout.config._default = {

    model: function (dataNode) {
      if (dataNode.drag == true) {
	      color = '#8888bb',
	      mass = 0.5,
	      opacity = 0.2,
	      drag = true,
        r = 2
      }
      else {
	      color = '#8888bb',
	      mass = 0.5,
	      opacity = 1.0,
	      drag = false,
        r = 10
      }
      return {
	      color: color,
	      mass: mass,
	      opacity: opacity,
	      drag: drag,
        r: r
      }
    },

    view: function (dataNode,modelNode) {
      if(renderNodes == 'vector' && layout.view.supportVector) {
	      if (dataNode.type == 'descriptor') {
	        let gElement = document.createElementNS('http://www.w3.org/2000/svg','g')
	        let nodeElement = document.createElementNS('http://www.w3.org/2000/svg','circle')
	        nodeElement.setAttribute('stroke','#888888')
	        nodeElement.setAttribute('stroke-width','.25px')
	        nodeElement.setAttribute('stroke-opacity',dataNode.opacity)
	        nodeElement.setAttribute('fill',dataNode.color)
	        nodeElement.setAttribute('fill-opacity',dataNode.opacity)
	        nodeElement.setAttribute('r','0.5px')
	        nodeElement.setAttribute('r',dataNode.r+'px')
	        nodeElement.onmousedown = new EventHandler(layout,layout.handleMyMouseDownEvent,modelNode)
	        nodeElement.onmouseup = new EventHandler(layout,layout.handleMyMouseUpEvent,modelNode,dataNode)
	        nodeElement.onmousemove = new EventHandler(layout,layout.handleMyMouseMoveEvent,modelNode,dataNode)
	        nodeElement.ondblclick = new EventHandler(layout,layout.handleDblClickDescriptorEvent,modelNode)
	        nodeElement.onclick = new EventHandler(layout,layout.handleClickDescriptorEvent,modelNode)
	        gElement.appendChild(nodeElement)
	        let textElement = document.createElementNS('http://www.w3.org/2000/svg','text')
	        textElement.setAttribute('dx','10')
	        textElement.setAttribute('dy','-10')
	        textElement.setAttribute('fill','green')
	        let text = document.createTextNode(dataNode.name)
	        textElement.onmousedown = new EventHandler(layout,layout.handleMyMouseDownLabelEvent,modelNode)
	        textElement.onmouseover = new EventHandler(layout,layout.handleMyMouseOverLabelEvent,modelNode)
	        textElement.onmouseout = new EventHandler(layout,layout.handleMyMouseOutLabelEvent)
	        let onkeydown = new EventHandler(layout,layout.handleMyKeydownEvent,modelNode)
	        layout.setKeydownEvent(modelNode,onkeydown)
	        textElement.ondblclick = new EventHandler(layout,layout.handleDblClickDescriptorLabelEvent,modelNode)
	        textElement.appendChild(text)
	        textElement.id = dataNode.id
	        gElement.appendChild(textElement)
	        return gElement
	      }
	      else
        if (dataNode.type == 'relation') {
	        let textElement = document.createElementNS('http://www.w3.org/2000/svg','text')
	        textElement.setAttribute('dx','10')
	        textElement.setAttribute('dy','-10')
	        textElement.setAttribute('fill','green')
	        let text = document.createTextNode(dataNode.name)
	        textElement.appendChild(text)
	        textElement.id = dataNode.id
	        textElement.onmousedown = new EventHandler(layout,layout.handleMyMouseDownLabelEvent,modelNode)
	        textElement.onmouseout = new EventHandler(layout,layout.handleMyMouseOutLabelEvent)
	        textElement.onmouseover = new EventHandler(layout,layout.handleMyMouseOverLabelEvent,modelNode)
	        let onkeydown = new EventHandler(layout,layout.handleMyKeydownEvent,modelNode)
	        layout.setKeydownEvent(modelNode,onkeydown)
	        textElement.ondblclick = new EventHandler(layout,layout.handleDblClickRelationEvent,modelNode)
	        return textElement
	      }
      }
    }
  }

  layout.forces.spring._default = function (nodeA, nodeB, isParentChild) {
    return {
      springConstant: 0.5,
      dampingConstant: 0.2,
      restLength: 30
    }
  }

  layout.forces.spring['A'] = {}
  layout.forces.spring['A']['B'] = function (nodeA, nodeB, isParentChild) {
    return {
      springConstant: 0.5,
      dampingConstant: 0.2,
      restLength: 30
    }
  }

  layout.forces.magnet = function () {
    return {
      magnetConstant: 	-5000,
      minimumDistance: 30
    }
  }

  /* 3) Override the default edge properties builder.
   * 
   * @return DOMElement
   */

  layout.viewEdgeBuilder = function (dataNodeSrc, dataNodeDest) {
    return {
      //'html_pixels': 10,
      'stroke': dataNodeSrc.color,
      'stroke-width': '1px',
      //'stroke-dasharray': '2,4',
      'fill' : 'none'
    }
  }

  layout.model.ENTROPY_THROTTLE = true
  layout.instanceQueue = new Array()

  /*
  layout.view.setModel(layout.model)
  layout.view.setLayout(layout)
  */
  
  layout.setApp(this)

  let descriptor = { cmd:'rm',gid:'graph',did:'metaroot' }

  $.ajax({
    url: '/api/metaroot.rcv',
    type: 'POST',
    data: descriptor,
    success: function (obj) {
      initDescriptor(obj)
    }
  })

  /* 5) Control the addition of nodes and edges with a timer.
   * 
   * This enables the graph to start organizing as data is loaded.
   * Use a larger tick time for smoother animation, but slower
   * build time.
   */

  let buildTimer = new MyTimer(0)
  buildTimer.subscribe(layout)
  buildTimer.start()
}
cancelTable = function (tag) {
	let div = document.getElementById(tag)
	div.setAttribute('style','position:absolute;display:none')
}
submitTable = function (tag) {

  let id = document.getElementById('id')
  let types = document.getElementsByName('type')
  let names = document.getElementsByName('name')
  let values = document.getElementsByName('value')

  //tbl[ 0 ] = {"id":new String(id.value)}
  let tbl = []
  for (let i=0;i<types.length;i++) {
    tbl[i] = {
      "type":new String(types.item(i).selectedIndex),"name":new String(names.item(i).value),"value":new String(values.item(i).value)
    }
  }

  let p = {"id":new String(id.value)}
  p.properties = JSON.stringify(tbl)
  let div = document.getElementById(tag)
  let self = this

  div.setAttribute('style','position:absolute;display:none')
  $.ajax({
    url: "/api/properties.upd",
    type: 'POST',
    data: p,
    success: function (obj) {
      updateProperties(obj)
    }
  })
}
findDataNode = function (id) {
  if (nodes.has(id))
    return nodes.get(id)
  return null
}
addRow = function (table_id) {
  let tbl = document.getElementById(table_id)
  let select = null
  let option = null
  // counting rows in table
  let rows_count = tbl.rows.length
  if (initial_count[table_id]==undefined)
  {
    // if it is first adding in this table setting initial rows count
    initial_count[table_id] = rows_count
  }
  // determining real count of added fields
  let tFielsNum =  rows_count - initial_count[table_id]
  if (rows_limit!=0 && tFielsNum>=rows_limit) return false
  let name = '<input type="text" name="name" style="width:100%;height:25;"/>'
  let value = '<input type="text" name="value" style="width:100%;height:25;"/>'
  let remove= '<input type="button" value="X" onclick="removeRow(\''+table_id+'\',this.parentNode.parentNode)" style="width:100%;"/>'
  
  try {
	  row = tbl.insertRow(-1)
    cell = row.insertCell(0)
    select = document.createElement("select")
    select.setAttribute("size","1")
    select.setAttribute("name","type")

    for (let j=0; j<options.length; j++) {
    	option = document.createElement("option")
    	option.text = options[j]
    	option.selected = false
	    select.appendChild(option)
    }

    cell.appendChild(select)
    cell = row.insertCell(1)
    cell.innerHTML = name
    cell = row.insertCell(2)
    cell.innerHTML = value
    cell = row.insertCell(3)
    cell.innerHTML = remove
  } catch (ex) {
    //if exception occurs
    alert(ex)
  }
}

removeRow = function (tbl,row) {
  let table = document.getElementById(tbl)
  try {
    table.deleteRow(row.rowIndex)
  } catch (ex) {
    alert(ex)
  }
}

let formVars = ""
let changing = false

fieldEnter = function (campo,evt,idfld) {
  evt = (evt) ? evt : window.event
  if (evt.keyCode == 13 && campo.value!="") {
    elem = document.getElementById(idfld)
    noLight(elem)
    elem.innerHTML = campo.value
    changing = false
    let textElement = document.getElementById(elem.getAttribute('sid'))
    textElement.textContent = campo.value
    elem.setAttribute('style', 'display:none')
    textElement.setAttribute('style', 'display:inline')
    /*
    let properties = { 'id' : new String (elem.getAttribute('sid')), 'type' : new String (campo.value) }
    let upd = { cmd: 'sr', name: 'graph', properties: JSON.stringify(properties) }
    */
    let relation = {cmd:'sr',id:elem.getAttribute('sid'),type:campo.value}
    $.ajax({
      url: "/api/relation.upd",
      type: 'POST',
      data: relation,
      success: function (obj) {
        layout.updateRelation(obj)
      }
    })
    return false
  }
}

fieldBlur = function (campo,idfld) {
  if (campo.value!="") {
    elem = document.getElementById(idfld)
    elem.innerHTML = campo.value.replaceAll(' ', '_')
    changing = false
    let textElement = document.getElementById(elem.getAttribute('sid'))
    textElement.textContent = campo.value.replaceAll(' ', '_')
    elem.setAttribute('style', 'display:none')
    textElement.setAttribute('style', 'display:inline')
    /*
    let properties = { 'id' : new String (elem.getAttribute('sid')), 'type' : new String (campo.value) }
    let upd = { cmd: 'sr', name: 'graph', properties: JSON.stringify(properties) }
    */
    let upd = {cmd:'sr',id:elem.getAttribute('sid'),type:campo.value}
    $.ajax({
      url: "/api/relation.upd",
      type: 'POST',
      data: upd,
      success: function (obj) {
        layout.updateRelation(obj)
      }
    })
    return false
  }
}

//edit field created
editBox = function (actual) {
	//alert(actual.nodeName+' '+changing)
	if(!changing) {
		width = widthEl(actual.id) + 16
		height =heightEl(actual.id) + 2

		if(height < 40) {
			if(width < 100)	width = 150
			actual.innerHTML = "<input id=\""+ actual.id +"_field\" style=\"width: "+width+"px; height: "+height+"px; maxlength=\"254\" type=\"text\" value=\"" + actual.innerHTML + "\" onkeypress=\"return fieldEnter(this,event,'" + actual.id + "')\" onfocus=\"highLight(this);\" onblur=\"noLight(this); return fieldBlur(this,'" + actual.id + "');\" />"
		}else{
			if(width < 70) width = 90
			if(height < 50) height = 50
			actual.innerHTML = "<textarea name=\"textarea\" id=\""+ actual.id +"_field\" style=\"width: "+width+"px; height: "+height+"px; onfocus=\"highLight(this);\" onblur=\"noLight(this); return fieldBlur(this,'" + actual.id + "');\">" + actual.innerHTML + "</textarea>"
		}
		changing = true
	  actual.firstChild.focus()
	}
}

//find all span tags with class editText and id as fieldname parsed to update script. add onclick function
editbox_init = function () {

	if (!document.getElementsByTagName) {return}
	let spans = document.getElementsByTagName("span")

	// loop through all span tags
	for (let i=0; i<spans.length; i++) {
		let spn = spans[i]

    if (((' '+spn.className+' ').indexOf("editText") != -1) && (spn.id)) {
			spn.onclick = function () { editBox(this) }
			spn.style.cursor = "pointer"
			spn.title = "Click to edit!"
    }
	}
}

//get width of text element
widthEl = function (span) {

	if (document.layers) {
	  w=document.layers[span].clip.width
	} else
  if (document.all && !document.getElementById) {
	  w=document.all[span].offsetWidth
	} else
  if(document.getElementById) {
	  w=document.getElementById(span).offsetWidth
	}

  return w
}

//get height of text element
heightEl = function (span) {

	if (document.layers) {
	  h=document.layers[span].clip.height
	} else
  if (document.all && !document.getElementById) {
	  h=document.all[span].offsetHeight
	} else
  if(document.getElementById) {
	  h=document.getElementById(span).offsetHeight
	}

  return h
}

highLight = function (span) {
  //span.parentNode.style.border = "2px solid #D1FDCD"
  //span.parentNode.style.padding = "0"
  span.style.border = "1px solid #54CE43"
}

noLight = function (span) {
  //span.parentNode.style.border = "0px"
  //span.parentNode.style.padding = "2px"
  span.style.border = "0px"
}

//sets post/get vars for update
setVarsForm = function (vars) {
	formVars  = vars
}

//crossbrowser load function
addEvent = function (elm,evType,fn,useCapture) {

  if (elm.addEventListener) {
    elm.addEventListener(evType, fn.bind(this), useCapture)
    return true
  } else
  if (elm.attachEvent) {
    let r = elm.attachEvent("on"+evType, fn)
    return r
  }
  else {
    alert("Please upgrade your browser to use full functionality on this page")
  }
}

addEvent(window, "load", editbox_init)
