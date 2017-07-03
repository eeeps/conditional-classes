// poofquery.js
// Poof! It's element queries!
// (While I wait for Houdini.)
// ((It's a poof of concept.))
//
// by Eric Portis

( function() {


// prevent --poofpoints from cascading

let sheet = document.createElement( 'style' );
sheet.innerHTML = '* { --poofpoints: initial; }';
document.head.appendChild( sheet );


// use the .poofRanges that we’ll store on each observed element’s DOM node
// to check-and-possibly-toggle classes whenever the element is resized

const ro = new ResizeObserver( entries => {
	
	for ( const entry of entries ) {
	
		let classesToAdd = new Set(),
		    classesToRemove = new Set();
	
		for ( const range of entry.target.poofRanges ) {
			
			if ( entry.contentRect.width >= range.min &&
			     entry.contentRect.width < range.max ) {
			
				classesToAdd = new Set( [ ...classesToAdd, ...range.classNames ] );
			
			} else {
			
				classesToRemove = new Set( [ ...classesToRemove, ...range.classNames ] );
			
			}
			
		}
		
		// when a class name appears in both ranges that apply, *and* in ranges that don’t
		// true queries win aka don't remove it
		classesToRemove = new Set(
			[ ...classesToRemove ]
			.filter( ( x ) => !classesToAdd.has( x ) ) 
		);
		
		entry.target.classList.remove( ...classesToRemove );
		entry.target.classList.add( ...classesToAdd );
	
	}

} );


// as elements come into the DOM, check to see if they have --poofpoints
// if they do, store .poofRanges on their DOM node and start resizeObserving them

const mo = new MutationObserver( ( mutations ) => {

	for ( const mutation of mutations ) {
		for ( const newNode of mutation.addedNodes ) {
			if ( newNode.nodeType === 1 ) { // elements only, no text!
			
				let poofpointsValue = window.getComputedStyle( newNode )
					.getPropertyValue( '--poofpoints' );
				
				if ( poofpointsValue !== '' ) {
				
					newNode.poofRanges = parsePoofpoints( poofpointsValue, newNode );
					ro.observe( newNode );
				
				}
				
			}
		}
	}

} );


// takes a --poofpoints value and returns a .poofRanges object
// (which we attach to the element)
// e.g. parsePoofpoints('.small.hide 80px .medium 10em .large', el)
//      → [
//         { min: 0, max: 80, classNames: Set{ 'small', 'hide' } },
//         { min: 80, max: 160, classNames: Set{ 'medium' } },
//         { min: 160, max: Infinity, classNames: Set{ 'large' } }
//        ]

const parsePoofpoints = ( function( poofpointsString, element ) { // need the element to calculate ems based on context

	let poofpointsArray = normalizePoofpoints( poofpointsString, element );

	let poofRanges   = [];
	let currentRange = { min: poofpointsArray.shift() };

	for ( const item of poofpointsArray ) {
		if ( item.constructor === Set ) { // if it's a class name array
			
			currentRange.classNames = item;
		
		} else {
		
			currentRange.max = item;
			poofRanges.push( currentRange );
			currentRange = { min: item };
			
		}
	}
	
	return poofRanges;
	
} );


// takes a --poofpoints value string and returns a processed array
// e.g., normalizePoofpoints( '.small.hide 80px 90px .medium 10em' )
//       → [ 0, [ 'small', 'hide' ], 80, [], 90, [ 'medium' ], 160 ]
const normalizePoofpoints = ( function( poofpointsString, element ) { // need the element to calculate ems based on context

	let poofpointsArray = poofpointsString
		
		// split on whitespace
		.trim().split( /\s+/ )
		
		// normalize values
		.map( ( item ) => {
			if ( item.charAt( 0 ) === '.' ) {
			
				// turn ".class.lists" into Set{ "class", "lists" }
				return new Set( item.split( '.' ).slice( 1 ) );
				
			} else {
			
				// turn "10em" into 160
				return getComputedLength( item, element );
			
			}
		} )
		
		// handle repeated types
		.reduce( ( accumulator, item ) => {
			
			// if we have two lengths in a row, stick a [] (null class) between them
			if ( item.constructor === Number &&
			     accumulator[ accumulator.length - 1 ] &&
			     accumulator[ accumulator.length - 1 ].constructor === Number ) {
				
				accumulator.push( [], item );
				
			// if we have two class list arrays in a row, concat them
			} else if ( item.constructor === Set &&
			            accumulator[ accumulator.length - 1 ] &&
			            accumulator[ accumulator.length - 1 ].constructor === Set ) {
				
				accumulator[ accumulator.length - 1 ] =
					accumulator[ accumulator.length - 1 ].concat( item );
				
			} else {
				
				accumulator.push( item );
				
			}
			
			return accumulator;
			
		}, [] );
	
	// if --poofpoints starts ends with a classname,
	// prepend implicit first 0, or append implicit last ∞
	
	if ( poofpointsArray[ 0 ].constructor !== Number ) {
		poofpointsArray.unshift( 0 );
	}
	if ( poofpointsArray[ poofpointsArray.length - 1 ].constructor !== Number ) {
		poofpointsArray.push( Infinity );
	}
	
	return poofpointsArray;
	
} );

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

} )();
