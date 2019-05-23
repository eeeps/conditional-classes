// conditional-classes.js
//
// by Eric Portis

// TODO
// 	- needs more and better comments
// 	- code order/organization is a mess

( function() {


// the shoddiest little mustard-cutting test

if ( !( 'Set' in window ) ) { return; }


// prevent --if from cascading

if ( 'CSS' in window && 'registerProperty' in CSS ) {

	// new, fancy
	CSS.registerProperty( {
		name: '--if',
		syntax: '*',
		inherits: false
	} );

} else {

	// old, tired
	const sheet = document.createElement( 'style' );
	sheet.innerHTML = '* { --if: initial; }';
	document.head.appendChild( sheet );

}


// get computed CSS props from elements

function getProperty( node, property ) {
	
	if ( 'computedStyleMap' in Element.prototype ) {
		
		// new and ¡fancy!
		const p = node.computedStyleMap().get( property )
		
		if ( p ) {
			return p[ 0 ]; // TODO why do I need the [ 0 ] and why do I get the feeling that's going to bite me in the ass somehow
		} else {
			return null;
		}
		
	} else {
	
		// older and ¿slower?
		return window.getComputedStyle( node ).getPropertyValue( property );
	
	}
}


// data we're storing about DOM nodes goes here

const conditionalClasses = new WeakMap();


// as elements come into the DOM, check to see if they have `--if` custom props
// if an element does have an `--if`,
// 1. parse the prop and put the resulting query functions in the conditionalClasses WeakMap
// 2. start ResizeObserving the element
// TODO get this to work on element updates, not just when elements are inserted

const mo = new MutationObserver( ( mutations ) => {
	
	for ( const mutation of mutations ) {
		for ( const newNode of mutation.addedNodes ) {
			if ( newNode.nodeType === 1 ) { // elements only, no text!
				
				const theProp = getProperty( newNode, '--if' );
				
				if ( theProp ) {
				
					conditionalClasses.set(
						newNode,
						parseConditionalClasses( theProp, newNode )
					);
					
					ro.observe( newNode );
				
				}
				
			}
		}
	}
	
} );


// use the stored queries to check-and-possibly-toggle classes whenever the element is resized

const ro = new ResizeObserver( entries => {
	
	for ( const entry of entries ) {
		
		const ccs = conditionalClasses.get( entry.target );
		
		// `classes` here is the returned object which will look like
		// {
		// 	toAdd: Set { 'medium' },
		// 	toRemove: Set { 'small', 'large' }
		// }
		// `queries` is an array of functions, which take the RO entry as input and return true or false depending on whether the query matches or not
		
		let classes = [ ...ccs.keys() ].reduce( ( classes, queries ) => {
			
			querysClassNames = ccs.get( queries );
			
			// all queries must return true (they're all joined by ANDs...)
			if ( queries.every( query => { return query( entry ) } ) ) {
			
				classes.toAdd = union( classes.toAdd, querysClassNames );
			
			} else {
			
				classes.toRemove = union( classes.toRemove, querysClassNames );
			
			}
			
			return classes;
			
		}, { 
			toAdd: new Set(),
			toRemove: new Set()
		} );
		
		// a class may be attached to both a true & false query
		// this is an author error, really - but - what should we do? first wins? last wins? but I've made everything sets...
		// how about, truth wins. the world needs a little more truth.
		classes.toRemove = difference( classes.toRemove, classes.toAdd );
		
		entry.target.classList.remove( ...classes.toRemove );
		entry.target.classList.add( ...classes.toAdd );
		
	}

} );

/*
 * input: single condititons/classes pair
 * 	e.g.'( 200px < content-width < 400px ) .medium'
 * output: split conditions and classes strings
 * 	e.g.[ '( 200px < content-width < 400px )', '.medium' ]
 */
const splitPair = function( pair ) {
	const trimmed = pair.trim();
	const match = trimmed.match( /\(.+\)/ );
	if ( !match ) { return null; } //error?
	const query = match[ 0 ];
	const classNames = trimmed
		.slice( query.length, pair.length )
		.trim();
	return [ query, classNames ];
}

/* input: classes string
 * 	e.g., '.medium.border'
 * output: set of classes
 * 	e.g., Set { 'medium', 'border' }
 */
const classStringToSet = function( string ) {
	return new Set( string
		.split( '.' )
		.map( c => { return c.trim(); } )
		.filter( c => { return c !== '' } )
	);
}

/* input: full `--if` attribute string
 * 	e.g.,
   	'( 200px < content-inline <= 400px ) .medium,
   	 ( content-inline > 400px ) .large'
 * output: object with query-testing-functions as keys and sets of classes as values
 * 	e.g.,
   	Map {
   		
   		[ ( entry ) => { entry.contentBoxSize.inlineSize > 200 },
   		  ( entry ) => { entry.contentBoxSize.inlineSize <= 400 } ]
   		=> Set { 'medium' },
   		
   		[ ( entry ) => { entry.contentBoxSize.inlineSize > 400 } ]
   		=> Set { 'large' }
   		
   	}
 */
const parseConditionalClasses = ( function( conditionalClassesString, element ) { // need the element to calculate ems based on context

	return conditionalClassesString.split( ',' ).reduce( ( accumulator, conditionalClassString ) => {
		const [ queryString, classesString ] = splitPair( conditionalClassString );
		const queryTestFunctions = parseQuery( queryString, element );
		const setOfClasses = classStringToSet( classesString );
		accumulator.set( queryTestFunctions, setOfClasses );
		return accumulator;
	}, new Map() );

} );


const flipped = {
	'<': '>',
	'>': '<',
	'<=': '>=',
	'>=': '<=',
	'=': '='
}

/*
 * input: single conditional query string (just the query part, not the class)
 	! also the element, so that we can parse cascade-relative units like em
 * output: array of functions that test that query
 * depends on:
 * 	constructQuery function
 * 	flipped object (for flipping </>/etc)
 */
function parseQuery( string, el ) {

	const numberOfSigns = string.match( /\>=|\<=|\>|\<|=/g ).length;
	
	if ( numberOfSigns === 1 ) {
		
		const captured = string.match( /^\(\s*([\w\d\-]+)\s*(\>=|\<=|\>|\<|=)\s*([\w\d\-]+)\s*\)$/ );
		
		if ( !captured ) { throw 'invalid media query'; }
		
		return [
			constructQuery( captured[1], captured[2], getComputedLength( captured[3], el ) )
		];

	} else if ( numberOfSigns === 2 ) {

		const captured = string.match( /^\(\s*([\w\d\-]+)\s*(\>=|\<=|\>|\<|=)\s*([\w\d\-]+)\s*(\>=|\<=|\>|\<|=)\s*([\w\d\-]+)\s*\)$/ );

		if ( !captured ) { throw 'invalid media query' }

		return [
			constructQuery( captured[ 3 ], flipped[ captured[ 2 ] ], getComputedLength( captured[ 1 ], el ) ), // TODO change parseInt to getComputedLength...
			constructQuery( captured[ 3 ], captured[ 4 ], getComputedLength( captured[ 5 ], el ) )
		];
		
	} else { 

		throw `invalid media query (expected one or two signs, got ${ numberOfSigns })`;

	}

}

// query parsing stuff

const operators = {
	'<': function(a, b) { return a < b },
	'<=': function(a, b) { return a <= b },
	'>': function(a, b) { return a > b },
	'>=': function(a, b) { return a >= b },
	'=': function(a, b) { return a === b }
};

logicalToPhysical = {
	'inline': 'width',
	'block': 'height'
};


// returns a *function* that will test whether an element's
// query target ([content{default}|border]-[inline|block] size, which is measured from layout and may change over time)
// is greater than, less than, equal to, etc
// a given length (constant)
function constructQuery( queryTarget, relationalOperator, givenLength ) {
	
	const s = queryTarget.split('-');
	
	let box = 'content',
	    dimension,
	    queryTargetLength;
	
	if ( s.length === 2 ) {
		box = s[ 0 ];
		dimension = s[ 1 ];
	} else {
		dimension = s[ 0 ];
	}
	
	return function( entry ) {
	
		// if we support new and improved ResizeObserver
		if ( 'contentBoxSize' in ResizeObserverEntry.prototype  &&
		     'paddingBoxSize' in ResizeObserverEntry.prototype ) {
			queryTargetLength = entry[ `${ box }BoxSize` ][ `${ dimension }Size` ];
		} else {
			// we're on ResizeObserver v1 and only get a contentRect (and can only compare to content size)
			queryTargetLength = entry.contentRect[ logicalToPhysical[ dimension ] ];
		}
	
		return operators[ relationalOperator ](
			queryTargetLength,
			givenLength
		);
	}
	
}



/*
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


// basic set operations
// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set

const union = function( setA, setB ) {
	let result = new Set( setA );
	for ( const element of setB ) {
		result.add( element );
	}
	return result;
}

const difference = function( setA, setB ) {
	let result = new Set( setA );
	for ( const element of setB ) {
		result.delete( element );
	}
	return result;
}


// start MutationObserving the document
mo.observe( document, { childList: true, subtree: true } );


} )();
