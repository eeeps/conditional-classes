// presto-points.js
// Presto change-o, its element queries!
// (While I wait for Houdini.)
//
// v 0.1.1, 2017-07-21
// by Eric Portis

( function() {


// the shoddiest little mustard-cutting test

if ( !( 'Set' in window ) ) { return; }


// prevent --presto-points from cascading

let sheet = document.createElement( 'style' );
sheet.innerHTML = '* { --presto-points: initial; }';
document.head.appendChild( sheet );


// as elements come into the DOM, check to see if they have --presto-points
// if they do, store .prestoRanges on their DOM node and start resizeObserving them

const mo = new MutationObserver( ( mutations ) => {

	for ( const mutation of mutations ) {
		for ( const newNode of mutation.addedNodes ) {
			if ( newNode.nodeType === 1 ) { // elements only, no text!
			
				const computedStyle = window.getComputedStyle( newNode ),
				      prestoPoints = computedStyle.getPropertyValue( '--presto-points' );
				
				if ( prestoPoints !== '' ) {
				
					newNode.computedStyle = computedStyle; // need to check/account for `box-sizing: border-box`-affected-widths, later
					newNode.prestoRanges = parsePrestoPoints( prestoPoints, newNode );
					ro.observe( newNode );
				
				}
				
			}
		}
	}

} );


// use the .prestoRanges that we’ll store on each observed element’s DOM node
// to check-and-possibly-toggle classes whenever the element is resized

const ro = new ResizeObserver( entries => {
	
	for ( const entry of entries ) {
		
		let boundingWidth = entry.contentRect.width;
		if ( entry.target.computedStyle.boxSizing === 'border-box' ) {
			boundingWidth +=
				  parseFloat( entry.target.computedStyle.paddingLeft  )
				+ parseFloat( entry.target.computedStyle.paddingRight )
				+ parseFloat( entry.target.computedStyle.borderLeft   )
				+ parseFloat( entry.target.computedStyle.borderRight  );
		}
		
		let classes = entry.target.prestoRanges.reduce( ( classes, range ) => {
			
			if ( boundingWidth >= range.min &&
			     boundingWidth <  range.max ) {
			
				classes.toAdd = classes.toAdd.union( range.classNames );
			
			} else {
			
				classes.toRemove = classes.toRemove.union( range.classNames );
			
			}
			
			return classes;
			
		}, { 
			toAdd: new Set(),
			toRemove: new Set()
		} );
		
		// class names can appear in both ranges that apply, *and* in ranges that don’t
		classes.toRemove = classes.toRemove.difference( classes.toAdd );
		
		entry.target.classList.remove( ...classes.toRemove );
		entry.target.classList.add( ...classes.toAdd );
	
	}

} );


// takes a raw --presto-points value and returns a prestoRanges array
// (which we attach to the element)
//
// e.g. parsePrestoPoints('.small.hide 80px .medium 10em .large', el)
//      → [
//         { min: 0, max: 80, classNames: Set{ 'small', 'hide' } },
//         { min: 80, max: 160, classNames: Set{ 'medium' } },
//         { min: 160, max: Infinity, classNames: Set{ 'large' } }
//        ]

const parsePrestoPoints = ( function( prestoPointsString, element ) { // need the element to calculate ems based on context

	return prestoRangesFromPrestoList( 
		prestoListFromString( prestoPointsString, element )
	);

} );


// takes a --presto-points value string and returns a nice, pre-processed array
//
// e.g., prestoListFromString( '.small.hide 80px 90px .medium 10em' )
//       → [ 0, Set { 'small', 'hide' }, 80, Set {}, 90, Set { 'medium' }, 160 ]

const prestoListFromString = ( function( prestoPointsString, element ) { // need the element to calculate ems based on context

	let prestoList = prestoPointsString
		
		// split on whitespace
		.trim().split( /\s+/ )
		
		// compute typed values
		.map( ( item ) => {
			if ( item.charAt( 0 ) === '.' ) {
			
				// e.g. ".class.lists" → Set{ "class", "lists" }
				return new Set( item.split( '.' ).slice( 1 ) );
				
			} else {
			
				// e.g. "10em" → 160
				return getComputedLength( item, element );
			
			}
		} )
		
		// handle repeated types
		.reduce( ( accumulator, item ) => {
			
			// if we have two lengths in a row, stick an empty Set between them
			if ( item.constructor === Number &&
			     accumulator[ accumulator.length - 1 ] &&
			     accumulator[ accumulator.length - 1 ].constructor === Number ) {
				
				accumulator.push( new Set(), item );
				
			// if we have two class lists in a row, combine them
			} else if ( item.constructor === Set &&
			            accumulator[ accumulator.length - 1 ] &&
			            accumulator[ accumulator.length - 1 ].constructor === Set ) {
				
				accumulator[ accumulator.length - 1 ] = accumulator[ accumulator.length - 1 ].union( item );
				
			} else {
				
				accumulator.push( item );
				
			}
			
			return accumulator;
			
		}, [] );
	
	// bookend with lengths
	
	if ( prestoList[ 0 ].constructor !== Number ) {
		prestoList.unshift( 0 );
	}
	if ( prestoList[ prestoList.length - 1 ].constructor !== Number ) {
		prestoList.push( Infinity );
	}
	
	return prestoList;
	
} );


// takes a pre-processed prestoList array and returns an array of prestoRanges
//
// e.g., prestoRangesFromPrestoList( [ 0, Set { 'small', 'hide' }, 80, Set { 'medium' }, 160, Set { 'large' }, Infinity ] )
//       → [
//          { min: 0, max: 80, classNames: Set{ 'small', 'hide' } },
//          { min: 80, max: 160, classNames: Set{ 'medium' } },
//          { min: 160, max: Infinity, classNames: Set{ 'large' } }
//         ]

const prestoRangesFromPrestoList = ( function( prestoListArray ) {

	let prestoRanges = [];
	let currentRange = { min: prestoListArray.shift() };

	for ( const item of prestoListArray ) {
		if ( item.constructor === Set ) { // if it's a class name array
			
			currentRange.classNames = item;
		
		} else /* if ( item.constructor === Number ) */ { // if it's a length
		
			currentRange.max = item;
			prestoRanges.push( currentRange );
			currentRange = { min: item };
			
		}
	}
	
	return prestoRanges;

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


// 🐒patch’d basic set operations
// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set

Set.prototype.union = function( setB ) {
	let union = new Set( this );
	for ( const elem of setB ) {
		union.add(elem);
	}
	return union;
}

Set.prototype.difference = function( setB ) {
	let difference = new Set( this );
	for ( const elem of setB ) {
		difference.delete( elem );
	}
	return difference;
}


// start MutationObserving the document
mo.observe( document, { childList: true, subtree: true } );


} )();
