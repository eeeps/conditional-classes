let r = new ResizeObserver( entries => {

	for ( let entry of entries ) {
		
		for ( let i = 0; i < entry.target.minWidths.length; i++ ) {
			
			if ( ( entry.contentRect.width >= entry.target.minWidths[ i ] ) &&
					(
						( entry.contentRect.width < entry.target.minWidths[ i + 1 ] ) ||
						( entry.target.minWidths[ i + 1 ] === undefined )
					)
				) {
				entry.target.classList.add( entry.target.classNames[ i ] );
			} else {
				entry.target.classList.remove( entry.target.classNames[ i ] );
			}
		}
	
	}
	
} );

for ( let element of document.getElementsByTagName( '*' ) ) {
	
	let namedBreakpointsValue = window.getComputedStyle( element )
		.getPropertyValue( '--named-breakpoints' );
	
	if ( namedBreakpointsValue !== '' ) {

		let namedBreakpoints = namedBreakpointsValue
      .trim().split( ' ' ).filter( ( item ) => item !== '' );
	
		element.minWidths = namedBreakpoints
			.filter( ( item, index ) => index % 2 === 0 )
			.map( ( item ) => parseInt( item ) );
		element.classNames = namedBreakpoints
      .filter( ( item, index ) => index % 2 !== 0 );
	
		r.observe( element );

	}

}

