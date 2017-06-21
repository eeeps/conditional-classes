
// Prevent --named-breakpoints from cascading

let sheet = document.createElement( 'style' );
sheet.innerHTML = "* { --named-breakpoints: initial; }";
document.head.appendChild( sheet );


// Set up the ResizeObserver

// Use the .breakpoints and .classNames arrays that we’ll store on each observed element’s DOM node to check/possibly-toggle classes whenever the element is resized.

let r = new ResizeObserver( entries => {

	for ( let entry of entries ) {
		
		for ( let i = 0, l = entry.target.breakpoints.length; i < l; i++ ) {
			
			if ( ( entry.contentRect.width >= entry.target.breakpoints[ i ] ) &&
			     ( ( entry.contentRect.width < entry.target.breakpoints[ i + 1 ] ) ||
			       ( entry.target.breakpoints[ i + 1 ] === undefined ) ) ) {

				entry.target.classList.add( entry.target.classNames[ i ] );

			} else {

				entry.target.classList.remove( entry.target.classNames[ i ] );

			}
		
		}
	
	}

} );


// Initialize + start observing DOM nodes

// loop over every element in the document (!)
for ( let element of document.getElementsByTagName( '*' ) ) {
	
	// if an element has a --named-breakpoints, store its breakpoints and names on its DOM node, and start ResizeObserver-ing it.

	let namedBreakpointsValue = window.getComputedStyle( element )
		.getPropertyValue( '--named-breakpoints' );
	
	if ( namedBreakpointsValue !== '' ) {
		
		let namedBreakpoints = namedBreakpointsValue
			.trim().split( ' ' ).filter( ( item ) => item !== '' );
	
		// breakpoints is an array of lengths (in pixels)
		// e.g., [ 100, 200, 300 ]
		element.breakpoints = namedBreakpoints
			.filter( ( item, index ) => index % 2 === 0 )
			.map( ( item ) => getComputedLength( item, element ) );

		// classNames is an array of, well, class names
		// e.g., [ "small", "medium", "large" ]
		element.classNames = namedBreakpoints
			.filter( ( item, index ) => index % 2 !== 0 );
		
		r.observe( element );

	}

}

// Function copied from Martin Auswöger
// https://github.com/ausi/cq-prolyfill/blob/master/cq-prolyfill.js#L1037
//
// Used under MIT license:
// https://github.com/ausi/cq-prolyfill/blob/master/LICENSE
//
/**
 * Get the computed length in pixels of a CSS length value
 *
 * @param  {string}  value
 * @param  {Element} element
 * @return {number}
 */
function getComputedLength(value, element) {

	var LENGTH_REGEXP = /^(-?(?:\d*\.)?\d+)(em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc)$/i;
	var FIXED_UNIT_MAP = {
		'px': 1,
		'pt': 16 / 12,
		'pc': 16,
		'in': 96,
		'cm': 96 / 2.54,
		'mm': 96 / 25.4,
	};

	var length = value.match(LENGTH_REGEXP);
	if (!length) {
		return parseFloat(value);
	}
	value = parseFloat(length[1]);
	var unit = length[2].toLowerCase();
	if (FIXED_UNIT_MAP[unit]) {
		return value * FIXED_UNIT_MAP[unit];
	}
	if (unit === 'vw') {
		return value * window.innerWidth / 100;
	}
	if (unit === 'vh') {
		return value * window.innerHeight / 100;
	}
	if (unit === 'vmin') {
		return value * Math.min(window.innerWidth, window.innerHeight) / 100;
	}
	if (unit === 'vmax') {
		return value * Math.max(window.innerWidth, window.innerHeight) / 100;
	}
	// em units
	if (unit === 'rem') {
		element = document.documentElement;
	}
	if (unit === 'ex') {
		value /= 2;
	}
	return parseFloat(getComputedStyle(element).fontSize) * value;
}