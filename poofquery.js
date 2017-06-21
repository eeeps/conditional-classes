// poofquery.js
// Poof! It's element queries!
// (While I wait for Houdini.)
// ((It's a poof of concept.))


// prevent --breakpoints from cascading

let sheet = document.createElement( 'style' );
sheet.innerHTML = "* { --breakpoints: initial; }";
document.head.appendChild( sheet );


// use the .breakpoints that we’ll store on each observed element’s DOM node
// to check-and-possibly-toggle classes whenever the element is resized

const ro = new ResizeObserver( entries => {
	
	for ( let entry of entries ) {
		for ( let i = 0, l = entry.target.breakpoints.lengths.length; i < l; i++ ) {
			
			if ( entry.contentRect.width >= entry.target.breakpoints.lengths[ i ] &&
			     entry.contentRect.width < ( entry.target.breakpoints.lengths[ i + 1 ] || Infinity ) ) {
				
				entry.target.classList.add( 
					entry.target.breakpoints.names[ i ]
				);
				
			} else {
				
				entry.target.classList.remove(
					entry.target.breakpoints.names[ i ]
				);
				
			}
		
		}
	}

} );


// as elements come into the DOM, check to see if they have --breakpoints
// if they do, store .breakpoints on their DOM node and start resizeObserving them

const mo = new MutationObserver( ( mutations ) => {

	for ( let mutation of mutations ) {
		for ( let newNode of mutation.addedNodes ) {
			if ( newNode.nodeType === 1 ) { // elements only, no text!
			
				let breakpointsValue = window.getComputedStyle( newNode )
					.getPropertyValue( '--breakpoints' );
				
				if ( breakpointsValue !== '' ) {
				
					newNode.breakpoints = parseBreakpoints( breakpointsValue, newNode );
					ro.observe( newNode );
				
				}
				
			}
		}
	}

} );


// take a --breakpoints value and return a normalized object
// with an array of .names and an array of .lengths
// e.g. parseBreakpoints('.small 80px .medium 10em .large', el)
//      → { names:   [ 'small', 'medium', 'large' ],
//          lengths: [ 0, 80, 160 ] }

const parseBreakpoints = function( breakpointsString, element ) { // need the element to calculate ems based on context

	let breakpointsArray = breakpointsString
		.trim().split( ' ' ).filter( ( item ) => item !== '' );
	
	// if breakPointsString starts with a name, prepend w/ a length of 0px
	// this ensures that lengths are on the evens and that names[ i ] has a min-width of lengths[ i ]
	if ( breakpointsArray[ 0 ].charAt( 0 ) === "." ) {
		breakpointsArray.unshift( "0px" );
	}
	
	return {
		
		names: breakpointsArray
			.filter( ( item, index ) => index % 2 !== 0 ) // odds
			.map( ( item ) => item.replace( /^\./, '' ) ), // get rid of leading dots
		
		lengths: breakpointsArray
			.filter( ( item, index ) => index % 2 === 0 ) // evens
			.map( ( item ) => getComputedLength( item, element ) )
		
	}
	
}


/**
 * Get the computed length in pixels of a CSS length value
// e.g. getComputedLength( '10em', el ) → 160
 *
 * @param  {string}  value
 * @param  {Element} element
 * @return {number}
 */
// someday this will be as easy as CSSUnitValue.parse('5em').to('px')
// (wait, how will it know the em context? will it?)
// but for now, using a function copied from Martin Auswöger
// https://github.com/ausi/cq-prolyfill/blob/master/cq-prolyfill.js#L1037
// under MIT license:
// https://github.com/ausi/cq-prolyfill/blob/master/LICENSE
//
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


// start MutationObserving the document
mo.observe( document, { childList: true, subtree: true } );

