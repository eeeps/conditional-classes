// poofquery.js
// Poof! It's element queries!
// (While I wait for Houdini.)
// ((It's a poof of concept.))

( function() {

// prevent --poofpoints from cascading

let sheet = document.createElement( 'style' );
sheet.innerHTML = '* { --poofpoints: initial; }';
document.head.appendChild( sheet );


// use the .poofRanges that we’ll store on each observed element’s DOM node
// to check-and-possibly-toggle classes whenever the element is resized

const ro = new ResizeObserver( entries => {
	
	for ( let entry of entries ) {
	
		let classesToAdd = new Set(),
		    classesToRemove = new Set();
	
		for ( let range of entry.target.poofRanges ) {
			
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

	for ( let mutation of mutations ) {
		for ( let newNode of mutation.addedNodes ) {
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

// takes a --poofpoints value string and returns a processed array

const normalizePoofpoints = function( poofpointsString, element ) { // need the element to calculate ems based on context

	let poofpointsArray = poofpointsString
		
		// split on whitespace
		.trim().split( /\s+/ )
		
		// normalize values
		.map( ( item ) => {
			if ( item.charAt( 0 ) === '.' ) {
			
				// turn ".class.lists" into ["class", "lists"]
				return item.split( '.' ).slice( 1 );
				
			} else {
			
				// normalize lengths ("10em" → 160)
				return getComputedLength( item, element );
			
			}
		} );
	
	// deal with duplicates
	
	// TODO turn this into a .reduce()?
	let deduped = [];
	poofpointsArray.forEach( ( item ) => {
		
		// if we have two lengths in a row, stick a [] (null class) between them
		if ( item.constructor === Number &&
		     deduped[ deduped.length - 1 ] &&
		     deduped[ deduped.length - 1 ].constructor === Number ) {
			
			deduped.push( [], item );
		
		// if we have two class list arrays in a row, concat them
		} else if ( item.constructor === Array &&
		            deduped[ deduped.length - 1 ] &&
		            deduped[ deduped.length - 1 ].constructor === Array ) {
			
			deduped[ deduped.length - 1 ] = deduped[ deduped.length - 1 ].concat( item );
			
		} else {
			
			deduped.push( item );
			
		}
		
	} );
	
	// if --poofpoints starts ends with a classname,
	// add implicit first 0 or last ∞
	
	if ( deduped[ 0 ].constructor === Array ) {
		deduped.unshift( 0 );
	}
	if ( deduped[ deduped.length - 1 ].constructor === Array ) {
		deduped.push( Infinity );
	}

	return deduped;

}

// takes a --poofpoints value and returns a .poofRanges object
// which we attach to the element
// e.g. parsePoofpoints('.small.hide 80px .medium 10em .large', el)
//      → [
//         { min: 0, max: 80, classNames: ['small', 'hide'] },
//         { min: 80, max: 160, classNames: ['medium'] },
//         { min: 160, max: Infinity, classNames: ['large'] }
//        ]

const parsePoofpoints = function( poofpointsString, element ) { // need the element to calculate ems based on context

	let poofpointsArray = normalizePoofpoints( poofpointsString, element );

	let poofRanges   = [];
	let currentRange = { min: poofpointsArray.shift() };

	for ( item of poofpointsArray ) {
		if ( item.constructor === Array ) { // if it's a class name array
			
			currentRange.classNames = item;
		
		} else {
		
			currentRange.max = item;
			poofRanges.push( currentRange );
			currentRange = { min: item };
			
		}
	}
	
	return poofRanges;
	
};


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