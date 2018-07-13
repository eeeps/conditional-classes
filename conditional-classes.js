// conditional-classes.js
//
// by Eric Portis

( function() {


// the shoddiest little mustard-cutting test

if ( !( 'Set' in window ) ) { return; }


// prevent --conditional-classes from cascading

let sheet = document.createElement( 'style' );
sheet.innerHTML = '* { --conditional-classes: initial; }';
document.head.appendChild( sheet );


// data we're storing about DOM nodes

const conditionalClasses = new WeakMap();


// as elements come into the DOM, check to see if they have --conditional-classes
// if they do, store their queries and start resizeObserving them

const mo = new MutationObserver( ( mutations ) => {

	for ( const mutation of mutations ) {
		for ( const newNode of mutation.addedNodes ) {
			if ( newNode.nodeType === 1 ) { // elements only, no text!
			
				const ccs = window.getComputedStyle( newNode ).getPropertyValue( '--conditional-classes' );
				
				if ( ccs !== '' ) {
					// console.log(newNode)
					conditionalClasses.set( newNode, parseConditionalClasses( ccs ) );
					// console.log( parseConditionalClasses(ccs) )
					ro.observe( newNode );
				
				}
				
			}
		}
	}

} );


// use the conditionalClasses to check-and-possibly-toggle classes whenever the element is resized

const ro = new ResizeObserver( entries => {
	
	for ( const entry of entries ) {
		
		const width = entry.contentRect.width;
		const height = entry.contentRect.height;
		
		let classesTo = conditionalClasses.get( entry.target ).reduce( ( todo, ccs ) => {
			
			// console.log( ccs.queryExpression, eval( '`' + ccs.queryExpression + '`' ), eval( eval( '`' + ccs.queryExpression + '`' ) ) )
			if ( eval( eval( '`' + ccs.queryExpression + '`' ) ) ) {
			
				todo.add = union( todo.add, ccs.classNames );
			
			} else {
			
				todo.remove = union( todo.remove, ccs.classNames );
			
			}
			
			return todo;
			
		}, { 
			add: new Set(),
			remove: new Set()
		} );
		
		// class names can appear in both ranges that apply, *and* in ranges that don’t
		classesTo.remove = difference( classesTo.remove, classesTo.add );
		
		entry.target.classList.remove( ...classesTo.remove );
		entry.target.classList.add( ...classesTo.add );
	
	}

} );


// takes a raw --conditional-classes string and returns a conditionalClasses object
// (which we attach to the element)
//
// e.g. parseConditionalClasses( '(width < 600px) .small, (width >= 1200px) .large.wide' )
//      → [
//         { queryExpression: `(${ width } < 600)`, classNames: [ 'small' ] },
//         { queryExpression: `(${ width } >= 1200)`, classNames: [ 'large', 'wide' ] }
//        ]

const parseConditionalClasses = ( function( conditionalClassesString ) {


	return conditionalClassesString.split( ',' ).map( ( conditionalClass ) => {

		const split = conditionalClass.split( '.' );
		const query = split[ 0 ];
		const classes = new Set( split.slice( 1 ) );
		const expression = query
			.replace( /[^\<\>]=/g, '==' )
			.replace( /px/g, '' )
			.replace( /and/g, '&&' )
			.replace( /or/g, '||' )
			.replace( /height/g, '${ height }' )
			.replace( /width/g, '${ width }' )
			.replace( /aspect-ratio/g, '${ width / height }' );
		
		return { queryExpression: expression, classNames: classes };
	
	} );

} );




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
