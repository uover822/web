Instance = class {

  constructor () {
    this.descriptors = new Array()
    this.relations = new Array()
  }
  
  get (_array,_element) {
    for ( var i in _array ) {
      if ( _array[ i ].id == _element )
	      return _array[ i ]
    }

    return null
  }
}
