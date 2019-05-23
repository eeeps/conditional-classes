# conditional-classes

I made this to experiment with and learn about container queries. If you want to use container queries in production, you should probably be using [something](https://github.com/eqcss/eqcss) [else](https://github.com/ausi/cq-prolyfill).


## Requirements   

`conditional-classes.js` requires [ResizeObserver](https://github.com/WICG/ResizeObserver). ResizeObserver is shipping in Blink and coming soon to Firefox and Safari; in the meantime there’s an excellent [polyfill](https://github.com/que-etc/resize-observer-polyfill).


## Usage

Load `conditional-classes.js` in the `<head>`, after any ResizeObserver polyfill, synchronously.

```html
<head>
	<!-- (head stuff) -->
	<script src="ResizeObserverPolyfill.js"></script>
	<script src="conditional-classes.js"></script>
</head>
```

Then use it like this:

```css
.container {
	--if: (300px < inline <= 600px) .medium,
	      (inline > 600px) .large;
}

.container.medium .element {
	/* do container query stuff */
}

.container.large .element {
	/* do some other container query stuff */
}
```

Currently supports querying the `inline` and `block` content-box sizes of elements.


## TODO

- Right now we check for `--if`s when elements are inserted into the DOM, and then never check for or look at them again. A better script would respond appropriately to updates to CSS & HTML.
